"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EmergentNetwork } from "@/lib/emergent";
import { EARTH_RADIUS } from "@/lib/geo";
import { makeSources } from "@/lib/signals/registry";
import { useViz } from "@/store/useViz";
import { useMetrics } from "@/store/useMetrics";

const SURF = EARTH_RADIUS * 1.014;
const NODE_SIZE = 0.014;

/**
 * Emergent 엔진 렌더러 — 노드/시냅스가 동적으로 생멸한다.
 *   · 고정 용량 instancedMesh: 살아있는 노드만 표시(죽으면 scale 0)
 *   · 시냅스는 살아있는 것만 compact 버퍼에 써서 drawRange로 그림
 *   · 매 프레임: 신호 주입 → step(탄생/죽음/연결) → 렌더 갱신
 */
export function EmergentLayer() {
  const config = useViz((s) => s.config);
  const setE = useMetrics((s) => s.setEmergent);

  const sig = config.sources.join(",");
  const { net, sources, lineGeom, lineMat, posArr, colArr } = useMemo(() => {
    const net = new EmergentNetwork();
    const sources = makeSources(config.sources);
    const cap = net.cfg.maxSyn;
    const posArr = new Float32Array(cap * 6);
    const colArr = new Float32Array(cap * 6);
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    lineGeom.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
    lineGeom.setDrawRange(0, 0);
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.95,
    });
    return { net, sources, lineGeom, lineMat, posArr, colArr };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => new THREE.Color(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tickRef = useRef(0);
  const frameRef = useRef(0);

  // 외부 데이터 소스 refresh(웹소켓/폴링) 구동
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
      const evs = src.poll(tick);
      for (const ev of evs) net.injectStimulus(ev.lat, ev.lon, ev.strength);
    }
    net.step();

    // 노드
    const nodes = net.nodes;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n.alive) {
        dummy.scale.setScalar(0);
        dummy.position.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const act = Math.min(1, Math.max(n.a * 0.7, n.flash));
      if (n.type === 1) color.setRGB(0.05 + act * 0.3, 0.5 + act * 0.5, 0.6 + act * 0.4);
      else color.setRGB(0.6 + act * 0.4, 0.1 + act * 0.3, 0.45 + act * 0.4);
      mesh.setColorAt(i, color);
      const s = 0.25 + n.vitality * 1.1;
      dummy.position.set(n.x * SURF, n.y * SURF, n.z * SURF);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // 시냅스 (살아있는 것만 compact)
    const syns = net.syns;
    let c = 0;
    for (let s = 0; s < syns.length; s++) {
      const e = syns[s];
      if (!e.alive) continue;
      const a = nodes[e.i];
      const b = nodes[e.j];
      if (!a.alive || !b.alive) continue;
      const t = Math.min(1, e.act * (0.5 + 0.5 * e.w) + Math.max(0, e.w - 0.3) * 0.4);
      let r: number, g: number, bl: number;
      if (e.sign > 0) {
        r = 0.1 * t; g = 0.9 * t; bl = 0.7 * t;
      } else {
        r = 0.9 * t; g = 0.2 * t; bl = 0.35 * t;
      }
      const o = c * 6;
      posArr[o] = a.x * SURF; posArr[o + 1] = a.y * SURF; posArr[o + 2] = a.z * SURF;
      posArr[o + 3] = b.x * SURF; posArr[o + 4] = b.y * SURF; posArr[o + 5] = b.z * SURF;
      colArr[o] = r; colArr[o + 1] = g; colArr[o + 2] = bl;
      colArr[o + 3] = r; colArr[o + 4] = g; colArr[o + 5] = bl;
      c++;
    }
    lineGeom.setDrawRange(0, c * 2);
    lineGeom.attributes.position.needsUpdate = true;
    lineGeom.attributes.color.needsUpdate = true;

    if (frameRef.current++ % 12 === 0) setE(net.metrics);
  });

  if (!config.showNet) return null;

  return (
    <group>
      <lineSegments geometry={lineGeom} material={lineMat} frustumCulled={false} />
      <instancedMesh
        ref={nodesRef}
        args={[undefined, undefined, net.nodes.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[NODE_SIZE, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
