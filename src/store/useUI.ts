import { create } from "zustand";

interface UIState {
  /**
   * 3D 지구(파란 구체) 표시 여부.
   * 끄면 지구만 사라지고 신경 가소성 망은 그대로 남는다.
   * 레이아웃(왼쪽 3/4)은 바뀌지 않는다.
   */
  earthVisible: boolean;
  toggleEarth: () => void;

  /**
   * 시나리오 클라이맥스(창세=다 자람 / 팬데믹=대봉쇄)에서 자동으로 지구를 끈다.
   * 사용자의 수동 토글(earthVisible)과 별개 — 둘 중 하나라도 '끔'이면 지구는 사라진다.
   * EmergentLayer가 매 프레임 판정해 세팅, Earth가 구독해 반영한다.
   */
  climaxEarthOff: boolean;
  setClimaxEarthOff: (v: boolean) => void;

  /**
   * 자동회전 속도. 클라이맥스에서 EmergentLayer가 매 프레임 lerp로 끌어올린다.
   * 매 프레임 바뀌므로 reactive 구독 금지 — GlobeScene이 useFrame에서 getState()로 읽는다.
   */
  spin: number;
  setSpin: (v: number) => void;
}

export const BASE_SPIN = 0.25;

export const useUI = create<UIState>((set) => ({
  earthVisible: true,
  toggleEarth: () => set((s) => ({ earthVisible: !s.earthVisible })),

  climaxEarthOff: false,
  setClimaxEarthOff: (v) => set((s) => (s.climaxEarthOff === v ? s : { climaxEarthOff: v })),

  spin: BASE_SPIN,
  setSpin: (v) => set({ spin: v }),
}));
