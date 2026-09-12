# Career Brain

**A relationship agent that lives in your Slack threads and works your real LinkedIn network.**

You import your LinkedIn data export once — the web app unzips it, parses connections and messages, embeds the message index, and builds a relationship graph. Then in Slack you ask Career Brain who can help — a job move, an intro, a domain — and it answers with real names, roles, LinkedIn URLs, and message warmth from your own network. Ask for a follow-up and it drafts the message; Approve files it into an Ambiguous AI workspace — CRM contact, activity, and task — where it survives refresh.

Built for [Agents, Everywhere](https://aitinkerers.org/hackathons/global/agents-everywhere) (Sept 12–13, 2026) on the CopilotKit starter kit. See [SPEC.md](SPEC.md) for the design and [SUBMISSION.md](SUBMISSION.md) for what is inherited vs. built during the event.

## The interaction

```
LinkedIn export zip ──(web app: unzip → CSV parse → embeddings)──► graph.json + messages-index.json
                                                                          │
#second-brain Slack: "@career-brain who can help me get a PM role?"         │
        │                                                                 │
        ▼                                                                 │
lookup_network ──► owner profile + matching contacts (role, company, warmth)
        │
        ▼
answer: real names + LinkedIn URLs + why each fits
        │
        ▼  "draft a follow-up to Noura"
propose_followup ──► draft posted for review
        │
        ▼  click Approve & file
fileToWorkspace ──► Ambiguous REST: CRM contact + activity + task (persists)
```

`post_digest` posts standalone opportunity digests to the channel via incoming webhook. `opportunity_card` renders native signal cards in-thread. `show_graph` posts a PNG of the relationship graph — identicon avatars, heat rings — with the named contacts highlighted in orange and everyone else dimmed, so "who can help" answers come with the picture.


## Stack
| Piece | Role |
|---|---|
| CopilotKit Channels | Managed Slack socket — no tunnel, no Slack app hosting |
| OpenAI / OpenRouter | Agent model + message embeddings (`MODEL_PROVIDER` + `MODEL`) |
| Exa | `search_web` enrichment — public info on a contact/company |
| Ambiguous AI | Workspace write target — approved drafts become CRM contact + activity + task |
| LinkedIn data export | The relationship graph — parsed + embedded in the web importer |

## Setup

Node.js 22+.

```bash
npm ci
cp .env.example .env
```

Required in `.env`:

```dotenv
MODEL_PROVIDER=openrouter          # or openai
MODEL=openai/gpt-5.6-sol
OPENROUTER_API_KEY=...             # or OPENAI_API_KEY
CHANNEL_CODE=career-brain
INTELLIGENCE_API_KEY=...           # CopilotKit Intelligence project key
CPK_INTELLIGENCE_API_KEY=...
INTELLIGENCE_CHANNEL_CAREER_BRAIN_SLACK_BOT_TOKEN=xoxb-...
INTELLIGENCE_CHANNEL_CAREER_BRAIN_SLACK_SIGNING_SECRET=...
EXA_API_KEY=...                    # optional: enables search_web enrichment
AMBIGUOUS_API_KEY=ak_...           # optional: enables approve→workspace filing
SLACK_WEBHOOK_URL=...              # optional: enables post_digest
```

The Slack app manifest is [career-brain-manifest.txt](career-brain-manifest.txt) — create the app from it, install to the workspace, and put the bot token + signing secret in `.env`. Channel provisioning: `npm run channel:setup`; status: `npm run channel:status`.

## Run

Two processes:

```bash
npm run dev:slack   # Slack listener — the agent (Node 22+ required)
npm run dev:web     # web app on :3100 — LinkedIn import, graph, /ask chat
```

**Web app** (`http://localhost:3100`): `/import` accepts a LinkedIn data-export zip → builds `graph.json` + embedded `messages-index.json`. `/ask` is a chat over that graph with tools: `search_messages` (semantic), `enrich_contact` + `search_jobs` (Exa), `send_to_slack`, `file_to_workspace` (Ambiguous).

**Slack**: `/invite @career-brain` into a channel, then `@career-brain` inside a thread — e.g. "who in my network can help me find a PM role?" A mention subscribes the agent to the thread; it answers with names, LinkedIn URLs, and message warmth from the imported graph.

## Verify

```bash
npm run typecheck   # tsc --noEmit across workspaces
npm run verify      # 34 contract tests
```

## Repo layout

- `apps/channel/` — the Slack channel: tools (`lookup_network`, `show_graph`, `propose_followup`, `post_digest`, …), components, agent wiring
- `apps/web/` — LinkedIn importer (`/import`), relationship graph, `/ask` chat with Exa + Ambiguous tools, `/api/graph-image` (PNG render for Slack)
- `packages/agent-core/` — prompt (`CRM_ROLE`), model, Ambiguous MCP capability
- `apps/mobile/` — starter-kit template, not part of this demo
- `SPEC.md` — design doc, demo script, risks
- `SUBMISSION.md` — hackathon checklist: inherited vs. built, judging evidence

## Inherited vs. built

Git history starts with `Baseline` (the starter kit tree, pre-event); every commit after it is event work. `git diff b668d9b..HEAD` is exactly what was built during the hackathon. Details in [SUBMISSION.md](SUBMISSION.md).
