import { create } from "zustand";

/**
 * 모바일 바텀시트 상태 — 지구는 풀스크린 무대, 보고서(피드)·브리핑은 끌어올리는 시트.
 *   stage: peek(손잡이만) / half(반) / full(거의 전체)
 *   mode : feed(개발 보고서) / briefing(시나리오 브리핑)
 * 데스크탑(md+)에선 시트가 아예 렌더되지 않으므로 이 store는 모바일 전용.
 */
export type SheetStage = "peek" | "half" | "full";
export type SheetMode = "feed" | "briefing";

interface SheetState {
  stage: SheetStage;
  mode: SheetMode;
  setStage: (s: SheetStage) => void;
  open: (mode: SheetMode, stage?: SheetStage) => void;
}

export const useSheet = create<SheetState>((set) => ({
  stage: "peek",
  mode: "feed",
  setStage: (stage) => set({ stage }),
  open: (mode, stage = "half") => set({ mode, stage }),
}));
