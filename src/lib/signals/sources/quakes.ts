import type { SignalSource, StimulusEvent } from "../types";

interface Quake {
  lat: number;
  lon: number;
  mag: number;
}

/**
 * 실시간 지진 (USGS). 진짜 데이터.
 *   · refresh(): /api/signals/quakes(서버 프록시·60s 캐시)에서 지난 1시간 지진을 받아 내부 버퍼에 적재(벽시계).
 *   · poll(tick): 버퍼의 각 지진을 주기적으로(쿨다운) 자극으로 방출 — 규모가 클수록 세고 넓게.
 * 인터넷만 있으면 동작(계정 불필요). 오프라인이면 버퍼가 비어 조용함.
 */
export function createQuakeSource(): SignalSource {
  let buf: Quake[] = [];

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
      buf = feats
        .map((f) => {
          const ff = f as {
            geometry?: { coordinates?: number[] };
            properties?: { mag?: number };
          };
          const c = ff.geometry?.coordinates ?? [];
          return { lon: c[0], lat: c[1], mag: ff.properties?.mag ?? 1 } as Quake;
        })
        .filter((q) => Number.isFinite(q.lat) && Number.isFinite(q.lon));
    },

    poll(tick: number): StimulusEvent[] {
      const out: StimulusEvent[] = [];
      const period = 35; // 각 지진이 ~35틱마다 한 번 맥동
      for (let i = 0; i < buf.length; i++) {
        if ((tick + i * 7) % period === 0) {
          const m = Math.max(0.3, buf[i].mag);
          out.push({
            lat: buf[i].lat,
            lon: buf[i].lon,
            strength: 0.5 + m * 0.28,
            radius: 0.1 + Math.min(0.2, m * 0.03),
          });
        }
      }
      return out;
    },
  };
}
