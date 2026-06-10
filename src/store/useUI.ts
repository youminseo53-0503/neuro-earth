import { create } from "zustand";

interface UIState {
  /** 왼쪽 지구본 표시 여부 (끄면 피드가 전체폭) */
  globeVisible: boolean;
  toggleGlobe: () => void;
}

export const useUI = create<UIState>((set) => ({
  globeVisible: true,
  toggleGlobe: () => set((s) => ({ globeVisible: !s.globeVisible })),
}));
