import { create } from "zustand";
import { LATEST, VERSIONS, configFor, type VizConfig, type ViewMode } from "@/lib/versions";

interface VizState {
  config: VizConfig;
  /** 현재 버전(진화 단계) */
  versionId: string;
  /** 현재 모드(보는 방식) — 실시간 / 창세 */
  mode: ViewMode;
  setVersion: (id: string) => void;
  setMode: (mode: string) => void;
}

/**
 * 현재 보고 있는 시각 상태 — 두 직각 축:
 *   · versionId = 진화 단계 (버전 리모컨)
 *   · mode      = 보는 방식 실시간/창세 (하단 시나리오 바)
 * config = configFor(현재 버전, 현재 모드).
 */
export const useViz = create<VizState>((set, get) => ({
  config: configFor(LATEST, "live"),
  versionId: LATEST.id,
  mode: "live",
  setVersion: (id) => {
    const v = VERSIONS.find((x) => x.id === id);
    if (!v) return;
    // 단계면 현재 모드 유지, 옛 단일 버전이면 그 config(모드 무관)
    set({ config: configFor(v, get().mode), versionId: id });
  },
  setMode: (mode) => {
    if (mode !== "live" && mode !== "genesis") return; // 팬데믹/회복은 준비 중
    const m = mode as ViewMode;
    const cur = VERSIONS.find((x) => x.id === get().versionId);
    if (cur?.modes) {
      set({ config: cur.modes[m], mode: m }); // 같은 단계에서 모드만 토글
    } else {
      // 옛 버전 보던 중 모드를 누르면 → 최신 단계로 점프(그 모드로)
      const stage = [...VERSIONS].reverse().find((x) => x.modes);
      if (stage) set({ config: stage.modes![m], versionId: stage.id, mode: m });
    }
  },
}));
