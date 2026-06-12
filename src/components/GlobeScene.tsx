"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EARTH_RADIUS, CAMERA_FOV, aspectDollyFactor, getSunDirection } from "@/lib/geo";
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
// 자유 시점(연출 비활성)일 때의 기본 거리. 화면비 보정 전 '가로 기준' 값.
const AMBIENT_DIST = 6;

function Controls() {
  const ref = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const lastUser = useRef(0); // 사용자가 직접 드래그/핀치한 마지막 시각

  // 자유 시점(camDist=0)일 때 — 마운트·리사이즈·회전 시 지구가 화면에 딱 들어오게 거리 리핏.
  // 세로 화면은 수평이 binding이라 더 물러난다(양옆 짤림 방지). 가로는 보정 1.0이라 그대로.
  useEffect(() => {
    const fit = () => {
      const c = ref.current;
      if (!c || useUI.getState().camDist !== 0) return;
      const cam = c.object as THREE.PerspectiveCamera;
      cam.position.setLength(AMBIENT_DIST * aspectDollyFactor(cam.aspect));
      c.update();
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
  }, []);

  useFrame(() => {
    const c = ref.current;
    if (!c) return;
    c.autoRotateSpeed = useUI.getState().spin;
    const cam = c.object as THREE.PerspectiveCamera;
    // 연출 목표 거리에 화면비 보정 — 세로에선 더 물러나 지구 전체가 들어옴(짤림 해소). 가로는 ×1.0.
    const cd = useUI.getState().camDist * aspectDollyFactor(cam.aspect);
    // 사용자 조작 후 15초는 돌리 연출이 카메라를 안 뺏는다(특히 모바일 핀치줌과 싸움 방지)
    if (cd > 0 && Date.now() - lastUser.current > 15_000) {
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
      minDistance={EARTH_RADIUS * (isPhone() ? 1.25 : 1.6)}
      maxDistance={26}
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
  // 첫 프레임 카메라 거리도 화면비로 보정 — 세로 진입 시 지구가 짤린 채 한 프레임 번쩍이는 것 방지
  const initZ = useMemo(() => {
    const aspect =
      typeof window !== "undefined" ? window.innerWidth / Math.max(1, window.innerHeight) : 1.6;
    return AMBIENT_DIST * aspectDollyFactor(aspect);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, initZ], fov: CAMERA_FOV }}
      dpr={mobile ? [1, 1.5] : [1, 2]}
      gl={{ powerPreference: mobile ? "low-power" : "high-performance", antialias: !mobile }}
    >
      <color attach="background" args={["#050810"]} />

      <ambientLight intensity={0.26} />
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
