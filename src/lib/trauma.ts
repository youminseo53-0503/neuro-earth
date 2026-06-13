import type { EmergentNetwork } from "./emergent";

// ─────────────────────────────────────────────────────────────
// 제3차 세계대전 '대격변' 시네마틱 디렉터.
//   가득 찬 분주한 세계 → 폭탄 투하(위에서 섬광 줄기가 쏟아짐) → 착탄·전쟁(9할 몰살, 하늘길도 그 순간 싹 걷힘) →
//   잿더미의 정적(보라색 정지 → 2초 뒤 지구가 투명해져 신경계처럼 망만 우주에 뜸) →
//   재건(멈춤이 풀리고 남은 1할에서 망이 '천천히' 다시 자라난다 — 회복은 스크립트가 아니라 emergent).
//   디렉터는 폭탄·타격(decimate)·하늘길 정리(clearRoutes)·정적(frozen)·지구끄기만 걸고, 재배선엔 손 안 댐.
//   config.traumaArc('전쟁' 모드)일 때만 구동.
// ─────────────────────────────────────────────────────────────

export type TraumaPhase = "calm" | "incoming" | "impact" | "silence" | "rewire";

export interface TraumaHud {
  phase: TraumaPhase;
  big: string;
  caption: string;
  camDist: number;
  spin: number;       // 자동회전 속도(정적 땐 0)
  nodeScale: number;  // 자극 세기
  routeScale: number; // 항공편 주입 비율
  bombT: number;      // 폭탄 낙하 진행도 0..1 (incoming에서만 >0, 그 외 0)
  flash: number;      // 착탄 섬광 0..1
  frozen: boolean;    // 엔진 완전 정지(정적)
  mourn: boolean;     // 살아남은 선을 보라색으로
  earthOff: boolean;  // 지구 투명(신경계 느낌) — 정적 2초 뒤부터 재건까지
  done: boolean;      // 끝 → 실시간 핸드오프
}

const KEEP = 0.1;        // 생존 비율 — 열에 하나만 남긴다
const SPIN_BASE = 0.25;  // 평소 자동회전(useUI.BASE_SPIN과 일치)

const lerp = (a: number, b: number, t: number) =>
  a + (b - a) * Math.max(0, Math.min(1, t));

export class TraumaDirector {
  phase: TraumaPhase = "calm";
  private t0 = 0;
  private started = false;
  private struck = false;

  // 튜닝(틱 ≈ 프레임, ~60fps)
  private CALM_NODES = 6800;
  private CALM_MAX = 9000;
  private INCOMING = 78;    // 폭탄 낙하(~1.3초)
  private IMPACT_HOLD = 64; // 착탄 섬광·devastation 노출(~1.1초)
  private EARTH_OFF_AT = 120; // 정적 진입 2초 뒤 지구 투명
  private SILENCE = 600;    // 잿더미의 정적(~10초)
  private REWIRE = 5400;    // 재건 관찰(~90초) — 더 천천히 다시 자람

  reset() {
    this.phase = "calm";
    this.started = false;
    this.struck = false;
    this.t0 = 0;
  }

  private go(p: TraumaPhase, tick: number) {
    this.phase = p;
    this.t0 = tick;
  }

  update(net: EmergentNetwork): TraumaHud {
    const tick = net.tick;
    if (!this.started) {
      this.t0 = tick;
      this.started = true;
    }
    const local = tick - this.t0;

    let big = "";
    let caption = "";
    let camDist = 6.5;
    let spin = SPIN_BASE;
    let nodeScale = 1;
    let routeScale = 1;
    let bombT = 0;
    let flash = 0;
    let frozen = false;
    let mourn = false;
    let earthOff = false;
    let done = false;

    switch (this.phase) {
      case "calm": {
        net.cfg.pandemic = false;
        caption = "그 어느 때보다 분주한 세계";
        if (net.metrics.nodes >= this.CALM_NODES || local >= this.CALM_MAX) {
          this.go("incoming", tick);
        }
        break;
      }
      case "incoming": {
        // 폭탄 투하 — 위에서 섬광 줄기가 쏟아진다(아직 분주한 하늘 위로). 착탄 직전.
        bombT = local / this.INCOMING;
        caption = "—";
        camDist = 6.5;
        if (local >= this.INCOMING) this.go("impact", tick);
        break;
      }
      case "impact": {
        if (!this.struck) {
          net.decimate(KEEP);  // 착탄 — 열에 아홉이 몰살, 1할만 생존
          net.clearRoutes();   // 하늘길도 그 순간 싹 걷힘(미완성 아치 '머리카락' 방지)
          this.struck = true;
        }
        routeScale = 0;
        flash = Math.max(0, 1 - local / 34); // 착탄 섬광
        big = "전쟁";
        caption = "제3차 세계대전 — 한순간에 9할이 스러지다";
        camDist = 6.5;
        if (local >= this.IMPACT_HOLD) this.go("silence", tick);
        break;
      }
      case "silence": {
        // 잿더미의 정적 — 완전 정지 + 회전 멎음 + 보라. 2초 뒤 지구가 투명해져 신경계처럼 망만 남는다.
        frozen = true;
        mourn = true;
        nodeScale = 0;
        routeScale = 0;
        spin = 0;
        earthOff = local >= this.EARTH_OFF_AT;
        camDist = lerp(6.5, 5.8, local / this.SILENCE); // 아주 느린 push-in(잔해로 다가감)
        big = "정적";
        caption = "잿더미 위, 숨죽인 채";
        if (local >= this.SILENCE) this.go("rewire", tick);
        break;
      }
      case "rewire": {
        // 정적이 풀리고 — 지구는 투명한 채(신경계 느낌), 남은 1할에서 망이 '천천히' 다시 자란다.
        const p = local / this.REWIRE;
        earthOff = true; // 재건 내내 지구 투명 유지 — 망만 우주에 떠 자라남
        nodeScale = lerp(0.2, 1, Math.min(1, p * 1.5));   // 자극 서서히 — 재건을 더디게
        routeScale = lerp(0, 0.8, Math.min(1, p * 1.3));  // 하늘길도 서서히 다시 열림
        camDist = lerp(5.8, 6.6, p); // 천천히 물러나며 재건을 관조
        big = p < 0.4 ? "재건" : "";
        caption = "그래도, 남은 것에서 다시 이어진다";
        if (local >= this.REWIRE) done = true;
        break;
      }
    }

    net.frozen = frozen;
    return { phase: this.phase, big, caption, camDist, spin, nodeScale, routeScale, bombT, flash, frozen, mourn, earthOff, done };
  }
}
