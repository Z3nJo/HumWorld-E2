from typing import Self

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator

from app.models.domains import Continent, IptcCategory, Language


class ChannelCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=150, examples=["BBC Mundo"])
    continente: Continent = Field(examples=[Continent.EUROPE])


class SourceCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=150, examples=["Portada"])
    url_feed: HttpUrl = Field(
        max_length=500,
        examples=["https://example.com/rss.xml"],
    )
    categoria_iptc: IptcCategory = Field(examples=[IptcCategory.POLITICS])
    idioma: Language = Field(examples=[Language.SPANISH])
    activa: bool = Field(default=True)


class SourceBatchCreate(BaseModel):
    channel: ChannelCreate | None = None
    channel_id: int | None = Field(default=None, gt=0)
    sources: list[SourceCreate] = Field(min_length=1)

    @model_validator(mode="after")
    def exactly_one_channel_reference(self) -> Self:
        if (self.channel is None) == (self.channel_id is None):
            raise ValueError("Debe indicar exactamente channel o channel_id")
        return self


class SourceReplace(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    url_feed: HttpUrl = Field(max_length=500)
    categoria_iptc: IptcCategory
    idioma: Language
    activa: bool


class SourcePatch(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=150)
    url_feed: HttpUrl | None = Field(default=None, max_length=500)
    categoria_iptc: IptcCategory | None = None
    idioma: Language | None = None
    activa: bool | None = None

    @model_validator(mode="after")
    def at_least_one_field(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Debe indicar al menos un campo editable")
        return self


class ChannelSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_canal: int
    nombre: str
    continente: Continent


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_fuente: int
    id_canal: int
    nombre: str
    url_feed: str
    categoria_iptc: IptcCategory
    idioma: Language
    activa: bool
    canal: ChannelSummary


class SourceBatchResponse(BaseModel):
    channel: ChannelSummary
    sources: list[SourceResponse]


class ConfigResponse(BaseModel):
    captura_periodicidad_minutos: int = Field(examples=[60])
    noticias_caducidad_dias: int = Field(examples=[30])


class ConfigReplace(BaseModel):
    captura_periodicidad_minutos: int = Field(gt=0, strict=True, examples=[30])
    noticias_caducidad_dias: int = Field(gt=0, strict=True, examples=[30])


class ErrorResponse(BaseModel):
    detail: str | list[dict[str, object]]


class CaptureRequest(BaseModel):
    source_ids: list[int] | None = Field(default=None, min_length=1, examples=[[1, 3]])


class CaptureSourceResponse(BaseModel):
    source_id: int
    inserted: int
    duplicates: int
    invalid: int
    error: str | None


class CaptureResponse(BaseModel):
    sources: list[CaptureSourceResponse]
    skipped_source_ids: list[int]
    inserted: int
    failed_sources: int
