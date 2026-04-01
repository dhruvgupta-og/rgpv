import crypto from "crypto";
import type { Request, Response } from "express";
import { storage } from "./storage";

const TOKEN_COOKIE = "rgpv_admin_token";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function createToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function hashPassword(password: string, salt?: string): string {
  const resolvedSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, resolvedSalt, 64).toString("hex");
  return `scrypt$${resolvedSalt}$${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}

export async function ensureBootstrapAdmin(): Promise<void> {
  const username = process.env.ADMIN_BOOTSTRAP_USERNAME || process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!username || !password) return;

  const existing = await storage.getUserByUsername(username);
  const passwordHash = hashPassword(password);

  if (existing) {
    await storage.updateUser(existing.id, {
      username,
      password: passwordHash,
      role: "admin",
    });
    return;
  }

  await storage.createUser({ username, password: passwordHash, role: "admin" });
}

export async function getAdminSession(req: Request) {
  const cookies = parseCookies(req.header("cookie"));
  const rawToken = cookies[TOKEN_COOKIE];
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const session = await storage.getSessionByTokenHash(tokenHash);
  if (!session) return null;
  if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
    await storage.deleteSessionByTokenHash(tokenHash);
    return null;
  }
  const user = await storage.getUserById(session.userId);
  if (!user) return null;
  return { user, tokenHash };
}

export async function createAdminSession(res: Response, username: string, password: string) {
  const user = await storage.getUserByUsername(username);
  if (!user) return false;
  if (!verifyPassword(password, user.password)) return false;
  const token = createToken();
  const tokenHash = hashToken(token);
  await storage.createSession(user.id, tokenHash, new Date(Date.now() + TOKEN_TTL_MS));
  await storage.updateUserLastLogin(user.id);

  const secure = process.env.NODE_ENV === "production";
  const cookie = [
    `${TOKEN_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
    `Max-Age=${Math.floor(TOKEN_TTL_MS / 1000)}`,
  ]
    .filter(Boolean)
    .join("; ");
  res.setHeader("Set-Cookie", cookie);
  return user;
}

export async function clearAdminSession(req: Request, res: Response) {
  const cookies = parseCookies(req.header("cookie"));
  const rawToken = cookies[TOKEN_COOKIE];
  if (rawToken) {
    await storage.deleteSessionByTokenHash(hashToken(rawToken));
  }
  const cookie = [
    `${TOKEN_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
  res.setHeader("Set-Cookie", cookie);
}

export function hashAdminPassword(password: string): string {
  return hashPassword(password);
}
