import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageIntro } from "@/components/site-chrome";
import { summarizeStory } from "@/lib/ai.functions";
import { LiveNews } from "@/components/live-news";
import { friendlyAIError } from "@/lib/ai-error";

export const Route = createFileRoute("/ai-news")({
  head: () => ({
    meta: [
      { title: "AI News — spoken briefings | AEVIA" },
      {
        name: "description",
        content:
          "AI news condensed into three-sentence summaries and read aloud as a spoken daily briefing.",
      },
      { property: "og:title", content: "AI News — spoken briefings | AEVIA" },
      {
        property: "og:description",
        content:
          "AI news condensed into three-sentence summaries and read aloud as a spoken daily briefing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: News,
});

type Story = {
  id: number;
  cat: string;
  date: string;
  title: string;
  dek: string;
  body: string;
  summary: string;
};
const STORIES: Story[] = [
  {
    id: 1,
    cat: "Research",
    date: "12 Mar 2026",
    title: "Small models are quietly closing the gap with large ones",
    dek: "Compact models trained on carefully filtered data are matching much larger systems on everyday reasoning tasks.",
    body: "A series of new evaluations shows that models with a fraction of the parameters of frontier systems now perform comparably on common reasoning, summarisation and coding benchmarks. Researchers credit aggressive data filtering, distillation from larger teachers and better training recipes. The shift matters because small models can run on laptops and phones, lowering cost and keeping data on the device. Critics caution that benchmarks overstate parity and that large models still lead on long, multi-step problems.",
    summary:
      "Smaller AI models are now matching much bigger ones on everyday tasks. Better training data and distillation are the main reasons. That means capable AI can run cheaply on personal devices.",
  },
  {
    id: 2,
    cat: "Policy",
    date: "09 Mar 2026",
    title: "Schools are writing their own rules for classroom AI",
    dek: "With national guidance still in draft, individual schools are publishing their own acceptable-use policies.",
    body: "Head teachers say they cannot wait for national frameworks while students already use AI tools daily. Many new policies allow AI for brainstorming and feedback but require disclosure and ban it for assessed work. Teachers report inconsistent rules between neighbouring schools, which confuses families. Education bodies say shared templates are coming later this year.",
    summary:
      "Schools are making their own AI rules while national guidance is delayed. Most allow AI for practice but require students to disclose its use. Rules differ between schools, so shared templates are expected soon.",
  },
  {
    id: 3,
    cat: "Industry",
    date: "05 Mar 2026",
    title: "On-device vision unlocks a new wave of browser experiments",
    dek: "Hand and pose tracking now run at interactive speed in the browser, without sending video anywhere.",
    body: "WebAssembly and GPU acceleration have made real-time computer vision practical inside ordinary web pages. Developers are building gesture-controlled interfaces, fitness coaches and accessibility tools that never upload camera footage. Privacy advocates welcome the local-first approach. Performance still varies widely on older phones.",
    summary:
      "Hand and body tracking can now run in real time inside a web browser. Because video stays on the device, these tools are more private. Older phones can still struggle with the workload.",
  },
  {
    id: 4,
    cat: "Society",
    date: "28 Feb 2026",
    title: "Open crime data proves harder to compare than to publish",
    dek: "Analysts warn that differing definitions and reporting rates make headline comparisons misleading.",
    body: "Governments are releasing more crime statistics as open data, but analysts say comparing regions is fraught. A rise in reported cases can reflect better reporting rather than more crime. Definitions of offences also change between years and jurisdictions. Experts recommend rates per population and clear caveats alongside every chart.",
    summary:
      "More crime data is being published openly, but comparisons are tricky. Higher numbers can mean better reporting, not more crime. Experts urge using population rates and clear caveats.",
  },
  {
    id: 5,
    cat: "Industry",
    date: "21 Feb 2026",
    title: "Summarisation is becoming the default reading interface",
    dek: "Readers increasingly meet a generated summary before the article itself — with mixed effects on comprehension.",
    body: "News apps, browsers and email clients now show AI summaries first. Studies suggest readers save time but retain fewer details and sometimes miss nuance. Publishers worry about lost traffic while some see summaries as a gateway to deeper reading. Designers are experimenting with summaries that link each sentence to its source paragraph.",
    summary:
      "Many apps now show an AI summary before the full article. Readers save time but may remember less detail. Designers are linking summary sentences back to their sources to help.",
  },
  {
    id: 6,
    cat: "Research",
    date: "14 Feb 2026",
    title: "Researchers push for evaluation that reflects real use",
    dek: "A coalition of labs argues that leaderboard scores no longer predict how models behave for real people.",
    body: "The group proposes testing models on realistic, messy tasks drawn from actual user requests, with human raters judging usefulness. They argue popular benchmarks have been saturated or leaked into training data. Early pilots show rankings shift noticeably under the new method. Some labs have agreed to publish results using the framework.",
    summary:
      "Researchers say popular AI leaderboards no longer reflect real-world usefulness. They propose testing models on realistic tasks judged by people. Early trials show the rankings change noticeably.",
  },
  {
    id: 7,
    cat: "Policy",
    date: "07 Feb 2026",
    title: "Regulators ask for clearer labels on generated media",
    dek: "New draft rules would require visible and machine-readable marks on AI-generated images and audio.",
    body: "The proposal combines on-screen labels with embedded provenance metadata. Platforms would need to preserve these marks when content is shared. Artists support attribution but worry about false positives on edited work. Consultation runs until the summer.",
    summary:
      "Draft rules would require AI-made images and audio to carry clear labels. Hidden provenance data would also travel with the file. The public can comment on the proposal until summer.",
  },
  {
    id: 8,
    cat: "Society",
    date: "30 Jan 2026",
    title: "Voice assistants are finding a second life as reading companions",
    dek: "Natural-sounding speech is turning news briefings into something people actually listen to.",
    body: "Improved text-to-speech has made spoken news briefings far more pleasant. Commuters and visually impaired readers are the fastest-growing audiences. Short, well-structured summaries work best when read aloud. Publishers are rewriting headlines to sound natural when spoken.",
    summary:
      "Better synthetic voices are making spoken news briefings popular. Commuters and visually impaired readers are leading the trend. Short, clear summaries work best when read aloud.",
  },
];
const CATS = ["All", "Research", "Policy", "Industry", "Society"];
const readMins = (s: Story) => Math.max(1, Math.round(s.body.split(" ").length / 200));

function useSpeech() {
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [rate, setRate] = useState(1);
  const queue = useRef<{ id: number; text: string }[]>([]);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported("speechSynthesis" in window);
  }, []);

  function pickVoice() {
    const v = window.speechSynthesis.getVoices();
    return (
      v.find(
        (x) => /en-(GB|IN|US)/.test(x.lang) && /Natural|Google|Samantha|Daniel/.test(x.name),
      ) ?? v.find((x) => x.lang.startsWith("en"))
    );
  }
  function playNext() {
    const item = queue.current.shift();
    if (!item) {
      setSpeakingId(null);
      return;
    }
    const u = new SpeechSynthesisUtterance(item.text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.rate = rate;
    u.onend = playNext;
    u.onerror = () => setSpeakingId(null);
    setSpeakingId(item.id);
    window.speechSynthesis.speak(u);
  }
  function play(items: { id: number; text: string }[]) {
    if (!supported) return;
    window.speechSynthesis.cancel();
    queue.current = [...items];
    playNext();
  }
  function stop() {
    if (supported) window.speechSynthesis.cancel();
    queue.current = [];
    setSpeakingId(null);
  }
  useEffect(
    () => () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    },
    [],
  );
  return { speakingId, play, stop, rate, setRate, supported };
}

function Eq() {
  return (
    <span className="inline-flex h-3 items-end gap-[2px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="eq-bar h-3 w-[3px] rounded bg-primary"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function News() {
  const summarize = useServerFn(summarizeStory);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Story | null>(null);
  const [summaries, setSummaries] = useState<Record<number, string>>({});
  const [summaryErrors, setSummaryErrors] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<number | null>(null);
  const speech = useSpeech();

  const list = useMemo(
    () =>
      STORIES.filter(
        (s) =>
          (cat === "All" || s.cat === cat) &&
          (s.title + s.dek).toLowerCase().includes(q.toLowerCase()),
      ),
    [cat, q],
  );
  const [lead, ...rest] = list;

  async function getSummary(s: Story): Promise<string | null> {
    if (summaries[s.id]) return summaries[s.id] ?? null;
    setLoading(s.id);
    setSummaryErrors((current) => ({ ...current, [s.id]: "" }));
    try {
      const { summary } = await summarize({ data: { title: s.title, body: s.body } });
      const text = summary.trim();
      if (!text) throw new Error("The AI returned an empty summary. Please try again.");
      setSummaries((m) => ({ ...m, [s.id]: text }));
      return text;
    } catch (error) {
      setSummaryErrors((current) => ({
        ...current,
        [s.id]: friendlyAIError(error),
      }));
      return null;
    } finally {
      setLoading(null);
    }
  }

  function briefing() {
    speech.play([
      {
        id: -1,
        text: `Good day. This is your AEVIA briefing, with ${list.length} ${list.length === 1 ? "story" : "stories"}.`,
      },
      ...list.map((s) => ({
        id: s.id,
        text: `${s.cat}. ${s.title}. ${summaries[s.id] ?? s.summary}`,
      })),
      { id: -2, text: "That's the briefing. Thanks for listening." },
    ]);
  }
  async function listen(s: Story) {
    const text = await getSummary(s);
    if (!text) return;
    speech.play([{ id: s.id, text: `${s.title}. ${text}` }]);
  }
  const nowPlaying = STORIES.find((s) => s.id === speech.speakingId);

  return (
    <>
      <PageIntro module="Module 03 · Signal" title="AI News">
        A quiet reading surface that talks. Condense any story into three plain sentences, or press
        play and have the whole edition read to you. The live wire pulls real AI headlines every
        minute; the edition below is written for this project.
      </PageIntro>

      <div className="mx-auto min-w-0 max-w-7xl overflow-x-hidden px-5">
        <LiveNews />
        {/* Briefing console */}
        <div
          data-reveal
          className="ai-news-briefing flex flex-col gap-5 rounded-3xl border border-border bg-foreground p-6 text-background md:flex-row md:items-center"
        >
          <button
            onClick={() => (speech.speakingId !== null ? speech.stop() : briefing())}
            disabled={!speech.supported}
            aria-label={speech.speakingId !== null ? "Stop briefing" : "Play briefing"}
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-accent text-2xl text-primary-foreground transition hover:scale-105 disabled:opacity-40"
          >
            {speech.speakingId !== null ? "■" : "▶"}
          </button>
          <div className="flex-1">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] opacity-60">
              {speech.speakingId !== null && <Eq />}
              {speech.speakingId !== null ? "Now reading" : "Spoken briefing"}
            </p>
            <p className="mt-1 font-display text-3xl leading-tight">
              {nowPlaying
                ? nowPlaying.title
                : speech.speakingId !== null
                  ? "AEVIA daily briefing"
                  : `Listen to ${list.length} ${list.length === 1 ? "story" : "stories"} in about ${Math.max(1, Math.round(list.length * 0.3))} min`}
            </p>
            {!speech.supported && (
              <p className="mt-1 text-sm opacity-70">Your browser doesn't support read-aloud.</p>
            )}
          </div>
          <label className="flex items-center gap-3 text-sm opacity-80">
            Speed
            <select
              value={speech.rate}
              onChange={(e) => speech.setRate(Number(e.target.value))}
              className="rounded-full border border-background/30 bg-transparent px-3 py-1.5"
            >
              {[0.8, 1, 1.2, 1.5].map((r) => (
                <option key={r} value={r} className="text-foreground">
                  {r}×
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${cat === c ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:border-primary"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search stories…"
            className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm outline-none focus:border-primary sm:w-64"
          />
        </div>

        {!lead && (
          <p className="py-20 text-center text-muted-foreground">No stories match that search.</p>
        )}

        {lead && (
          <article
            data-reveal
            className="ai-news-lead mt-8 grid gap-8 rounded-3xl border border-border bg-card p-8 md:grid-cols-[1.4fr_1fr]"
          >
            <div>
              <p className="eyebrow">
                <span className="text-primary">Lead story</span> · {lead.cat} · {lead.date} ·{" "}
                {readMins(lead)} min read
              </p>
              <h2 className="mt-4 font-display text-5xl leading-[1.02]">{lead.title}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{lead.dek}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  onClick={() => setOpen(lead)}
                  className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:bg-primary"
                >
                  Read story
                </button>
                <button
                  onClick={() => listen(lead)}
                  className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary"
                >
                  {speech.speakingId === lead.id ? (
                    <span className="flex items-center gap-2">
                      <Eq /> Listening
                    </span>
                  ) : (
                    "▶ Listen"
                  )}
                </button>
              </div>
            </div>
            <SummaryBox
              story={lead}
              summary={summaries[lead.id]}
              error={summaryErrors[lead.id]}
              loading={loading === lead.id}
              onGet={() => getSummary(lead)}
            />
          </article>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((s) => (
            <article
              data-reveal
              key={s.id}
              className={`flex flex-col rounded-3xl border bg-card p-6 transition hover:shadow-soft ${speech.speakingId === s.id ? "border-primary" : "border-border"}`}
            >
              <p className="eyebrow flex items-center gap-2">
                {speech.speakingId === s.id && <Eq />}
                {s.cat} · {s.date}
              </p>
              <h3 className="mt-3 font-display text-2xl leading-tight">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.dek}</p>
              {summaries[s.id] && (
                <p className="mt-4 border-l-2 border-violet pl-3 text-sm">{summaries[s.id]}</p>
              )}
              <div className="mt-5 flex items-center gap-2 text-sm">
                <button
                  onClick={() => getSummary(s)}
                  disabled={loading === s.id}
                  className="font-semibold text-primary disabled:opacity-50"
                >
                  {loading === s.id
                    ? "Summarising…"
                    : summaries[s.id]
                      ? "Summarised ✓"
                      : summaryErrors[s.id]
                        ? "Try summary again"
                        : "Summarise"}
                </button>
                <span className="text-border">|</span>
                <button onClick={() => listen(s)} className="font-semibold hover:text-primary">
                  ▶ Listen
                </button>
                <span className="text-border">|</span>
                <button onClick={() => setOpen(s)} className="font-semibold hover:text-primary">
                  Read
                </button>
                <span className="ml-auto text-xs text-muted-foreground">{readMins(s)} min</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-3xl border-2 border-primary/40 bg-card p-8 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="eyebrow">
                {open.cat} · {open.date} · {readMins(open)} min read
              </p>
              <button
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="text-xl text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
            <h2 className="mt-3 font-display text-4xl leading-tight">{open.title}</h2>
            <p className="mt-3 text-lg text-muted-foreground">{open.dek}</p>
            <div className="mt-6">
              <SummaryBox
                story={open}
                summary={summaries[open.id]}
                error={summaryErrors[open.id]}
                loading={loading === open.id}
                onGet={() => getSummary(open)}
              />
            </div>
            <p className="mt-6 leading-relaxed">{open.body}</p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => speech.play([{ id: open.id, text: `${open.title}. ${open.body}` }])}
                className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:bg-primary"
              >
                ▶ Read full story aloud
              </button>
              {speech.speakingId !== null && (
                <button
                  onClick={speech.stop}
                  className="rounded-full border border-border px-5 py-2.5 text-sm"
                >
                  Stop
                </button>
              )}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Placeholder article written for this project.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryBox({
  summary,
  error,
  loading,
  onGet,
}: {
  story: Story;
  summary?: string | undefined;
  error?: string | undefined;
  loading: boolean;
  onGet: () => unknown;
}) {
  return (
    <div className="rounded-2xl border border-violet/40 bg-background p-5">
      <p className="eyebrow text-violet">AI summary · 3 sentences</p>
      {summary ? (
        <p className="mt-3 leading-relaxed">{summary}</p>
      ) : (
        <>
          <p className={`mt-3 text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}>
            {error || "Condense this story into three plain-language sentences."}
          </p>
          <button
            onClick={onGet}
            disabled={loading}
            className="mt-4 rounded-full bg-violet px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Summarising…" : error ? "Try again" : "Generate summary"}
          </button>
        </>
      )}
    </div>
  );
}
