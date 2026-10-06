import { describe, expect, it } from "vitest";
import { formatCitation, unknownCitations, isSelectable, toggleEvidence, uncitedUrls, percentNeedsContext, type EvidenceItem } from "./evidence";
import { citedSources, norm, research } from "./evidence.server";
import { createPipeline } from "./pipeline.server";

const item = (o: Partial<EvidenceItem>): EvidenceItem => ({ id: "i", claim: "c", question: "q", status: "Supported", finding: "f", population: "p", studyType: "", year: "", limitations: "", scope: "direct", citation: "(Lee, 2020)", sources: [{ title: "t", url: "https://a.org/x" }], ...o });
const msg = (text: string, annotations: unknown[] = []) => ({ output: [{ type: "web_search_call" }, { type: "message", content: [{ type: "output_text", text, annotations }] }] });
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200 });

describe("evidence rules", () => {
  it("only sourced supported/mixed findings can be selected", () => {
    expect(isSelectable(item({}))).toBe(true);
    expect(isSelectable(item({ status: "Unsupported" }))).toBe(false);
    expect(isSelectable(item({ sources: [] }))).toBe(false);
    expect(toggleEvidence([], item({ status: "Not found" }))).toEqual([]);
    expect(isSelectable(item({ citation: "" }))).toBe(false);
  });
  it("flags URLs not in selected sources", () => {
    expect(uncitedUrls("see https://a.org/x. and https://evil.com/y", ["https://a.org/x"])).toEqual(["https://evil.com/y"]);
  });
  it("percentages need population context", () => {
    expect(percentNeedsContext("20% are dyslexic", "")).toBe(true);
    expect(percentNeedsContext("20% of 500 UK founders", "500 founders")).toBe(false);
  });
  it("sources come only from tool citations", () => {
    expect(citedSources(msg("x", [{ type: "url_citation", url: "https://s.org", title: "S" }]))).toEqual([{ url: "https://s.org", title: "S" }]);
    expect(citedSources(msg("see https://made-up.org"))).toEqual([]);
  });
  it("downgrades a finding with no returned citation and never invents sources", async () => {
    const calls: any[] = [];
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)); calls.push(body);
      if (!body.tools) return json(msg(JSON.stringify({ claims: [{ claim: "Many founders have ADHD", question: "What is ADHD prevalence among startup founders?" }] })));
      return json(msg(JSON.stringify({ status: "Supported", finding: "Founders often have ADHD (https://fake.org)", population: "x", studyType: "", year: "", limitations: "" })));
    }) as unknown as typeof fetch;
    const r = await research({ transcript: "I think many founders have ADHD.", brief: { mainPoint: "m", supportingDetails: [], qualifications: [], unclearPassages: [] } }, { apiKey: "k", model: "m", fetchImpl });
    expect(r.items[0]!.status).toBe("Not found");
    expect(r.items[0]!.sources).toEqual([]);
    expect(calls.every((c) => c.store === false)).toBe(true);
    expect(calls[1].tools).toEqual([{ type: "web_search" }]);
  });
  it("generation warns about any link not from selected evidence", async () => {
    let n = 0;
    const fetchImpl = (async () => {
      n++;
      const content = n === 1
        ? { drafts: [{ format: "x", title: "t", posts: ["Read https://invented.org/study. Shorter essays (Lee et al., 2019) and faster typing (Smith, 2022)."] }] }
        : { checks: [{ format: "x", warnings: [] }] };
      return json({ choices: [{ message: { content: JSON.stringify(content) } }] });
    }) as unknown as typeof fetch;
    const p = createPipeline({ apiKey: "k", fetchImpl });
    const r = await p.generate({ transcript: "t", brief: { mainPoint: "m", supportingDetails: [], qualifications: [], unclearPassages: [] }, format: "x",
      evidence: [{ citation: "(Lee et al., 2019)", claim: "c", status: "Supported", finding: "f", population: "p", studyType: "", year: "", limitations: "", sources: [{ title: "A", url: "https://a.org" }] }] });
    const w: string[] = r.drafts[0].warnings;
    expect(w.some((x) => x.includes("https://invented.org/study"))).toBe(true);
    expect(w.some((x) => x.includes("(Smith, 2022)"))).toBe(true);
    expect(w.some((x) => x.includes("(Lee et al., 2019)"))).toBe(false);
  });

  const Q = "Do adults with dyslexia take longer to write short social posts?";
  const verifyRes = (ok: boolean) => ({ output: [
    { type: "web_search_call", action: { type: "open_page", url: "https://journal.org/essays" } },
    { type: "message", content: [{ type: "output_text", annotations: [], text: JSON.stringify({ sources: [{ url: "https://journal.org/essays", verified: ok, title: "Written composition in university students with dyslexia", year: "2019", method: "Cross-sectional comparison", population: "64 UK undergraduates", measuredOutcome: "essay quality and length", supportsFinding: "partly" }], finding: "Students with dyslexia wrote shorter essays.", counterevidence: "" }) }] }] });
  const run = (scope: string, verified = true) => {
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      const b = JSON.parse(String(init.body));
      if (b.tools && String(b.input).includes("urls")) return json(verifyRes(verified));
      if (b.tools) return json(msg(JSON.stringify({ status: "Supported", finding: "Dyslexia causes writing challenges.", population: "University students writing long-form essays", studyType: "Experimental", year: "2019", limitations: "" }),
        [{ type: "url_citation", url: "https://journal.org/essays", title: "Essay writing in dyslexic students" }]));
      if (b.text?.format?.name === "scope_check") return json(msg(JSON.stringify({ scope, reason: "Studies long-form student essays, not adults' short social posts or time taken." })));
      return json(msg(JSON.stringify({ claims: [{ claim: "Dyslexic people take longer to write posts", question: Q }] })));
    }) as unknown as typeof fetch;
    return research({ transcript: "I take ages to write posts.", brief: { mainPoint: "m", supportingDetails: [], qualifications: [], unclearPassages: [] } }, { apiKey: "k", model: "m", fetchImpl });
  };
  it("keeps the exact question and caps indirect student long-form evidence at Mixed", async () => {
    const it0 = (await run("indirect")).items[0]!;
    expect(it0.question).toBe(Q);
    expect(it0.status).toBe("Mixed");
    expect(it0.scope).toBe("indirect");
    expect(it0.limitations).toMatch(/Indirect evidence/);
  });
  it("no direct timing evidence becomes Not found, never a new Supported claim", async () => {
    const it0 = (await run("none")).items[0]!;
    expect(it0.question).toBe(Q);
    expect(it0.status).toBe("Not found");
    expect(it0.finding).toBe("");
    expect(isSelectable(it0)).toBe(false);
  });
});

