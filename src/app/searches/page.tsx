import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listSearches, SearchListItem } from "@/lib/searches";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  paused: "Paused",
  filled: "Filled",
};

export default async function SearchesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const searches = await listSearches();

  const grouped = groupByCompany(searches);
  const companies = Object.keys(grouped).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <div className="page-shell">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard" className="back-link">
            ← Dashboard
          </Link>
          <h1>Searches</h1>
        </div>
        <div className="user-chip">
          <span>{user.name}</span>
          <span className={`role-badge ${user.role}`}>{user.role}</span>
        </div>
      </div>

      <div className="list-toolbar">
        <span className="list-count">
          {searches.length} search{searches.length !== 1 ? "es" : ""}
        </span>
        <Link href="/searches/new" className="btn-primary">
          + New Search
        </Link>
      </div>

      {searches.length === 0 ? (
        <div className="empty-state">
          <p>No searches yet.</p>
        </div>
      ) : (
        <div className="search-groups">
          {companies.map((company) => (
            <section key={company} className="search-group">
              <h2 className="search-group-heading">{company}</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Hiring Manager</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[company].map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/searches/${s.id}`} className="row-link">
                          {s.roleTitle}
                        </Link>
                      </td>
                      <td className="muted">{s.hiringManager}</td>
                      <td>
                        <span className={`status-badge status-${s.status}`}>
                          {STATUS_LABELS[s.status]}
                        </span>
                      </td>
                      <td className="muted">{formatDate(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByCompany(
  searches: SearchListItem[],
): Record<string, SearchListItem[]> {
  const groups: Record<string, SearchListItem[]> = {};
  for (const s of searches) {
    if (!groups[s.portfolioCompany]) groups[s.portfolioCompany] = [];
    groups[s.portfolioCompany].push(s);
  }
  return groups;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
