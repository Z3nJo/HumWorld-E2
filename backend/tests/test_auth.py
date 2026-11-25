from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from app.auth import (
    AdminPrincipal,
    TokenVerifier,
    get_token_verifier,
    require_admin,
)
from app.config import Settings, get_settings


PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
PRIVATE_KEY_PEM = PRIVATE_KEY.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
).decode()
PUBLIC_KEY_PEM = PRIVATE_KEY.public_key().public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
).decode()
OTHER_PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def clerk_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "database_url": "postgresql://localhost/humworld_test",
        "clerk_secret_key": "sk_test_example",
        "clerk_jwt_key": PUBLIC_KEY_PEM,
        "clerk_admin_user_ids": "user_admin,user_second",
        "clerk_authorized_parties": "http://localhost:5173",
        "capture_scheduler_enabled": False,
        "_env_file": None,
    }
    values.update(overrides)
    return Settings(**values)


def session_token(
    *,
    subject: str = "user_admin",
    issuer: str = "https://humworld-test.clerk.accounts.dev",
    authorized_party: str = "http://localhost:5173",
    expires_delta: timedelta = timedelta(minutes=5),
    signing_key=PRIVATE_KEY_PEM,
) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": subject,
            "iss": issuer,
            "azp": authorized_party,
            "sid": "sess_test",
            "iat": now,
            "nbf": now - timedelta(seconds=1),
            "exp": now + expires_delta,
        },
        signing_key,
        algorithm="RS256",
        headers={"kid": "test-key"},
    )


def make_client(
    settings: Settings | None = None,
    verifier: TokenVerifier | None = None,
) -> tuple[TestClient, list[str]]:
    application = FastAPI()
    executed: list[str] = []

    @application.get("/protected")
    def protected(
        principal: AdminPrincipal = Depends(require_admin),
    ) -> dict[str, str]:
        executed.append(principal.user_id)
        return {"user_id": principal.user_id}

    application.dependency_overrides[get_settings] = lambda: settings or clerk_settings()
    if verifier is not None:
        application.dependency_overrides[get_token_verifier] = lambda: verifier
    return TestClient(application), executed


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_valid_admin_session_reaches_protected_operation() -> None:
    client, executed = make_client()

    response = client.get("/protected", headers=bearer(session_token()))

    assert response.status_code == 200
    assert response.json() == {"user_id": "user_admin"}
    assert executed == ["user_admin"]


def test_second_configured_admin_session_reaches_protected_operation() -> None:
    principal = require_admin(
        request_with_subject("user_second"),
        HTTPAuthorizationCredentials(scheme="Bearer", credentials="test-token"),
        clerk_settings(),
        SubjectVerifier(),
    )

    assert principal.user_id == "user_second"


def test_user_outside_configured_admin_list_is_rejected() -> None:
    with pytest.raises(HTTPException) as error:
        require_admin(
            request_with_subject("user_outside"),
            HTTPAuthorizationCredentials(scheme="Bearer", credentials="test-token"),
            clerk_settings(),
            SubjectVerifier(),
        )

    assert error.value.status_code == 403


def test_missing_token_returns_401_with_bearer_challenge() -> None:
    client, executed = make_client()

    response = client.get("/protected")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert executed == []


@pytest.mark.parametrize(
    "token",
    [
        session_token(expires_delta=timedelta(minutes=-5)),
        session_token(authorized_party="https://attacker.example"),
        session_token(
            signing_key=OTHER_PRIVATE_KEY.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            ).decode()
        ),
        session_token(issuer="not-an-https-issuer"),
    ],
)
def test_invalid_expired_wrong_origin_or_wrong_instance_token_returns_401(
    token: str,
) -> None:
    client, executed = make_client()

    response = client.get("/protected", headers=bearer(token))

    assert response.status_code == 401
    assert executed == []


def test_valid_non_admin_session_returns_403_before_operation() -> None:
    client, executed = make_client()

    response = client.get(
        "/protected",
        headers=bearer(session_token(subject="user_someone_else")),
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "La cuenta autenticada no esta autorizada para administrar HumWorld"
    }
    assert executed == []


def test_incomplete_configuration_returns_503_without_exposing_details() -> None:
    client, executed = make_client(clerk_settings(clerk_jwt_key=None))

    response = client.get("/protected", headers=bearer(session_token()))

    assert response.status_code == 503
    assert response.json() == {
        "detail": "La autenticacion administrativa no esta disponible"
    }
    assert "CLERK_JWT_KEY" not in response.text
    assert executed == []


class FailingVerifier:
    def verify(self, request, configuration):
        raise RuntimeError("secret diagnostic that must not reach the response")


class SubjectVerifier:
    def verify(self, request, configuration):
        return {
            "iss": "https://humworld-test.clerk.accounts.dev",
            "sub": request.headers["x-test-subject"],
        }


def request_with_subject(subject: str) -> Request:
    return Request(
        {
            "type": "http",
            "headers": [(b"x-test-subject", subject.encode())],
        }
    )


def test_verifier_failure_returns_sanitized_503() -> None:
    client, executed = make_client(verifier=FailingVerifier())

    response = client.get("/protected", headers=bearer(session_token()))

    assert response.status_code == 503
    assert response.json() == {
        "detail": "No fue posible verificar la sesion administrativa"
    }
    assert "secret diagnostic" not in response.text
    assert executed == []
