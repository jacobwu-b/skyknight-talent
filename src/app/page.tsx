import Image from "next/image";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ProfilePickerPage() {
  const db = getDb();
  const profiles = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .orderBy(asc(users.role), asc(users.name));

  return (
    <main className="picker-page">
      <div className="picker-heading">
        <h1>SkyKnight Talent Network</h1>
        <p>Select your profile to continue</p>
      </div>

      <div className="picker-grid" role="list">
        {profiles.map((profile) => (
          <form
            key={profile.id}
            method="POST"
            action="/api/select-profile"
            role="listitem"
          >
            <input type="hidden" name="profileId" value={profile.id} />
            <button type="submit" className="profile-card" aria-label={`Sign in as ${profile.name}, ${profile.role}`}>
              <div className="avatar-ring">
                <Image
                  src={profile.avatarUrl ?? "/avatars/1.svg"}
                  alt={profile.name}
                  width={100}
                  height={100}
                  unoptimized
                />
              </div>
              <span className="profile-name">{profile.name}</span>
              <span className={`role-badge ${profile.role}`}>
                {profile.role}
              </span>
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
