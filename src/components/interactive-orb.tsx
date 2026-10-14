import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Link } from "@tanstack/react-router";
import { memo, useEffect, useRef, useState, type MutableRefObject } from "react";
import type React from "react";
import type { Group } from "three";
import { Button } from "@/components/ui/button";
import { twoHandState, type Point2D } from "@/lib/two-hand";

type Palette = { pink: string; violet: string; pale: string; ink: string };
type HandState = { active: boolean; x: number; y: number };

function paletteForSkin(skin: string, styles: CSSStyleDeclaration): Palette {
  const base = {
    pink: styles.getPropertyValue("--primary").trim(),
    violet: styles.getPropertyValue("--violet").trim(),
    pale: styles.getPropertyValue("--card").trim(),
    ink: styles.getPropertyValue("--foreground").trim(),
  };
  if (skin === "pearl")
    return { pink: "#d9d9e6", violet: "#8e8fa8", pale: "#fffaf7", ink: "#5d5b70" };
  if (skin === "ember")
    return { pink: "#e66b4b", violet: "#a43f67", pale: "#ffd6a0", ink: "#541d3c" };
  if (skin === "ocean")
    return { pink: "#4f86c6", violet: "#31528e", pale: "#c7f4ff", ink: "#19284e" };
  return base;
}

const MENU = [
  { to: "/ar-labs", label: "AR Labs" },
  { to: "/crime-report", label: "Crime Report" },
  { to: "/ai-news", label: "AI News" },
  { to: "/ai-intelligence", label: "AI Intelligence" },
  { to: "/world-explorer", label: "World Explorer" },
  { to: "/room-reader", label: "Room Reader" },
] as const;

type Pt = Point2D;
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
function classify(l: Pt[]) {
  const size = dist(l[0]!, l[9]!) || 1;
  if (dist(l[4]!, l[8]!) / size < 0.3) return "Pinch";
  const ext = [8, 12, 16, 20].filter(
    (t) => dist(l[0]!, l[t]!) > dist(l[0]!, l[t - 2]!) * 1.1,
  ).length;
  const point =
    dist(l[0]!, l[8]!) > dist(l[0]!, l[6]!) * 1.1 &&
    [12, 16, 20].every((t) => dist(l[0]!, l[t]!) <= dist(l[0]!, l[t - 2]!) * 1.1);
  if (point) return "Point";
  if (ext === 4) return "Open hand";
  return "—";
}

type Duo = { expanded: boolean; l: Pt; r: Pt };
const toWorld = (p: Pt): [number, number] => [(p.x - 0.5) * 4.2, -(p.y - 0.5) * 4.2];

function Part({
  duo,
  side,
  spread,
  children,
}: {
  duo: MutableRefObject<Duo>;
  side: "l" | "r" | "mid";
  spread: [number, number, number];
  children: React.ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame((_, raw) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(raw, 0.05),
      d = duo.current;
    if (!d.expanded && g.position.lengthSq() < 0.00001) return;
    let tx = 0,
      ty = 0,
      tz = 0;
    if (d.expanded) {
      const p = side === "mid" ? { x: (d.l.x + d.r.x) / 2, y: (d.l.y + d.r.y) / 2 } : d[side];
      const [wx, wy] = toWorld(p);
      tx = wx * 0.6 + spread[0];
      ty = wy * 0.6 + spread[1];
      tz = spread[2];
    }
    const k = 1 - Math.exp(-(d.expanded ? 7 : 5) * dt);
    g.position.x += (tx - g.position.x) * k;
    g.position.y += (ty - g.position.y) * k;
    g.position.z += (tz - g.position.z) * k;
  });
  return <group ref={ref}>{children}</group>;
}

