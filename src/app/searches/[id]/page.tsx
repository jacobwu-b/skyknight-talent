import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getSearch } from "@/lib/searches";
import {
  listPipelineEntriesForSearch,
  listUsersForOwnerSelect,
  listAllExecutives,
  groupPipelineEntriesByStage,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
} from "@/lib/pipeline";
import {
  addExecutiveToPipelineAction,
  updatePipelineStageAction,
  updatePipelineOwnerAction,
} from "./pipeline/actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  paused: "Paused",
  filled: "Filled",
};

const PIPELINE_ERROR_MESSAGES: Record<string, string> = {
  duplicate_open: "That executive is already in this pipeline.",
  invalid_input: "Please select an executive and an owner.",
  invalid_stage: "Invalid stage selected.",
  invalid_owner: "Invalid owner selected.",
  entry_not_found: "Pipeline entry not found.",
};

export default async function SearchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pipeline_error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const { id } = await params;
  const { pipeline_error } = await searchParams;

  const [search, entries, allUsers, allExecutives] = await Promise.all([
    getSearch(id),
    listPipelineEntriesForSearch(id),
    listUsersForOwnerSelect(),
    listAllExecutives(),
  ]);

  if (!search) notFound();

  const isFilled = search.status === "filled";
  const pipelineError = pipeline_error
    ? (PIPELINE_ERROR_MESSAGES[pipeline_error] ?? "An error occurred.")
    : null;

  const grouped = groupPipelineEntriesByStage(entries);
  const addAction = addExecutiveToPipelineAction.bind(null, id);

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

        <section className="detail-card detail-card--full">
          <h2 className="section-title">Pipeline</h2>

          {pipelineError && (
            <div className="form-error" style={{ marginBottom: "1rem" }}>
              {pipelineError}
            </div>
          )}

          {!isFilled && (
            <form action={addAction} className="pipeline-add-form">
              <div className="pipeline-add-fields">
                <div className="field-group">
                  <label htmlFor="executiveId" className="field-label">
                    Executive
                  </label>
                  <select
                    id="executiveId"
                    name="executiveId"
                    required
                    className="select-input"
                  >
                    <option value="">Select executive…</option>
                    {allExecutives.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                        {e.currentRole ? ` — ${e.currentRole}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label htmlFor="ownerId" className="field-label">
                    Owner
                  </label>
                  <select
                    id="ownerId"
                    name="ownerId"
                    required
                    className="select-input"
                  >
                    <option value="">Assign owner…</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="btn-primary">
                  Add to Pipeline
                </button>
              </div>
            </form>
          )}

          {grouped.length === 0 ? (
            <div className="empty-state" style={{ marginTop: "1rem" }}>
              <p className="muted">No candidates in this pipeline yet.</p>
            </div>
          ) : (
            <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {grouped.map(({ stage, label, entries: stageEntries }) => (
                <div key={stage}>
                  <h3 className="pipeline-stage-heading">{label}</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Executive</th>
                          <th>Owner</th>
                          <th>Last Contact</th>
                          <th>Move Stage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stageEntries.map((entry) => {
                          const stageAction = updatePipelineStageAction.bind(
                            null,
                            entry.id,
                            id,
                          );
                          const ownerAction = updatePipelineOwnerAction.bind(
                            null,
                            entry.id,
                            id,
                          );
                          return (
                            <tr key={entry.id}>
                              <td>
                                <Link
                                  href={`/executives/${entry.executiveId}`}
                                  className="row-link"
                                >
                                  {entry.executiveName}
                                </Link>
                                {entry.executiveCurrentRole && (
                                  <span className="muted" style={{ marginLeft: "0.5rem" }}>
                                    {entry.executiveCurrentRole}
                                  </span>
                                )}
                              </td>
                              <td>
                                <form action={ownerAction} className="inline-form">
                                  <select
                                    name="ownerId"
                                    defaultValue={entry.ownerId}
                                    className="select-input select-input--sm"
                                  >
                                    {allUsers.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button type="submit" className="btn-outline btn--sm">
                                    Save
                                  </button>
                                </form>
                              </td>
                              <td className="muted">—</td>
                              <td>
                                <form action={stageAction} className="inline-form">
                                  <select
                                    name="stage"
                                    defaultValue={entry.stage}
                                    className="select-input select-input--sm"
                                  >
                                    {PIPELINE_STAGES.map((s) => (
                                      <option key={s} value={s}>
                                        {PIPELINE_STAGE_LABELS[s]}
                                      </option>
                                    ))}
                                  </select>
                                  <button type="submit" className="btn-outline btn--sm">
                                    Save
                                  </button>
                                </form>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
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
