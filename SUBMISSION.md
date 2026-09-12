# Submission checklist

Choose your city on the [global event page](https://aitinkerers.org/hackathons/global/agents-everywhere). Use that city's participant portal for the submission deadline and published judging criteria, and its handbook for eligibility and required deliverables. See [hackathon-rules.md](hackathon-rules.md) for the agent-readable summary.

> **Before submitting, the team confirms the factual claims below.** Everything here
> is drawn from the repository's own commit history and source, not from memory.
> Lines marked **[confirm]** are the ones only the team can settle.

## Build eligibility

- [x] Our submitted project is a net-new build created during the official hackathon period
- [x] Its core functionality was built during the event; we are not resubmitting or extending a pre-existing project and entering it as new
- [x] We identify inherited templates, libraries, prompts, components, and starter code separately from our event work

**What we inherited**

The [CopilotKit Agents-Everywhere starter kit](https://github.com/CopilotKit/agents-everywhere-starter-kit), imported unmodified at upstream `6443333` and committed as `b668d9b` — *"Baseline: … (inherited, pre-event)"*. Everything in that commit is starter code, including:

- the Slack Channels app, its server, delivery and test harness (`apps/channel`)
- the `read_thread` and `propose_action` tools, and the `IncidentCard` / `Timeline` components
- `packages/agent-core` — the agent, model wiring, schemas, and the on-call sample prompt
- the Exa search capability (`capabilities/search.ts`) and the Ambiguous MCP wiring (`capabilities/workplace.ts`)
- the web and React Native templates, which we did not use

From a previous hackathon, for a predecessor product: a promo video, kept under [`assets/prior-work/`](assets/prior-work/) and labelled there. It is **not** the demo video and none of it is claimed as event work. **[confirm]** if any of the visual language (colour, type, logo) ends up in the submission, name it here.

**What we built during the hackathon**

Commit `fc148d8`, *"Career Brain: relationship agent in Slack threads"* — the whole of it:

| What | Where |
|---|---|
| `CRM_ROLE` — the agent's brief: read the thread first, classify the signal, draft but never send, separate evidence from inference | `packages/agent-core/src/prompt.ts` |
| `propose_followup` — posts a draft for review; Approve files a CRM contact, an activity note carrying thread context, and a follow-up task; Hold records the decision and files nothing | `apps/channel/src/tools.tsx` |
| `post_digest` — proactive nudges to the channel via webhook, outside any thread | `apps/channel/src/tools.tsx` |
| `opportunity_card` — the native card: person, classified signal type, thread evidence, Draft button | `apps/channel/src/components.tsx` |
| Channel configuration and the Slack app manifest | `.copilotkit/`, `career-brain-manifest.txt` |

The starter's on-call incident scenario is not our project. We replaced the domain, the prompt, the tools, the card, and the interaction.

## Title and description

**What you built**

Career Brain — a relationship agent that lives in Slack threads. Teams discuss contacts, rounds, intros and promises in threads every day and then forget them. The agent reads the thread it was called into, classifies what changed in the relationship — a raise, a launch, a job change, an intro offered, a long silence — and posts an opportunity card naming the evidence it used. Ask for a follow-up and it drafts one from what the thread actually said, then stops. Approving files the contact, the note and the task into the Ambiguous workspace. It never sends anything to anyone.

**Who it is for**

A founder or operator whose next opportunity comes through a relationship rather than an application — and whose team already talks about those relationships in Slack, where the promises are made and lost. **[confirm]** narrow this to the person you actually demo for.

**Why the context matters**

The thread is the input. Nobody types a summary; the agent reads the conversation that already happened and works from it — including the part the humans dropped three weeks ago. Remove the thread and there is no signal to find: the same model in a standalone chat window would first have to ask the user to retype everything it just read for free. The follow-up is also posted back where the promise was made, in front of the people who made it, rather than in a private tool nobody opens.

**Sponsor technologies used**

| Sponsor | Visible contribution |
|---|---|
| **OpenAI** | Reads the thread, classifies the signal, writes the draft |
| **CopilotKit Channels** | Puts the agent in the Slack thread with native cards and the approval buttons — the surface itself |
| **Ambiguous AI** | Where the approved follow-up lands, over MCP: a CRM contact, an activity note with the thread context, and an open task |
| **Exa** | Looks up a person or company the thread only names, with sources on the card — **[confirm]** keep this row only if it is exercised in the demo |

Not used: Auth0, OpenRouter, Mozilla, Trigger.dev. Count is not a criterion.

## Evidence for the judging criteria

Judges score each of the four official criteria from 1–5. This checklist helps you gather evidence; it does not guarantee a score. A working starter is a foundation for your own project.

| Official criterion | Show in your project and demo |
|---|---|
| Core Requirements & Functionality | Thread → `read_thread` → `opportunity_card` → Draft → `propose_followup` → **Approve & file** → the record in Ambiguous, shown after a refresh. Run live, not from the offline tests. |
| Innovation & Theme Alignment | The thread is on screen for fifteen seconds before anyone types. The agent is called with a bare mention and no briefing. Say out loud what a standalone chatbox loses: the conversation it would have to ask for. |
| Technical Execution & Integration | Click **Hold** on a second card: `⏸ Held. Nothing was filed.` Unconfigured or unreachable Ambiguous returns *"Decision recorded only — nothing was filed"* rather than claiming success; a failed webhook tells the agent to post in the thread instead. |
| Usefulness & Agentic Experience | The work saved is remembering a promise nobody wrote down. Control is a two-button card, and the card says in its own text that approving files a record and sends nothing. |

- [x] We can point to visible evidence for every criterion
- [x] We distinguish live services, sample data, session-only state, and unimplemented integrations
- [x] Sponsor technologies contribute to the workflow; their count is not a judging criterion

**Labelled honestly:** the demo thread is seeded by us and is sample data. The relationship graph is per-thread — the agent reads the thread it is called into, and nothing else. There is no ingestion of email, calendar or LinkedIn; that is design intent, not a shipped feature.

## Public repository

- [ ] A new participant can run the quickstart from a clean clone **[confirm]**
- [ ] The README lists the credentials and separate processes required **[confirm]** — the root README is still the starter kit's; it needs a Career Brain section naming `OPENAI_API_KEY`, the Channel credentials, `AMBIGUOUS_API_KEY`, `EXA_API_KEY` and `SLACK_WEBHOOK_URL`
- [ ] `npm run verify` passes **[confirm]** — run it before submitting
- [x] `.env`, tokens, generated traces with sensitive data, and account secrets are excluded — `.gitignore` covers `.env*`, `.copilotkit/artifacts/` and `.data/`
- [x] Sample data, session-only state, and unimplemented integrations are clearly labeled

## Two-minute demo video

Script with timings: [`dev-docs/demo-video-script.md`](dev-docs/demo-video-script.md).

- [ ] Show the surface and existing context before the prompt — beat 1
- [ ] Demonstrate one complete interaction — beats 2–5
- [ ] Show a visible result: an actual record — beat 5, the Ambiguous tab after a refresh
- [ ] Distinguish the decision from execution and show the resulting behaviour — beat 4, and beat 6 for the held path
- [ ] State which sponsor technologies made the interaction possible — beat 7
- [ ] Keep within the limit and check audio

## Social post and final submission

- [ ] Follow the organizer's posting and sponsor-tagging instructions
- [ ] Link the public repository and video
- [ ] Credit the sponsors you used and applicable local partners
- [ ] Check the live integration once more before recording or submitting
- [ ] Inspect the repository, video and screenshots for secrets

Prepare the post and submission for a human to publish; running the starter kit
does not publish either automatically.
