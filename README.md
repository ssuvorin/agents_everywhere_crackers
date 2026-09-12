# Career Brain

**A relationship agent that lives in your Slack threads and catches the opportunities everyone forgets.**

People discuss contacts, deals, intros, and follow-ups in threads every day — then lose them. Career Brain reads the thread it was called into, spots the signal (a raise, a launch, an intro offered, a deadline), posts a native opportunity card, and drafts the follow-up. Approve with one click and it files the draft into an Ambiguous AI workspace — CRM contact, activity, and follow-up task — where it survives refresh.

Built for [Agents, Everywhere](https://aitinkerers.org/hackathons/global/agents-everywhere) (Sept 12–13, 2026) on the CopilotKit starter kit. See [SPEC.md](SPEC.md) for the design and [SUBMISSION.md](SUBMISSION.md) for what is inherited vs. built during the event.

## The interaction

```
#second-brain thread: "Anna just raised a round — didn't you promise her an intro?"
        │
        ▼  @career-brain
read_thread ──► agent extracts contact + signal + who promised what
        │
        ▼
opportunity_card ──► native Slack card: contact, signal, suggested action, [Draft] button
        │
        ▼  click Draft
agent writes the follow-up ──► propose_followup posts it for review
        │
        ▼  click Approve
fileToWorkspace ──► Ambiguous REST: CRM contact + activity + task (persists, survives refresh)
```

`post_digest` posts standalone weekly opportunity digests to the channel via incoming webhook — the proactive nudge path outside any thread.

## Stack

| Piece | Role |
|---|---|
| CopilotKit Channels | Managed Slack socket — no tunnel, no Slack app hosting |
| OpenAI / OpenRouter | Agent model (`MODEL_PROVIDER` + `MODEL` in `.env`) |
| Exa | `search_web` enrichment — public info on a contact/company, sources on the card |
| Ambiguous AI | Workspace write target — approved drafts become CRM contact + activity + task |

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

```bash
npm run dev:slack
```

Then in Slack: `/invite @career-brain` into a channel, have a real conversation about a contact in a thread, and `@career-brain` inside that thread. A mention subscribes the agent to the thread — it follows along without needing a mention every turn.

## Verify

```bash
npm run typecheck   # tsc --noEmit across workspaces
npm run verify      # 34 contract tests
```

## Repo layout

- `apps/channel/` — the Slack channel: tools, components, agent wiring
- `packages/agent-core/` — prompt (`CRM_ROLE`), model, capability detection
- `apps/web/`, `apps/mobile/` — starter-kit templates, not part of this demo
- `SPEC.md` — design doc, demo script, risks
- `SUBMISSION.md` — hackathon checklist: inherited vs. built, judging evidence

## Inherited vs. built

Git history is two commits: `Baseline` (the starter kit tree, pre-event) and the event work on top. `git diff` between them is exactly what was built during the hackathon. Details in [SUBMISSION.md](SUBMISSION.md).
