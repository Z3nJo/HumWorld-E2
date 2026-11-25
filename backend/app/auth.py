from dataclasses import dataclass
from typing import Annotated, Protocol
from urllib.parse import urlsplit

from clerk_backend_api.security import AuthenticateRequestOptions, authenticate_request
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings


class ClerkConfigurationError(ValueError):
    """Raised when protected access cannot be configured safely."""


@dataclass(frozen=True)
class ClerkAuthConfiguration:
    secret_key: str
    jwt_key: str
    authorized_parties: tuple[str, ...]


@dataclass(frozen=True)
class AdminPrincipal:
    user_id: str
    issuer: str


class TokenVerifier(Protocol):
    def verify(
        self,
        request: Request,
        configuration: ClerkAuthConfiguration,
    ) -> dict[str, object]: ...


def _required(value: str | None, name: str) -> str:
    normalized = (value or "").strip()
    if not normalized:
        raise ClerkConfigurationError(f"Falta la configuracion obligatoria {name}")
    return normalized


def _parse_authorized_parties(value: str | None) -> tuple[str, ...]:
    raw_value = _required(value, "CLERK_AUTHORIZED_PARTIES")
    parties: list[str] = []
    for raw_party in raw_value.split(","):
        party = raw_party.strip().rstrip("/")
        parsed = urlsplit(party)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
        ):
            raise ClerkConfigurationError(
                "CLERK_AUTHORIZED_PARTIES debe contener origenes HTTP(S) separados por comas"
            )
        if party not in parties:
            parties.append(party)
    if not parties:
        raise ClerkConfigurationError("CLERK_AUTHORIZED_PARTIES no contiene origenes")
    return tuple(parties)


def resolve_clerk_configuration(settings: Settings) -> ClerkAuthConfiguration:
    secret_key = _required(settings.clerk_secret_key, "CLERK_SECRET_KEY")
    jwt_key = _required(settings.clerk_jwt_key, "CLERK_JWT_KEY").replace("\\n", "\n")

    if not secret_key.startswith(("sk_test_", "sk_live_")):
        raise ClerkConfigurationError("CLERK_SECRET_KEY no tiene un formato Clerk valido")
    if "BEGIN PUBLIC KEY" not in jwt_key:
        raise ClerkConfigurationError("CLERK_JWT_KEY debe ser una clave publica PEM")
    return ClerkAuthConfiguration(
        secret_key=secret_key,
        jwt_key=jwt_key,
        authorized_parties=_parse_authorized_parties(settings.clerk_authorized_parties),
    )


class ClerkTokenVerifier:
    def verify(
        self,
        request: Request,
        configuration: ClerkAuthConfiguration,
    ) -> dict[str, object]:
        state = authenticate_request(
            request,
            AuthenticateRequestOptions(
                secret_key=configuration.secret_key,
                jwt_key=configuration.jwt_key,
                authorized_parties=list(configuration.authorized_parties),
                accepts_token=["session_token"],
            ),
        )
        if not state.is_signed_in or state.payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credencial de autenticacion invalida o expirada",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return state.payload


def get_token_verifier() -> TokenVerifier:
    return ClerkTokenVerifier()


bearer_scheme = HTTPBearer(
    auto_error=False,
    scheme_name="ClerkBearer",
    description="Token de sesion emitido por Clerk",
)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Se requiere una sesion administrativa valida",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_admin(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    settings: Annotated[Settings, Depends(get_settings)],
    verifier: Annotated[TokenVerifier, Depends(get_token_verifier)],
) -> AdminPrincipal:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()

    try:
        configuration = resolve_clerk_configuration(settings)
    except ClerkConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La autenticacion administrativa no esta disponible",
        ) from error

    try:
        payload = verifier.verify(request, configuration)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No fue posible verificar la sesion administrativa",
        ) from error

    issuer = payload.get("iss")
    subject = payload.get("sub")
    if not isinstance(issuer, str) or urlsplit(issuer).scheme != "https":
        raise _unauthorized()
    if not isinstance(subject, str) or not subject:
        raise _unauthorized()
    return AdminPrincipal(user_id=subject, issuer=issuer)