describe("source verification", () => {
  it("uses the actual opened title, year and method; unverified sources become Not found", async () => {
    const Q = "Do adults with dyslexia take longer to write short social posts?";
    const mk = (ok: boolean) => (async (_u: string, init: RequestInit) => {
      const b = JSON.parse(String(init.body));
      if (b.tools && String(b.input).includes("urls")) return json({ output: [
        { type: "web_search_call", action: { type: "open_page", url: "https://journal.org/essays" } },
        { type: "message", content: [{ type: "output_text", annotations: [], text: JSON.stringify({ sources: [{ url: "https://journal.org/essays", verified: ok, title: "Written composition in university students with dyslexia", authors: ["Connelly, Vincent", "Julie Dockrell"], year: "2019", method: "Cross-sectional comparison", population: "64 UK undergraduates", measuredOutcome: "essay quality", supportsFinding: "partly" }], finding: "Students with dyslexia wrote shorter essays.", counterevidence: "" }) }] }] });
      if (b.tools) return json(msg(JSON.stringify({ status: "Supported", finding: "Dyslexia causes writing challenges.", population: "students", studyType: "Systematic review", year: "2023", limitations: "" }),
        [{ type: "url_citation", url: "https://journal.org/essays", title: "Invented descriptive title" }]));
      if (b.text?.format?.name === "scope_check") return json(msg(JSON.stringify({ scope: "indirect", reason: "Essays, not social posts." })));
      return json(msg(JSON.stringify({ claims: [{ claim: "c", question: Q }] })));
    }) as unknown as typeof fetch;
    const input = { transcript: "t", brief: { mainPoint: "m", supportingDetails: [], qualifications: [], unclearPassages: [] } };
    const ok = (await research(input, { apiKey: "k", model: "m", fetchImpl: mk(true) })).items[0]!;
    expect(ok.sources[0]!.title).toBe("Written composition in university students with dyslexia");
    expect(ok.studyType).toBe("Cross-sectional comparison");
    expect(ok.year).toBe("2019");
    expect(ok.citation).toBe("(Connelly et al., 2019)");
    expect(formatCitation(["STEVEN M. GOODMAN", "ERIN BUEHLER"], "2022")).toBe("(Goodman et al., 2022)");
    expect(ok.sources[0]!.authors).toEqual(["Connelly, Vincent", "Julie Dockrell"]);
    expect(ok.status).toBe("Mixed");
    expect(ok.question).toBe(Q);
    const bad = (await research(input, { apiKey: "k", model: "m", fetchImpl: mk(false) })).items[0]!;
    // Unverifiable sources are NOT "no evidence": kept visible, flagged, and not selectable.
    expect(bad.verification).toBe("access-failed");
    expect(bad.sources.length).toBe(1);
    expect(bad.citation).toBe("");
    expect(isSelectable(bad)).toBe(false);
  });
});

