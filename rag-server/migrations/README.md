# Database Migrations

Run these migrations to create the PostgreSQL schema, enable `pgvector`, and seed starter RBAC records.

The runner uses the existing database environment variables from `storage/db.py`:

```env
PG_HOST=localhost
PG_PORT=5432
PG_DB=postgres
PG_USER=postgres
PG_PASSWORD=your_password
```

From the server root:

```bash
python migrations/run_migrations.py
```

If your terminal buffers output, run Python in unbuffered mode:

```bash
python -u migrations/run_migrations.py
```

The runner records successful files in `public.schema_migrations`. When you run it again, already-applied migrations are skipped.

Progress is logged per migration file. A large SQL file may still take time between `Running ...` and `Applied ...` because PostgreSQL executes that file as one call.

Do not edit a migration after it has been applied. If the schema needs to change, add a new SQL file under `migrations/sql` and include it in the `MIGRATIONS` list in `run_migrations.py`.

The migration creates:

- `category` and `docs` for the REST document APIs
- `documents` for chunk embeddings
- `tickets` for the ticket API
- `rbac_users`, `rbac_roles`, `rbac_permissions`, and ACL mapping tables
- `match_documents(...)` for the existing vector search code
- `match_documents_for_user(...)` for RBAC-aware retrieval
