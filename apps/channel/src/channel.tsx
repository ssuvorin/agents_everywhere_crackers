import { createChannel } from "@copilotkit/channels";
import { isSearchConfigured, isWorkplaceConfigured, WORKPLACE_CONTEXT } from "agent-core";
import { makeChannelAgent } from "./agent";
import { required } from "./env";
import { IncidentCard, OpportunityCard, Timeline, welcomeMessage } from "./components";
import { postDigest, proposeAction, proposeFollowup, readThread, searchTheWeb, lookupNetwork, showGraph } from "./tools";

// Tools are registered only when their credential is present, so the agent is
// never handed a tool that will fail when it calls it.
const tools = [
  readThread,
  proposeAction,
  proposeFollowup,
  postDigest,
  lookupNetwork,
  showGraph,
  ...(isSearchConfigured() ? [searchTheWeb] : []),
];

export const channel = createChannel({
  // Must equal the Channel Code in Intelligence, character for character. A
  // mismatch leaves the Channel at "Waiting for runtime" and is validated at
  // startup, not here.
  name: required("CHANNEL_CODE"),

  // Required. "platform" derives the canonical user from provider + workspace +
  // platform user id. Do NOT move this onto CopilotRuntime — that one is for
  // web requests and must be absent on a Channels-only runtime.
  identifyUser: "platform",

  agent: makeChannelAgent,
  tools,
  components: [IncidentCard, OpportunityCard, Timeline],

  // Injected into the agent's prompt on every run.
  context: [
    
    {
      description: "Rendering",
      value:
        "You can draw native UI by calling opportunity_card, incident_card or timeline. Prefer opportunity_card for relationship signals; use the others only when they fit better.",
    },
    ...(isWorkplaceConfigured()
      ? [{ description: "Workplace", value: WORKPLACE_CONTEXT }]
      : []),
    {
      description: "Surface",
      value:
        "This is a chat thread in a channel people are actively working in. Assume others are reading and that some joined late.",
    },
  ],

});

// A mention subscribes the conversation, so the agent then follows along instead
// of needing to be @-mentioned every single turn.
channel.onMention(async ({ thread }) => {
  console.log(`[channel] mention — subscribing + running`);
  await thread.subscribe();
  try {
    console.log(`[channel] runAgent start`);
    await thread.runAgent();
    console.log(`[channel] runAgent done`);
  } catch (err) {
    console.error(`[channel] runAgent failed:`, err);
    await thread.post("Something broke on my side — check the listener logs.");
  }
});

// Non-mentioned turns only ever reach onMessage — gate them on the flag or the
// agent will answer every message in every channel it has been invited to.
channel.onMessage(async ({ thread }) => {
  const subscribed = await thread.isSubscribed();
  console.log(`[channel] message — subscribed=${subscribed}`);
  if (subscribed) {
    try {
      console.log(`[channel] runAgent start`);
      await thread.runAgent();
      console.log(`[channel] runAgent done`);
    } catch (err) {
      console.error(`[channel] runAgent failed:`, err);
    }
  }
});

channel.onWelcome(async ({ thread, platform }) => {
  await thread.post(welcomeMessage(platform));
});
