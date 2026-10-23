import traceback
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr, ValidationError

from app.core import config
from app.core.config import Settings, load_settings
from app.main import create_app

TEST_PASSWORD = "s03-test-secret"
TEST_DSN = f"postgresql+psycopg://test_user:{TEST_PASSWORD}@127.0.0.1:54322/test_db"


def test_missing_database_url_fails() -> None:
    with pytest.raises(ValidationError, match="database_url"):
        load_settings()


@pytest.mark.parametrize(
    "dsn",
    [
        "",
        f"not-a-url-{TEST_PASSWORD}",
        f"sqlite://test_user:{TEST_PASSWORD}@localhost/test_db",
        f"postgresql+asyncpg://test_user:{TEST_PASSWORD}@localhost/test_db",
        f"postgresql+psycopg://test_user:{TEST_PASSWORD}@localhost",
        f"postgresql+psycopg://test_user:{TEST_PASSWORD}@localhost:bad/test_db",
        f"postgresql+psycopg://test_user:{TEST_PASSWORD}@localhost:70000/test_db",
        f"postgresql+psycopg://test_user:{TEST_PASSWORD}@/test_db",
    ],
)
def test_invalid_database_url_fails(monkeypatch: pytest.MonkeyPatch, dsn: str) -> None:
    monkeypatch.setenv("DATABASE_URL", dsn)
    with pytest.raises(ValidationError, match="database_url") as caught:
        load_settings()
    assert TEST_PASSWORD not in str(caught.value)
    assert TEST_PASSWORD not in repr(caught.value)
    assert TEST_PASSWORD not in "".join(traceback.format_exception(caught.value))


@pytest.mark.anyio
async def test_explicit_settings_override_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "invalid-environment-url")
    monkeypatch.setenv("APP_ENV", "invalid-environment-name")
    settings = Settings(database_url=TEST_DSN, app_env="test", cors_origins=())
    app = create_app(settings)
    assert app.state.settings.database_url.get_secret_value() == TEST_DSN
    assert app.state.settings.app_env == "test"
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as client:
        response = await client.get("/openapi.json")
    assert response.status_code == 200
    assert TEST_PASSWORD not in response.text


@pytest.mark.anyio
async def test_default_factory_reads_environment_without_auth_or_model_keys(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", TEST_DSN)
    monkeypatch.setenv("APP_ENV", "test")
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as client:
        assert (await client.get("/docs")).status_code == 200
    assert app.state.settings.app_env == "test"


def test_settings_keep_database_password_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", TEST_DSN)
    settings = load_settings()
    assert isinstance(settings.database_url, SecretStr)
    assert settings.database_url.get_secret_value() == TEST_DSN
    assert TEST_PASSWORD not in str(settings)
    assert TEST_PASSWORD not in repr(settings)
    assert TEST_PASSWORD not in str(settings.model_dump())
    assert TEST_PASSWORD not in settings.model_dump_json()


def test_plain_postgresql_url_selects_psycopg_driver(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql://test_user:p%40ss@localhost/test_db?sslmode=require"
    )
    assert (
        load_settings().database_url.get_secret_value()
        == "postgresql+psycopg://test_user:p%40ss@localhost/test_db?sslmode=require"
    )


def test_root_env_file_is_independent_of_working_directory(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    config.ENV_FILE.write_text(
        f'DATABASE_URL="{TEST_DSN}"\nAPP_ENV=test\nMIGRATION_DATABASE_URL=unused\n',
        encoding="utf-8",
    )
    unrelated = tmp_path / "unrelated"
    unrelated.mkdir()
    (unrelated / ".env").write_text("DATABASE_URL=wrong-file\n", encoding="utf-8")
    monkeypatch.chdir(unrelated)
    assert load_settings().database_url.get_secret_value() == TEST_DSN


def test_environment_overrides_dotenv_without_cached_values(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    config.ENV_FILE.write_text(f"DATABASE_URL={TEST_DSN}\nAPP_ENV=development\n", encoding="utf-8")
    monkeypatch.setenv("APP_ENV", "production")
    assert load_settings().app_env == "production"
    monkeypatch.setenv("APP_ENV", "test")
    assert load_settings().app_env == "test"


def test_invalid_app_environment_does_not_expose_database_password(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", TEST_DSN)
    monkeypatch.setenv("APP_ENV", "stagin")
    with pytest.raises(ValidationError, match="app_env") as caught:
        load_settings()
    assert TEST_PASSWORD not in "".join(traceback.format_exception(caught.value))


def test_cors_defaults_to_no_allowed_origins(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", TEST_DSN)
    assert load_settings().cors_origins == ()


def test_cors_reads_explicit_json_origins(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", TEST_DSN)
    monkeypatch.setenv("CORS_ORIGINS", '["http://localhost:5173", "https://example.com/"]')
    assert load_settings().cors_origins == ("http://localhost:5173", "https://example.com")


@pytest.mark.parametrize(
    "origin",
    [
        "*",
        "ftp://example.com",
        "https://example.com/path",
        "https://user:pass@example.com",
        "https://example.com?query=1",
        "https://example.com:70000",
    ],
)
def test_cors_rejects_non_origin_values(origin: str) -> None:
    with pytest.raises(ValidationError, match="cors_origins"):
        Settings(database_url=TEST_DSN, cors_origins=(origin,))


def test_factory_rejects_missing_configuration() -> None:
    with pytest.raises(ValidationError, match="database_url"):
        create_app()
