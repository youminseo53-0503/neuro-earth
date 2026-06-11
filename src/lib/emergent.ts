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
const GLAT = 18; // 로컬 밀도 격자 — 위도 셀(10°)
const GLON = 36; // 경도 셀(10°). 셀별 수용한계로 지역 균등 성장

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
  fatigue: number; // 피로(사회=식상함) — 과발화 시 쌓여 임계 ↑(쉬게 됨), 천천히 회복
  born: number; // 태어난 tick (절대 수명 계산용)
  maxAge: number; // 절대 수명(0=불멸). 활동과 무관하게 이 나이 넘으면 죽음 → 턴오버
  immortal: boolean; // 우연히 태어난 불멸 노드 — 나이·비활성으로도 안 죽음(영속 앵커)
  inf: number; // 팬데믹 SIR 상태: 0=취약(S) / 1=감염(I) / 2=회복(R)
  infT: number; // 현 SIR 상태 경과 틱
}

export interface ESyn {
  alive: boolean;
  i: number;
  j: number;
  w: number; // 전송 가중치(0..1, 동역학 안정 위해 제한)
  sign: number;
  act: number;
  use: number; // 누적 사용량 — 선 굵기(거의 한계 없이 자라되 소프트 캡)
  route: boolean; // 장거리 축삭(항공 노선) — 아크로 렌더
  grow: number; // 노선이 그어지는 진행도 0→1(출발→도착 점진적 연결). 비노선은 1
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
  maxAge: number; // 절대 수명(틱). 0=불멸. >0이면 활동과 무관하게 나이 들어 죽음(턴오버·문명 흥망)
  softCap: number; // 밀도 의존 자기조절 목표(수용한계). 0=끔. N이 여기 가까우면 탄생률↓ → 하드캡 무관 ~softCap에서 출렁이며 유지
  softCapRamp: number; // >0이면 수용한계를 이 틱 동안 L자(느림→폭발)로 키움(문명사 성장곡선). 0=상수
  localCap: number; // >0이면 '지역(격자 셀)별' 수용한계 — 한 지역이 차도 빈 지역은 따로 자람(균등 성장). softCap 대신 사용.
  areaCap: boolean; // localCap을 셀 면적(cos위도)으로 보정 — 극지방 과밀(격자 인공물) 방지
  spontaneous: number; // 내재 활동: 매 틱 노드가 스스로 발화 시도할 확률(0=순수 자극반응)
  hormoneProb: number; // 호르몬 분비 확률(0=끔)
  hormoneRelease: number; // 분비 시 mod 증가량
  hormoneDecay: number; // mod 감쇠(느림 → 오래 유지)
  diffuseRate: number; // mod 로컬 시냅스 확산율(천천히)
  routeDiffuse: number; // mod 노선(축삭) 확산율(멀리 확 점프)
  modDrive: number; // mod가 흥분성에 더하는 양
  fatigueGain: number; // 발화 시 피로 증가(0=끔)
  fatigueRecover: number; // 피로 회복(곱, <1)
  fatigueK: number; // 피로가 임계값을 올리는 정도
  homeoRate: number; // 항상성 시냅스 스케일링 속도(0=끔)
  homeoTarget: number; // 노드별 입력 |w| 합 목표
  pandemic: boolean; // SIR 전염 파동(확산성 탈분극) 켜기
  infectRate: number; // 감염 노드가 연결된 취약 노드를 감염시킬 확률/틱
  recoverTicks: number; // 감염(I)→회복(R) 기간
  immuneTicks: number; // 회복(R)→취약(S) 기간(면역 소실 → 재유행 가능)
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
  maxAge: 0, // 기본 불멸(옛 버전 유지) — 시나리오(실시간·창세)에서만 켬
  softCap: 0, // 기본 끔
  softCapRamp: 0, // 기본 상수(램프 없음)
  localCap: 0, // 기본 끔(글로벌 softCap 사용)
  areaCap: false, // 기본 끔(평면 셀 한계)
  spontaneous: 0,
  hormoneProb: 0,
  hormoneRelease: 6, // 드물지만 크게 (무작위 이벤트)
  hormoneDecay: 0.996, // 번졌다 서서히 사라짐(누적 침수 방지, 그래도 스파이크보다 한참 김)
  diffuseRate: 0.08, // 로컬은 천천히
  routeDiffuse: 0.42, // 노선(축삭)으로는 멀리 확 점프
  modDrive: 0.28,
  fatigueGain: 0, // 기본 끔(버전에서 켬)
  fatigueRecover: 0.985,
  fatigueK: 0.7,
  homeoRate: 0, // 기본 끔(버전에서 켬)
  homeoTarget: 2.2,
  pandemic: false,
  infectRate: 0.06, // I→S 감염 확률/틱(파동이 천천히 기어가게)
  recoverTicks: 90, // 감염 기간
  immuneTicks: 600, // 면역 기간(이후 재취약 → 재유행)
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
  frozen = false; // 대봉쇄 — true면 활동·발화·생멸 정지(팬데믹 멸종 클라이맥스). 활동만 사그라들고 그 자리에 언다
  metrics: EMetrics = { tick: 0, nodes: 0, synapses: 0, firing: 0, births: 0, deaths: 0, hormone: 0 };

