import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listExecutives } from "@/lib/executives";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function ExecutivesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { executives, total } = await listExecutives(page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="page-shell">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard" className="back-link">
            ← Dashboard
          </Link>
          <h1>Executives</h1>
        </div>
        <div className="user-chip">
          <span>{user.name}</span>
          <span className={`role-badge ${user.role}`}>{user.role}</span>
        </div>
      </div>

      <div className="list-meta">
        <span className="list-count">{total} executive{total !== 1 ? "s" : ""}</span>
      </div>

      {executives.length === 0 ? (
        <div className="empty-state">
          <p>No executives yet.</p>
        </div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Current Role</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {executives.map((exec) => (
                <tr key={exec.id}>
                  <td>
                    <Link href={`/executives/${exec.id}`} className="row-link">
                      {exec.name}
                    </Link>
                  </td>
                  <td className="muted">{exec.email}</td>
                  <td className="muted">{exec.currentRole ?? "—"}</td>
                  <td className="muted">{formatDate(exec.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              {page > 1 && (
                <Link
                  href={`/executives?page=${page - 1}`}
                  className="pagination-btn"
                >
                  ← Previous
                </Link>
              )}
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/executives?page=${page + 1}`}
                  className="pagination-btn"
                >
                  Next →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
