/**
 * POST /api/slack — post a message to the Slack channel via the incoming
 * webhook. Used by the web agent's send_to_slack tool so a drafted follow-up
 * can be pushed to Slack for approval.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json(
      { error: "SLACK_WEBHOOK_URL is not configured" },
      { status: 500 },
    );
  }
  const { text } = (await req.json()) as { text?: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Slack webhook failed: ${res.status}` },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
