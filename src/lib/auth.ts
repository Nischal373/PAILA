import "server-only";

import {
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import type { SessionUser, UserRole } from "@/lib/potholeTypes";

interface AuthUserRecord {
  username: string;
  password: string;
  role?: UserRole;
  displayName?: string;
}

interface DbAuthUserRow {
  id: string;
  username: string;
  passwordhash: string;
  role: UserRole | null;
  displayname: string | null;
}

export class AuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const SESSION_COOKIE_NAME = "paila_auth_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const AUTH_USERS_TABLE = process.env.AUTH_USERS_TABLE ?? "paila_users";

let cachedUsers: AuthUserRecord[] | null = null;

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error("AUTH_SESSION_SECRET is required");
  }
  return secret;
}

function loadUsers() {
  if (cachedUsers) return cachedUsers;

  const raw = process.env.AUTH_USERS_JSON;
  if (!raw || !raw.trim()) {
    cachedUsers = [];
    return cachedUsers;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AUTH_USERS_JSON must be valid JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("AUTH_USERS_JSON must be an array");
  }

  cachedUsers = parsed
    .filter((value) => typeof value === "object" && value !== null)
    .map((value) => value as AuthUserRecord)
    .filter(
      (value) =>
        typeof value.username === "string" &&
        typeof value.password === "string"
    )
    .map((value) => ({
      username: value.username.trim(),
      password: value.password,
      role: value.role === "superadmin" ? "superadmin" : "user",
      displayName: value.displayName,
    }));

  return cachedUsers;
}

function safeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64).toString("hex");
  return safeEqualText(derived, key);
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function createSessionToken(user: SessionUser) {
  const payload = {
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

function parseCookies(cookieHeader: string | null) {
  if (!cookieHeader) return {} as Record<string, string>;

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf("=");
    if (index <= 0) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {});
}

function verifySessionToken(token: string): SessionUser | null {
  const [payloadEncoded, providedSignature, ...rest] = token.split(".");
  if (!payloadEncoded || !providedSignature || rest.length > 0) return null;

  const expectedSignature = sign(payloadEncoded);
  if (!safeEqualText(providedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadEncoded, "base64url").toString("utf8")
    ) as {
      username?: string;
      role?: UserRole;
      displayName?: string;
      exp?: number;
    };

    if (!payload.username || typeof payload.username !== "string") return null;
    if (payload.role !== "user" && payload.role !== "superadmin") return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) {
      return null;
    }

    return {
      username: payload.username,
      role: payload.role,
      displayName: payload.displayName,
    };
  } catch {
    return null;
  }
}

async function findDbUser(username: string): Promise<DbAuthUserRow | null> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(AUTH_USERS_TABLE)
    .select("id,username,passwordhash,role,displayname")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST205" || error.message.includes("does not exist")) {
      return null;
    }
    throw new Error(`Unable to read auth users: ${error.message}`);
  }

  return (data as DbAuthUserRow | null) ?? null;
}

export async function verifyCredentials(
  username: string,
  password: string
): Promise<SessionUser | null> {
  const normalizedUsername = username.trim();

  const envUser = loadUsers().find(
    (candidate) => candidate.username === normalizedUsername
  );
  if (envUser) {
    if (!safeEqualText(envUser.password, password)) return null;
    return {
      username: envUser.username,
      role: envUser.role === "superadmin" ? "superadmin" : "user",
      displayName: envUser.displayName,
    };
  }

  const dbUser = await findDbUser(normalizedUsername);
  if (!dbUser) return null;
  if (!verifyPassword(password, dbUser.passwordhash)) return null;

  return {
    username: dbUser.username,
    role: dbUser.role === "superadmin" ? "superadmin" : "user",
    displayName: dbUser.displayname ?? undefined,
  };
}

export async function registerUser(input: {
  username: string;
  password: string;
  displayName?: string;
}): Promise<SessionUser> {
  const username = input.username.trim();
  if (username.length < 3) {
    throw new AuthError(400, "Username must be at least 3 characters");
  }
  if (input.password.length < 6) {
    throw new AuthError(400, "Password must be at least 6 characters");
  }

  const envUser = loadUsers().find((candidate) => candidate.username === username);
  if (envUser) {
    throw new AuthError(409, "Username is already taken");
  }

  const existingDbUser = await findDbUser(username);
  if (existingDbUser) {
    throw new AuthError(409, "Username is already taken");
  }

  const supabaseAdmin = getSupabaseAdmin();
  const payload = {
    id: randomUUID(),
    username,
    passwordhash: hashPassword(input.password),
    role: "user" as UserRole,
    displayname: input.displayName?.trim() || null,
    createdat: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from(AUTH_USERS_TABLE)
    .insert(payload as never)
    .select("username,role,displayname")
    .single();

  if (error) {
    if (error.code === "PGRST205" || error.message.includes("does not exist")) {
      throw new AuthError(
        500,
        "Auth users table is missing. Create table paila_users first."
      );
    }
    throw new AuthError(500, `Signup failed: ${error.message}`);
  }

  const row = data as { username: string; role: UserRole | null; displayname: string | null };
  return {
    username: row.username,
    role: row.role === "superadmin" ? "superadmin" : "user",
    displayName: row.displayname ?? undefined,
  };
}

export function createLoginResponse(user: SessionUser) {
  const response = NextResponse.json({ ok: true, user });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(user),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}

export function createLogoutResponse() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export function getSessionUser(request: Request): SessionUser | null {
  const cookies = parseCookies(request.headers.get("cookie"));
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token);
}

export function requireAuthenticatedUser(request: Request) {
  const user = getSessionUser(request);
  if (!user) {
    throw new AuthError(401, "Authentication required");
  }
  return user;
}

export function requireSuperAdmin(request: Request) {
  const user = requireAuthenticatedUser(request);
  if (user.role !== "superadmin") {
    throw new AuthError(403, "Only superadmin can update status");
  }
  return user;
}
