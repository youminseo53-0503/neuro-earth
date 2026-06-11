"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PlasticityNetwork } from "@/lib/plasticity";
import { EARTH_RADIUS } from "@/lib/geo";
import { makeSources } from "@/lib/signals/registry";

const SURF = EARTH_RADIUS * 1.005; // 지표 '바로 위'(항공망 1.014보다 아래) = 지표를 기는 기반 인프라
// (×0.997은 지구 표면 안쪽이라 지구 켜면 불투명 구체에 가려져 안 보였음)
const NODE_SIZE = 0.009; // 점은 작게 — 선(흐름)이 주인공
const REST_SCALE = 0.22; // 점 크기는 거의 고정(투명도로 세기 표현, 크기로 X)
const GROW_SCALE = 0.18; // 흥분해도 크기는 거의 안 변함 — 대신 짙어짐
const EASE = 0.12; // 색·투명도를 목표치로 부드럽게 따라가게(점프 X)

/**
 * 그리드 파동 레이어 — 고정 격자 신경망('이미 깔린 위성 인프라') 위로
 * 스타링크(실시간 궤도)가 파동처럼 계속 이동한다. 위성이 지나가는 지상점이 격자를 때리고
 * 파동이 망을 타고 번진다 — 전 지구를 균등하게 도는 '배경망'(자율신경 격).
 * 항공망(emergent·체성)과 독립적으로 굴러가고 보라색으로 구분.
 */
export function GridWaveLayer() {
  const { net, sources, nodeMatrices, lineGeom, lineMat, vis } = useMemo(() => {
    const net = new PlasticityNetwork();
    const sources = makeSources(["starlink"]);
    const vis = new Float32Array(net.nodes.length); // 노드별 부드러운 시각 활성(0..1)

    const dummy = new THREE.Object3D();
    const nodeMatrices = net.nodes.map((n) => {
      dummy.position.set(n.x * SURF, n.y * SURF, n.z * SURF);
      dummy.scale.setScalar(REST_SCALE); // 초기엔 점
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });

    const segs = net.synapses.length;
    const pos = new Float32Array(segs * 6);
    const col = new Float32Array(segs * 8); // RGBA(정점당 4) — 알파=밀도(투명도)로 세기/가소성 표현
    for (let s = 0; s < segs; s++) {
      const e = net.synapses[s];
      const a = net.nodes[e.i];
      const b = net.nodes[e.j];
      pos[s * 6] = a.x * SURF; pos[s * 6 + 1] = a.y * SURF; pos[s * 6 + 2] = a.z * SURF;
      pos[s * 6 + 3] = b.x * SURF; pos[s * 6 + 4] = b.y * SURF; pos[s * 6 + 5] = b.z * SURF;
    }
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    lineGeom.setAttribute("color", new THREE.BufferAttribute(col, 4)); // itemSize 4 → 정점 알파 사용
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true,
      blending: THREE.NormalBlending, depthWrite: false, // 더할수록 밝아짐(X) → 알파로 짙어짐(O)
    });
    return { net, sources, nodeMatrices, lineGeom, lineMat, vis };
  }, []);

  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => new THREE.Color(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tickRef = useRef(0);

  useEffect(() => {
    const m = nodesRef.current;
    if (!m) return;
    for (let i = 0; i < nodeMatrices.length; i++) m.setMatrixAt(i, nodeMatrices[i]);
    m.instanceMatrix.needsUpdate = true;
  }, [nodeMatrices]);

  // 스타링크 TLE refresh (서버 프록시·2h 캐시)
  useEffect(() => {
    const acs: AbortController[] = [];
    const timers: ReturnType<typeof setInterval>[] = [];
    for (const src of sources) {
      if (!src.refresh) continue;
      const ac = new AbortController();
      acs.push(ac);
      const run = () => src.refresh!({ signal: ac.signal }).catch(() => {});
      run();
      timers.push(setInterval(run, src.refreshMs ?? 60_000));
    }
    return () => {
      timers.forEach(clearInterval);
      acs.forEach((c) => c.abort());
    };
  }, [sources]);

  useFrame(() => {
    const mesh = nodesRef.current;
    if (!mesh) return;
    const tick = tickRef.current++;
    for (const src of sources) {
      if (!src.enabled) continue;
      for (const ev of src.poll(tick))
        net.injectStimulus(ev.lat, ev.lon, ev.strength, ev.radius); // 신호 원래(처음) 수준
    }
    net.step();

    const nodes = net.nodes;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      // 발화(flash) 위주 — 흐름의 '머리'만 밝게(sub-threshold 글로우 억제)
      const act = Math.min(1, Math.max(n.a * 0.35, n.flash));
      const v = (vis[i] += (act - vis[i]) * EASE);
      // 작은 점 + 어두운 보라 — 선(흐름)이 주인공이라 점은 절제
      color.setRGB(0.15 + v * 0.45, 0.03 + v * 0.28, 0.35 + v * 0.45);
      mesh.setColorAt(i, color);
      // 흥분 전엔 거의 점 → 파동이 지나가며 천천히 부풂(크기로 파동이 보임)
      dummy.position.set(n.x * SURF, n.y * SURF, n.z * SURF);
      dummy.scale.setScalar(REST_SCALE + v * GROW_SCALE);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    const arr = lineGeom.attributes.color.array as Float32Array;
    const syn = net.synapses;
    for (let s = 0; s < syn.length; s++) {
      const e = syn[s];
      // 색(보라 계열)은 고정 — 세기는 '투명도(알파=밀도)'로. 크게가 아니라 짙게.
      // 감마 곡선으로 단계를 드라마틱하게: 약한 연결은 거의 0(안 보임) → 강할수록 급격히 짙어짐.
      //  · 가소성: 학습된 강도 e.w가 클수록 평소에도 짙음(자주 쓰인 경로가 진하게 남음)
      //  · 흐름:   신호가 지날 때(e.act) 확 짙어졌다가 식음
      const plast = Math.min(1, e.w * 1.3);
      const base = Math.pow(plast, 2.4) * 0.85; // 약하면 ~0, 강하면 ~0.85
      const flow = e.act * e.act * 0.95; // 흐름도 제곱 → 또렷한 펄스
      const a = Math.min(1, base + flow);
      const o = s * 8;
      arr[o] = 0.62; arr[o + 1] = 0.26; arr[o + 2] = 1.0; arr[o + 3] = a;
      arr[o + 4] = 0.62; arr[o + 5] = 0.26; arr[o + 6] = 1.0; arr[o + 7] = a;
    }
    lineGeom.attributes.color.needsUpdate = true;
  });

  return (
    <group>
      <lineSegments geometry={lineGeom} material={lineMat} frustumCulled={false} />
      <instancedMesh ref={nodesRef} args={[undefined, undefined, net.nodes.length]} frustumCulled={false}>
        <sphereGeometry args={[NODE_SIZE, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
