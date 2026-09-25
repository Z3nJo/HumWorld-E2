import os
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import normalize_database_url
from app.database import get_db
from app.main import app
from app.repositories import DuplicateTermError, TermRepository

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def database_url() -> str:
    value = os.getenv("DATABASE_URL")
    if not value:
        pytest.skip("DATABASE_URL is required for PostgreSQL integration tests")
    normalized = normalize_database_url(value)
    if not normalized.startswith("postgresql+psycopg://"):
        pytest.fail("Integration tests require PostgreSQL with psycopg 3")
    return normalized


@pytest.fixture(scope="module")
def engine(database_url: str):
    database_engine = create_engine(database_url, pool_pre_ping=True)
    with database_engine.connect() as connection:
        assert connection.scalar(text("SELECT 1")) == 1
    assert "termino" in inspect(database_engine).get_table_names()
    yield database_engine
    database_engine.dispose()


@pytest.fixture()
def client(engine):
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE noticia_termino, termino RESTART IDENTITY"))

    def override_db():
        with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        with engine.begin() as connection:
            connection.execute(text("TRUNCATE noticia_termino, termino RESTART IDENTITY"))


def create_payload(
    word: str = "alegría",
    language: str = "es",
    value: str = "0.75",
) -> dict[str, object]:
    return {"palabra": word, "idioma": language, "valor": value}


def test_full_crud_search_persistence_and_soft_delete(client) -> None:
    spanish = client.post(
        "/api/v1/dictionary",
        json=create_payload("  Alegría  "),
    )
    english = client.post(
        "/api/v1/dictionary",
        json=create_payload("ALEGRÍA", "en", "-4.125"),
    )
    calm = client.post(
        "/api/v1/dictionary",
        json=create_payload("calma", "es", "123.456789"),
    )
    unaccented = client.post(
        "/api/v1/dictionary",
        json=create_payload("alegria", "es", "0.5"),
    )
    assert (
        spanish.status_code
        == english.status_code
        == calm.status_code
        == unaccented.status_code
        == 201
    )
    spanish_body = spanish.json()
    spanish_id = spanish_body["id_termino"]
    assert spanish_body["palabra"] == "alegría"
    assert Decimal(str(calm.json()["valor"])) == Decimal("123.456789")

    listing = client.get("/api/v1/dictionary")
    assert listing.status_code == 200
    assert [(item["palabra"], item["idioma"]) for item in listing.json()] == [
        ("alegria", "es"),
        ("alegría", "en"),
        ("alegría", "es"),
        ("calma", "es"),
    ]
    searched = client.get("/api/v1/dictionary", params={"q": " ALEGRÍ "})
    assert searched.status_code == 200
    assert len(searched.json()) == 2
    assert all(item["palabra"] == "alegría" for item in searched.json())

    detail = client.get(f"/api/v1/dictionary/{spanish_id}")
    assert detail.status_code == 200
    created_at = detail.json()["fecha_alta"]

    replaced = client.put(
        f"/api/v1/dictionary/{spanish_id}",
        json={
            "palabra": "  serenidad ",
            "idioma": "es",
            "valor": "2.5",
            "activo": True,
        },
    )
    assert replaced.status_code == 200
    assert replaced.json()["id_termino"] == spanish_id
    assert replaced.json()["fecha_alta"] == created_at
    assert replaced.json()["palabra"] == "serenidad"

    patched = client.patch(
        f"/api/v1/dictionary/{spanish_id}",
        json={"valor": "3.75"},
    )
    assert patched.status_code == 200
    assert patched.json()["palabra"] == "serenidad"

    with TestClient(app) as restarted_client:
        persisted = restarted_client.get(f"/api/v1/dictionary/{spanish_id}")
    assert persisted.status_code == 200
    assert Decimal(str(persisted.json()["valor"])) == Decimal("3.75")

    deleted = client.delete(f"/api/v1/dictionary/{spanish_id}")
    assert deleted.status_code == 204
    inactive = client.get(f"/api/v1/dictionary/{spanish_id}").json()
    assert inactive["activo"] is False
    first_deleted_at = inactive["fecha_modificacion"]
    assert client.delete(f"/api/v1/dictionary/{spanish_id}").status_code == 204
    assert (
        client.get(f"/api/v1/dictionary/{spanish_id}").json()["fecha_modificacion"]
        == first_deleted_at
    )


def test_normalized_uniqueness_atomic_updates_and_validation(client) -> None:
    first = client.post(
        "/api/v1/dictionary",
        json=create_payload(" Alegría ", "es", "1"),
    )
    second = client.post(
        "/api/v1/dictionary",
        json=create_payload("calma", "es", "2"),
    )
    assert first.status_code == second.status_code == 201
    duplicate = client.post(
        "/api/v1/dictionary",
        json=create_payload("ALEGRÍA", "es", "9"),
    )
    assert duplicate.status_code == 400

    second_id = second.json()["id_termino"]
    conflict = client.patch(
        f"/api/v1/dictionary/{second_id}",
        json={"palabra": " ALEGRÍA ", "valor": "99"},
    )
    assert conflict.status_code == 400
    unchanged = client.get(f"/api/v1/dictionary/{second_id}").json()
    assert unchanged["palabra"] == "calma"
    assert Decimal(str(unchanged["valor"])) == Decimal("2")

    invalid_payloads = [
        create_payload("   "),
        create_payload("x" * 101),
        create_payload("calma", "fr"),
        create_payload("calma", "es", "NaN"),
    ]
    for payload in invalid_payloads:
        assert client.post("/api/v1/dictionary", json=payload).status_code == 400
    assert client.patch(f"/api/v1/dictionary/{second_id}", json={}).status_code == 400
    assert client.patch(
        f"/api/v1/dictionary/{second_id}",
        json={"palabra": None},
    ).status_code == 400
    assert client.get("/api/v1/dictionary", params={"q": "   "}).status_code == 400
    assert client.get("/api/v1/dictionary/999").status_code == 404
    assert client.delete("/api/v1/dictionary/999").status_code == 404


def test_search_treats_sql_wildcards_as_literal_characters(client) -> None:
    assert client.post(
        "/api/v1/dictionary",
        json=create_payload("100%_real"),
    ).status_code == 201
    assert client.post(
        "/api/v1/dictionary",
        json=create_payload("normal"),
    ).status_code == 201

    percent = client.get("/api/v1/dictionary", params={"q": "%"})
    underscore = client.get("/api/v1/dictionary", params={"q": "_"})
    assert [item["palabra"] for item in percent.json()] == ["100%_real"]
    assert [item["palabra"] for item in underscore.json()] == ["100%_real"]


def test_repository_rolls_back_after_database_uniqueness_error(engine) -> None:
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE noticia_termino, termino RESTART IDENTITY"))
    try:
        with Session(engine, expire_on_commit=False) as session:
            repository = TermRepository(session)
            values = {
                "palabra": "calma",
                "idioma": "es",
                "valor": Decimal("1"),
                "activo": True,
            }
            repository.create_term(values)
            with pytest.raises(DuplicateTermError):
                repository.create_term(values)
            assert session.scalar(text("SELECT 1")) == 1
            assert session.scalar(text("SELECT count(*) FROM termino")) == 1
    finally:
        with engine.begin() as connection:
            connection.execute(text("TRUNCATE noticia_termino, termino RESTART IDENTITY"))
