import { create } from "zustand";
import type { PlasticityMetrics } from "@/lib/plasticity";

interface MetricsState {
  metrics: PlasticityMetrics | null;
  set: (m: PlasticityMetrics) => void;
}

/** 시뮬레이션 실시간 지표 (HUD가 구독). useFrame에서 스로틀해서 갱신. */
export const useMetrics = create<MetricsState>((set) => ({
  metrics: null,
  set: (metrics) => set({ metrics }),
}));
