/**
 * POST /api/workspace — file an approved follow-up into the Ambiguous
 * workspace: CRM contact + activity + task. Mirrors the channel's
 * fileToWorkspace so the web agent can persist drafts too.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function api(path: string, body: unknown, apiKey: string) {
  const res = await fetch(`https://app.ambiguous.ai${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

export async function POST(req: Request) {
  const apiKey = process.env.AMBIGUOUS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AMBIGUOUS_API_KEY is not configured" },
      { status: 500 },
    );
  }
  const { person, draft, context, linkedin_url } = (await req.json()) as {
    person?: string;
    draft?: string;
    context?: string;
    linkedin_url?: string;
  };
  if (!person || !draft) {
    return NextResponse.json(
      { error: "Missing person or draft" },
      { status: 400 },
    );
  }

  try {
    const contact = await api(
      "/api/crm/contacts",
      { name: person, type: "person", ...(linkedin_url ? { linkedin_url } : {}) },
      apiKey,
    );
    const contactId = (contact?.id ??
      (contact?.contact as Record<string, unknown> | undefined)?.id) as
      | string
      | undefined;
    await api(
      "/api/crm/activities",
      {
        type: "note",
        subject: "Follow-up drafted from web",
        body: `${draft}\n\n—\nContext: ${context ?? "—"}`,
        ...(contactId ? { contact_id: contactId } : {}),
      },
      apiKey,
    );
    const task = await api(
      "/api/tasks",
      {
        title: `Follow up with ${person}`,
        description: draft,
        ...(contactId ? { contact_id: contactId } : {}),
      },
      apiKey,
    );
    const taskId = String(
      task?.id ??
        (task?.task as Record<string, unknown> | undefined)?.id ??
        "created",
    );
    return NextResponse.json({
      ok: true,
      contact_id: contactId,
      task_id: taskId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Workspace write failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }
}
