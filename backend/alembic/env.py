from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# 1. Import your central settings
from app.core.config import settings 
from app.models import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
print("TABLES:", Base.metadata.tables.keys())
print("USING DB:", settings.DATABASE_URL)
# 2. Force the URL to come from your Settings class 
# This covers both ONLINE and OFFLINE modes
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    from sqlalchemy import create_engine

    connectable = create_engine(settings.DATABASE_URL, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        # 🔥 CRITICAL FIX
        connection = connection.execution_options(isolation_level="AUTOCOMMIT")

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()