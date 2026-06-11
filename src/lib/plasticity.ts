import { mulberry32 } from "./seededRng";

// ─────────────────────────────────────────────────────────────
// 신경 가소성 엔진 (작년 NEURO-SIM v7.2의 헤브 모델을 구 스케일로 확장)
//
//   · 구면 위 노드(신경절) + k-최근접 시냅스
//   · 신호가 (위도,경도)에 자극을 주입 → 흥분 전파(파동)
//   · 흥분/억제 노드가 발화를 반복, 발화 후 불응기
//   · 헤브 학습: 함께 발화한 연결은 강화(LTP), pre만 발화하면 약화(LTD)
//   · 시냅스 스케일링(항상성): 노드별 입력 총량을 일정하게 정규화
//     → 폭주(발작)도 침묵도 없이, 자주 쓰인 경로만 굵어지는 가소성이 보인다
//
// 순수 TypeScript (외부 의존 0) — 어떤 렌더러/신호와도 결합 가능.
// ─────────────────────────────────────────────────────────────

export type NodeType = "exc" | "inh";

export interface NeuronNode {
  lat: number;
  lon: number;
  /** 단위 구면 좌표 (반지름 1) */
  x: number;
  y: number;
  z: number;
  type: NodeType;
  /** 활성도 */
  a: number;
  threshold: number;
  /** 직전 step 발화 여부 */
  fired: boolean;
  /** 남은 불응기 틱 */
  refrac: number;
  /** 시각화용 발화 잔광 0..1 */
  flash: number;
  /** 활력(누적 활동) = 노드 크기. 자주 쓰이면 자라고(허브), 안 쓰이면 점으로 줄어듦 */
  vitality: number;
}

export interface Synapse {
  i: number; // pre
  j: number; // post
  w: number; // 0..wMax (학습된 강도)
  sign: number; // +1 흥분 / -1 억제 (pre 타입 기반, 고정)
  act: number; // 0..1 최근 신호 통과(시각화용) — 안 쓰면 빠르게 식음
}

export interface PlasticityConfig {
  nodeCount: number;
  neighbors: number;
  inhibitoryRatio: number;
  wMax: number;
  /** 활성 누설(곱) */
  decay: number;
  threshold: number;
  /** LTP 강화율 */
  ltp: number;
  /** LTD 약화율 */
  ltd: number;
  /** 미사용 연결 전역 가지치기율 */
  prune: number;
  /** 노드 위치 무작위 지터(도) */
  jitter: number;
  /** 발화 후 불응 틱 수 */
  refractoryTicks: number;
  /** 노드별 입력 가중치 |합| 정규화 목표(시냅스 스케일링) */
  targetDrive: number;
  /** 시간축 가지치기: 안 쓰인 시냅스를 더 빨리 시들게 + 죽은 건 재팽창에서 제외(약한 길이 진짜 사라짐) */
  decayPrune: boolean;
  seed: number;
}

export const DEFAULT_CONFIG: PlasticityConfig = {
  nodeCount: 620,
  neighbors: 6,
  inhibitoryRatio: 0.25,
  wMax: 1,
  decay: 0.85,
  threshold: 0.5,
  ltp: 0.04,
  ltd: 0.02,
  prune: 0.001,
  jitter: 4,
  refractoryTicks: 4,
  targetDrive: 1.8,
  decayPrune: false,
  seed: 20260611,
};

export interface PlasticityMetrics {
  tick: number;
  totalActivation: number;
  meanWeight: number;
  firing: number;
  plasticityEvents: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const DEG = 180 / Math.PI;

export class PlasticityNetwork {
  readonly cfg: PlasticityConfig;
  nodes: NeuronNode[] = [];
  synapses: Synapse[] = [];
  tick = 0;
  metrics: PlasticityMetrics = {
    tick: 0,
    totalActivation: 0,
    meanWeight: 0,
    firing: 0,
    plasticityEvents: 0,
  };

