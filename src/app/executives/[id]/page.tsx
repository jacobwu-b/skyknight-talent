import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getExecutive, listInteractionsForExecutive } from "@/lib/executives";
import {
  listSearchEntriesForExecutive,
  PIPELINE_STAGE_LABELS,
} from "@/lib/pipeline";
import type { PartnerExecutivePipelineEntryRow } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

const INTERACTION_PAGE_SIZE = 50;

export default async function ExecutiveDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show_all_interactions?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const { id } = await params;
  const { show_all_interactions } = await searchParams;
  const showAll = show_all_interactions === "1";
  const interactionLimit = showAll ? 500 : INTERACTION_PAGE_SIZE;

  const [exec, searchEntries, { interactions, hasMore }] = await Promise.all([
    getExecutive(id),
    listSearchEntriesForExecutive(id, user.role),
    listInteractionsForExecutive(id, interactionLimit),
  ]);

  if (!exec) notFound();

  const isPartner = user.role === "partner";

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

        <section className="detail-card detail-card--full">
          <h2 className="section-title">Searches</h2>
          {searchEntries.length === 0 ? (
            <div className="empty-state" style={{ marginTop: "0.5rem" }}>
              <p className="muted">Not in any searches yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Portfolio Company</th>
                    <th>Role Title</th>
                    <th>Stage</th>
                    <th>Owner</th>
                    {isPartner && <th>Base Salary</th>}
                    {isPartner && <th>Target Bonus</th>}
                    {isPartner && <th>Equity</th>}
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {searchEntries.map((entry) => {
                    const partnerEntry = isPartner
                      ? (entry as PartnerExecutivePipelineEntryRow)
                      : null;
                    return (
                      <tr key={entry.id}>
                        <td>
                          <Link
                            href={`/searches/${entry.searchId}`}
                            className="row-link"
                          >
                            {entry.portfolioCompany}
                          </Link>
                        </td>
                        <td>{entry.roleTitle}</td>
                        <td>
                          <span className={`stage-badge stage-${entry.stage}`}>
                            {PIPELINE_STAGE_LABELS[entry.stage]}
                          </span>
                        </td>
                        <td>{entry.ownerName}</td>
                        {isPartner && partnerEntry && (
                          <>
                            <td>
                              {partnerEntry.baseSalaryCents != null
                                ? formatCents(partnerEntry.baseSalaryCents)
                                : <span className="muted">—</span>}
                            </td>
                            <td>
                              {partnerEntry.targetBonusCents != null
                                ? formatCents(partnerEntry.targetBonusCents)
                                : <span className="muted">—</span>}
                            </td>
                            <td>
                              {partnerEntry.equityBps != null
                                ? `${(partnerEntry.equityBps / 100).toFixed(2)}%`
                                : <span className="muted">—</span>}
                            </td>
                          </>
                        )}
                        <td className="muted">{formatDate(entry.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="detail-card detail-card--full">
          <h2 className="section-title">Interaction History</h2>
          {interactions.length === 0 ? (
            <div className="empty-state" style={{ marginTop: "0.5rem" }}>
              <p className="muted">No interactions yet.</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Direction</th>
                      <th>From</th>
                      <th>Subject</th>
                      <th>Excerpt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interactions.map((i) => (
                      <tr key={i.id}>
                        <td className="muted" style={{ whiteSpace: "nowrap" }}>
                          {formatDateTime(i.occurredAt)}
                        </td>
                        <td>
                          <span
                            className={`direction-badge direction-${i.direction}`}
                          >
                            {i.direction}
                          </span>
                        </td>
                        <td>{i.senderName ?? <span className="muted">—</span>}</td>
                        <td>{i.subject ?? <span className="muted">—</span>}</td>
                        <td className="muted">
                          {i.bodyExcerpt ?? <span className="muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMore && !showAll && (
                <div style={{ marginTop: "0.75rem" }}>
                  <Link
                    href={`/executives/${exec.id}?show_all_interactions=1`}
                    className="btn-outline btn--sm"
                  >
                    Load more
                  </Link>
                </div>
              )}
            </>
          )}
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

function formatDateTime(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
