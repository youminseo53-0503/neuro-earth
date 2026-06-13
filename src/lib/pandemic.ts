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
  | "peak"       // 전 세계 감염 — 지구 켠 채 ~5초 보여줌(어디가 빨간지 이해되게)
  | "lockdown"   // 대봉쇄 — 그제서야 지구 꺼지고 교류 멎음(최소 운항만)
  | "recovery"   // 더딘 회복 — 다시 이어지는 하늘길(2020.5→2021.6)
  | "present";   // 엔데믹 이후 — 오늘까지 시간이 흐르며 일상으로 돌아온 세계(가만히 둬도 계속)

export interface PandemicHud {
  phase: PandemicPhase;
  dateLabel: string;    // "2020. 04"
  caption: string;      // 화면 하단 한 줄
  infectedPct: number;  // 0..1
  halt: number;         // 노선 밝기(0..1) — 봉쇄 시 바닥값까지 떨어지되 0은 아님
  injectScale: number;  // 항공편(노선) 주입 비율(0..1) — 봉쇄 시 최소 운항
  nodeScale: number;    // 노드 자극 세기(0..1) — 너무 흐려지지 않게 바닥값 유지(봉쇄 0.5)
  severance: number;    // 시냅스 단절도(0..1) — 봉쇄에 1로 끊기고 회복기에 0으로 느리게 재연결(pandemicSever 버전만 적용)
  climax: boolean;      // 클라이맥스(지구 자동 끄기·회전 가속)
  camDist: number;      // 시네마틱 카메라 목표 거리(돌리). 0이면 사용자 자유
  done: boolean;        // present가 '오늘'에 닿아 잠시 머문 뒤 — 실시간(라이브) 모드로 넘길 신호
}

// 단계별 카메라 연출(돌리 목표 거리). EARTH_RADIUS=2, 기본 카메라 6, 범위 [3.2, 14].
//   발병=살짝 push-in / 정점=확 pull-back(전 세계 빨강을 한눈에) / 오늘=놓아줌(0).
const CAM: Record<PandemicPhase, number> = {
  growing: 6,
  calm: 6,
  outbreak: 5,
  spreading: 6,
  saturating: 5.4,
  peak: 8.6,
  lockdown: 6.2,
  recovery: 6.6,
  present: 0,
};

const WUHAN: [number, number] = [30.6, 114.3];

