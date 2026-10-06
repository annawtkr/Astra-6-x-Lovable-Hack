import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Studio from "@/components/Studio";

const brief = { mainPoint: "Point", supportingDetails: [], qualifications: [], unclearPassages: [] };
const research = {
  searchedAt: "2026-10-06T18:00:00.000Z",
  items: [
    { id: "a", claim: "Claim A", question: "Q A?", status: "Supported", finding: "Finding A", population: "1,000 adults, UK", studyType: "Survey", year: "2024", limitations: "Self-report", scope: "direct", citation: "(Lee et al., 2024)", sources: [{ title: "Study A", url: "https://example.org/a", authors: ["Ana Lee", "Bo Kim"] }] },
    { id: "b", claim: "Claim B", question: "Q B?", status: "Not found", finding: "", population: "", studyType: "", year: "", limitations: "", scope: "none", sources: [] },
  ],
};
const drafts = { drafts: [{ format: "x", posts: ["X text"], warnings: [] }, { format: "thread", posts: ["1", "2", "3"], warnings: [] }, { format: "linkedin", posts: ["LI"], warnings: [] }] };

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(
    url.endsWith("health") ? { configured: true } : url.endsWith("analyse") ? { brief } : url.endsWith("research") ? research : drafts,
  ), { status: 200 })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function toEvidence() {
  render(<Studio />);
  await screen.findByText("Live AI connected");
  fireEvent.change(screen.getByLabelText("Transcript", { exact: true }), { target: { value: "Some note." } });
  fireEvent.click(screen.getByRole("button", { name: "Analyse meaning" }));
  await screen.findByDisplayValue("Point");
  fireEvent.click(screen.getByRole("button", { name: "Continue to evidence review →" }));
}

describe("evidence review", () => {
  it("only sourced findings are selectable; selection clears approval; brief edits clear stale research", async () => {
    await toEvidence();
    fireEvent.click(screen.getByRole("button", { name: "Find evidence" }));
    const a = await screen.findByRole("article", { name: "Claim A" });
    const b = screen.getByRole("article", { name: "Claim B" });
    expect(within(b).getByRole("checkbox")).toBeDisabled();
    expect(within(a).getByRole("checkbox")).not.toBeChecked();
    expect(within(a).getByRole("link", { name: "Study A" })).toHaveAttribute("href", "https://example.org/a");

    // approve a draft, then change selection → approval cleared
    fireEvent.click(screen.getByRole("button", { name: /04 Drafts/ }));
    const card = screen.getByRole("article", { name: "X — single post" });
    fireEvent.change(within(card).getByLabelText("Text", { exact: true }), { target: { value: "Hand text" } });
    fireEvent.click(within(card).getByRole("checkbox"));
    expect(within(card).getByRole("checkbox")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /03 Evidence review/ }));
    fireEvent.click(within(screen.getByRole("article", { name: "Claim A" })).getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /04 Drafts/ }));
    expect(within(screen.getByRole("article", { name: "X — single post" })).getByRole("checkbox")).not.toBeChecked();

    // generate sends only selected evidence
    fireEvent.click(screen.getByRole("button", { name: "Generate all drafts" }));
    await screen.findByText("Proposed drafts — not applied");
    const call = vi.mocked(fetch).mock.calls.find(([u]) => String(u).endsWith("generate"))!;
    const sent = JSON.parse(String((call[1] as RequestInit).body));
    expect(sent.evidence.map((e: { id: string }) => e.id)).toEqual(["a"]);

    // editing the brief makes research stale
    fireEvent.click(screen.getByRole("button", { name: /02 Review meaning/ }));
    fireEvent.change(screen.getByDisplayValue("Point"), { target: { value: "Point edited" } });
    fireEvent.click(screen.getByRole("button", { name: /03 Evidence review/ }));
    expect(screen.queryByRole("article", { name: "Claim A" })).toBeNull();
    expect(screen.getByRole("button", { name: "Find evidence" })).toBeInTheDocument();
  });

  it("a failed lookup preserves transcript, brief and earlier work", async () => {
    await toEvidence();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: "Search failed; work preserved" }), { status: 502 }));
    fireEvent.click(screen.getByRole("button", { name: "Find evidence" }));
    await screen.findByText("Search failed; work preserved");
    fireEvent.click(screen.getByRole("button", { name: /02 Review meaning/ }));
    expect(screen.getByDisplayValue("Point")).toBeInTheDocument();
  });
});
