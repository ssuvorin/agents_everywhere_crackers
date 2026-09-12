/**
 * GET /api/graph-image?highlight=name1,name2 — render the relationship graph
 * as a PNG. Contacts are initials-avatars; highlighted names get a bright
 * avatar + orange ring + name label, everyone else is dimmed grey.
 * Used by the Slack agent to attach a visual to its answer.
 */
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const runtime = "nodejs";

const W = 800;
const H = 600;
const RINGS = { hot: 120, warm: 200, cold: 280 };

// Deterministic avatar palette — same person always gets the same colour.
const PALETTE = [
  "#E05D44", "#D9A03F", "#7FA653", "#3F8E8E",
  "#4F7CC4", "#7B5EA7", "#B85C8A", "#5E8C61",
];

type Node = {
  id: string;
  name: string;
  type: string;
  company: string;
  position: string;
  messages: number;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
}

function colorFor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const highlight = new Set(
    (url.searchParams.get("highlight") ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

  let graph: { nodes: Node[]; links: { source: string; target: string }[] };
  try {
    graph = JSON.parse(
      await readFile(
        path.join(process.cwd(), "public", "data", "graph.json"),
        "utf-8",
      ),
    );
  } catch {
    return NextResponse.json({ error: "No graph" }, { status: 404 });
  }

  const cx = W / 2;
  const cy = H / 2;
  const buckets: Record<string, Node[]> = { hot: [], warm: [], cold: [] };
  for (const n of graph.nodes) {
    if (n.type === "me") continue;
    const ring = n.messages >= 15 ? "hot" : n.messages >= 5 ? "warm" : "cold";
    buckets[ring].push(n);
  }
  const pos = new Map<string, { x: number; y: number; node: Node }>();
  const me = graph.nodes.find((n) => n.type === "me")!;
  pos.set(me.id, { x: cx, y: cy, node: me });
  for (const [ring, nodes] of Object.entries(buckets)) {
    const r = RINGS[ring as keyof typeof RINGS];
    nodes.forEach((n, i) => {
      const angle =
        (i / nodes.length) * Math.PI * 2 +
        (ring === "warm" ? 0.4 : ring === "cold" ? 0.2 : 0);
      pos.set(n.id, {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        node: n,
      });
    });
  }

  const isHot = (n: Node) => highlight.has(n.name.toLowerCase());
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const edges = graph.links
    .map((l) => {
      const a = pos.get(l.source);
      const b = pos.get(l.target);
      if (!a || !b) return "";
      const hot = isHot(b.node);
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${hot ? "#FF6B2C" : "#2A2D33"}" stroke-width="${hot ? 2.5 : 1}" opacity="${hot ? 1 : 0.4}"/>`;
    })
    .join("");

  const nodes = [...pos.values()]
    .map(({ x, y, node }) => {
      const hot = node.type === "me" || isHot(node);
      const r = node.type === "me" ? 18 : Math.max(10, 9 + node.messages / 5);
      const fill = node.type === "me" ? "#FF6B2C" : colorFor(node.name);
      const dim = hot ? 1 : 0.28;
      const ring = hot && node.type !== "me"
        ? `<circle cx="${x}" cy="${y}" r="${r + 3}" fill="none" stroke="#FF6B2C" stroke-width="2.5"/>`
        : "";
      const label = hot
        ? `<text x="${x}" y="${y - r - 8}" text-anchor="middle" fill="#E8E9EB" font-size="12" font-weight="600" font-family="system-ui">${esc(node.name)}</text>`
        : "";
      const init = node.type === "me" ? "ME" : initials(node.name).toUpperCase();
      return (
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${dim}"/>` +
        `<text x="${x}" y="${y + r * 0.35}" text-anchor="middle" fill="#0A0B0D" font-size="${Math.max(8, r * 0.7)}" font-weight="700" font-family="system-ui" opacity="${dim}">${esc(init)}</text>` +
        ring + label
      );
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#0A0B0D"/>
    ${edges}${nodes}
    <text x="${cx}" y="${cy + 40}" text-anchor="middle" fill="#E8E9EB" font-size="12" font-weight="600" font-family="system-ui">${esc(me.name)}</text>
  </svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new NextResponse(png, {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
