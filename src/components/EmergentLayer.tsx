"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EmergentNetwork, type ENode } from "@/lib/emergent";
import { EARTH_RADIUS } from "@/lib/geo";
import { makeSources } from "@/lib/signals/registry";
import { useViz } from "@/store/useViz";
import { useUI } from "@/store/useUI";
import { useMetrics } from "@/store/useMetrics";

const SURF = EARTH_RADIUS * 1.014;
const NODE_SIZE = 0.014;
const ROUTE_CAP = 700; // 동시 렌더 노선 수
const ARC_SEG = 18; // 노선 아크 분할
const ROUTE_BULGE = 0.2; // 아크가 지표 위로 부푸는 정도
const GOLD = new THREE.Color(1.0, 0.72, 0.25); // 호르몬 황금빛

function slerp(a: ENode, b: ENode, t: number): [number, number, number] {
  let dot = a.x * b.x + a.y * b.y + a.z * b.z;
  dot = Math.max(-1, Math.min(1, dot));
  const th = Math.acos(dot);
  if (th < 1e-4) return [a.x, a.y, a.z];
  const s = Math.sin(th);
  const s0 = Math.sin((1 - t) * th) / s;
  const s1 = Math.sin(t * th) / s;
  return [a.x * s0 + b.x * s1, a.y * s0 + b.y * s1, a.z * s0 + b.z * s1];
}

/**
 * Emergent 엔진 렌더러 — 노드/시냅스 동적 생멸 + 장거리 노선(축삭) 아크.
 */
export function EmergentLayer() {
  const config = useViz((s) => s.config);
  const earthVisible = useUI((s) => s.earthVisible);
  const earthShown = earthVisible && config.showEarth;
  const setE = useMetrics((s) => s.setEmergent);

  const sig =
    config.sources.join(",") +
    "|" + (config.intrinsic ? "i" : "") +
    (config.hormone ? "h" : "");
  const {
    net, sources, lineGeom, lineMat, posArr, colArr, routeGeom, routeMat, rPos, rCol,
  } = useMemo(() => {
    const net = new EmergentNetwork({
      spontaneous: config.intrinsic ? 0.01 : 0,
      hormoneProb: config.hormone ? 0.04 : 0,
    });
    const sources = makeSources(config.sources);

    const cap = net.cfg.maxSyn;
    const posArr = new Float32Array(cap * 6);
    const colArr = new Float32Array(cap * 6);
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    lineGeom.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
    lineGeom.setDrawRange(0, 0);
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95,
    });

    const rCount = ROUTE_CAP * (ARC_SEG - 1) * 6;
    const rPos = new Float32Array(rCount);
    const rCol = new Float32Array(rCount);
    const routeGeom = new THREE.BufferGeometry();
    routeGeom.setAttribute("position", new THREE.BufferAttribute(rPos, 3));
    routeGeom.setAttribute("color", new THREE.BufferAttribute(rCol, 3));
    routeGeom.setDrawRange(0, 0);
    const routeMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1,
    });

    return { net, sources, lineGeom, lineMat, posArr, colArr, routeGeom, routeMat, rPos, rCol };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => new THREE.Color(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tickRef = useRef(0);
  const frameRef = useRef(0);

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
      for (const ev of src.poll(tick)) net.injectStimulus(ev.lat, ev.lon, ev.strength);
      if (src.pollRoutes) {
        for (const rt of src.pollRoutes(tick))
          net.injectRoute(rt.latA, rt.lonA, rt.latB, rt.lonB, rt.weight);
      }
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
      if (n.mod > 0.015) color.lerp(GOLD, Math.min(0.92, n.mod * 1.8)); // 호르몬 물듦
      mesh.setColorAt(i, color);
      const s = 0.25 + n.vitality * 1.1 + n.mod * 0.6; // 호르몬 받으면 부풂
      dummy.position.set(n.x * SURF, n.y * SURF, n.z * SURF);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // 시냅스 (로컬은 직선 / 노선은 아래에서 아크로)
    const syns = net.syns;
    let c = 0;
    for (let s = 0; s < syns.length; s++) {
      const e = syns[s];
      if (!e.alive || e.route) continue;
      const a = nodes[e.i];
      const b = nodes[e.j];
      if (!a.alive || !b.alive) continue;
      const t = Math.min(1, e.act * (0.5 + 0.5 * e.w) + Math.max(0, e.w - 0.3) * 0.4);
      let r: number, g: number, bl: number;
      if (e.sign > 0) { r = 0.1 * t; g = 0.9 * t; bl = 0.7 * t; }
      else { r = 0.9 * t; g = 0.2 * t; bl = 0.35 * t; }
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

    // 노선(축삭) — 대권 아크로, 지표 위로 부풀려서
    let rc = 0;
    const maxSeg = ROUTE_CAP * (ARC_SEG - 1);
    for (let s = 0; s < syns.length && rc < maxSeg; s++) {
      const e = syns[s];
      if (!e.alive || !e.route) continue;
      const a = nodes[e.i];
      const b = nodes[e.j];
      if (!a.alive || !b.alive) continue;
      const tc = Math.min(1, 0.3 + e.act * 1.0 + Math.max(0, e.w - 0.3) * 0.5);
      const r = 0.5 * tc, g = 0.8 * tc, bl = 1.0 * tc;
      if (earthShown) {
        // 지구 켬 → 지표 위 대권 아크(항공 노선 지도처럼)
        let px = 0, py = 0, pz = 0;
        for (let k = 0; k < ARC_SEG; k++) {
          const tt = k / (ARC_SEG - 1);
          const [ux, uy, uz] = slerp(a, b, tt);
          const m = Math.hypot(ux, uy, uz) || 1;
          const rad = SURF * (1 + ROUTE_BULGE * Math.sin(Math.PI * tt));
          const x = (ux / m) * rad, y = (uy / m) * rad, z = (uz / m) * rad;
          if (k > 0 && rc < maxSeg) {
            const o = rc * 6;
            rPos[o] = px; rPos[o + 1] = py; rPos[o + 2] = pz;
            rPos[o + 3] = x; rPos[o + 4] = y; rPos[o + 5] = z;
            rCol[o] = r; rCol[o + 1] = g; rCol[o + 2] = bl;
            rCol[o + 3] = r; rCol[o + 4] = g; rCol[o + 5] = bl;
            rc++;
          }
          px = x; py = y; pz = z;
        }
      } else if (rc < maxSeg) {
        // 지구 끔 → 내부를 관통하는 직선(현) = 3D 신경 코어
        const o = rc * 6;
        rPos[o] = a.x * SURF; rPos[o + 1] = a.y * SURF; rPos[o + 2] = a.z * SURF;
        rPos[o + 3] = b.x * SURF; rPos[o + 4] = b.y * SURF; rPos[o + 5] = b.z * SURF;
        rCol[o] = r; rCol[o + 1] = g; rCol[o + 2] = bl;
        rCol[o + 3] = r; rCol[o + 4] = g; rCol[o + 5] = bl;
        rc++;
      }
    }
    routeGeom.setDrawRange(0, rc * 2);
    routeGeom.attributes.position.needsUpdate = true;
    routeGeom.attributes.color.needsUpdate = true;

    if (frameRef.current++ % 12 === 0) setE(net.metrics);
  });

  if (!config.showNet) return null;

  return (
    <group>
      <lineSegments geometry={lineGeom} material={lineMat} frustumCulled={false} />
      <lineSegments geometry={routeGeom} material={routeMat} frustumCulled={false} />
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
