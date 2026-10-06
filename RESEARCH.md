# Voice Note Studio: research and acceptance fixtures

Research checked 6 October 2026. These are practical design choices informed by primary sources, not claims of a universally optimal posting formula or a completed accessibility audit.

## Five actionable rules

1. **Present one task at a time in plain language.** Use Capture → Review meaning → Edit drafts → Approve. Put short instructions next to the relevant control, use short paragraphs and generous spacing, and make the primary action explicit. [W3C cognitive accessibility guidance](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o3-clear-content/)
2. **Announce meaningful state changes without stealing focus.** Use a persistent polite status region for transcription/generation completion and an alert for actionable errors. Preserve existing text after failure and give a clear retry path. [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
3. **Make the speaker's meaning reviewable before style changes.** Show an editable main point, supporting details, qualifications, unclear passages, and source excerpts. Preserve uncertainty and contradictions; never turn an anecdote into a universal claim. This is a product safeguard derived from the requested fidelity requirements, not a platform ranking claim.
4. **Adapt structure, not facts.** X single post: one complete takeaway within the standard 280-character budget. X thread: 3–5 connected posts, each understandable and individually editable. LinkedIn: a concise opening point, short paragraphs, the supplied example, and a grounded takeaway. A question at the end is optional and must not introduce a new claim. [X post types](https://help.x.com/en/using-x/types-of-posts), [X threads](https://help.x.com/en/using-x/create-a-thread), [LinkedIn concise thought leadership guidance](https://www.linkedin.com/business/marketing/blog/content-marketing/creating-a-thought-leadership-marketing-plan)
5. **Keep the human in control of every replacement and publication.** Show a regeneration preview or ask before replacing edited text. Clear approval on edits. The simulated activity entry must preserve an immutable copy of the approved text and display “Demo — no post was sent.” This is a demo acceptance requirement; real posting access and platform promises are out of scope.

## Representative test transcripts

### 1. Rambling with a useful concrete example

> I was thinking about our meetings, actually this started when I couldn't find the notes last Tuesday. We spend a lot of time explaining the same decisions. The coffee machine was broken too, but that's not really relevant. Anyway, we tried ending one meeting by writing down the decision, the person responsible, and the next step. The next morning I could pick the work up without asking everyone again. I think a tiny decision log might help our team, although we've only tried it once. That's what I wanted to say: make the next step visible before the meeting ends.

Expected: main point is making the next step visible with a small decision log; retain the decision/owner/next-step example and “only tried it once” qualification. Omit coffee-machine tangent. Do not claim proven time savings or benefits for every team.

### 2. Qualification and deliberately uncertain numbers

> Voice notes help me get an idea out when writing feels difficult. Yesterday I talked through a draft while walking, then edited the transcript at my desk. It felt quicker for me, maybe ten minutes quicker, but I didn't time it. I'm not saying everyone should replace typing or that voice notes are always accessible. A quiet space and a way to edit the transcript still matter. I'd like tools to offer both speaking and typing so people can choose.

Expected: main point is offering a choice of speaking and typing; retain personal framing and the limitations. Do not promote “saves ten minutes” as a measured result, claim universal accessibility, or imply typing should be removed.

### 3. Contradiction and unresolved reference

> The workshop is definitely on Thursday. Actually my calendar says Friday, and I haven't checked with Priya yet. We have twelve people signed up, or maybe that was the number invited; I need to look at the sheet. What I do know is that we're testing a short session on turning spoken ideas into written drafts. It helped them last time, but I can't remember whether I mean the pilot group or the team. Please don't announce the date or attendance until I've checked.

Expected: flag Thursday/Friday conflict, signed-up/invited ambiguity, and unclear “them.” Keep date and attendance out of generated assertions. A safe draft may describe the planned topic without asserting a date, attendance, or outcome. Show the unresolved passages and invite user review rather than choosing a plausible interpretation.

## Fast interface review checklist

- Every recording, upload, transcript, brief, and draft control has a visible label and keyboard access.
- Focus remains visible, including on disabled/loading transitions; no keyboard trap.
- Recording status includes text and stop control, not colour alone.
- Loading, success, and failure are announced without repeating a timer every second.
- Each X thread post has its own count; counts are demo guidance unless platform-weighted counting is implemented.
- Editing text invalidates approval; regeneration cannot silently replace an edited draft.
- The activity log stays unchanged when the current draft is edited later.
- API/microphone errors retain typed work and provide a pasted-transcript path.
