/**
 * POST /api/import — accepts a LinkedIn data-export zip, rebuilds the
 * relationship graph and the embedded message index.
 *
 * Flow: unzip → parse Connections/messages → write graph.json → embed every
 * message via OpenRouter → write messages-index.json. The graph page and the
 * agent's semantic search both read what this produces.
 */
import { NextResponse } from "next/server";
import {
  buildGraph,
  embedTexts,
  saveGraph,
  saveIndex,
} from "@/lib/server/linkedin";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  const zip = new Uint8Array(await file.arrayBuffer());

  let parsed;
  try {
    parsed = buildGraph(zip);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Not a LinkedIn export zip: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 422 },
    );
  }
  const { graph, messages, stats } = parsed;

  await saveGraph(graph);

  // Embed message contents for semantic search. Cap to keep the import inside
  // the request budget — the most recent messages matter most anyway.
  const toEmbed = messages.slice(0, 800);
  const vectors = await embedTexts(
    toEmbed.map((m) => `${m.other}: ${m.content}`.slice(0, 500)),
    apiKey,
  );
  toEmbed.forEach((m, i) => {
    m.embedding = vectors[i];
  });
  await saveIndex(toEmbed);

  return NextResponse.json({
    ok: true,
    contacts: stats.contacts,
    messages: stats.messages,
    embedded: toEmbed.length,
    skipped: stats.skipped,
  });
}
