# Database

Persistent memory is stored in PostgreSQL, run locally through Docker
Compose rather than any cloud database. The Compose file uses the
pgvector/pgvector:pg16 image specifically, not plain postgres:16-alpine,
because the pgvector extension needs to be available for the memories
table's embedding column. The container's host port is mapped to 5433
instead of the standard 5432, to avoid colliding with a developer's
existing local Postgres installation. Data lives in a named Docker volume
so it survives container restarts.

The memories table has these columns: id (a server-generated UUID),
user_id (plain text, since this project has no authentication system),
category (plain text, constrained by a Zod enum in application code
rather than a database CHECK constraint), content (the actual remembered
fact), metadata (JSONB for free-form extras), an embedding column of type
vector with 4096 dimensions, and created_at / updated_at timestamps.

All schema changes are written as numbered SQL migration files under
migrations/, and none of them are ever executed automatically. Every
migration is generated as a file, explained, and then a human runs it
manually with psql before the application is allowed to assume the schema
exists. The database client's connect() function actively checks that the
memories table exists and refuses to proceed with a clear error message
if it does not, rather than silently creating it.

No ORM or query builder is used. All queries are written as raw,
parameterized SQL directly in a small repository layer, using $1/$2-style
placeholders for every value to avoid SQL injection.

The embedding column is 4096-dimensional, which is too large for
pgvector's approximate nearest-neighbor index types: ivfflat and hnsw both
cap out at 2000 dimensions for the plain vector type, and 4000 dimensions
even with the half-precision halfvec type. Because of this, no vector
index was created. Similarity search instead does an exact sequential
scan using pgvector's cosine distance operator, which is fine at the
scale a personal memory store will ever reach.
