import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls, Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as Controls } from "three-stdlib";
import {
  countryAt,
  polygons,
  sunPosition,
  type Country,
  type Location,
} from "@/lib/world-explorer";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";

function position(lat: number, lon: number, radius = 2): THREE.Vector3 {
  const a = THREE.MathUtils.degToRad(lat),
    b = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    radius * Math.cos(a) * Math.cos(b),
    radius * Math.sin(a),
    -radius * Math.cos(a) * Math.sin(b),
  );
}
function boundaryGeometry(countries: Country[], radius: number) {
  const vertices: number[] = [];
  for (const country of countries)
    for (const polygon of polygons(country))
      for (const ring of polygon) {
        for (let i = 1; i < ring.length; i++) {
          const a = ring[i - 1],
            b = ring[i];
          if (!a || !b) continue;
          const start = position(a[1] ?? 0, a[0] ?? 0, 1),
            end = position(b[1] ?? 0, b[0] ?? 0, 1);
          const steps = Math.max(1, Math.ceil(start.angleTo(end) / 0.035));
          let prev = start.clone().multiplyScalar(radius);
          for (let j = 1; j <= steps; j++) {
            const next = start
              .clone()
              .lerp(end, j / steps)
              .normalize()
              .multiplyScalar(radius);
            vertices.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
            prev = next;
          }
        }
      }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  return geo;
}
type Palette = { primary: string; violet: string; atmosphere: string };
type Quake = { lat: number; lon: number; magnitude: number };
type Iss = { latitude: number; longitude: number; velocity: number };

function DayNightOverlay({ timeShiftMinutes }: { timeShiftMinutes: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  useFrame(() => {
    const sun = sunPosition(new Date(Date.now() + timeShiftMinutes * 60_000));
    material.current?.uniforms["uSun"]?.value.copy(position(sun.latitude, sun.longitude, 1));
  });
  return (
    <mesh scale={1.002} renderOrder={1}>
      <sphereGeometry args={[2, 96, 64]} />
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        uniforms={{ uSun: { value: new THREE.Vector3(1, 0, 0) } }}
        vertexShader="varying vec3 vNormal; void main(){vNormal=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
        fragmentShader="uniform vec3 uSun; varying vec3 vNormal; void main(){float night=smoothstep(-0.18,0.28,dot(normalize(vNormal),normalize(uSun))); gl_FragColor=vec4(vec3(0.018,0.024,0.08),night*0.72);}"
      />
    </mesh>
  );
}

function CityLights({ timeShiftMinutes }: { timeShiftMinutes: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const points: number[] = [];
    let seed = 17;
    for (let index = 0; index < 420; index += 1) {
      seed = (seed * 16807) % 2147483647;
      const lat = (seed / 2147483647) * 140 - 70;
      seed = (seed * 16807) % 2147483647;
      const lon = (seed / 2147483647) * 360 - 180;
      const point = position(lat, lon, 2.012);
      points.push(point.x, point.y, point.z);
    }
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return next;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const sun = sunPosition(new Date(Date.now() + timeShiftMinutes * 60_000));
    material.current?.uniforms["uSun"]?.value.copy(position(sun.latitude, sun.longitude, 1));
  });
  return (
    <points geometry={geometry} renderOrder={3}>
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        uniforms={{ uSun: { value: new THREE.Vector3(1, 0, 0) } }}
        vertexShader="uniform vec3 uSun; varying float vNight; void main(){vec3 p=normalize(position); vNight=smoothstep(0.28,-0.18,dot(p,normalize(uSun))); gl_PointSize=2.2; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
        fragmentShader="varying float vNight; void main(){float d=distance(gl_PointCoord,vec2(.5)); if(d>.5) discard; gl_FragColor=vec4(1.0,.62,.2,vNight*(1.0-d*2.0)*.78);}"
      />
    </points>
  );
}

