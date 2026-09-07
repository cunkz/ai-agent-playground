import { Pool } from "pg";

let pool: Pool | null = null;

// pg surfaces connection failures as an AggregateError with an empty top-level
// message (Node tries both IPv6 and IPv4 addresses and wraps both attempts'
// errors together) — the actually useful message is nested in `.errors`.
function describeConnectionError(err: unknown): string {
  if (err instanceof AggregateError) {
    return err.errors.map((e) => (e instanceof Error ? e.message : String(e))).join("; ");
  }
  return err instanceof Error ? err.message : String(err);
}

export async function connect(): Promise<void> {
  const candidate = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await candidate.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'memories'",
    );
    if (result.rows.length === 0) {
      throw new Error(
        "Database schema is not ready. Please apply the required migrations first " +
          "(see level-02-memory/migrations/README.md).",
      );
    }
  } catch (err) {
    await candidate.end().catch(() => {});
    if (err instanceof Error && err.message.startsWith("Database schema")) throw err;
    throw new Error(`Could not connect to PostgreSQL: ${describeConnectionError(err)}`);
  }

  pool = candidate;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (!pool) throw new Error("Database not connected. Call connect() first.");
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function close(): Promise<void> {
  await pool?.end();
  pool = null;
}
