import { describe, expect, it } from "vitest";
import { DEMO_NOTE, editDraft, publishProblems, setApproval, simulatePublish, type Draft } from "./model";

const ready: Draft = { kind: "x", posts: ["Hello"], approved: true };

describe("draft rules", () => {
  it("editing invalidates approval", () => {
    expect(editDraft(ready, ["Hello!"]).approved).toBe(false);
  });
  it("simulate publish requires approval", () => {
    expect(() => simulatePublish(setApproval(ready, false))).toThrow();
  });
  it("saves exact text with demo note", () => {
    const e = simulatePublish(ready);
    expect(e.text).toBe("Hello");
    expect(e.note).toBe("Demo — no post was sent.");
    expect(DEMO_NOTE).toBe("Demo — no post was sent.");
  });
  it("thread needs 3-5 posts", () => {
    expect(publishProblems({ kind: "thread", posts: ["a", "b"], approved: true })).toContain(
      "A thread needs 3 to 5 posts.",
    );
    expect(publishProblems({ kind: "thread", posts: ["a", "b", "c"], approved: true })).toEqual([]);
  });
  it("X posts over 280 chars are blocked", () => {
    expect(publishProblems({ kind: "x", posts: ["a".repeat(281)], approved: true }).length).toBe(1);
  });
});

