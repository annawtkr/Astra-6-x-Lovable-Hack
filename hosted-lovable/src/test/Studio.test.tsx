import {render,screen,fireEvent,waitFor,within,cleanup} from "@testing-library/react";
import {afterEach,beforeEach,describe,it,expect,vi} from "vitest";
import Studio from "@/components/Studio";
const brief={mainPoint:"One personal experience",supportingDetails:[],qualifications:[],unclearPassages:[]};
beforeEach(()=>{vi.stubGlobal("fetch",vi.fn(async(url:string)=>new Response(JSON.stringify(url.endsWith("health")?{configured:true}:url.endsWith("analyse")?{brief}:{drafts:[{format:"x",posts:["Suggested text"],warnings:[]},{format:"thread",posts:["One","Two","Three"],warnings:[]},{format:"linkedin",posts:["Longer suggested text"],warnings:[]}]}),{status:200})));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe("review and approval journey",()=>{
 it("preserves existing drafts until proposals are explicitly applied, then invalidates approval on edit",async()=>{
  render(<Studio/>); await screen.findByText("Live AI connected");
  fireEvent.change(screen.getByLabelText("Transcript",{exact:true}),{target:{value:"One personal experience."}});
  fireEvent.click(screen.getByRole("button",{name:"Analyse meaning"}));
  await screen.findByDisplayValue("One personal experience");
  fireEvent.click(screen.getByRole("button",{name:"Continue to evidence review →"}));
  fireEvent.click(screen.getByRole("button",{name:"Skip to drafts →"}));
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
