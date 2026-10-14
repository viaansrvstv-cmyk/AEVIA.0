import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Camera,
  Download,
  Gauge,
  Keyboard,
  Loader2,
  Moon,
  Pause,
  Play,
  Settings2,
  Sparkles,
  Volume2,
  VolumeX,
  Waves,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { toast } from "sonner";
import { PageIntro } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { askAI } from "@/lib/ai.functions";
import {
  ACHIEVEMENTS,
  achievementFor,
  averageBrightness,
  moodFromSignals,
  moodTone,
  roomReport,
  rmsVolume,
  smoothSignals,
  type Achievement,
  type RoomMood,
  type RoomSample,
  type RoomSignals,
} from "@/lib/room-reader";

export const Route = createFileRoute("/room-reader")({
  head: () => ({
    meta: [
      { title: "Room Reader — AEVIA" },
      {
        name: "description",
        content: "AEVIA reads the room with private, on-device ambient signals.",
      },
    ],
  }),
  component: RoomReader,
});

const INITIAL_SIGNALS: RoomSignals = { light: 0, sound: 0, people: 0 };
const FALLBACK_TIP =
  "Try a two-minute reset: lower the volume, add a little light, then check in again.";
const PARTICLES = Array.from({ length: 32 }, (_, index) => index);

type TimelineItem = { label: RoomMood; at: number; score: number };
type ClassResult = { score: number; label: RoomMood; tip: string };