function Starfield() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += Math.min(delta, 0.05) * 0.002;
  });
  return (
    <group ref={ref}>
      <Stars radius={65} depth={40} count={1100} factor={2} saturation={0} fade speed={0.15} />
    </group>
  );
}
function ShootingStar() {
  const ref = useRef<THREE.Mesh>(null);
  const progress = useRef(-1);
  useFrame((_, delta) => {
    progress.current += delta;
    if (progress.current > 9) progress.current = -Math.random() * 2;
    if (!ref.current) return;
    const t = Math.max(0, Math.min(1, (progress.current - 1) / 1.4));
    ref.current.position.set(-10 + t * 20, 7 - t * 8, -8);
    ref.current.scale.set(1 + t * 5, 1, 1);
    ref.current.visible = t > 0 && t < 1;
  });
  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[0.025, 6, 6]} />
      <meshBasicMaterial color="#fff4d6" />
    </mesh>
  );
}
function ISSMarker({ iss }: { iss: Iss }) {
  const trail = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) =>
        position(iss.latitude, iss.longitude - index * 2.5, 2.05),
      ),
    [iss.latitude, iss.longitude],
  );
  return (
    <group>
      <mesh position={position(iss.latitude, iss.longitude, 2.05)}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#fff0a8" />
      </mesh>
      <Line points={trail} color="#ffb86b" transparent opacity={0.48} lineWidth={1.2} />
    </group>
  );
}
function HandControl({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  useEffect(() => {
    if (!enabled || !navigator.mediaDevices?.getUserMedia) return;
    let stream: MediaStream | undefined;
    let raf = 0;
    let closed = false;
    let landmarker:
      | {
          detectForVideo: (
            video: HTMLVideoElement,
            time: number,
          ) => { landmarks?: { x: number; y: number }[][] };
          close: () => void;
        }
      | undefined;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    const run = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
        });
        if (closed) return;
        video.srcObject = stream;
        await video.play();
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
        const loop = (time: number) => {
          if (closed) return;
          raf = requestAnimationFrame(loop);
          if (!landmarker || video.readyState < 2) return;
          const hand = landmarker.detectForVideo(video, time).landmarks?.[0];
          if (!hand) return;
          const tip = hand[9];
          const thumb = hand[4];
          if (tip) {
            camera.position.x += ((tip.x - 0.5) * -2.2 - camera.position.x) * 0.08;
            camera.position.y += ((tip.y - 0.5) * -1.4 - camera.position.y) * 0.08;
          }
          if (tip && thumb) {
            const pinch = Math.hypot(tip.x - thumb.x, tip.y - thumb.y);
            const target = THREE.MathUtils.clamp(8 - pinch * 14, 3, 9);
            camera.position.z += (target - camera.position.z) * 0.06;
          }
        };
        raf = requestAnimationFrame(loop);
      } catch {
        if (!closed)
          toast("Hand control could not start", {
            description: "You can still spin the globe with touch or a pointer.",
          });
      }
    };
    void run();
    return () => {
      closed = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
      landmarker?.close();
      video.pause();
      video.srcObject = null;
    };
  }, [camera, enabled]);
  return null;
}
function Earth({
  countries,
  selected,
  palette,
  cloudsOn,
  timeShiftMinutes,
}: {
  countries: Country[];
  selected?: Country | undefined;
  palette: Palette;
  cloudsOn: boolean;
  timeShiftMinutes: number;
}) {
  const map = useTexture("/earth-daymap.jpg", (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = 4;
  });
  const normalMap = useTexture("/earth-normal.webp", (texture) => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = 4;
  });
  const border = useMemo(() => boundaryGeometry(countries, 2.006), [countries]);
  const highlight = useMemo(() => boundaryGeometry(selected ? [selected] : [], 2.018), [selected]);
  const borderMat = useRef<THREE.LineBasicMaterial>(null);
  const selectedMat = useRef<THREE.LineBasicMaterial>(null);
  const elapsed = useRef(0);
  const target = useMemo(() => new THREE.Color(palette.primary), [palette.primary]);
  useEffect(() => () => border.dispose(), [border]);
  useEffect(() => () => highlight.dispose(), [highlight]);
  useEffect(() => {
    selectedMat.current?.color.set(palette.violet);
  }, [selected, palette.violet]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    elapsed.current += dt;
    if (borderMat.current)
      borderMat.current.opacity = 0.26 + 0.08 * Math.sin(elapsed.current * 0.75);
    if (selectedMat.current) {
      selectedMat.current.opacity = THREE.MathUtils.damp(
        selectedMat.current.opacity,
        selected ? 1 : 0,
        5,
        dt,
      );
      selectedMat.current.color.lerp(target, 1 - Math.exp(-3 * dt));
    }
  });
  return (
    <>
      <mesh>
        <sphereGeometry args={[2, 96, 64]} />
        <meshPhysicalMaterial
          map={map}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.14, 0.14)}
          roughness={0.84}
          metalness={0.015}
          clearcoat={0.12}
          clearcoatRoughness={0.55}
        />
      </mesh>
      {cloudsOn && (
        <Suspense fallback={null}>
          <CloudLayer />
        </Suspense>
      )}
      <DayNightOverlay timeShiftMinutes={timeShiftMinutes} />
      <CityLights timeShiftMinutes={timeShiftMinutes} />
      <lineSegments geometry={border}>
        <lineBasicMaterial
          ref={borderMat}
          color={palette.violet}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </lineSegments>
      <lineSegments geometry={highlight}>
        <lineBasicMaterial
          ref={selectedMat}
          color={palette.primary}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>
      <mesh scale={1.035}>
        <sphereGeometry args={[2, 64, 48]} />
        <meshBasicMaterial
          color={palette.atmosphere}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