function Sculpture({
  palette,
  hand,
  onPick,
  spin,
  duo,
}: {
  palette: Palette;
  hand: MutableRefObject<HandState>;
  onPick: () => void;
  spin: MutableRefObject<number>;
  duo: MutableRefObject<Duo>;
}) {
  const floating = useRef<Group>(null);
  const tilt = useRef<Group>(null);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = floating.current,
      t = tilt.current;
    if (!g || !t) return;
    g.position.y = Math.sin(clock.elapsedTime * 0.65) * 0.075;
    g.rotation.z += delta * 0.045;
    const h = hand.current,
      ex = duo.current.expanded;
    const tx = h.active && !ex ? (h.y - 0.5) * 1.6 : 0;
    const ty = h.active && !ex ? -(h.x - 0.5) * 2.4 : 0;
    const k = 1 - Math.exp(-6 * delta);
    t.rotation.x += (tx - t.rotation.x) * k;
    t.rotation.y += (ty - t.rotation.y) * k;
    if (spin.current > 0.012 && !ex) {
      t.rotation.y += delta * spin.current;
      spin.current *= Math.exp(-2.4 * delta);
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta < 6) onPick();
  };

  return (
    <group ref={tilt}>
      <group ref={floating} rotation={[0.18, -0.35, 0]}>
        <Part duo={duo} side="mid" spread={[0, 0, 0]}>
          <mesh
            onClick={click}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "")}
          >
            <sphereGeometry args={[1.06, 64, 48]} />
            <meshPhysicalMaterial
              color={palette.pink}
              roughness={0.22}
              metalness={0.18}
              clearcoat={1}
              clearcoatRoughness={0.13}
              iridescence={0.8}
              iridescenceIOR={1.35}
            />
          </mesh>
        </Part>
        <Part duo={duo} side="mid" spread={[0, 0.2, 0.6]}>
          <mesh scale={1.014} rotation={[0.45, 0.15, -0.32]}>
            <sphereGeometry args={[1.06, 32, 24]} />
            <meshBasicMaterial
              color={palette.violet}
              wireframe
              transparent
              opacity={0.12}
              depthWrite={false}
            />
          </mesh>
        </Part>
        <Part duo={duo} side="l" spread={[-0.6, 0.5, 0]}>
          <mesh rotation={[1.13, 0.24, 0.26]}>
            <torusGeometry args={[1.48, 0.012, 8, 160]} />
            <meshStandardMaterial color={palette.violet} metalness={0.55} roughness={0.27} />
          </mesh>
        </Part>
        <Part duo={duo} side="r" spread={[0.6, 0.5, 0]}>
          <mesh rotation={[0.42, 0.85, -0.4]}>
            <torusGeometry args={[1.62, 0.007, 8, 160]} />
            <meshStandardMaterial color={palette.pink} metalness={0.5} roughness={0.3} />
          </mesh>
        </Part>
        <Part duo={duo} side="l" spread={[-0.5, -0.6, -0.3]}>
          <mesh rotation={[1.86, -0.46, 0.48]}>
            <torusGeometry args={[1.35, 0.005, 8, 160]} />
            <meshStandardMaterial color={palette.ink} transparent opacity={0.4} />
          </mesh>
        </Part>
        <Part duo={duo} side="r" spread={[0.4, -0.5, 0.4]}>
          <mesh position={[1.25, 0.53, 0.45]}>
            <sphereGeometry args={[0.055, 16, 12]} />
            <meshStandardMaterial
              color={palette.pale}
              emissive={palette.pale}
              emissiveIntensity={0.35}
            />
          </mesh>
        </Part>
      </group>
    </group>
  );
}

const OrbScene = memo(function OrbScene({
  palette,
  duo,
  hand,
  spin,
  onPick,
  onMiss,
  autoRotate,
  isVisible,
}: {
  palette: Palette;
  duo: MutableRefObject<Duo>;
  hand: MutableRefObject<HandState>;
  spin: MutableRefObject<number>;
  onPick: () => void;
  onMiss: () => void;
  autoRotate: boolean;
  isVisible: boolean;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.9], fov: 42 }}
      dpr={[1, 1.15]}
      frameloop={isVisible ? "always" : "never"}
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      fallback={
        <div className="orb-canvas-fallback" role="img" aria-label="AEVIA ambient orb">
          <span>AEVIA</span>
        </div>
      }
      onPointerMissed={onMiss}
    >
      <ambientLight intensity={1.15} />
      <directionalLight position={[-3, 4, 6]} intensity={2.1} color={palette.pale} />
      <pointLight position={[3, -2, 3]} intensity={35} color={palette.violet} distance={12} />
      <Sculpture palette={palette} duo={duo} hand={hand} spin={spin} onPick={onPick} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={0.7}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI - 0.15}
      />
    </Canvas>
  );
});

