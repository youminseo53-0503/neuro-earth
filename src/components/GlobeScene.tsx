"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EARTH_RADIUS, getSunDirection } from "@/lib/geo";
import { isPhone } from "@/lib/device";
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
  const lastUser = useRef(0); // 사용자가 직접 드래그/핀치한 마지막 시각
  useFrame(() => {
    const c = ref.current;
    if (!c) return;
    c.autoRotateSpeed = useUI.getState().spin;
    const cd = useUI.getState().camDist;
    // 사용자 조작 후 15초는 돌리 연출이 카메라를 안 뺏는다(특히 모바일 핀치줌과 싸움 방지)
    if (cd > 0 && Date.now() - lastUser.current > 15_000) {
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
      onStart={() => (lastUser.current = Date.now())}
    />
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
  // 모바일 — 렌더 품질만 낮춰 중급 폰에서도 끊김 없이(dpr·전력 정책. 동역학 무관)
  const mobile = useMemo(() => isPhone(), []);

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      dpr={mobile ? [1, 1.5] : [1, 2]}
      gl={{ powerPreference: mobile ? "low-power" : "high-performance", antialias: !mobile }}
    >
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
    </Canvas>
  );
}
