import type { RouteEvent, SignalSource, StimulusEvent } from "../types";

interface Ap {
  icao: string;
  lat: number;
  lon: number;
  count: number;
}

// 실제 주요 국제노선(축삭). 라이브 per-flight는 아니고 '존재하는 노선' 큐레이션.
const ROUTES: [string, string][] = [
  ["ICN", "JFK"], ["ICN", "LAX"], ["ICN", "SFO"], ["ICN", "FRA"], ["ICN", "LHR"],
  ["ICN", "SIN"], ["ICN", "HKG"], ["ICN", "NRT"], ["ICN", "PEK"], ["ICN", "BKK"],
  ["JFK", "LHR"], ["JFK", "CDG"], ["JFK", "FRA"], ["JFK", "DXB"], ["JFK", "GRU"],
  ["JFK", "MEX"], ["JFK", "LAX"], ["LAX", "HND"], ["LAX", "SYD"], ["LAX", "PVG"],
  ["LAX", "MEX"], ["SFO", "HND"], ["SFO", "SIN"], ["LHR", "DXB"], ["LHR", "SIN"],
  ["LHR", "HKG"], ["LHR", "JNB"], ["LHR", "FRA"], ["LHR", "CDG"], ["LHR", "BOM"],
  ["DXB", "SIN"], ["DXB", "BKK"], ["DXB", "DEL"], ["DXB", "BOM"], ["DXB", "IST"],
  ["DXB", "JNB"], ["DXB", "SYD"], ["SIN", "HND"], ["SIN", "SYD"], ["SIN", "HKG"],
  ["SIN", "CGK"], ["SIN", "KUL"], ["HND", "BKK"], ["HND", "SYD"], ["FRA", "PVG"],
  ["FRA", "PEK"], ["FRA", "DEL"], ["FRA", "GRU"], ["SYD", "HKG"], ["IST", "PEK"],
  ["DOH", "LHR"], ["DOH", "BKK"], ["AMS", "JFK"], ["YYZ", "LHR"], ["MAD", "GRU"],
];

/**
 * 실시간 항공 유동인구 (OpenSky) + 장거리 노선(축삭).
 *   · poll: 공항별 근처 비행기 수에 비례해 자극 → 붐비는 공항일수록 큰 군집.
 *   · pollRoutes: 실제 국제노선으로 멀리 떨어진 공항 군집을 잇는다(장거리 축삭).
 *     신호가 그 노선을 타고 대륙을 건넌다 — 진짜 뇌의 long-range 연결.
 */
export function createFlightsLiveSource(): SignalSource {
  let airports: Ap[] = [];
  let byIcao = new Map<string, Ap>();
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
      byIcao = new Map(airports.map((a) => [a.icao, a]));
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
      if (tick % 24 !== 0 || byIcao.size === 0) return []; // 주기적으로만 재연결 시도
      const out: RouteEvent[] = [];
      for (const [a, b] of ROUTES) {
        const A = byIcao.get(a);
        const B = byIcao.get(b);
        if (A && B) out.push({ latA: A.lat, lonA: A.lon, latB: B.lat, lonB: B.lon, weight: 0.5 });
      }
      return out;
    },
  };
}