function Meter({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: ReactNode;
  icon: string;
}) {
  return (
    <div className="room-meter-premium">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span aria-hidden="true">{icon}</span>
          <span className="eyebrow">{label}</span>
        </span>
        <span className="room-meter-number">{detail}</span>
      </div>
      <div
        className="room-pill-track"
        role="meter"
        aria-label={`${label} level`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
      >
        <div
          className="room-pill-fill"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 420);
      setDisplay(Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(tick);
      else previous.current = value;
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display}</>;
}

function Sparkline({ values }: { values: number[] }) {
  const points =
    values.length > 1
      ? values
          .map((value, index) => `${(index / (values.length - 1)) * 100},${100 - value}`)
          .join(" ")
      : "0,100 100,100";
  const latest = values.at(-1) ?? 0;
  return (
    <div className="room-sparkline-premium" aria-label="Mood score over the last 60 seconds">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
        <polyline points={points} vectorEffect="non-scaling-stroke" />
        <circle cx="100" cy={100 - latest} r="2.2" />
      </svg>
      <div className="flex justify-between pt-3 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
        <span>60 sec ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}

function Waveform({ level }: { level: number }) {
  const bars = Array.from({ length: 36 }, (_, index) =>
    Math.max(0.12, Math.abs(Math.sin(index * 1.7 + level * 0.08)) * (level / 100) + 0.1),
  );
  return (
    <div className="room-waveform" aria-label={`Sound waveform at ${Math.round(level)} out of 100`}>
      {bars.map((height, index) => (
        <span key={index} style={{ height: `${height * 100}%` }} />
      ))}
    </div>
  );
}

function RoomReader() {
  const ask = useServerFn(askAI);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const demoTimerRef = useRef<number | null>(null);
  const rafRef = useRef(0);
  const frameRef = useRef<((now: number) => void) | null>(null);
  const visibleRef = useRef(true);
  const demoActiveRef = useRef(false);
  const demoTickRef = useRef<(() => void) | null>(null);
  const runningRef = useRef(false);
  const signalsRef = useRef(INITIAL_SIGNALS);
  const samplesRef = useRef<RoomSample[]>([]);
  const timelineRef = useRef<TimelineItem[]>([]);
  const lastLabelRef = useRef<RoomMood | null>(null);
  const previousPeopleRef = useRef(0);
  const labelStartedRef = useRef(0);
  const achievementsRef = useRef(new Set<Achievement>());
  const highNoiseStartedRef = useRef(0);
  const soundRef = useRef<{
    context: AudioContext;
    oscillator: OscillatorNode;
    gain: GainNode;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [signals, setSignals] = useState(INITIAL_SIGNALS);
  const [mood, setMood] = useState(moodFromSignals(INITIAL_SIGNALS));
  const [history, setHistory] = useState<number[]>([]);
  const [waveform, setWaveform] = useState(0);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef<{ started: number; total: number; samples: number } | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [classResult, setClassResult] = useState<ClassResult | null>(null);
  const [tipLoading, setTipLoading] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [particlesOn, setParticlesOn] = useState(true);
  const [sensitivity, setSensitivity] = useState(50);
  const [tint, setTint] = useState("aurora");
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);
  runningRef.current = running;

  const tone = moodTone(mood.label);
  const report = useMemo(
    () => roomReport(samplesRef.current),
    [reportOpen, classResult, history.length],
  );
  const pageStyle = {
    "--room-noise": `${0.08 + signals.sound / 500}`,
    "--room-particle-speed": `${Math.max(2.5, 7 - signals.sound / 20)}s`,
    "--room-light-glow": `${0.12 + signals.light / 180}`,
  } as CSSProperties;

  useEffect(() => {
    try {
      if (!localStorage.getItem("aevia-room-reader-welcome")) setWelcomeOpen(true);
    } catch {
      setWelcomeOpen(true);
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    updateMotion();
    media.addEventListener("change", updateMotion);
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      if (event.code === "Space") {
        event.preventDefault();
        if (runningRef.current) stopReading();
        else void startReading();
      }
      if (event.key.toLowerCase() === "d") startDemoMode();
      if (event.key.toLowerCase() === "r") setReportOpen(true);
    };
    const stopEverything = () => {
      stopRef.current();
      stopSound();
      if (demoTimerRef.current) window.clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
      setRunning(false);
      setRecording(false);
      setLoading(false);
      setStatus("");
    };
    const onVisibility = () => {
      if (document.hidden) stopEverything();
    };
    const page = document.querySelector(".room-reader-page");
    const observer =
      page && "IntersectionObserver" in window
        ? new IntersectionObserver(
            ([entry]) => {
              visibleRef.current = Boolean(entry?.isIntersecting);
              if (!visibleRef.current) {
                cancelAnimationFrame(rafRef.current);
                if (demoTimerRef.current) window.clearInterval(demoTimerRef.current);
                demoTimerRef.current = null;
              } else {
                if (frameRef.current && runningRef.current)
                  rafRef.current = requestAnimationFrame(frameRef.current);
                if (demoActiveRef.current && demoTickRef.current && !demoTimerRef.current)
                  demoTimerRef.current = window.setInterval(demoTickRef.current, 200);
              }
            },
            { rootMargin: "120px" },
          )
        : null;
    if (page && observer) observer.observe(page);
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("aevia:stop-all-media", stopEverything);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("aevia:stop-all-media", stopEverything);
      observer?.disconnect();
      media.removeEventListener("change", updateMotion);
      stopEverything();
    };
  }, []);

  function stopSound() {
    if (soundRef.current) {
      soundRef.current.oscillator.stop();
      void soundRef.current.context.close();
      soundRef.current = null;
    }
  }
  function toggleSound() {
    if (soundOn) {
      stopSound();
      setSoundOn(false);
      return;
    }
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    gain.gain.value = 0.025;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    soundRef.current = { context, oscillator, gain };
    setSoundOn(true);
  }
  useEffect(() => {
    if (soundRef.current)
      soundRef.current.oscillator.frequency.setTargetAtTime(
        150 + mood.score * 2.5,
        soundRef.current.context.currentTime,
        0.6,
      );
  }, [mood.score]);

  function unlockWelcome() {
    setWelcomeOpen(false);
    try {
      localStorage.setItem("aevia-room-reader-welcome", "1");
    } catch {
      /* private browsing */
    }
  }

  function maybeAchievement(label: RoomMood, now: number, people: number) {
    const seconds = labelStartedRef.current ? (now - labelStartedRef.current) / 1000 : 0;
    const unlocked = achievementFor(label, seconds, people);
    if (unlocked && !achievementsRef.current.has(unlocked)) {
      achievementsRef.current.add(unlocked);
      setAchievements(Array.from(achievementsRef.current));
      toast.success(unlocked, {
        description: "A new room reading achievement is yours.",
        icon: <Sparkles className="size-4" />,
      });
    }
  }

  function applySample(raw: RoomSignals, now: number) {
    const next = smoothSignals(signalsRef.current, raw, Math.max(0.12, sensitivity / 250));
    signalsRef.current = next;
    const nextMood = moodFromSignals(next);
    const previous = lastLabelRef.current;
    if (previous !== nextMood.label) {
      if (previous)
        toast(
          `${nextMood.label === "Loud" ? "Room got loud" : nextMood.label === "Dim" ? "Room got dark" : `Room got ${nextMood.label.toLowerCase()}`}`,
        );
      lastLabelRef.current = nextMood.label;
      labelStartedRef.current = now;
      const item = { label: nextMood.label, at: now, score: nextMood.score };
      timelineRef.current = [item, ...timelineRef.current].slice(0, 24);
      setTimeline(timelineRef.current);
    }
    const people = Math.round(next.people / 20);
    const previousPeople = Math.round(previousPeopleRef.current / 20);
    if (people !== previousPeople && previous !== null)
      toast(people > previousPeople ? "Someone joined the frame" : "Someone left the frame");
    previousPeopleRef.current = next.people;
    if (next.sound > 88 && highNoiseStartedRef.current === 0) {
      highNoiseStartedRef.current = now;
      toast("It’s very loud in here");
    } else if (next.sound < 72) highNoiseStartedRef.current = 0;
    if (focusMode && highNoiseStartedRef.current && now - highNoiseStartedRef.current > 10_000) {
      toast("Focus mode · noise has stayed high for 10 seconds");
      highNoiseStartedRef.current = now;
    }
    maybeAchievement(nextMood.label, now, next.people);
    samplesRef.current = [...samplesRef.current, { ...next, mood: nextMood.score, at: now }].slice(
      -1800,
    );
    setSignals(next);
    setMood(nextMood);
    setWaveform(next.sound);
    setHistory((current) => [...current, nextMood.score].slice(-300));
    const active = recordingRef.current;
    if (active) {
      active.total += nextMood.score;
      active.samples += 1;
      setRecordingSeconds(Math.min(10, (now - active.started) / 1000));
      if (now - active.started >= 10_000) finishClassMood(active);
    }
  }

  function finishClassMood(active: { started: number; total: number; samples: number }) {
    recordingRef.current = null;
    setRecording(false);
    const score = Math.round(active.total / Math.max(1, active.samples));
    const result = moodFromSignals({ light: score, sound: score, people: score });
    const nextResult = { score, label: result.label, tip: FALLBACK_TIP };
    setClassResult(nextResult);
    setResultOpen(true);
    setTipLoading(true);
    void ask({
      data: {
        messages: [
          {
            role: "user",
            content: `Give one short, practical classroom tip for a room with an average mood score of ${score}/100, labelled ${result.label}. Return only the tip.`,
          },
        ],
      },
    })
      .then((response) =>
        setClassResult((current) =>
          current ? { ...current, tip: response.reply.trim() || FALLBACK_TIP } : current,
        ),
      )
      .catch(() => undefined)
      .finally(() => setTipLoading(false));
  }

  async function startReading() {
    setError("");
    setStatus("Requesting camera and microphone…");
    setLoading(true);
    let stream: MediaStream | undefined;
    let faceModel:
      | {
          detectForVideo: (
            video: HTMLVideoElement,
            timestamp: number,
          ) => { faceLandmarks: unknown[][] };
          close: () => void;
        }
      | undefined;
    let audioContext: AudioContext | undefined;
    let lastSample = 0;
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const release = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      frameRef.current = null;
      stream?.getTracks().forEach((track) => track.stop());
      faceModel?.close();
      audioContext?.close().catch(() => undefined);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
    stopRef.current = release;
    demoActiveRef.current = false;
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
        throw new Error("camera-unavailable");
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: "user" },
        audio: true,
      });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setStatus("Loading the room reader model…");
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );
      try {
        faceModel = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 6,
        });
      } catch {
        faceModel = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 6,
        });
      }
      const analyser = (audioContext = new AudioContext());
      const audioAnalyser = analyser.createAnalyser();
      audioAnalyser.fftSize = 256;
      audioAnalyser.smoothingTimeConstant = 0.75;
      analyser.createMediaStreamSource(stream).connect(audioAnalyser);
      const waveformData = new Uint8Array(audioAnalyser.fftSize);
      const nextFrame = (now: number) => {
        frameRef.current = nextFrame;
        if (document.hidden || !visibleRef.current) return;
        rafRef.current = requestAnimationFrame(nextFrame);
        if (now - lastSample < 200 || video.readyState < 2) return;
        lastSample = now;
        context?.drawImage(video, 0, 0, 32, 32);
        const pixels = context?.getImageData(0, 0, 32, 32).data;
        audioAnalyser.getByteTimeDomainData(waveformData);
        applySample(
          {
            light: pixels ? averageBrightness(pixels) : 0,
            sound: rmsVolume(waveformData),
            people: Math.min(
              100,
              (faceModel?.detectForVideo(video, now).faceLandmarks.length ?? 0) * 20,
            ),
          },
          now,
        );
      };
      signalsRef.current = INITIAL_SIGNALS;
      samplesRef.current = [];
      setHistory([]);
      setRunning(true);
      setLoading(false);
      setStatus("Reading at 5 samples per second");
      nextFrame(performance.now());
    } catch (caught) {
      release();
      setLoading(false);
      setError(
        caught instanceof Error && caught.name === "NotAllowedError"
          ? "Camera or microphone permission was denied. Try again or use Demo mode."
          : caught instanceof Error && caught.name === "NotFoundError"
            ? "No camera or microphone was found. Try again or use Demo mode."
            : caught instanceof Error && caught.message === "camera-unavailable"
              ? "Camera and microphone access needs a secure browser context."
              : "The room model could not load. Check your connection and try again, or use Demo mode.",
      );
      setStatus("");
    }
  }

  function startDemoMode() {
    stopRef.current();
    if (demoTimerRef.current) window.clearInterval(demoTimerRef.current);
    setError("");
    setLoading(false);
    setStatus("Demo mode · simulated room signals");
    setRunning(true);
    signalsRef.current = INITIAL_SIGNALS;
    samplesRef.current = [];
    setHistory([]);
    const tick = () => {
      const seconds = Date.now() / 1000;
      applySample(
        {
          light: 58 + Math.sin(seconds * 0.23) * 26,
          sound: 42 + Math.sin(seconds * 0.71) * 27 + Math.sin(seconds * 0.17) * 12,
          people: 42 + Math.sin(seconds * 0.31) * 30,
        },
        performance.now(),
      );
    };
    demoActiveRef.current = true;
    demoTickRef.current = tick;
    stopRef.current = () => {
      if (demoTimerRef.current) window.clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
      demoActiveRef.current = false;
    };
    tick();
    demoTimerRef.current = window.setInterval(tick, 200);
  }
  function stopReading() {
    stopRef.current();
    stopRef.current = () => {};
    if (demoTimerRef.current) window.clearInterval(demoTimerRef.current);
    demoTimerRef.current = null;
    demoActiveRef.current = false;
    demoTickRef.current = null;
    stopSound();
    setSoundOn(false);
    recordingRef.current = null;
    setRunning(false);
    setRecording(false);
    setLoading(false);
    setStatus("");
  }
  function startClassMood() {
    if (!running || recording) return;
    setClassResult(null);
    setRecordingSeconds(0);
    recordingRef.current = { started: performance.now(), total: 0, samples: 0 };
    setRecording(true);
  }
  function saveReportImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#17172b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f1ec";
    ctx.font = "48px Georgia";
    ctx.fillText("AEVIA · Room Report", 72, 100);
    ctx.font = "28px sans-serif";
    ctx.fillStyle = "#d9d4ff";
    ctx.fillText(`Average mood · ${mood.label} · ${mood.score}/100`, 72, 170);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      `Light ${report.averageLight} · Sound ${report.averageSound} · People ${report.averagePeople.toFixed(1)}`,
      72,
      245,
    );
    ctx.fillText(
      `Peak noise ${report.peakNoise} · Calmest minute ${report.calmestMinute}`,
      72,
      300,
    );
    const link = document.createElement("a");
    link.download = "aevia-room-report.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Room report saved as an image");
  }
  async function shareResult() {
    const text = `AEVIA Room Reader: ${classResult?.label ?? mood.label}, ${classResult?.score ?? mood.score}/100.`;
    if (navigator.share) await navigator.share({ title: "AEVIA Room Reader", text });
    else {
      await navigator.clipboard?.writeText(text);
      toast("Mood card copied to clipboard");
    }
  }

  return (
    <div
      className={`room-reader-page room-tone-${tone} room-tint-${tint} ${focusMode ? "room-focus-mode" : ""}`}
      style={pageStyle}
    >
      <div
        className={`room-ambient-backdrop ${particlesOn ? "room-particles-on" : ""}`}
        aria-hidden="true"
      >
        <div className="room-blob room-blob-a" />
        <div className="room-blob room-blob-b" />
        <div className="room-blob room-blob-c" />
        {particlesOn &&
          PARTICLES.map((particle) => (
            <i
              key={particle}
              className="room-particle"
              style={{ "--particle-index": particle } as CSSProperties}
            />
          ))}
      </div>
      <PageIntro module="Module 06 · Ambient" title="Room Reader">
        AEVIA reads the room. See the ambient rhythm of a space without sending the room anywhere.
      </PageIntro>
      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-16">
        <div className="room-reader-toolbar">
          <span className="room-shortcut-chip">
            <Keyboard className="size-3" /> Space start/stop · D demo · R report
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setFocusMode((value) => !value)}
            >
              <Gauge className="size-3.5" /> {focusMode ? "Focus on" : "Focus mode"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="size-3.5" /> Settings
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={toggleSound}>
              {soundOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />} Tone
            </Button>
          </div>
        </div>
        <div className="room-reader-grid room-reader-grid-premium">
          <section className="room-reader-stage room-entrance-one" aria-label="Live room mood">
            <div className="room-stage-kicker">
              <span className="room-live-dot" />{" "}
              {running ? status || "Live ambient read" : "Reader is paused"}
            </div>
            <div className="room-orb-wrap room-orb-premium">
              <div className="room-orb-halo" aria-hidden="true" />
              <div className="room-orb-ring room-orb-ring-one" aria-hidden="true" />
              <div className="room-orb-ring room-orb-ring-two" aria-hidden="true" />
              <div
                className="room-orb-ripple room-ripple-a"
                style={{ transform: `scale(${1 + signals.sound / 280})` }}
              />
              <div
                className="room-orb-ripple room-ripple-b"
                style={{ transform: `scale(${1 + signals.sound / 360})` }}
              />
              <div className="room-orb-core">
                <span className="eyebrow">Mood score</span>
                <strong>
                  <AnimatedNumber value={mood.score} />
                </strong>
                <span key={mood.label} className="room-mood-word">
                  {mood.label}
                </span>
              </div>
            </div>
            <p className="room-sentence">
              {signals.light < 22
                ? "Dim and low-key"
                : signals.sound > 72
                  ? "Bright and energetic"
                  : signals.light > 65
                    ? "Bright and steady"
                    : "Balanced and steady"}
              : {Math.round(signals.people / 20)}{" "}
              {Math.round(signals.people / 20) === 1 ? "person" : "people"},{" "}
              {signals.sound > 65 ? "active chatter" : "steady chatter"}.
            </p>
            <div className="room-waveform-wrap">
              <div className="room-waveform-label">
                <Waves className="size-3" /> Live sound
              </div>
              <Waveform level={waveform} />
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {!running ? (
                <>
                  <Button
                    type="button"
                    onClick={() => void startReading()}
                    disabled={loading}
                    className="room-press rounded-full px-7 py-3 text-base"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> {status || "Starting"}
                      </>
                    ) : (
                      <>
                        <Play className="size-4" /> Start reading
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startDemoMode}
                    className="room-press rounded-full px-6 py-3"
                  >
                    Demo mode
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={stopReading}
                  className="room-press rounded-full px-7 py-3"
                >
                  <Pause className="size-4" /> Stop reading
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={startClassMood}
                disabled={!running || recording}
                className="room-press rounded-full px-6 py-3"
              >
                <Sparkles className="size-4" />{" "}
                {recording
                  ? `Reading class · ${Math.ceil(recordingSeconds)}s`
                  : "Mood of the class"}
              </Button>
            </div>
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Everything is processed on your device. Nothing is recorded or uploaded.
            </p>
            {error && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                <p role="alert" className="text-center text-sm text-destructive">
                  {error}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void startReading()}
                  className="rounded-full"
                >
                  Retry
                </Button>
              </div>
            )}
            <div className="room-mirror">
              <video
                ref={videoRef}
                muted
                playsInline
                aria-label="Local room reader camera preview"
              />
              {!running && (
                <span>
                  <Camera className="size-3" /> Camera stays local
                </span>
              )}
            </div>
          </section>
          <section
            className="room-reader-data room-glass-card room-entrance-two"
            aria-label="Room signals"
          >
            <div className="room-data-heading">
              <div>
                <p className="eyebrow">Three signals · 5 Hz</p>
                <h2 className="mt-2 font-display text-4xl">The room, right now</h2>
              </div>
              <span className="room-score-chip">{mood.label}</span>
            </div>
            <div className="mt-8 space-y-7">
              <Meter
                label="Light"
                value={signals.light}
                detail={<AnimatedNumber value={Math.round(signals.light)} />}
                icon="✦"
              />
              <Meter
                label="Sound"
                value={signals.sound}
                detail={<AnimatedNumber value={Math.round(signals.sound)} />}
                icon="⌁"
              />
              <Meter
                label="People"
                value={signals.people}
                detail={<AnimatedNumber value={Math.round(signals.people / 20)} />}
                icon="○"
              />
            </div>
            <div className="mt-10">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Mood pulse</p>
                <span className="text-xs text-muted-foreground">last 60 seconds</span>
              </div>
              <Sparkline values={history} />
            </div>
            <div className="room-achievement-row">
              {achievements.map((item) => (
                <span key={item} className="room-badge">
                  <Sparkles className="size-3" />
                  {item}
                </span>
              ))}
            </div>
          </section>
        </div>
        <div className="room-lower-grid">
          <section className="room-glass-card room-entrance-three">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Mood Timeline</p>
                <h2 className="mt-2 font-display text-3xl">What changed</h2>
              </div>
              <span className="room-count-label">{timeline.length} moments</span>
            </div>
            <div className="room-timeline">
              {timeline.length ? (
                timeline.map((item) => (
                  <div className="room-timeline-item" key={`${item.at}-${item.label}`}>
                    <i className={`room-timeline-dot room-dot-${moodTone(item.label)}`} />
                    <div>
                      <strong>{item.label}</strong>
                      <span>
                        {new Date(item.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {item.score}/100
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-sm text-muted-foreground">
                  Start a read to see the room’s small shifts appear here.
                </p>
              )}
            </div>
          </section>
          <section className="room-glass-card room-entrance-four">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Room Report</p>
                <h2 className="mt-2 font-display text-3xl">A little more context</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setReportOpen(true)}
              >
                Open report
              </Button>
            </div>
            <div className="room-report-mini">
              <div>
                <span>Avg light</span>
                <strong>{report.averageLight}</strong>
              </div>
              <div>
                <span>Avg sound</span>
                <strong>{report.averageSound}</strong>
              </div>
              <div>
                <span>Avg people</span>
                <strong>{report.averagePeople.toFixed(1)}</strong>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Peak noise: {report.peakNoise}/100 · Calmest minute:{" "}
              {report.calmestMinute ? `minute ${report.calmestMinute}` : "not enough data yet"}.
            </p>
          </section>
        </div>
      </main>
      <Dialog open={welcomeOpen} onOpenChange={setWelcomeOpen}>
        <DialogContent className="room-dialog rounded-3xl border-primary/20 bg-card sm:max-w-lg">
          <DialogHeader>
            <p className="eyebrow">AEVIA · ROOM READER</p>
            <DialogTitle className="font-display text-4xl">Read the room, gently.</DialogTitle>
            <DialogDescription>
              Three small steps to begin a private ambient read.
            </DialogDescription>
          </DialogHeader>
          <div className="room-steps">
            <div>
              <b>01</b>
              <span>Allow camera and mic</span>
            </div>
            <div>
              <b>02</b>
              <span>Look around your space</span>
            </div>
            <div>
              <b>03</b>
              <span>Watch AEVIA read the room</span>
            </div>
          </div>
          <Button onClick={unlockWelcome} className="rounded-full">
            Got it
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="room-dialog rounded-3xl border-primary/20 bg-card sm:max-w-lg">
          <DialogHeader>
            <p className="eyebrow">10-second read</p>
            <DialogTitle className="font-display text-4xl">Mood of the class</DialogTitle>
            <DialogDescription>
              Your room’s average, kept right here on this device.
            </DialogDescription>
          </DialogHeader>
          <div className="room-share-card">
            <span className="eyebrow">AEVIA · AMBIENT</span>
            <strong>{classResult?.label}</strong>
            <span>{classResult?.score} / 100</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tipLoading ? "Finding a gentle next step…" : classResult?.tip}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void shareResult()} className="rounded-full">
              Share mood card
            </Button>
            <Button variant="outline" onClick={() => saveReportImage()} className="rounded-full">
              <Download className="size-4" /> Save as image
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="room-dialog max-h-[88vh] overflow-y-auto rounded-3xl border-primary/20 bg-card sm:max-w-2xl">
          <DialogHeader>
            <p className="eyebrow">Room report</p>
            <DialogTitle className="font-display text-4xl">A snapshot of the space</DialogTitle>
          </DialogHeader>
          <div className="room-report-card">
            <div>
              <span>Average light</span>
              <strong>{report.averageLight}</strong>
            </div>
            <div>
              <span>Average sound</span>
              <strong>{report.averageSound}</strong>
            </div>
            <div>
              <span>Average people</span>
              <strong>{report.averagePeople.toFixed(1)}</strong>
            </div>
            <div>
              <span>Peak noise</span>
              <strong>{report.peakNoise}</strong>
            </div>
            <div>
              <span>Calmest minute</span>
              <strong>{report.calmestMinute || "—"}</strong>
            </div>
          </div>
          <Button onClick={saveReportImage} className="rounded-full">
            <Download className="size-4" /> Save as image
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="room-dialog rounded-3xl border-primary/20 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl">Room Reader settings</DialogTitle>
            <DialogDescription>
              Keep the read comfortable for your device and your space.
            </DialogDescription>
          </DialogHeader>
          <label className="room-setting">
            <span>
              Sensitivity <b>{sensitivity}%</b>
            </span>
            <input
              type="range"
              min="10"
              max="90"
              value={sensitivity}
              onChange={(event) => setSensitivity(Number(event.target.value))}
            />
          </label>
          <div className="room-setting-buttons">
            <span>Theme tint</span>
            {["aurora", "rose", "indigo"].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={tint === value}
                onClick={() => setTint(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <label className="room-toggle">
            <input
              type="checkbox"
              checked={particlesOn}
              onChange={(event) => setParticlesOn(event.target.checked)}
            />{" "}
            Particles on
          </label>
          <label className="room-toggle">
            <input
              type="checkbox"
              checked={focusMode}
              onChange={(event) => setFocusMode(event.target.checked)}
            />{" "}
            Focus mode
          </label>
          <Button variant="outline" onClick={startDemoMode} className="rounded-full">
            Start demo mode
          </Button>
        </DialogContent>
      </Dialog>
      <span className="sr-only" aria-live="polite">
        {mood.label} mood, score {mood.score}
      </span>
    </div>
  );
}