function CloudLayer() {
  const cloudMap = useTexture("/earth-clouds.jpg", (texture) => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = 4;
  });
  const cloudMesh = useRef<THREE.Mesh>(null);
  useFrame((_, raw) => {
    if (cloudMesh.current) cloudMesh.current.rotation.y += Math.min(raw, 0.05) * 0.004;
  });
  return (
    <mesh ref={cloudMesh} scale={1.01} renderOrder={2}>
      <sphereGeometry args={[2, 72, 48]} />
      <meshStandardMaterial
        color="#f8f9ff"
        alphaMap={cloudMap}
        alphaTest={0.035}
        transparent
        opacity={0.26}
        roughness={1}
        depthWrite={false}
      />
    </mesh>
  );
}

function GlobeLoadingSphere() {
  return (
    <mesh>
      <sphereGeometry args={[2, 48, 32]} />
      <meshStandardMaterial color="#17344f" roughness={0.9} />
    </mesh>
  );
}

function GlobeControls({
  countries,
  focus,
  onSelect,
  onHover,
  zoomAction,
}: {
  countries: Country[];
  focus?: Country | undefined;
  onSelect: (location: Location) => void;
  onHover?: (country?: Country) => void;
  zoomAction: { n: number; mode: string };
}) {
  const controls = useRef<Controls>(null);
  const { camera, gl } = useThree();
  const target = useRef<THREE.Vector3 | undefined>(undefined);
  const [autoRotate, setAutoRotate] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeAutoRotate = () => {
    setAutoRotate(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setAutoRotate(true), 4500);
  };
  useEffect(() => {
    if (focus) target.current = position(focus.lat, focus.lon, 5.6);
  }, [focus]);
  useEffect(() => {
    if (!zoomAction.n) return;
    if (zoomAction.mode === "reset") target.current = position(20, 60, 6.5);
    else
      target.current = camera.position
        .clone()
        .normalize()
        .multiplyScalar(
          THREE.MathUtils.clamp(
            camera.position.length() * (zoomAction.mode === "in" ? 0.8 : 1.25),
            2.5,
            10,
          ),
        );
  }, [zoomAction, camera]);
  useFrame((_, raw) => {
    if (!target.current) return;
    camera.position.lerp(target.current, 1 - Math.exp(-5 * Math.min(raw, 0.05)));
    camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(target.current) < 0.008) target.current = undefined;
  });
  useEffect(() => {
    const element = gl.domElement;
    const points = new Map<number, { x: number; y: number }>();
    let moved = false,
      multi = false;
    const raycaster = new THREE.Raycaster(),
      pointer = new THREE.Vector2(),
      hit = new THREE.Vector3();
    const sphere = new THREE.Sphere(new THREE.Vector3(), 2);
    const down = (e: PointerEvent) => {
      if (!points.size) {
        moved = false;
        multi = false;
      }
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (points.size > 1) multi = true;
      target.current = undefined;
    };
    const move = (e: PointerEvent) => {
      const p = points.get(e.pointerId);
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) moved = true;
      if (onHover) {
        const rect = element.getBoundingClientRect();
        pointer.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectSphere(sphere, hit)) {
          onHover(
            countryAt(
              countries,
              THREE.MathUtils.radToDeg(Math.asin(hit.y / 2)),
              THREE.MathUtils.radToDeg(Math.atan2(-hit.z, hit.x)),
            ),
          );
        }
      }
    };
    const up = (e: PointerEvent) => {
      const p = points.get(e.pointerId);
      points.delete(e.pointerId);
      if (!p || moved || multi || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) return;
      const rect = element.getBoundingClientRect();
      // A small screen-space tolerance helps tiny island taps without selecting across oceans.
      for (const [dx, dy] of [
        [0, 0],
        [5, 0],
        [-5, 0],
        [0, 5],
        [0, -5],
      ]) {
        pointer.set(
          ((e.clientX - rect.left + (dx ?? 0)) / rect.width) * 2 - 1,
          -((e.clientY - rect.top + (dy ?? 0)) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        if (!raycaster.ray.intersectSphere(sphere, hit)) continue;
        const lat = THREE.MathUtils.radToDeg(Math.asin(hit.y / 2));
        const lon = THREE.MathUtils.radToDeg(Math.atan2(-hit.z, hit.x));
        const country = countryAt(countries, lat, lon);
        if (country) {
          onSelect({ country, lat, lon });
          break;
        }
      }
    };
    const cancel = (e: PointerEvent) => {
      points.delete(e.pointerId);
      moved = true;
    };
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", cancel);
    return () => {
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", cancel);
    };
  }, [camera, gl, countries, onSelect, onHover]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate}
      autoRotateSpeed={0.32}
      rotateSpeed={0.48}
      zoomSpeed={0.65}
      minDistance={2.5}
      maxDistance={10}
      onStart={() => {
        target.current = undefined;
        wakeAutoRotate();
      }}
    />
  );
}

