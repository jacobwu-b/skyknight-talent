import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getSearch } from "@/lib/searches";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  paused: "Paused",
  filled: "Filled",
};

export default async function SearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const { id } = await params;
  const search = await getSearch(id);
  if (!search) notFound();

  const isFilled = search.status === "filled";

  return (
    <div className="page-shell">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/searches" className="back-link">
            ← Searches
          </Link>
          <h1>{search.roleTitle}</h1>
          <span className={`status-badge status-${search.status}`}>
            {STATUS_LABELS[search.status]}
          </span>
        </div>
        <div className="user-chip">
          <span>{user.name}</span>
          <span className={`role-badge ${user.role}`}>{user.role}</span>
          {!isFilled && (
            <Link href={`/searches/${search.id}/edit`} className="btn-outline">
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <section className="detail-card">
          <h2 className="section-title">Search Details</h2>
          <dl className="field-list">
            <div className="field-row">
              <dt>Portfolio Company</dt>
              <dd>{search.portfolioCompany}</dd>
            </div>
            <div className="field-row">
              <dt>Role Title</dt>
              <dd>{search.roleTitle}</dd>
            </div>
            <div className="field-row">
              <dt>Hiring Manager</dt>
              <dd>{search.hiringManager}</dd>
            </div>
            <div className="field-row">
              <dt>Status</dt>
              <dd>
                <span className={`status-badge status-${search.status}`}>
                  {STATUS_LABELS[search.status]}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="detail-card detail-card--full detail-card--placeholder">
          <h2 className="section-title">Pipeline</h2>
          <p className="muted placeholder-text">
            Candidates grouped by stage will appear here — coming in U2.3.
          </p>
        </section>
      </div>

      <div className="detail-timestamps">
        <span>Created {formatDate(search.createdAt)}</span>
        <span>·</span>
        <span>Updated {formatDate(search.updatedAt)}</span>
      </div>
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
