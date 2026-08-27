import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

const sql = neon(process.env.DATABASE_URL);
const [verification] = await sql`
  select
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'client_profiles') as client_profiles,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'eligibility_assessments') as eligibility_assessments,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'eligibility_handoffs') as eligibility_handoffs,
    exists (
      select 1
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'client_profiles'
        and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'clerk_user_id'
    ) as clerk_user_id_unique,
    exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      join pg_class r on r.oid = c.confrelid
      where n.nspname = 'public' and t.relname = 'eligibility_assessments'
        and c.contype = 'f' and r.relname = 'client_profiles'
        and pg_get_constraintdef(c.oid) like '%client_profile_id%'
    ) as assessment_owner_fk,
    exists (
      select 1
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'eligibility_handoffs'
        and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'token_hash'
    ) as token_hash_unique,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'eligibility_handoffs' and column_name = 'expires_at') as expires_at,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'eligibility_handoffs' and column_name = 'redeemed_at') as redeemed_at,
    (select count(*)::int from drizzle.__drizzle_migrations) = 2 as two_migrations_recorded
`;

console.log(JSON.stringify(verification));
