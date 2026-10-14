import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Hand } from "lucide-react";
import type { HandLandmarker as HandLandmarkerInstance } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

function pinchClick(x: number, y: number) {
  const target = document.elementFromPoint(x, y);
  if (!(target instanceof HTMLElement)) return;
  const control = target.closest<HTMLElement>(
    'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [role="button"]',
  );
  if (control) {
    control.click();
    return;
  }
  if (typeof PointerEvent !== "undefined") {
    target.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 1,
        clientX: x,
        clientY: y,
      }),
    );
    target.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 0,
        clientX: x,
        clientY: y,
      }),
    );
    target.dispatchEvent(
      new MouseEvent("click", { bubbles: true, clientX: x, clientY: y, button: 0 }),
    );
  }
}

export function AirCursorControl() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [enabled, setEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const arLabs = pathname === "/ar-labs";

  useEffect(() => {
    const handleVoiceToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === "boolean") setEnabled(detail.enabled);
    };
    window.addEventListener("aevia:air-cursor", handleVoiceToggle);
    return () => window.removeEventListener("aevia:air-cursor", handleVoiceToggle);
  }, []);

  useEffect(() => {
    if (arLabs && enabled) {
      setEnabled(false);
      toast("Air cursor paused in AR Labs — use the module camera controls");
    }
  }, [arLabs, enabled]);

  useEffect(() => {
    if (!enabled || arLabs) return;
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let landmarker: HandLandmarkerInstance | null = null;
    const video = videoRef.current;
    const cursor = cursorRef.current;

    const hideCursor = () => {
      if (!cursor) return;
      cursor.style.opacity = "0";
      cursor.classList.remove("is-pinched");
    };

    const run = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !video) {
          throw new Error("Camera access is unavailable in this browser");
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 480 },
            height: { ideal: 360 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: "user",
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;

        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        if (cancelled) return;
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        if (cancelled) return;
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.55,
        });
        if (cancelled) {
          landmarker.close();
          landmarker = null;
          return;
        }
        toast("Air cursor ready — pinch to click");

        let lastVideoTime = -1;
        let lastInference = 0;
        let lastClick = 0;
        let wasPinching = false;
        let smoothX = window.innerWidth / 2;
        let smoothY = window.innerHeight / 2;
        const update = (now: number) => {
          if (cancelled || !video || !landmarker) return;
          if (
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            video.currentTime !== lastVideoTime &&
            now - lastInference >= 42
          ) {
            lastInference = now;
            lastVideoTime = video.currentTime;
            try {
              const hand = landmarker.detectForVideo(video, now).landmarks[0];
              const indexTip = hand?.[8];
              const thumbTip = hand?.[4];
              const wrist = hand?.[0];
              const middleBase = hand?.[9];
              if (indexTip && thumbTip && wrist && middleBase && cursor) {
                const rawX = (1 - indexTip.x) * window.innerWidth;
                const rawY = indexTip.y * window.innerHeight;
                const feel = document.documentElement.dataset["cursorFeel"];
                const smoothing = feel === "steady" ? 0.22 : feel === "quick" ? 0.55 : 0.38;
                smoothX += (rawX - smoothX) * smoothing;
                smoothY += (rawY - smoothY) * smoothing;
                cursor.style.transform = `translate3d(${smoothX - 9}px, ${smoothY - 9}px, 0)`;
                cursor.style.opacity = "1";

                const handScale = Math.max(distance(wrist, middleBase), 0.001);
                const pinching = distance(thumbTip, indexTip) / handScale < 0.3;
                cursor.classList.toggle("is-pinched", pinching);
                if (pinching && !wasPinching && now - lastClick > 520) {
                  lastClick = now;
                  pinchClick(smoothX, smoothY);
                }
                wasPinching = pinching;
              } else {
                hideCursor();
                wasPinching = false;
              }
            } catch {
              hideCursor();
            }
          }
          raf = window.requestAnimationFrame(update);
        };
        raf = window.requestAnimationFrame(update);
      } catch (error) {
        if (cancelled) return;
        setEnabled(false);
        const denied = error instanceof DOMException && error.name === "NotAllowedError";
        toast(
          denied
            ? "Allow camera access to use the air cursor"
            : "Air cursor couldn’t start — check camera access",
        );
      }
    };

    void run();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      try {
        landmarker?.close();
      } catch {
        // The model may already have closed during a cancelled startup.
      }
      if (video) {
        video.pause();
        video.srcObject = null;
      }
      hideCursor();
    };
  }, [arLabs, enabled]);

  useEffect(() => {
    const stop = () => setEnabled(false);
    window.addEventListener("aevia:stop-all-media", stop);
    return () => window.removeEventListener("aevia:stop-all-media", stop);
  }, []);

  const toggle = () => {
    if (arLabs) return;
    const next = !enabled;
    setEnabled(next);
    if (next) toast("Starting air cursor — camera access is opt-in");
    else toast("Air cursor off");
  };

  return (
    <>
      <Button
        type="button"
        variant={enabled ? "secondary" : "ghost"}
        size="icon"
        className={`size-9 shrink-0 rounded-full ${enabled ? "text-primary" : ""}`}
        onClick={toggle}
        disabled={arLabs}
        aria-label={
          arLabs
            ? "Air cursor is off in AR Labs"
            : enabled
              ? "Turn air cursor off"
              : "Turn air cursor on"
        }
        aria-pressed={enabled}
        title={
          arLabs
            ? "Use AR Labs’ own camera controls here"
            : enabled
              ? "Turn air cursor off"
              : "Air cursor · camera starts only when enabled"
        }
      >
        <Hand className="size-4" />
      </Button>
      <video
        ref={videoRef}
        className="air-cursor-video"
        autoPlay
        playsInline
        muted
        aria-hidden="true"
      />
      <div ref={cursorRef} className="air-cursor-dot" aria-hidden="true" />
    </>
  );
}