describe("regression: blind LLM / critical-thinking lookup", () => {
  const input = { transcript: "t", brief: { mainPoint: "m", supportingDetails: [], qualifications: [], unclearPassages: [] } };
  const Q = "Is generative AI use associated with reduced critical thinking?";
  // Mirrors the observed live failure: search cites the PMC page with utm params; the verifier opens it,
  // then reports on the PubMed record of the SAME study, using action type "open".
  let searchTitle = "Survey of knowledge workers";
  const mk = (verify: "record" | "error" | "unrelated" | "unobserved", actionType = "open_page") => (async (_u: string, init: RequestInit) => {
    const b = JSON.parse(String(init.body));
    if (b.tools && String(b.input).includes("urls")) {
      if (verify === "error") return new Response("{}", { status: 500 });
      const url = verify === "unrelated" ? "https://other.org/x" : "https://pubmed.ncbi.nlm.nih.gov/123/";
      return json({ output: [
        { type: "web_search_call", status: "completed", action: { type: actionType, url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC1/" } },
        ...(verify === "unobserved" ? [] : [{ type: "web_search_call", status: "completed", action: { type: actionType, url } }]),
        { type: "message", content: [{ type: "output_text", annotations: [], text: JSON.stringify({ sources: [{ requestedUrl: verify === "unrelated" ? url : "https://pmc.ncbi.nlm.nih.gov/articles/PMC1/", url, verified: true, title: "Survey of knowledge workers", authors: ["Hao-Ping Lee", "B C"], year: "2025", method: "Survey", population: "319 knowledge workers", measuredOutcome: "self-reported critical thinking effort", supportsFinding: "partly" }], finding: "Higher confidence in AI was associated with less self-reported critical thinking.", counterevidence: "" }) }] }] });
    }
    if (b.tools) return json(msg(JSON.stringify({ status: "Supported", finding: "AI reliance reduces critical thinking.", population: "319 knowledge workers", studyType: "Survey", year: "2025", limitations: "Self-report" }),
      [{ type: "url_citation", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC1/?utm_source=openai", title: searchTitle }]));
    if (b.text?.format?.name === "scope_check") return json(msg(JSON.stringify({ scope: "indirect", reason: "Self-reported effort, not measured ability loss.", suggestedWording: "In a survey of 319 knowledge workers, higher confidence in AI was associated with less self-reported critical thinking." })));
    return json(msg(JSON.stringify({ claims: [{ claim: "c", question: Q }] })));
  }) as unknown as typeof fetch;

  it("accepts the same study's opened official record and keeps a broad causal claim Mixed", async () => {
    for (const t of ["open_page", "open"]) {
      const it0 = (await research(input, { apiKey: "k", model: "m", fetchImpl: mk("record", t) })).items[0]!;
      expect(it0.verification).toBe("verified");
      expect(it0.citation).toBe("(Lee et al., 2025)");
      expect(it0.status).toBe("Mixed");
      expect(it0.scope).toBe("indirect");
      expect(it0.question).toBe(Q);
      expect(it0.suggestedWording).toMatch(/associated with/);
      expect(isSelectable(it0)).toBe(true);
    }
  });
  it("rejects an unobserved reported URL, and an alternate record for a different study", async () => {
    expect((await research(input, { apiKey: "k", model: "m", fetchImpl: mk("unobserved") })).items[0]!.verification).toBe("access-failed");
    searchTitle = "Unrelated paper about sleep and memory consolidation";
    expect((await research(input, { apiKey: "k", model: "m", fetchImpl: mk("record") })).items[0]!.verification).toBe("access-failed");
    searchTitle = "Survey of knowledge workers";
  });
  it("a verifier error is a source-access failure, not 'no evidence'", async () => {
    const it0 = (await research(input, { apiKey: "k", model: "m", fetchImpl: mk("error") })).items[0]!;
    expect(it0.verification).toBe("access-failed");
    expect(it0.status).not.toBe("Not found");
    expect(it0.sources.length).toBe(1);
    expect(isSelectable(it0)).toBe(false);
  });
  it("rejects a reported page that does not refer to a search-returned source", async () => {
    const it0 = (await research(input, { apiKey: "k", model: "m", fetchImpl: mk("unrelated") })).items[0]!;
    expect(it0.verification).toBe("access-failed");
    expect(it0.citation).toBe("");
  });
});

describe("author-year citations", () => {
  it("formats only from verified authors and year, never invents", () => {
    expect(formatCitation(["Jane Smith"], "2021")).toBe("(Smith, 2021)");
    expect(formatCitation(["Smith, Jane", "Bo Lee"], "Published 2021")).toBe("(Smith et al., 2021)");
    expect(formatCitation([], "2021")).toBeNull();
    expect(formatCitation(["Jane Smith"], "")).toBeNull();
  });
  it("flags citations not in selected research", () => {
    expect(unknownCitations("a (Smith, 2021) b (Doe et al., 2019)", ["(Smith, 2021)"])).toEqual(["(Doe et al., 2019)"]);
  });
  it("an unverified-author finding cannot be selected for drafts", async () => {
    expect(isSelectable({ id: "x", claim: "c", question: "q", status: "Supported", finding: "f", population: "p", studyType: "", year: "2020", limitations: "", scope: "direct", citation: "", sources: [{ title: "t", url: "https://a.org" }] })).toBe(false);
  });
});

describe("research bounds and model", () => {
  it("dedupes questions, caps at 3, and uses the reasoning search model only for search", async () => {
    const calls: any[] = [];
    const qs = ["Do adults with dyslexia write emails more slowly?", "Do adults with dyslexia write emails more slowly than others?", "Is ADHD common in founders?", "Does AI help dyslexic writers?", "Do autistic adults prefer text?"];
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      const b = JSON.parse(String(init.body)); calls.push(b);
      if (!b.tools) return json(msg(JSON.stringify(b.text?.format?.name === "scope_check" ? { scope: "direct", reason: "" } : { claims: qs.map((q) => ({ claim: q, question: q })) })));
      return json(msg(JSON.stringify({ status: "Not found", finding: "", population: "", studyType: "", year: "", limitations: "" })));
    }) as unknown as typeof fetch;
    const r = await research({ transcript: "t", brief: { mainPoint: "m", supportingDetails: [], qualifications: [], unclearPassages: [] } }, { apiKey: "k", model: "gpt-4.1-mini", searchModel: "gpt-5.5", fetchImpl });
    expect(r.items.length).toBe(3);
    expect(new Set(r.items.map((i) => i.question)).size).toBe(3);
    expect(r.items.map((i) => i.question)).not.toContain(qs[1]);
    const search = calls.filter((c) => c.tools);
    expect(search.every((c) => c.model === "gpt-5.5" && c.reasoning?.effort === "low")).toBe(true);
    expect(calls.filter((c) => !c.tools).every((c) => c.model === "gpt-4.1-mini" && !c.reasoning)).toBe(true);
  });
  it("shows a recoverable error when the research model is unavailable", async () => {
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      const b = JSON.parse(String(init.body));
      if (!b.tools) return json(msg(JSON.stringify({ claims: [{ claim: "c", question: "Is X true?" }] })));
      return new Response(JSON.stringify({ error: { code: "model_not_found", message: "The model gpt-5.5 does not exist" } }), { status: 404 });
    }) as unknown as typeof fetch;
    await expect(research({ transcript: "t", brief: { mainPoint: "m", supportingDetails: [], qualifications: [], unclearPassages: [] } }, { apiKey: "k", model: "m", searchModel: "gpt-5.5", fetchImpl }))
      .rejects.toThrow(/research model \(gpt-5.5\) is not available/);
  });
});

describe("review fixes", () => {
  const input = { transcript: "t", brief: { mainPoint: "m", supportingDetails: [], qualifications: [], unclearPassages: [] } };
  it("norm keeps identity query params and drops tracking/hash", () => {
    expect(norm("https://x.org/a?id=1")).not.toBe(norm("https://x.org/a?id=2"));
    expect(norm("http://www.x.org/a/?utm_source=openai&id=1#s")).toBe(norm("https://x.org/a?id=1"));
  });
  it("grouped citations validate per part and still catch unknown ones", () => {
    const ok = ["(Lee et al., 2025)", "(Kosmyna et al., 2025)"];
    expect(unknownCitations("x (Lee et al., 2025; Kosmyna et al., 2025).", ok)).toEqual([]);
    expect(unknownCitations("x (Lee et al., 2025; Doe, 2020)", ok)).toEqual(["(Doe, 2020)"]);
    expect(unknownCitations("x (Doe and Roe, 2019)", ok)).toEqual(["(Doe and Roe, 2019)"]);
  });
  const mk = (row: Record<string, unknown>, failQ?: string) => (async (_u: string, init: RequestInit) => {
    const b = JSON.parse(String(init.body));
    if (b.tools && String(b.input).includes("urls")) return json({ output: [
      { type: "web_search_call", status: "completed", action: { type: "open_page", url: "https://arxiv.org/abs/2506.08872" } },
      { type: "message", content: [{ type: "output_text", annotations: [], text: JSON.stringify({ sources: [{ requestedUrl: "https://arxiv.org/abs/2506.08872", url: "https://arxiv.org/abs/2506.08872", verified: true, title: "Your Brain on ChatGPT", authors: ["Nataliya Kosmyna", "E H"], year: "2025", method: "EEG study", population: "54 adults", measuredOutcome: "EEG", supportsFinding: "yes", ...row }], finding: "F", counterevidence: "" }) }] }] });
    if (b.tools) {
      if (failQ && b.input === failQ) return new Response("{}", { status: 500 });
      return json(msg(JSON.stringify({ status: "Supported", finding: "F", population: "54 adults", studyType: "EEG", year: "2025", limitations: "" }), [{ type: "url_citation", url: "https://arxiv.org/abs/2506.08872", title: "Your Brain on ChatGPT" }]));
    }
    if (b.text?.format?.name === "scope_check") return json(msg(JSON.stringify({ scope: "indirect", reason: "r", suggestedWording: "w" })));
    return json(msg(JSON.stringify({ claims: [{ claim: "a", question: "Question one about LLM essays?" }, { claim: "b", question: "Different topic: sleep deprivation memory?" }] })));
  }) as unknown as typeof fetch;
  it("labels arXiv preprints; missing authors/year is metadata-incomplete, not verified", async () => {
    const ok = (await research(input, { apiKey: "k", model: "m", fetchImpl: mk({}) })).items[0]!;
    expect(ok.sources[0]!.preprint).toBe(true);
    expect(ok.studyType).toMatch(/^Preprint/);
    const inc = (await research(input, { apiKey: "k", model: "m", fetchImpl: mk({ authors: [] }) })).items[0]!;
    expect(inc.verification).toBe("metadata-incomplete");
    expect(isSelectable(inc)).toBe(false);
  });
  it("a verified contradicting source stays Unsupported, not Not found", async () => {
    const it0 = (await research(input, { apiKey: "k", model: "m", fetchImpl: mk({ supportsFinding: "no" }) })).items[0]!;
    expect(it0.status).toBe("Unsupported");
    expect(it0.sources.length).toBe(1);
    expect(it0.finding).not.toBe("");
  });
  it("one failed lookup shows Lookup failed without wiping the others; auth errors propagate", async () => {
    const r = await research(input, { apiKey: "k", model: "m", fetchImpl: mk({}, "Different topic: sleep deprivation memory?") });
    expect(r.items.map((i) => i.verification)).toEqual(["verified", "search-failed"]);
    const auth = (async () => new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 401 })) as unknown as typeof fetch;
    await expect(research(input, { apiKey: "k", model: "m", fetchImpl: auth })).rejects.toThrow(/does not have access/);
  });
});

