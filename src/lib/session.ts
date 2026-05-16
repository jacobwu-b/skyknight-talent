const COOKIE_NAME = "sk_session";
const SEPARATOR = ".";

function toBase64url(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let str = "";
  for (const byte of arr) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64url(s: string): Uint8Array {
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded =
    base64.length % 4 === 0
      ? base64
      : base64 + "====".slice(base64.length % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  const keyBytes = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(
  profileId: string,
  secret: string,
): Promise<string> {
  const payload = toBase64url(
    new TextEncoder().encode(JSON.stringify({ v: 1, pid: profileId })),
  );
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return `${payload}${SEPARATOR}${toBase64url(sig)}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<string | null> {
  const dotIndex = token.lastIndexOf(SEPARATOR);
  if (dotIndex === -1) return null;
  const payload = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);
  if (!payload || !sig) return null;

  const key = await importKey(secret);
  let valid: boolean;
  try {
    const sigBytes = fromBase64url(sig);
    valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(payload),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  try {
    const decoded = new TextDecoder().decode(fromBase64url(payload));
    const data = JSON.parse(decoded) as unknown;
    if (
      typeof data !== "object" ||
      data === null ||
      (data as Record<string, unknown>).v !== 1 ||
      typeof (data as Record<string, unknown>).pid !== "string"
    ) {
      return null;
    }
    return (data as { pid: string }).pid;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
