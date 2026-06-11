import { create } from "zustand";
import { LATEST, VERSIONS, configFor, PANDEMIC_CONFIG, type VizConfig } from "@/lib/versions";

/** 하단 바 모드(보는 방식). live/genesis는 버전(단계)별, pandemic은 독립 경험. */
type ModeId = "live" | "genesis" | "pandemic" | "recovery";

interface VizState {
  config: VizConfig;
  versionId: string;
  mode: ModeId;
  setVersion: (id: string) => void;
  setMode: (mode: string) => void;
}

/**
 * 현재 시각 상태 — 두 축:
 *   · versionId = 진화 단계(버전 리모컨, live/genesis 한정)
 *   · mode      = 보는 방식(하단 바): 실시간/창세/팬데믹/회복
 * 팬데믹은 단계와 무관한 독립 모드(실시간 망 위 SIR).
 */
export const useViz = create<VizState>((set, get) => ({
  config: configFor(LATEST, "live"),
  versionId: LATEST.id,
  mode: "live",
  setVersion: (id) => {
    const v = VERSIONS.find((x) => x.id === id);
    if (!v) return;
    // 버전(단계)은 실시간/창세만 — 팬데믹/회복 보던 중이면 실시간으로
    const m = get().mode === "genesis" ? "genesis" : "live";
    set({ config: configFor(v, m), versionId: id, mode: m });
  },
  setMode: (mode) => {
    if (mode === "pandemic") {
      // 팬데믹 = 독립 모드(실시간 망 위 SIR 파동). 버전 강조 해제.
      set({ config: PANDEMIC_CONFIG, mode: "pandemic", versionId: "" });
      return;
    }
    if (mode !== "live" && mode !== "genesis") return; // 회복은 준비 중
    const cur = VERSIONS.find((x) => x.id === get().versionId);
    if (cur?.modes) {
      set({ config: cur.modes[mode], mode });
    } else {
      // 옛 단일 버전 보던 중이면 최신 단계로 점프(그 모드로)
      const stage = [...VERSIONS].reverse().find((x) => x.modes);
      if (stage) set({ config: stage.modes![mode], versionId: stage.id, mode });
    }
  },
}));