  private rng: () => number;
  private freeNodes: number[] = [];
  private freeSyns: number[] = [];
  private aliveNodeIdx: number[] = []; // 살아있는 노드 인덱스(스캔용)
  private bornCount = 0; // step 사이 탄생 수
  private edges = new Set<number>(); // 연결 쌍 O(1) 조회
  private inSum!: Float32Array; // 항상성용 노드별 입력 |w| 합
  private cellCount = new Int32Array(GLAT * GLON); // 격자 셀별 살아있는 노드 수(로컬 밀도)

  private cellOf(lat: number, lon: number): number {
    let la = Math.floor((lat + 90) / 10);
    la = la < 0 ? 0 : la >= GLAT ? GLAT - 1 : la;
    let lo = Math.floor((lon + 180) / 10) % GLON;
    if (lo < 0) lo += GLON;
    return la * GLON + lo;
  }

  /** 이 위도에서의 셀 수용한계 — areaCap이면 면적(cos위도)으로 보정(극지방 과밀 방지) */
  private cellCapAt(lat: number): number {
    return this.cfg.areaCap
      ? this.cfg.localCap * Math.max(0.12, Math.cos(lat / DEG))
      : this.cfg.localCap;
  }

  private ekey(i: number, j: number): number {
    return i < j ? i * this.cfg.maxNodes + j : j * this.cfg.maxNodes + i;
  }

  constructor(cfg: Partial<EConfig> = {}) {
    this.cfg = { ...EMERGENT_DEFAULT, ...cfg };
    this.rng = mulberry32(this.cfg.seed);
    this.inSum = new Float32Array(this.cfg.maxNodes);
    this.nodes = Array.from({ length: this.cfg.maxNodes }, () => this.blankNode());
    this.syns = Array.from({ length: this.cfg.maxSyn }, () => ({
      alive: false, i: 0, j: 0, w: 0, sign: 1, act: 0, use: 0, route: false, grow: 1,
    }));
    for (let i = this.cfg.maxNodes - 1; i >= 0; i--) this.freeNodes.push(i);
    for (let i = this.cfg.maxSyn - 1; i >= 0; i--) this.freeSyns.push(i);
  }

