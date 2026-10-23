from collections.abc import Iterator
from pathlib import Path
from uuid import uuid4

import psycopg
import pytest
from psycopg import sql
from pydantic import SecretStr, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

ROOT_ENV = Path(__file__).resolve().parents[4] / ".env"


class DatabaseTestSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", hide_input_in_errors=True)
    test_database_url: SecretStr


@pytest.fixture
def database_url() -> Iterator[str]:
    """Only create/drop this fixture's unique database; never migrate the supplied control DB."""
    try:
        settings = DatabaseTestSettings(_env_file=ROOT_ENV, _env_file_encoding="utf-8")
    except ValidationError:
        pytest.fail(
            "Set TEST_DATABASE_URL to a PostgreSQL role with CREATEDB; see infra/README.md",
            pytrace=False,
        )
    control_url = make_url(settings.test_database_url.get_secret_value())
    if control_url.drivername not in {"postgresql", "postgresql+psycopg"}:
        pytest.fail("TEST_DATABASE_URL must use PostgreSQL", pytrace=False)
    try:
        admin = psycopg.connect(
            control_url.set(drivername="postgresql").render_as_string(hide_password=False),
            autocommit=True,
            connect_timeout=3,
        )
    except psycopg.Error as exc:
        pytest.fail(
            f"Test PostgreSQL unavailable ({type(exc).__name__}); start Compose first",
            pytrace=False,
        )
    database_name = f"life_canvas_test_{uuid4().hex}"
    with admin:
        admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))
        try:
            yield control_url.set(
                database=database_name, drivername="postgresql+psycopg"
            ).render_as_string(hide_password=False)
        finally:
            admin.execute(
                sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(database_name))
            )
