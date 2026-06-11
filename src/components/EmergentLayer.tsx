"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EmergentNetwork, type ENode, type ESyn, type EConfig } from "@/lib/emergent";
import type { VizConfig } from "@/lib/versions";
import { PandemicDirector, type PandemicHud } from "@/lib/pandemic";
import { EARTH_RADIUS } from "@/lib/geo";
import { makeSources } from "@/lib/signals/registry";
import { useViz } from "@/store/useViz";
import { useUI, BASE_SPIN } from "@/store/useUI";
import { useMetrics } from "@/store/useMetrics";
import { usePandemic } from "@/store/usePandemic";

const GENESIS_SOURCES = ["genesis", "genesisciv", "local"]; // 창세 계열 소스
const GENESIS_CLIMAX_N = 5000; // 창세가 '다 자란' 최고조(비행기 폭발기 이후)

const SURF = EARTH_RADIUS * 1.014;
const NODE_SIZE = 0.014;
const SYN_CAP = 12000; // 시냅스 실린더 렌더 상한(노드 6000까지 커버)
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
 * VizConfig → EmergentNetwork 생성자 옵션(EConfig 부분집합).
 * sig 캐시키도 이 결과에서 파생한다 → 생성자 인자와 캐시키가 단일 소스라 구조적으로 못 어긋남
 * (옛날엔 둘을 손으로 따로 나열 → 빠뜨리면 '버전 바꿔도 옛 망이 살아남는' 침묵 회귀 위험).
 */
function buildNetOpts(config: VizConfig): Partial<EConfig> {
  const opts: Partial<EConfig> = {
    spontaneous: config.intrinsic ? 0.01 : 0,
    hormoneProb: config.hormone ? 0.006 : 0,
    fatigueGain: config.fatigue ? 0.18 : 0,
    homeoRate: config.homeo ? 0.03 : 0,
    maxAge: config.lifespan ?? (config.mortal ? 1500 : 0), // 절대 수명(틱) — 나이 들면 죽어 턴오버
    softCap: config.softCap ?? 0, // 밀도 의존 자기조절
    softCapRamp: config.softCapRamp ?? 0, // L자 성장곡선(문명사)
    localCap: config.localCap ?? 0, // 지역(셀)별 수용한계 — 균등 성장
    areaCap: config.areaCap ?? false, // 셀 한계를 면적(cos위도)으로 보정 — 극지방 과밀 방지
    pandemic: config.pandemic ?? false, // SIR 전염 파동(확산성 탈분극)
    maxNodes: config.maxNodes ?? 1200, // 하드 슬롯 상한(안전망). 옛 버전 1200
    maxSyn: config.maxNodes ? Math.max(7000, config.maxNodes * 2) : 7000,
  };
  // 창세(이상적)는 수상돌기 집중을 낮춰 거점들이 고르게 번지게. 실시간은 그대로.
  // 명시값 > genesis류 기본 0.05 > (없음 → 엔진 기본값)
  const gp = config.growthProb ?? (config.sources.includes("genesis") ? 0.05 : undefined);
  if (gp !== undefined) opts.growthProb = gp;
  return opts;
}