export function InteractiveOrb() {
  const [palette, setPalette] = useState<Palette | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(true);
  const [menu, setMenu] = useState(false);
  const [handOn, setHandOn] = useState(false);
  const [handLoading, setHandLoading] = useState(false);
  const [gesture, setGesture] = useState("—");
  const [handErr, setHandErr] = useState("");
  const [hovered, setHovered] = useState(false);
  const [ripple, setRipple] = useState(0);
  const [aiActivity, setAiActivity] = useState<"idle" | "thinking" | "speaking" | "voice">("idle");
  const hand = useRef<HandState>({ active: false, x: 0.5, y: 0.5 });
  const spin = useRef(0);
  const duo = useRef<Duo>({ expanded: false, l: { x: 0.3, y: 0.5 }, r: { x: 0.7, y: 0.5 } });
  const [hud, setHud] = useState<{ text: string; id: number } | null>(null);
  const [hudLeaving, setHudLeaving] = useState(false);
  const hudTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flash = (text: string) => {
    clearTimeout(hudTimer.current);
    setHudLeaving(false);
    setHud({ text, id: Date.now() });
    hudTimer.current = setTimeout(() => {
      setHudLeaving(true);
      hudTimer.current = setTimeout(() => {
        setHud(null);
        setHudLeaving(false);
        hudTimer.current = undefined;
      }, 220);
    }, 1580);
  };
  const video = useRef<HTMLVideoElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const session = useRef(0);
  const toggleMenu = useRef(() => setMenu((m) => !m));
  const closeMenu = useRef(() => setMenu(false));

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    setPalette(paletteForSkin(document.documentElement.dataset["orbSkin"] ?? "aurora", styles));
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      clearTimeout(hudTimer.current);
      stopRef.current();
    };
  }, []);

  useEffect(() => {
    const element = wrapper.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { rootMargin: "140px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onStopAll = () => stopRef.current();
    const onSettingsChanged = (event: Event) => {
      const skin = (event as CustomEvent<{ orbSkin?: string }>).detail?.orbSkin ?? "aurora";
      setPalette(paletteForSkin(skin, getComputedStyle(document.documentElement)));
    };
    const onActivity = (event: Event) => {
      const activity = (event as CustomEvent<"idle" | "thinking" | "speaking" | "voice">).detail;
      setAiActivity(activity ?? "idle");
      if (activity === "voice") setRipple(Date.now());
    };
    window.addEventListener("aevia:stop-all-media", onStopAll);
    window.addEventListener("aevia:settings-changed", onSettingsChanged);
    window.addEventListener("aevia:orb-activity", onActivity);
    return () => {
      window.removeEventListener("aevia:stop-all-media", onStopAll);
      window.removeEventListener("aevia:settings-changed", onSettingsChanged);
      window.removeEventListener("aevia:orb-activity", onActivity);
    };
  }, []);

  async function startHands() {
    setHandErr("");
    setHandLoading(true);
    const id = ++session.current;
    let stream: MediaStream | undefined;
    let lm: { close: () => void } | undefined;
    let raf = 0;
    const release = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      stream?.getTracks().forEach((track) => track.stop());
      stream = undefined;
      lm?.close();
      lm = undefined;
      if (video.current) {
        video.current.pause();
        video.current.srcObject = null;
      }
      duo.current.expanded = false;
      hand.current.active = false;
    };
    stopRef.current = () => {
      session.current++;
      release();
    };
    const check = () => {
      if (session.current !== id) throw new DOMException("Camera stopped", "AbortError");
    };
    try {
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
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      const fs = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );
      check();
      const handModel = await HandLandmarker.createFromOptions(fs, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });
      lm = handModel;
      check();
      let last = -1,
        lastG = "",
        cool = 0,
        lastDetect = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (v.currentTime === last) return;
        last = v.currentTime;
        const now = performance.now();
        if (now - lastDetect < 50) return;
        lastDetect = now;
        const all = handModel.detectForVideo(v, now).landmarks as Pt[][];
        const was = duo.current.expanded;
        const st = twoHandState(
          all.map((h) => ({ x: 1 - h[9]!.x, y: h[9]!.y })),
          was,
        );
        if (st.expanded) {
          duo.current = { expanded: true, l: st.l!, r: st.r! };
        } else duo.current.expanded = false;
        if (st.expanded !== was) {
          flash(st.expanded ? "SYSTEM EXPANDED" : "SYSTEM COLLAPSED");
          if (st.expanded) setMenu(false);
        }
        if (st.expanded) {
          hand.current.active = false;
          if (lastG !== "Two hands") {
            lastG = "Two hands";
            setGesture("Two hands");
          }
          return;
        }
        const l = all[0];
        if (!l) {
          hand.current.active = false;
          if (lastG !== "—") {
            lastG = "—";
            setGesture("—");
          }
          return;
        }
        const g = classify(l);
        const tip = g === "Point" ? l[8]! : l[9]!;
        hand.current = {
          active: g === "Open hand" || g === "Pinch" || g === "Point",
          x: 1 - tip.x,
          y: tip.y,
        };
        if (g === "Point") spin.current = Math.max(spin.current, 0.14);
        if (g !== lastG) {
          lastG = g;
          setGesture(g);
          if (now > cool) {
            if (g === "Pinch") {
              setMenu((m) => !m);
              cool = now + 900;
            }
            if (g === "Point") {
              setMenu(false);
              spin.current = 2.4;
              cool = now + 900;
            }
          }
        }
      };
      loop();
      setHandOn(true);
    } catch (e) {
      release();
      if (session.current === id) {
        stopRef.current = () => {};
        setHandErr(
          e instanceof Error && e.name === "NotAllowedError"
            ? "Camera permission denied."
            : "Hand tracking unavailable on this device.",
        );
      }
    } finally {
      if (session.current === id) setHandLoading(false);
    }
  }
  function stopHands() {
    stopRef.current();
    stopRef.current = () => {};
    setHandOn(false);
    setHandLoading(false);
    setGesture("—");
  }

  return (
    <div
      ref={wrapper}
      className={`interactive-orb relative mx-auto w-full max-w-[440px]${hovered ? " is-hovered" : ""}${aiActivity !== "idle" ? ` is-${aiActivity}` : ""}`}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty(
          "--orb-pointer-x",
          `${((event.clientX - rect.left) / rect.width - 0.5) * 2}`,
        );
        event.currentTarget.style.setProperty(
          "--orb-pointer-y",
          `${((event.clientY - rect.top) / rect.height - 0.5) * 2}`,
        );
        setHovered(true);
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--orb-pointer-x", "0");
        event.currentTarget.style.setProperty("--orb-pointer-y", "0");
        setHovered(false);
      }}
    >
      <div
        className="relative aspect-square w-full touch-none"
        aria-label="Interactive 3D orb. Drag to rotate, click for menu."
        title="Drag to rotate · click for menu"
      >
        {palette ? (
          <OrbScene
            palette={palette}
            duo={duo}
            hand={hand}
            spin={spin}
            onPick={() => {
              setRipple(Date.now());
              toggleMenu.current();
            }}
            onMiss={closeMenu.current}
            autoRotate={!reducedMotion && !handOn && !menu}
            isVisible={inView}
          />
        ) : (
          <div className="absolute inset-[24%] rounded-full bg-gradient-accent shadow-soft" />
        )}
        {ripple !== 0 && <span key={ripple} className="orb-click-ripple" aria-hidden="true" />}
        {aiActivity === "speaking" && <span className="orb-waveform-ring" aria-hidden="true" />}
        <span className="orb-particle orb-particle-1" aria-hidden="true" />
        <span className="orb-particle orb-particle-2" aria-hidden="true" />
        <span className="orb-particle orb-particle-3" aria-hidden="true" />
        <span className="orb-particle orb-particle-4" aria-hidden="true" />
        {hud && (
          <div
            key={hud.id}
            aria-live="polite"
            className={`hud-flash${hudLeaving ? " is-leaving" : ""} pointer-events-none absolute inset-x-0 top-[8%] z-20 text-center font-mono text-sm font-bold tracking-[0.4em] text-primary`}
          >
            <span className="rounded-full border border-primary/50 bg-card/80 px-4 py-1.5 backdrop-blur">
              {hud.text}
            </span>
          </div>
        )}
        <nav
          aria-label="Orb menu"
          aria-hidden={!menu}
          className={`orb-menu absolute left-1/2 top-1/2 z-10 grid w-48 -translate-x-1/2 -translate-y-1/2 gap-1 rounded-2xl border border-border bg-card/95 p-2 shadow-soft backdrop-blur ${menu ? "is-open" : ""}`}
        >
          {MENU.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              tabIndex={menu ? undefined : -1}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:bg-background hover:text-primary"
            >
              {m.label} →
            </Link>
          ))}
          <Button
            onClick={() => setMenu(false)}
            tabIndex={menu ? undefined : -1}
            variant="ghost"
            size="sm"
            className="justify-start"
          >
            Close
          </Button>
        </nav>
        <span className="pointer-events-none absolute left-[6%] top-[20%] rounded-full bg-card px-3 py-1 font-mono text-[10px] tracking-widest shadow-soft">
          HAND · 21 PTS
        </span>
        <span className="pointer-events-none absolute bottom-[14%] right-0 rounded-full bg-card px-3 py-1 font-mono text-[10px] tracking-widest shadow-soft">
          NCRB · 200 ROWS
        </span>
        <video
          ref={video}
          playsInline
          muted
          className={`absolute bottom-2 left-2 h-20 w-28 rounded-xl border border-border object-cover -scale-x-100 shadow-soft ${handOn ? "" : "hidden"}`}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
        <Button
          onClick={handOn ? stopHands : startHands}
          disabled={handLoading}
          variant="outline"
          size="sm"
          className="rounded-full"
        >
          {handLoading
            ? "Loading tracker…"
            : handOn
              ? "Stop hand control"
              : "Control with your hand"}
        </Button>
        {handOn && (
          <span className="rounded-full bg-card px-3 py-2 font-mono">Gesture: {gesture}</span>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {handErr ||
          (handOn
            ? "Open hand tilts · pinch for menu · point to spin · two hands apart to expand"
            : "Drag to rotate · click the orb for menu")}
      </p>
    </div>
  );
}
