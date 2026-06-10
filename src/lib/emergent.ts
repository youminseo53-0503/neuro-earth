import { mulberry32 } from "./seededRng";

// ─────────────────────────────────────────────────────────────
// Emergent 신경 가소성 엔진 — 구조가 데이터에서 자라난다.
//
//   · 노드 0개에서 시작. 신호가 오는 곳에 노드가 '태어나고'(neurogenesis),
//     오래 안 쓰이면 '죽는다'(apoptosis).
//   · 함께 활동한 가까운 노드 사이에 시냅스가 새로 '생기고'(synaptogenesis),
//     약하면 끊어진다.
//   · 정해진 위치·정해진 연결이 없다 — 실제 세계 활동이 구조를 빚는다.
//     활동 많은 곳은 노드가 빽빽한 군집 = 규모가 구조에 그대로 반영된다.
//
// 고정 슬롯 풀(최대 용량) + freelist로 동적 생멸을 관리(렌더 버퍼 안정).
// ─────────────────────────────────────────────────────────────

const DEG = 180 / Math.PI;

function latLonToUnit(lat: number, lon: number): [number, number, number] {
  const phi = (90 - lat) / DEG;
  const th = (lon + 180) / DEG;
  return [
    -Math.sin(phi) * Math.cos(th),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(th),
  ];
}

function unitToLatLon(x: number, y: number, z: number): [number, number] {
  const lat = Math.asin(Math.max(-1, Math.min(1, y))) * DEG;
  let lon = Math.atan2(z, -x) * DEG - 180;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return [lat, lon];
}

export interface ENode {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  lat: number;
  lon: number;
  a: number;
  inj: number;
  vitality: number;
  type: 1 | -1; // 흥분 +1 / 억제 -1
  threshold: number;
  refrac: number;
  fired: boolean;
  flash: number;
  lastActive: number;
  deg: number;
  mod: number; // 호르몬(neuromodulation) 농도 — 느리게 확산·감쇠, 흥분성 끌어올림
}

export interface ESyn {
  alive: boolean;
  i: number;
  j: number;
  w: number;
  sign: number;
  act: number;
  route: boolean; // 장거리 축삭(항공 노선) — 아크로 렌더
}

export interface EConfig {
  maxNodes: number;
  maxSyn: number;
  birthRadius: number; // 이 각거리 안에 노드 없으면 새 노드 (rad)
  connectRadius: number; // 새 시냅스 최대 각거리 (rad)
  birthProb: number; // 빈 곳 자극 시 노드 탄생 확률
  connectProb: number; // 발화 노드가 시냅스 뻗을 확률
  growthProb: number; // 허브(고활력)가 자식 노드를 낳을 확률
  growthOffset: number; // 자식 노드 각거리 offset
  maxDeg: number; // 노드당 최대 시냅스
  inhibitoryRatio: number;
  decay: number;
  threshold: number;
  ltp: number;
  ltd: number;
  prune: number; // 시냅스 전역 약화
  minW: number; // 이하면 시냅스 죽음
  refractoryTicks: number;
  nodeLifespan: number; // 이 틱 이상 비활성+저활력이면 죽음
  spontaneous: number; // 내재 활동: 매 틱 노드가 스스로 발화 시도할 확률(0=순수 자극반응)
  hormoneProb: number; // 호르몬 분비 확률(0=끔)
  hormoneRelease: number; // 분비 시 mod 증가량
  hormoneDecay: number; // mod 감쇠(느림 → 오래 유지)
  diffuseRate: number; // mod 로컬 시냅스 확산율(천천히)
  routeDiffuse: number; // mod 노선(축삭) 확산율(멀리 확 점프)
  modDrive: number; // mod가 흥분성에 더하는 양
  seed: number;
}

export const EMERGENT_DEFAULT: EConfig = {
  maxNodes: 1200,
  maxSyn: 7000,
  birthRadius: 0.06,
  connectRadius: 0.18,
  birthProb: 0.6,
  connectProb: 0.5,
  growthProb: 0.2,
  growthOffset: 0.11,
  maxDeg: 14,
  inhibitoryRatio: 0.22,
  decay: 0.88, // 활동 유지하되 무한 메아리는 방지
  threshold: 0.38, // 전파되되 몇 단 뒤 꺼지게(연쇄 ~3~5단)
  ltp: 0.06,
  ltd: 0.02,
  prune: 0.002,
  minW: 0.04,
  refractoryTicks: 4,
  nodeLifespan: 220,
  spontaneous: 0,
  hormoneProb: 0,
  hormoneRelease: 6, // 드물지만 크게 (무작위 이벤트)
  hormoneDecay: 0.996, // 번졌다 서서히 사라짐(누적 침수 방지, 그래도 스파이크보다 한참 김)
  diffuseRate: 0.08, // 로컬은 천천히
  routeDiffuse: 0.42, // 노선(축삭)으로는 멀리 확 점프
  modDrive: 0.28,
  seed: 20260611,
};

