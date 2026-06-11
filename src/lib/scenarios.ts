import type { ViewMode } from "./versions";

// ─────────────────────────────────────────────────────────────
// 모드(보는 방식) — 버전(단계)과 직각인 축. 하단 시나리오 바가 이걸 토글한다.
//   · live     = 지금 이 순간의 진짜 실시간 데이터 (정직: ● LIVE)
//   · genesis  = 창세(재구성/모델) — '시나리오' 배지(라이브인 척 금지)
//   · pandemic/recovery = 준비 중
// 실제 config는 '현재 버전(단계)'이 모드별로 들고 있다(versions.ts).
// ─────────────────────────────────────────────────────────────

export type ScenarioKind = "live" | "scenario";

export interface ModeInfo {
  id: ViewMode | "pandemic" | "recovery";
  label: string;
  kind: ScenarioKind;
  /** 화면에 박는 정직성 배지 */
  badge: string;
  blurb: string;
  status: "ready" | "soon";
}

export const MODES: ModeInfo[] = [
  {
    id: "live",
    label: "실시간",
    kind: "live",
    badge: "● LIVE — 진짜 실시간 데이터",
    blurb: "지금 이 순간의 지구 — 실시간 항공·위성 데이터로 살아 움직이는 뇌",
    status: "ready",
  },
  {
    id: "genesis",
    label: "창세",
    kind: "scenario",
    badge: "시나리오 · 이상적 재구성",
    blurb: "빈 지구에서 스스로 깔리는 망 — 구조의 탄생을 처음부터",
    status: "ready",
  },
  {
    id: "pandemic",
    label: "팬데믹",
    kind: "scenario",
    badge: "시나리오 · 실제 과거 데이터 재구성",
    blurb: "코로나19 확산 — 실제 과거 데이터로 재구성 (준비 중)",
    status: "soon",
  },
  {
    id: "recovery",
    label: "회복",
    kind: "scenario",
    badge: "시나리오 · 재구성",
    blurb: "팬데믹 이후의 회복 — 다시 이어지는 길 (준비 중)",
    status: "soon",
  },
];

export const DEFAULT_MODE = MODES[0];

export function modeById(id: string): ModeInfo | undefined {
  return MODES.find((m) => m.id === id);
}
