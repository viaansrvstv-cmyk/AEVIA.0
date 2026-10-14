import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import type { Group } from "three";
import type { OrbDuoState, Point2D } from "@/lib/two-hand";

type Palette = { pink: string; violet: string; pale: string; ink: string };

const toWorld = (point: Point2D): [number, number] => [
  (point.x - 0.5) * 4.2,
  -(point.y - 0.5) * 4.2,
];

function WorkshopPart({
  duo,
  side,
  spread,
  children,
}: {
  duo: MutableRefObject<OrbDuoState>;
  side: "l" | "r" | "mid";
  spread: [number, number, number];
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame((_, rawDelta) => {
    const group = ref.current;
    if (!group) return;
    const state = duo.current;
    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;
    if (state.expanded) {
      const point =
        side === "mid"
          ? { x: (state.l.x + state.r.x) / 2, y: (state.l.y + state.r.y) / 2 }
          : state[side];
      const [worldX, worldY] = toWorld(point);
      targetX = worldX * 0.58 + spread[0];
      targetY = worldY * 0.58 + spread[1];
      targetZ = spread[2];
    }
    const blend = 1 - Math.exp(-(state.expanded ? 8 : 6) * Math.min(rawDelta, 0.05));
    group.position.x += (targetX - group.position.x) * blend;
    group.position.y += (targetY - group.position.y) * blend;
    group.position.z += (targetZ - group.position.z) * blend;
  });
  return <group ref={ref}>{children}</group>;
}

function WorkshopSculpture({
  duo,
  palette,
}: {
  duo: MutableRefObject<OrbDuoState>;
  palette: Palette;
}) {
  const root = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    const group = root.current;
    if (!group) return;
    group.rotation.y += Math.min(delta, 0.05) * (duo.current.expanded ? 0.18 : 0.34);
    group.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.05;
  });
  return (
    <group ref={root} rotation={[0.18, -0.35, 0]}>
      <WorkshopPart duo={duo} side="mid" spread={[0, 0, 0]}>
        <mesh>
          <sphereGeometry args={[1.02, 40, 30]} />
          <meshPhysicalMaterial
            color={palette.pink}
            roughness={0.24}
            metalness={0.2}
            clearcoat={1}
            iridescence={0.75}
          />
        </mesh>
      </WorkshopPart>
      <WorkshopPart duo={duo} side="mid" spread={[0, 0.2, 0.55]}>
        <mesh scale={1.02} rotation={[0.45, 0.15, -0.32]}>
          <sphereGeometry args={[1.02, 24, 18]} />
          <meshBasicMaterial
            color={palette.violet}
            wireframe
            transparent
            opacity={0.16}
            depthWrite={false}
          />
        </mesh>
      </WorkshopPart>
      <WorkshopPart duo={duo} side="l" spread={[-0.55, 0.45, 0]}>
        <mesh rotation={[1.13, 0.24, 0.26]}>
          <torusGeometry args={[1.42, 0.014, 8, 96]} />
          <meshStandardMaterial color={palette.violet} metalness={0.55} roughness={0.27} />
        </mesh>
      </WorkshopPart>
      <WorkshopPart duo={duo} side="r" spread={[0.55, 0.45, 0]}>
        <mesh rotation={[0.42, 0.85, -0.4]}>
          <torusGeometry args={[1.55, 0.009, 8, 96]} />
          <meshStandardMaterial color={palette.pink} metalness={0.5} roughness={0.3} />
        </mesh>
      </WorkshopPart>
      <WorkshopPart duo={duo} side="l" spread={[-0.45, -0.55, -0.3]}>
        <mesh rotation={[1.86, -0.46, 0.48]}>
          <torusGeometry args={[1.3, 0.007, 8, 96]} />
          <meshStandardMaterial color={palette.ink} transparent opacity={0.42} />
        </mesh>
      </WorkshopPart>
      <WorkshopPart duo={duo} side="r" spread={[0.35, -0.45, 0.4]}>
        <mesh position={[1.18, 0.5, 0.42]}>
          <sphereGeometry args={[0.065, 12, 10]} />
          <meshStandardMaterial
            color={palette.pale}
            emissive={palette.pale}
            emissiveIntensity={0.4}
          />
        </mesh>
      </WorkshopPart>
    </group>
  );
}

export function OrbWorkshop({ duo }: { duo: MutableRefObject<OrbDuoState> }) {
  const [palette, setPalette] = useState<Palette | null>(null);
  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    setPalette({
      pink: styles.getPropertyValue("--primary").trim(),
      violet: styles.getPropertyValue("--violet").trim(),
      pale: styles.getPropertyValue("--card").trim(),
      ink: styles.getPropertyValue("--foreground").trim(),
    });
  }, []);

  if (!palette) return null;
  return (
    <div
      className="absolute inset-0 z-[5]"
      aria-label="Orb Workshop: use two hands to expand and reassemble the orb"
    >
      <Canvas
        camera={{ position: [0, 0, 4.8], fov: 44 }}
        dpr={[1, 1.1]}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[-3, 4, 6]} intensity={2} color={palette.pale} />
        <pointLight position={[3, -2, 3]} intensity={28} color={palette.violet} distance={12} />
        <WorkshopSculpture duo={duo} palette={palette} />
        <OrbitControls enableZoom={false} enablePan={false} enableDamping dampingFactor={0.09} />
      </Canvas>
    </div>
  );
}
