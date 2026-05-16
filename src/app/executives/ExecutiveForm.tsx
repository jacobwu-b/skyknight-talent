"use client";

import { useActionState } from "react";
import { createExecutiveAction, updateExecutiveAction, ActionState } from "./actions";
import Link from "next/link";

type DefaultValues = {
  name?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  currentRole?: string;
  notes?: string;
  tags?: string;
};

type Props =
  | { mode: "create"; id?: never; defaultValues?: DefaultValues }
  | { mode: "edit"; id: string; defaultValues?: DefaultValues };

const initialState: ActionState = {};

function boundUpdateAction(id: string) {
  return (prev: ActionState, formData: FormData) =>
    updateExecutiveAction(id, prev, formData);
}

export function ExecutiveForm({ mode, id, defaultValues = {} }: Props) {
  const action =
    mode === "create"
      ? createExecutiveAction
      : boundUpdateAction(id!);

  const [state, formAction, isPending] = useActionState(action, initialState);

  const vals = state.fieldValues ?? defaultValues;

  return (
    <form action={formAction} className="exec-form">
      {state.errors?._form && (
        <div className="form-error-banner">{state.errors._form}</div>
      )}

      <div className="form-row">
        <label htmlFor="name" className="form-label">
          Name <span className="form-required">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={vals.name ?? ""}
          className={`form-input${state.errors?.name ? " form-input--error" : ""}`}
          placeholder="Full name"
        />
        {state.errors?.name && (
          <span className="form-field-error">{state.errors.name}</span>
        )}
      </div>

      <div className="form-row">
        <label htmlFor="email" className="form-label">
          Email <span className="form-required">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={vals.email ?? ""}
          className={`form-input${state.errors?.email ? " form-input--error" : ""}`}
          placeholder="email@example.com"
        />
        {state.errors?.email && (
          <span className="form-field-error">
            {state.errors.email.startsWith("This email is already in use") ? (
              <>
                This email is already in use.{" "}
                <Link
                  href={state.errors.email.replace(
                    /.*\/executives\//,
                    "/executives/",
                  )}
                  className="form-error-link"
                >
                  View existing record
                </Link>
              </>
            ) : (
              state.errors.email
            )}
          </span>
        )}
      </div>

      <div className="form-row">
        <label htmlFor="currentRole" className="form-label">
          Current Role
        </label>
        <input
          id="currentRole"
          name="currentRole"
          type="text"
          defaultValue={vals.currentRole ?? ""}
          className="form-input"
          placeholder="e.g. Chief Revenue Officer"
        />
      </div>

      <div className="form-row">
        <label htmlFor="phone" className="form-label">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={vals.phone ?? ""}
          className="form-input"
          placeholder="+1-555-000-0000"
        />
      </div>

      <div className="form-row">
        <label htmlFor="linkedinUrl" className="form-label">
          LinkedIn URL
        </label>
        <input
          id="linkedinUrl"
          name="linkedinUrl"
          type="url"
          defaultValue={vals.linkedinUrl ?? ""}
          className={`form-input${state.errors?.linkedinUrl ? " form-input--error" : ""}`}
          placeholder="https://linkedin.com/in/..."
        />
        {state.errors?.linkedinUrl && (
          <span className="form-field-error">{state.errors.linkedinUrl}</span>
        )}
      </div>

      <div className="form-row">
        <label htmlFor="tags" className="form-label">
          Tags
          <span className="form-hint">comma-separated</span>
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          defaultValue={vals.tags ?? ""}
          className="form-input"
          placeholder="fintech, series-b, cpo"
        />
      </div>

      <div className="form-row">
        <label htmlFor="notes" className="form-label">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={vals.notes ?? ""}
          className="form-textarea"
          placeholder="Any additional context..."
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create Executive"
              : "Save Changes"}
        </button>
        <Link
          href={mode === "edit" ? `/executives/${id}` : "/executives"}
          className="btn-ghost"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
