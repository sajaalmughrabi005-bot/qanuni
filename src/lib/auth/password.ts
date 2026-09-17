"use client";

/**
 * Client-side password hashing for the demo store.
 *
 * IMPORTANT LIMITATION: this app has no backend/database — "accounts" live
 * in this browser's localStorage only (see lib/store/app-store.ts). Hashing
 * here only prevents the password from sitting in plaintext in
 * localStorage/DevTools; it is NOT a substitute for real server-side
 * password hashing (bcrypt/argon2) behind a real auth server, since any
 * script running in this browser already has full read access to
 * localStorage regardless of this hash. A production deployment needs a
 * real backend (e.g. Supabase Auth, already scaffolded but unconfigured in
 * lib/supabase/) to provide real authentication security guarantees.
 */

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSaltHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomSaltHex();
  const hash = await sha256Hex(salt + password);
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = await sha256Hex(salt + password);
  return check === hash;
}

/** A random, URL-safe, single-use token (e.g. for password reset links). */
export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Password-reset tokens are stored as this hash, never in plaintext, so a leaked store snapshot can't be replayed as a valid reset link. */
export async function hashToken(token: string): Promise<string> {
  return sha256Hex(token);
}