describe("DOI resolver", () => {
  const input = { transcript: "t", brief: { mainPoint: "m", supportingDetails: [], qualifications: [], unclearPassages: [] } };
  const D = "10.1073/pnas.2422633122";
  const mk = (reported: string, identifier: string) => (async (_u: string, init: RequestInit) => {
    const b = JSON.parse(String(init.body));
    if (b.tools && String(b.input).includes("urls")) return json({ output: [
      { type: "web_search_call", status: "completed", action: { type: "open_page", url: `https://doi.org/${D}` } },
      { type: "message", content: [{ type: "output_text", annotations: [], text: JSON.stringify({ sources: [{ requestedUrl: `https://doi.org/${D}`, url: reported, identifier, verified: true, title: "Generative AI without guardrails can harm learning", authors: ["Hamsa Bastani", "Osbert Bastani"], year: "2025", method: "RCT", population: "~1,000 high school students, Turkey", measuredOutcome: "exam performance", supportsFinding: "yes" }], finding: "F", counterevidence: "" }) }] }] });
    if (b.tools) return json(msg(JSON.stringify({ status: "Supported", finding: "F", population: "p", studyType: "RCT", year: "2025", limitations: "" }), [{ type: "url_citation", url: `https://doi.org/${D}`, title: "Generative AI without guardrails can harm learning" }]));
    if (b.text?.format?.name === "scope_check") return json(msg(JSON.stringify({ scope: "indirect", reason: "r", suggestedWording: "w" })));
    return json(msg(JSON.stringify({ claims: [{ claim: "c", question: "Q?" }] })));
  }) as unknown as typeof fetch;
  it("accepts the publisher page for an opened DOI, keeping the observed DOI link", async () => {
    const it0 = (await research(input, { apiKey: "k", model: "m", fetchImpl: mk(`https://www.pnas.org/doi/${D}`, D) })).items[0]!;
    expect(it0.citation).toBe("(Bastani et al., 2025)");
    expect(it0.sources[0]!.url).toBe(`https://doi.org/${D}`);
  });
  it("rejects an unobserved page with a different DOI", async () => {
    const it0 = (await research(input, { apiKey: "k", model: "m", fetchImpl: mk("https://www.pnas.org/doi/10.1073/pnas.999", "10.1073/pnas.999") })).items[0]!;
    expect(it0.verification).toBe("access-failed");
  });
});