export interface EMetrics {
  tick: number;
  nodes: number;
  synapses: number;
  firing: number;
  births: number;
  deaths: number;
  hormone: number;
}

export class EmergentNetwork {
  readonly cfg: EConfig;
  nodes: ENode[];
  syns: ESyn[];
  tick = 0;
  metrics: EMetrics = { tick: 0, nodes: 0, synapses: 0, firing: 0, births: 0, deaths: 0, hormone: 0 };

  private rng: () => number;
  private freeNodes: number[] = [];
  private freeSyns: number[] = [];
  private aliveNodeIdx: number[] = []; // 살아있는 노드 인덱스(스캔용)
  private bornCount = 0; // step 사이 탄생 수
  private edges = new Set<number>(); // 연결 쌍 O(1) 조회

  private ekey(i: number, j: number): number {
    return i < j ? i * this.cfg.maxNodes + j : j * this.cfg.maxNodes + i;
  }

  constructor(cfg: Partial<EConfig> = {}) {
    this.cfg = { ...EMERGENT_DEFAULT, ...cfg };
    this.rng = mulberry32(this.cfg.seed);
    this.nodes = Array.from({ length: this.cfg.maxNodes }, () => this.blankNode());
    this.syns = Array.from({ length: this.cfg.maxSyn }, () => ({
      alive: false, i: 0, j: 0, w: 0, sign: 1, act: 0, route: false,
    }));
    for (let i = this.cfg.maxNodes - 1; i >= 0; i--) this.freeNodes.push(i);
    for (let i = this.cfg.maxSyn - 1; i >= 0; i--) this.freeSyns.push(i);
  }

  private blankNode(): ENode {
    return {
      alive: false, x: 0, y: 0, z: 0, lat: 0, lon: 0, a: 0, inj: 0, vitality: 0,
      type: 1, threshold: 0.55, refrac: 0, fired: false, flash: 0, lastActive: 0, deg: 0,
      mod: 0,
    };
  }

  /** 가장 가까운 살아있는 노드(각거리 cosMin 이상). 없으면 -1 */
  private nearest(x: number, y: number, z: number, cosMin: number, exclude = -1): number {
    let best = -1;
    let bestDot = cosMin;
    for (let k = 0; k < this.aliveNodeIdx.length; k++) {
      const idx = this.aliveNodeIdx[k];
      if (idx === exclude) continue;
      const n = this.nodes[idx];
      const dot = n.x * x + n.y * y + n.z * z;
      if (dot > bestDot) {
        bestDot = dot;
        best = idx;
      }
    }
    return best;
  }

  private birth(lat: number, lon: number, activation: number): number {
    const slot = this.freeNodes.pop();
    if (slot === undefined) return -1;
    const [x, y, z] = latLonToUnit(lat, lon);
    const n = this.nodes[slot];
    n.alive = true;
    n.x = x; n.y = y; n.z = z; n.lat = lat; n.lon = lon;
    n.a = activation; n.inj = 0; n.vitality = 0.1; n.mod = 0;
    n.type = this.rng() < this.cfg.inhibitoryRatio ? -1 : 1;
    n.threshold = this.cfg.threshold * (0.85 + this.rng() * 0.3);
    n.refrac = 0; n.fired = false; n.flash = 0;
    n.lastActive = this.tick; n.deg = 0;
    this.bornCount++;
    return slot;
  }

  private connect(i: number, j: number, route = false, w?: number) {
    const slot = this.freeSyns.pop();
    if (slot === undefined) return;
    const s = this.syns[slot];
    s.alive = true; s.i = i; s.j = j;
    s.w = w ?? 0.25 + this.rng() * 0.25;
    s.sign = this.nodes[i].type;
    s.act = 0;
    s.route = route;
    this.nodes[i].deg++;
    this.nodes[j].deg++;
    this.edges.add(this.ekey(i, j));
  }

