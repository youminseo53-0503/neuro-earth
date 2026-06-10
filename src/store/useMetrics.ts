import { create } from "zustand";
import type { PlasticityMetrics } from "@/lib/plasticity";
import type { EMetrics } from "@/lib/emergent";

interface MetricsState {
  metrics: PlasticityMetrics | null;
  set: (m: PlasticityMetrics) => void;
  emergent: EMetrics | null;
  setEmergent: (m: EMetrics) => void;
}

/** 시뮬레이션 실시간 지표 (HUD가 구독). useFrame에서 스로틀해서 갱신. */
export const useMetrics = create<MetricsState>((set) => ({
  metrics: null,
  set: (metrics) => set({ metrics }),
  emergent: null,
  setEmergent: (emergent) => set({ emergent }),
}));
