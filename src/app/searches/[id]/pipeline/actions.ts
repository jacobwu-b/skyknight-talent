"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  createPipelineEntry,
  updatePipelineEntryStage,
  updatePipelineEntryOwner,
  updatePipelineEntryComp,
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

// Dollars submitted by the form; stored as cents in the DB.
function dollarsToCents(raw: string | null): number | null | undefined {
  if (raw === null || raw === "") return undefined;
  const n = parseFloat(raw);
  return isNaN(n) ? undefined : Math.round(n * 100);
}

function parseBps(raw: string | null): number | null | undefined {
  if (raw === null || raw === "") return undefined;
  const n = parseInt(raw, 10);
  return isNaN(n) ? undefined : n;
}

export async function updatePipelineCompAction(
  entryId: string,
  searchId: string,
  formData: FormData,
): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "partner") {
    redirect(`/searches/${searchId}?pipeline_error=forbidden`);
  }

  const baseSalaryCents = dollarsToCents(formData.get("baseSalaryCents") as string | null);
  const targetBonusCents = dollarsToCents(formData.get("targetBonusCents") as string | null);
  const equityBps = parseBps(formData.get("equityBps") as string | null);

  const comp = Object.fromEntries(
    Object.entries({ baseSalaryCents, targetBonusCents, equityBps }).filter(
      ([, v]) => v !== undefined,
    ),
  ) as { baseSalaryCents?: number | null; targetBonusCents?: number | null; equityBps?: number | null };

  if (Object.keys(comp).length === 0) {
    redirect(`/searches/${searchId}`);
  }

  const result = await updatePipelineEntryComp(entryId, comp);
  if (!result.ok) {
    redirect(`/searches/${searchId}?pipeline_error=entry_not_found`);
  }

  redirect(`/searches/${searchId}`);
}
