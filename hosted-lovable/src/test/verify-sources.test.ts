import { describe, it, expect } from "vitest";
import { verifySources } from "@/lib/studio/evidence.server";
import { isSelectable, type EvidenceItem } from "@/lib/studio/evidence";

const URL = "https://example.org/study-1";

function fakeResponse(json: unknown) {
  return new Response(
    JSON.stringify({
      output: [
        { type: "web_search_call", status: "completed", action: { type: "open_page", url: URL } },
        { type: "message", content: [{ type: "output_text", text: JSON.stringify(json), annotations: [] }] },
      ],
    }),
    { status: 200 },
  );
}

const opts = (json: unknown) => ({
  apiKey: "test-key",
  model: "gpt-4.1-mini",
  searchModel: "gpt-5.5",
  fetchImpl: (async () => fakeResponse(json)) as typeof fetch,
});

const baseItem: EvidenceItem = {
  id: "ev-1",
  claim: "Claim",
  question: "Does X cause Y?",
  status: "Supported",
  finding: "Earlier finding",
  population: "100 adults",
  studyType: "Survey",
  year: "2020",
  limitations: "Self-report",
  scope: "direct",
  citation: "(Doe, 2020)",
  sources: [{ url: URL, title: "Study One", authors: ["Jane Doe"] }],
};

describe("verifySources Unsupported branch", () => {
  it("keeps full verified metadata (authors/year/method/population) but stays nonselectable", async () => {
    const out = await verifySources(baseItem, opts({
      sources: [{
        requestedUrl: URL, url: URL, identifier: "", publicationStatus: "peer-reviewed", verified: true,
        title: "The Real Study", authors: ["Ana Lee", "Bo Kim"], year: "2023",
        method: "randomised experiment", population: "250 adults, US",
        measuredOutcome: "task accuracy", supportsFinding: "no",
      }],
      finding: "The opened study found no effect of X on Y.",
      counterevidence: "",
    }));
    expect(out.status).toBe("Unsupported");
    expect(out.verification).toBe("verified");
    expect(out.sources[0]!.authors).toEqual(["Ana Lee", "Bo Kim"]);
    expect(out.year).toBe("2023");
    expect(out.studyType).toContain("randomised experiment");
    expect(out.population).toBe("250 adults, US");
    expect(out.finding).toBe("The opened study found no effect of X on Y.");
    expect(out.citation).toBe("");
    expect(out.sources.length).toBe(1);
    expect(isSelectable(out)).toBe(false);
  });

  it("reports metadata-incomplete when the opened study lacks printed authors or year", async () => {
    const out = await verifySources(baseItem, opts({
      sources: [{
        requestedUrl: URL, url: URL, identifier: "", publicationStatus: "unknown", verified: true,
        title: "The Real Study", authors: [], year: "",
        method: "cross-sectional survey", population: "80 students",
        measuredOutcome: "recall", supportsFinding: "no",
      }],
      finding: "The opened study does not support the claim.",
      counterevidence: "",
    }));
    expect(out.status).toBe("Unsupported");
    expect(out.verification).toBe("metadata-incomplete");
    expect(out.sources[0]!.authors).toEqual([]);
    expect(out.year).toBe("");
    expect(out.finding).toBe("The opened study does not support the claim.");
    expect(out.sources.length).toBe(1);
    expect(isSelectable(out)).toBe(false);
  });

  it("does not cut a long verified finding mid-sentence", async () => {
    const long = "Sentence one. ".repeat(120) + "Final sentence intact.";
    const out = await verifySources(baseItem, opts({
      sources: [{
        requestedUrl: URL, url: URL, identifier: "", publicationStatus: "peer-reviewed", verified: true,
        title: "The Real Study", authors: ["Ana Lee"], year: "2023",
        method: "survey", population: "80 students", measuredOutcome: "recall", supportsFinding: "no",
      }],
      finding: long,
      counterevidence: "",
    }));
    expect(out.finding.endsWith("Final sentence intact.")).toBe(true);
    expect(out.finding.length).toBe(long.length);
  });
});
