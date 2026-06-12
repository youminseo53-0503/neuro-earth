import { create } from "zustand";
import type { PandemicPhase } from "@/lib/pandemic";

/** 시네마틱 화면 하단 자막 상태(EmergentLayer가 갱신 → PandemicCaption이 렌더). 팬데믹·외상 공용. */
interface PandemicHudState {
  active: boolean;
  phase: PandemicPhase | string; // 팬데믹/외상 등 시나리오 phase
  dateLabel: string;             // 큰 자막(팬데믹=날짜 / 외상=충격·손상·재배선)
  caption: string;
  infectedPct: number;
  bar: boolean;                  // 하단 감염 게이지 표시 여부(팬데믹=true / 외상=false)
  set: (p: Partial<Omit<PandemicHudState, "set">>) => void;
}

export const usePandemic = create<PandemicHudState>((set) => ({
  active: false,
  phase: "",
  dateLabel: "",
  caption: "",
  infectedPct: 0,
  bar: true,
  set: (p) => set(p),
}));
