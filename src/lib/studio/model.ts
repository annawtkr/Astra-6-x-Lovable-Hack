// Pure studio data model + rules. No I/O here so rules are easy to test.

export type Excerpted = { text: string; sourceExcerpt: string };

export type Brief = {
  mainPoint: string;
  supportingDetails: Excerpted[];
  qualifications: Excerpted[];
  unclearPassages: Excerpted[];
};

export type DraftKind = "x" | "thread" | "linkedin";

export type Draft = {
  kind: DraftKind;
  posts: string[];
  approved: boolean;
  warnings?: string[];
};

export type ActivityEntry = {
  id: string;
  kind: DraftKind;
  text: string;
  at: string;
  note: string;
};

export const DEMO_NOTE = "Demo — no post was sent.";
export const MAX_AUDIO_SECONDS = 300;
export const X_LIMIT = 280;

export const DRAFT_LABELS: Record<DraftKind, string> = {
  x: "X — single post",
  thread: "X — thread (3–5 posts)",
  linkedin: "LinkedIn — medium post",
};

export const emptyBrief = (): Brief => ({
  mainPoint: "",
  supportingDetails: [],
  qualifications: [],
  unclearPassages: [],
});

export const emptyDrafts = (): Draft[] => [
  { kind: "x", posts: [""], approved: false },
  { kind: "thread", posts: ["", "", ""], approved: false },
  { kind: "linkedin", posts: [""], approved: false },
];

/** Any edit to the text invalidates approval. */
export function editDraft(d: Draft, posts: string[]): Draft {
  return { ...d, posts, approved: false, warnings: [...(d.warnings ?? []).filter(w => w !== "Edited text has not been checked again. Review it against your transcript before approving."), "Edited text has not been checked again. Review it against your transcript before approving."] };
}

export function setApproval(d: Draft, approved: boolean): Draft {
  return { ...d, approved };
}

export function draftText(d: Draft): string {
  return d.kind === "thread"
    ? d.posts.map((p, i) => p).join("\n\n")
    : d.posts[0] ?? "";
}

/** Returns a list of problems; empty means the draft can be simulated. */
export function publishProblems(d: Draft): string[] {
  const out: string[] = [];
  if (d.posts.some((p) => !p.trim())) out.push("Every post needs text.");
  if (d.kind !== "linkedin" && d.posts.some((p) => p.length > X_LIMIT))
    out.push(`Each X post must be ${X_LIMIT} characters or fewer.`);
  if (d.kind === "thread" && (d.posts.length < 3 || d.posts.length > 5))
    out.push("A thread needs 3 to 5 posts.");
  if (!d.approved) out.push("Tick the approval box first.");
  return out;
}

export function simulatePublish(d: Draft, now = new Date()): ActivityEntry {
  if (publishProblems(d).length) throw new Error("Draft is not ready to simulate.");
  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: d.kind,
    text: draftText(d),
    at: now.toISOString(),
    note: DEMO_NOTE,
  };
}

export type EvidenceClaim = {
  id: string;
  claim: string;
  status: "supported" | "mixed" | "unsupported" | "not_found";
  finding: string;
  limitations: string;
  sources: { title: string; url: string; authors: string; year: string; studyType: string; population: string }[];
};
export type ResearchResult = { claims: EvidenceClaim[]; searchedAt: string };
export const usableEvidence = (claim: EvidenceClaim) =>
  (claim.status === "supported" || claim.status === "mixed") && claim.sources.length > 0;
