// Client-safe evidence types and rules. Evidence is kept separate from the speaker's brief.

export type EvidenceStatus = "Supported" | "Mixed" | "Unsupported" | "Not found";
export type EvidenceScope = "direct" | "indirect" | "none";
export type EvidenceSource = { title: string; url: string; authors?: string[]; preprint?: boolean };

export type EvidenceItem = {
  id: string;
  claim: string;
  question: string;
  status: EvidenceStatus;
  finding: string;
  population: string;
  studyType: string;
  year: string;
  limitations: string;
  /** Independent check: does the evidence answer the ORIGINAL question directly? */
  scope: EvidenceScope;
  /** Compact author-year citation built only from verified metadata, e.g. "(Smith et al., 2021)". Empty if not trustworthy. */
  citation?: string;
  /**
   * Study check, separate from claim support (scope): "verified" = a cited page was opened and its
   * title/authors/year read; "access-failed" = sources were found but could not be opened or read
   * (NOT the same as "no evidence"); "search-failed" = the lookup itself errored.
   */
  verification?: "verified" | "metadata-incomplete" | "access-failed" | "search-failed";
  /** Bounded, qualified wording the verified finding supports. Used only if the user selects it. */
  suggestedWording?: string;
  sources: EvidenceSource[];
};

export type Research = { searchedAt: string; items: EvidenceItem[] };

export const MAX_CLAIMS = 3;
export const STATUSES: EvidenceStatus[] = ["Supported", "Mixed", "Unsupported", "Not found"];

/** Only supported/mixed findings that carry at least one tool-returned source may be selected. */
export function isSelectable(item: EvidenceItem): boolean {
  return (item.status === "Supported" || item.status === "Mixed") && item.verification !== "access-failed" && item.verification !== "search-failed" && item.verification !== "metadata-incomplete" && item.sources.length > 0 && !!item.finding.trim() && !!item.citation;
}

export function toggleEvidence(selected: string[], item: EvidenceItem): string[] {
  if (selected.includes(item.id)) return selected.filter((id) => id !== item.id);
  return isSelectable(item) ? [...selected, item.id] : selected;
}

export function selectedEvidence(research: Research | null, selected: string[]): EvidenceItem[] {
  return research ? research.items.filter((i) => selected.includes(i.id) && isSelectable(i)) : [];
}

const URL_RE = /https?:\/\/[^\s)<>"']+/g;
const trimUrl = (u: string) => u.replace(/[.,;:!?]+$/, "").replace(/\/$/, "");

/** URLs appearing in text that are not among the allowed (selected, tool-returned) sources. */
export function uncitedUrls(text: string, allowed: string[]): string[] {
  const ok = new Set(allowed.map(trimUrl));
  return [...new Set((text.match(URL_RE) ?? []).map(trimUrl))].filter((u) => !ok.has(u));
}

/** A percentage without population context is not a usable finding. */
export function percentNeedsContext(finding: string, population: string): boolean {
  return /\d\s*%|\bper ?cent\b/i.test(finding) && !population.trim();
}

/** Apply an independent scope verdict: indirect evidence is at most Mixed; no relevant evidence is Not found. */
export function applyScope<T extends Pick<EvidenceItem, "status" | "finding" | "limitations" | "scope">>(item: T, scope: EvidenceScope, reason: string): T {
  const why = reason.trim();
  if ((item as Partial<EvidenceItem>).verification === "access-failed") return { ...item, scope: "none" };
  // A verified source that contradicts the claim stays Unsupported (distinct from "no evidence").
  if (item.status === "Unsupported") return { ...item, scope: "none" };
  if (scope === "none" || item.status === "Not found")
    return { ...item, scope: "none", status: "Not found", finding: "", limitations: why || "No study directly answering the question was found." };
  if (scope === "indirect")
    return { ...item, scope, status: item.status === "Supported" ? "Mixed" : item.status,
      limitations: ["Indirect evidence — does not directly answer the question.", why, item.limitations].filter(Boolean).join(" ") };
  return { ...item, scope };
}

/** "(Surname, Year)" or "(Surname et al., Year)" from verified authors + year; null if either is missing. */
export function formatCitation(authors: string[] | undefined, year: string): string | null {
  const y = (year.match(/\b(19|20)\d{2}\b/) ?? [])[0];
  const first = (authors ?? []).map((a) => a.trim()).filter(Boolean)[0];
  if (!y || !first) return null;
  // Accept "Surname, Given" or "Given Surname".
  let surname = first.includes(",") ? first.split(",")[0]!.trim() : first.split(/\s+/).pop()!;
  // Papers often print names in small caps (e.g. "GOODMAN"); show the surname in title case.
  if (surname.length > 1 && surname === surname.toUpperCase()) surname = surname.charAt(0) + surname.slice(1).toLowerCase();
  if (!/^[\p{L}][\p{L}'’-]*$/u.test(surname)) return null;
  return `(${surname}${(authors ?? []).filter((a) => a.trim()).length > 1 ? " et al." : ""}, ${y})`;
}

const ONE_CITE = /^[\p{L}][\p{L}'’-]*(?:\s+(?:et al\.|(?:and|&)\s+[\p{L}][\p{L}'’-]*))?,\s*(?:19|20)\d{2}[a-z]?$/u;
const canon = (c: string) => c.replace(/\s+/g, " ").trim();
/**
 * Author-year citations in text that don't correspond to the selected research. Handles grouped
 * citations "(Lee et al., 2025; Kosmyna et al., 2025)": each part is checked as "(Part)".
 */
export function unknownCitations(text: string, allowed: string[]): string[] {
  const ok = new Set(allowed.map(canon));
  const out = new Set<string>();
  for (const m of text.matchAll(/\(([^()]+)\)/g))
    for (const part of m[1]!.split(";").map((x) => x.trim()).filter(Boolean))
      if (ONE_CITE.test(part) && !ok.has(canon(`(${part})`))) out.add(`(${canon(part)})`);
  return [...out];
}