export default function WorldGlobe({
  countries,
  selected,
  focus,
  onSelect,
  cloudsOn,
  timeShiftMinutes = 0,
  earthquakes = [],
  onHover,
  iss,
  handControlOn = false,
}: {
  countries: Country[];
  selected?: Country | undefined;
  focus?: Country | undefined;
  onSelect: (location: Location) => void;
  cloudsOn: boolean;
  timeShiftMinutes?: number;
  earthquakes?: Quake[];
  onHover?: ((country?: Country) => void) | undefined;
  iss?: Iss | undefined;
  handControlOn?: boolean;
}) {
  const [visible, setVisible] = useState(true);
  const [inView, setInView] = useState(true);
  const [palette, setPalette] = useState<Palette>();
  const [action, setAction] = useState({ n: 0, mode: "reset" });
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), {
            rootMargin: "140px",
          })
        : undefined;
    if (wrapper.current) observer?.observe(wrapper.current);
    const css = getComputedStyle(wrapper.current ?? document.documentElement);
    // Three cannot parse OKLCH; let the browser convert semantic CSS tokens to sRGB.
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d");
    const color = (token: string) => {
      const value = css.getPropertyValue(token).trim();
      if (!context) return value;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      return `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
    };
    setPalette({
      primary: color("--primary"),
      violet: color("--violet"),
      atmosphere: color("--world-atmosphere"),
    });
    return () => {
      document.removeEventListener("visibilitychange", update);
      observer?.disconnect();
    };
  }, []);
  return (
    <div className="world-canvas" ref={wrapper}>
      {palette && (
        <Canvas
          camera={{ position: position(20, 60, 6.5).toArray(), fov: 44 }}
          dpr={[1, 1.25]}
          gl={{ alpha: true, antialias: true }}
          frameloop={visible && inView ? "always" : "never"}
          fallback={
            <p className="world-load">
              Your browser can’t display the globe. You can still choose a country above.
            </p>
          }
        >
          <ambientLight intensity={1.05} />
          <directionalLight position={[4, 5, 7]} intensity={1.95} />
          <pointLight position={[-5, -1, -4]} intensity={0.3} color={palette.atmosphere} />
          <Starfield />
          <ShootingStar />
          <Suspense fallback={<GlobeLoadingSphere />}>
            <Earth
              countries={countries}
              selected={selected}
              palette={palette}
              cloudsOn={cloudsOn}
              timeShiftMinutes={timeShiftMinutes}
            />
          </Suspense>
          {earthquakes.map((quake, index) => (
            <mesh
              key={`${quake.lat}-${quake.lon}-${index}`}
              position={position(quake.lat, quake.lon, 2.035)}
            >
              <sphereGeometry args={[Math.max(0.012, quake.magnitude * 0.006), 10, 8]} />
              <meshBasicMaterial color="#ff8c5a" transparent opacity={0.75} />
            </mesh>
          ))}
          {iss && <ISSMarker iss={iss} />}
          <HandControl enabled={handControlOn} />
          <GlobeControls
            countries={countries}
            focus={focus}
            onSelect={onSelect}
            {...(onHover ? { onHover } : {})}
            zoomAction={action}
          />
        </Canvas>
      )}
      <div className="world-tools">
        {[
          { mode: "in", label: "Zoom in", Icon: Plus },
          { mode: "out", label: "Zoom out", Icon: Minus },
          { mode: "reset", label: "Reset globe view", Icon: RotateCcw },
        ].map(({ mode, label, Icon }) => (
          <Button
            key={mode}
            variant="outline"
            size="icon"
            aria-label={label}
            title={label}
            onClick={() => setAction((a) => ({ n: a.n + 1, mode }))}
          >
            <Icon />
          </Button>
        ))}
      </div>
    </div>
  );
}
