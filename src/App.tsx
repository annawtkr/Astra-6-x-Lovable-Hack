import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/studio/api";
import {
  DRAFT_LABELS,
  MAX_AUDIO_SECONDS,
  X_LIMIT,
  editDraft,
  emptyBrief,
  emptyDrafts,
  publishProblems,
  setApproval,
  simulatePublish,
  type ActivityEntry,
  type Brief,
  type Draft,
  type Excerpted,
  type EvidenceClaim,
  type ResearchResult,
  usableEvidence,
} from "@/lib/studio/model";
import { SAMPLE_BRIEF, SAMPLE_DRAFTS, SAMPLE_TRANSCRIPT } from "@/lib/studio/sample";

type Step = "capture" | "review" | "evidence" | "drafts" | "activity";
const STEPS: { id: Step; label: string }[] = [
  { id: "capture", label: "Capture" },
  { id: "review", label: "Review meaning" },
  { id: "evidence", label: "Evidence" },
  { id: "drafts", label: "Drafts" },
  { id: "activity", label: "Demo activity" },
];

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export default function Studio() {
  const [live, setLive] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("capture");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSample, setIsSample] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [brief, setBrief] = useState<Brief>(emptyBrief());
  const [drafts, setDrafts] = useState<Draft[]>(emptyDrafts());
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const acceptedEvidence = useMemo(() => research?.claims.filter(c => selectedEvidence.includes(c.id) && usableEvidence(c)) ?? [], [research, selectedEvidence]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    api("/health").then((r) => setLive(r.configured)).catch(() => setLive(false));
  }, []);

  const announce = useCallback((m: string) => { setError(""); setStatus(m); }, []);
  const fail = useCallback((m: string) => { setStatus(""); setError(m); }, []);

  const go = (s: Step) => { setStep(s); setTimeout(() => document.getElementById("step-heading")?.focus(), 0); };

  const invalidate = () => setDrafts(ds => ds.map(d => ({...d, approved: false})));
  const invalidateResearch = () => { setResearch(null); setSelectedEvidence([]); invalidate(); };
  const loadSample = () => {
    if (drafts.some(d => d.posts.some(p => p.trim())) && !window.confirm("Replace your current transcript, brief and drafts with the sample?")) return;
    invalidateResearch();
    setIsSample(true);
    setTranscript(SAMPLE_TRANSCRIPT);
    setBrief(structuredClone(SAMPLE_BRIEF));
    setDrafts(structuredClone(SAMPLE_DRAFTS));
    announce("Sample walkthrough loaded. This is pre-written content, not AI output.");
    go("review");
  };

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 btn btn-primary">Skip to content</a>
      <header className="mx-auto max-w-5xl px-6 pt-12 pb-8 md:pt-16">
        <p className="eyebrow">Personal demo · nothing is ever posted</p>
        <h1 className="brand-wordmark mt-6" aria-label="iYap">
          iYap<span className="brand-orbit" aria-hidden="true" />
        </h1>
        <p className="mt-5 text-xl tracking-tight text-foreground md:text-2xl">Your thoughts. Clearly expressed.</p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Capture a thought, find its meaning, check the evidence, and make it yours to share.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          {live === null ? (
            <span className="text-muted-foreground">Checking AI availability…</span>
          ) : live ? (
            <span className="inline-flex items-center gap-2 font-medium text-success"><span aria-hidden className="h-2 w-2 rounded-full bg-success" />Live AI connected</span>
          ) : (
            <span className="badge-sample">Live AI not configured — sample walkthrough & manual mode</span>
          )}
          {isSample && <span className="badge-sample">Showing sample content — not AI generated</span>}
        </div>
      </header>

      <nav aria-label="Steps" className="mx-auto max-w-5xl px-6">
        <ol className="flex flex-wrap gap-2 border-b border-border pb-4">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => go(s.id)}
                aria-current={step === s.id ? "step" : undefined}
                className={step === s.id ? "btn btn-primary" : "btn btn-ghost"}
              >
                <span className="font-display opacity-70">{String(i + 1).padStart(2, "0")}</span> {s.label}
                {s.id === "activity" && activity.length > 0 && <span className="sr-only">({activity.length} entries)</span>}
                {s.id === "activity" && activity.length > 0 && <span aria-hidden>· {activity.length}</span>}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mx-auto max-w-5xl px-6 pt-4" aria-live="polite" role="status">
        {status && <p className="text-sm text-muted-foreground">{status}</p>}
      </div>
      <div className="mx-auto max-w-5xl px-6" aria-live="assertive" role="alert">
        {error && <p className="mt-2 rounded-xl border border-destructive bg-card px-4 py-3 text-sm text-destructive">{error}</p>}
      </div>

      <main id="main" className="mx-auto max-w-5xl px-6 py-8">
        {step === "capture" && (
          <Capture live={!!live} transcript={transcript} setTranscript={(t) => { setTranscript(t); setIsSample(false); invalidateResearch(); }}
            announce={announce} fail={fail} onSample={loadSample}
            onBrief={(b) => { setBrief(b); invalidateResearch(); setIsSample(false); go("review"); }} />
        )}
        {step === "review" && (
          <Review brief={brief} setBrief={(b) => { setBrief(b); invalidateResearch(); }} transcript={transcript} onNext={() => go("evidence")} />
        )}
        {step === "evidence" && (
          <Evidence live={!!live} isSample={isSample} transcript={transcript} brief={brief} research={research}
            selected={selectedEvidence} onResult={(r) => { setResearch(r); setSelectedEvidence([]); invalidate(); }}
            onSelect={(ids) => { setSelectedEvidence(ids); invalidate(); }} announce={announce} fail={fail} onNext={() => go("drafts")} />
        )}
        {step === "drafts" && (
          <Drafts acceptedEvidence={acceptedEvidence} live={!!live} transcript={transcript} brief={brief} drafts={drafts} setDrafts={setDrafts} announce={announce} fail={fail}
            onPublish={(e) => { setActivity((a) => [e, ...a]); announce(`Simulated ${DRAFT_LABELS[e.kind]}. Demo — no post was sent.`); }} />
        )}
        {step === "activity" && <Activity entries={activity} onClear={() => { setActivity([]); announce("Demo activity cleared."); }} />}
      </main>

      <footer className="mx-auto max-w-5xl px-6 pb-12 text-sm text-muted-foreground">
        Audio is sent to OpenAI for transcription only when you choose Transcribe. This app does not save audio on its server. Activity is session-only. No social accounts are connected.
      </footer>
    </div>
  );
}

function StepHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id="step-heading" tabIndex={-1} className="mt-1 text-3xl font-semibold md:text-4xl focus:outline-none">{title}</h2>
      {children && <p className="mt-2 max-w-2xl text-muted-foreground">{children}</p>}
    </div>
  );
}

/* ---------------- Capture ---------------- */

type AudioClip = { url: string; blob: Blob; name: string; duration: number | null };

function Capture(props: {
  live: boolean; transcript: string; setTranscript: (t: string) => void;
  announce: (m: string) => void; fail: (m: string) => void; onSample: () => void; onBrief: (b: Brief) => void;
}) {
  const { live, transcript, setTranscript, announce, fail } = props;

  const [clip, setClipState] = useState<AudioClip | null>(null);
  const clipRef = useRef<AudioClip | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState<"" | "transcribe" | "analyse">("");
  const recRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef(true);

  const setClip = (c: AudioClip | null) => {
    if (clipRef.current) URL.revokeObjectURL(clipRef.current.url);
    clipRef.current = c;
    setClipState(c);
  };

  useEffect(() => { activeRef.current = true; return () => {
    activeRef.current = false;
    if (clipRef.current) URL.revokeObjectURL(clipRef.current.url);
    if (timerRef.current) window.clearInterval(timerRef.current);
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
  }; }, []);

  const stop = () => {
    if (recRef.current?.state === "recording") recRef.current.stop();
  };

  const start = async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      fail("Recording isn't supported in this browser. Try uploading a file or pasting a transcript.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const began = Date.now();
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) window.clearInterval(timerRef.current);
        setRecording(false);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const secs = Math.min(MAX_AUDIO_SECONDS, Math.round((Date.now() - began) / 1000));
        const ext = (rec.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm";
        setClip({ url: URL.createObjectURL(blob), blob, name: `recording.${ext}`, duration: secs });
        announce(`Recording stopped at ${fmt(secs)}. You can play it back below.`);
      };
      recRef.current = rec;
      rec.start(1000);
      setElapsed(0);
      setRecording(true);
      announce("Recording started. Maximum 5 minutes.");
      timerRef.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - began) / 1000);
        setElapsed(s);
        if (s >= MAX_AUDIO_SECONDS) { rec.stop(); announce("Reached the 5 minute limit — recording stopped."); }
      }, 250);
    } catch (e) {
      fail(e instanceof DOMException && e.name === "NotAllowedError"
        ? "Microphone permission was denied. Allow access in your browser, or upload/paste instead."
        : `Couldn't start recording: ${errMsg(e)}`);
    }
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("audio/")) { fail("That file isn't an audio file."); return; }
    if (f.size > 25 * 1024 * 1024) { fail("Audio files must be under 25 MB."); return; }
    const url = URL.createObjectURL(f);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      const d = a.duration;
      if (Number.isFinite(d) && d > MAX_AUDIO_SECONDS) {
        URL.revokeObjectURL(url);
        fail(`That clip is ${fmt(Math.round(d))}. Please upload audio of 5 minutes or less.`);
        return;
      }
      setClip({ url, blob: f, name: f.name, duration: Number.isFinite(d) ? Math.round(d) : null });
      announce(`Loaded ${f.name}.`);
    };
    a.onerror = () => { URL.revokeObjectURL(url); fail("This audio format couldn't be read by your browser."); };
    a.src = url;
    if (fileRef.current) fileRef.current.value = "";
  };

  const doTranscribe = async () => {
    if (!clip) return;
    setBusy("transcribe");
    announce("Transcribing with OpenAI…");
    try {
      const fd = new FormData();
      fd.append("audio", new File([clip.blob], clip.name, { type: clip.blob.type }));
      const r = await api("/transcribe", fd);
      if (!activeRef.current) return;
      if (transcript.trim() && !window.confirm("Replace the current transcript with the transcription?")) return;
      setTranscript(r.transcript);
      announce("Transcript ready. Review and edit it below.");
    } catch (e) { fail(errMsg(e)); } finally { setBusy(""); }
  };

  const doAnalyse = async () => {
    setBusy("analyse");
    announce("Analysing meaning with OpenAI…");
    try {
      const { brief: b } = await api("/analyse", { transcript });
      if (!activeRef.current) return;
      announce("Meaning brief ready for review.");
      props.onBrief(b);
    } catch (e) { fail(errMsg(e)); } finally { setBusy(""); }
  };

  return (
    <section aria-labelledby="step-heading">
      <StepHeading eyebrow="Step 01" title="Capture your voice note">
        Record up to five minutes, upload a clip, or paste a transcript you already have.
      </StepHeading>

      {!live && (
        <div className="panel mb-6 bg-sample/40">
          <p className="font-semibold">Live AI isn't set up for this project.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Transcription, analysis and draft generation are currently unavailable. You can
            paste a transcript and write the brief yourself, or open a clearly labelled, pre-written sample.
          </p>
          <button type="button" className="btn btn-outline mt-4" onClick={props.onSample}>Open sample walkthrough</button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="panel">
          <h3 className="text-xl font-semibold">Audio</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            {!recording ? (
              <button type="button" className="btn btn-primary" onClick={start} disabled={!!busy}>
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-primary-foreground" /> Record
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={stop}>■ Stop ({fmt(elapsed)} / 5:00)</button>
            )}
            <label className="btn btn-outline cursor-pointer focus-within:outline focus-within:outline-3 focus-within:outline-ring">
              Upload audio
              <input ref={fileRef} type="file" accept="audio/*" className="sr-only" disabled={recording}
                onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          </div>
          {recording && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Recording time"
              aria-valuemin={0} aria-valuemax={MAX_AUDIO_SECONDS} aria-valuenow={elapsed}>
              <div className="h-full bg-primary transition-all" style={{ width: `${(elapsed / MAX_AUDIO_SECONDS) * 100}%` }} />
            </div>
          )}
          {clip && (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-muted-foreground">{clip.name}{clip.duration != null && ` · ${fmt(clip.duration)}`}</p>
              <audio controls src={clip.url} className="w-full" aria-label="Playback of your voice note" />
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn btn-primary" onClick={doTranscribe} disabled={!live || !!busy}
                  aria-describedby={!live ? "no-live" : undefined}>
                  {busy === "transcribe" ? "Transcribing…" : "Transcribe"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setClip(null); announce("Audio discarded."); }}>Discard audio</button>
              </div>
              {!live && <p id="no-live" className="text-sm text-muted-foreground">Transcription needs live AI. Paste a transcript instead.</p>}
            </div>
          )}
        </div>

        <div className="panel">
          <label htmlFor="transcript" className="text-xl font-semibold font-display">Transcript</label>
          <textarea id="transcript" className="field mt-4 min-h-56" value={transcript} disabled={!!busy}
            onChange={(e) => setTranscript(e.target.value)} placeholder="Paste or edit a transcript…" />
          <div className="mt-4 flex flex-wrap gap-3">
            {live ? (
              <button type="button" className="btn btn-primary" disabled={!transcript.trim() || !!busy} onClick={doAnalyse}>
                {busy === "analyse" ? "Analysing…" : "Analyse meaning"}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={!transcript.trim()}
                onClick={() => { props.announce("Write the meaning brief yourself — no AI was used."); props.onBrief(emptyBrief()); }}>
                Write brief manually
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/* ---------------- Review ---------------- */

const GROUPS: { key: "supportingDetails" | "qualifications" | "unclearPassages"; label: string; hint: string }[] = [
  { key: "supportingDetails", label: "Supporting details", hint: "Facts and examples that back up the main point." },
  { key: "qualifications", label: "Qualifications", hint: "Caveats and limits the drafts must respect." },
  { key: "unclearPassages", label: "Unclear passages", hint: "Things to check — never stated as fact." },
];

function Review({ brief, setBrief, transcript, onNext }: { brief: Brief; setBrief: (b: Brief) => void; transcript: string; onNext: () => void }) {
  const update = (k: (typeof GROUPS)[number]["key"], items: Excerpted[]) => setBrief({ ...brief, [k]: items });
  return (
    <section aria-labelledby="step-heading">
      <StepHeading eyebrow="Step 02" title="Review the meaning">
        Check that this brief says what you meant. Drafts are checked against this brief and your original transcript.
      </StepHeading>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <div className="panel">
            <label htmlFor="main-point" className="font-display text-xl font-semibold">Main point</label>
            <textarea id="main-point" className="field mt-3 min-h-24 font-display text-lg" value={brief.mainPoint}
              onChange={(e) => setBrief({ ...brief, mainPoint: e.target.value })} />
          </div>
          {GROUPS.map((g) => (
            <fieldset key={g.key} className="panel">
              <legend className="sr-only">{g.label}</legend>
              <h3 className="text-xl font-semibold" aria-hidden>{g.label}</h3>
              <p className="text-sm text-muted-foreground">{g.hint}</p>
              <ul className="mt-4 space-y-4">
                {brief[g.key].map((it, i) => (
                  <li key={i} className="rounded-xl border border-border p-4">
                    <label className="text-sm font-semibold" htmlFor={`${g.key}-${i}-t`}>{g.label} {i + 1}</label>
                    <textarea id={`${g.key}-${i}-t`} className="field mt-1 min-h-16" value={it.text}
                      onChange={(e) => update(g.key, brief[g.key].map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                    <label className="mt-3 block text-sm font-semibold text-muted-foreground" htmlFor={`${g.key}-${i}-s`}>Source excerpt</label>
                    <textarea id={`${g.key}-${i}-s`} className="field mt-1 min-h-12 italic" value={it.sourceExcerpt}
                      onChange={(e) => update(g.key, brief[g.key].map((x, j) => (j === i ? { ...x, sourceExcerpt: e.target.value } : x)))} />
                    <button type="button" className="btn btn-ghost mt-2" onClick={() => update(g.key, brief[g.key].filter((_, j) => j !== i))}>
                      Remove<span className="sr-only"> {g.label} {i + 1}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn-outline mt-4" onClick={() => update(g.key, [...brief[g.key], { text: "", sourceExcerpt: "" }])}>
                + Add {g.label.toLowerCase().replace(/s$/, "")}
              </button>
            </fieldset>
          ))}
          <button type="button" className="btn btn-primary" onClick={onNext} disabled={!brief.mainPoint.trim()}>Continue to evidence →</button>
        </div>
        <aside className="panel h-fit lg:sticky lg:top-6" aria-label="Transcript for reference">
          <h3 className="text-lg font-semibold">Transcript</h3>
          <p className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{transcript || "No transcript yet."}</p>
        </aside>
      </div>
    </section>
  );
}

/* ---------------- Evidence ---------------- */

const evidenceStatus: Record<EvidenceClaim["status"], string> = {
  supported: "Supported", mixed: "Mixed or limited evidence", unsupported: "Not supported", not_found: "No suitable evidence found",
};

function Evidence(props: {
  live: boolean; isSample: boolean; transcript: string; brief: Brief; research: ResearchResult | null;
  selected: string[]; onResult: (r: ResearchResult) => void; onSelect: (ids: string[]) => void;
  announce: (m: string) => void; fail: (m: string) => void; onNext: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const research = async () => {
    setBusy(true); props.announce("Checking factual claims against published research…");
    try {
      const result = await api("/research", { transcript: props.transcript, brief: props.brief });
      if (!active.current) return;
      props.onResult(result);
      props.announce("Evidence review ready. Nothing is selected for your drafts yet.");
    } catch (e) { if (active.current) props.fail(errMsg(e)); }
    finally { if (active.current) setBusy(false); }
  };
  const copy = async () => {
    const text = props.research?.claims.map(c => `${c.claim}\n${evidenceStatus[c.status]}: ${c.finding}\nLimitations: ${c.limitations}\n${c.sources.map(s => `${s.title} (${s.authors}, ${s.year}; ${s.studyType}; ${s.population}) — ${s.url}`).join("\n")}`).join("\n\n") ?? "";
    try { await navigator.clipboard.writeText(text); props.announce("Evidence summary copied."); }
    catch { props.fail("Couldn't copy — your browser blocked clipboard access."); }
  };
  return <section aria-labelledby="step-heading" aria-busy={busy}>
    <StepHeading eyebrow="Step 03" title="Check the evidence">
      Find studies behind factual claims, then choose which findings to use. Research stays separate from what you originally said.
    </StepHeading>
    <div className="panel mb-6">
      <p>Research sends factual claims to web search, excluding personal anecdotes. Findings may concern a different population or measure; check the limitations before selecting them.</p>
      <p className="mt-2 text-sm text-muted-foreground">No suitable study is a valid result. Missing evidence does not prove a claim false, and a related study does not establish the exact claim.</p>
      {props.isSample && <p className="mt-3 badge-sample">Sample mode has no researched evidence. Paste your own transcript to run a real search.</p>}
      {!props.live && <p className="mt-3 text-sm">Live research is unavailable. You can continue without adding evidence.</p>}
      <button type="button" className="btn btn-primary mt-4" onClick={research} disabled={busy || !props.live || props.isSample || !props.brief.mainPoint.trim()}>
        {busy ? "Researching claims…" : props.research ? "Research again" : "Research factual claims"}
      </button>
    </div>
    {props.research && <div className="space-y-5 mb-6">
      <p className="text-sm text-muted-foreground">Search completed: {new Date(props.research.searchedAt).toLocaleString()}. New findings require your explicit selection.</p>
      {!props.research.claims.length && <p className="panel">No checkable factual claims were identified. Your personal experience can stand on its own.</p>}
      {props.research.claims.map(c => <article key={c.id} className="panel" aria-label={c.claim}>
        <p className="eyebrow">{evidenceStatus[c.status]}</p>
        <h3 className="mt-2 text-xl font-semibold">{c.claim}</h3>
        <p className="mt-4"><strong>What the research found:</strong> {c.finding}</p>
        <p className="mt-3"><strong>Limits of this evidence:</strong> {c.limitations}</p>
        <ul className="mt-4 space-y-3" aria-label="Research sources">{c.sources.map((source, i) => <li key={i}>
          {/^(https?):\/\//i.test(source.url) ? <a className="underline text-primary" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> : <span>{source.title}</span>}
          <p className="text-sm text-muted-foreground">{source.authors || "Author not reported"}, {source.year || "Year not reported"} · {source.studyType || "Study type not reported"} · Population: {source.population || "Not reported"}</p>
        </li>)}</ul>
        <label className="mt-5 flex items-start gap-3 font-medium">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-primary" disabled={busy || !usableEvidence(c)} checked={props.selected.includes(c.id)}
            onChange={e => props.onSelect(e.target.checked ? [...props.selected, c.id] : props.selected.filter(id => id !== c.id))} />
          Use this finding with its qualifications in drafts
        </label>
        {!usableEvidence(c) && <p className="mt-2 text-sm text-muted-foreground">This claim cannot be added as supporting evidence.</p>}
      </article>)}
      {props.research.claims.length > 0 && <button type="button" className="btn btn-outline" onClick={copy}>Copy evidence summary</button>}
    </div>}
    <button type="button" className="btn btn-primary" onClick={props.onNext} disabled={busy || !props.brief.mainPoint.trim()}>
      {props.selected.length ? `Continue with ${props.selected.length} selected finding${props.selected.length === 1 ? "" : "s"} →` : "Continue without added evidence →"}
    </button>
  </section>;
}

/* ---------------- Drafts ---------------- */

function Drafts(props: {
  acceptedEvidence: EvidenceClaim[]; live: boolean; transcript: string; brief: Brief; drafts: Draft[]; setDrafts: (fn: (d: Draft[]) => Draft[]) => void;
  announce: (m: string) => void; fail: (m: string) => void; onPublish: (e: ActivityEntry) => void;
}) {
  const [proposals, setProposals] = useState<Draft[] | null>(null);
  useEffect(() => { setProposals(null); }, [props.brief, props.transcript, props.acceptedEvidence]);
  const [busyAll, setBusyAll] = useState(false);
  const replace = (i: number, d: Draft) => props.setDrafts((ds) => ds.map((x, j) => (j === i ? d : x)));

  const generateAll = async () => {
    setBusyAll(true);
    props.announce("Generating all three drafts with OpenAI…");
    try {
      const results = await api("/generate", { transcript: props.transcript, brief: props.brief, acceptedEvidence: props.acceptedEvidence });
      setProposals(results.drafts.map(toDraft));
      props.announce("Three proposed drafts ready. Apply them only after reviewing; your existing drafts are unchanged.");
    } catch (e) { props.fail(errMsg(e)); } finally { setBusyAll(false); }
  };

  return (
    <section aria-labelledby="step-heading">
      <StepHeading eyebrow="Step 04" title="Shape your drafts">
        Edit freely. Any edit clears approval, so what you approve is exactly what gets simulated.
      </StepHeading>
      {props.live ? (
        <button type="button" className="btn btn-primary mb-6" onClick={generateAll} disabled={busyAll || !props.brief.mainPoint.trim()}>
          {busyAll ? "Generating…" : "Generate all drafts"}
        </button>
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">Live AI isn't configured — write drafts by hand, or open the sample walkthrough from Capture.</p>
      )}
      {proposals && <div className="panel mb-6" aria-label="Proposed drafts"><h3 className="text-xl">Proposed drafts — not applied</h3>{proposals.map(d => <div key={d.kind} className="my-4"><h4>{DRAFT_LABELS[d.kind]}</h4>{d.posts.map((p,i) => <p className="whitespace-pre-wrap my-2" key={i}>{p}</p>)}<Warnings draft={d}/></div>)}<button className="btn btn-primary" onClick={() => { props.setDrafts(() => proposals); setProposals(null); props.announce("Proposals applied. All approvals cleared."); }}>Apply all replacements</button><button className="btn btn-ghost" onClick={() => setProposals(null)}>Discard proposals</button></div>}
      <div className="space-y-6">
        {props.drafts.map((d, i) => (
          <DraftCard acceptedEvidence={props.acceptedEvidence} key={d.kind} draft={d} live={props.live} brief={props.brief} transcript={props.transcript} onChange={(nd) => replace(i, nd)}
            announce={props.announce} fail={props.fail} onPublish={props.onPublish} />
        ))}
      </div>
    </section>
  );
}

function DraftCard({ acceptedEvidence, draft, live, brief, transcript, onChange, announce, fail, onPublish }: {
  acceptedEvidence: EvidenceClaim[]; draft: Draft; live: boolean; brief: Brief; transcript: string;
  onChange: (d: Draft) => void; announce: (m: string) => void; fail: (m: string) => void; onPublish: (e: ActivityEntry) => void;
}) {
  const [proposal, setProposal] = useState<Draft | null>(null);
  useEffect(() => { setProposal(null); }, [brief, transcript, acceptedEvidence]);
  const [busy, setBusy] = useState(false);
  const label = DRAFT_LABELS[draft.kind];
  const problems = publishProblems(draft);
  const idBase = `draft-${draft.kind}`;
  const isThread = draft.kind === "thread";

  const setPost = (i: number, v: string) => onChange(editDraft(draft, draft.posts.map((p, j) => (j === i ? v : p))));

  const regenerate = async () => {
    setBusy(true);
    announce(`Proposing a new ${label}…`);
    try {
      const r = await api("/generate", { transcript, brief, acceptedEvidence, format: draft.kind });
      const match = r.drafts.find((d: {format:string}) => d.format === draft.kind);
      if (!match) throw new Error("No replacement was returned. Your draft is unchanged.");
      setProposal(toDraft(match));
      announce(`Proposed replacement for ${label} is ready. Apply or discard it.`);
    } catch (e) { fail(errMsg(e)); } finally { setBusy(false); }
  };

  const copy = async () => {
    try {
      const text = isThread ? draft.posts.map((p, i) => `${i + 1}/${draft.posts.length} ${p}`).join("\n\n") : draft.posts[0];
      await navigator.clipboard.writeText(text ?? "");
      announce(`${label} copied to clipboard.`);
    } catch { fail("Couldn't copy — your browser blocked clipboard access."); }
  };

  return (
    <article className="panel" aria-labelledby={`${idBase}-h`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 id={`${idBase}-h`} className="text-2xl font-semibold">{label}</h3>
        {draft.approved && <span className="text-sm font-semibold text-success">✓ Approved</span>}
      </div>

      <div className="mt-4 space-y-3">
        {draft.posts.map((p, i) => {
          const over = draft.kind !== "linkedin" && p.length > X_LIMIT;
          return (
            <div key={i}>
              <div className="flex items-center justify-between">
                <label htmlFor={`${idBase}-${i}`} className="text-sm font-semibold">{isThread ? `Post ${i + 1}` : "Text"}</label>
                <span id={`${idBase}-${i}-c`} className={`text-xs ${over ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                  {p.length}{draft.kind !== "linkedin" && ` / ${X_LIMIT}`} characters
                </span>
              </div>
              <textarea id={`${idBase}-${i}`} aria-describedby={`${idBase}-${i}-c`} aria-invalid={over}
                className={`field mt-1 ${draft.kind === "linkedin" ? "min-h-64" : "min-h-24"}`} value={p}
                onChange={(e) => setPost(i, e.target.value)} />
              {isThread && draft.posts.length > 3 && (
                <button type="button" className="btn btn-ghost mt-1" onClick={() => onChange(editDraft(draft, draft.posts.filter((_, j) => j !== i)))}>
                  Remove post {i + 1}
                </button>
              )}
            </div>
          );
        })}
        {isThread && draft.posts.length < 5 && (
          <button type="button" className="btn btn-outline" onClick={() => onChange(editDraft(draft, [...draft.posts, ""]))}>+ Add post</button>
        )}
      </div>

      {proposal && (
        <div className="mt-5 rounded-xl border-2 border-dashed border-primary bg-accent/40 p-4" role="region" aria-label={`Proposed replacement for ${label}`}>
          <p className="eyebrow text-accent-foreground">Proposed replacement — not applied yet</p>
          <div className="mt-2 space-y-2 whitespace-pre-wrap text-sm">
            {proposal.posts.map((p, i) => <p key={i}>{isThread && <strong>{i + 1}. </strong>}{p}</p>)}
          </div>
          <Warnings draft={proposal}/><div className="mt-3 flex gap-3">
            <button type="button" className="btn btn-primary" onClick={() => { onChange(proposal); setProposal(null); announce(`Replacement applied to ${label}. Approval cleared.`); }}>Apply replacement</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setProposal(null); announce("Proposal discarded."); }}>Discard</button>
          </div>
        </div>
      )}

      <Warnings draft={draft}/>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button type="button" className="btn btn-outline" onClick={copy}>Copy<span className="sr-only"> {label}</span></button>
        <button type="button" className="btn btn-outline" onClick={regenerate} disabled={!live || busy || !brief.mainPoint.trim()}
          title={!live ? "Needs live AI" : undefined}>
          {busy ? "Proposing…" : "Regenerate"}<span className="sr-only"> {label}</span>
        </button>
        <label className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-full px-3 font-medium">
          <input type="checkbox" className="h-5 w-5 accent-primary" checked={draft.approved}
            onChange={(e) => { onChange(setApproval(draft, e.target.checked)); announce(e.target.checked ? `${label} approved.` : `${label} approval removed.`); }} />
          I approve this exact text
        </label>
        <button type="button" className="btn btn-primary" disabled={problems.length > 0} aria-describedby={`${idBase}-why`}
          onClick={() => onPublish(simulatePublish(draft))}>
          Simulate publish
        </button>
      </div>
      <p id={`${idBase}-why`} className="mt-2 text-right text-xs text-muted-foreground">
        {problems.length ? problems.join(" ") : "Ready. Simulation only — nothing will be posted."}
      </p>
    </article>
  );
}

/* ---------------- Activity ---------------- */

function Activity({ entries, onClear }: { entries: ActivityEntry[]; onClear: () => void }) {
  return (
    <section aria-labelledby="step-heading">
      <StepHeading eyebrow="Step 05" title="Demo activity">
        A session-only log of simulated publishes. It disappears when you close or reload the tab.
      </StepHeading>
      {entries.length === 0 ? (
        <p className="panel text-muted-foreground">No simulated posts yet.</p>
      ) : (
        <>
          <ol className="space-y-4">
            {entries.map((e) => (
              <li key={e.id} className="panel">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold">{DRAFT_LABELS[e.kind]}</h3>
                  <time dateTime={e.at} className="text-sm text-muted-foreground">{new Date(e.at).toLocaleString()}</time>
                </div>
                <p className="mt-1 text-sm font-semibold text-primary">{e.note}</p>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed">{e.text}</pre>
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn-ghost mt-4" onClick={onClear}>Clear activity</button>
        </>
      )}
    </section>
  );
}


function toDraft(d: {format: Draft["kind"]; posts: string[]; warnings?: unknown[]}): Draft { return {kind:d.format, posts:d.posts, approved:false, warnings:(d.warnings ?? []).map(w => typeof w === "string" ? w : JSON.stringify(w))}; }
function Warnings({draft}:{draft:Draft}) { return draft.warnings?.length ? <div className="mt-3 rounded-xl bg-sample p-4"><p className="font-semibold">Fidelity review</p><ul className="list-disc pl-5">{draft.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div> : null; }
