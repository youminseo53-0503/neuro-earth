import { create } from "zustand";

/**
 * 전시(자동순환) 모드. 기본 ON — 가만히 두면 시나리오를 스스로 왔다갔다 한다
 * (실시간 → 창세 → 팬데믹 → 오늘 → 실시간 …). 각 시나리오는 카메라 무빙이 붙는다.
 * 사용자가 시나리오/버전을 직접 누르면 OFF(자유 탐색), 토글로 다시 켤 수 있다.
 */
interface ExhibitionState {
  auto: boolean;
  setAuto: (v: boolean) => void;
  toggle: () => void;
}

export const useExhibition = create<ExhibitionState>((set) => ({
  auto: true,
  setAuto: (v) => set((s) => (s.auto === v ? s : { auto: v })),
  toggle: () => set((s) => ({ auto: !s.auto })),
}));
