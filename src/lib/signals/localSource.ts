import { mulberry32 } from "../seededRng";
import type { SignalSource, StimulusEvent } from "./types";

/**
 * 로컬 신호(시드 기반) — 인터넷·계정 불필요.
 * 지구 위 여러 '핫스팟'이 각자 다른 주기로 맥동하며 자극을 준다.
 * 시드가 고정이라 어디서나 같은 패턴 → 보고서 재현성.
 * 나중에 이 자리에 quake/starlink 소스를 갈아끼운다.
 */
export function createLocalSource(seed = 777): SignalSource {
  const rng = mulberry32(seed);
  const hotspots = Array.from({ length: 8 }, () => ({
    lat: (rng() * 140 - 70),
    lon: rng() * 360 - 180,
    period: 24 + Math.floor(rng() * 80),
    phase: Math.floor(rng() * 120),
    strength: 0.9 + rng() * 0.9,
  }));

  return {
    id: "local",
    label: "로컬 신호 (시드)",
    enabled: true,
    poll(tick: number): StimulusEvent[] {
      const out: StimulusEvent[] = [];
      for (const h of hotspots) {
        if ((tick + h.phase) % h.period === 0) {
          out.push({ lat: h.lat, lon: h.lon, strength: h.strength });
        }
      }
      return out;
    },
  };
}
