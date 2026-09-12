/**
 * The on-call agent's tools.
 *
 * A channel tool handler receives the LIVE thread, which is what makes the
 * proposal below possible: it posts a card and returns. A later click reports
 * the decision; it does not resume the agent or execute an action.
 *
 * The return value is what the *agent* reads back, not what the user sees.
 * Return raw data (it is JSON-stringified for you) or a short natural-language
 * confirmation — never `{ ok: true }`, and never hand-stringify.
 */
import {
  defineChannelTool,
  Message,
  Header,
  Section,
  Markdown,
  Context,
  Actions,
  Button,
} from "@copilotkit/channels";
import type { InteractionContext } from "@copilotkit/channels";
export { searchTheWeb } from "./search";
import { z } from "zod";

/**
 * Read the incident context already present in the conversation.
 */
export const readThread = defineChannelTool({
  name: "read_thread",
  description:
    "Read the recent messages in this conversation. Call this FIRST on any incident question — the thread almost certainly already says what broke, when, and what has been tried. Asking someone to re-explain an outage is the worst thing you can do here.",
  parameters: z.object({}),
  async handler(_args, { thread }) {
    const messages = await thread.getMessages();
    if (messages.length === 0) {
      return "This surface does not expose conversation history, or the thread is empty. Say that you cannot see earlier messages and ask for the shortest possible summary.";
    }
    return messages;
  },
});

/**
 * Managed delivery cannot block on awaitChoice. Post a proposal and let a later
 * interaction report the decision. This demo has no production executor.
 * Inline handlers require one listener instance that stays running until click.
 */
export const proposeAction = defineChannelTool({
  name: "propose_action",
  description:
    "Post an action proposal for human review. This returns pending immediately. Stop after posting: do not execute the action or call write tools. A later click reports a decision only; it does not execute anything or resume you.",
  parameters: z.object({
    action: z.string().describe("The proposed action, in one plain sentence."),
    blastRadius: z
      .string()
      .describe(
        "What this affects if it goes wrong. Be specific and pessimistic.",
      ),
    reversible: z
      .boolean()
      .describe("Whether this can be undone in under a minute."),
  }),
  async handler({ action, blastRadius, reversible }, { thread }) {
    // The SDK retains inline action handlers after a message replacement. Queue
    // clicks and settle only after a successful update, so stale/opposite clicks
    // cannot overwrite a decision and a failed update remains retryable.
    let settled = false;
    let previousReport = Promise.resolve();
    const reportDecision = (
      approved: boolean,
      ctx: InteractionContext<boolean>,
    ) => {
      const report = async () => {
        if (settled) return;
        const decision = approved
          ? "Approved proposal. No action was executed."
          : "Held by the responder. No action was executed. Do not take the action or offer a workaround.";
        // Use the interaction's thread, whose delivery is live now.
        await ctx.thread.update(
          ctx.message.ref,
          `${decision}\n\nProposal: ${action}`,
        );
        settled = true;
      };
      previousReport = previousReport.then(report, report);
      return previousReport;
    };
    await thread.post(
      <Message accent="#C4145F">
        <Header>Review action proposal</Header>
        <Section>
          <Markdown>{`**${action}**\n\nBlast radius: ${blastRadius}`}</Markdown>
        </Section>
        <Context>
          {reversible
            ? "Reversible in under a minute"
            : "NOT easily reversible"}
        </Context>
        <Context>
          Demo proposal only. Clicking records a decision; it executes nothing.
        </Context>
        <Actions>
          <Button
            value={true}
            style="primary"
            onClick={async (ctx) => {
              await reportDecision(true, ctx);
            }}
          >
            Approve
          </Button>
          <Button
            value={false}
            style="danger"
            onClick={async (ctx) => {
              await reportDecision(false, ctx);
            }}
          >
            Hold
          </Button>
        </Actions>
      </Message>,
    );

    return "Proposal posted; decision pending. Stop here. Do not take the action, call write tools, or offer a workaround. A later click only reports the decision; no action is executed and the agent does not automatically resume.";
  },
});

/**
 * File an approved follow-up into the Ambiguous workspace over REST.
 *
 * The agent's MCP tools are not reachable from a button click — the click runs
 * in the channel listener, not inside an agent run — so the write boundary is
 * a direct API call. Three writes: upsert the CRM contact, log the activity,
 * open the follow-up task. Best-effort: a partial failure is reported, not
 * retried silently.
 */
