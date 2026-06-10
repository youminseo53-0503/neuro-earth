import { create } from "zustand";
import { LATEST, VERSIONS, type VizConfig } from "@/lib/versions";

interface VizState {
  config: VizConfig;
  versionId: string;
  setVersion: (id: string) => void;
}

/** 현재 보고 있는 시각 버전(프리셋). 로그의 '이 버전 보기' 버튼이 바꾼다. */
export const useViz = create<VizState>((set) => ({
  config: LATEST.config,
  versionId: LATEST.id,
  setVersion: (id) => {
    const v = VERSIONS.find((x) => x.id === id);
    if (v) set({ config: v.config, versionId: id });
  },
}));
