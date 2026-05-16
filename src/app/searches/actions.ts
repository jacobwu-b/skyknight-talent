"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createSearch, updateSearch } from "@/lib/searches";

const createSchema = z.object({
  portfolioCompany: z.string().min(1, "Portfolio company is required"),
  roleTitle: z.string().min(1, "Role title is required"),
  hiringManager: z.string().min(1, "Hiring manager is required"),
});

const updateSchema = z.object({
  roleTitle: z.string().min(1, "Role title is required"),
  hiringManager: z.string().min(1, "Hiring manager is required"),
  status: z.enum(["open", "paused", "filled"]),
});

export type ActionState = {
  errors?: Record<string, string>;
  fieldValues?: Record<string, string>;
};

export async function createSearchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const raw = {
    portfolioCompany: formData.get("portfolioCompany") as string,
    roleTitle: formData.get("roleTitle") as string,
    hiringManager: formData.get("hiringManager") as string,
  };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      errors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [
          k,
          v?.[0] ?? "Invalid",
        ]),
      ),
      fieldValues: raw,
    };
  }

  const result = await createSearch(parsed.data);
  redirect(`/searches/${result.id}`);
}

export async function updateSearchAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const raw = {
    roleTitle: formData.get("roleTitle") as string,
    hiringManager: formData.get("hiringManager") as string,
    status: formData.get("status") as string,
  };

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      errors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [
          k,
          v?.[0] ?? "Invalid",
        ]),
      ),
      fieldValues: raw,
    };
  }

  const result = await updateSearch(id, parsed.data);

  if (!result.ok) {
    if (result.error === "invalid_transition") {
      return {
        errors: {
          status: "That status transition is not allowed. Filled searches are read-only.",
        },
        fieldValues: raw,
      };
    }
    return { errors: { _form: "Search not found." } };
  }

  redirect(`/searches/${id}`);
}