async function fileToWorkspace(person: string, draft: string, context: string) {
  const apiKey = process.env.AMBIGUOUS_API_KEY;
  if (!apiKey) {
    return "No Ambiguous workspace configured (AMBIGUOUS_API_KEY unset). Decision recorded only — nothing was filed.";
  }
  const api = async (path: string, body: unknown): Promise<Record<string, unknown>> => {
    const res = await fetch(`https://app.ambiguous.ai${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`${path} → HTTP ${res.status}`);
    }
    return (await res.json()) as Record<string, unknown>;
  };

  try {
    const contact = await api("/api/crm/contacts", {
      name: person,
      type: "person",
    });
    const contactId = (contact?.id ?? (contact?.contact as Record<string, unknown> | undefined)?.id) as string | undefined;
    await api("/api/crm/activities", {
      type: "note",
      subject: `Follow-up drafted from Slack`,
      body: `${draft}\n\n—\nThread context: ${context}`,
      ...(contactId ? { contact_id: contactId } : {}),
    });
    const task = await api("/api/tasks", {
      title: `Follow up with ${person}`,
      description: draft,
      ...(contactId ? { contact_id: contactId } : {}),
    });
    const taskId = String(task?.id ?? (task?.task as Record<string, unknown> | undefined)?.id ?? "created");
    return `Filed to workspace: CRM contact for ${person}, activity logged, follow-up task ${taskId} created.`;
  } catch (err) {
    return `Workspace write failed: ${err instanceof Error ? err.message : String(err)}. The draft above is still valid — copy it manually.`;
  }
}

/**
 * Post a drafted follow-up for human review. Approve files it to the Ambiguous
 * workspace (CRM contact + activity + task); Hold records the decision. The
 * agent stops after posting — the click does the write, not the agent.
 */
export const proposeFollowup = defineChannelTool({
  name: "propose_followup",
  description:
    "Post a drafted follow-up message for human review. This returns pending immediately. Stop after posting: do not call write tools or claim anything was sent. Approve files the draft to the workspace CRM; Hold discards it.",
  parameters: z.object({
    person: z.string().describe("Who the follow-up is for."),
    draft: z.string().describe("The follow-up message you wrote, ready to send."),
    context: z
      .string()
      .describe("One line of thread context: the signal that prompted this."),
  }),
  async handler({ person, draft, context }, { thread }) {
    let settled = false;
    let previousReport = Promise.resolve();
    const reportDecision = (
      approved: boolean,
      ctx: InteractionContext<boolean>,
    ) => {
      const report = async () => {
        if (settled) return;
        settled = true;
        const outcome = approved
          ? await fileToWorkspace(person, draft, context)
          : "Held by the responder. Nothing was filed.";
        await ctx.thread.update(
          ctx.message.ref,
          `${approved ? "✅ Approved." : "⏸ Held."} ${outcome}\n\n*Draft for ${person}:*\n${draft}`,
        );
      };
      previousReport = previousReport.then(report, report);
      return previousReport;
    };
    await thread.post(
      <Message accent="#2E7D5B">
        <Header>{`Follow-up draft — ${person}`}</Header>
        <Section>
          <Markdown>{draft}</Markdown>
        </Section>
        <Context>{context}</Context>
        <Context>
          Approving files this to the workspace CRM and opens a follow-up task.
          Nothing is sent to the person.
        </Context>
        <Actions>
          <Button
            value={true}
            style="primary"
            onClick={async (ctx) => {
              await reportDecision(true, ctx);
            }}
          >
            Approve & file
          </Button>
          <Button
            value={false}
            style="danger"
            onClick={async (ctx) => {
              await reportDecision(false, ctx);
            }}
          >
            Hold
          </Button>
        </Actions>
      </Message>,
    );

    return "Follow-up draft posted; decision pending. Stop here. Do not call write tools or claim anything was sent or filed. A later click files the draft or discards it; the agent does not automatically resume.";
  },
});

/**
 * Post a digest to the channel through the incoming webhook — the proactive
 * nudge path. Unlike thread.post this lands as a top-level channel message, so
 * it works for "3 opportunities this week" summaries that are not a reply.
 */
export const postDigest = defineChannelTool({
  name: "post_digest",
  description:
    "Post a standalone digest message to the channel via the incoming webhook. Use for periodic opportunity summaries, not for replying in the current thread. Requires SLACK_WEBHOOK_URL; if it fails, say so and post in the thread instead.",
  parameters: z.object({
    text: z
      .string()
      .describe("The digest text, Slack markdown. Lead with the count, e.g. '3 opportunities this week'."),
  }),
  async handler({ text }) {
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url) {
      return "SLACK_WEBHOOK_URL is not configured — post the digest in this thread instead.";
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      return `Webhook post failed: HTTP ${res.status}. Post the digest in this thread instead.`;
    }
    return "Digest posted to the channel.";
  },
});
