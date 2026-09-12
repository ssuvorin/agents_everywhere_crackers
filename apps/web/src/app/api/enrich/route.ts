/**
 * POST /api/enrich — Exa-powered lookups for the web agent.
 *   { kind: "contact", name, company }  → current public info on a person
 *   { kind: "jobs",    query, location } → live job postings matching a goal
 * Both return the same SearchHit[] shape the channel's search_web produces.
 */
import { NextResponse } from "next/server";
import { searchWeb, isSearchConfigured } from "agent-core";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSearchConfigured()) {
    return NextResponse.json(
      { error: "EXA_API_KEY is not configured" },
      { status: 500 },
    );
  }
  const body = (await req.json()) as {
    kind?: "contact" | "jobs";
    name?: string;
    company?: string;
    query?: string;
    location?: string;
  };

  let query: string;
  if (body.kind === "contact") {
    query = [body.name, body.company].filter(Boolean).join(" ");
    if (!query) return NextResponse.json({ error: "Missing name" }, { status: 400 });
    query = `${query} LinkedIn current role`;
  } else if (body.kind === "jobs") {
    if (!body.query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
    query = `${body.query} jobs ${body.location ?? ""} hiring`.trim();
  } else {
    return NextResponse.json({ error: "kind must be contact|jobs" }, { status: 400 });
  }

  const results = await searchWeb({ query, results: 6 });
  return NextResponse.json({ query, results });
}
