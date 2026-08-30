from sqlalchemy.orm import Session

from app.models import Configuration


ParameterData = dict[str, str]


class ConfigurationRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_parameter(self, key: str) -> Configuration | None:
        return self._session.get(Configuration, key)

    def save_parameters(
        self,
        parameters: dict[str, ParameterData],
    ) -> dict[str, Configuration]:
        saved = {}
        for key, data in parameters.items():
            parameter = self.get_parameter(key)
            if parameter is None:
                parameter = Configuration(
                    clave=key,
                    valor=data["value"],
                    tipo=data["type"],
                    descripcion=data["description"],
                )
                self._session.add(parameter)
            else:
                parameter.valor = data["value"]
                parameter.tipo = data["type"]
                parameter.descripcion = data["description"]
            saved[key] = parameter

        self._session.commit()
        for parameter in saved.values():
            self._session.refresh(parameter)
        return saved
