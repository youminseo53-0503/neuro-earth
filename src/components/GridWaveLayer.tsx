"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PlasticityNetwork } from "@/lib/plasticity";
import { EARTH_RADIUS } from "@/lib/geo";
import { makeSources } from "@/lib/signals/registry";

const SURF = EARTH_RADIUS * 0.997; // 항공망보다 살짝 안쪽 = '이미 깔린 기반 인프라'
const NODE_SIZE = 0.013;
const REST_SCALE = 0.28; // 흥분 전엔 거의 점(버전9처럼 0에 가깝게)
const GROW_SCALE = 1.55; // 흥분(파동 통과)하면 부풂 → 파동이 눈에 보임
const EASE = 0.1; // 크기·색을 목표치로 부드럽게 따라가게(점프 X, 점진적으로 부풀고 가라앉음)

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
    const col = new Float32Array(segs * 6);
    for (let s = 0; s < segs; s++) {
      const e = net.synapses[s];
      const a = net.nodes[e.i];
      const b = net.nodes[e.j];
      pos[s * 6] = a.x * SURF; pos[s * 6 + 1] = a.y * SURF; pos[s * 6 + 2] = a.z * SURF;
      pos[s * 6 + 3] = b.x * SURF; pos[s * 6 + 4] = b.y * SURF; pos[s * 6 + 5] = b.z * SURF;
    }
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    lineGeom.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85,
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
        net.injectStimulus(ev.lat, ev.lon, ev.strength, ev.radius);
    }
    net.step();

    const nodes = net.nodes;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const act = Math.min(1, Math.max(n.a * 0.7, n.flash));
      // 목표 활성으로 부드럽게 수렴 → 점프 없이 점진적으로 부풀고 가라앉음
      const v = (vis[i] += (act - vis[i]) * EASE);
      // 보라색 계열(항공망 시안/마젠타와 구분)
      color.setRGB(0.35 + v * 0.55, 0.1 + v * 0.35, 0.7 + v * 0.3);
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
      const t = Math.min(1, e.act * (0.45 + 0.55 * e.w) + Math.max(0, e.w - 0.32) * 0.4);
      const r = 0.45 * t, g = 0.16 * t, b = 0.8 * t;
      const o = s * 6;
      arr[o] = r; arr[o + 1] = g; arr[o + 2] = b;
      arr[o + 3] = r; arr[o + 4] = g; arr[o + 5] = b;
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
