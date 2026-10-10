"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function MetalRing({ color, spinRef }: { color: string; spinRef: React.RefObject<THREE.Mesh | null> }) {
  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.35;
  });
  return (
    <mesh ref={spinRef as React.RefObject<THREE.Mesh>} castShadow>
      <torusGeometry args={[1.25, 0.34, 48, 140]} />
      <meshStandardMaterial color={color} metalness={1} roughness={0.16} envMapIntensity={1.6} />
    </mesh>
  );
}

function Gem({ color, visible }: { color: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <mesh position={[0, 1.55, 0]} rotation={[0.3, 0.4, 0]}>
      <octahedronGeometry args={[0.4, 0]} />
      <meshPhysicalMaterial color={color} roughness={0.03} metalness={0.1} transmission={0.9} thickness={1.2} ior={2.3} clearcoat={1} />
    </mesh>
  );
}

function Rig({ drag }: { drag: React.RefObject<number> }) {
  const { camera } = useThree();
  useFrame(() => {
    // eslint-disable-next-line react-hooks/immutability -- imperative camera control in R3F frame loop
    camera.position.x += (drag.current * 2.2 - camera.position.x) * 0.08;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function ProductViewer360({
  metalColor,
  gemColor,
  hasGem,
  label,
}: {
  metalColor: string;
  gemColor: string;
  hasGem: boolean;
  label: string;
}) {
  const [dragging, setDragging] = useState(false);
  const lastX = useRef(0);
  const drag = useRef(0);
  const spin = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      drag.current = Math.max(-1, Math.min(1, drag.current + dx / 240));
      if (spin.current) spin.current.rotation.y += dx * 0.02;
    };
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging]);

  return (
    <div
      className="relative h-64 sm:h-80 rounded-xl overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing"
      style={{ background: "radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--c-gold) 25%, var(--c-surface)), var(--c-surface))" }}
      onPointerDown={(e) => {
        setDragging(true);
        lastX.current = e.clientX;
      }}
      role="img"
      aria-label={`${label} — drag to rotate in 3D`}
    >
      <Canvas dpr={[1, 1.8]} camera={{ position: [0, 0.6, 4.6], fov: 42 }} style={{ pointerEvents: "none" }}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 6, 5]} intensity={1.6} color="#fff6e6" />
        <pointLight position={[-4, -2, 3]} intensity={1} color="#ffd9a0" />
        <MetalRing color={metalColor} spinRef={spin as unknown as React.RefObject<THREE.Mesh | null>} />
        <Gem color={gemColor} visible={hasGem} />
        <Rig drag={drag} />
      </Canvas>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] px-3 py-1 rounded-full" style={{ background: "color-mix(in srgb, var(--c-surface) 85%, transparent)", color: "var(--c-muted)" }}>
        ◀ drag to rotate in 3D ▶
      </div>
      {dragging ? <div className="absolute inset-0 ring-2 ring-inset rounded-xl" style={{ borderColor: "var(--c-gold)" }} /> : null}
    </div>
  );
}
