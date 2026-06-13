import type { EmergentNetwork } from "./emergent";

// ─────────────────────────────────────────────────────────────
// 제3차 세계대전 '대격변' 시네마틱 디렉터.
//   가득 차오른 분주한 세계(≈7000 노드) → 한순간의 전쟁(열에 아홉이 몰살, 1할만 생존, 하늘길도 그 순간 싹 걷힘) →
//   잿더미의 정적(살아남은 선이 보라색으로 물든 채 완전 정지 — 회전마저 멎고 카메라가 천천히 다가감) →
//   재건(멈춤이 풀리고, 남은 1할에서 망이 천천히 다시 자라난다 — 하늘길도 다시 열림).
//   '회복'은 스크립트로 안 짠다 — 재건은 엔진의 헤브 성장에서 emergent하게 나온다.
//   디렉터는 타격(net.decimate)·하늘길 정리(net.clearRoutes)·정적(net.frozen)만 걸고, 재배선엔 손 안 댐.
//   config.traumaArc(통합 버전 '전쟁' 모드)일 때만 구동.
// ─────────────────────────────────────────────────────────────

export type TraumaPhase = "calm" | "impact" | "silence" | "rewire";

export interface TraumaHud {
  phase: TraumaPhase;
  big: string;        // 큰 자막
  caption: string;    // 한 줄 내레이션
  camDist: number;    // 돌리 목표 거리
  spin: number;       // 자동회전 속도(정적 땐 0 → 회전마저 멎음)
  nodeScale: number;  // 자극 세기(정적 땐 0 → 새 노드 안 태어남)
  routeScale: number; // 항공편(노선) 주입 비율 — 전쟁~정적엔 0(새 비행 없음)
  flash: number;      // 전쟁 섬광 0..1
  frozen: boolean;    // 엔진 완전 정지(잿더미의 정적)
  mourn: boolean;     // 살아남은 선을 보라색으로
  done: boolean;      // 재건 충분히 보여준 뒤 → 실시간(라이브)로 핸드오프
}

const KEEP = 0.1;        // 생존 비율 — 열에 하나만 남기고 다 죽인다
const SPIN_BASE = 0.25;  // 평소 자동회전 속도(useUI.BASE_SPIN과 일치)

const lerp = (a: number, b: number, t: number) =>
  a + (b - a) * Math.max(0, Math.min(1, t));

export class TraumaDirector {
  phase: TraumaPhase = "calm";
  private t0 = 0;
  private started = false;
  private struck = false;

  // 튜닝(틱 ≈ 프레임, ~60fps)
  private CALM_NODES = 6800; // 이만큼 가득 차오르면 → 전쟁
  private CALM_MAX = 9000;   // 그래도 안 차면 강제 진행(~150초 상한)
  private IMPACT_HOLD = 70;  // 타격 직후 섬광·devastation 노출(~1.2초)
  private SILENCE = 600;     // 잿더미의 정적 — 보라색 선으로 완전 정지(~10초)
  private REWIRE = 3600;     // 재건 관찰(~60초) — 남은 1할에서 망이 천천히 다시 자라는 걸 보여줌

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
    let flash = 0;
    let frozen = false;
    let mourn = false;
    let done = false;

    switch (this.phase) {
      case "calm": {
        net.cfg.pandemic = false; // 전쟁은 SIR 아님 — 평소 망이 가득 차오름(하늘길도 평소대로)
        caption = "그 어느 때보다 분주한 세계";
        if (net.metrics.nodes >= this.CALM_NODES || local >= this.CALM_MAX) {
          this.go("impact", tick);
        }
        break;
      }
      case "impact": {
        if (!this.struck) {
          net.decimate(KEEP);  // 한 방 — 열에 아홉이 몰살, 1할만 생존
          net.clearRoutes();   // 하늘길도 그 순간 싹 걷는다 — 미완성 아치가 얼어붙어 '머리카락'처럼 남는 것 방지
          this.struck = true;
        }
        routeScale = 0;        // 이후 새 비행도 없음(정적까지 빈 하늘 유지)
        flash = Math.max(0, 1 - local / 32); // 섬광 감쇠
        big = "전쟁";
        caption = "제3차 세계대전 — 한순간에 9할이 스러지다";
        camDist = 6.5;         // 와이드 유지 — 지구 전체가 한꺼번에 비는 걸 그대로 본다
        if (local >= this.IMPACT_HOLD) this.go("silence", tick);
        break;
      }
      case "silence": {
        // 잿더미의 정적 — 엔진 완전 정지 + 회전마저 멎고, 살아남은 선이 보라로 물든 채 카메라가 천천히 다가간다.
        frozen = true;
        mourn = true;
        nodeScale = 0;
        routeScale = 0;
        spin = 0;             // 회전 정지 — 진짜 고요
        camDist = lerp(6.5, 5.8, local / this.SILENCE); // 아주 느린 push-in(잔해로 다가감)
        big = "정적";
        caption = "잿더미 위, 숨죽인 채";
        if (local >= this.SILENCE) this.go("rewire", tick);
        break;
      }
      case "rewire": {
        // 정적이 풀리고 — 회전·하늘길이 돌아오고, 남은 1할에서 망이 천천히 다시 자라난다. 스크립트 없음.
        const p = local / this.REWIRE;
        camDist = lerp(5.8, 6.5, p); // 다시 천천히 물러나며 재건을 관조
        big = p < 0.5 ? "재건" : "";
        caption = "그래도, 남은 것에서 다시 이어진다";
        if (local >= this.REWIRE) done = true;
        break;
      }
    }

    net.frozen = frozen; // 잿더미의 정적 — 엔진 완전 정지(디렉터가 직접 건다, 팬데믹의 net.cfg 조작과 동일 패턴)
    return { phase: this.phase, big, caption, camDist, spin, nodeScale, routeScale, flash, frozen, mourn, done };
  }
}
