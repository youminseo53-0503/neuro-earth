import { create } from "zustand";
import { LATEST, VERSIONS, configFor, type ViewMode, type VizConfig } from "@/lib/versions";

interface VizState {
  config: VizConfig;
  versionId: string;
  mode: ViewMode;
  setVersion: (id: string) => void;
  setMode: (mode: string) => void;
}

/**
 * 현재 시각 상태 — 두 축:
 *   · versionId = 진화 단계(버전 리모컨)
 *   · mode      = 보는 방식(하단 바): 실시간 / 창세 / 팬데믹
 * 팬데믹은 이제 통합 버전의 '세 번째 모드'다(별도 버전 점프 없음). 옛/팬데믹라인 버전은 단일 config.
 */
export const useViz = create<VizState>((set, get) => ({
  config: configFor(LATEST, "live"),
  versionId: LATEST.id,
  mode: "live",
  setVersion: (id) => {
    const v = VERSIONS.find((x) => x.id === id);
    if (!v) return;
    const want = get().mode;
    // 그 버전이 현재 모드를 가졌으면 유지, 아니면 live. 모드 없는(옛/팬데믹라인) 버전은 config 기준.
    const m: ViewMode = v.modes
      ? v.modes[want]
        ? want
        : "live"
      : v.config?.pandemic
        ? "pandemic"
        : "live";
    set({ config: configFor(v, m), versionId: id, mode: m });
  },
  setMode: (mode) => {
    if (mode !== "live" && mode !== "genesis" && mode !== "pandemic" && mode !== "trauma") return;
    const m = mode as ViewMode;
    const cur = VERSIONS.find((x) => x.id === get().versionId);
    if (cur?.modes?.[m]) {
      set({ config: cur.modes[m]!, mode: m });
      return;
    }
    // 현재 버전에 그 모드가 없으면 — 그 모드를 가진 최신 버전으로 점프(예: 팬데믹 모드 가진 통합 버전)
    const stage = [...VERSIONS].reverse().find((x) => x.modes?.[m]);
    if (stage) set({ config: stage.modes![m]!, versionId: stage.id, mode: m });
  },
}));
