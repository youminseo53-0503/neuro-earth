import { create } from "zustand";
import type { PandemicPhase } from "@/lib/pandemic";

/** 팬데믹 '멸종' 시네마틱의 화면 하단 자막 상태(EmergentLayer가 갱신 → PandemicCaption이 렌더). */
interface PandemicHudState {
  active: boolean;
  phase: PandemicPhase | "";
  dateLabel: string;
  caption: string;
  infectedPct: number;
  set: (p: Partial<Omit<PandemicHudState, "set">>) => void;
}

export const usePandemic = create<PandemicHudState>((set) => ({
  active: false,
  phase: "",
  dateLabel: "",
  caption: "",
  infectedPct: 0,
  set: (p) => set(p),
}));
