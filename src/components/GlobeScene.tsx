"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { EARTH_RADIUS, getSunDirection } from "@/lib/geo";
import { useViz } from "@/store/useViz";
import { useUI } from "@/store/useUI";
import { Earth } from "./Earth";
import { NeuralLayer } from "./NeuralLayer";
import { EmergentLayer } from "./EmergentLayer";
import { GridWaveLayer } from "./GridWaveLayer";

/**
 * OrbitControls + 시네마틱 제어. spin(자동회전 속도)·camDist(돌리 목표 거리)는 매 프레임
 * 바뀌므로 구독하지 않고 useFrame에서 getState()로 읽어 ref/카메라에 직접 반영(리렌더 0).
 *   · spin   : 클라이맥스에서 회전 가속
 *   · camDist: >0이면 카메라를 그 거리로 천천히 끌어당김(연출 push-in/pull-back), 0이면 사용자 자유
 */
function Controls() {
  const ref = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  useFrame(() => {
    const c = ref.current;
    if (!c) return;
    c.autoRotateSpeed = useUI.getState().spin;
    const cd = useUI.getState().camDist;
    if (cd > 0) {
      const cam = c.object;
      const off = cam.position.clone().sub(c.target);
      const cur = off.length() || 1;
      const next = cur + (cd - cur) * 0.02; // 천천히 다가감
      cam.position.copy(c.target).add(off.multiplyScalar(next / cur));
    }
  });
  return (
    <OrbitControls
      ref={ref}
      enablePan={false}
      enableDamping
      autoRotate
      autoRotateSpeed={useUI.getState().spin}
      minDistance={EARTH_RADIUS * 1.6}
      maxDistance={14}
    />
  );
}

/** 영화적 후처리 — 네온 망의 블룸 + 비네팅 + 미세 필름 그레인 + 아주 옅은 색수차. '필름'처럼. */
function PostFX() {
  return (
    <EffectComposer multisampling={2}>
      <Bloom
        intensity={0.95}
        luminanceThreshold={0.22}
        luminanceSmoothing={0.9}
        mipmapBlur
        radius={0.7}
      />
      <ChromaticAberration offset={[0.0006, 0.0006]} radialModulation={false} modulationOffset={0} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.045} />
      <Vignette eskil={false} offset={0.28} darkness={0.72} />
    </EffectComposer>
  );
}

/**
 * 왼쪽 3/4 3D 씬.
 * 지금은 지구 + 별 + 드래그/오토회전 컨트롤.
 * M4에서 NeuralLayer, M5에서 SignalLayer가 이 안에 추가된다.
 */
export default function GlobeScene() {
  // 실시간 낮밤: 태양 직하점 방향에 directional light
  const sun = useMemo(() => getSunDirection(), []);
  const engine = useViz((s) => s.config.engine ?? "grid");
  const gridWave = useViz((s) => s.config.gridWave ?? false);

  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#050810"]} />

      <ambientLight intensity={0.18} />
      <directionalLight
        position={[sun.x * 10, sun.y * 10, sun.z * 10]}
        intensity={2.0}
        color="#fff7e6"
      />

      <Stars radius={140} depth={60} count={3500} factor={4} fade speed={0.4} />

      <Suspense fallback={null}>
        <Earth />
      </Suspense>

      {/* 신경 가소성 망 — 지구를 꺼도 남는다 (엔진은 버전 설정) */}
      {engine === "emergent" ? <EmergentLayer /> : <NeuralLayer />}
      {/* 그리드 파동(시장) — 독립 레이어, 보라색 */}
      {gridWave && <GridWaveLayer />}

      <Controls />
      <PostFX />
    </Canvas>
  );
}