  /** 두 지점의 가장 가까운 노드를 장거리 연결(축삭). 둘 다 존재할 때만. */
  injectRoute(latA: number, lonA: number, latB: number, lonB: number, weight = 0.5) {
    const [ax, ay, az] = latLonToUnit(latA, lonA);
    const [bx, by, bz] = latLonToUnit(latB, lonB);
    const cosR = Math.cos(0.16);
    const i = this.nearest(ax, ay, az, cosR);
    const j = this.nearest(bx, by, bz, cosR);
    if (i < 0 || j < 0 || i === j) return;
    if (this.nodes[i].deg >= this.cfg.maxDeg || this.nodes[j].deg >= this.cfg.maxDeg) return;
    if (this.hasEdge(i, j)) return;
    this.connect(i, j, true, weight);
  }

  private hasEdge(i: number, j: number): boolean {
    return this.edges.has(this.ekey(i, j));
  }

  private killNode(idx: number) {
    const n = this.nodes[idx];
    n.alive = false;
    for (let s = 0; s < this.syns.length; s++) {
      const e = this.syns[s];
      if (e.alive && (e.i === idx || e.j === idx)) this.killSyn(s);
    }
    this.freeNodes.push(idx);
  }

  private killSyn(s: number) {
    const e = this.syns[s];
    if (!e.alive) return;
    e.alive = false;
    this.nodes[e.i].deg--;
    this.nodes[e.j].deg--;
    this.edges.delete(this.ekey(e.i, e.j));
    this.freeSyns.push(s);
  }

  /** (위도,경도)에 자극. 근처 노드가 있으면 활성, 없으면 새 노드 탄생. */
  injectStimulus(lat: number, lon: number, strength: number) {
    const [x, y, z] = latLonToUnit(lat, lon);
    const cosR = Math.cos(this.cfg.birthRadius);
    const near = this.nearest(x, y, z, cosR);
    if (near >= 0) {
      const n = this.nodes[near];
      n.inj += strength;
      n.lastActive = this.tick;
    } else if (Math.abs(strength) > 0.15 && this.rng() < this.cfg.birthProb) {
      this.birth(lat, lon, Math.abs(strength));
    }
  }

