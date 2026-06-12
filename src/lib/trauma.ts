import type { EmergentNetwork } from "./emergent";

// ─────────────────────────────────────────────────────────────
// 외상/전쟁 '두부외상' 시네마틱 디렉터.
//   분주한 세계 → 한 방의 타격(병변: 그 구역 노드·연결이 끊기고 검은 흉터) →
//   디아시시스(충격이 먼 영역까지 일시 기능저하) → 재배선(가소성이 흉터를 우회해 새 길을 깖).
//   '회복'은 스크립트로 짜지 않는다 — 죽은 자리를 우회하는 재배선은 엔진의 헤브 성장에서 emergent하게 나온다.
//   디렉터는 '타격'만 가하고(net.lesion 1회), 카메라·자막으로 그 과정을 보여줄 뿐.
//   config.traumaArc(통합 버전 trauma 모드)일 때만 구동.
// ─────────────────────────────────────────────────────────────

export type TraumaPhase = "calm" | "impact" | "shock" | "rewire";

export interface TraumaHud {
  phase: TraumaPhase;
  big: string;        // 큰 자막(충격/손상/재배선)
  caption: string;    // 한 줄 내레이션
  camDist: number;    // 돌리 목표 거리
  nodeScale: number;  // 자극 세기(디아시시스 때 잠깐 낮춤)
  flash: number;      // 충격 섬광 0..1
  done: boolean;      // 재배선 충분히 보여준 뒤 → 실시간(라이브)로 핸드오프
}

// 타격 지점 — 망이 빽빽한 허브(유럽)라 구멍이 크게 보인다. 두부외상 은유라 위치 자체는 상징적.
const IMPACT: [number, number] = [50, 10];
const LESION_R = 0.34; // 병변 각반경(rad, ~19°)

const lerp = (a: number, b: number, t: number) =>
  a + (b - a) * Math.max(0, Math.min(1, t));

export class TraumaDirector {
  phase: TraumaPhase = "calm";
  private t0 = 0;
  private started = false;
  private impacted = false;

  // 튜닝(틱 ≈ 프레임, ~60fps)
  private CALM_NODES = 420; // 이만큼 자라면 '분주한 세계' → 타격
  private CALM_MAX = 1100;  // 그래도 안 차면 강제 진행
  private IMPACT_HOLD = 46; // 타격 직후 멈춤(섬광·펀치인)
  private SHOCK = 170;      // 디아시시스(~3초)
  private REWIRE = 2600;    // 재배선 관찰(~43초) — 엔진이 흉터를 우회해 자라는 걸 보여줌

  reset() {
    this.phase = "calm";
    this.started = false;
    this.impacted = false;
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
        net.cfg.pandemic = false; // 외상은 SIR 아님 — 평소 망
        camDist = 5.4;
        caption = "분주한 세계 — 살아 움직이는 망";
        if (net.metrics.nodes >= this.CALM_NODES || local >= this.CALM_MAX) {
          this.go("impact", tick);
        }
        break;
      }
      case "impact": {
        if (!this.impacted) {
          net.lesion(IMPACT[0], IMPACT[1], LESION_R); // 한 방 — 그 구역이 통째로 끊긴다
          this.impacted = true;
        }
        flash = Math.max(0, 1 - local / 26); // 섬광 26틱 감쇠
        big = "충격";
        caption = "한순간의 타격 — 회로가 끊긴다";
        camDist = 3.7; // 펀치인 — 상처를 들이댄다
        if (local >= this.IMPACT_HOLD) this.go("shock", tick);
        break;
      }
      case "shock": {
        // 디아시시스 — 병변에 연결됐던 먼 영역까지 일시적으로 가라앉았다 서서히 깨어남
        nodeScale = lerp(0.4, 0.85, local / this.SHOCK);
        big = "손상";
        caption = "충격이 먼 영역까지 — 일시적 기능 저하 (디아시시스)";
        camDist = 4.5;
        if (local >= this.SHOCK) this.go("rewire", tick);
        break;
      }
      case "rewire": {
        // 재배선 — 죽은 자리는 흉터로 남고(검은 구멍), 망은 가장자리로 우회해 자란다. 스크립트 없음.
        big = "재배선";
        caption = "가소성 — 죽은 자리를 우회해 새 길이 자란다";
        camDist = 6.2; // 풀백해서 재조직을 관찰
        if (local >= this.REWIRE) done = true;
        break;
      }
    }

    return { phase: this.phase, big, caption, camDist, nodeScale, flash, done };
  }
}
