import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

export type AuthKind = "bearer" | "cookie";

export interface AuthRoleInput {
  label: string;
  kind: AuthKind;
  token?: string;
  cookie?: string;
  checkUrl: string;
}

const MAX_ROLES = 10;
const MAX_SECRET = 16_384;

function encryptionKey(): Buffer {
  const raw = (process.env.PENTEST_AUTH_KEY || "").trim();
  if (raw) {
    const key = Buffer.from(raw, "base64");
    if (key.length !== 32)
      throw new Error("PENTEST_AUTH_KEY must be 32 bytes (base64)");
    return key;
  }
  const fallback = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").trim();
  if (!fallback)
    throw new Error(
      "PENTEST_AUTH_KEY or FIREBASE_ADMIN_PRIVATE_KEY is required",
    );
  return createHash("sha256").update(`pentest-auth-v1:${fallback}`).digest();
}

export function normalizeAuthRoles(input: unknown): AuthRoleInput[] {
  const rows = Array.isArray(input)
    ? input
    : input && typeof input === "object" && Array.isArray((input as any).roles)
      ? (input as any).roles
      : null;
  if (!rows) throw new Error("auth.roles must be an array");

  const roles: AuthRoleInput[] = [];
  for (const raw of rows.slice(0, MAX_ROLES)) {
    if (!raw || typeof raw !== "object") continue;
    const kind = String((raw as any).kind || "").toLowerCase();
    if (kind !== "bearer" && kind !== "cookie") continue;
    const label = String((raw as any).label || "")
      .trim()
      .slice(0, 80);
    const checkUrl = String((raw as any).checkUrl || "").trim();
    if (!label) throw new Error("Each auth role needs a label");
    if (!checkUrl) throw new Error(`${label}: check URL is required`);
    try {
      const parsed = new URL(checkUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
        throw new Error();
    } catch {
      throw new Error(`${label}: check URL must be http(s)`);
    }
    const token =
      kind === "bearer" ? String((raw as any).token || "").trim() : "";
    const cookie =
      kind === "cookie"
        ? String((raw as any).cookie || (raw as any).cookieHeader || "").trim()
        : "";
    if (kind === "bearer" && !token)
      throw new Error(`${label}: bearer token is required`);
    if (kind === "cookie" && !cookie)
      throw new Error(`${label}: cookie header is required`);
    if (token.length > MAX_SECRET || cookie.length > MAX_SECRET) {
      throw new Error(`${label}: auth material is too large`);
    }
    roles.push({
      label,
      kind,
      ...(token ? { token } : {}),
      ...(cookie ? { cookie } : {}),
      checkUrl,
    });
  }
  if (roles.length === 0)
    throw new Error("At least one bearer or cookie role is required");
  return roles;
}

export function encryptAuth(roles: AuthRoleInput[]): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(roles), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    body.toString("base64"),
  ].join(":");
}

export function decryptAuth(blob: string): AuthRoleInput[] {
  const [version, iv, tag, body] = String(blob || "").split(":");
  if (version !== "v1" || !iv || !tag || !body)
    throw new Error("Invalid auth bundle");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const text = Buffer.concat([
    decipher.update(Buffer.from(body, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return normalizeAuthRoles(JSON.parse(text));
}

export function toRunnerAuth(roles: AuthRoleInput[]) {
  return {
    roles: roles.map((role) => ({
      label: role.label,
      kind: role.kind,
      ...(role.token ? { token: role.token } : {}),
      ...(role.cookie ? { cookie: role.cookie } : {}),
      checkUrl: role.checkUrl,
    })),
  };
}

export function authMeta(roles: AuthRoleInput[]) {
  return roles.map((role) => ({
    label: role.label,
    kind: role.kind,
    checkUrl: role.checkUrl,
  }));
}
