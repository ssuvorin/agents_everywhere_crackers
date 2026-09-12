# Submission checklist

Choose your city on the [global event page](https://aitinkerers.org/hackathons/global/agents-everywhere). Use that city's participant portal for the submission deadline and published judging criteria, and its handbook for eligibility and required deliverables. See [hackathon-rules.md](hackathon-rules.md) for the agent-readable summary.

## Build eligibility

- [ ] Our submitted project is a net-new build created during the official hackathon period
- [ ] Its core functionality was built during the event; we are not resubmitting or extending a pre-existing project and entering it as new
- [ ] We identify inherited templates, libraries, prompts, components, and starter code separately from our event work

**What we inherited**
CopilotKit `agents-everywhere-starter-kit` @6443333 — the whole repo skeleton: `createChannel` wiring, `read_thread`/`propose_action`/`search_web` tools, `incident_card`/`timeline` components, agent-core plumbing (model, MCP client, capabilities), web/mobile templates, dev-docs. Committed as the `Baseline` commit; `git diff baseline..HEAD` is exactly our event work.

**What we built during the hackathon**
Career Brain — a relationship agent that lives in Slack threads and a companion web app. Channel: `CRM_ROLE` prompt (read thread → spot signal → card → draft → stop), `opportunity_card` component with typed signals, `propose_followup` tool whose Approve click writes to Ambiguous REST (CRM contact + activity + task) from the channel listener, `post_digest` webhook tool, `career-brain` channel config + Slack app manifest. Web app (`apps/web/`): `/import` — LinkedIn data-export zip → parsed contacts + messages → relationship graph + OpenRouter embeddings; `/graph` — interactive force graph (theblock brandbook, drag/zoom, identicon avatars); `/ask` — CopilotKit chat with the graph as agent context + `search_messages` semantic search over the embedded index + `send_to_slack` tool. See `apps/channel/src/tools.tsx`, `components.tsx`, `packages/agent-core/src/prompt.ts`, `apps/web/src/app/`.

## Title and description

**What you built**
A relationship agent that works two ways. In Slack: it reads the thread it was called into, detects a signal (raise, launch, intro promised, deadline), posts a native opportunity card, drafts the follow-up on click, and — on Approve — files it into an Ambiguous workspace as CRM contact + activity + task. In the web app: import a LinkedIn data-export zip → it builds a relationship graph with embeddings, and the `/ask` chat answers "who is going cold" and "what did we actually discuss" via semantic search over the message index — then pushes a drafted follow-up to Slack for approval.
**Who it is for**
A founder/BD person whose network lives in Slack threads: they discuss "Anna raised a round, I promised an intro" at 2pm and forget by Friday.

**Why the context matters**
The agent's value is the ambient thread: contact, signal, and who promised what are already in the conversation. A standalone chatbox would need all of that re-typed — the thread IS the input. The nudge lands in the same thread where the promise was made.

**Sponsor technologies used**
CopilotKit Channels (managed Slack socket, native cards, button interactions) + CopilotKit React (in-app agentic chat, `useAgentContext`, `useFrontendTool`, `useConfigureSuggestions`), OpenAI via OpenRouter (agent model + `openai/text-embedding-3-small` for the message index), Exa (`search_web` contact enrichment), Ambiguous AI (approve→workspace persistence: CRM + task).

## Evidence for the judging criteria

Judges score each of the four official criteria from 1–5. This checklist helps you gather evidence; it does not guarantee a score. A working starter is a foundation for your own project.

| Official criterion | Show in your project and demo |
|---|---|
| Core Requirements & Functionality | Run one complete workflow in the intended environment, from user request through tools to a verified result. Repeat it with live integrations; offline tests alone do not prove the deployed flow. |
| Innovation & Theme Alignment | Show the surrounding context before the prompt and explain the original interaction it enables. Compare with the context removed: what value would a standalone chatbox lose? |
| Technical Execution & Integration | Show how tools, data, and the environment connect. Demonstrate a relevant failure or cancellation path and explain recovery, state persistence, and integration limits. |
| Usefulness & Agentic Experience | Identify the user and problem, show a meaningful action in the surface, and demonstrate clear feedback and appropriate user control. Explain what work the agent saves. |

- [ ] We can point to visible evidence for every criterion
- [ ] We distinguish live services, sample data, session-only state, and standalone recipes
- [ ] Sponsor technologies contribute to the workflow; their count is not a judging criterion

## Public repository

- [ ] A new participant can run the quickstart from a clean clone
- [ ] The README lists the credentials and separate processes required
- [ ] `npm run verify` passes; optional recipe checks pass if used
- [ ] `.env`, tokens, generated traces with sensitive data, and account secrets are excluded
- [ ] Sample data, session-only state, and unimplemented integrations are clearly labeled

## Two-minute demo video

- [ ] Show the surface and existing context before the prompt
- [ ] Demonstrate one complete interaction
- [ ] Show a visible result: an actual record, local state change, or research source links
- [ ] If showing an approval, distinguish the decision from execution and demonstrate the resulting behavior
- [ ] State which sponsor technologies made the interaction possible
- [ ] Keep the video within the event's limit and check audio

See [demo prompts](dev-docs/demo-prompts.md) for a reproducible incident workflow.

## Social post and final submission

- [ ] Follow the organizer's posting and sponsor-tagging instructions
- [ ] Link the public repository and video
- [ ] Credit the sponsors you used and applicable local partners
- [ ] Check the live integration once more before recording or submitting
- [ ] Inspect the repository, video and screenshots for secrets

Prepare the post and submission for a human to publish; running the starter kit
does not publish either automatically.
