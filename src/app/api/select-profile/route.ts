import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { COOKIE_NAME, createSessionToken } from "@/lib/session";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const profileId = formData.get("profileId");

  if (typeof profileId !== "string" || !profileId) {
    return NextResponse.json({ error: "Missing profileId" }, { status: 400 });
  }

  const db = getDb();
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, profileId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const token = await createSessionToken(profileId, env.SESSION_SECRET);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
  });

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
