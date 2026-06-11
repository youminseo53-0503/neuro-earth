"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PlasticityNetwork } from "@/lib/plasticity";
import { EARTH_RADIUS } from "@/lib/geo";
import { makeSources } from "@/lib/signals/registry";

const SURF = EARTH_RADIUS * 0.997; // 항공망보다 살짝 안쪽 = '이미 깔린 기반 인프라'
const NODE_SIZE = 0.011;

/**
 * 그리드 파동 레이어 — 고정 격자 신경망('이미 깔린 인프라') 위로
 * 시장(실데이터)이 파동처럼 계속 이동한다. 항공망(emergent)과 독립적으로 굴러가고,
 * 보라색으로 색 구분. 사회현상: 인프라를 타고 번지는 여론/심리의 파동.
 */
export function GridWaveLayer() {
  const { net, sources, nodeMatrices, lineGeom, lineMat } = useMemo(() => {
    const net = new PlasticityNetwork();
    const sources = makeSources(["crypto"]);

    const dummy = new THREE.Object3D();
    const nodeMatrices = net.nodes.map((n) => {
      dummy.position.set(n.x * SURF, n.y * SURF, n.z * SURF);
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
    return { net, sources, nodeMatrices, lineGeom, lineMat };
  }, []);

  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => new THREE.Color(), []);
  const tickRef = useRef(0);

  useEffect(() => {
    const m = nodesRef.current;
    if (!m) return;
    for (let i = 0; i < nodeMatrices.length; i++) m.setMatrixAt(i, nodeMatrices[i]);
    m.instanceMatrix.needsUpdate = true;
  }, [nodeMatrices]);

  // 시장 웹소켓 refresh
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
      // 보라색 계열(항공망 시안/마젠타와 구분)
      color.setRGB(0.35 + act * 0.55, 0.1 + act * 0.35, 0.7 + act * 0.3);
      mesh.setColorAt(i, color);
    }
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
