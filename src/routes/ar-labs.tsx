import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageIntro } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Activity, Eye, Hand, Loader2, ScanFace, Sparkles, VideoOff } from "lucide-react";
import {
  FILTERS,
  drawDoodle,
  drawFilter,
  readEmotion,
  topEmotion,
  drawEmotion,
  EMOTIONS,
  EMOJI,
  type Emotion,
  type DoodleSets,
  type FP,
} from "@/lib/face-fx";

export const Route = createFileRoute("/ar-labs")({
  head: () => ({
    meta: [
      { title: "AR Labs — hand tracking | AEVIA" },
      {
        name: "description",
        content:
          "Control the interface with your hands: real-time hand tracking, gestures, air swipes and air drawing in the browser.",
      },
      { property: "og:title", content: "AR Labs — hand tracking | AEVIA" },
      {
        property: "og:description",
        content: "Real-time hand tracking, gestures, air swipes and air drawing in the browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ARLabs,
});

const PANELS = [
  { t: "Spatial input", d: "Your hand replaces the cursor. No controller, no touchscreen." },
  {
    t: "Gesture vocabulary",
    d: "Open hand, fist, point, peace, thumbs up and pinch are recognised live.",
  },
  {
    t: "Air drawing",
    d: "Switch on Draw mode and pinch to paint in the air. Make a fist to clear.",
  },
  {
    t: "Private by design",
    d: "All tracking runs on this device. Nothing is recorded or uploaded.",
  },
  {
    t: "Face filters",
    d: "Choose a look that follows your face as you move. Show a peace sign or tap the button to switch.",
    mode: "filters",
  },
  {
    t: "Doodle mirror",
    d: "Your camera becomes a live caricature — line art of your face, sketched again every frame as you move and make expressions.",
    mode: "doodle",
  },
] as { t: string; d: string; mode?: "filters" | "doodle" }[];
const LINKS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];
const GESTURE_GUIDE = [
  { icon: "✋", title: "Open hand", action: "Swipe to change panel" },
  { icon: "🤏", title: "Pinch", action: "Draw in the air" },
  { icon: "✊", title: "Fist", action: "Clear the ink" },
  { icon: "☝️", title: "Point", action: "Free-spin the orb" },
];
type P = { x: number; y: number };
const d = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

function classify(l: P[]) {
  const w = l[0]!,
    size = d(w, l[9]!) || 1;
  const ext = [8, 12, 16, 20].map((t) => d(w, l[t]!) > d(w, l[t - 2]!) * 1.1);
  const thumb = d(l[4]!, l[17]!) > size * 0.9;
  if (d(l[4]!, l[8]!) / size < 0.3) return "Pinch";
  const n = ext.filter(Boolean).length;
  if (n === 0) return thumb && l[4]!.y < l[3]!.y ? "Thumbs up" : "Fist";
  if (n === 4) return "Open hand";
  if (ext[0] && ext[1] && n === 2) return "Peace";
  if (ext[0] && n === 1) return "Point";
  return "—";
}

function ARLabs() {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ink = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Starting camera…");
  const [err, setErr] = useState("");
  const [hands, setHands] = useState(0);
  const [gesture, setGesture] = useState("—");
  const [fps, setFps] = useState(0);
  const [panel, setPanel] = useState(0);
  const [draw, setDraw] = useState(false);
  const [emotionOn, setEmotionOn] = useState(false);
  const emotionRef = useRef(false);
  emotionRef.current = emotionOn;
  const drawRef = useRef(false);
  drawRef.current = draw;
  const stopRef = useRef<() => void>(() => {});
  const session = useRef(0);
  const faceCanvas = useRef<HTMLCanvasElement>(null);
  const [faces, setFaces] = useState(0);
  const [filter, setFilter] = useState(0);
  const panelRef = useRef(0);
  panelRef.current = panel;
  const filterRef = useRef(0);
  filterRef.current = filter;
  const [emo, setEmo] = useState<Record<Emotion, number> | null>(null);
  const mode = PANELS[panel]!.mode;

  useEffect(() => () => stopRef.current(), []);

  async function start() {
    setErr("");
    setLoadingMessage("Requesting camera access…");
    setLoading(true);
    const id = ++session.current;
    let stream: MediaStream | undefined;
    let lm: { close: () => void } | undefined;
    let fm: { close: () => void } | undefined;
    let raf = 0;
    const release = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      stream?.getTracks().forEach((track) => track.stop());
      stream = undefined;
      lm?.close();
      fm?.close();
      lm = undefined;
      fm = undefined;
      if (video.current) {
        video.current.pause();
        video.current.srcObject = null;
      }
    };
    stopRef.current = () => {
      session.current++;
      release();
    };
    const check = () => {
      if (session.current !== id) throw new DOMException("Camera stopped", "AbortError");
    };
    try {
      if (!window.isSecureContext) {
        throw new Error("insecure-context");
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("camera-unavailable");
      }
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 480 },
          height: { ideal: 360 },
          frameRate: { ideal: 30 },
          facingMode: "user",
        },
      });
      check();
      const v = video.current!;
      v.srcObject = stream;
      await v.play();
      check();
      setLoadingMessage("Loading hand-tracking models… this may take a moment.");
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      setLoadingMessage("Downloading vision runtime…");
      const fs = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );
      check();
      const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const make = async <T,>(fn: (d: "GPU" | "CPU") => Promise<T>) => {
        try {
          return await fn("GPU");
        } catch {
          return fn("CPU");
        }
      };
      setLoadingMessage("Loading hand-tracking model…");
      const handModel = await make((delegate) =>
        HandLandmarker.createFromOptions(fs, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate,
          },
          runningMode: "VIDEO",
          numHands: 2,
        }),
      );
      lm = handModel;
      check();
      setLoadingMessage("Loading face-tracking model…");
      const faceModel = await make((delegate) =>
        FaceLandmarker.createFromOptions(fs, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate,
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        }),
      );
      fm = faceModel;
      check();
      let smooth: Record<Emotion, number> | null = null,
        emoT = 0;
      const sets: DoodleSets = {
        oval: FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
        leftEye: FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
        rightEye: FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
        leftBrow: FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
        rightBrow: FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
        lips: FaceLandmarker.FACE_LANDMARKS_LIPS,
        leftIris: FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
        rightIris: FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
      };
      let lastFaces = -1,
        filterCool = 0,
        lastHands = -1,
        lastG = "",
        tick = 0;
      let last = -1,
        frames = 0,
        t0 = performance.now(),
        cool = 0,
        prev: P | null = null;
      let lastHandAt = 0,
        lastFaceAt = 0,
        lastFaceMode = "",
        hadHands = false;
      const c = canvas.current!,
        k = ink.current!,
        f = faceCanvas.current!;
      const ctx = c.getContext("2d")!,
        kx = k.getContext("2d")!,
        fx = f.getContext("2d")!;
      const hist: { x: number; t: number }[] = [];
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (v.currentTime === last) return;
        last = v.currentTime;
        tick++;
        if (c.width !== v.videoWidth) {
          c.width = k.width = f.width = v.videoWidth;
          c.height = k.height = f.height = v.videoHeight;
        }
        const now = performance.now();
        // Inference is synchronous on the UI thread: budget it separately from camera frames.
        if (now - lastHandAt < 40) return;
        lastHandAt = now;
        const res = handModel.detectForVideo(v, now);
        const faceMode = PANELS[panelRef.current]!.mode;
        if (faceMode !== lastFaceMode) {
          fx.clearRect(0, 0, f.width, f.height);
          lastFaceMode = faceMode ?? "";
        }
        if (
          (faceMode || emotionRef.current) &&
          now - lastFaceAt >= (faceMode === "doodle" ? 85 : 105)
        ) {
          lastFaceAt = now;
          fx.clearRect(0, 0, f.width, f.height);
          const fr = faceModel.detectForVideo(v, now);
          const face = fr.faceLandmarks[0] as FP[] | undefined;
          const n = face ? 1 : 0;
          if (n !== lastFaces) {
            lastFaces = n;
            setFaces(n);
          }
          if (faceMode === "doodle") drawDoodle(fx, face, sets, now);
          else if (faceMode === "filters" && face)
            drawFilter(fx, face, FILTERS[filterRef.current]!);
          if (emotionRef.current) {
            const bs = fr.faceBlendshapes?.[0]?.categories;
            if (face && bs) {
              const raw = readEmotion(bs);
              if (smooth) {
                for (const key of EMOTIONS) smooth[key] = smooth[key] * 0.75 + raw[key] * 0.25;
              } else smooth = raw;
              const top = topEmotion(smooth);
              drawEmotion(fx, face, top, smooth[top]);
              if (now > emoT) {
                emoT = now + 150;
                setEmo(smooth);
              }
            } else if (now > emoT) {
              emoT = now + 300;
              smooth = null;
              setEmo(null);
            }
          } else if (smooth) {
            smooth = null;
            setEmo(null);
          }
        } else if (!faceMode && !emotionRef.current && lastFaces !== 0) {
          lastFaces = 0;
          setFaces(0);
        }
        const all = res.landmarks as P[][];
        if (all.length !== lastHands) {
          lastHands = all.length;
          setHands(all.length);
        }
        if (all.length || hadHands) ctx.clearRect(0, 0, c.width, c.height);
        hadHands = all.length > 0;
        all.forEach((l, hi) => {
          ctx.lineWidth = 3.5;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.strokeStyle = hi ? "#8C6BB1" : "#D65A7A";
          ctx.beginPath();
          for (const [a, b] of LINKS) {
            ctx.moveTo(l[a!]!.x * c.width, l[a!]!.y * c.height);
            ctx.lineTo(l[b!]!.x * c.width, l[b!]!.y * c.height);
          }
          ctx.stroke();
          ctx.fillStyle = "#F4F1EC";
          ctx.beginPath();
          for (const p of l) {
            ctx.moveTo(p.x * c.width + 5, p.y * c.height);
            ctx.arc(p.x * c.width, p.y * c.height, 5, 0, 7);
          }
          ctx.fill();
        });
        const l = all[0];
        if (l) {
          const g = classify(l);
          if (g !== lastG) {
            lastG = g;
            setGesture(g);
            if (g !== "—")
              toast.success(`${g} learned`, {
                description: "AEVIA is ready for that gesture.",
                icon: "✦",
              });
          }
          const rawTip = { x: l[8]!.x * k.width, y: l[8]!.y * k.height };
          const tip = prev
            ? { x: prev.x * 0.58 + rawTip.x * 0.42, y: prev.y * 0.58 + rawTip.y * 0.42 }
            : rawTip;
          if (drawRef.current && g === "Pinch") {
            kx.strokeStyle = "#D65A7A";
            kx.lineWidth = 7;
            kx.lineCap = "round";
            kx.lineJoin = "round";
            if (prev) {
              kx.beginPath();
              kx.moveTo(prev.x, prev.y);
              kx.lineTo(tip.x, tip.y);
              kx.stroke();
            }
            prev = tip;
          } else prev = null;
          if (g === "Fist") kx.clearRect(0, 0, k.width, k.height);
          if (g === "Peace" && faceMode === "filters" && now > filterCool) {
            setFilter((x) => (x + 1) % FILTERS.length);
            filterCool = now + 1000;
          }
          hist.push({ x: l[0]!.x, t: now });
          if (hist.length > 12) hist.splice(0, hist.length - 12);
          if (g === "Open hand" && now > cool && hist.length > 3) {
            const dx = -(hist[hist.length - 1]!.x - hist[0]!.x); // mirrored
            if (Math.abs(dx) > 0.22) {
              setPanel((p) => (p + (dx < 0 ? 1 : -1) + PANELS.length) % PANELS.length);
              cool = now + 800;
              hist.length = 0;
            }
          }
        } else {
          if (lastG !== "—") {
            lastG = "—";
            setGesture("—");
          }
          prev = null;
        }
        frames++;
        if (now - t0 > 1000) {
          setFps(frames);
          frames = 0;
          t0 = now;
        }
      };
      loop();
      setOn(true);
    } catch (e) {
      release();
      if (session.current === id) {
        stopRef.current = () => {};
        const message = e instanceof Error ? e.message : "";
        setErr(
          message === "insecure-context"
            ? "Camera access requires HTTPS. Open this site over HTTPS and try again."
            : message === "camera-unavailable"
              ? "Camera access is not available in this browser. Try Chrome on a supported device."
              : e instanceof Error && ["NotAllowedError", "PermissionDeniedError"].includes(e.name)
                ? "Camera permission was denied. Allow camera access in Chrome’s site settings, then retry."
                : e instanceof Error && e.name === "NotFoundError"
                  ? "No camera was found. Connect or enable a camera, then retry."
                  : e instanceof Error && e.name === "NotReadableError"
                    ? "The camera is busy or unavailable. Close other apps using it, then retry."
                    : "Couldn’t load the camera or vision models. Check your connection and camera permissions, then retry.",
        );
      }
    } finally {
      if (session.current === id) {
        setLoading(false);
        setLoadingMessage("Starting camera…");
      }
    }
  }
  function stop() {
    stopRef.current();
    stopRef.current = () => {};
    setOn(false);
    setLoading(false);
    setLoadingMessage("Starting camera…");
    setHands(0);
    setFaces(0);
    setGesture("—");
    setEmo(null);
    setFps(0);
  }

  return (
    <>
      <PageIntro module="Module 01 · Spatial" title="AR Labs">
        An opt-in camera playground for gesture input, air drawing and face-tracking experiments.
        The camera stays off until you start; tracking runs in your browser.
      </PageIntro>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 lg:grid-cols-[1.6fr_1fr]">
        <div
          data-reveal
          className="ar-stage ar-stage-premium relative aspect-video overflow-hidden rounded-3xl border border-border shadow-soft"
        >
          <video
            ref={video}
            playsInline
            muted
            className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
          />
          <canvas
            ref={faceCanvas}
            className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
          />
          <canvas ref={ink} className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
          <canvas
            ref={canvas}
            className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
          />
          {!on && (
            <div className="ar-idle-state absolute inset-0 z-10 grid place-items-center p-6 text-center">
              <div className="ar-idle-copy">
                <img src="/logo-mark.png" alt="" className="ar-idle-mark" />
                <p className="eyebrow text-primary">AEVIA VISION · LOCAL SESSION</p>
                <h2 className="mt-3 font-display text-4xl text-white">Move at your own pace.</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-white/75">
                  Start when you’re ready. Your camera stays on this device and is never recorded.
                </p>
                <Button
                  onClick={start}
                  disabled={loading}
                  className="mt-5 rounded-full bg-gradient-accent px-6 py-3 text-sm font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> {loadingMessage}
                    </>
                  ) : (
                    <>
                      <Hand className="size-4" /> {err ? "Retry camera" : "Start camera"}
                    </>
                  )}
                </Button>
                {err && (
                  <p role="alert" className="mt-4 text-sm text-primary">
                    {err}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="absolute inset-x-3 top-3 z-20 flex flex-wrap items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
            <div
              className="flex max-w-full flex-wrap items-center gap-1.5 rounded-md border border-card/20 bg-foreground/85 p-1.5 text-card shadow-soft backdrop-blur-md sm:gap-2 sm:p-2"
              aria-label="Live tracking status"
            >
              <span className="flex items-center gap-1.5 rounded bg-card/10 px-2 py-1 font-mono text-[10px] sm:text-xs">
                <span
                  className={`size-1.5 rounded-full ${on ? "bg-primary" : "bg-muted-foreground"}`}
                />
                <Hand className="size-3.5" /> {hands} {hands === 1 ? "hand" : "hands"}
              </span>
              <span className="flex items-center gap-1.5 rounded bg-card/10 px-2 py-1 font-mono text-[10px] sm:text-xs">
                <Sparkles className="size-3.5 text-primary" />{" "}
                {gesture === "—" ? "No gesture" : gesture}
              </span>
              <span className="flex items-center gap-1.5 rounded bg-card/10 px-2 py-1 font-mono text-[10px] sm:text-xs">
                <ScanFace className="size-3.5 text-violet" /> {faces ? "Face tracked" : "No face"}
              </span>
              <span className="flex items-center gap-1 rounded px-1 py-1 font-mono text-[10px] text-card/70 sm:text-xs">
                <Activity className="size-3.5" /> {fps} fps
              </span>
            </div>
            {on && (
              <Button
                onClick={stop}
                variant="secondary"
                size="sm"
                className="h-9 shrink-0 rounded-md bg-card/95 text-xs"
              >
                <VideoOff className="size-3.5" /> Stop
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div
            data-reveal
            key={panel}
            className="ar-panel-card rounded-3xl border border-primary/40 bg-card p-6"
          >
            <p className="eyebrow">
              Panel {panel + 1} of {PANELS.length}
            </p>
            <h2 className="mt-3 font-display text-4xl">{PANELS[panel]!.t}</h2>
            <p className="mt-2 text-muted-foreground">{PANELS[panel]!.d}</p>
            {mode === "filters" && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {FILTERS.map((name, i) => (
                  <Button
                    key={name}
                    onClick={() => setFilter(i)}
                    variant={i === filter ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                  >
                    {name}
                  </Button>
                ))}
                <Button
                  onClick={() => setFilter((x) => (x + 1) % FILTERS.length)}
                  variant="outline"
                  size="sm"
                  className="rounded-full border-violet text-violet"
                >
                  Next filter →
                </Button>
              </div>
            )}
            {mode && !on && (
              <p className="mt-3 text-xs text-primary">Start the camera to try this mode.</p>
            )}
            <div className="mt-5 flex items-center gap-2">
              <Button
                onClick={() => setPanel((p) => (p + PANELS.length - 1) % PANELS.length)}
                variant="outline"
                size="icon"
                className="size-8 rounded-full"
                aria-label="Previous panel"
              >
                ←
              </Button>
              {PANELS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i === panel ? "bg-primary" : "bg-border"}`}
                />
              ))}
              <Button
                onClick={() => setPanel((p) => (p + 1) % PANELS.length)}
                variant="outline"
                size="icon"
                className="size-8 rounded-full"
                aria-label="Next panel"
              >
                →
              </Button>
            </div>
          </div>
          <div data-reveal className="rounded-3xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">Live controls</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setDraw(!draw)}
                  variant={draw ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  aria-pressed={draw}
                >
                  {draw ? "Draw: on" : "Draw: off"}
                </Button>
                <Button
                  onClick={() => {
                    setEmotionOn(!emotionOn);
                    setEmo(null);
                  }}
                  variant={emotionOn ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  aria-pressed={emotionOn}
                >
                  <Eye className="size-4" /> Emotion: {emotionOn ? "on" : "off"}
                </Button>
              </div>
            </div>
            {emotionOn && (
              <div className="mt-4 border-t border-border pt-4" aria-live="polite">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Expression cues</p>
                  <span className="eyebrow">Live face signals</span>
                </div>
                {!on ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Start the camera to see facial expression cues.
                  </p>
                ) : !emo ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Look toward the camera with your face in view.
                  </p>
                ) : (
                  <>
                    <p className="mt-3 font-display text-3xl">
                      {EMOJI[topEmotion(emo)]} Looks {topEmotion(emo).toLowerCase()}
                    </p>
                    <div className="mt-3 space-y-2">
                      {EMOTIONS.map((k) => (
                        <div key={k} className="flex items-center gap-3 text-xs">
                          <span className="w-20 shrink-0">
                            {EMOJI[k]} {k}
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-gradient-accent transition-all duration-150"
                              style={{ width: `${Math.round(emo[k] * 100)}%` }}
                            />
                          </div>
                          <span className="w-9 text-right font-mono text-muted-foreground">
                            {Math.round(emo[k] * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  These are visual expression signals, not a reading of how someone actually feels.
                  Percentages show signal strength, not certainty.
                </p>
              </div>
            )}
            <p className="eyebrow mt-5">Gesture map · try one</p>
            <ul className="gesture-guide-grid mt-3 grid grid-cols-2 gap-2 text-sm">
              {GESTURE_GUIDE.map((g) => (
                <li
                  key={g.title}
                  className={`gesture-guide-card ${gesture === g.title ? "is-current" : ""}`}
                >
                  <span className="text-lg" aria-hidden="true">
                    {g.icon}
                  </span>
                  <p className="font-semibold">{g.title}</p>
                  <p className="text-muted-foreground">{g.action}</p>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            Your browser asks for camera permission the first time. The stream stays on your device
            and is released when you press Stop Camera.
          </p>
        </div>
      </div>
    </>
  );
}
