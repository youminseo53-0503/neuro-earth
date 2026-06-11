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

const LONG_THRESH = Math.cos(0.32); // 장거리(~18°+) 쌍만 노선
const ROUTES_PER_AIRPORT = 5; // 공항당 장거리 연결 수(고르게)

/**
 * 실시간 항공 유동인구 (OpenSky) + 장거리 노선(축삭).
 *   · poll: 모든 공항에 기본 시드(존재) + 근처 비행기 수(상한)로 크기 modulation.
 *     → 아프리카 등 데이터 적은 곳도 작게 뜨고, 인도/미국이 폭주하지 않음(균형).
 *   · pollRoutes: 장거리 공항 쌍을 축삭으로 연결(엔진 maxDeg가 자연 제한).
 */
export function createFlightsLiveSource(): SignalSource {
  let airports: Ap[] = [];

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
    },

    poll(tick: number): StimulusEvent[] {
      const out: StimulusEvent[] = [];
      for (let i = 0; i < airports.length; i++) {
        const a = airports[i];
        if ((tick + i * 3) % 14 === 0) {
          const cap = Math.min(a.count, 35) / 35; // 0..1 (트래픽 상한)
          out.push({
            lat: a.lat,
            lon: a.lon,
            strength: 0.5 + cap * 0.6, // 기본 시드 + 상한 트래픽
            radius: 0.07,
          });
        }
      }
      return out;
    },

    pollRoutes(tick: number): RouteEvent[] {
      if (tick % 48 !== 0 || airports.length < 2) return [];
      const n = airports.length;
      const u = airports.map((a) => unit(a.lat, a.lon));
      const out: RouteEvent[] = [];
      // 공항마다 장거리 후보를 흩뿌려 골라 K개씩 연결 → 전 지구 고르게(동아시아 쏠림 X)
      for (let i = 0; i < n; i++) {
        let added = 0;
        for (let s = 1; s < n && added < ROUTES_PER_AIRPORT; s++) {
          const j = (i + s * 7) % n;
          if (j === i) continue;
          const d = u[i][0] * u[j][0] + u[i][1] * u[j][1] + u[i][2] * u[j][2];
          if (d < LONG_THRESH) {
            out.push({
              latA: airports[i].lat, lonA: airports[i].lon,
              latB: airports[j].lat, lonB: airports[j].lon,
              weight: 0.4,
            });
            added++;
          }
        }
      }
      return out;
    },
  };
}
