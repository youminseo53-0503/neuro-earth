import type { SignalSource, StimulusEvent } from "../types";

interface Ap {
  lat: number;
  lon: number;
  count: number;
}

/**
 * 실시간 항공 유동인구 (OpenSky). 진짜 데이터.
 *   · refresh(): /api/opensky(서버가 키로 OAuth+states 처리, 90s 캐시)에서
 *     공항별 '근처 비행기 수'(지상+저고도)를 받는다 = 유동인구 프록시.
 *   · poll(): 각 공항에서 비행기 수에 비례해 자극 → 붐비는 공항일수록 큰 군집.
 */
export function createFlightsLiveSource(): SignalSource {
  let airports: Ap[] = [];
  let maxCount = 1;

  return {
    id: "flightslive",
    label: "실시간 항공 유동인구 (OpenSky)",
    enabled: true,
    refreshMs: 90_000,

    async refresh({ signal }) {
      const res = await fetch("/api/opensky", { signal });
      if (!res.ok) return;
      const data = await res.json();
      airports = Array.isArray(data?.airports) ? data.airports : [];
      maxCount = Math.max(1, ...airports.map((a) => a.count));
    },

    poll(tick: number): StimulusEvent[] {
      const out: StimulusEvent[] = [];
      for (let i = 0; i < airports.length; i++) {
        const a = airports[i];
        if (a.count <= 0) continue;
        if ((tick + i * 5) % 16 === 0) {
          out.push({
            lat: a.lat,
            lon: a.lon,
            strength: 0.45 + (a.count / maxCount) * 1.0,
            radius: 0.07,
          });
        }
      }
      return out;
    },
  };
}
