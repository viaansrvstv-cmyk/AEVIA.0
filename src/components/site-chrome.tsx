import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowUp,
  Bot,
  Camera,
  Command,
  Download,
  Info,
  Moon,
  Palette,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Type,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { AirCursorControl } from "@/components/air-cursor-control";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VoiceCommandButton } from "@/components/voice-command-button";
import type { VoiceAction } from "@/lib/voice-commands";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/ar-labs", label: "AR Labs" },
  { to: "/crime-report", label: "Crime Report" },
  { to: "/ai-news", label: "AI News" },
  { to: "/ai-intelligence", label: "AI Intelligence" },
  { to: "/world-explorer", label: "World Explorer" },
  { to: "/room-reader", label: "Room Reader" },
] as const;

type Appearance = {
  theme: "light" | "dark" | "auto";
  font: "editorial" | "sans" | "serif";
  reduceMotion: boolean;
  textSize: "small" | "normal" | "large";
  voiceLanguage: "en-IN" | "en-US";
  voiceFeedback: boolean;
  cursorFeel: "steady" | "balanced" | "quick";
  accent: "rose" | "violet" | "sky" | "mint" | "amber" | "indigo";
  blur: "soft" | "medium" | "strong";
  animation: "full" | "calm" | "off";
  voiceEnabled: boolean;
  speechSpeed: "slow" | "normal" | "fast";
  aiTone: "friendly" | "short" | "detailed" | "funny";
  answerLength: "short" | "medium" | "long";
  orbSkin: "aurora" | "pearl" | "ember" | "ocean";
  orbSize: "compact" | "standard" | "large";
  orbSpeed: "slow" | "balanced" | "fast";
  orbGlow: boolean;
  orbParticles: boolean;
};
const APPEARANCE_KEY = "aevia-appearance";
const DEFAULT_APPEARANCE: Appearance = {
  theme: "auto",
  font: "editorial",
  reduceMotion: false,
  textSize: "normal",
  voiceLanguage: "en-IN",
  voiceFeedback: false,
  cursorFeel: "balanced",
  accent: "rose",
  blur: "medium",
  animation: "full",
  voiceEnabled: true,
  speechSpeed: "normal",
  aiTone: "friendly",
  answerLength: "medium",
  orbSkin: "aurora",
  orbSize: "standard",
  orbSpeed: "balanced",
  orbGlow: true,
  orbParticles: true,
};

