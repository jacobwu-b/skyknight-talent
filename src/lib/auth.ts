import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "./db/schema";
import { COOKIE_NAME, verifySessionToken } from "./session";
import { env } from "./env";

export type SessionUser = {
  id: string;
  name: string;
  role: "partner" | "associate";
};

/**
 * Derives the current session user from the signed cookie, re-fetching role
 * from the DB every request so a forged cookie payload cannot elevate privileges.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const profileId = await verifySessionToken(token, env.SESSION_SECRET);
  if (!profileId) return null;

  const db = getDb();
  const [user] = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, profileId))
    .limit(1);

  return user ?? null;
}
