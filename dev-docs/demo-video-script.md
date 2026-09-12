# Two-minute demo video — script

The submission checklist asks for six things in this video. Every one of them has a
beat below, so nothing has to be remembered on the day:

1. the surface and existing context **before** the prompt
2. one complete interaction
3. a visible result — an actual record, not a confirmation message
4. an approval that distinguishes the decision from the execution
5. which sponsor technologies made it possible
6. inside the limit, with checked audio

Total 2:00. Timings are targets; the beats in **bold** are the ones that cannot be cut.

---

## Before you record

- Seed `#career-brain` with a real-looking conversation, posted a few minutes earlier
  so timestamps read as history rather than as setup. Three or four messages between
  two people: someone mentions **Anna raised a round**, someone else says *"we said
  we'd intro her to the fund, that was three weeks ago"*, then the thread moves on to
  something else. The agent has to look like it noticed something the humans dropped.
- Open the Ambiguous workspace in a second tab, on the CRM, **scrolled to show the
  contact is not there yet.** The empty state before is what makes the record after
  mean anything.
- Check `AMBIGUOUS_API_KEY`, `EXA_API_KEY` and the Channel are live. The rules are
  explicit that offline tests do not prove the deployed flow.
- Screen recording, real cursor, no edits inside a beat. A cut in the middle of the
  agent responding reads as a cut around a failure.

---

## The script

### 1 · 0:00–0:15 — the room, before anyone asks anything

**On screen:** the Slack thread, scrolled up so the whole conversation is visible.
Cursor idles. No agent yet.

> "This is a team thread from this morning. Somebody mentions that Anna raised a
> round. Somebody else remembers they promised her an intro three weeks ago. Then the
> conversation moves on, and that promise is gone."

*Why this beat exists: Innovation & Theme Alignment asks to show the surrounding
context before the prompt. Do not skip to the mention.*

### 2 · 0:15–0:28 — the ask

**On screen:** type `@Career Brain` in the thread. Nothing else — no instructions, no
pasted summary.

> "I don't tell it what happened. It's in the thread."

### 3 · 0:28–0:52 — **the opportunity card**

**On screen:** the agent calls `read_thread`, then posts `opportunity_card` — Anna,
the signal type, what the thread actually said, and a Draft button.

> "It read the thread, found the signal — a funding round, and an intro that was
> offered and never happened — and it names the evidence it used. The signal type
> isn't my label. It classified it."

*Let the card land. This is the beat a judge remembers.*

### 4 · 0:52–1:18 — **the draft, and the line between deciding and doing**

**On screen:** click Draft. The agent writes the follow-up and posts
`propose_followup`. **Pause on the card long enough to read the small line:**
*"Approving files this to the workspace CRM and opens a follow-up task. Nothing is
sent to the person."*

> "It drafts. It doesn't send. Approving files this to the CRM and opens a task —
> it does not message Anna. The agent stops here and waits."

Click **Approve & file**. The card updates to `✅ Approved.`

*Criterion: the checklist asks to distinguish the decision from the execution. This
line is that distinction, and it is already in the product — read it out loud.*

### 5 · 1:18–1:35 — **the visible result**

**On screen:** switch to the Ambiguous tab. Refresh. The contact exists; open it; the
activity note is there with the thread context; the follow-up task is open.

> "That's the workspace, refreshed. A contact, an activity note carrying the thread
> context, and a task. Written by the agent, filed by my click."

*Criterion: Core Requirements wants an actual result, not a confirmation message.
Refresh on camera — it is the cheapest possible proof of persistence.*

### 6 · 1:35–1:48 — **what happens when it goes wrong**

**On screen:** back in Slack, a second opportunity card. Click **Hold** this time.
Card updates to `⏸ Held. Nothing was filed.`

> "And when I hold it, nothing is filed — the decision is recorded, the write never
> happens. Same if the workspace is unreachable: it says the decision was recorded
> and nothing was filed, rather than claiming a success it can't see."

*Criterion: Technical Execution asks for a relevant failure or cancellation path.
Hold is the cheapest one to show and it is real.*

### 7 · 1:48–2:00 — the close

**On screen:** back to the thread, whole flow visible in one frame.

> "OpenAI reads the thread and writes the draft. Exa looks up anyone the thread only
> names. Ambiguous is where the follow-up actually lands, over MCP. And it works
> because it lives in the thread — take the thread away and there's no signal to find,
> just another chat window asking me to type what I already said."

**Last frame:** Career Brain lockup, one second, stop.

---

## Rules for the cut

- **Real recording.** Mockups read as a concept and are scored as one.
- **Never claim it sent a message.** The product is careful about this line; the
  narration has to be too. "Files", "opens a task", never "sends" or "reaches out".
- **Say the sponsors once, attached to jobs** — beat 7. A logo montage scores nothing;
  "using more sponsors is not itself a scoring criterion" is in the overview.
- **If Exa is not exercised on camera, do not claim it.** Either show a source link on
  the card, or drop that clause from beat 7.
- **Check the audio before the second take, not after the last one.**

## If time runs out on the day

Cut in this order: beat 6 (Hold), then beat 2 (the ask), then trim beat 1 to eight
seconds. Never cut 3, 4 or 5 — they are Core Requirements, the approval distinction,
and the visible result, which is three of the four criteria in ninety seconds.
