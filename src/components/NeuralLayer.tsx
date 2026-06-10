"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PlasticityNetwork } from "@/lib/plasticity";
import { EARTH_RADIUS } from "@/lib/geo";
import { makeSources } from "@/lib/signals/registry";
import { useMetrics } from "@/store/useMetrics";
import { useViz } from "@/store/useViz";

const SURF = EARTH_RADIUS * 1.014;
const NODE_SIZE = 0.014;

/**
 * 지구 위 신경 가소성 망 (버전 config 기반).
 *   · showNet / colorMode(weight=줄전구, act=신호흐름) / jitter / sources 를
 *     useViz 프리셋에서 읽어 그 버전대로 렌더 → "살아있는 보고서"의 시간여행.
 *   · 구조 파라미터(jitter·sources) 변경 시 망을 재생성.
 */
export function NeuralLayer() {
  const config = useViz((s) => s.config);
  const setMetrics = useMetrics((s) => s.set);

  // 구조가 바뀌면(지터·소스) 재생성
  const sig = config.jitter + "|" + config.sources.join(",");
  const { net, sources, nodeMatrices, lineGeom, lineMat } = useMemo(() => {
    const net = new PlasticityNetwork({ jitter: config.jitter });
    const sources = makeSources(config.sources);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => new THREE.Color(), []);
  const tickRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const mesh = nodesRef.current;
    if (!mesh) return;
    for (let i = 0; i < nodeMatrices.length; i++) mesh.setMatrixAt(i, nodeMatrices[i]);
    mesh.instanceMatrix.needsUpdate = true;
  }, [nodeMatrices]);

  // 외부 데이터 소스(예: 지진)의 refresh를 벽시계로 구동 (렌더 루프와 독립)
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
    if (!mesh || !config.showNet) return;
    const tick = tickRef.current++;
    const weightMode = config.colorMode === "weight";

    for (const src of sources) {
      if (!src.enabled) continue;
      const events = src.poll(tick);
      for (const ev of events)
        net.injectStimulus(ev.lat, ev.lon, ev.strength, ev.radius);
    }
    net.step();

    // 노드 색
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

    // 시냅스 색
    const arr = lineGeom.attributes.color.array as Float32Array;
    const syn = net.synapses;
    for (let s = 0; s < syn.length; s++) {
      const e = syn[s];
      const t = weightMode
        ? Math.min(1, e.w) // 옛 버전: 정적 가중치(줄전구)
        : Math.min(1, e.act * (0.45 + 0.55 * e.w) + Math.max(0, e.w - 0.32) * 0.4);
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

    if (frameRef.current++ % 12 === 0) setMetrics(net.metrics);
  });

  if (!config.showNet) return null;

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
