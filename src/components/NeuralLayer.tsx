"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PlasticityNetwork } from "@/lib/plasticity";
import { EARTH_RADIUS } from "@/lib/geo";
import { createSources } from "@/lib/signals/registry";
import { useMetrics } from "@/store/useMetrics";

const SURF = EARTH_RADIUS * 1.014; // 지표보다 살짝 위
const NODE_SIZE = 0.014;

/**
 * 지구 위 신경 가소성 망.
 *   · 노드 = instancedMesh, 활성/발화로 색 변함 (흥분=시안 / 억제=마젠타)
 *   · 시냅스 = lineSegments(가산 블렌딩), 밝기 ∝ 가중치 → 가소성이 눈에 보임
 *   · 매 프레임: 신호 주입 → 엔진 step → 색 갱신
 * earthVisible와 무관하게 항상 표시(지구 꺼도 뇌는 남는다).
 */
export function NeuralLayer() {
  const setMetrics = useMetrics((s) => s.set);

  const { net, sources, nodeMatrices, lineGeom, lineMat } = useMemo(() => {
    const net = new PlasticityNetwork();
    const sources = createSources();

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
      pos[s * 6] = a.x * SURF;
      pos[s * 6 + 1] = a.y * SURF;
      pos[s * 6 + 2] = a.z * SURF;
      pos[s * 6 + 3] = b.x * SURF;
      pos[s * 6 + 4] = b.y * SURF;
      pos[s * 6 + 5] = b.z * SURF;
    }
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    lineGeom.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.95,
    });

    return { net, sources, nodeMatrices, lineGeom, lineMat };
  }, []);

  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => new THREE.Color(), []);
  const tickRef = useRef(0);
  const frameRef = useRef(0);

  // 노드 위치(고정) 1회 설정
  useEffect(() => {
    const mesh = nodesRef.current;
    if (!mesh) return;
    for (let i = 0; i < nodeMatrices.length; i++) {
      mesh.setMatrixAt(i, nodeMatrices[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [nodeMatrices]);

  useFrame(() => {
    const mesh = nodesRef.current;
    if (!mesh) return;
    const tick = tickRef.current++;

    // 1) 신호 주입
    for (const src of sources) {
      if (!src.enabled) continue;
      const events = src.poll(tick);
      for (const ev of events) net.injectStimulus(ev.lat, ev.lon, ev.strength);
    }

    // 2) 엔진 한 틱
    net.step();

    // 3) 노드 색 (활성/발화 → 밝기)
    const nodes = net.nodes;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const act = Math.min(1, Math.max(n.a * 0.7, n.flash));
      if (n.type === "exc") {
        color.setRGB(0.04 + act * 0.26, 0.45 + act * 0.55, 0.55 + act * 0.45);
      } else {
        color.setRGB(0.55 + act * 0.45, 0.08 + act * 0.27, 0.4 + act * 0.45);
      }
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // 4) 시냅스 색 (가중치 → 밝기 = 가소성 가시화)
    const arr = lineGeom.attributes.color.array as Float32Array;
    const syn = net.synapses;
    for (let s = 0; s < syn.length; s++) {
      const e = syn[s];
      const t = Math.min(1, e.w);
      let r: number, g: number, b: number;
      if (e.sign > 0) {
        r = 0.1 * t;
        g = 0.9 * t;
        b = 0.7 * t;
      } else {
        r = 0.9 * t;
        g = 0.2 * t;
        b = 0.35 * t;
      }
      const o = s * 6;
      arr[o] = r;
      arr[o + 1] = g;
      arr[o + 2] = b;
      arr[o + 3] = r;
      arr[o + 4] = g;
      arr[o + 5] = b;
    }
    lineGeom.attributes.color.needsUpdate = true;

    // 5) 지표 (스로틀)
    if (frameRef.current++ % 12 === 0) setMetrics(net.metrics);
  });

  return (
    <group>
      <lineSegments geometry={lineGeom} material={lineMat} />
      <instancedMesh ref={nodesRef} args={[undefined, undefined, net.nodes.length]}>
        <sphereGeometry args={[NODE_SIZE, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