  step() {
    const { decay, ltp, ltd, prune, minW, refractoryTicks, nodeLifespan, connectRadius, connectProb, growthProb, growthOffset, maxDeg, spontaneous, hormoneProb, hormoneRelease, hormoneDecay, diffuseRate, routeDiffuse, modDrive } = this.cfg;

    // 살아있는 노드 목록 갱신
    this.aliveNodeIdx.length = 0;
    for (let i = 0; i < this.nodes.length; i++) if (this.nodes[i].alive) this.aliveNodeIdx.push(i);

    // 1) 시냅스 입력 누적 + 전역 약화/사멸
    const input = new Map<number, number>();
    for (let s = 0; s < this.syns.length; s++) {
      const e = this.syns[s];
      if (!e.alive) continue;
      if (this.nodes[e.i].fired) {
        input.set(e.j, (input.get(e.j) ?? 0) + e.sign * e.w);
        e.act = 1;
      } else {
        e.act *= 0.8;
      }
      // 문화(호르몬) 비보존 전파(전염형) — 낮은 쪽이 높은 쪽×감쇠로 끌려 올라감.
      // 원천은 안 줄어 멀리 가도 밝고, 홉마다 0.92씩 감쇠해 거리에 따라 옅어짐.
      // 로컬은 천천히, 노선(축삭)으로는 멀리 확 점프.
      const rate = e.route ? routeDiffuse : diffuseRate;
      const mi = this.nodes[e.i];
      const mj = this.nodes[e.j];
      const att = 0.82; // 홉마다 강하게 감쇠 → 거리에 따라 옅어짐(전체 침수 방지)
      if (mi.mod * att > mj.mod) mj.mod += (mi.mod * att - mj.mod) * rate;
      else if (mj.mod * att > mi.mod) mi.mod += (mj.mod * att - mi.mod) * rate;
      e.w *= 1 - prune;
      if (e.w < minW) this.killSyn(s);
    }

    // 2) 노드 갱신 + 발화/불응 + 활력
    let firing = 0;
    const firedThisStep: number[] = [];
    for (let k = 0; k < this.aliveNodeIdx.length; k++) {
      const idx = this.aliveNodeIdx[k];
      const nd = this.nodes[idx];
      if (nd.refrac > 0) {
        nd.refrac--;
        nd.fired = false;
        nd.a *= decay * 0.5;
        nd.flash *= 0.88;
        nd.vitality *= 0.997;
        nd.mod *= hormoneDecay;
        nd.inj = 0;
        continue;
      }
      // 내재 활동 — 자극이 없어도 스스로 발화를 시작(살아있는 뇌)
      if (spontaneous > 0 && this.rng() < spontaneous) nd.inj += 0.7;
      // 호르몬 — 흥분성을 끌어올림(오래 유지)
      nd.mod *= hormoneDecay;
      if (nd.mod > 0) nd.inj += nd.mod * modDrive;
      let a = nd.a * decay + (input.get(idx) ?? 0) + nd.inj;
      nd.inj = 0;
      if (a < 0) a = 0;
      if (a >= nd.threshold) {
        nd.fired = true;
        nd.refrac = refractoryTicks;
        nd.a = 0;
        nd.flash = 1;
        nd.lastActive = this.tick;
        nd.vitality = Math.min(1.6, nd.vitality + 0.18);
        firing++;
        firedThisStep.push(idx);
      } else {
        nd.fired = false;
        nd.a = a > 1.5 ? 1.5 : a;
        nd.flash *= 0.88;
        nd.vitality *= 0.997;
      }
    }

    // 호르몬 분비 — 가끔 발화점에서(없으면 임의 노드) release. 확산은 시냅스 루프가 처리
    if (hormoneProb > 0 && this.rng() < hormoneProb && this.aliveNodeIdx.length > 0) {
      const pool = firedThisStep.length > 0 ? firedThisStep : this.aliveNodeIdx;
      const origin = pool[Math.floor(this.rng() * pool.length)];
      this.nodes[origin].mod += hormoneRelease;
    }

    // 3) 헤브 가소성
    for (let s = 0; s < this.syns.length; s++) {
      const e = this.syns[s];
      if (!e.alive || !this.nodes[e.i].fired) continue;
      if (this.nodes[e.j].fired) e.w += ltp * (1 - e.w);
      else e.w -= ltd * e.w;
      if (e.w < 0) e.w = 0;
    }

    // 4) 시냅토제네시스 — 발화 노드가 가까운 발화/활성 노드로 연결
    const cosC = Math.cos(connectRadius);
    for (let f = 0; f < firedThisStep.length; f++) {
      const i = firedThisStep[f];
      const ni = this.nodes[i];
      if (ni.deg >= maxDeg || this.rng() >= connectProb) continue;
      const j = this.nearest(ni.x, ni.y, ni.z, cosC, i);
      if (j >= 0 && this.nodes[j].deg < maxDeg && !this.hasEdge(i, j)) this.connect(i, j);
    }

    // 4b) 수상돌기 성장 — 허브(고활력)가 가까이에 자식 노드를 낳음
    for (let f = 0; f < firedThisStep.length; f++) {
      const i = firedThisStep[f];
      const ni = this.nodes[i];
      if (ni.vitality < 0.45 || ni.deg >= maxDeg) continue;
      if (this.rng() >= growthProb || this.freeNodes.length === 0) continue;
      const ox = ni.x + (this.rng() - 0.5) * growthOffset * 2;
      const oy = ni.y + (this.rng() - 0.5) * growthOffset * 2;
      const oz = ni.z + (this.rng() - 0.5) * growthOffset * 2;
      const m = Math.hypot(ox, oy, oz) || 1;
      const [clat, clon] = unitToLatLon(ox / m, oy / m, oz / m);
      const child = this.birth(clat, clon, 0.7);
      if (child >= 0) this.connect(i, child);
    }

    // 5) 죽음 — 오래 비활성 + 저활력
    let deaths = 0;
    for (let k = 0; k < this.aliveNodeIdx.length; k++) {
      const idx = this.aliveNodeIdx[k];
      const nd = this.nodes[idx];
      if (this.tick - nd.lastActive > nodeLifespan) {
        this.killNode(idx);
        deaths++;
      }
    }

    this.tick++;
    let nodeCount = 0, synCount = 0, modSum = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].alive) { nodeCount++; modSum += this.nodes[i].mod; }
    }
    for (let s = 0; s < this.syns.length; s++) if (this.syns[s].alive) synCount++;
    this.metrics = { tick: this.tick, nodes: nodeCount, synapses: synCount, firing, births: this.bornCount, deaths, hormone: modSum };
    this.bornCount = 0;
  }
}
