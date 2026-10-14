import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { getLiveHeadlines, type Headline } from "@/lib/news.functions";
import { askAI } from "@/lib/ai.functions";
import { friendlyAIError } from "@/lib/ai-error";

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
};

export function LiveNews() {
  const fetchNews = useServerFn(getLiveHeadlines);
  const ask = useServerFn(askAI);
  const [items, setItems] = useState<Headline[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [updated, setUpdated] = useState(0);
  const [err, setErr] = useState("");
  const [reading, setReading] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { items: next, fetchedAt } = await fetchNews();
        if (!alive) return;
        const isNew = new Set(
          seen.current.size ? next.filter((h) => !seen.current.has(h.id)).map((h) => h.id) : [],
        );
        next.forEach((h) => seen.current.add(h.id));
        setItems(next);
        setFresh(isNew);
        setUpdated(fetchedAt);
        setErr("");
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Couldn't load headlines.");
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(id);
      window.speechSynthesis?.cancel();
    };
  }, [fetchNews]);

  function speak(id: string, text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (reading === id) {
      setReading(null);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.onend = () => setReading(null);
    setReading(id);
    window.speechSynthesis.speak(u);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim();
    if (!t || busy) return;
    const context = items
      .slice(0, 15)
      .map((h, i) => `${i + 1}. ${h.title} (${h.source})`)
      .join("\n");
    const next = [...chat, { role: "user" as const, content: t }];
    setChat(next);
    setQ("");
    setBusy(true);
    try {
      const msgs = [
        {
          role: "user" as const,
          content: `Today's live AI headlines:\n${context}\n\nUse these headlines when relevant. Say clearly when you only know the headline, not the full article.`,
        },
        { role: "assistant" as const, content: "Understood." },
        ...next.slice(-10),
      ];
      const { reply } = await ask({ data: { messages: msgs } });
      setChat([...next, { role: "assistant", content: reply }]);
    } catch (er) {
      setChat([...next, { role: "assistant", content: friendlyAIError(er) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow">
            <span className="mr-1 inline-block size-2 animate-pulse rounded-full bg-primary" /> Live
            AI wire
          </p>
          <span className="font-mono text-[11px] text-muted-foreground">
            {updated
              ? `Updated ${new Date(updated).toLocaleTimeString()} · refreshes every minute`
              : "Loading…"}
          </span>
        </div>
        {err && <p className="mt-3 text-sm text-primary">{err}</p>}
        <ul className="mt-4 max-h-[420px] divide-y divide-border overflow-y-auto pr-1">
          {items.map((h) => (
            <li key={h.id} className="flex items-start gap-3 py-3">
              <button
                onClick={() => speak(h.id, `${h.title}. From ${h.source}.`)}
                aria-label={reading === h.id ? "Stop reading" : "Read headline aloud"}
                className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border text-xs transition ${reading === h.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary hover:text-primary"}`}
              >
                {reading === h.id ? "■" : "▶"}
              </button>
              <div className="min-w-0">
                <a
                  href={h.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold leading-snug hover:text-primary"
                >
                  {h.title}
                </a>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {fresh.has(h.id) && (
                    <span className="mr-2 rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
                      NEW
                    </span>
                  )}
                  {h.source} · {ago(h.at)} · {h.points} pts
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col rounded-3xl border border-border bg-foreground p-6 text-background">
        <p className="eyebrow opacity-70">News assistant</p>
        <p className="mt-2 font-display text-3xl">Ask about today's headlines</p>
        <div className="mt-4 max-h-[300px] flex-1 space-y-3 overflow-y-auto text-sm">
          {chat.length === 0 && (
            <p className="opacity-60">
              Try "What are the big AI stories today?" or "Explain the top headline simply."
            </p>
          )}
          {chat.map((m, i) => (
            <p
              key={i}
              className={`whitespace-pre-wrap rounded-2xl px-3 py-2 ${m.role === "user" ? "ml-8 bg-background/15" : "mr-4 bg-background text-foreground"}`}
            >
              {m.content}
            </p>
          ))}
          {busy && <p className="animate-pulse opacity-70">Thinking…</p>}
        </div>
        <form
          onSubmit={send}
          className="mt-4 flex gap-2 rounded-full border border-background/30 p-1.5"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask about the news…"
            className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-background/50"
          />
          <button
            disabled={busy || !q.trim()}
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