  private blankNode(): ENode {
    return {
      alive: false, x: 0, y: 0, z: 0, lat: 0, lon: 0, a: 0, inj: 0, vitality: 0,
      type: 1, threshold: 0.55, refrac: 0, fired: false, flash: 0, lastActive: 0, deg: 0,
      mod: 0, fatigue: 0, born: 0, maxAge: 0, immortal: false, inf: 0, infT: 0,
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
    n.a = activation; n.inj = 0; n.vitality = 0.1; n.mod = 0; n.fatigue = 0;
    n.type = this.rng() < this.cfg.inhibitoryRatio ? -1 : 1;
    n.threshold = this.cfg.threshold * (0.85 + this.rng() * 0.3);
    n.refrac = 0; n.fired = false; n.flash = 0;
    n.lastActive = this.tick; n.deg = 0;
    n.born = this.tick;
    n.immortal = false;
    // 절대 수명 — 개체마다 다르게(0.6~1.4×) 흩어 한꺼번에 안 죽게(자연스러운 턴오버)
    n.maxAge = this.cfg.maxAge > 0 ? this.cfg.maxAge * (0.6 + this.rng() * 0.8) : 0;
    n.inf = 0; n.infT = 0; // 새 노드는 취약(S)
    this.cellCount[this.cellOf(lat, lon)]++;
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
    s.use = 0;
    s.route = route;
    s.grow = route ? 0 : 1; // 노선은 0에서 시작해 점진적으로 그어짐
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
    this.cellCount[this.cellOf(n.lat, n.lon)]--;
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

  /** 8대 문명 등 '영속 앵커'를 특정 위치에 심는다. 바로 그 자리에 새 노드(없으면 아주 가까운 걸 승격).
   *  캡이 가득 차면 가장 약한 mortal 하나를 비워서라도 반드시 심는다 — 문명은 빠지면 안 되니까.
   *  나이·비활성으로도 죽지 않는다(영원한 거점). */
  birthAnchor(lat: number, lon: number): number {
    const [x, y, z] = latLonToUnit(lat, lon);
    let idx = this.nearest(x, y, z, Math.cos(0.04)); // 거의 같은 자리에 노드 있으면 승격
    if (idx < 0) {
      idx = this.birth(lat, lon, 0.9);
      if (idx < 0 && this.evictWeakestMortal()) idx = this.birth(lat, lon, 0.9);
      if (idx < 0) return -1;
    }
    const n = this.nodes[idx];
    n.immortal = true;
    n.vitality = Math.max(n.vitality, 0.9); // 앵커는 큰 허브
    n.lastActive = this.tick;
    return idx;
  }

  /** 캡이 가득 찼을 때 앵커 자리 확보용 — 가장 활력 낮은 mortal 노드를 죽인다. */
  private evictWeakestMortal(): boolean {
    let worst = -1;
    let worstV = Infinity;
    for (let k = 0; k < this.aliveNodeIdx.length; k++) {
      const idx = this.aliveNodeIdx[k];
      const n = this.nodes[idx];
      if (n.immortal) continue;
      if (n.vitality < worstV) {
        worstV = n.vitality;
        worst = idx;
      }
    }
    if (worst < 0) return false;
    this.killNode(worst);
    return true;
  }

  /** 현재 유효 수용한계 — softCapRamp>0이면 L자(느림→폭발)로 키운 값(문명사 성장곡선) */
  private effSoftCap(): number {
    const { softCap, softCapRamp } = this.cfg;
    if (softCap <= 0) return 0;
    if (softCapRamp <= 0) return softCap;
    const p = Math.min(1, this.tick / softCapRamp);
    return softCap * (p * p * p); // 세제곱 → 느린 시작, 폭발적 끝
  }

  /** 탄생 '속도' 배율 — 로컬 모드(localCap)에서 softCapRamp를 시간 L자 페이스로(밀도 게이트 아님).
   *  초반 느림 → 후반 전속. 밀도는 로컬 셀이 따로 잡으므로 균등성은 유지된다. */
  private birthPace(): number {
    if (this.cfg.localCap <= 0 || this.cfg.softCapRamp <= 0) return 1;
    const p = Math.min(1, this.tick / this.cfg.softCapRamp);
    return p * p;
  }

  /** 팬데믹 — (위도,경도) 근처 가장 가까운 노드를 '감염(I)'으로 씨앗(우한 발). */
  seedInfection(lat: number, lon: number) {
    const [x, y, z] = latLonToUnit(lat, lon);
    const idx = this.nearest(x, y, z, Math.cos(0.5));
    if (idx >= 0) {
      this.nodes[idx].inf = 1;
      this.nodes[idx].infT = 0;
    }
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
    } else if (Math.abs(strength) > 0.15) {
      // 밀도 의존 탄생률. localCap>0면 '그 셀'의 밀도로(지역 균등), 아니면 글로벌 (램프된) softCap.
      let reg: number;
      if (this.cfg.localCap > 0) {
        reg = 1 - this.cellCount[this.cellOf(lat, lon)] / this.cellCapAt(lat);
      } else {
        const cap = this.effSoftCap();
        reg = cap > 0 ? 1 - this.aliveNodeIdx.length / cap : 1;
      }
      if (reg > 0 && this.rng() < this.cfg.birthProb * reg * this.birthPace())
        this.birth(lat, lon, Math.abs(strength));
    }
  }

  // 한 틱 = 아래 단계들을 정해진 순서로(각 단계는 동작 보존 순수 추출).
  // 호출 순서·공유버퍼(input·fired·aliveNodeIdx)·rng 소비 순서는 절대 바꾸지 말 것 —
  // 1틱이라도 어긋나면 같은 seed라도 망이 달라져 옛 버전 재현이 깨진다.
  step() {
    // 살아있는 노드 목록 갱신(이 틱 내내 쓰는 스냅샷)
    this.aliveNodeIdx.length = 0;
    for (let i = 0; i < this.nodes.length; i++) if (this.nodes[i].alive) this.aliveNodeIdx.push(i);
    if (this.frozen) { this.freezeStep(); return; } // 대봉쇄 — 모든 활동 정지(아래 단계 건너뜀)
    if (this.cfg.homeoRate > 0) this.inSum.fill(0);

    const input = new Map<number, number>();
    this.synapseInput(input);                       // 1) 시냅스 입력·약화/사멸·호르몬 확산
    this.homeostasis();                             // 항상성(시냅스 스케일링)
    const fired: number[] = [];
    const firing = this.updateNodes(input, fired);  // 2) 노드 갱신·발화/불응·활력
    this.releaseHormone();                          // 호르몬(문화) 분비
    this.hebbian();                                 // 3) 헤브 가소성
    this.synaptogenesis(fired);                     // 4) 시냅토제네시스
    this.dendriticGrowth(fired);                    // 4b) 수상돌기 성장
    const deaths = this.reaping();                  // 5) 죽음(비활성·수명)
    if (this.cfg.pandemic) this.pandemicStep();     // 6) SIR 전염 파동

    this.tick++;
    let nodeCount = 0, synCount = 0, modSum = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].alive) { nodeCount++; modSum += this.nodes[i].mod; }
    }
    for (let s = 0; s < this.syns.length; s++) if (this.syns[s].alive) synCount++;
    this.metrics = { tick: this.tick, nodes: nodeCount, synapses: synCount, firing, births: this.bornCount, deaths, hormone: modSum };
    this.bornCount = 0;
  }

  /** 1) 시냅스 입력 누적 + 전역 약화/사멸 + 문화(호르몬) 비보존 전파 */
  private synapseInput(input: Map<number, number>) {
    const { prune, minW, diffuseRate, routeDiffuse, homeoRate } = this.cfg;
    for (let s = 0; s < this.syns.length; s++) {
      const e = this.syns[s];
      if (!e.alive) continue;
      if (e.route && e.grow < 1) e.grow = Math.min(1, e.grow + 0.04); // 노선 점진적 연결(~25틱)
      if (this.nodes[e.i].fired) {
        input.set(e.j, (input.get(e.j) ?? 0) + e.sign * e.w);
        e.act = 1;
        e.use += 0.05; // 쓰일 때마다 굵어짐
      } else {
        e.act *= 0.8;
      }
      e.use *= 0.9996; // 아주 천천히 가늘어짐
      if (e.use > 5) e.use = 5; // 소프트 캡(너무 과하진 않게)
      if (homeoRate > 0) this.inSum[e.j] += e.w < 0 ? -e.w : e.w;
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
  }

  /** 항상성(시냅스 스케일링) — 노드별 입력 총량을 목표로 천천히 정규화(폭주·포화 방지) */
  private homeostasis() {
    const { homeoRate, homeoTarget } = this.cfg;
    if (homeoRate <= 0) return;
    for (let s = 0; s < this.syns.length; s++) {
      const e = this.syns[s];
      if (!e.alive) continue;
      const sum = this.inSum[e.j];
      if (sum > 0.01) {
        let f = homeoTarget / sum;
        if (f > 2) f = 2;
        else if (f < 0.5) f = 0.5;
        e.w *= 1 - homeoRate + homeoRate * f;
      }
    }
  }

  /** 2) 노드 갱신 + 발화/불응 + 활력. fired에 발화 노드 인덱스를 채우고 발화 수를 반환 */
  private updateNodes(input: Map<number, number>, fired: number[]): number {
    const { decay, refractoryTicks, spontaneous, hormoneDecay, modDrive, fatigueRecover, fatigueK, fatigueGain } = this.cfg;
    let firing = 0;
    for (let k = 0; k < this.aliveNodeIdx.length; k++) {
      const idx = this.aliveNodeIdx[k];
      const nd = this.nodes[idx];
      if (nd.refrac > 0) {
        nd.refrac--;
        nd.fired = false;
        nd.a *= decay * 0.5;
        nd.flash *= 0.88;
        nd.vitality *= 0.99;
        nd.mod *= hormoneDecay;
        nd.fatigue *= fatigueRecover;
        nd.inj = 0;
        continue;
      }
      // 내재 활동 — 자극이 없어도 스스로 발화를 시작(살아있는 뇌)
      if (spontaneous > 0 && this.rng() < spontaneous) nd.inj += 0.7;
      // 호르몬 — 흥분성을 끌어올림(오래 유지)
      nd.mod *= hormoneDecay;
      if (nd.mod > 0) nd.inj += nd.mod * modDrive;
      nd.fatigue *= fatigueRecover; // 피로 회복
      let a = nd.a * decay + (input.get(idx) ?? 0) + nd.inj;
      nd.inj = 0;
      if (a < 0) a = 0;
      // 피로하면 임계값이 올라가 잘 안 터짐(과사용→쉼→활동이 옮겨다님)
      if (a >= nd.threshold + nd.fatigue * fatigueK) {
        nd.fired = true;
        nd.refrac = refractoryTicks;
        nd.a = 0;
        nd.flash = 1;
        nd.lastActive = this.tick;
        nd.vitality = Math.min(1.6, nd.vitality + 0.18);
        nd.fatigue += fatigueGain;
        firing++;
        fired.push(idx);
      } else {
        nd.fired = false;
        nd.a = a > 1.5 ? 1.5 : a;
        nd.flash *= 0.88;
        nd.vitality *= 0.99;
      }
    }
    return firing;
  }

  /** 호르몬(문화) 분비 — 어디서든 무작위로 한 노드에서 release(특정 위치 편향 X).
   *  확산은 synapseInput이 처리 → 노선 타고 멀리 번짐. */
  private releaseHormone() {
    const { hormoneProb, hormoneRelease } = this.cfg;
    if (hormoneProb > 0 && this.rng() < hormoneProb && this.aliveNodeIdx.length > 0) {
      const origin = this.aliveNodeIdx[Math.floor(this.rng() * this.aliveNodeIdx.length)];
      this.nodes[origin].mod += hormoneRelease;
    }
  }

  /** 3) 헤브 가소성 — 함께 발화한 쌍 강화(LTP), 한쪽만 발화하면 약화(LTD) */
  private hebbian() {
    const { ltp, ltd } = this.cfg;
    for (let s = 0; s < this.syns.length; s++) {
      const e = this.syns[s];
      if (!e.alive || !this.nodes[e.i].fired) continue;
      if (this.nodes[e.j].fired) e.w += ltp * (1 - e.w);
      else e.w -= ltd * e.w;
      if (e.w < 0) e.w = 0;
    }
  }

  /** 4) 시냅토제네시스 — 발화 노드가 가까운 발화/활성 노드로 연결 */
  private synaptogenesis(fired: number[]) {
    const { connectRadius, connectProb, maxDeg } = this.cfg;
    const cosC = Math.cos(connectRadius);
    for (let f = 0; f < fired.length; f++) {
      const i = fired[f];
      const ni = this.nodes[i];
      if (ni.deg >= maxDeg || this.rng() >= connectProb) continue;
      const j = this.nearest(ni.x, ni.y, ni.z, cosC, i);
      if (j >= 0 && this.nodes[j].deg < maxDeg && !this.hasEdge(i, j)) this.connect(i, j);
    }
  }

  /** 4b) 수상돌기 성장 — 허브(고활력)가 가까이에 자식 노드를 낳음(밀도 의존 자기조절) */
  private dendriticGrowth(fired: number[]) {
    const { growthProb, growthOffset, maxDeg } = this.cfg;
    const localMode = this.cfg.localCap > 0;
    const gcap = this.effSoftCap();
    const globalGrowReg = gcap > 0 ? Math.max(0, 1 - this.aliveNodeIdx.length / gcap) : 1;
    const pace = this.birthPace();
    for (let f = 0; f < fired.length; f++) {
      const i = fired[f];
      const ni = this.nodes[i];
      if (ni.vitality < 0.45 || ni.deg >= maxDeg) continue;
      // 로컬 모드면 부모 셀 밀도로 게이트 → 빽빽한 지역은 더 안 낳음(균등)
      const gr = localMode
        ? Math.max(0, 1 - this.cellCount[this.cellOf(ni.lat, ni.lon)] / this.cellCapAt(ni.lat))
        : globalGrowReg;
      if (this.rng() >= growthProb * gr * pace || this.freeNodes.length === 0) continue;
      const ox = ni.x + (this.rng() - 0.5) * growthOffset * 2;
      const oy = ni.y + (this.rng() - 0.5) * growthOffset * 2;
      const oz = ni.z + (this.rng() - 0.5) * growthOffset * 2;
      const m = Math.hypot(ox, oy, oz) || 1;
      const [clat, clon] = unitToLatLon(ox / m, oy / m, oz / m);
      const child = this.birth(clat, clon, 0.7);
      if (child >= 0) this.connect(i, child);
    }
  }

  /** 5) 죽음 — (a) 오래 비활성, 또는 (b) 절대 수명 초과(활동과 무관·턴오버). 죽은 수 반환 */
  private reaping(): number {
    const { nodeLifespan } = this.cfg;
    let deaths = 0;
    for (let k = 0; k < this.aliveNodeIdx.length; k++) {
      const idx = this.aliveNodeIdx[k];
      const nd = this.nodes[idx];
      if (nd.immortal) continue; // 불멸 앵커 — 나이·비활성으로도 안 죽음
      const tooIdle = this.tick - nd.lastActive > nodeLifespan;
      const tooOld = nd.maxAge > 0 && this.tick - nd.born > nd.maxAge;
      if (tooIdle || tooOld) {
        this.killNode(idx);
        deaths++;
      }
    }
    return deaths;
  }

  /** 6) 팬데믹 — SIR 전염 파동(확산성 탈분극). 노선(비행)을 타고 대륙으로 번지고 뒤에 회복 자국. */
  private pandemicStep() {
    const { infectRate, recoverTicks, immuneTicks } = this.cfg;
    // 전파: alive 시냅스(노선 포함) 양 끝, 자리잡은 I(infT>0)가 연결된 S를 감염(같은 틱 연쇄 방지)
    for (let s = 0; s < this.syns.length; s++) {
      const e = this.syns[s];
      if (!e.alive) continue;
      const a = this.nodes[e.i];
      const b = this.nodes[e.j];
      if (a.inf === 1 && a.infT > 0 && b.inf === 0 && this.rng() < infectRate) { b.inf = 1; b.infT = 0; }
      else if (b.inf === 1 && b.infT > 0 && a.inf === 0 && this.rng() < infectRate) { a.inf = 1; a.infT = 0; }
    }
    // 상태 전이 I→R→S
    let infected = 0;
    for (let k = 0; k < this.aliveNodeIdx.length; k++) {
      const nd = this.nodes[this.aliveNodeIdx[k]];
      if (nd.inf === 1) {
        if (++nd.infT > recoverTicks) { nd.inf = 2; nd.infT = 0; } else infected++;
      } else if (nd.inf === 2) {
        if (++nd.infT > immuneTicks) { nd.inf = 0; nd.infT = 0; }
      }
    }
    // 씨앗 — 감염자 0이면 우한에서 새 파동(변이)
    if (infected === 0 && this.aliveNodeIdx.length > 20) this.seedInfection(30.6, 114.3);
  }

  /** 대봉쇄 — 모든 활동이 멈춘 정지 상태. 발화·생멸 없이 활동만 사그라들고 노드는 그 자리에 언다. */
  private freezeStep() {
    for (let k = 0; k < this.aliveNodeIdx.length; k++) {
      const nd = this.nodes[this.aliveNodeIdx[k]];
      nd.fired = false;
      nd.a *= 0.82; // 활동 빠르게 사그라듦(거리 텅 빔)
      nd.flash *= 0.82;
      nd.inj = 0;
    }
    for (let s = 0; s < this.syns.length; s++) {
      const e = this.syns[s];
      if (e.alive) e.act *= 0.82; // 신호 흐름 멎음(노선 펄스 꺼짐 → 비행 정지)
    }
    this.tick++;
    let nodeCount = 0, synCount = 0, modSum = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].alive) { nodeCount++; modSum += this.nodes[i].mod; }
    }
    for (let s = 0; s < this.syns.length; s++) if (this.syns[s].alive) synCount++;
    this.metrics = { tick: this.tick, nodes: nodeCount, synapses: synCount, firing: 0, births: 0, deaths: 0, hormone: modSum };
    this.bornCount = 0;
  }

  /** 클라이맥스 — 살아있는 모든 노드를 감염(I)으로(삽시간에 전부 빨강). */
  infectAll() {
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.alive && n.inf !== 1) { n.inf = 1; n.infT = 1; }
    }
  }
}
