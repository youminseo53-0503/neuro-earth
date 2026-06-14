import { create } from "zustand";

/**
 * 크롬(개발로그·HUD·바·리모컨) 숨김 상태.
 *   기본은 숨김(immersive·자동 전시). 어떤 입력이든 들어오면 보이고(수동), 잠깐 무반응이면 다시 숨는다(자동).
 *   토글 버튼 없이 '상호작용 ↔ 무반응'으로만 오간다 — IdleController가 운전.
 *
 *   photo = '사진찍기 모드'. 모든 오버레이를 치우고(idle처럼), 거기에 더해
 *   화면을 만져도 크롬이 다시 안 뜨게 잠근다(sticky). 깨끗한 작품 사진용 — PhotoButton이 토글.
 */
interface IdleState {
  idle: boolean;
  photo: boolean;
  setIdle: (v: boolean) => void;
  setPhoto: (v: boolean) => void;
}

export const useIdle = create<IdleState>((set) => ({
  idle: true, // 시작부터 immersive(패널 다 치운 상태)
  photo: false,
  setIdle: (v) => set((s) => (s.idle === v ? s : { idle: v })),
  setPhoto: (v) => set((s) => (s.photo === v ? s : { photo: v })),
}));
