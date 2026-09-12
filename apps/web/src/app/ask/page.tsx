"use client";

import { useEffect, useState } from "react";
import {
  CopilotChat,
  useAgentContext,
  useConfigureSuggestions,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/Badge";
import { MonoLabel } from "@/components/ui/MonoLabel";
import "./ask.css";

type Contact = {
  name: string;
  company?: string;
  position?: string;
  linkedin_url?: string;
  messages?: number;
  last_contact?: string;
};

type Owner = {
  name: string;
  headline: string;
  summary: string;
  industry: string;
  location: string;
  linkedin_url: string;
  positions: { company: string; title: string; started: string; finished: string }[];
};

export default function AskPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);

  useEffect(() => {
    fetch("/data/graph.json")
      .then((r) => r.json())
      .then((g) => {
        setOwner(g.owner ?? null);
        setContacts(
          g.nodes
            .filter((n: { type: string }) => n.type === "contact")
            .map((n: Contact) => ({
              name: n.name,
              company: n.company ?? "",
              position: n.position ?? "",
              linkedin_url: n.linkedin_url ?? "",
              messages: n.messages ?? 0,
              last_contact: n.last_contact ?? "",
            })),
        );
      })
      .catch(() => setContacts([]));
  }, []);

  // The agent sees the owner profile + the whole graph as context on every turn.
  useAgentContext({
    description:
      "The user's LinkedIn relationship graph. `owner` is whose graph this is — their headline, summary, industry, location, and work history; use it to understand their goals (e.g. a career move) and who in the network can help. `contacts` are their connections with LinkedIn URLs, message counts, and last-contact dates. For anything about what was actually said, call search_messages. Always include a contact's linkedin_url when you name them.",
    value: {
      owner,
      contacts,
    },
  });

  // Semantic search over the embedded message index built by /api/import.
  useFrontendTool(
    {
      name: "search_messages",
      description:
        "Semantically search Maya's LinkedIn message history. Use when the question is about what was actually said — topics, promises, details — not just who or when.",
      parameters: z.object({
        query: z.string().describe("What to look for, in plain language."),
      }),
      handler: async ({ query }) => {
        const res = await fetch(
          `/api/search-messages?q=${encodeURIComponent(query)}`,
        );
        const json = await res.json();
        if (!res.ok) return json.error ?? "Search unavailable";
        return json.hits;
      },
    },
    [],
  );

  // Push a drafted follow-up to the Slack channel for approval.
  useFrontendTool(
    {
      name: "send_to_slack",
      description:
        "Post a drafted follow-up or digest to the Slack channel so Maya can approve it there. Use after drafting — never send without showing the draft first.",
      parameters: z.object({
        text: z
          .string()
          .describe("The message to post, Slack markdown. Include the draft."),
      }),
      handler: async ({ text }) => {
        const res = await fetch("/api/slack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const json = await res.json();
        return res.ok ? "Posted to Slack." : (json.error ?? "Slack failed");
      },
    },
    [],
  );

  useConfigureSuggestions(
    {
      suggestions: [
        {
          title: "Who is going cold?",
          message:
            "Look at my relationship graph and tell me which important contacts are going cold — high message count but stale last contact.",
        },
        {
          title: "What did Kenji and I discuss?",
          message:
            "Search my messages and tell me what Kenji Jensen and I actually discussed.",
        },
        {
          title: "Draft a follow-up",
          message:
            "Draft a short follow-up to Kenji Jensen referencing our last exchange.",
        },
      ],
      available: "before-first-message",
    },
    [],
  );

  return (
    <AppShell
      title="Ask"
      topbarMeta={<Badge tone="accent">Graph + messages</Badge>}
    >
      <div className="cb-page cb-ask-page">
        <header className="page-header">
          <div className="page-heading-block">
            <MonoLabel>Ask Career Brain · graph + semantic search</MonoLabel>
            <h1 className="page-title">Ask your network anything.</h1>
            <p className="page-subtitle">
              The agent sees your {contacts.length} contacts and can search what
              was actually said — not just who and when.
            </p>
          </div>
        </header>

        <section className="cb-ask-panel">
          <CopilotChat
            className="ck-chat cb-ask-chat dark"
            labels={{
              welcomeMessageText:
                "I can see your LinkedIn graph and search your message history. Ask who is going cold, what you discussed with someone, or I'll draft a follow-up.",
              chatInputPlaceholder: "Ask about your network…",
            }}
          />
        </section>
      </div>
    </AppShell>
  );
}
