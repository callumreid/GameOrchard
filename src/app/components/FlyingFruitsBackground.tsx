"use client";

import React, { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import {
  EffectComposer,
  DepthOfField,
  //   ToneMapping,
} from "@react-three/postprocessing";

type FlyingFruitsBackgroundProps = {
  speed?: number;
  count?: number;
  depth?: number;
  className?: string;
  modelPath?: string;
  backgroundColor?: string;
  scale?: number;
  isVisible?: boolean;
};

function FruitInstance({
  index,
  z,
  speed,
  modelPath,
  scale = 1,
}: {
  index: number;
  z: number;
  speed: number;
  modelPath: string;
  scale?: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const { viewport, camera } = useThree();
  const { width, height } = viewport.getCurrentViewport(camera, [0, 0, -z]);
  const { scene } = useGLTF(modelPath);

  const [data] = useState(() => ({
    y: THREE.MathUtils.randFloatSpread(height * 2),
    x: THREE.MathUtils.randFloatSpread(2),
    spin: THREE.MathUtils.randFloat(8, 12),
    rX: Math.random() * Math.PI,
    rZ: Math.random() * Math.PI,
  }));

  useFrame((state, dt) => {
    const clampedDt = Math.min(dt, 0.1);
    const posX = index === 0 ? 0 : data.x * width;
    const limitMultiplier = index === 0 ? 4 : 1;
    if (groupRef.current) {
      groupRef.current.position.set(posX, (data.y -= clampedDt * speed), -z);
      groupRef.current.rotation.set(
        (data.rX += clampedDt / data.spin),
        Math.sin(index * 1000 + state.clock.elapsedTime / 10) * Math.PI,
        (data.rZ += clampedDt / data.spin)
      );
      if (data.y < -(height * limitMultiplier))
        data.y = height * limitMultiplier;
    }
  });

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={scene.clone()} />
    </group>
  );
}

function Fruits({
  speed = 1,
  count = 60,
  depth = 80,
  modelPath,
  scale,
}: Required<
  Pick<FlyingFruitsBackgroundProps, "speed" | "count" | "depth"> & {
    modelPath: string;
    scale?: number;
  }
>) {
  const distances = useMemo(() => {
    const easing = (x: number) => Math.sqrt(1 - Math.pow(x - 1, 2));
    return Array.from({ length: count }, (_, i) =>
      Math.round(easing(i / count) * depth)
    );
  }, [count, depth]);

  return (
    <>
      {distances.map((z, i) => (
        <FruitInstance
          key={i}
          index={i}
          z={z}
          speed={speed}
          modelPath={modelPath}
          scale={scale}
        />
      ))}
    </>
  );
}

export default function FlyingFruitsBackground({
  speed = 1.5,
  count = 60,
  depth = 80,
  className,
  modelPath = "/banana.glb",
  backgroundColor = "#ffbf40",
  scale = 1,
  isVisible = true,
}: FlyingFruitsBackgroundProps) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        opacity: isVisible ? 1 : 0,
      }}
    >
      <Suspense
        fallback={
          <div
            className="w-full h-full"
            style={{ backgroundColor: backgroundColor }}
          />
        }
      >
        <Canvas
          flat
          gl={{ antialias: false }}
          dpr={[1, 1.5]}
          camera={{
            position: [0, 0, 10],
            fov: 20,
            near: 0.01,
            far: depth + 15,
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <color attach="background" args={[backgroundColor]} />
          <spotLight
            position={[10, 20, 10]}
            penumbra={1}
            decay={0}
            intensity={2.5}
            color="orange"
          />
          <Fruits
            speed={speed}
            count={count}
            depth={depth}
            modelPath={modelPath}
            scale={scale}
          />
          <Environment preset="sunset" />
          <EffectComposer enableNormalPass={false} multisampling={0}>
            <DepthOfField
              target={[0, 0, -depth * 0.5]}
              focalLength={0.4}
              bokehScale={10}
              height={700}
            />
            {/* <ToneMapping /> */}
          </EffectComposer>
        </Canvas>
      </Suspense>
    </div>
  );
}

// Common fruit model preloads (optional)
useGLTF.preload("/apple.glb");
useGLTF.preload("/banana.glb");
useGLTF.preload("/lemon.glb");
useGLTF.preload("/watermelon.glb");
useGLTF.preload("/kiwi.glb");
useGLTF.preload("/strawberry.glb");
