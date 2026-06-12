import type { EmergentNetwork } from "./emergent";

// ─────────────────────────────────────────────────────────────
// 외상/전쟁 '대격변' 시네마틱 디렉터.
//   가득 차오른 분주한 세계(≈7000 노드) → 한순간의 타격(열에 아홉이 몰살, 열에 하나만 생존) →
//   디아시시스(살아남은 것들마저 잠시 가라앉음) → 재배선(남은 1할에서 망이 다시 자라난다).
//   '회복'은 스크립트로 짜지 않는다 — 재건은 엔진의 헤브 성장에서 emergent하게 나온다.
//   디렉터는 '타격'만 한 번 가하고(net.decimate), 카메라·자막·섬광으로 그 충격을 보여줄 뿐.
//   config.traumaArc(통합 버전 trauma 모드)일 때만 구동.
// ─────────────────────────────────────────────────────────────

export type TraumaPhase = "calm" | "impact" | "shock" | "rewire";

export interface TraumaHud {
  phase: TraumaPhase;
  big: string;        // 큰 자막(충격/괴멸/재배선)
  caption: string;    // 한 줄 내레이션
  camDist: number;    // 돌리 목표 거리
  nodeScale: number;  // 자극 세기(디아시시스 때 잠깐 낮춤)
  flash: number;      // 충격 섬광 0..1
  done: boolean;      // 재배선 충분히 보여준 뒤 → 실시간(라이브)로 핸드오프
}

const KEEP = 0.1; // 생존 비율 — 열에 하나만 남기고 다 죽인다

const lerp = (a: number, b: number, t: number) =>
  a + (b - a) * Math.max(0, Math.min(1, t));

export class TraumaDirector {
  phase: TraumaPhase = "calm";
  private t0 = 0;
  private started = false;
  private struck = false;

  // 튜닝(틱 ≈ 프레임, ~60fps)
  private CALM_NODES = 6800; // 이만큼 가득 차오르면 → 타격(망이 빽빽할수록 몰살이 충격적)
  private CALM_MAX = 9000;   // 그래도 안 차면 강제 진행(느린 성장 대비, ~150초 상한)
  private IMPACT_HOLD = 60;  // 타격 직후 멈춤(섬광·devastation 노출, ~1초)
  private SHOCK = 200;       // 디아시시스(~3.3초)
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
    let camDist = 0;
    let nodeScale = 1;
    let flash = 0;
    let done = false;

    switch (this.phase) {
      case "calm": {
        net.cfg.pandemic = false; // 외상은 SIR 아님 — 평소 망이 가득 차오름
        camDist = 6;
        caption = "분주한 세계 — 빽빽하게 차오르는 망";
        if (net.metrics.nodes >= this.CALM_NODES || local >= this.CALM_MAX) {
          this.go("impact", tick);
        }
        break;
      }
      case "impact": {
        if (!this.struck) {
          net.decimate(KEEP); // 한 방 — 열에 아홉이 몰살, 열에 하나만 생존
          this.struck = true;
        }
        flash = Math.max(0, 1 - local / 30); // 섬광 30틱 감쇠
        big = "충격";
        caption = "한순간에 — 거의 모든 것이 스러진다";
        camDist = 6.6; // 살짝 풀백 — 지구 전체가 한꺼번에 비는 걸 보여줌
        if (local >= this.IMPACT_HOLD) this.go("shock", tick);
        break;
      }
      case "shock": {
        // 디아시시스 — 살아남은 것들마저 충격에 잠시 가라앉았다 서서히 깨어남
        nodeScale = lerp(0.35, 0.85, local / this.SHOCK);
        big = "괴멸";
        caption = "열에 아홉이 사라지고, 열에 하나만 남았다";
        camDist = 6.2;
        if (local >= this.SHOCK) this.go("rewire", tick);
        break;
      }
      case "rewire": {
        // 재배선 — 살아남은 1할에서 망이 다시 자라난다(흩어진 점 → 다시 잇는 그물). 스크립트 없음.
        big = "재배선";
        caption = "남은 것에서 다시 — 가소성이 망을 새로 짠다";
        camDist = 5.6;
        if (local >= this.REWIRE) done = true;
        break;
      }
    }

    return { phase: this.phase, big, caption, camDist, nodeScale, flash, done };
  }
}
