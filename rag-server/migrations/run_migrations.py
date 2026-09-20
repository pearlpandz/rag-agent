from __future__ import annotations

import sys
import hashlib
from datetime import datetime
from pathlib import Path


try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except AttributeError:
    pass


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SQL_DIR = Path(__file__).resolve().parent / "sql"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from storage.db import get_connection
from storage.db import DB_CONFIG


MIGRATIONS = (
    "001_create_schema.sql",
    "002_seed_data.sql",
    "003_switch_embeddings_to_nvidia.sql",
)


def log(message: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}", file=sys.stderr, flush=True)


def calculate_checksum(sql: str) -> str:
    return hashlib.sha256(sql.encode("utf-8")).hexdigest()


def ensure_migration_table(conn) -> None:
    log("Ensuring public.schema_migrations exists")
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS public.schema_migrations (
                version text PRIMARY KEY,
                checksum text NOT NULL,
                applied_at timestamptz NOT NULL DEFAULT now()
            )
            """
        )
    conn.commit()
    log("Migration history table is ready")


def get_applied_migrations(conn) -> dict[str, str]:
    with conn.cursor() as cur:
        cur.execute("SELECT version, checksum FROM public.schema_migrations")
        return dict(cur.fetchall())


def run_migrations() -> None:
    host = DB_CONFIG.get("host")
    port = DB_CONFIG.get("port")
    dbname = DB_CONFIG.get("dbname")
    user = DB_CONFIG.get("user")

    log(f"Connecting to PostgreSQL at {host}:{port}/{dbname} as {user}")
    try:
        conn = get_connection()
    except Exception as exc:
        raise RuntimeError(
            f"Could not connect to PostgreSQL at {host}:{port}/{dbname} as {user}. "
            "Check PG_HOST, PG_PORT, PG_DB, PG_USER, and PG_PASSWORD in .env."
        ) from exc

    try:
        log("Connected")
        ensure_migration_table(conn)
        applied_migrations = get_applied_migrations(conn)
        log(f"Found {len(applied_migrations)} previously applied migration(s)")
        log(f"Checking {len(MIGRATIONS)} migration file(s)")

        applied_count = 0
        skipped_count = 0

        for index, migration_name in enumerate(MIGRATIONS, start=1):
            migration_path = SQL_DIR / migration_name
            sql = migration_path.read_text(encoding="utf-8")
            checksum = calculate_checksum(sql)
            log(f"[{index}/{len(MIGRATIONS)}] Checking {migration_name}")

            if migration_name in applied_migrations:
                if applied_migrations[migration_name] != checksum:
                    raise RuntimeError(
                        f"Migration {migration_name} was already applied, but its checksum changed. "
                        "Create a new migration file instead of editing an applied one."
                    )

                skipped_count += 1
                log(f"[{index}/{len(MIGRATIONS)}] Skipped {migration_name} (already applied)")
                continue

            log(f"[{index}/{len(MIGRATIONS)}] Running {migration_name}")
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    """
                    INSERT INTO public.schema_migrations (version, checksum)
                    VALUES (%s, %s)
                    """,
                    (migration_name, checksum),
                )

            conn.commit()
            applied_count += 1
            log(f"[{index}/{len(MIGRATIONS)}] Applied {migration_name}")
    except Exception:
        conn.rollback()
        log("Migration failed; transaction rolled back")
        raise
    finally:
        conn.close()
        log("Connection closed")

    log(f"Database migrations completed successfully. Applied={applied_count}, skipped={skipped_count}")


def print_config() -> None:
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Env file: {PROJECT_ROOT / '.env'}")
    print(f"PG_HOST: {DB_CONFIG.get('host')}")
    print(f"PG_PORT: {DB_CONFIG.get('port')}")
    print(f"PG_DB: {DB_CONFIG.get('dbname')}")
    print(f"PG_USER: {DB_CONFIG.get('user')}")
    print("PG_PASSWORD: <hidden>")


if __name__ == "__main__":
    if "--check-config" in sys.argv:
        print_config()
    else:
        run_migrations()
