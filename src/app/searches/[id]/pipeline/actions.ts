"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  createPipelineEntry,
  updatePipelineEntryStage,
  updatePipelineEntryOwner,
  PIPELINE_STAGES,
} from "@/lib/pipeline";

const addExecutiveSchema = z.object({
  executiveId: z.string().uuid("Select an executive"),
  ownerId: z.string().uuid("Select an owner"),
});

const updateStageSchema = z.object({
  stage: z.enum(PIPELINE_STAGES),
});

const updateOwnerSchema = z.object({
  ownerId: z.string().uuid("Select an owner"),
});

export async function addExecutiveToPipelineAction(
  searchId: string,
  formData: FormData,
): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const raw = {
    executiveId: formData.get("executiveId") as string,
    ownerId: formData.get("ownerId") as string,
  };

  const parsed = addExecutiveSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/searches/${searchId}?pipeline_error=invalid_input`);
  }

  const result = await createPipelineEntry({
    executiveId: parsed.data.executiveId,
    searchId,
    ownerId: parsed.data.ownerId,
  });

  if (!result.ok) {
    redirect(`/searches/${searchId}?pipeline_error=duplicate_open`);
  }

  redirect(`/searches/${searchId}`);
}

export async function updatePipelineStageAction(
  entryId: string,
  searchId: string,
  formData: FormData,
): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const raw = { stage: formData.get("stage") as string };
  const parsed = updateStageSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/searches/${searchId}?pipeline_error=invalid_stage`);
  }

  const result = await updatePipelineEntryStage(entryId, parsed.data.stage);
  if (!result.ok) {
    redirect(`/searches/${searchId}?pipeline_error=entry_not_found`);
  }

  redirect(`/searches/${searchId}`);
}

export async function updatePipelineOwnerAction(
  entryId: string,
  searchId: string,
  formData: FormData,
): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const raw = { ownerId: formData.get("ownerId") as string };
  const parsed = updateOwnerSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/searches/${searchId}?pipeline_error=invalid_owner`);
  }

  const result = await updatePipelineEntryOwner(entryId, parsed.data.ownerId);
  if (!result.ok) {
    redirect(`/searches/${searchId}?pipeline_error=entry_not_found`);
  }

  redirect(`/searches/${searchId}`);
}
