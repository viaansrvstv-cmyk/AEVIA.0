import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clipboard, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageIntro } from "@/components/site-chrome";
import { askAI } from "@/lib/ai.functions";
import { friendlyAIError } from "@/lib/ai-error";

export const Route = createFileRoute("/ai-intelligence")({
  head: () => ({
    meta: [
      { title: "AI Intelligence — AEVIA" },
      {
        name: "description",
        content:
          "Ask questions and get considered answers in a calm, distraction-free AI conversation.",
      },
      { property: "og:title", content: "AI Intelligence — AEVIA" },
      {
        property: "og:description",
        content:
          "Ask questions and get considered answers in a calm, distraction-free AI conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Chat,
});

type Msg = { role: "user" | "assistant"; content: string };
const SUGGEST = [
  "Explain how hand tracking works in a browser.",
  "What does a chargesheet rate actually measure?",
  "Summarise why small language models matter.",
];

function Chat() {
  const ask = useServerFn(askAI);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const streamTimer = useRef<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  useEffect(() => {
    return () => {
      if (streamTimer.current) window.clearInterval(streamTimer.current);
    };
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, busy]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("aevia:orb-activity", { detail: busy ? "thinking" : "idle" }),
    );
    return () => {
      window.dispatchEvent(new CustomEvent("aevia:orb-activity", { detail: "idle" }));
    };
  }, [busy]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    const next = [...msgs, { role: "user" as const, content: t }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    window.dispatchEvent(new CustomEvent("aevia:orb-activity", { detail: "thinking" }));
    try {
      let preferences: { aiTone?: string; answerLength?: string } = {};
      try {
        preferences = JSON.parse(localStorage.getItem("aevia-appearance") ?? "{}");
      } catch {
        // Use server defaults when local preferences are unavailable.
      }
      const { reply } = await ask({
        data: {
          messages: next.slice(-20),
          tone: ["friendly", "short", "detailed", "funny"].includes(preferences.aiTone ?? "")
            ? (preferences.aiTone as "friendly" | "short" | "detailed" | "funny")
            : "friendly",
          answerLength: ["short", "medium", "long"].includes(preferences.answerLength ?? "")
            ? (preferences.answerLength as "short" | "medium" | "long")
            : "medium",
        },
      });
      const words = reply.split(/(\s+)/);
      let index = 0;
      setMsgs([...next, { role: "assistant", content: "" }]);
      window.dispatchEvent(new CustomEvent("aevia:orb-activity", { detail: "speaking" }));
      streamTimer.current = window.setInterval(() => {
        index += 1;
        setMsgs((current) => [
          ...current.slice(0, -1),
          { role: "assistant", content: words.slice(0, index).join("") },
        ]);
        if (index >= words.length && streamTimer.current) {
          window.clearInterval(streamTimer.current);
          streamTimer.current = null;
          setBusy(false);
          window.dispatchEvent(new CustomEvent("aevia:orb-activity", { detail: "idle" }));
        }
      }, 24);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: friendlyAIError(e) }]);
      window.dispatchEvent(new CustomEvent("aevia:orb-activity", { detail: "idle" }));
    } finally {
      if (!streamTimer.current) setBusy(false);
    }
  }

  return (
    <div className="ai-intelligence-page">
      <PageIntro module="Module 04 · Dialogue" title="AI Intelligence">
        Ask a question and get a considered answer. The conversation stays in this browser tab and
        is cleared when you leave the page.
      </PageIntro>
      <div className="mx-auto max-w-4xl px-5">
        <div className="ai-console rounded-3xl border border-border bg-card p-5 shadow-soft md:p-8">
          <div className="ai-console-header mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="eyebrow">AEVIA · LIVE THINKING</span>
              <p className="mt-1 text-sm text-muted-foreground">
                A calm interface for curious questions.
              </p>
            </div>
            <span className={`ai-status ${busy ? "is-active" : ""}`}>
              <i /> {busy ? "Thinking" : "Ready"}
            </span>
          </div>
          <div className="min-h-[320px] space-y-4">
            {msgs.length === 0 && (
              <div className="py-10 text-center">
                <p className="font-display text-4xl">What would you like to know?</p>
                <p className="mt-2 text-muted-foreground">
                  Ask about the modules in this project, or anything else you are researching.
                </p>
                <div className="mt-6 flex flex-col items-center gap-2">
                  {SUGGEST.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      data-reveal
                      className="suggestion-chip rounded-full border border-border px-4 py-2 text-sm transition hover:border-primary hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div
                  data-reveal
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${m.role === "user" ? "bg-foreground text-background" : "border border-border bg-background"}`}
                >
                  {m.content}
                  {m.role === "assistant" && m.content && (
                    <button
                      type="button"
                      aria-label="Copy reply"
                      title="Copy reply"
                      onClick={() => {
                        void navigator.clipboard?.writeText(m.content);
                        setCopied(i);
                        window.setTimeout(() => setCopied(null), 1200);
                      }}
                      className="ai-copy-reply ml-2 inline-flex align-middle"
                    >
                      {copied === i ? (
                        <Check className="size-3" />
                      ) : (
                        <Clipboard className="size-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <p className="ai-typing-dots eyebrow" aria-label="AI is typing">
                <span /> <span /> <span />
              </p>
            )}
            <div ref={end} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mt-6 flex gap-2 rounded-full border border-border bg-background p-1.5 focus-within:border-primary"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1 bg-transparent px-4 text-sm outline-none"
            />
            <button
              disabled={busy || !input.trim()}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
