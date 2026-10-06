import type { Brief, Draft } from "./model";

// Pre-written sample walkthrough. NOT AI output — always labelled as such in the UI.
export const SAMPLE_TRANSCRIPT = `So, quick thought after this morning's team retro. I think we keep shipping features nobody asked for because we only talk to customers after we've built things. Last quarter, three of the five features we launched had under ten percent adoption. The one that did well — the export button — came straight from a support ticket. I'm not saying we should stop experimenting, some bets need to be made without asking. But maybe the default should be: talk to five customers before writing a spec. Also there was something about the pricing page, I can't remember exactly what Priya said, I'll need to check.`;

export const SAMPLE_BRIEF: Brief = {
  mainPoint: "Consider talking to five customers before writing a spec, while leaving room for experiments.",
  supportingDetails: [
    {
      text: "Three of five features launched last quarter had under 10% adoption.",
      sourceExcerpt: "three of the five features we launched had under ten percent adoption",
    },
    {
      text: "A successful feature came directly from a support ticket.",
      sourceExcerpt: "the export button — came straight from a support ticket",
    },
  ],
  qualifications: [
    {
      text: "Some experimental bets should still be made without customer input.",
      sourceExcerpt: "some bets need to be made without asking",
    },
  ],
  unclearPassages: [
    {
      text: "A point about the pricing page attributed to Priya — not recalled.",
      sourceExcerpt: "something about the pricing page, I can't remember exactly what Priya said",
    },
  ],
};

export const SAMPLE_DRAFTS: Draft[] = [
  {
    kind: "x",
    approved: false,
    posts: [
      "3 of our 5 launches last quarter got <10% adoption. The hit? An export button straight from a support ticket.\n\nAn idea: talk to five customers before writing a spec. Still room for bold bets — just not by accident.",
    ],
  },
  {
    kind: "thread",
    approved: false,
    posts: [
      "We keep building features nobody asked for. Here's what last quarter taught us 🧵",
      "3 of 5 launches landed under 10% adoption. We'd talked to customers — but only after shipping.",
      "An export button did well. It came straight from a support ticket.",
      "Could five customer conversations before a spec become our default? Experiments still allowed — on purpose, not by habit.",
    ],
  },
  {
    kind: "linkedin",
    approved: false,
    posts: [
      "A humbling number from our retro this morning: three of the five features we launched last quarter saw under 10% adoption.\n\nOne feature that did well was a simple export button — and it came straight from a support ticket.\n\nThe pattern is obvious in hindsight. We talk to customers after we build, not before.\n\nI'm considering a new default: speak with five customers before writing a spec.\n\nThis isn't a ban on bold bets. Some ideas need to be tried without asking first. But that should be a deliberate choice, not the way we work by accident.\n\nHow does your team decide what's worth building?",
    ],
  },
];

