"use client";

import { useActionState } from "react";
import { createSearchAction, updateSearchAction, ActionState } from "./actions";
import Link from "next/link";

type DefaultValues = {
  portfolioCompany?: string;
  roleTitle?: string;
  hiringManager?: string;
  status?: "open" | "paused" | "filled";
};

type Props =
  | { mode: "create"; id?: never; defaultValues?: DefaultValues }
  | { mode: "edit"; id: string; defaultValues?: DefaultValues };

const initialState: ActionState = {};

function boundUpdateAction(id: string) {
  return (prev: ActionState, formData: FormData) =>
    updateSearchAction(id, prev, formData);
}

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  paused: "Paused",
  filled: "Filled",
};

const NEXT_STATUSES: Record<string, Array<"open" | "paused" | "filled">> = {
  open: ["open", "paused", "filled"],
  paused: ["paused", "open", "filled"],
  filled: ["filled"],
};

export function SearchForm({ mode, id, defaultValues = {} }: Props) {
  const action =
    mode === "create" ? createSearchAction : boundUpdateAction(id!);

  const [state, formAction, isPending] = useActionState(action, initialState);

  const vals = state.fieldValues ?? defaultValues;
  const currentStatus = vals.status ?? "open";
  const isFilled = currentStatus === "filled";
  const availableStatuses = mode === "edit" ? (NEXT_STATUSES[currentStatus] ?? [currentStatus as "open" | "paused" | "filled"]) : [];

  return (
    <form action={formAction} className="exec-form">
      {state.errors?._form && (
        <div className="form-error-banner">{state.errors._form}</div>
      )}

      {mode === "create" && (
        <div className="form-row">
          <label htmlFor="portfolioCompany" className="form-label">
            Portfolio Company <span className="form-required">*</span>
          </label>
          <input
            id="portfolioCompany"
            name="portfolioCompany"
            type="text"
            required
            defaultValue={vals.portfolioCompany ?? ""}
            className={`form-input${state.errors?.portfolioCompany ? " form-input--error" : ""}`}
            placeholder="e.g. Acme Corp"
          />
          {state.errors?.portfolioCompany && (
            <span className="form-field-error">{state.errors.portfolioCompany}</span>
          )}
        </div>
      )}

      <div className="form-row">
        <label htmlFor="roleTitle" className="form-label">
          Role Title <span className="form-required">*</span>
        </label>
        <input
          id="roleTitle"
          name="roleTitle"
          type="text"
          required
          disabled={isFilled}
          defaultValue={vals.roleTitle ?? ""}
          className={`form-input${state.errors?.roleTitle ? " form-input--error" : ""}${isFilled ? " form-input--disabled" : ""}`}
          placeholder="e.g. Chief Revenue Officer"
        />
        {state.errors?.roleTitle && (
          <span className="form-field-error">{state.errors.roleTitle}</span>
        )}
      </div>

      <div className="form-row">
        <label htmlFor="hiringManager" className="form-label">
          Hiring Manager <span className="form-required">*</span>
        </label>
        <input
          id="hiringManager"
          name="hiringManager"
          type="text"
          required
          disabled={isFilled}
          defaultValue={vals.hiringManager ?? ""}
          className={`form-input${state.errors?.hiringManager ? " form-input--error" : ""}${isFilled ? " form-input--disabled" : ""}`}
          placeholder="e.g. Jane Smith"
        />
        {state.errors?.hiringManager && (
          <span className="form-field-error">{state.errors.hiringManager}</span>
        )}
      </div>

      {mode === "edit" && (
        <div className="form-row">
          <label htmlFor="status" className="form-label">
            Status
          </label>
          <select
            id="status"
            name="status"
            disabled={isFilled}
            defaultValue={currentStatus}
            className={`form-input${state.errors?.status ? " form-input--error" : ""}${isFilled ? " form-input--disabled" : ""}`}
          >
            {availableStatuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {state.errors?.status && (
            <span className="form-field-error">{state.errors.status}</span>
          )}
          {isFilled && (
            <span className="form-hint">Filled searches are read-only.</span>
          )}
        </div>
      )}

      <div className="form-actions">
        {isFilled ? (
          <Link href={`/searches/${id}`} className="btn-ghost">
            Back to Search
          </Link>
        ) : (
          <>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending
                ? mode === "create"
                  ? "Creating…"
                  : "Saving…"
                : mode === "create"
                  ? "Create Search"
                  : "Save Changes"}
            </button>
            <Link
              href={mode === "edit" ? `/searches/${id}` : "/searches"}
              className="btn-ghost"
            >
              Cancel
            </Link>
          </>
        )}
      </div>
    </form>
  );
}
