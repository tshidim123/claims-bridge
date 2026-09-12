import nextEnv from "@next/env";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

nextEnv.loadEnvConfig(process.cwd(), true);
let pool;
let phase = "development configuration";
try {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_") ||
    !process.env.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
    process.env.VERCEL_ENV === "production"
  )
    throw new Error("Development configuration required.");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });
  pool.on("error", () => undefined);
  const journal = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8"),
  );
  if (
    journal.entries.length !== 27 ||
    journal.entries.at(-1).tag !== "0026_manual_communication_audit"
  )
    throw new Error("Unexpected migration target.");
  phase = "database connection / migration ledger";
  const existing = await pool.query(
    "select hash from drizzle.__drizzle_migrations order by created_at",
  );
  phase = "development migration count";
  if (![26, 27].includes(existing.rows.length))
    throw new Error("Development baseline mismatch. No migration performed.");
  for (let index = 0; index < existing.rows.length; index++) {
    phase = `migration ${journal.entries[index].tag} integrity`;
    const source = readFileSync(
      `drizzle/${journal.entries[index].tag}.sql`,
      "utf8",
    );
    const lf = source.replaceAll("\r\n", "\n");
    // Git on Windows can change checkout line endings without changing applied SQL.
    const hashes = [source, lf, lf.replaceAll("\n", "\r\n")].map((text) =>
      createHash("sha256").update(text).digest("hex"),
    );
    if (!hashes.includes(existing.rows[index].hash))
      throw new Error("Applied migration integrity mismatch.");
  }
  console.log(
    `Development baseline verified: ${existing.rows.length} migrations; applied files unchanged.`,
  );
  if (process.argv.includes("--apply")) {
    phase = "reviewed additive migration";
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    console.log(
      "Development migration count: 27. Production was not accessed.",
    );
  } else
    console.log(
      "Read-only check. Use --apply to apply only the reviewed Development migration.",
    );
} catch {
  console.error(
    `Development check failed at: ${phase}. No credentials or database details disclosed.`,
  );
  process.exitCode = 1;
} finally {
  await pool?.end();
}
