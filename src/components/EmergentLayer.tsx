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
const SYN_CAP = 7000;
const NODE_LV_BIG = [0.3, 0.55, 0.9, 1.35, 1.9]; // 옛 버전 — 큰 공(명확히 구분)
const NODE_LV_SMALL = [0.2, 0.34, 0.5, 0.68, 0.9]; // '줄여!' 이후 버전 — 작은 공(선이 주인공)
const THICK_BASE = 0.0033; // 선 굵기 기준(한 단계 얇게)
const ROUTE_CAP = 700;
const ARC_SEG = 18;
const BULGE_MIN = 0.04; // 단거리 노선은 거의 평탄
const BULGE_SPAN = 0.3; // 대척점에 가까울수록 대권 아크처럼 웅장
const GOLD = new THREE.Color(1.0, 0.72, 0.25);
const UP = new THREE.Vector3(0, 1, 0);

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
 * Emergent 렌더러 — 노드(5단 이산 크기) + 시냅스(굵기=사용량, 실린더) + 노선(아크/내부직선).
 */
export function EmergentLayer() {
  const config = useViz((s) => s.config);
  const earthVisible = useUI((s) => s.earthVisible);
  const earthShown = earthVisible && config.showEarth;
  const setE = useMetrics((s) => s.setEmergent);
  // 노드 크기는 버전 속성 — 옛 버전은 큰 공 그대로, 'smallNodes' 버전부터 작은 공
  const NODE_LV = config.smallNodes ? NODE_LV_SMALL : NODE_LV_BIG;

  const sig =
    config.sources.join(",") +
    "|" + (config.intrinsic ? "i" : "") +
    (config.hormone ? "h" : "") +
    (config.fatigue ? "f" : "") +
    (config.homeo ? "o" : "");
  const { net, sources, synGeo, synMat, routeGeom, routeMat, rPos, rCol } = useMemo(() => {
    const net = new EmergentNetwork({
      spontaneous: config.intrinsic ? 0.01 : 0,
      hormoneProb: config.hormone ? 0.006 : 0,
      fatigueGain: config.fatigue ? 0.18 : 0,
      homeoRate: config.homeo ? 0.03 : 0,
    });
    const sources = makeSources(config.sources);

    const synGeo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
    const synMat = new THREE.MeshBasicMaterial({
      vertexColors: false, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
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

    return { net, sources, synGeo, synMat, routeGeom, routeMat, rPos, rCol };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const synRef = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => new THREE.Color(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const tickRef = useRef(0);
  const frameRef = useRef(0);
  const prevSyn = useRef(0);
  const lastNet = useRef<EmergentNetwork | null>(null);

  // 외부 데이터 refresh
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
    const sm = synRef.current;
    if (!mesh || !sm) return;

    // 첫 프레임 / 버전 전환 시 모든 시냅스 인스턴스 확실히 숨김(원점 흰 원기둥 버그 방지)
    if (lastNet.current !== net) {
      dummy.scale.setScalar(0);
      dummy.position.set(0, 0, 0);
      dummy.updateMatrix();
      for (let k = 0; k < SYN_CAP; k++) sm.setMatrixAt(k, dummy.matrix);
      sm.instanceMatrix.needsUpdate = true;
      lastNet.current = net;
      prevSyn.current = 0;
    }

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
    const nodes = net.nodes;
    const syns = net.syns;

    // 노드 — 이산 크기 레벨 + 색(흥분/억제 + 문화 황금빛)
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
      if (n.mod > 0.08) color.lerp(GOLD, Math.min(0.9, n.mod * 0.2));
      mesh.setColorAt(i, color);
      const lvi = Math.min(4, Math.floor(n.vitality / 0.32));
      dummy.position.set(n.x * SURF, n.y * SURF, n.z * SURF);
      dummy.scale.setScalar(NODE_LV[lvi]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // 시냅스 — 굵기=사용량(use)인 실린더 (로컬 연결, 노선 제외)
    let c = 0;
    for (let s = 0; s < syns.length; s++) {
      const e = syns[s];
      if (!e.alive || e.route) continue;
      const a = nodes[e.i];
      const b = nodes[e.j];
      if (!a.alive || !b.alive) continue;
      const ax = a.x * SURF, ay = a.y * SURF, az = a.z * SURF;
      const bx = b.x * SURF, by = b.y * SURF, bz = b.z * SURF;
      dir.set(bx - ax, by - ay, bz - az);
      const len = dir.length();
      if (len < 1e-5) continue;
      dir.divideScalar(len);
      const th = THICK_BASE * (0.18 + Math.min(e.use, 5) * 0.42);
      dummy.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      dummy.quaternion.setFromUnitVectors(UP, dir);
      dummy.scale.set(th, len, th);
      dummy.updateMatrix();
      sm.setMatrixAt(c, dummy.matrix);
      const t = Math.min(1, e.act * (0.4 + 0.5 * e.w) + Math.max(0, e.w - 0.3) * 0.35);
      if (e.sign > 0) color.setRGB(0.12 * t, 0.85 * t, 0.65 * t);
      else color.setRGB(0.85 * t, 0.2 * t, 0.35 * t);
      sm.setColorAt(c, color);
      c++;
    }
    // 줄어든 만큼 숨김
    if (prevSyn.current > c) {
      dummy.scale.setScalar(0);
      dummy.position.set(0, 0, 0);
      dummy.updateMatrix();
      for (let k = c; k < prevSyn.current; k++) sm.setMatrixAt(k, dummy.matrix);
    }
    prevSyn.current = c;
    sm.instanceMatrix.needsUpdate = true;
    if (sm.instanceColor) sm.instanceColor.needsUpdate = true;

    // 노선(축삭) — 지구 켜면 아크, 끄면 내부 직선
    let rc = 0;
    const maxSeg = ROUTE_CAP * (ARC_SEG - 1);
    for (let s = 0; s < syns.length && rc < maxSeg; s++) {
      const e = syns[s];
      if (!e.alive || !e.route) continue;
      const a = nodes[e.i];
      const b = nodes[e.j];
      if (!a.alive || !b.alive) continue;
      // 아치 높이 = 두 점 사이 대권 각도에 비례(단거리 평탄·장거리 웅장)
      let bdot = a.x * b.x + a.y * b.y + a.z * b.z;
      bdot = Math.max(-1, Math.min(1, bdot));
      const bulge = BULGE_MIN + BULGE_SPAN * (Math.acos(bdot) / Math.PI);
      const tc = Math.min(1, 0.3 + e.act * 1.0 + Math.max(0, e.w - 0.3) * 0.5);
      const r = 0.3 * tc, g = 0.8 * tc, bl = 1.0 * tc;
      if (earthShown) {
        let px = 0, py = 0, pz = 0;
        for (let k = 0; k < ARC_SEG; k++) {
          const tt = k / (ARC_SEG - 1);
          const [ux, uy, uz] = slerp(a, b, tt);
          const m = Math.hypot(ux, uy, uz) || 1;
          const rad = SURF * (1 + bulge * Math.sin(Math.PI * tt));
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
      <lineSegments geometry={routeGeom} material={routeMat} frustumCulled={false} />
      <instancedMesh ref={synRef} args={[synGeo, synMat, SYN_CAP]} frustumCulled={false} />
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
