import asyncio
from logging.config import fileConfig

from alembic.util import CommandError
from pydantic import ValidationError
from sqlalchemy import Connection, MetaData, pool
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context
from app.core.config import load_migration_settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

# S05 has no business models. T2 will register identity metadata here.
target_metadata = MetaData()


def run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_online(url: str) -> None:
    engine = create_async_engine(
        url, poolclass=pool.NullPool, connect_args={"connect_timeout": 3}, hide_parameters=True
    )
    try:
        async with engine.connect() as connection:
            await connection.run_sync(run_migrations)
    finally:
        await engine.dispose()


def run() -> None:
    try:
        url = load_migration_settings().migration_database_url.get_secret_value()
    except ValidationError:
        raise CommandError(
            "迁移配置无效：请检查根 .env 或环境变量 MIGRATION_DATABASE_URL"
        ) from None
    try:
        if context.is_offline_mode():
            context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
            with context.begin_transaction():
                context.run_migrations()
        else:
            asyncio.run(run_online(url))
    except (SQLAlchemyError, OSError) as exc:
        raise CommandError(
            f"数据库迁移失败（{type(exc).__name__}）：请检查连接、权限和迁移文件"
        ) from None


run()
