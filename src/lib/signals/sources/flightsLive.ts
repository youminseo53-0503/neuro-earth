import type { RouteEvent, SignalSource, StimulusEvent } from "../types";

interface Ap {
  icao: string;
  lat: number;
  lon: number;
  count: number;
}

const DEG = Math.PI / 180;
function unit(lat: number, lon: number): [number, number, number] {
  const p = (90 - lat) * DEG;
  const t = (lon + 180) * DEG;
  return [-Math.sin(p) * Math.cos(t), Math.cos(p), Math.sin(p) * Math.sin(t)];
}

const LONG_THRESH = Math.cos(0.3); // 두 공항 dot < 이 값 = 장거리(~17°+)

/**
 * 실시간 항공 유동인구 (OpenSky) + 장거리 노선(축삭).
 *   · poll: 공항별 근처 비행기 수에 비례해 자극 → 붐비는 공항일수록 큰 군집.
 *   · pollRoutes: '장거리' 공항 쌍을 전부 축삭으로 연결 시도(엔진 maxDeg가 자연 제한).
 *     신호가 그 노선을 타고 대륙을 건넌다 — 진짜 뇌의 long-range 연결.
 */
export function createFlightsLiveSource(): SignalSource {
  let airports: Ap[] = [];
  let maxCount = 1;

  return {
    id: "flightslive",
    label: "실시간 항공 유동인구 (OpenSky)",
    enabled: true,
    refreshMs: 300_000,

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

    pollRoutes(tick: number): RouteEvent[] {
      if (tick % 30 !== 0 || airports.length < 2) return [];
      const u = airports.map((a) => unit(a.lat, a.lon));
      const out: RouteEvent[] = [];
      for (let i = 0; i < airports.length; i++) {
        for (let j = i + 1; j < airports.length; j++) {
          const d = u[i][0] * u[j][0] + u[i][1] * u[j][1] + u[i][2] * u[j][2];
          if (d < LONG_THRESH) {
            out.push({
              latA: airports[i].lat, lonA: airports[i].lon,
              latB: airports[j].lat, lonB: airports[j].lon,
              weight: 0.4,
            });
          }
        }
      }
      return out;
    },
  };
}