const M = (y: number, mo: number) => y * 12 + (mo - 1);
/** 실제 '오늘'의 절대 월(브라우저 시계) — 매번 보면 그때의 현재까지 흐른다. */
function todayMonth(): number {
  const d = new Date();
  return d.getFullYear() * 12 + d.getMonth(); // getMonth 0-base → M(y, mo)와 정합
}
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
  private PEAK = 300;       // 싹 빨개진 채 지구 켜고 ~5초 holding(상황 이해)
  private LOCK = 240;       // 대봉쇄 저점 유지(~4초)
  private REC = 3000;       // 회복 램프(2020.5→2021.6) — 아주 더디게(틱 ≈ 프레임, ~50초)
  private MONTH_TICKS = 36; // present에서 한 달이 흐르는 틱 — 관조(나레이션) 동안 날짜가 오늘까지 함께 흐름
  private HOLD = 180;       // '오늘'에 닿아 잠시 머무는 시간(~3초) 후 실시간으로 전환

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
    let nodeScale = 1;
    let severance = 0;
    let climax = false;
    let done = false;
    let dateLabel = "";
    let caption = "";

    switch (this.phase) {
      case "growing": {
        net.cfg.pandemic = false; // 발병 전 — SIR 끔(평소 뇌처럼 활발)
        net.frozen = false;
        const p = net.metrics.nodes / this.ACTIVE_N;
        dateLabel = monthLabel(lerp(M(2019, 9), M(2019, 11), p));
        caption = "세계가 깨어난다 — 자라나는 항공망";
        if (net.metrics.nodes >= this.ACTIVE_N || local >= this.MAX_GROW) {
          this.go("calm", tick);
        }
        break;
      }
      case "calm": {
        // 분주한 세계의 잠깐의 평온 — 빨강 시작을 ~5초 뒤로
        dateLabel = monthLabel(lerp(M(2019, 11), M(2019, 12), local / this.CALM));
        caption = "2019 — 그 어느 때보다 분주한 하늘";
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
        caption = "2019년 12월 · 우한 — 첫 감염원 한 점";
        if (infectedPct === 0) net.seedInfection(WUHAN[0], WUHAN[1]); // 자리 잡을 때까지
        if (local >= this.OUTBREAK) this.go("spreading", tick);
        break;
      }
      case "spreading": {
        const p = local / this.SPREAD;
        dateLabel = monthLabel(lerp(M(2020, 1), M(2020, 3), p));
        caption = "2020년 초 — 항공로를 타고 번지는 감염";
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
        caption = "2020년 3월 11일 · WHO 팬데믹 선언 — 폭발적 확산";
        if (infectedPct >= 0.9 || local >= this.SAT) {
          net.infectAll(); // 남은 점까지 — 싹 빨강
          net.cfg.infectRate = 0; // 더는 새 감염 없음
          this.go("peak", tick);
        }
        break;
      }
      case "peak": {
        // 전 세계 감염 — 지구를 켠 채 ~5초 보여준다(어느 대륙이 빨간지 눈으로 이해되게).
        // 아직 봉쇄 전이라 항공편은 그대로 분주(슈퍼전파). 그래서 지구도 아직 안 끈다.
        climax = false;
        dateLabel = monthLabel(M(2020, 3));
        caption = "전 세계 감염 — 모든 대륙이 빨갛게 물들다";
        if (local >= this.PEAK) this.go("lockdown", tick);
        break;
      }
      case "lockdown": {
        // 그제서야 대봉쇄 — 지구가 꺼지고(클라이맥스) 하늘길이 멎는다. 완전 정지는 아님(최소 운항).
        climax = true; // 이제 지구 자동 끄기·회전 가속
        const p = local / this.LOCK;
        halt = lerp(1, 0.1, p);          // 노선 밝기 1→0.1(완전 0 아님 — 화물·필수편 잔존)
        injectScale = lerp(1, 0.06, p);  // 항공편 1→0.06(최소 운항)
        nodeScale = lerp(1, 0.5, p);     // 노드 자극 절반까지만(흐려지되 빨강은 또렷)
        severance = lerp(0, 1, p);       // 시냅스(선)가 끊겨나간다 — 봉쇄로 망이 다 분리됨
        dateLabel = monthLabel(M(2020, 4));
        caption = "대봉쇄 — 하늘길이 멎고 세계가 멈춰서다 (항공편 -73%)";
        if (local >= this.LOCK) {
          net.cfg.pandemic = false; // 엔진 자동 전이/재유행 끔 — 회복은 디렉터가 천천히 직접
          this.go("recovery", tick);
        }
        break;
      }
      case "recovery": {
        // 더딘 회복(체크마크) — 멈췄지만 죽지 않았다. 빨강→파랑→건강, 하늘길이 다시 이어짐.
        climax = true; // 회복하는 동안에도 지구는 끈 채(빨강→파랑 망이 도는 걸 보여줌)
        const p = local / this.REC;
        halt = lerp(0.1, 0.6, p);         // 노선 밝기 회복
        injectScale = lerp(0.06, 0.5, p); // 항공 운항 회복
        nodeScale = lerp(0.5, 0.9, p);    // 세계가 다시 깨어남 — 노드 밝기 회복(출생은 절제)
        severance = 1 - p * p;            // 끊긴 선이 다시 이어진다 — 초반은 더디게(한참 끊긴 채), 후반에 빠르게 재배선
        dateLabel = monthLabel(lerp(M(2020, 5), M(2021, 6), p));
        caption = "2020–2021 — 더디게 회복하는 세계, 다시 잇는 하늘길";
        // 아주 더딘 치유 — 매 프레임 극소수만 무작위로 단계 진행(물결처럼 흩어). 후반일수록 살짝 가속.
        // 빨강이 2020 내내 남아있다가 2021로 가며 천천히 걷히게.
        const toRec = 0.0004 + 0.0012 * p;  // 감염(빨강)→회복(파랑)
        const toWell = 0.00025 + 0.0009 * p; // 회복(파랑)→건강(평소색)
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (!n.alive) continue;
          if (n.inf === 1) { if (Math.random() < toRec) { n.inf = 2; n.infT = 0; } }
          else if (n.inf === 2) { if (Math.random() < toWell) { n.inf = 0; n.infT = 0; } }
        }
        if (local >= this.REC) {
          for (let i = 0; i < nodes.length; i++) if (nodes[i].alive) { nodes[i].inf = 0; nodes[i].infT = 0; } // 잔여 마무리 — 모두 건강
          this.go("present", tick);
        }
        break;
      }
      case "present": {
        // 엔데믹 이후 — 지구를 다시 켜고(클라이맥스 해제) 일상으로. 날짜가 오늘까지 흐른다.
        // 오늘에 닿으면 ~3초 머문 뒤 done=true → EmergentLayer가 실시간(라이브) 모드로 자연 전환.
        climax = false;
        const tgt = todayMonth();
        const dur = Math.max(1, (tgt - M(2021, 6)) * this.MONTH_TICKS);
        const p = Math.min(1, local / dur);
        dateLabel = monthLabel(lerp(M(2021, 6), tgt, p));
        if (p < 1) caption = "엔데믹 — 일상으로 돌아오는 세계";
        else if (local < dur + this.HOLD) caption = "오늘 · 다시 살아 움직이는 세계";
        else caption = "이제, 실시간으로 —";
        done = local >= dur + this.HOLD;
        break;
      }
    }

    return { phase: this.phase, dateLabel, caption, infectedPct, halt, injectScale, nodeScale, severance, climax, camDist: CAM[this.phase], done };
  }
}
