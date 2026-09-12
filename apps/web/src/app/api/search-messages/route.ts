/**
 * GET /api/search-messages?q=… — semantic search over the embedded LinkedIn
 * message index produced by /api/import. Embeds the query via OpenRouter and
 * returns the closest messages by cosine similarity.
 */
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cosine, embedTexts, type MessageRecord } from "@/lib/server/linkedin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured" },
      { status: 500 },
    );
  }
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }

  let index: MessageRecord[];
  try {
    index = JSON.parse(
      await readFile(
        path.join(process.cwd(), "public", "data", "messages-index.json"),
        "utf-8",
      ),
    );
  } catch {
    return NextResponse.json(
      { error: "No message index — run the LinkedIn import first" },
      { status: 404 },
    );
  }

  const [qv] = await embedTexts([q], apiKey);
  const hits = index
    .filter((m) => m.embedding)
    .map((m) => ({
      other: m.other,
      from: m.from,
      date: m.date,
      content: m.content.slice(0, 200),
      score: cosine(qv, m.embedding!),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return NextResponse.json({ query: q, hits });
}
