"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import "./walkthrough.css";

type Hint = { title: string; body: string };

const HINTS: Record<string, Hint[]> = {
  "/import": [
    {
      title: "1 · Feed the brain",
      body: "Drop a LinkedIn data-export zip here. Settings → Data privacy → Get a copy of your data. We parse connections + messages, build the graph, embed every message for semantic search.",
    },
    {
      title: "2 · What happens",
      body: "85 contacts, ~2000 messages, 800 embeddings in ~30s — all through OpenRouter. No database; everything lives in JSON the agent can read.",
    },
  ],
  "/graph": [
    {
      title: "3 · Your network, visualized",
      body: "Rings show relationship heat — hot inside, gone cold outside. Drag nodes, zoom, click a contact to see the last exchange.",
    },
    {
      title: "4 · Ask from here",
      body: "The orange button opens the assistant — it already sees this graph and the selected contact.",
    },
  ],
  "/ask": [
    {
      title: "5 · Ask your network anything",
      body: "The agent sees the owner profile + all 85 contacts. Try: “Who is going cold?” or “I want to move from product to project manager — who can help?”",
    },
    {
      title: "6 · Semantic search + Exa",
      body: "It searches what was actually said (embeddings), enriches contacts via Exa, finds live job postings, and can push a drafted follow-up to Slack for approval.",
    },
  ],
};

export function Walkthrough() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const hints = HINTS[pathname] ?? [];

  // Auto-open once per page per session.
  useEffect(() => {
    if (!hints.length || dismissed) return;
    const key = `cb-walk-${pathname}`;
    if (sessionStorage.getItem(key)) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [pathname, hints.length, dismissed]);

  if (!hints.length) return null;

  const close = () => {
    setOpen(false);
    setDismissed(true);
    sessionStorage.setItem(`cb-walk-${pathname}`, "1");
  };

  return (
    <>
      <button
        className="cb-walk-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label="Demo walkthrough"
      >
        ?
      </button>
      {open && (
        <div className="cb-walk-pop">
          <div className="cb-walk-head">
            <span className="cb-walk-tag">Demo walkthrough</span>
            <button className="cb-walk-close" onClick={close} aria-label="Close">
              ×
            </button>
          </div>
          {hints.map((h) => (
            <div key={h.title} className="cb-walk-hint">
              <h3>{h.title}</h3>
              <p>{h.body}</p>
            </div>
          ))}
          <div className="cb-walk-foot">
            <a href="/import">Import</a>
            <a href="/graph">Graph</a>
            <a href="/ask">Ask</a>
          </div>
        </div>
      )}
    </>
  );
}
