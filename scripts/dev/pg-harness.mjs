// Local Postgres (PGlite) harness that mimics the parts of Supabase our SQL
// depends on: the anon/authenticated/service_role roles, auth.uid(),
// auth.users, storage.buckets/objects, and Supabase's default table grants.
// Used to validate migrations + row-level-security policies without touching
// the live project.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "fs";

const root = new URL("../../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf-8");

const BOOTSTRAP = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(name, '/')
$$;

create function uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

function adaptSchema(sql) {
  return sql
    .replace(/create extension[^;]*;/gi, "")
    .replace(/vector\(1536\)/g, "text");
}

export async function createDb({ withMigration004 = true } = {}) {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  await db.exec(adaptSchema(read("supabase/schema.sql")));
  if (withMigration004) {
    await db.exec(read("supabase/migrations/004_case_lifecycle_and_security.sql"));
    await db.exec(read("supabase/migrations/005_saved_lawyers_and_ai_history.sql"));
    await db.exec(read("supabase/migrations/006_admin_notifications.sql"));
  }
  return db;
}

/** Signs up a user the way Supabase does: inserting into auth.users fires handle_new_user(). */
export async function signUp(db, email, meta = {}) {
  const r = await db.query(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id",
    [email, JSON.stringify(meta)]
  );
  return r.rows[0].id;
}

/** Runs fn with the session acting as `uid` under the `authenticated` role (or anon when uid is null). */
export async function asUser(db, uid, fn) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid || ""]);
  await db.exec(`set role ${uid ? "authenticated" : "anon"}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}
