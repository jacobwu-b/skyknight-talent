"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createExecutive, updateExecutive } from "@/lib/executives";

const executiveSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  linkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  currentRole: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

export type ActionState = {
  errors?: Record<string, string>;
  fieldValues?: Record<string, string>;
};

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createExecutiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: (formData.get("phone") as string) || undefined,
    linkedinUrl: (formData.get("linkedinUrl") as string) || undefined,
    currentRole: (formData.get("currentRole") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
    tags: (formData.get("tags") as string) || undefined,
  };

  const parsed = executiveSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      errors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [
          k,
          v?.[0] ?? "Invalid",
        ]),
      ),
      fieldValues: raw as Record<string, string>,
    };
  }

  const { tags: tagsRaw, linkedinUrl, ...rest } = parsed.data;
  const result = await createExecutive({
    ...rest,
    linkedinUrl: linkedinUrl || null,
    tags: parseTags(tagsRaw),
  });

  if (!result.ok) {
    return {
      errors: {
        email: `This email is already in use. View the existing record: /executives/${result.existingId}`,
      },
      fieldValues: raw as Record<string, string>,
    };
  }

  redirect(`/executives/${result.id}`);
}

export async function updateExecutiveAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: (formData.get("phone") as string) || undefined,
    linkedinUrl: (formData.get("linkedinUrl") as string) || undefined,
    currentRole: (formData.get("currentRole") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
    tags: (formData.get("tags") as string) || undefined,
  };

  const parsed = executiveSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      errors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [
          k,
          v?.[0] ?? "Invalid",
        ]),
      ),
      fieldValues: raw as Record<string, string>,
    };
  }

  const { tags: tagsRaw, linkedinUrl, ...rest } = parsed.data;
  const result = await updateExecutive(id, {
    ...rest,
    linkedinUrl: linkedinUrl || null,
    tags: parseTags(tagsRaw),
  });

  if (!result.ok) {
    if (result.error === "duplicate_email") {
      return {
        errors: {
          email: `This email is already in use. View the existing record: /executives/${result.existingId}`,
        },
        fieldValues: raw as Record<string, string>,
      };
    }
    return { errors: { _form: "Executive not found." } };
  }

  redirect(`/executives/${id}`);
}
