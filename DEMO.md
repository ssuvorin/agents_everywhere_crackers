# Demo script — Career Brain in Slack

Live flow, ~3 minutes. The agent reads thread context itself — never paste
context it can read. Names below are real contacts in the imported graph
(`apps/web/public/data/graph.json`), so every answer is grounded.

Setup once: `/invite @career-brain` in the demo channel. All agent messages
happen **inside the thread** under the seed message.

## 1 · Seed the thread (plain message, no @-mention)

```
Heads up — I ran into Nikolai Santos at the DIFC fintech meetup yesterday.
He told me Chainalysis is opening a senior PM role on their investigations
team next month, and he offered to intro me to the hiring manager if I send
him a short blurb this week. Timing is tight though — I also want to sanity-
check who else in my network is worth tapping for this move before I reply
to him. Can someone help me think through it?
```

Why this seed: it names a person, a signal (role opening), a promise (intro),
and a deadline — everything `read_thread` needs to produce a card without a
single clarifying question.

## 2 · Trigger the agent (reply inside the thread)

```
@career-brain catch up on this thread — who in my network can actually help
with this PM move?
```

Expected: `read_thread` → `lookup_network` → `show_graph`. The thread gets an
opportunity card plus the graph PNG with the named contacts highlighted in
orange (Nikolai Santos · PM @ Chainalysis, Hana Jensen · EM @ ADGM, Camila
Horvat · Solutions Architect @ Wise, Noura Petrova · Ops @ Ledger).

Say to judges: "No re-explaining — it read the thread, matched the goal to my
real LinkedIn graph, and rendered the picture."

## 3 · Draft the follow-up (same thread)

```
draft a follow-up to Nikolai — keep it short, thank him for the offer,
reference the intro he promised, and give him two lines he can forward:
my crypto PM background and the Dubai relocation
```

Expected: `propose_followup` posts a draft card with **Approve / Hold**
buttons and stops — it does not send anything.

**Click Approve.** The click writes to Ambiguous: CRM contact + activity +
task. Pause here, open the Ambiguous workspace, refresh — the record
survives. That's the persistence proof.

Say to judges: "Every write goes through a human click. The agent proposes,
the person disposes — and the approved draft lands in a real CRM."

## 4 · Digest to the channel (same thread)

```
post a digest of today's opportunities to the channel — the Chainalysis
opening and the pending follow-up to Nikolai
```

Expected: `post_digest` fires the incoming webhook — a standalone message in
the channel, not nested in the thread. Shows the agent can push summaries
where the team already looks.

## Fallbacks

If asked about external research (Exa):

```
what's publicly known about Chainalysis' investigations product and hiring
lately? sources please
```

→ `search_web` posts a native sources card with link buttons.

If the graph image doesn't post: it means `WEB_BASE_URL` drifted — the agent
still answers in text; check `journalctl --user -u career-brain-slack`.

## What each step proves

| Step | Judging criterion |
|---|---|
| 1→2 | Agent reads context where work happens; no babysitting |
| 2 | Real data: own LinkedIn graph, warmth from message counts |
| 3 | Human-in-the-loop write + Ambiguous persistence |
| 4 | Proactive surface: digest lands in-channel via webhook |
| fallback | Exa enrichment with clickable sources |
