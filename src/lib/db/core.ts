import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export class DatabaseConfigurationError extends Error { constructor() { super("Database configuration is unavailable."); this.name = "DatabaseConfigurationError"; } }

type ClaimsBridgeDatabase = ReturnType<typeof drizzle<typeof schema>>;
type DatabaseRuntime = {
  url: string;
  pool: Pool;
  db: ClaimsBridgeDatabase;
};

const globalDatabaseRuntime = globalThis as typeof globalThis & {
  __claimsBridgeDatabaseRuntime?: DatabaseRuntime;
};

function createDatabaseRuntime(url: string): DatabaseRuntime {
  const pool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });

  // Keep pool errors from becoming uncaught EventEmitter errors in a reused
  // server process. The query that caused an error still rejects normally.
  pool.on("error", () => undefined);

  return { url, pool, db: drizzle(pool, { schema }) };
}

export function getDb(): ClaimsBridgeDatabase {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseConfigurationError();

  const current = globalDatabaseRuntime.__claimsBridgeDatabaseRuntime;
  if (current?.url === url) return current.db;

  const runtime = createDatabaseRuntime(url);
  globalDatabaseRuntime.__claimsBridgeDatabaseRuntime = runtime;
  return runtime.db;
}
