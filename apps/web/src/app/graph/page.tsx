"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  useAgentContext,
  useConfigureSuggestions,
} from "@copilotkit/react-core/v2";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/Badge";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { initialsFor } from "@/lib/avatar";
import "./graph.css";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

type Node = {
  id: string;
  name: string;
  type: "me" | "contact";
  company?: string;
  position?: string;
  messages?: number;
  last_contact?: string;
  sample?: string[];
  x?: number;
  y?: number;
};
type Link = { source: string; target: string; weight: number };
type Graph = { nodes: Node[]; links: Link[] };

// Brandbook: orange = the one thing that matters, idle grey = cold.
const SIGNAL_COLOR: Record<string, string> = {
  me: "#F3F4F6",
  hot: "#FF6B00",
  warm: "#FF9A52",
  cold: "#5E5E5E",
};

// GitHub-style identicon: deterministic 5×5 mirrored geometry from the name.
// Each contact gets a stable, unique avatar without shipping images.
function identicon(
  ctx: CanvasRenderingContext2D,
  name: string,
  cx: number,
  cy: number,
  r: number,
  color: string,
) {
  let h = 2166136261;
  for (const ch of name) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  const cells = 5;
  const cell = (r * 2) / cells;
  const x0 = cx - r;
  const y0 = cy - r;
  ctx.fillStyle = color;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < Math.ceil(cells / 2); x++) {
      h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
      if (h & 1) {
        ctx.fillRect(x0 + x * cell, y0 + y * cell, cell, cell);
        ctx.fillRect(
          x0 + (cells - 1 - x) * cell,
          y0 + y * cell,
          cell,
          cell,
        );
      }
    }
  }
}

function heat(n: Node): string {
  if (n.type === "me") return SIGNAL_COLOR.me;
  const msgs = n.messages ?? 0;
  if (msgs >= 15) return SIGNAL_COLOR.hot;
  if (msgs >= 5) return SIGNAL_COLOR.warm;
  return SIGNAL_COLOR.cold;
}

