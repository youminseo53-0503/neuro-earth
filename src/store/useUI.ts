import { create } from "zustand";

interface UIState {
  /**
   * 3D 지구(파란 구체) 표시 여부.
   * 끄면 지구만 사라지고 신경 가소성 망은 그대로 남는다.
   * 레이아웃(왼쪽 3/4)은 바뀌지 않는다.
   */
  earthVisible: boolean;
  toggleEarth: () => void;
}

export const useUI = create<UIState>((set) => ({
  earthVisible: true,
  toggleEarth: () => set((s) => ({ earthVisible: !s.earthVisible })),
}));
