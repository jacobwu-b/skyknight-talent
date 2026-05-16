import { NextRequest, NextResponse } from "next/server";
import {
  ingestInbound,
  postmarkInboundSchema,
  verifyWebhookSecret,
} from "@/lib/inbound";

export async function POST(request: NextRequest) {
  const providedSecret = request.headers.get("x-postmark-webhook-secret");
  if (!verifyWebhookSecret(providedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawJson: unknown;
  try {
    rawJson = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postmarkInboundSchema.safeParse(rawJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Malformed payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const outcome = await ingestInbound(parsed.data, rawJson);
  return NextResponse.json({ outcome }, { status: 200 });
}