  private rng: () => number;
  private injected: Float32Array;
  /** post 노드별 incoming 시냅스 인덱스 (시냅스 스케일링용) */
  private incoming: number[][] = [];

  constructor(cfg: Partial<PlasticityConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.rng = mulberry32(this.cfg.seed);
    this.injected = new Float32Array(this.cfg.nodeCount);
    this.build();
  }

  private build() {
    const { nodeCount: N, neighbors, inhibitoryRatio, threshold } = this.cfg;

    for (let k = 0; k < N; k++) {
      const yk = 1 - (k / (N - 1)) * 2;
      let lat = Math.asin(yk) * DEG;
      let lon = (k * GOLDEN_ANGLE * DEG) % 360;
      if (lon > 180) lon -= 360;
      // 무작위 지터(격자 느낌 완화)
      lat += (this.rng() - 0.5) * this.cfg.jitter;
      lon += (this.rng() - 0.5) * this.cfg.jitter;
      lat = Math.max(-89, Math.min(89, lat));
      // latLonToVec3와 동일 규약 → injectStimulus·지구 텍스처와 정렬
      const phi = (90 - lat) / DEG;
      const th = (lon + 180) / DEG;
      const x = -Math.sin(phi) * Math.cos(th);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(th);
      this.nodes.push({
        lat,
        lon,
        x,
        y,
        z,
        type: this.rng() < inhibitoryRatio ? "inh" : "exc",
        a: 0,
        threshold: threshold * (0.85 + this.rng() * 0.3),
        fired: false,
        refrac: 0,
        flash: 0,
        vitality: 0,
      });
    }

    this.incoming = Array.from({ length: N }, () => []);
    for (let i = 0; i < N; i++) {
      const a = this.nodes[i];
      const dists: { j: number; d: number }[] = [];
      for (let j = 0; j < N; j++) {
        if (j === i) continue;
        const b = this.nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        dists.push({ j, d: dx * dx + dy * dy + dz * dz });
      }
      dists.sort((p, q) => p.d - q.d);
      for (let n = 0; n < neighbors; n++) {
        const j = dists[n].j;
        const idx = this.synapses.length;
        this.synapses.push({
          i,
          j,
          w: 0.1 + this.rng() * 0.3,
          sign: a.type === "inh" ? -1 : 1,
          act: 0,
        });
        this.incoming[j].push(idx);
      }
    }
    this.normalize();
  }

  /** 노드별 incoming |w| 합을 targetDrive로 맞춤 (항상성) */
  private normalize() {
    const { targetDrive, decayPrune } = this.cfg;
    const DEAD = 0.02; // 이 아래는 '죽은' 시냅스
    for (let j = 0; j < this.nodes.length; j++) {
      const inc = this.incoming[j];
      if (decayPrune) {
        // 죽은 시냅스(거의 0)는 재팽창에서 제외 → 안 쓰인 길은 진짜 사라지고, 산 길만 예산을 나눠 가짐
        let aliveSum = 0;
        for (let n = 0; n < inc.length; n++) {
          const w = Math.abs(this.synapses[inc[n]].w);
          if (w >= DEAD) aliveSum += w;
        }
        if (aliveSum > 1e-6) {
          const f = targetDrive / aliveSum;
          for (let n = 0; n < inc.length; n++) {
            const e = this.synapses[inc[n]];
            if (Math.abs(e.w) >= DEAD) e.w *= f; // 죽은 건 그대로 계속 시듦
          }
        }
      } else {
        let sum = 0;
        for (let n = 0; n < inc.length; n++) sum += Math.abs(this.synapses[inc[n]].w);
        if (sum > 1e-6) {
          const f = targetDrive / sum;
          for (let n = 0; n < inc.length; n++) this.synapses[inc[n]].w *= f;
        }
      }
    }
  }

