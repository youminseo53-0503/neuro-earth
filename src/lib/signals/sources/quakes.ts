import type { SignalSource, StimulusEvent } from "../types";

interface Quake {
  id: string;
  lat: number;
  lon: number;
  mag: number;
}

/**
 * 실시간 지진 (USGS). 진짜 데이터, 정직한 시간 스케일.
 *   · refresh(): /api/signals/quakes(서버 프록시·60s 캐시)에서 지난 1시간 지진을 받는다.
 *   · 한 번 본 지진(id)은 다시 쏘지 않는다 → 지진 1건 = 딱 한 번의 펄스.
 *     처음엔 최근 1시간치를 한 번씩 보여주고, 그 뒤론 '진짜 새 지진'이 들어올 때만 펄스.
 *     (세상은 0.1초마다 흔들리지 않는다. 드문드문이 정직하다.)
 *   · 규모(mag)가 클수록 세고 넓게.
 */
export function createQuakeSource(): SignalSource {
  const seen = new Set<string>();
  let pending: Quake[] = [];

  return {
    id: "quakes",
    label: "실시간 지진 (USGS)",
    enabled: true,
    refreshMs: 60_000,

    async refresh({ signal }) {
      const res = await fetch("/api/signals/quakes", { signal });
      if (!res.ok) return;
      const data = await res.json();
      const feats: unknown[] = Array.isArray(data?.features) ? data.features : [];
      for (const f of feats) {
        const ff = f as {
          id?: string;
          geometry?: { coordinates?: number[] };
          properties?: { mag?: number };
        };
        const id = String(ff.id ?? "");
        const c = ff.geometry?.coordinates ?? [];
        const lon = c[0];
        const lat = c[1];
        if (!id || seen.has(id) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
          continue;
        }
        seen.add(id);
        pending.push({ id, lat, lon, mag: ff.properties?.mag ?? 1 });
      }
    },

    poll(): StimulusEvent[] {
      if (pending.length === 0) return [];
      // 새로 관측된 지진만 '한 번' 방출 — 엔진이 그 파동을 전파시키고 자연히 사그라든다
      const out = pending.map((q) => {
        const m = Math.max(0.3, q.mag);
        return {
          lat: q.lat,
          lon: q.lon,
          strength: 1.0 + m * 0.35,
          radius: 0.12 + Math.min(0.2, m * 0.03),
        };
      });
      pending = [];
      return out;
    },
  };
}
