// =============================================================
// Local credential store with REAL validation.
// -------------------------------------------------------------
// This is genuine auth logic running entirely in the browser:
//   • sign-up creates an account (rejects duplicates)
//   • sign-in verifies the password hash (rejects wrong creds)
//   • passwords are hashed with SHA-256 (never stored in plaintext)
//
// It is NOT a replacement for a real backend in production — for that
// flip USE_FIREBASE in firebaseAuth.ts and supply your keys — but it
// behaves like a real account system for the demo: wrong password
// fails, unknown user fails, the same email can't register twice.
// =============================================================

export interface StoredAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  provider: "password" | "google" | "github";
  avatarColor: string;
  createdAt: number;
}

const ACCOUNTS_KEY = "auraai_accounts_v1";

const COLORS = [
  "from-violet-500 to-indigo-500",
  "from-sky-500 to-cyan-500",
  "from-rose-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-fuchsia-500 to-pink-500",
];

export function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function nameFromEmail(email: string) {
  const base = email.split("@")[0].replace(/[._-]+/g, " ");
  return base.replace(/\b\w/g, (c) => c.toUpperCase()) || "AuraAI User";
}

// ---- crypto helpers (real SHA-256 via the Web Crypto API) ----
async function hash(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- storage ----
function readAll(): StoredAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAll(accounts: StoredAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function find(email: string): StoredAccount | undefined {
  return readAll().find((a) => a.email.toLowerCase() === email.toLowerCase());
}

// ---- public API ----
export class AuthError extends Error {}

export async function registerAccount(
  name: string,
  email: string,
  password: string,
): Promise<StoredAccount> {
  if (find(email)) {
    throw new AuthError("An account with this email already exists. Try signing in.");
  }
  const salt = randomSalt();
  const account: StoredAccount = {
    id: crypto.randomUUID(),
    name: name.trim() || nameFromEmail(email),
    email: email.trim(),
    passwordHash: await hash(password, salt),
    salt,
    provider: "password",
    avatarColor: colorFor(email),
    createdAt: Date.now(),
  };
  const all = readAll();
  all.push(account);
  writeAll(all);
  return account;
}

export async function verifyAccount(
  email: string,
  password: string,
): Promise<StoredAccount> {
  const account = find(email);
  if (!account) {
    throw new AuthError("No account found with that email. Create one to continue.");
  }
  if (account.provider !== "password") {
    throw new AuthError(`This email is registered via ${account.provider}. Use that button to sign in.`);
  }
  const candidate = await hash(password, account.salt);
  if (candidate !== account.passwordHash) {
    throw new AuthError("Incorrect password. Please try again.");
  }
  return account;
}

// Upsert an OAuth/provider account (used by the simulated + real flows).
export function upsertProviderAccount(
  name: string,
  email: string,
  provider: "google" | "github",
): StoredAccount {
  const existing = find(email);
  if (existing) return existing;
  const account: StoredAccount = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash: "",
    salt: "",
    provider,
    avatarColor: colorFor(email),
    createdAt: Date.now(),
  };
  const all = readAll();
  all.push(account);
  writeAll(all);
  return account;
}

export function accountExists(email: string): boolean {
  return !!find(email);
}