  /** (위도,경도) 근처 노드에 자극 주입 (각거리 radiusRad 안에서 감쇠) */
  injectStimulus(lat: number, lon: number, strength: number, radiusRad = 0.28) {
    const phi = (90 - lat) / DEG;
    const theta = (lon + 180) / DEG;
    const sx = -Math.sin(phi) * Math.cos(theta);
    const sy = Math.cos(phi);
    const sz = Math.sin(phi) * Math.sin(theta);
    const cosR = Math.cos(radiusRad);
    for (let n = 0; n < this.nodes.length; n++) {
      const nd = this.nodes[n];
      const dot = nd.x * sx + nd.y * sy + nd.z * sz;
      if (dot > cosR) this.injected[n] += strength * ((dot - cosR) / (1 - cosR));
    }
  }

  /** 한 틱: 전파 → 발화/불응 → 헤브 가소성 → 시냅스 스케일링 → 지표 */
  step() {
    const { decay, wMax, ltp, ltd, prune, refractoryTicks, decayPrune } = this.cfg;
    const nodes = this.nodes;
    const syn = this.synapses;
    const N = nodes.length;

    const prevFired = new Uint8Array(N);
    for (let n = 0; n < N; n++) prevFired[n] = nodes[n].fired ? 1 : 0;

    // 1) 입력 누적 + 전역 가지치기
    const input = new Float32Array(N);
    for (let s = 0; s < syn.length; s++) {
      const e = syn[s];
      if (prevFired[e.i]) {
        input[e.j] += e.sign * e.w;
        e.act = 1; // 신호가 이 연결을 지나감
      } else {
        e.act *= 0.8; // 안 지나면 빠르게 식음 → idle은 사라짐
      }
      // 시간축 가지치기: 쓰인 길(e.act 큼)은 안 깎고, 안 쓰인 길은 4배 빨리 시들게 → use-it-or-lose-it
      if (decayPrune) e.w *= e.act > 0.5 ? 1 : 1 - prune * 4;
      else e.w *= 1 - prune;
    }

    // 2) 활성 갱신 + 발화/불응
    let totalA = 0;
    let firing = 0;
    for (let n = 0; n < N; n++) {
      const nd = nodes[n];
      if (nd.refrac > 0) {
        nd.refrac--;
        nd.fired = false;
        nd.a *= decay * 0.5;
        nd.flash *= 0.88;
        nd.vitality *= 0.997;
        this.injected[n] = 0;
        totalA += nd.a;
        continue;
      }
      let a = nd.a * decay + input[n] + this.injected[n];
      this.injected[n] = 0;
      if (a < 0) a = 0;
      if (a >= nd.threshold) {
        nd.fired = true;
        nd.refrac = refractoryTicks;
        nd.a = 0;
        nd.flash = 1;
        firing++;
      } else {
        nd.fired = false;
        nd.a = a > 1.5 ? 1.5 : a;
        nd.flash *= 0.88;
      }
      nd.vitality = nd.fired
        ? Math.min(1.6, nd.vitality + 0.18)
        : nd.vitality * 0.997;
      totalA += nd.a;
    }

    // 3) 헤브 가소성 (pre가 쏜 시냅스만)
    let events = 0;
    for (let s = 0; s < syn.length; s++) {
      const e = syn[s];
      if (!prevFired[e.i]) continue;
      if (nodes[e.j].fired) e.w += ltp * (wMax - e.w);
      else e.w -= ltd * e.w;
      if (e.w < 0) e.w = 0;
      events++;
    }

    // 4) 시냅스 스케일링(항상성) → 폭주/침묵 방지, 상대적 굵기만 변함
    this.normalize();

    let wSum = 0;
    for (let s = 0; s < syn.length; s++) wSum += syn[s].w;

    this.tick++;
    this.metrics = {
      tick: this.tick,
      totalActivation: totalA,
      meanWeight: syn.length ? wSum / syn.length : 0,
      firing,
      plasticityEvents: events,
    };
  }
}
