import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from "satellite.js";
import type { SignalSource, StimulusEvent } from "../types";

type Sat = ReturnType<typeof twoline2satrec>;

const SAMPLE = 300; // 전체 1만+ 기 중 균등 샘플(성능)
const PER_FRAME = 22; // 프레임당 자극 방출(회전) — 과발광 방지

/**
 * 실시간 스타링크 (CelesTrak). 진짜 데이터 + 진짜 궤도 계산.
 *   · refresh(): /api/signals/starlink(서버 프록시·2h 캐시)에서 TLE를 받아
 *     satellite.js satrec으로. 전체 중 SAMPLE개만 균등 샘플(메인스레드 보호).
 *   · poll(): 매 프레임 일부(PER_FRAME) 위성의 '지금' 지상점을 SGP4로 계산해 자극.
 *     위성이 진짜로 지나가는 곳에 신호 → 빽빽하고 끊임없는 '진짜' 활동.
 * 검증 가능: TLE는 공개 데이터, 위치는 표준 궤도역학(SGP4)으로 누구나 재현.
 */
export function createStarlinkSource(): SignalSource {
  let sats: Sat[] = [];
  let cursor = 0;

  return {
    id: "starlink",
    label: "실시간 스타링크 (CelesTrak)",
    enabled: true,
    refreshMs: 7_200_000,

    async refresh({ signal }) {
      const res = await fetch("/api/signals/starlink", { signal });
      if (!res.ok) return;
      const text = await res.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

      const triplets: [string, string][] = [];
      for (let i = 0; i + 2 < lines.length; i += 3) {
        triplets.push([lines[i + 1], lines[i + 2]]);
      }
      const step = Math.max(1, Math.floor(triplets.length / SAMPLE));
      const next: Sat[] = [];
      for (let i = 0; i < triplets.length && next.length < SAMPLE; i += step) {
        const [l1, l2] = triplets[i];
        if (!l1?.startsWith("1 ") || !l2?.startsWith("2 ")) continue;
        try {
          next.push(twoline2satrec(l1, l2));
        } catch {
          // 손상된 TLE는 건너뜀
        }
      }
      sats = next;
    },

    poll(): StimulusEvent[] {
      if (sats.length === 0) return [];
      const now = new Date();
      const gmst = gstime(now);
      const out: StimulusEvent[] = [];
      const n = Math.min(PER_FRAME, sats.length);
      for (let k = 0; k < n; k++) {
        const sat = sats[(cursor + k) % sats.length];
        try {
          const pv = propagate(sat, now);
          const pos = pv && pv.position;
          if (!pos) continue;
          const geo = eciToGeodetic(pos, gmst);
          const lat = degreesLat(geo.latitude);
          const lon = degreesLong(geo.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
          out.push({ lat, lon, strength: 0.5, radius: 0.09 });
        } catch {
          // 손상된 satrec은 건너뜀
        }
      }
      cursor = (cursor + n) % sats.length;
      return out;
    },
  };
}
