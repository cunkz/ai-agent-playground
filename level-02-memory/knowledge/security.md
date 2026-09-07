# Security

Secrets such as API keys and the database connection string are read from
environment variables via a .env file, which is listed in .gitignore and
never committed. Only .env.example, containing the variable names with
blank values, is committed, so a new developer knows what to configure
without ever seeing a real credential in version control.

Tool arguments coming from the language model are never trusted blindly.
Every tool has a Zod schema, and arguments are validated against that
schema before the tool's execute function ever runs. Invalid arguments
are turned into a controlled error message that is fed back to the model,
rather than being passed straight through to application code.

All database queries use parameterized SQL with placeholder values
($1, $2, and so on), never string concatenation of user-controlled or
model-controlled values into a SQL string, which prevents SQL injection.

Schema changes are never executed automatically by the coding agent that
built this project. Every migration is generated as a reviewable file,
explained in plain language, and only applied after a human manually runs
it and confirms success. This rule was violated once during development,
when a disposable test database was created automatically instead of
through this workflow; it was caught immediately and documented rather
than silently corrected.

This project has no authentication system. All memories are stored under
a single fixed user identifier, which is appropriate for a single-user
local learning project but would not be appropriate for anything with
multiple real users. There is also no access control, no data retention
policy, and no mechanism for a user to export or delete all of their own
data beyond the individual forget() function already built for single
memories. A production-grade memory system would need considerably
stronger privacy, retention, access-control, and deletion guarantees than
this project currently provides.

No API keys, passwords, or other credentials are ever intentionally
stored inside a remembered fact or inside the vector database.
