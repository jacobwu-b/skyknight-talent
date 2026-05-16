import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { ExecutiveForm } from "../ExecutiveForm";

export const dynamic = "force-dynamic";

export default async function NewExecutivePage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  return (
    <div className="page-shell">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/executives" className="back-link">
            ← Executives
          </Link>
          <h1>New Executive</h1>
        </div>
        <div className="user-chip">
          <span>{user.name}</span>
          <span className={`role-badge ${user.role}`}>{user.role}</span>
        </div>
      </div>

      <ExecutiveForm mode="create" />
    </div>
  );
}
