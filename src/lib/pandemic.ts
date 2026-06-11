import type { EmergentNetwork } from "./emergent";

// ─────────────────────────────────────────────────────────────
// 팬데믹 '멸종' 시네마틱 디렉터.
//   실제 코로나 타임라인(2019.12 → 2021)에 맞춰 엔진을 직접 연출한다:
//   활발한 세계 → 우한 발병 → 항공로 따라 번짐 → 삽시간에 싹 빨강 → 대봉쇄로 전부 정지.
//   엔진(net)의 씨앗·전염률·전부감염(infectAll)·동결(frozen)을 조종.
//   config.pandemicArc(26번 버전)일 때만 EmergentLayer가 매 프레임 update()를 호출한다.
// ─────────────────────────────────────────────────────────────

export type PandemicPhase =
  | "growing"   // 분주한 세계가 자라남(발병 전)
  | "outbreak"  // 우한 — 한 점 빨강
  | "spreading" // 항공로 따라 번짐
  | "saturating"// 삽시간 포화(싹 빨강으로 수렴)
  | "lockdown"  // 대봉쇄 — 항공·활동 멎음
  | "frozen";   // 멈춰버린 세계

export interface PandemicHud {
  phase: PandemicPhase;
  dateLabel: string;   // "2020. 03"
  caption: string;     // 화면 하단 한 줄
  infectedPct: number; // 0..1
  halt: number;        // 1=정상 흐름 … 0=완전 정지(항공 밝기)
  injecting: boolean;  // false면 자극/항공 주입 중단(봉쇄)
}

const WUHAN: [number, number] = [30.6, 114.3];

// 절대 월 인덱스(year*12 + month-1) ↔ 라벨
const M = (y: number, mo: number) => y * 12 + (mo - 1);
function monthLabel(absMonth: number): string {
  const a = Math.round(absMonth);
  const y = Math.floor(a / 12);
  const mo = (a % 12) + 1;
  return `${y}. ${String(mo).padStart(2, "0")}`;
}
const lerp = (a: number, b: number, t: number) =>
  a + (b - a) * Math.max(0, Math.min(1, t));

export class PandemicDirector {
  phase: PandemicPhase = "growing";
  private t0 = 0;        // 현재 phase 시작 tick
  private started = false;

  // 튜닝(틱 ≈ 프레임, ~60fps)
  private ACTIVE_N = 550;   // 이만큼 자라면 '분주한 세계' → 발병
  private MAX_GROW = 1500;  // 그래도 안 차면 강제 발병
  private OUTBREAK = 150;   // 발병 잠복(한 점)
  private SPREAD = 1300;    // 번짐 구간 길이
  private SAT = 420;        // 삽시간 포화 한계
  private LOCK = 80;        // 봉쇄 전이(항공 밝기 1→0)
  private FROZEN = 1200;    // 정지 유지 표시 구간(날짜만 흐름)

  reset() {
    this.phase = "growing";
    this.started = false;
    this.t0 = 0;
  }

  private go(p: PandemicPhase, tick: number) {
    this.phase = p;
    this.t0 = tick;
  }

  update(net: EmergentNetwork): PandemicHud {
    const tick = net.tick;
    if (!this.started) {
      this.t0 = tick;
      this.started = true;
    }
    const local = tick - this.t0;

    // 감염률(이전 step 상태 기준 — 전이 판정용)
    let inf = 0,
      alive = 0;
    const nodes = net.nodes;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n.alive) continue;
      alive++;
      if (n.inf === 1) inf++;
    }
    const infectedPct = alive > 0 ? inf / alive : 0;

    let halt = 1;
    let injecting = true;
    let dateLabel = "";
    let caption = "";

    switch (this.phase) {
      case "growing": {
        net.cfg.pandemic = false; // 발병 전 — SIR 끔(평소 뇌처럼 활발)
        net.frozen = false;
        const p = net.metrics.nodes / this.ACTIVE_N;
        dateLabel = monthLabel(lerp(M(2019, 10), M(2019, 12), p));
        caption = "2019 — 세계는 그 어느 때보다 분주했다";
        if (net.metrics.nodes >= this.ACTIVE_N || local >= this.MAX_GROW) {
          net.cfg.pandemic = true;
          net.cfg.infectRate = 0.05;
          net.cfg.recoverTicks = 200; // 초반엔 회복 있음(파랑도 보이게)
          net.seedInfection(WUHAN[0], WUHAN[1]);
          this.go("outbreak", tick);
        }
        break;
      }
      case "outbreak": {
        dateLabel = monthLabel(M(2019, 12));
        caption = "2019년 12월, 우한 — 원인 불명의 폐렴";
        if (infectedPct === 0) net.seedInfection(WUHAN[0], WUHAN[1]); // 자리 잡을 때까지
        if (local >= this.OUTBREAK) this.go("spreading", tick);
        break;
      }
      case "spreading": {
        const p = local / this.SPREAD;
        dateLabel = monthLabel(lerp(M(2020, 1), M(2020, 3), p));
        caption = "항공로를 따라 — 바이러스는 국경을 모른다";
        if (infectedPct === 0) net.seedInfection(WUHAN[0], WUHAN[1]);
        if (infectedPct >= 0.45 || local >= this.SPREAD) {
          net.cfg.infectRate = 0.5; // 전염 폭주
          net.cfg.recoverTicks = 1_000_000; // 회복 멈춤 → 싹 빨강으로 수렴
          this.go("saturating", tick);
        }
        break;
      }
      case "saturating": {
        dateLabel = monthLabel(M(2020, 3));
        caption = "2020.3.11 WHO 팬데믹 선언 — 삽시간이었다";
        if (infectedPct >= 0.9 || local >= this.SAT) {
          net.infectAll(); // 남은 점까지 — 싹 빨강
          this.go("lockdown", tick);
        }
        break;
      }
      case "lockdown": {
        net.frozen = true; // 대봉쇄 — 활동·발화·생멸 정지
        injecting = false; // 항공·자극 주입 중단
        halt = Math.max(0, 1 - local / this.LOCK); // 노선 밝기 1→0(비행 멎음)
        dateLabel = monthLabel(M(2020, 4));
        caption = "대봉쇄 — 삽시간에, 모든 것이 멈췄다";
        if (local >= this.LOCK) this.go("frozen", tick);
        break;
      }
      case "frozen": {
        net.frozen = true;
        injecting = false;
        halt = 0;
        const p = local / this.FROZEN;
        dateLabel = monthLabel(lerp(M(2020, 4), M(2021, 6), p));
        caption = "끊긴 하늘길 — 멈춰버린 세계 (항공편 -90%)";
        break;
      }
    }

    return { phase: this.phase, dateLabel, caption, infectedPct, halt, injecting };
  }
}
