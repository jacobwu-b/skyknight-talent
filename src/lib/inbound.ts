import { desc, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db";
import {
  executives,
  executiveInteractions,
  unmatchedInbound,
} from "./db/schema";
import { env } from "./env";
import { listOpenPipelineEntryIdsForExecutive } from "./pipeline";

// Postmark Inbound payload (only the fields we read; provider may add more).
// https://postmarkapp.com/developer/webhooks/inbound-webhook
const addressEntrySchema = z.object({
  Email: z.string().email(),
  Name: z.string().optional(),
  MailboxHash: z.string().optional(),
});

export const postmarkInboundSchema = z
  .object({
    MessageID: z.string().min(1),
    From: z.string().email(),
    Subject: z.string().optional().default(""),
    TextBody: z.string().optional().default(""),
    Date: z.string().optional(),
    ToFull: z.array(addressEntrySchema).optional().default([]),
    CcFull: z.array(addressEntrySchema).optional().default([]),
    BccFull: z.array(addressEntrySchema).optional().default([]),
  })
  .passthrough();

export type PostmarkInboundPayload = z.infer<typeof postmarkInboundSchema>;

export const BODY_EXCERPT_LIMIT = 500;

export type IngestOutcome =
  | { kind: "duplicate"; messageId: string }
  | {
      kind: "matched_with_entries";
      executiveId: string;
      interactionIds: string[];
    }
  | { kind: "matched_no_entries"; executiveId: string; interactionId: string }
  | {
      kind: "matched_ambiguous";
      executiveId: string;
      interactionIds: string[];
      candidateIds: string[];
    }
  | { kind: "unmatched"; unmatchedId: string };

export function verifyWebhookSecret(
  providedSecret: string | null | undefined,
): boolean {
  if (!providedSecret) return false;
  const expected = env.POSTMARK_INBOUND_WEBHOOK_SECRET;
  return timingSafeEqualStrings(providedSecret, expected);
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function truncateBody(text: string): string {
  if (text.length <= BODY_EXCERPT_LIMIT) return text;
  return text.slice(0, BODY_EXCERPT_LIMIT);
}

export function recipientAddresses(
  payload: PostmarkInboundPayload,
): string[] {
  const tracking = env.INBOUND_MAILBOX_ADDRESS.toLowerCase();
  const all = [...payload.ToFull, ...payload.CcFull, ...payload.BccFull].map(
    (e) => e.Email.toLowerCase(),
  );
  const filtered = all.filter((email) => email !== tracking);
  return Array.from(new Set(filtered));
}

function parseOccurredAt(payload: PostmarkInboundPayload): Date {
  if (payload.Date) {
    const parsed = new Date(payload.Date);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export async function ingestInbound(
  payload: PostmarkInboundPayload,
  rawPayload: unknown,
): Promise<IngestOutcome> {
  const db = getDb();
  const messageId = payload.MessageID;
  const occurredAt = parseOccurredAt(payload);
  const subject = payload.Subject ?? "";
  const bodyExcerpt = truncateBody(payload.TextBody ?? "");

  const recipients = recipientAddresses(payload);

  // Match candidate executives by any recipient email (case-insensitive).
  const matches = recipients.length
    ? await db
        .select({
          id: executives.id,
          email: executives.email,
          updatedAt: executives.updatedAt,
        })
        .from(executives)
        .where(inArray(sql<string>`lower(${executives.email})`, recipients))
        .orderBy(desc(executives.updatedAt))
    : [];

  if (matches.length === 0) {
    try {
      const [row] = await db
        .insert(unmatchedInbound)
        .values({
          postmarkMessageId: messageId,
          fromAddress: payload.From,
          toAddresses: recipients,
          subject,
          bodyExcerpt,
          occurredAt,
          rawPayload: rawPayload as object,
        })
        .returning({ id: unmatchedInbound.id });
      return { kind: "unmatched", unmatchedId: row.id };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return { kind: "duplicate", messageId };
      }
      throw err;
    }
  }

  // Sort already done (desc updatedAt). Pick the freshest exec if ambiguous.
  const chosen = matches[0];
  const isAmbiguous = matches.length > 1;
  const ambiguityNote = isAmbiguous
    ? `Ambiguous recipient: matched ${matches.length} executives sharing email; picked most-recently-updated.`
    : null;

  // Open pipeline entries for the chosen executive — go through the repository
  // boundary so comp-field redaction stays the single enforcement point.
  const openEntryIds = await listOpenPipelineEntryIdsForExecutive(chosen.id);
  const openEntries = openEntryIds.map((id) => ({ id }));

  if (openEntries.length === 0) {
    try {
      const [row] = await db
        .insert(executiveInteractions)
        .values({
          executiveId: chosen.id,
          pipelineEntryId: null,
          senderId: null,
          senderRole: "partner",
          direction: "outbound",
          occurredAt,
          subject,
          bodyExcerpt,
          postmarkMessageId: messageId,
          notes: ambiguityNote,
        })
        .returning({ id: executiveInteractions.id });

      if (isAmbiguous) {
        return {
          kind: "matched_ambiguous",
          executiveId: chosen.id,
          interactionIds: [row.id],
          candidateIds: matches.map((m) => m.id),
        };
      }
      return {
        kind: "matched_no_entries",
        executiveId: chosen.id,
        interactionId: row.id,
      };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return { kind: "duplicate", messageId };
      }
      throw err;
    }
  }

  try {
    const rows = await db
      .insert(executiveInteractions)
      .values(
        openEntries.map((entry) => ({
          executiveId: chosen.id,
          pipelineEntryId: entry.id,
          senderId: null,
          senderRole: "partner" as const,
          direction: "outbound" as const,
          occurredAt,
          subject,
          bodyExcerpt,
          postmarkMessageId: messageId,
          notes: ambiguityNote,
        })),
      )
      .returning({ id: executiveInteractions.id });

    if (isAmbiguous) {
      return {
        kind: "matched_ambiguous",
        executiveId: chosen.id,
        interactionIds: rows.map((r) => r.id),
        candidateIds: matches.map((m) => m.id),
      };
    }
    return {
      kind: "matched_with_entries",
      executiveId: chosen.id,
      interactionIds: rows.map((r) => r.id),
    };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return { kind: "duplicate", messageId };
    }
    throw err;
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

