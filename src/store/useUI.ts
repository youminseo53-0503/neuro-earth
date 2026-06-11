import { create } from "zustand";

interface UIState {
  /**
   * 3D 지구(파란 구체) 표시 여부.
   * 끄면 지구만 사라지고 신경 가소성 망은 그대로 남는다.
   * 레이아웃(왼쪽 3/4)은 바뀌지 않는다.
   */
  earthVisible: boolean;
  toggleEarth: () => void;
  /** 지구 표시를 직접 세팅. 클라이맥스 진입/해제에서 '1회성'으로만 부르고(매 프레임 강제 금지),
   *  그 사이엔 사용자 토글이 이긴다 → 자동으로 꺼져도 '지구 켜기' 버튼이 먹힌다. */
  setEarthVisible: (v: boolean) => void;

  /**
   * 자동회전 속도. 클라이맥스에서 EmergentLayer가 매 프레임 lerp로 끌어올린다.
   * 매 프레임 바뀌므로 reactive 구독 금지 — GlobeScene이 useFrame에서 getState()로 읽는다.
   */
  spin: number;
  setSpin: (v: number) => void;

  /**
   * 시네마틱 카메라 목표 거리(돌리). 0이면 비활성 → 사용자가 자유롭게 줌.
   * >0이면 GlobeScene이 매 프레임 카메라를 그 거리로 천천히 끌어당긴다(연출용 push-in/pull-back).
   */
  camDist: number;
  setCamDist: (v: number) => void;
}

export const BASE_SPIN = 0.25;

export const useUI = create<UIState>((set) => ({
  earthVisible: true,
  toggleEarth: () => set((s) => ({ earthVisible: !s.earthVisible })),
  setEarthVisible: (v) => set((s) => (s.earthVisible === v ? s : { earthVisible: v })),

  spin: BASE_SPIN,
  setSpin: (v) => set({ spin: v }),

  camDist: 0,
  setCamDist: (v) => set((s) => (s.camDist === v ? s : { camDist: v })),
}));
