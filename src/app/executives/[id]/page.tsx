import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getExecutive } from "@/lib/executives";

export const dynamic = "force-dynamic";

export default async function ExecutiveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const { id } = await params;
  const exec = await getExecutive(id);
  if (!exec) notFound();

  return (
    <div className="page-shell">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/executives" className="back-link">
            ← Executives
          </Link>
          <h1>{exec.name}</h1>
        </div>
        <div className="user-chip">
          <span>{user.name}</span>
          <span className={`role-badge ${user.role}`}>{user.role}</span>
          <Link href={`/executives/${exec.id}/edit`} className="btn-outline">
            Edit
          </Link>
        </div>
      </div>

      <div className="detail-grid">
        <section className="detail-card">
          <h2 className="section-title">Contact</h2>
          <dl className="field-list">
            <div className="field-row">
              <dt>Email</dt>
              <dd>{exec.email}</dd>
            </div>
            <div className="field-row">
              <dt>Phone</dt>
              <dd>{exec.phone ?? <span className="muted">—</span>}</dd>
            </div>
            <div className="field-row">
              <dt>LinkedIn</dt>
              <dd>
                {exec.linkedinUrl ? (
                  <a
                    href={exec.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link"
                  >
                    {exec.linkedinUrl}
                  </a>
                ) : (
                  <span className="muted">—</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="detail-card">
          <h2 className="section-title">Role</h2>
          <dl className="field-list">
            <div className="field-row">
              <dt>Current Role</dt>
              <dd>{exec.currentRole ?? <span className="muted">—</span>}</dd>
            </div>
            <div className="field-row">
              <dt>Tags</dt>
              <dd>
                {exec.tags.length > 0 ? (
                  <span className="tag-list">
                    {exec.tags.map((tag) => (
                      <span key={tag} className="tag-chip">{tag}</span>
                    ))}
                  </span>
                ) : (
                  <span className="muted">—</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {exec.notes && (
          <section className="detail-card detail-card--full">
            <h2 className="section-title">Notes</h2>
            <p className="notes-text">{exec.notes}</p>
          </section>
        )}

        <section className="detail-card detail-card--full detail-card--placeholder">
          <h2 className="section-title">Searches</h2>
          <p className="muted placeholder-text">
            Pipeline entries will appear here — coming in a future release.
          </p>
        </section>

        <section className="detail-card detail-card--full detail-card--placeholder">
          <h2 className="section-title">Interaction History</h2>
          <p className="muted placeholder-text">
            Email and call log will appear here — coming in a future release.
          </p>
        </section>
      </div>

      <div className="detail-timestamps">
        <span>Created {formatDate(exec.createdAt)}</span>
        <span>·</span>
        <span>Updated {formatDate(exec.updatedAt)}</span>
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