function applyAppearance(preferences: Appearance) {
  const root = document.documentElement;
  const dark =
    preferences.theme === "dark" ||
    (preferences.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.classList.toggle(
    "reduce-motion",
    preferences.reduceMotion || preferences.animation === "off",
  );
  root.dataset["font"] = preferences.font;
  root.dataset["textSize"] = preferences.textSize;
  root.dataset["cursorFeel"] = preferences.cursorFeel;
  root.dataset["accent"] = preferences.accent;
  root.dataset["blur"] = preferences.blur;
  root.dataset["animation"] = preferences.animation;
  root.dataset["orbSkin"] = preferences.orbSkin;
  root.dataset["orbSize"] = preferences.orbSize;
  root.dataset["orbSpeed"] = preferences.orbSpeed;
  root.dataset["orbGlow"] = preferences.orbGlow ? "on" : "off";
  root.dataset["orbParticles"] = preferences.orbParticles ? "on" : "off";
  root.style.colorScheme = dark ? "dark" : "light";
}

function readAppearance(): Appearance {
  try {
    const saved = JSON.parse(
      localStorage.getItem(APPEARANCE_KEY) ?? "null",
    ) as Partial<Appearance> | null;
    return {
      theme: saved?.theme === "dark" || saved?.theme === "auto" ? saved.theme : "light",
      font: saved?.font === "sans" || saved?.font === "serif" ? saved.font : "editorial",
      reduceMotion: saved?.reduceMotion === true,
      textSize:
        saved?.textSize === "small" || saved?.textSize === "large" ? saved.textSize : "normal",
      voiceLanguage: saved?.voiceLanguage === "en-US" ? "en-US" : "en-IN",
      voiceFeedback: saved?.voiceFeedback === true,
      cursorFeel:
        saved?.cursorFeel === "steady" || saved?.cursorFeel === "quick"
          ? saved.cursorFeel
          : "balanced",
      accent: ["rose", "violet", "sky", "mint", "amber", "indigo"].includes(saved?.accent as string)
        ? saved!.accent!
        : "rose",
      blur: saved?.blur === "soft" || saved?.blur === "strong" ? saved.blur : "medium",
      animation:
        saved?.animation === "calm" || saved?.animation === "off" ? saved.animation : "full",
      voiceEnabled: saved?.voiceEnabled !== false,
      speechSpeed:
        saved?.speechSpeed === "slow" || saved?.speechSpeed === "fast"
          ? saved.speechSpeed
          : "normal",
      aiTone: ["friendly", "short", "detailed", "funny"].includes(saved?.aiTone as string)
        ? saved!.aiTone!
        : "friendly",
      answerLength:
        saved?.answerLength === "short" || saved?.answerLength === "long"
          ? saved.answerLength
          : "medium",
      orbSkin: ["aurora", "pearl", "ember", "ocean"].includes(saved?.orbSkin as string)
        ? saved!.orbSkin!
        : "aurora",
      orbSize:
        saved?.orbSize === "compact" || saved?.orbSize === "large" ? saved.orbSize : "standard",
      orbSpeed:
        saved?.orbSpeed === "slow" || saved?.orbSpeed === "fast" ? saved.orbSpeed : "balanced",
      orbGlow: saved?.orbGlow !== false,
      orbParticles: saved?.orbParticles !== false,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function useAppearance() {
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE);
  useEffect(() => {
    const saved = readAppearance();
    setAppearance(saved);
    applyAppearance(saved);
  }, []);

  const update = useCallback((patch: Partial<Appearance>) => {
    setAppearance((current) => {
      const next = { ...current, ...patch };
      applyAppearance(next);
      try {
        localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
      } catch {
        // Preferences still apply for this visit if browser storage is unavailable.
      }
      window.dispatchEvent(new CustomEvent("aevia:settings-changed", { detail: next }));
      toast("Settings saved", { id: "aevia-settings-saved" });
      return next;
    });
  }, []);
  const setTheme = useCallback((theme: Appearance["theme"]) => update({ theme }), [update]);
  return { appearance, update, setTheme };
}

export function SiteHeader() {
  const { appearance, update, setTheme } = useAppearance();
  const navigate = useNavigate();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleVoiceCommand = useCallback(
    (action: VoiceAction) => {
      switch (action.kind) {
        case "navigate":
          void navigate({ to: action.to });
          return `Opening ${action.label}`;
        case "theme":
          setTheme(action.value);
          return `${action.value === "dark" ? "Dark" : "Light"} mode on`;
        case "settings":
          setSettingsOpen(action.open);
          return action.open ? "Opening Settings" : "Closing Settings";
        case "about":
          setAboutOpen(true);
          return "Opening About AEVIA";
        case "font":
          update({ font: action.value });
          return `Typeface set to ${action.value}`;
        case "text-size":
          update({ textSize: action.value });
          return `Text size set to ${action.value}`;
        case "reduce-motion":
          update({ reduceMotion: action.value });
          return action.value ? "Reduced motion on" : "Animations restored";
        case "air-cursor":
          window.dispatchEvent(
            new CustomEvent("aevia:air-cursor", { detail: { enabled: action.enabled } }),
          );
          return action.enabled ? "Starting Air Cursor" : "Air Cursor off";
        case "scroll":
          window.scrollTo({
            top:
              action.direction === "top"
                ? 0
                : action.direction === "bottom"
                  ? document.documentElement.scrollHeight
                  : window.scrollY + (action.direction === "down" ? 520 : -520),
            behavior: "smooth",
          });
          return `Scrolling ${action.direction}`;
        case "help":
          return "Try “open World Explorer”, “open Settings”, “dark mode”, or “scroll down”.";
      }
    },
    [navigate, setTheme, update],
  );

  return (
    <header
      className={`site-header sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md${scrolled ? " is-scrolled" : ""}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:px-5 md:gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="AEVIA home">
          <img src="/logo-mark.png" alt="AEVIA logo" className="size-8 shrink-0 object-contain" />
          <span className="font-display text-2xl tracking-tight">AEVIA</span>
        </Link>
        <nav className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 md:justify-center">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="nav-link relative whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{
                className: "nav-link nav-active !text-foreground bg-card shadow-soft",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <VoiceCommandButton
            language={appearance.voiceLanguage}
            voiceFeedback={appearance.voiceFeedback}
            onCommand={handleVoiceCommand}
          />
          <AirCursorControl />
          <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                aria-label="About AEVIA"
                title="About AEVIA"
              >
                <Info className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="about-dialog rounded-3xl border-primary/20 bg-card sm:max-w-xl">
              <div className="about-dialog-brand">
                <img src="/logo-mark.png" alt="AEVIA logo" className="size-10 object-contain" />
                <span className="eyebrow">AEVIA · FIELD GUIDE</span>
              </div>
              <DialogHeader>
                <DialogTitle className="font-display text-4xl">
                  A small lab for seeing what’s possible.
                </DialogTitle>
                <DialogDescription className="text-base leading-relaxed">
                  AEVIA brings spatial interaction, public-data exploration and machine intelligence
                  into one student-built research playground.
                </DialogDescription>
              </DialogHeader>
              <div className="about-notes">
                <div>
                  <span className="eyebrow">01 · MAKE</span>
                  <p>Try gesture, drawing and face-tracking experiments in AR Labs.</p>
                </div>
                <div>
                  <span className="eyebrow">02 · NOTICE</span>
                  <p>Follow AI-read stories and ask questions in a focused assistant.</p>
                </div>
                <div>
                  <span className="eyebrow">03 · EXPLORE</span>
                  <p>Spin a detailed Earth and discover country-level conditions.</p>
                </div>
              </div>
              <p className="about-note-foot">
                Camera access is opt-in. Crime figures are clearly labelled sample data.
              </p>
            </DialogContent>
          </Dialog>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 rounded-full px-2 sm:px-3"
                aria-label="Open settings"
                title="Settings"
              >
                <Settings2 className="size-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="settings-drawer max-h-[82svh] overflow-y-auto rounded-3xl border-border bg-card sm:max-w-xl">
              <DialogHeader>
                <DialogTitle className="font-display text-3xl">Settings</DialogTitle>
                <DialogDescription>
                  Shape the atmosphere, intelligence and privacy of AEVIA. Changes save instantly.
                </DialogDescription>
              </DialogHeader>

              <div className="settings-drawer-intro rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Sparkles className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">Your AEVIA, tuned to you.</p>
                    <p className="text-xs text-muted-foreground">
                      No account needed. Preferences stay on this device.
                    </p>
                  </div>
                </div>
              </div>

              <section className="settings-section" aria-labelledby="settings-appearance">
                <h3 id="settings-appearance" className="settings-section-title">
                  <Palette className="size-4" /> Appearance
                </h3>
                <div className="settings-choice-grid">
                  {(["light", "dark", "auto"] as const).map((theme) => (
                    <Button
                      key={theme}
                      type="button"
                      variant={appearance.theme === theme ? "default" : "outline"}
                      aria-pressed={appearance.theme === theme}
                      onClick={() => setTheme(theme)}
                      className="rounded-xl capitalize"
                    >
                      {theme === "light" ? (
                        <Sun className="size-4" />
                      ) : theme === "dark" ? (
                        <Moon className="size-4" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}{" "}
                      {theme}
                    </Button>
                  ))}
                </div>
                <div className="settings-swatches" aria-label="Accent color">
                  {(["rose", "violet", "sky", "mint", "amber", "indigo"] as const).map((accent) => (
                    <button
                      key={accent}
                      type="button"
                      aria-label={`${accent} accent`}
                      aria-pressed={appearance.accent === accent}
                      onClick={() => update({ accent })}
                      className={`settings-swatch settings-swatch-${accent}${appearance.accent === accent ? " is-selected" : ""}`}
                    />
                  ))}
                </div>
                <div className="settings-inline-grid">
                  <label>
                    <span className="eyebrow">Font size</span>
                    <select
                      value={appearance.textSize}
                      onChange={(e) =>
                        update({ textSize: e.target.value as Appearance["textSize"] })
                      }
                    >
                      <option value="small">Small</option>
                      <option value="normal">Standard</option>
                      <option value="large">Large</option>
                    </select>
                  </label>
                  <label>
                    <span className="eyebrow">Glass blur</span>
                    <select
                      value={appearance.blur}
                      onChange={(e) => update({ blur: e.target.value as Appearance["blur"] })}
                    >
                      <option value="soft">Soft</option>
                      <option value="medium">Medium</option>
                      <option value="strong">Strong</option>
                    </select>
                  </label>
                  <label>
                    <span className="eyebrow">Animation</span>
                    <select
                      value={appearance.animation}
                      onChange={(e) =>
                        update({ animation: e.target.value as Appearance["animation"] })
                      }
                    >
                      <option value="full">Full</option>
                      <option value="calm">Calm</option>
                      <option value="off">Off</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="settings-section" aria-labelledby="settings-orb">
                <h3 id="settings-orb" className="settings-section-title">
                  <Sparkles className="size-4" /> Orb studio
                </h3>
                <div className={`settings-orb-preview settings-orb-preview-${appearance.orbSkin}`}>
                  <span />
                </div>
                <div className="settings-inline-grid">
                  <label>
                    <span className="eyebrow">Skin</span>
                    <select
                      value={appearance.orbSkin}
                      onChange={(e) => update({ orbSkin: e.target.value as Appearance["orbSkin"] })}
                    >
                      <option value="aurora">Aurora</option>
                      <option value="pearl">Pearl</option>
                      <option value="ember">Ember</option>
                      <option value="ocean">Ocean</option>
                    </select>
                  </label>
                  <label>
                    <span className="eyebrow">Size</span>
                    <select
                      value={appearance.orbSize}
                      onChange={(e) => update({ orbSize: e.target.value as Appearance["orbSize"] })}
                    >
                      <option value="compact">Compact</option>
                      <option value="standard">Standard</option>
                      <option value="large">Large</option>
                    </select>
                  </label>
                  <label>
                    <span className="eyebrow">Rotation</span>
                    <select
                      value={appearance.orbSpeed}
                      onChange={(e) =>
                        update({ orbSpeed: e.target.value as Appearance["orbSpeed"] })
                      }
                    >
                      <option value="slow">Slow</option>
                      <option value="balanced">Balanced</option>
                      <option value="fast">Fast</option>
                    </select>
                  </label>
                </div>
                <div className="settings-switch-row">
                  <span>Glow and particles</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={appearance.orbGlow}
                    onClick={() =>
                      update({
                        orbGlow: !appearance.orbGlow,
                        orbParticles: !appearance.orbParticles,
                      })
                    }
                    className={`settings-switch ${appearance.orbGlow ? "is-on" : ""}`}
                  >
                    <span />
                  </button>
                </div>
              </section>

              <section className="settings-section" aria-labelledby="settings-voice-ai">
                <h3 id="settings-voice-ai" className="settings-section-title">
                  <Bot className="size-4" /> Voice & AI
                </h3>
                <div className="settings-inline-grid">
                  <label>
                    <span className="eyebrow">Voice</span>
                    <select
                      value={appearance.voiceEnabled ? "on" : "off"}
                      onChange={(e) => update({ voiceEnabled: e.target.value === "on" })}
                    >
                      <option value="on">On</option>
                      <option value="off">Off</option>
                    </select>
                  </label>
                  <label>
                    <span className="eyebrow">Speech speed</span>
                    <select
                      value={appearance.speechSpeed}
                      onChange={(e) =>
                        update({ speechSpeed: e.target.value as Appearance["speechSpeed"] })
                      }
                    >
                      <option value="slow">Slow</option>
                      <option value="normal">Normal</option>
                      <option value="fast">Fast</option>
                    </select>
                  </label>
                  <label>
                    <span className="eyebrow">AI tone</span>
                    <select
                      value={appearance.aiTone}
                      onChange={(e) => update({ aiTone: e.target.value as Appearance["aiTone"] })}
                    >
                      <option value="friendly">Friendly</option>
                      <option value="short">Short</option>
                      <option value="detailed">Detailed</option>
                      <option value="funny">Funny</option>
                    </select>
                  </label>
                  <label>
                    <span className="eyebrow">Answer length</span>
                    <select
                      value={appearance.answerLength}
                      onChange={(e) =>
                        update({ answerLength: e.target.value as Appearance["answerLength"] })
                      }
                    >
                      <option value="short">Short</option>
                      <option value="medium">Medium</option>
                      <option value="long">Long</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="settings-section" aria-labelledby="settings-privacy">
                <h3 id="settings-privacy" className="settings-section-title">
                  <ShieldCheck className="size-4" /> Camera & privacy
                </h3>
                <p className="text-sm text-muted-foreground">
                  Camera is used only by AR Labs, World Explorer hand control, Air Cursor and Room
                  Reader when you opt in. Microphone is used only by voice commands and Room Reader
                  sound sensing.
                </p>
                <p className="mt-2 rounded-xl bg-background p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mr-1 inline size-3 text-primary" /> Everything is
                  processed on your device. Nothing is recorded or uploaded.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full rounded-xl"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("aevia:stop-all-media"));
                    toast("All camera and microphone tracks stopped");
                  }}
                >
                  <Camera className="size-4" /> Stop all camera/mic now
                </Button>
              </section>

              <section className="settings-section" aria-labelledby="settings-data">
                <h3 id="settings-data" className="settings-section-title">
                  <SlidersHorizontal className="size-4" /> Data
                </h3>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      localStorage.removeItem("aevia-chat-history");
                      toast("Chat history cleared");
                    }}
                  >
                    Clear chats
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(appearance, null, 2)], {
                        type: "application/json",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "aevia-settings.json";
                      a.click();
                      URL.revokeObjectURL(url);
                      toast("Settings exported");
                    }}
                  >
                    <Download className="size-4" /> Export
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => update(DEFAULT_APPEARANCE)}
                  >
                    <RotateCcw className="size-4" /> Reset
                  </Button>
                </div>
              </section>

              <section className="space-y-3" aria-labelledby="appearance-heading">
                <div>
                  <h3 id="appearance-heading" className="eyebrow">
                    Color theme
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={appearance.theme === "light" ? "default" : "outline"}
                      aria-pressed={appearance.theme === "light"}
                      onClick={() => setTheme("light")}
                      className="justify-center gap-2 rounded-xl"
                    >
                      <Sun className="size-4" /> Light
                    </Button>
                    <Button
                      type="button"
                      variant={appearance.theme === "dark" ? "default" : "outline"}
                      aria-pressed={appearance.theme === "dark"}
                      onClick={() => setTheme("dark")}
                      className="justify-center gap-2 rounded-xl"
                    >
                      <Moon className="size-4" /> Dark
                    </Button>
                  </div>
                </div>

                <label htmlFor="aevia-font" className="block">
                  <span className="eyebrow">Website typeface</span>
                  <span className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                    <Type className="size-4 shrink-0 text-muted-foreground" />
                    <select
                      id="aevia-font"
                      value={appearance.font}
                      onChange={(event) =>
                        update({ font: event.target.value as Appearance["font"] })
                      }
                      className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                    >
                      <option value="editorial">AEVIA editorial</option>
                      <option value="sans">Modern sans</option>
                      <option value="serif">Classic serif</option>
                    </select>
                  </span>
                </label>

                <label htmlFor="aevia-text-size" className="block">
                  <span className="eyebrow">Interface text size</span>
                  <select
                    id="aevia-text-size"
                    value={appearance.textSize}
                    onChange={(event) =>
                      update({ textSize: event.target.value as Appearance["textSize"] })
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="small">Compact</option>
                    <option value="normal">Standard</option>
                    <option value="large">Larger</option>
                  </select>
                </label>

                <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
                  <div>
                    <h3 className="eyebrow">Voice commands</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tap the mic, wait for “Listening”, then say a page or setting. Try “show me
                      World Explorer” or “make the site dark”.
                    </p>
                  </div>
                  <label htmlFor="aevia-voice-language" className="block">
                    <span className="text-sm font-medium">Recognition language</span>
                    <select
                      id="aevia-voice-language"
                      value={appearance.voiceLanguage}
                      onChange={(event) =>
                        update({ voiceLanguage: event.target.value as Appearance["voiceLanguage"] })
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="en-IN">English (India)</option>
                      <option value="en-US">English (US)</option>
                    </select>
                  </label>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Volume2 className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Speak confirmations</p>
                        <p className="text-xs text-muted-foreground">
                          Read each completed command aloud.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-label="Speak voice command confirmations"
                      aria-checked={appearance.voiceFeedback}
                      onClick={() => update({ voiceFeedback: !appearance.voiceFeedback })}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${appearance.voiceFeedback ? "border-primary bg-primary" : "border-border bg-muted"}`}
                    >
                      <span
                        className={`size-4 rounded-full bg-white shadow transition-transform ${appearance.voiceFeedback ? "translate-x-5" : "translate-x-1"}`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Voice input needs a supported browser and microphone permission. Chrome or Edge
                    on HTTPS is recommended.
                  </p>
                </div>

                <label htmlFor="aevia-cursor-feel" className="block">
                  <span className="eyebrow">Air cursor response</span>
                  <select
                    id="aevia-cursor-feel"
                    value={appearance.cursorFeel}
                    onChange={(event) =>
                      update({ cursorFeel: event.target.value as Appearance["cursorFeel"] })
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="steady">Steady · smoother movement</option>
                    <option value="balanced">Balanced</option>
                    <option value="quick">Quick · follows your hand closely</option>
                  </select>
                </label>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/60 p-3.5">
                  <div>
                    <p className="text-sm font-medium">Reduce motion</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Limit decorative movement and interface transitions.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label="Reduce motion"
                    aria-checked={appearance.reduceMotion}
                    onClick={() => update({ reduceMotion: !appearance.reduceMotion })}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${appearance.reduceMotion ? "border-primary bg-primary" : "border-border bg-muted"}`}
                  >
                    <span
                      className={`size-4 rounded-full bg-white shadow transition-transform ${appearance.reduceMotion ? "translate-x-5" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              </section>

              <p className="text-xs text-muted-foreground">
                Preferences are saved on this device. Air Cursor camera access starts only when you
                enable it; voice input starts only when you tap the mic.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                onClick={() => update(DEFAULT_APPEARANCE)}
              >
                Restore default settings
              </Button>
            </DialogContent>
          </Dialog>
          <Link
            to="/exit"
            className="hidden rounded-full border border-border px-4 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary lg:block"
          >
            Exit
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  if (path === "/exit") return null;
  return (
    <footer className="mt-24 border-t border-border bg-card/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-3">
            <img src="/logo-mark.png" alt="AEVIA logo" className="size-9 object-contain" />
            <p className="font-display text-3xl">AEVIA</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            © 2026 AEVIA. Created by Viaan. Built for educational purposes as a school software
            project.
          </p>
        </div>
        <div>
          <p className="eyebrow">Modules</p>
          <ul className="mt-3 space-y-2 text-sm">
            {NAV.slice(1).map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-primary">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow">Project</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>viaan project</li>
            <li>Academic use</li>
            <li>
              <Link to="/exit" className="text-foreground hover:text-primary">
                Exit session
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Data</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Crime figures shown are clearly labelled sample data. Live figures are sourced from NCRB
            publications.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function PageIntro({
  module,
  title,
  children,
}: {
  module: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 pt-14 pb-8">
      <p className="eyebrow">
        <span className="text-primary">●</span> {module}
      </p>
      <h1 className="mt-4 font-display text-6xl leading-[0.95] tracking-tight md:text-7xl">
        {title}
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{children}</p>
    </div>
  );
}

const CONTEXT_TIPS: Record<string, string> = {
  "/": "Try the orb — drag it, click it, or open a module.",
  "/ar-labs": "Try pinching! Camera access stays off until you start it.",
  "/crime-report": "Use the filters to make every chart and row update.",
  "/ai-news": "Press Listen to turn the edition into a spoken briefing.",
  "/ai-intelligence": "Start with a suggestion chip, then ask a follow-up.",
  "/world-explorer": "Drag the globe to explore a country.",
  "/room-reader": "Try Demo mode if you would rather not use the camera or mic.",
};

export function GlobalWelcome() {
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const path = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    try {
      if (!localStorage.getItem("aevia-global-welcome")) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    const key = `aevia-tip-${path}`;
    if (!CONTEXT_TIPS[path]) return;
    try {
      if (localStorage.getItem(key)) return;
      const timer = window.setTimeout(() => toast(CONTEXT_TIPS[path], { id: key }), 900);
      localStorage.setItem(key, "1");
      return () => window.clearTimeout(timer);
    } catch {
      // Tips are optional when storage is unavailable.
    }
    return undefined;
  }, [path]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem("aevia-global-welcome", "1");
    } catch {
      // Private browsing is still supported.
    }
  }

  const slides = [
    [
      "01 · WHAT AEVIA IS",
      "A small lab for seeing what’s possible.",
      "Explore spatial interaction, public data, ambient signals and machine intelligence in one student-built playground.",
    ],
    [
      "02 · SIX MODULES",
      "One playground. Six ways in.",
      "Move from AR Labs to Crime Report, AI News, AI Intelligence, World Explorer and Room Reader.",
    ],
    [
      "03 · HOW TO USE IT",
      "Tap first. Then explore.",
      "Camera and voice are always opt-in. Try gestures, voice commands and local-first experiments at your own pace.",
    ],
  ];
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="global-welcome-dialog rounded-3xl border-primary/20 bg-card sm:max-w-xl">
          <p className="eyebrow">AEVIA · FIELD GUIDE</p>
          <DialogTitle className="font-display text-5xl">{slides[slide]![1]}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            {slides[slide]![2]}
          </DialogDescription>
          <div className="global-welcome-slide">
            <span>{slides[slide]![0]}</span>
            <div className="global-welcome-orbit" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5" aria-label={`Welcome step ${slide + 1} of 3`}>
              {slides.map((_, index) => (
                <button
                  key={index}
                  aria-label={`Go to welcome step ${index + 1}`}
                  onClick={() => setSlide(index)}
                  className={`size-2 rounded-full ${slide === index ? "bg-primary" : "bg-border"}`}
                />
              ))}
            </div>
            {slide < 2 ? (
              <Button onClick={() => setSlide((value) => value + 1)} className="rounded-full">
                Next
              </Button>
            ) : (
              <Button onClick={close} className="rounded-full">
                Start exploring
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <CommandPalette />
      <BackToTop />
    </>
  );
}

function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const options = NAV.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="command-palette rounded-3xl border-primary/20 bg-card p-0 sm:max-w-lg">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to a module…"
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="p-2">
          {options.map((item) => (
            <button
              key={item.to}
              onClick={() => {
                setOpen(false);
                void navigate({ to: item.to });
              }}
              className="command-option w-full rounded-2xl px-4 py-3 text-left"
            >
              <span className="eyebrow">{item.to === "/" ? "Start" : "Module"}</span>
              <strong>{item.label}</strong>
              <span>↗</span>
            </button>
          ))}
          {!options.length && <p className="p-5 text-sm text-muted-foreground">No module found.</p>}
        </div>
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <Command className="mr-1 inline size-3" />K to open · arrows to browse · enter to go
        </p>
      </DialogContent>
    </Dialog>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return visible ? (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="back-to-top"
    >
      <ArrowUp className="size-4" />
    </button>
  ) : null;
}
