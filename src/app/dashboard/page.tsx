import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1>SkyKnight Talent Network</h1>
        <div className="user-chip">
          <span>{user.name}</span>
          <span className={`role-badge ${user.role}`}>{user.role}</span>
          <form method="POST" action="/api/sign-out" style={{ display: "inline" }}>
            <button type="submit" className="switch-btn">
              Switch profile
            </button>
          </form>
        </div>
      </div>

      <div className="welcome-card">
        <h2>Welcome back, {user.name.split(" ")[0]}.</h2>
        <p>
          You are signed in as a <strong>{user.role}</strong>. Use the navigation to
          manage the executive search pipeline.
        </p>
      </div>
    </div>
  );
}
