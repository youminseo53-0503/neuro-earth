import { create } from "zustand";

/**
 * 무반응(idle) 상태 — 일정 시간 터치·마우스·키 입력이 없으면 true.
 * 어트랙트 모드: UI 크롬을 다 숨기고 지구만 남긴다(카메라 무빙은 계속).
 * 아무 입력이나 들어오면 즉시 false로 깨어난다.
 */
interface IdleState {
  idle: boolean;
  setIdle: (v: boolean) => void;
}

export const useIdle = create<IdleState>((set) => ({
  idle: false,
  setIdle: (v) => set((s) => (s.idle === v ? s : { idle: v })),
}));
