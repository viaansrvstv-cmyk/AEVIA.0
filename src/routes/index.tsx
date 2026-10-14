import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InteractiveOrb } from "../components/interactive-orb";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AEVIA — Interfaces that read the room" },
      {
        name: "description",
        content:
          "Spatial interaction, public-safety data and machine intelligence in one considered research environment.",
      },
      { property: "og:title", content: "AEVIA — Interfaces that read the room" },
      {
        property: "og:description",
        content:
          "Spatial interaction, public-safety data and machine intelligence in one considered research environment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const MODULES = [
  {
    n: "01",
    tag: "Spatial",
    title: "AR Labs",
    to: "/ar-labs",
    text: "Open your camera and control the interface with your hands. Real-time hand tracking, gesture recognition and air drawing.\n",
  },
  {
    n: "02",
    tag: "Data",
    title: "India Crime Report",
    to: "/crime-report",
    text: "A dashboard of state, year and category filters over labelled sample figures, with charts and a full record table.",
  },
  {
    n: "03",
    tag: "Signal",
    title: "AI News",
    to: "/ai-news",
    text: "Long stories compressed into short summaries — and read aloud to you as a spoken daily briefing.",
  },
  {
    n: "04",
    tag: "Dialogue",
    title: "AI Intelligence",
    to: "/ai-intelligence",
    text: "Ask questions and get considered answers in a calm, distraction-free conversation surface.",
  },
  {
    n: "05",
    tag: "Spatial",
    title: "World Explorer",
    to: "/world-explorer",
    text: "A live, interactive globe — spin it, zoom into any country, and see its local time, weather and vitals in real time.",
  },
  {
    n: "06",
    tag: "Ambient",
    title: "Room Reader",
    to: "/room-reader",
    text: "Read the light, sound and people around you as a private, on-device room mood.",
  },
] as const;

function Home() {
  return (
    <>
      <section
        data-reveal
        className="mx-auto grid max-w-7xl items-center gap-12 px-5 pt-16 pb-20 md:grid-cols-[1.2fr_1fr] md:pt-24"
      >
        <div>
          <p className="eyebrow">
            <span className="text-primary">●</span> Research platform · 2026
          </p>
          <h1 className="hero-copy home-hero-title mt-6 font-display text-7xl leading-[0.9] tracking-tight md:text-8xl">
            <span className="hero-line">Interfaces that</span>
            <em className="hero-line text-gradient">read the room.</em>
          </h1>
          <p className="mt-7 max-w-xl text-lg text-muted-foreground">
            AEVIA uses live AI to understand what's in front of it — your hand, your face, your
            voice, your questions — and responds in real time. Explore AR tracking, live crime data,
            AI-read news, and an intelligent assistant, all built into one app.{"\n\n"}--Designed &
            built by Viaan
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-full border-border bg-card px-5 py-3">
                  <Compass className="size-4" />
                  Take a tour
                </Button>
              </DialogTrigger>
              <DialogContent className="tour-dialog rounded-3xl border-primary/20 bg-card sm:max-w-2xl">
                <div className="tour-brand">
                  <img src="/logo-mark.png" alt="" className="size-10 object-contain" />
                  <span className="eyebrow">AEVIA · FIELD GUIDE</span>
                  <span className="tour-brand-rule" />
                  <span className="eyebrow">SIX MODULES · ONE PLAYGROUND</span>
                </div>
                <DialogHeader>
                  <DialogTitle className="font-display text-4xl">One lab. Six ways in.</DialogTitle>
                  <DialogDescription className="max-w-xl text-base leading-relaxed">
                    A hands-on research playground for seeing, asking and exploring. Choose a door
                    below to jump straight into a module.
                  </DialogDescription>
                </DialogHeader>
                <div className="tour-grid">
                  {MODULES.map((m) => (
                    <Link key={m.to} to={m.to} className="tour-step">
                      <div className="tour-step-top">
                        <span>
                          {m.n} / {m.tag}
                        </span>
                        <span aria-hidden="true">↗</span>
                      </div>
                      <p className="font-display text-2xl text-foreground">{m.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {m.text.trim()}
                      </p>
                    </Link>
                  ))}
                </div>
                <p className="tour-footnote">
                  Camera access is opt-in. Each module labels its data and keeps its scope clear.
                </p>
              </DialogContent>
            </Dialog>
            <Link
              to="/ar-labs"
              className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:bg-primary"
            >
              Enter AR Labs
            </Link>
            <Link
              to="/crime-report"
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold transition hover:border-primary hover:text-primary"
            >
              Explore crime report
            </Link>
          </div>
        </div>
        <div className="home-orb-stage">
          <InteractiveOrb />
        </div>
      </section>

      <section
        data-reveal
        className="aevia-stat-strip mx-auto grid max-w-7xl grid-cols-3 gap-2 px-5 pb-16 sm:gap-4"
      >
        <HomeStat value={6} label="modules" />
        <HomeStat value={3} label="ways in" suffix="+" />
        <HomeStat value={100} label="local-first" suffix="%" />
      </section>

      <div className="home-marquee" aria-label="AEVIA feature highlights">
        <div>
          LOCAL-FIRST <span>✦</span> LIVE DATA <span>✦</span> SPATIAL INPUT <span>✦</span>{" "}
          CONSIDERED AI <span>✦</span> AMBIENT SIGNALS <span>✦</span>{" "}
        </div>
      </div>

      <section data-reveal className="mx-auto max-w-7xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-10">
          <h2 className="font-display text-5xl">Six modules</h2>
          <p className="max-w-md text-muted-foreground">
            Each module is a self-contained study — one interaction idea, one data idea, one
            language idea, explored properly.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {MODULES.map((m) => (
            <article
              key={m.to}
              data-reveal
              className="home-module-card group relative overflow-hidden rounded-3xl border border-border bg-card p-8 transition duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-soft"
            >
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-accent opacity-0 blur-3xl transition group-hover:opacity-30" />
              <p className="eyebrow">
                {m.n} — {m.tag}
              </p>
              <h3 className="mt-8 font-display text-4xl">{m.title}</h3>
              <p className="mt-3 max-w-md text-muted-foreground">{m.text}</p>
              <div className="mt-8 flex items-center gap-4">
                <Link to={m.to} className="text-sm font-semibold text-primary">
                  Open module →
                </Link>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-muted-foreground"
                    >
                      Quick overview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="module-overview-dialog rounded-3xl border-primary/20 bg-card">
                    <div className="module-overview-brand">
                      <img src="/logo-mark.png" alt="" className="size-9 object-contain" />
                      <span className="eyebrow">AEVIA · MODULE {m.n}</span>
                    </div>
                    <DialogHeader>
                      <p className="eyebrow">
                        Module {m.n} · {m.tag}
                      </p>
                      <DialogTitle className="font-display text-4xl">{m.title}</DialogTitle>
                      <DialogDescription className="text-base leading-relaxed">
                        {m.text.trim()}
                      </DialogDescription>
                    </DialogHeader>
                    <Link
                      to={m.to}
                      className="mt-2 inline-flex w-fit rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background"
                    >
                      Enter module →
                    </Link>
                  </DialogContent>
                </Dialog>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function HomeStat({
  value,
  label,
  suffix = "",
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 900);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return (
    <div className="aevia-stat">
      <strong>
        {display}
        {suffix}
      </strong>
      <span>{label}</span>
    </div>
  );
}
