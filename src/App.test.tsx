import {render,screen,fireEvent,waitFor,within,cleanup} from "@testing-library/react";
import {afterEach,beforeEach,describe,it,expect,vi} from "vitest";
import Studio from "./App";
const brief={mainPoint:"One personal experience",supportingDetails:[],qualifications:[],unclearPassages:[]};
beforeEach(()=>{vi.stubGlobal("fetch",vi.fn(async(url:string)=>new Response(JSON.stringify(url.endsWith("health")?{configured:true}:url.endsWith("analyse")?{brief}:{drafts:[{format:"x",posts:["Suggested text"],warnings:[]},{format:"thread",posts:["One","Two","Three"],warnings:[]},{format:"linkedin",posts:["Longer suggested text"],warnings:[]}]}),{status:200})));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe("review and approval journey",()=>{
 it("preserves existing drafts until proposals are explicitly applied, then invalidates approval on edit",async()=>{
  render(<Studio/>); await screen.findByText("Live AI connected");
  fireEvent.change(screen.getByLabelText("Transcript",{exact:true}),{target:{value:"One personal experience."}});
  fireEvent.click(screen.getByRole("button",{name:"Analyse meaning"}));
  await screen.findByDisplayValue("One personal experience");
  fireEvent.click(screen.getByRole("button",{name:"Continue to evidence →"}));
  fireEvent.click(screen.getByRole("button",{name:"Continue without added evidence →"}));
  const card=screen.getByRole("article",{name:"X — single post"});
  fireEvent.change(within(card).getByLabelText("Text",{exact:true}),{target:{value:"My edited text"}});
  fireEvent.click(screen.getByRole("button",{name:"Generate all drafts"}));
  await screen.findByText("Proposed drafts — not applied");
  expect(within(card).getByLabelText("Text",{exact:true})).toHaveValue("My edited text");
  fireEvent.click(screen.getByRole("button",{name:"Apply all replacements"}));
  expect(within(card).getByLabelText("Text",{exact:true})).toHaveValue("Suggested text");
  const approve=within(card).getByRole("checkbox"); const publish=within(card).getByRole("button",{name:"Simulate publish"});
  expect(publish).toBeDisabled();fireEvent.click(approve);expect(publish).toBeEnabled();
  fireEvent.click(publish);
  fireEvent.change(within(card).getByLabelText("Text",{exact:true}),{target:{value:"A subsequent edit"}});
  expect(approve).not.toBeChecked();expect(publish).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:/05 Demo activity/}));
  expect(screen.getByText("Suggested text")).toBeInTheDocument();
  expect(screen.getByText("Demo — no post was sent.")).toBeInTheDocument();
 });
 it("preserves transcript after an API failure",async()=>{
  render(<Studio/>);await screen.findByText("Live AI connected");
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({error:"Try again; work preserved"}),{status:503}));
  const input=screen.getByLabelText("Transcript",{exact:true});fireEvent.change(input,{target:{value:"Keep my thoughts."}});
  fireEvent.click(screen.getByRole("button",{name:"Analyse meaning"}));
  await screen.findByText("Try again; work preserved");expect(input).toHaveValue("Keep my thoughts.");
 });
});

const findings = {
 searchedAt: "2026-10-06T12:00:00Z",
 claims: [
 {id:"one",claim:"Writing can require more time",status:"mixed",finding:"One study measured longer planning time.",limitations:"Small adult sample; not a social media study.",sources:[{title:"Writing study",url:"https://example.org/study",authors:"Smith et al.",year:"2025",studyType:"Observational",population:"Adults with dyslexia"}]},
 {id:"two",claim:"A universal percentage",status:"not_found",finding:"No suitable estimate found.",limitations:"No representative sample.",sources:[]}
 ]
};
async function openEvidence() {
 render(<Studio/>); await screen.findByText("Live AI connected");
 fireEvent.change(screen.getByLabelText("Transcript",{exact:true}),{target:{value:"Writing can require more time."}});
 fireEvent.click(screen.getByRole("button",{name:"Analyse meaning"}));
 await screen.findByDisplayValue("One personal experience");
 fireEvent.click(screen.getByRole("button",{name:"Continue to evidence →"}));
 vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(findings),{status:200}));
 fireEvent.click(screen.getByRole("button",{name:"Research factual claims"}));
 await screen.findByText("Writing can require more time");
}
describe("evidence review",()=>{
 it("requires explicit selection, sends selected evidence, and clears approvals after selection or source edits",async()=>{
  await openEvidence();
  const choices=screen.getAllByRole("checkbox");
  expect(choices[0]).not.toBeChecked();expect(choices[1]).toBeDisabled();
  expect(screen.getByRole("link",{name:"Writing study"})).toHaveAttribute("href","https://example.org/study");
  expect(screen.getByText(/Small adult sample/)).toBeInTheDocument();
  expect(screen.getByText(/Smith et al., 2025/)).toBeInTheDocument();
  fireEvent.click(choices[0]!);fireEvent.click(screen.getByRole("button",{name:"Continue with 1 selected finding →"}));
  fireEvent.click(screen.getByRole("button",{name:"Generate all drafts"}));
  await screen.findByText("Proposed drafts — not applied");
  const call=vi.mocked(fetch).mock.calls.find(([url])=>String(url).endsWith("generate"));
  expect(JSON.parse(String(call?.[1]?.body)).acceptedEvidence).toEqual([findings.claims[0]]);
  fireEvent.click(screen.getByRole("button",{name:"Apply all replacements"}));
  fireEvent.click(screen.getAllByRole("checkbox")[0]!);
  fireEvent.click(screen.getByRole("button",{name:/03 Evidence/}));
  fireEvent.click(screen.getAllByRole("checkbox")[0]!);
  fireEvent.click(screen.getByRole("button",{name:"Continue without added evidence →"}));
  expect(screen.getAllByRole("checkbox")[0]).not.toBeChecked();
  fireEvent.click(screen.getByRole("button",{name:/02 Review meaning/}));
  fireEvent.change(screen.getByLabelText("Main point"),{target:{value:"A changed meaning"}});
  fireEvent.click(screen.getByRole("button",{name:"Continue to evidence →"}));
  expect(screen.queryByRole("link",{name:"Writing study"})).not.toBeInTheDocument();
 });
 it("does not present sample content as researched evidence",async()=>{
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({configured:false}),{status:200}));
  render(<Studio/>);await screen.findByText("Live AI not configured — sample walkthrough & manual mode");
  fireEvent.click(screen.getByRole("button",{name:"Open sample walkthrough"}));
  fireEvent.click(screen.getByRole("button",{name:"Continue to evidence →"}));
  expect(screen.getByRole("button",{name:"Research factual claims"})).toBeDisabled();
  expect(screen.getByText(/Sample mode has no researched evidence/)).toBeInTheDocument();
  expect(screen.queryByRole("link",{name:"Writing study"})).not.toBeInTheDocument();
 });
 it("preserves researched findings and selection after a failed retry",async()=>{
  await openEvidence();fireEvent.click(screen.getAllByRole("checkbox")[0]!);
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({error:"Research unavailable; retry later"}),{status:503}));
  fireEvent.click(screen.getByRole("button",{name:"Research again"}));
  await screen.findByText("Research unavailable; retry later");
  expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
  expect(screen.getByRole("link",{name:"Writing study"})).toBeInTheDocument();
 });
});
