from sqlalchemy.orm import Session

from app.models import Configuration


class ConfigurationRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_parameter(self, key: str) -> Configuration | None:
        return self._session.get(Configuration, key)

    def save_parameter(
        self,
        *,
        key: str,
        value: str,
        type_: str,
        description: str,
    ) -> Configuration:
        parameter = self.get_parameter(key)
        if parameter is None:
            parameter = Configuration(
                clave=key,
                valor=value,
                tipo=type_,
                descripcion=description,
            )
            self._session.add(parameter)
        else:
            parameter.valor = value
            parameter.tipo = type_
            parameter.descripcion = description

        self._session.commit()
        self._session.refresh(parameter)
        return parameter
