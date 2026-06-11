import type { EmergentNetwork } from "./emergent";

// ─────────────────────────────────────────────────────────────
// 팬데믹 '대봉쇄' 시네마틱 디렉터.
//   실제 코로나 타임라인(2019.12 → 2021)에 맞춰 엔진을 직접 연출한다:
//   분주한 세계 → (잠깐의 평온) → 우한 발병 → 항공로 따라 천천히 번짐 →
//   삽시간에 싹 빨강 → 대봉쇄(교류 거의 멎되 최소 운항은 살아있음) → 더딘 회복.
//   '멸종'이 아니라 '교류가 멈춘' 것 — 그래서 0이 아닌 바닥값과 회복까지 담는다.
//   엔진(net)의 씨앗·전염률·전부감염·재유행억제를 조종. config.pandemicArc(26)일 때만 구동.
//   (참고: 글로벌 항공 저점 2020.4.12 상업편 -73.7%, 그러나 화물·필수편은 잔존 — Flightradar24)
// ─────────────────────────────────────────────────────────────

export type PandemicPhase =
  | "growing"    // 세계가 빠르게 차오름(발병 전)
  | "calm"       // 분주한 세계의 잠깐의 평온(빨강 시작 전 ~5초)
  | "outbreak"   // 우한 — 한 점 빨강
  | "spreading"  // 항공로 따라 천천히 번짐
  | "saturating" // 삽시간 포화(싹 빨강으로 수렴)
  | "lockdown"   // 대봉쇄 — 교류 거의 멎음(최소 운항만)
  | "recovery";  // 더딘 회복 — 다시 이어지는 하늘길

export interface PandemicHud {
  phase: PandemicPhase;
  dateLabel: string;    // "2020. 04"
  caption: string;      // 화면 하단 한 줄
  infectedPct: number;  // 0..1
  halt: number;         // 노선 밝기(0..1) — 봉쇄 시 바닥값까지 떨어지되 0은 아님
  injectScale: number;  // 자극·항공 주입 강도(0..1) — 봉쇄 시 최소 운항
  climax: boolean;      // 클라이맥스(지구 자동 끄기·회전 가속)
}

const WUHAN: [number, number] = [30.6, 114.3];

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
  private t0 = 0;
  private started = false;

  // 튜닝(틱 ≈ 프레임, ~60fps)
  private ACTIVE_N = 480;   // 이만큼 빠르게 차오르면 분주한 세계
  private MAX_GROW = 1600;  // 그래도 안 차면 강제 진행
  private CALM = 300;       // 발병 전 평온 ~5초(빨강 시작을 뒤로 미룸)
  private OUTBREAK = 160;   // 한 점이 자리잡는 잠복
  private SPREAD = 1500;    // 번짐 구간(천천히 보이게)
  private SAT = 300;        // 삽시간 포화 한계
  private LOCK = 240;       // 대봉쇄 저점 유지(~4초)
  private REC = 1500;       // 회복 램프(2020.5→2021.6)

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
    let injectScale = 1;
    let climax = false;
    let dateLabel = "";
    let caption = "";

    switch (this.phase) {
      case "growing": {
        net.cfg.pandemic = false; // 발병 전 — SIR 끔(평소 뇌처럼 활발)
        net.frozen = false;
        const p = net.metrics.nodes / this.ACTIVE_N;
        dateLabel = monthLabel(lerp(M(2019, 9), M(2019, 11), p));
        caption = "세계가 깨어난다 — 분주해지는 하늘";
        if (net.metrics.nodes >= this.ACTIVE_N || local >= this.MAX_GROW) {
          this.go("calm", tick);
        }
        break;
      }
      case "calm": {
        // 분주한 세계의 잠깐의 평온 — 빨강 시작을 ~5초 뒤로
        dateLabel = monthLabel(lerp(M(2019, 11), M(2019, 12), local / this.CALM));
        caption = "2019 — 그 어느 때보다 분주했던 세계";
        if (local >= this.CALM) {
          net.cfg.pandemic = true;
          net.cfg.infectRate = 0.03; // 천천히 기어가는 파동
          net.cfg.recoverTicks = 220; // 감염 뒤에 회복(불응기) 자국이 따라가게
          net.suppressReseed = true; // 자동 재유행 끔 — 이제부터 디렉터가 씨앗 통제
          net.seedInfection(WUHAN[0], WUHAN[1]);
          this.go("outbreak", tick);
        }
        break;
      }
      case "outbreak": {
        dateLabel = monthLabel(M(2019, 12));
        caption = "2019년 12월, 우한 — 원인 모를 폐렴";
        if (infectedPct === 0) net.seedInfection(WUHAN[0], WUHAN[1]); // 자리 잡을 때까지
        if (local >= this.OUTBREAK) this.go("spreading", tick);
        break;
      }
      case "spreading": {
        const p = local / this.SPREAD;
        dateLabel = monthLabel(lerp(M(2020, 1), M(2020, 3), p));
        caption = "항공로를 따라 — 바이러스는 국경을 모른다";
        if (infectedPct === 0) net.seedInfection(WUHAN[0], WUHAN[1]);
        if (infectedPct >= 0.55 || local >= this.SPREAD) {
          net.cfg.infectRate = 0.28; // 전염 가속(삽시간 포화)
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
          net.cfg.infectRate = 0; // 더는 새 감염 없음
          this.go("lockdown", tick);
        }
        break;
      }
      case "lockdown": {
        // 대봉쇄 — 완전 정지(멸종)가 아니라 교류가 거의 멎음. 최소 운항·신호는 살아있음.
        climax = true; // 클라이맥스 — 지구 자동 끄기·회전 가속
        const p = local / this.LOCK;
        halt = lerp(1, 0.1, p); // 노선 밝기 1→0.1(완전 0 아님 — 화물·필수편 잔존)
        injectScale = lerp(1, 0.06, p); // 주입 1→0.06(최소 운항)
        dateLabel = monthLabel(M(2020, 4));
        caption = "대봉쇄 — 하늘길이 거의 멎다 (항공편 -73%)";
        if (local >= this.LOCK) {
          // 회복 준비 — 감염 경과 리셋(곧 회복 물결이 일도록) 후 회복 켬
          for (let i = 0; i < nodes.length; i++) if (nodes[i].alive && nodes[i].inf === 1) nodes[i].infT = 0;
          net.cfg.recoverTicks = 240; // 감염 → 회복(파랑)
          net.cfg.immuneTicks = 360;  // 회복 → 다시 건강(평소 색)
          this.go("recovery", tick);
        }
        break;
      }
      case "recovery": {
        // 더딘 회복(체크마크) — 멈췄지만 죽지 않았다. 빨강→파랑→건강, 하늘길이 다시 이어짐.
        climax = true; // 회복하는 동안에도 지구는 끈 채(빨강→파랑 망이 도는 걸 보여줌)
        const p = local / this.REC;
        halt = lerp(0.1, 0.6, p);        // 노선 밝기 회복
        injectScale = lerp(0.06, 0.5, p); // 항공 운항 회복
        dateLabel = monthLabel(lerp(M(2020, 5), M(2021, 6), p));
        caption = "그래도 멈추진 않았다 — 더디게 다시 이어지는 하늘길";
        break;
      }
    }

    return { phase: this.phase, dateLabel, caption, infectedPct, halt, injectScale, climax };
  }
}