/** 노드 패스 — 이산 크기 레벨 + 색(흥분/억제 + 문화 황금빛, 팬데믹이면 SIR 색). */
function drawNodes(
  mesh: THREE.InstancedMesh,
  nodes: ENode[],
  config: VizConfig,
  NODE_LV: number[],
  color: THREE.Color,
  dummy: THREE.Object3D,
) {
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
    if (config.pandemic) {
      // SIR — 감염(빨강) / 회복(파랑) / 취약은 평소 뇌 색 그대로(활발한 세계 위로 빨강이 번짐)
      if (n.inf === 1) color.setRGB(1.0, 0.13, 0.1);
      else if (n.inf === 2) color.setRGB(0.16, 0.45, 0.95);
      else if (n.type === 1) color.setRGB(0.05 + act * 0.3, 0.5 + act * 0.5, 0.6 + act * 0.4);
      else color.setRGB(0.6 + act * 0.4, 0.1 + act * 0.3, 0.45 + act * 0.4);
    } else {
      if (n.type === 1) color.setRGB(0.05 + act * 0.3, 0.5 + act * 0.5, 0.6 + act * 0.4);
      else color.setRGB(0.6 + act * 0.4, 0.1 + act * 0.3, 0.45 + act * 0.4);
      if (n.mod > 0.08) color.lerp(GOLD, Math.min(0.9, n.mod * 0.2));
      if (n.immortal) color.setRGB(1.0, 0.9, 0.5); // 8대 문명 영속 앵커 — 황금빛
    }
    mesh.setColorAt(i, color);
    const lvi = Math.min(4, Math.floor(n.vitality / 0.32));
    dummy.position.set(n.x * SURF, n.y * SURF, n.z * SURF);
    dummy.scale.setScalar(n.immortal ? NODE_LV[4] * 1.4 : NODE_LV[lvi]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/** 시냅스 패스 — 굵기=사용량(use)인 실린더(로컬 연결, 노선 제외). prevSyn으로 줄어든 만큼 숨김. */
function drawSynapses(
  sm: THREE.InstancedMesh,
  syns: ESyn[],
  nodes: ENode[],
  prevSyn: { current: number },
  color: THREE.Color,
  dummy: THREE.Object3D,
  dir: THREE.Vector3,
) {
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
}

/** 노선(축삭) 패스 — 지구 켜면 아크, 끄면 내부 직선. 두 분기가 같은 세그먼트 푸시(pushSeg)를 공유. */
function drawRoutes(
  syns: ESyn[],
  nodes: ENode[],
  geom: THREE.BufferGeometry,
  rPos: Float32Array,
  rCol: Float32Array,
  config: VizConfig,
  earthShown: boolean,
  pandemicHalt: number | null, // null=평소(청록) / 0..1=팬데믹(감염 노선 빨강, 봉쇄 시 0으로 페이드)
) {
  let rc = 0;
  const maxSeg = ROUTE_CAP * (ARC_SEG - 1);
  const pushSeg = (
    x0: number, y0: number, z0: number,
    x1: number, y1: number, z1: number,
    r: number, g: number, b: number,
  ) => {
    const o = rc * 6;
    rPos[o] = x0; rPos[o + 1] = y0; rPos[o + 2] = z0;
    rPos[o + 3] = x1; rPos[o + 4] = y1; rPos[o + 5] = z1;
    rCol[o] = r; rCol[o + 1] = g; rCol[o + 2] = b;
    rCol[o + 3] = r; rCol[o + 4] = g; rCol[o + 5] = b;
    rc++;
  };
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
    const flow = Math.min(1, 0.3 + e.act * 1.0 + Math.max(0, e.w - 0.3) * 0.5);
    let r: number, g: number, bl: number;
    if (pandemicHalt !== null) {
      // 팬데믹 — 감염된 끝점이 있으면 항공로가 빨갛게(바이러스가 노선을 탐). 봉쇄 시 halt→0로 페이드(비행 멎음).
      const a2 = nodes[e.i], b2 = nodes[e.j];
      const infected = a2.inf === 1 || b2.inf === 1;
      const recovered = !infected && (a2.inf === 2 || b2.inf === 2);
      if (infected) {
        const e2 = (0.55 + 0.45 * flow) * pandemicHalt; // 또렷한 빨강
        r = e2; g = 0.1 * e2; bl = 0.08 * e2;
      } else if (recovered) {
        const e2 = flow * pandemicHalt;
        r = 0.16 * e2; g = 0.45 * e2; bl = 0.95 * e2;
      } else {
        const e2 = flow * pandemicHalt;
        r = 0.2 * e2; g = 0.55 * e2; bl = 0.95 * e2;
      }
    } else {
      r = 0.3 * flow; g = 0.8 * flow; bl = 1.0 * flow;
    }
    // 점진적 연결: grow(0→1)까지만 그림 — 출발(i)에서 도착(j)으로 아치가 그어짐
    const lastK = config.routeGrow ? Math.max(1, Math.round(e.grow * (ARC_SEG - 1))) : ARC_SEG - 1;
    if (earthShown) {
      let px = 0, py = 0, pz = 0;
      for (let k = 0; k <= lastK; k++) {
        const tt = k / (ARC_SEG - 1);
        const [ux, uy, uz] = slerp(a, b, tt);
        const m = Math.hypot(ux, uy, uz) || 1;
        const rad = SURF * (1 + bulge * Math.sin(Math.PI * tt));
        const x = (ux / m) * rad, y = (uy / m) * rad, z = (uz / m) * rad;
        if (k > 0 && rc < maxSeg) pushSeg(px, py, pz, x, y, z, r, g, bl);
        px = x; py = y; pz = z;
      }
    } else if (rc < maxSeg) {
      // 지구 끄면 내부 직선 — grow까지만 뻗음
      const gp = config.routeGrow ? e.grow : 1;
      const ex = a.x + (b.x - a.x) * gp, ey = a.y + (b.y - a.y) * gp, ez = a.z + (b.z - a.z) * gp;
      pushSeg(a.x * SURF, a.y * SURF, a.z * SURF, ex * SURF, ey * SURF, ez * SURF, r, g, bl);
    }
  }
  geom.setDrawRange(0, rc * 2);
  geom.attributes.position.needsUpdate = true;
  geom.attributes.color.needsUpdate = true;
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

  const netOpts = buildNetOpts(config);
  // sig = 소스 + 생성자 인자(netOpts 단일 소스에서 JSON으로 파생) + civAnchors.
  // civAnchors는 생성자 인자가 아니라 매 프레임 읽지만(앵커 심기), 단계 전환 시엔 망을 새로
  // 시작해야 8대 문명이 처음부터 심긴다 → 리빌드 트리거로만 따로 덧붙인다(미러 위험 없음).
  const sig =
    config.sources.join(",") + "|" + JSON.stringify(netOpts) +
    "|" + (config.civAnchors ? "C" : "") + (config.pandemicArc ? "X" : "");
  const { net, sources, synGeo, synMat, routeGeom, routeMat, rPos, rCol } = useMemo(() => {
    const net = new EmergentNetwork(netOpts);
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
  const director = useRef(new PandemicDirector());
  const prevClimax = useRef(false);
  const handedOff = useRef(false);
  const setPandemic = usePandemic((s) => s.set);

  // 팬데믹 '대봉쇄' 시네마틱이 아닐 땐 하단 자막 숨김
  useEffect(() => {
    if (!config.pandemicArc) setPandemic({ active: false });
    return () => setPandemic({ active: false });
  }, [config.pandemicArc, setPandemic]);

  // 언마운트(엔진 전환 등) 시 회전·카메라 원복 + 클라이맥스로 껐던 지구는 다시 켬
  useEffect(() => {
    return () => {
      useUI.getState().setSpin(BASE_SPIN);
      useUI.getState().setCamDist(0);
      if (prevClimax.current) useUI.getState().setEarthVisible(true);
    };
  }, []);

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
      director.current.reset(); // 새 망 → 시네마틱도 처음부터
      handedOff.current = false; // 라이브 핸드오프 플래그도 리셋
    }

    const tick = tickRef.current++;

    // 팬데믹 '대봉쇄' 시네마틱 — 엔진을 직접 연출(씨앗·전염률·전부감염·재유행억제)하고 자막/halt/주입량 산출
    let arc: PandemicHud | null = null;
    if (config.pandemicArc) arc = director.current.update(net);

    // present가 '오늘'에 닿아 잠시 머문 뒤 → 실시간(라이브) 모드로 자연 전환(한 번만)
    if (arc?.done && !handedOff.current) {
      handedOff.current = true;
      useViz.getState().setMode("live");
    }

    // 봉쇄 중엔 항공편(노선)은 일부만, 노드 자극은 바닥값 유지(너무 흐려지지 않게) — 교류는 멎되 0은 아님
    const routeScale = arc ? arc.injectScale : 1;
    const nodeScale = arc ? arc.nodeScale : 1;
    for (const src of sources) {
      if (!src.enabled) continue;
      src.observe?.(net.metrics.nodes); // 현재 규모를 소스에 알림(문명사: 비행기=N 기준)
      for (const ev of src.poll(tick)) net.injectStimulus(ev.lat, ev.lon, ev.strength * nodeScale);
      if (src.pollRoutes) {
        for (const rt of src.pollRoutes(tick)) {
          if (routeScale < 1 && Math.random() > routeScale) continue; // 최소 운항 — 일부 항공편만 띄움
          net.injectRoute(rt.latA, rt.lonA, rt.latB, rt.lonB, rt.weight);
        }
      }
      if (config.civAnchors && src.pollAnchors) {
        for (const a of src.pollAnchors(tick)) net.birthAnchor(a.lat, a.lon); // 8대 문명 영속 앵커
      }
    }
    net.step();

    // 세 패스(노드·시냅스·노선)는 순수 헬퍼로 분리 — useFrame은 폴링→step→그리기만.
    // 공유 스크래치(color/dummy/dir)와 prevSyn ref를 넘겨 프레임당 할당 0 유지.
    // 팬데믹이면 노선도 감염 따라 빨강(봉쇄 시 halt로 페이드). 비팬데믹은 null=평소 청록.
    const phalt = config.pandemic ? (arc ? arc.halt : 1) : null;
    drawNodes(mesh, net.nodes, config, NODE_LV, color, dummy);
    drawSynapses(sm, net.syns, net.nodes, prevSyn, color, dummy, dir);
    drawRoutes(net.syns, net.nodes, routeGeom, rPos, rCol, config, earthShown, phalt);

    // 클라이맥스 — 팬데믹 대봉쇄 OR 창세가 다 자람 → 지구 자동 끄기 + 회전 점점 빠르게
    const genesisGrown =
      config.sources.some((s) => GENESIS_SOURCES.includes(s)) && net.metrics.nodes >= GENESIS_CLIMAX_N;
    const climax = (arc?.climax ?? false) || genesisGrown;
    const ui = useUI.getState();
    ui.setSpin(THREE.MathUtils.lerp(ui.spin, climax ? 1.4 : BASE_SPIN, 0.02));
    // 카메라 돌리 — 팬데믹은 단계별 연출, 창세 클라이맥스는 pull-back, 그 외엔 0(사용자 자유)
    ui.setCamDist(arc ? arc.camDist : genesisGrown ? 8.6 : 0);
    // 지구 끄기/켜기는 '엣지에서 1회성'으로만 — 그 사이엔 사용자의 '지구 켜기' 버튼이 이긴다.
    if (climax !== prevClimax.current) {
      ui.setEarthVisible(!climax); // 진입 → 자동 끔 / 해제 → 다시 켬
      prevClimax.current = climax;
    }

    if (arc && frameRef.current % 6 === 0) {
      setPandemic({ active: true, phase: arc.phase, dateLabel: arc.dateLabel, caption: arc.caption, infectedPct: arc.infectedPct });
    }
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
