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
  versionId: DEFAULT_SCENARIO.versionId ?? "", // 실시간 시나리오 = v-live 버전(둘이 일치)
  scenarioId: DEFAULT_SCENARIO.id,
  setVersion: (id) => {
    const v = VERSIONS.find((x) => x.id === id);
    if (!v) return;
    // 이 버전에 대응하는 시나리오가 있으면 하단 바도 같이 켠다(양방향 연동)
    const sc = SCENARIOS.find((s) => s.versionId === id);
    set({ config: v.config, versionId: id, scenarioId: sc?.id ?? "" });
  },
  setScenario: (id) => {
    const s = SCENARIOS.find((x) => x.id === id);
    if (!s || s.status !== "ready") return;
    // 이 시나리오에 대응하는 버전이 있으면 왼쪽 리모컨도 같이 켠다(양방향 연동)
    set({ config: s.config, scenarioId: id, versionId: s.versionId ?? "" });
  },
}));
