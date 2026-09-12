/**
 * GET /api/graph-image?highlight=name1,name2 — render the relationship graph
 * as a PNG, pixel-for-pixel in the web graph's design: dark avatar discs with
 * GitHub-style identicons, heat rings (orange hot / light-orange warm / grey
 * cold), mono name labels. Highlighted contacts keep full colour and get an
 * orange edge; everyone else is dimmed.
 */
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const runtime = "nodejs";

const W = 1280;
const H = 940;
const RINGS = { hot: 150, warm: 260, cold: 380 };

type Node = {
  id: string;
  name: string;
  type: string;
  company: string;
  position: string;
  messages: number;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function initialsFor(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

/** Same FNV-1a + mirrored 5×5 pattern as the web graph's canvas identicon. */
function identiconRects(
  name: string,
  cx: number,
  cy: number,
  r: number,
  color: string,
  opacity: number,
): string {
  let h = 2166136261;
  for (const ch of name) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  const cells = 5;
  const cell = (r * 2) / cells;
  const x0 = cx - r;
  const y0 = cy - r;
  let out = "";
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < Math.ceil(cells / 2); x++) {
      h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
      if (h & 1) {
        out += `<rect x="${x0 + x * cell}" y="${y0 + y * cell}" width="${cell}" height="${cell}" fill="${color}" opacity="${opacity}"/>`;
        out += `<rect x="${x0 + (cells - 1 - x) * cell}" y="${y0 + y * cell}" width="${cell}" height="${cell}" fill="${color}" opacity="${opacity}"/>`;
      }
    }
  }
  return out;
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
        (ring === "warm" ? 0.35 : ring === "cold" ? 0.15 : 0);
      pos.set(n.id, {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        node: n,
      });
    });
  }

  const isHot = (n: Node) => highlight.has(n.name.toLowerCase());

  const edges = graph.links
    .map((l) => {
      const a = pos.get(l.source);
      const b = pos.get(l.target);
      if (!a || !b) return "";
      const hot = isHot(b.node);
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${hot ? "#FF6B00" : "#3A3D44"}" stroke-width="${hot ? 2 : 1}" opacity="${hot ? 1 : 0.35}"/>`;
    })
    .join("");

  const nodes = [...pos.values()]
    .map(({ x, y, node }) => {
      const msgs = node.messages ?? 0;
      const hot = node.type === "me" || isHot(node);
      const dim = hot ? 1 : 0.3;
      const r = node.type === "me" ? 16 : Math.max(9, 9 + msgs / 3);
      const ring =
        node.type === "me"
          ? "#F3F4F6"
          : msgs >= 15
            ? "#FF6B00"
            : msgs >= 5
              ? "#FF9A52"
              : "#34373D";
      const disc =
        node.type === "me" ? "#F3F4F6" : msgs >= 5 ? "#2C3035" : "#1A1D21";
      const identColor =
        msgs >= 15 ? "#FF9A52" : msgs >= 5 ? "#D2BEB2" : "#5E5E5E";

      let inner: string;
      if (node.type === "me") {
        inner = `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#0A0B0D" font-size="${r * 0.6}" font-weight="600" font-family="Inter, system-ui, sans-serif">${esc(initialsFor(node.name))}</text>`;
      } else {
        // clip identicon to the disc
        inner =
          `<clipPath id="c${node.id}"><circle cx="${x}" cy="${y}" r="${r - 0.5}"/></clipPath>` +
          `<g clip-path="url(#c${node.id})">${identiconRects(node.name, x, y, r, identColor, dim)}</g>`;
      }
      const label = hot
        ? `<text x="${x}" y="${y + r + 14}" text-anchor="middle" fill="#9A9CA4" font-size="11" font-family="'JetBrains Mono', monospace" letter-spacing="0.5">${esc(node.name.toUpperCase())}</text>`
        : "";
      return (
        `<circle cx="${x}" cy="${y}" r="${r + 2.5}" fill="${ring}" opacity="${dim}"/>` +
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${disc}" opacity="${dim}"/>` +
        inner +
        label
      );
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#0A0B0D"/>
    ${edges}${nodes}
  </svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new NextResponse(png, {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
