import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { SearchForm } from "../SearchForm";

export const dynamic = "force-dynamic";

export default async function NewSearchPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  return (
    <div className="page-shell">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/searches" className="back-link">
            ← Searches
          </Link>
          <h1>New Search</h1>
        </div>
        <div className="user-chip">
          <span>{user.name}</span>
          <span className={`role-badge ${user.role}`}>{user.role}</span>
        </div>
      </div>

      <div className="form-shell">
        <SearchForm mode="create" />
      </div>
    </div>
  );
}
