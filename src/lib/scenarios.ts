import type { VizConfig } from "./versions";
import { LATEST } from "./versions";

// ─────────────────────────────────────────────────────────────
// 시나리오 프리셋 — 보고서의 4개 '입구'.
//   · live     = 지금 이 순간의 진짜 실시간 데이터 (정직: ● LIVE)
//   · scenario = 재구성/모델 (정직: '시나리오' 배지 — 라이브인 척 금지)
// 실시간만 두면 사람들이 '구조가 깔리는 시작'을 못 보므로,
// 창세/팬데믹/회복 같은 서사를 프리셋으로 보여준다.
// ─────────────────────────────────────────────────────────────

export type ScenarioKind = "live" | "scenario";

export interface Scenario {
  id: string;
  label: string;
  /** live=진짜 실시간 / scenario=재구성·모델(가상) */
  kind: ScenarioKind;
  /** 화면에 박는 정직성 배지 */
  badge: string;
  /** 한 줄 설명 */
  blurb: string;
  /** ready=동작 / soon=데이터 붙는 중 */
  status: "ready" | "soon";
  config: VizConfig;
}

// 창세 — 빈 지구에서 스스로 깔리는 망(시드된 재현 가능 자극 = '이상적' 생성)
const GENESIS_CONFIG: VizConfig = {
  showEarth: true,
  showNet: true,
  colorMode: "act",
  jitter: 4,
  sources: ["local"],
  gain: 1,
  engine: "emergent",
  intrinsic: true,
  hormone: true,
  homeo: true,
  smallNodes: true,
};

export const SCENARIOS: Scenario[] = [
  {
    id: "live",
    label: "실시간",
    kind: "live",
    badge: "● LIVE — 진짜 실시간 데이터",
    blurb: "지금 이 순간의 지구 — 실시간 항공·위성 데이터로 살아 움직이는 뇌",
    status: "ready",
    config: LATEST.config, // 이중 신경계(항공 emergent + 스타링크 그리드)
  },
  {
    id: "genesis",
    label: "창세",
    kind: "scenario",
    badge: "시나리오 · 이상적 재구성",
    blurb: "빈 지구에서 스스로 깔리는 망 — 구조의 탄생을 처음부터",
    status: "ready",
    config: GENESIS_CONFIG,
  },
  {
    id: "pandemic",
    label: "팬데믹",
    kind: "scenario",
    badge: "시나리오 · 실제 과거 데이터 재구성",
    blurb: "코로나19 확산 — 실제 과거 데이터로 재구성 (준비 중)",
    status: "soon",
    config: LATEST.config,
  },
  {
    id: "recovery",
    label: "회복",
    kind: "scenario",
    badge: "시나리오 · 재구성",
    blurb: "팬데믹 이후의 회복 — 다시 이어지는 길 (준비 중)",
    status: "soon",
    config: LATEST.config,
  },
];

export const DEFAULT_SCENARIO = SCENARIOS[0];

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
