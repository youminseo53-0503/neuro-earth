import { create } from "zustand";
import { VERSIONS, type VizConfig } from "@/lib/versions";
import { SCENARIOS, DEFAULT_SCENARIO } from "@/lib/scenarios";

interface VizState {
  config: VizConfig;
  versionId: string;
  /** 현재 시나리오 프리셋(실시간/창세/팬데믹/회복). 과거 버전 탐색 중엔 "" */
  scenarioId: string;
  setVersion: (id: string) => void;
  setScenario: (id: string) => void;
}

/** 현재 보고 있는 시각 상태. 시나리오 바(프리셋) + 버전 리모컨(과거 탐색)이 바꾼다. */
export const useViz = create<VizState>((set) => ({
  config: DEFAULT_SCENARIO.config,
  versionId: "", // 시나리오로 시작 → 버전 하이라이트는 비움(리모컨이 엉뚱한 버전 켜는 것 방지)
  scenarioId: DEFAULT_SCENARIO.id,
  setVersion: (id) => {
    const v = VERSIONS.find((x) => x.id === id);
    if (v) set({ config: v.config, versionId: id, scenarioId: "" }); // 과거 버전 탐색 = 시나리오 해제
  },
  setScenario: (id) => {
    const s = SCENARIOS.find((x) => x.id === id);
    if (s && s.status === "ready") set({ config: s.config, scenarioId: id, versionId: "" });
  },
}));
