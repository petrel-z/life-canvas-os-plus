import traceback

import pytest
from pydantic import ValidationError

from app.core import config


def test_migration_config_does_not_fall_back_to_application_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://app:fake@localhost/app_db")
    with pytest.raises(ValidationError, match="migration_database_url"):
        config.load_migration_settings()


def test_migration_config_is_independent_and_reads_root_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    dsn = "postgresql+psycopg://migrator:migration-secret%25@localhost/migration_db"
    config.ENV_FILE.write_text(f"MIGRATION_DATABASE_URL={dsn}\nDATABASE_URL=invalid\n")
    settings = config.load_migration_settings()
    assert settings.migration_database_url.get_secret_value() == dsn
    assert "migration-secret" not in str(settings) + settings.model_dump_json()
    monkeypatch.setenv("MIGRATION_DATABASE_URL", "postgresql://owner:fake@localhost/override_db")
    assert (
        config.load_migration_settings()
        .migration_database_url.get_secret_value()
        .endswith("/override_db")
    )


@pytest.mark.parametrize("dsn", ["", "postgresql://host", "sqlite:///:memory:", "migration-secret"])
def test_invalid_migration_config_fails_without_exposing_input(
    monkeypatch: pytest.MonkeyPatch,
    dsn: str,
) -> None:
    monkeypatch.setenv("MIGRATION_DATABASE_URL", dsn)
    with pytest.raises(ValidationError, match="migration_database_url") as caught:
        config.load_migration_settings()
    assert "migration-secret" not in "".join(traceback.format_exception(caught.value))