export default function GraphPage() {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [selected, setSelected] = useState<Node | null>(null);
  const fgRef = useRef<{
    zoomToFit?: (ms?: number, px?: number) => void;
    d3Force?: (name: string, force?: unknown) => unknown;
    d3ReheatSimulation?: () => void;
  } | null>(null);

  useEffect(() => {
    fetch("/data/graph.json")
      .then((r) => r.json())
      .then(setGraph);
  }, []);

  // Hand the agent the graph summary + the selected node as context.
  useAgentContext({
    description:
      "The user's LinkedIn relationship graph: Maya Haddad, a crypto PM in Dubai, and her contacts with message counts and last-contact dates. selectedContact is the node the user clicked. Use it to answer who is going cold, who to follow up with, and to draft follow-ups referencing the last exchange.",
    value: {
      owner: "Maya Haddad — crypto PM in Dubai",
      contacts: (graph?.nodes ?? [])
        .filter((n) => n.type === "contact")
        .map((n) => ({
          name: n.name,
          company: n.company ?? "",
          position: n.position ?? "",
          messages: n.messages ?? 0,
          last_contact: n.last_contact ?? "",
        })),
      selectedContact: selected
        ? {
            name: selected.name,
            company: selected.company ?? "",
            position: selected.position ?? "",
            messages: selected.messages ?? 0,
            last_contact: selected.last_contact ?? "",
            lastMessageSample: selected.sample?.[0] ?? "",
          }
        : null,
    },
  });

  useConfigureSuggestions(
    {
      suggestions: [
        {
          title: "Who is going cold?",
          message:
            "Look at my relationship graph and tell me which important contacts are going cold — high message count but stale last contact.",
        },
        {
          title: "Draft a follow-up",
          message:
            "Draft a short follow-up to the selected contact referencing our last exchange.",
        },
      ],
      available: "before-first-message",
    },
    [selected],
  );

  // Radial layout: concentric rings by relationship heat. Deterministic —
  // a star topology never spreads under force simulation.
  const data = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };
    const rings: Record<string, number> = { hot: 150, warm: 280, cold: 410 };
    const buckets: Record<string, Node[]> = { hot: [], warm: [], cold: [] };
    for (const n of graph.nodes) {
      if (n.type === "me") continue;
      const msgs = n.messages ?? 0;
      buckets[msgs >= 15 ? "hot" : msgs >= 5 ? "warm" : "cold"].push(n);
    }
    const nodes = graph.nodes.map((n) => {
      if (n.type === "me") return { ...n, fx: 0, fy: 0 };
      const ring =
        (n.messages ?? 0) >= 15
          ? "hot"
          : (n.messages ?? 0) >= 5
            ? "warm"
            : "cold";
      const bucket = buckets[ring];
      const i = bucket.indexOf(n);
      const angle =
        (i / bucket.length) * Math.PI * 2 +
        (ring === "warm" ? 0.4 : ring === "cold" ? 0.2 : 0);
      const r = rings[ring];
      return { ...n, fx: Math.cos(angle) * r, fy: Math.sin(angle) * r };
    });
    return { nodes, links: graph.links };
  }, [graph]);

  // Fit the whole ring layout into the stage once data lands.
  useEffect(() => {
    if (!graph) return;
    const t = setTimeout(() => fgRef.current?.zoomToFit?.(800, 80), 600);
    return () => clearTimeout(t);
  }, [graph]);

  return (
    <AppShell
      title="Graph"
      topbarMeta={
        <Badge tone="accent">
          {graph ? `${data.nodes.length - 1} contacts` : "Loading"}
        </Badge>
      }
    >
      <div className="cb-page">
        <header className="page-header">
          <div className="page-heading-block">
            <MonoLabel>Relationship graph · LinkedIn import</MonoLabel>
            <h1 className="page-title">
              Your network, working for your career.
            </h1>
            <p className="page-subtitle">
              Maya Haddad · crypto PM in Dubai. Rings show relationship heat —
              hot inside, gone cold outside. Click a node, ask the assistant.
            </p>
          </div>
        </header>

        <div className="cb-graph-grid">
          <section className="cb-stage" aria-label="Relationship graph">
            <div className="cb-legend">
              <span>
                <i style={{ background: SIGNAL_COLOR.hot }} /> Hot
              </span>
              <span>
                <i style={{ background: SIGNAL_COLOR.warm }} /> Warm
              </span>
              <span>
                <i style={{ background: SIGNAL_COLOR.cold }} /> Gone cold
              </span>
            </div>

            <ForceGraph2D
              ref={fgRef as never}
              graphData={data}
              nodeCanvasObject={(n: object, ctx: CanvasRenderingContext2D) => {
                const node = n as Node;
                const msgs = node.messages ?? 0;
                // Brandbook: avatar inside the node, sized by relationship
                // strength; orange ring on hot, white ring on you.
                const r = node.type === "me" ? 14 : Math.max(7, 7 + msgs / 3);
                const ring =
                  node.type === "me"
                    ? "#F3F4F6"
                    : msgs >= 15
                      ? "#FF6B00"
                      : msgs >= 5
                        ? "#FF9A52"
                        : "#34373D";
                // ring
                ctx.beginPath();
                ctx.arc(node.x!, node.y!, r + 2.5, 0, Math.PI * 2);
                ctx.fillStyle = ring;
                ctx.fill();
                // avatar disc
                ctx.beginPath();
                ctx.arc(node.x!, node.y!, r, 0, Math.PI * 2);
                ctx.fillStyle =
                  node.type === "me"
                    ? "#F3F4F6"
                    : msgs >= 5
                      ? "#2C3035"
                      : "#1A1D21";
                ctx.fill();
                // identicon geometry for contacts, initials for the owner
                if (node.type === "me") {
                  ctx.fillStyle = "#0A0B0D";
                  ctx.font = `600 ${r * 0.6}px Inter, sans-serif`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillText(initialsFor(node.name), node.x!, node.y!);
                } else {
                  ctx.save();
                  ctx.beginPath();
                  ctx.arc(node.x!, node.y!, r - 0.5, 0, Math.PI * 2);
                  ctx.clip();
                  identicon(
                    ctx,
                    node.name,
                    node.x!,
                    node.y!,
                    r,
                    msgs >= 15 ? "#FF9A52" : msgs >= 5 ? "#D2BEB2" : "#5E5E5E",
                  );
                  ctx.restore();
                }
                // name label
                ctx.fillStyle = "#9A9CA4";
                ctx.font = "4.5px 'JetBrains Mono', monospace";
                ctx.fillText(
                  node.name.toUpperCase(),
                  node.x!,
                  node.y! + r + 8,
                );
              }}
              nodePointerAreaPaint={(n: object, color, ctx) => {
                const node = n as Node;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(
                  node.x!,
                  node.y!,
                  Math.max(10, 7 + ((node.messages ?? 0) / 3) + 4),
                  0,
                  Math.PI * 2,
                );
                ctx.fill();
              }}
              linkWidth={(l: object) =>
                Math.max(0.4, (l as Link).weight / 8)
              }
              linkColor={() => "#34373D"}
              backgroundColor="#0A0B0D"
              onNodeClick={(n: object) => setSelected(n as Node)}
              onNodeDragEnd={(n: object) => {
                // Release the pin so the node stays where it was dropped.
                const node = n as Node & { fx?: number; fy?: number };
                node.fx = undefined;
                node.fy = undefined;
              }}
              cooldownTicks={1}
              enableNodeDrag={true}
              enableZoomInteraction={true}
              enablePanInteraction={true}
              onEngineStop={() => fgRef.current?.zoomToFit?.(800, 80)}
            />

            {selected && (
              <div className="cb-detail">
                <span className="cb-detail-tag">
                  {(selected.messages ?? 0) >= 15
                    ? "Hot · act this week"
                    : (selected.messages ?? 0) >= 5
                      ? "Warm"
                      : "Gone cold"}
                </span>
                <h2>{selected.name}</h2>
                <p className="cb-detail-role">
                  {[selected.position, selected.company]
                    .filter(Boolean)
                    .join(" · ") || "No role on file"}
                </p>
                <dl className="cb-detail-facts">
                  <div>
                    <dt>Messages</dt>
                    <dd>{selected.messages ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Last contact</dt>
                    <dd>{selected.last_contact || "—"}</dd>
                  </div>
                </dl>
                {selected.sample?.[0] && (
                  <p className="cb-detail-sample">“{selected.sample[0]}”</p>
                )}
              </div>
            )}

            <a className="cb-chat-fab" href="/ask" aria-label="Ask Career Brain">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </a>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
