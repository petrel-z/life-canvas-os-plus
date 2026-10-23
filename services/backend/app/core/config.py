from pathlib import Path
from typing import Annotated, Literal

from pydantic import AfterValidator, AnyHttpUrl, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

ENV_FILE = Path(__file__).resolve().parents[4] / ".env"


def validate_postgres_url(value: SecretStr) -> SecretStr:
    message = "must be a PostgreSQL URL with a host, database and valid port using psycopg"
    try:
        url = make_url(value.get_secret_value())
    except (ArgumentError, ValueError):
        # Parser errors can contain the original URL, including its password.
        raise ValueError(message) from None
    if (
        url.drivername not in {"postgresql", "postgresql+psycopg"}
        or not url.host
        or any(character.isspace() for character in url.host)
        or not url.database
        or (url.port is not None and not 1 <= url.port <= 65535)
    ):
        raise ValueError(message)
    url = url.set(drivername="postgresql+psycopg")
    return SecretStr(url.render_as_string(hide_password=False))


PostgresUrl = Annotated[SecretStr, AfterValidator(validate_postgres_url)]


class Settings(BaseSettings):
    """Server configuration; never serialize connection credentials as plain text."""

    model_config = SettingsConfigDict(extra="ignore", hide_input_in_errors=True)

    app_env: Literal["development", "test", "production"] = "development"
    database_url: PostgresUrl
    cors_origins: tuple[str, ...] = ()

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, origins: tuple[str, ...]) -> tuple[str, ...]:
        normalized = []
        message = "must contain only explicit HTTP(S) origins without credentials or paths"
        for origin in origins:
            try:
                url = AnyHttpUrl(origin)
            except ValueError:
                raise ValueError(message) from None
            if (
                any(character.isspace() for character in origin)
                or "*" in (url.host or "")
                or url.username is not None
                or url.password is not None
                or url.path not in {None, "/"}
                or url.query is not None
                or url.fragment is not None
            ):
                raise ValueError(message)
            normalized.append(str(url).removesuffix("/"))
        return tuple(normalized)


def load_settings() -> Settings:
    """Read the repository's .env with process environment taking precedence."""
    return Settings(_env_file=ENV_FILE, _env_file_encoding="utf-8")


class MigrationSettings(BaseSettings):
    """Migration credentials are independent of the API's runtime configuration."""

    model_config = SettingsConfigDict(extra="ignore", hide_input_in_errors=True)
    migration_database_url: PostgresUrl


def load_migration_settings() -> MigrationSettings:
    return MigrationSettings(_env_file=ENV_FILE, _env_file_encoding="utf-8")
