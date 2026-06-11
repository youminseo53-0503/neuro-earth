import { mulberry32 } from "../../seededRng";
import type { SignalSource, StimulusEvent } from "../types";

// 창세(genesis) 소스 — '이상적' 재구성. 인터넷·계정 불필요(시드 = 재현 가능).
//   · 전 지구를 피보나치 구면으로 고르게 덮는 씨앗 ~300개를 만들고,
//     시드 셔플 순서로 '시간에 따라 점진적으로' 드러낸다(프런티어가 전 지구로 번짐).
//   · 막 드러난 점 = 새 노드 탄생(조금 강하게), 이미 드러난 점 = 회전하며 약하게 재자극(망 유지·연결).
//   · 강도를 절제(0.45~0.8)해 한 번에 saturate되지 않고 '촤라락 깔리는' 과정이 보이게.
//   · local의 버그(고정 핫스팟 8개 → 한 지역만 꽉 차고 멈춤)를 대체.

const N = 300;
const REVEAL_EVERY = 5; // 5틱마다 새 씨앗 1개 → 전부 드러나는 데 ~1500틱(≈25초)
const KEEP = 10; // 매 틱 유지-자극할 기존 점 수
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const DEG = 180 / Math.PI;

export function createGenesisSource(seed = 4242): SignalSource {
  // 피보나치 구면 → 전 지구 고른 분포
  const pts: [number, number][] = [];
  for (let k = 0; k < N; k++) {
    const y = 1 - (k / (N - 1)) * 2;
    const lat = Math.asin(Math.max(-1, Math.min(1, y))) * DEG;
    let lon = ((k * GOLDEN * DEG) % 360 + 360) % 360;
    if (lon > 180) lon -= 360;
    pts.push([lat, lon]);
  }
  // 시드 셔플 → 한쪽부터가 아니라 전 지구에 흩뿌려지며 점점 빽빽해짐
  const rng = mulberry32(seed);
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }

  return {
    id: "genesis",
    label: "창세 (시드·이상적 재구성)",
    enabled: true,
    poll(tick: number): StimulusEvent[] {
      const revealed = Math.min(N, 2 + Math.floor(tick / REVEAL_EVERY));
      const out: StimulusEvent[] = [];
      // 프런티어: 막 드러난 점들 — 새 노드 탄생
      for (let i = Math.max(0, revealed - 2); i < revealed; i++) {
        out.push({ lat: pts[i][0], lon: pts[i][1], strength: 0.8 });
      }
      // 기존: 회전하며 일부 재자극 — 망이 죽지 않고 계속 연결 형성
      for (let k = 0; k < KEEP; k++) {
        const idx = (tick * 7 + k * 29) % revealed;
        out.push({ lat: pts[idx][0], lon: pts[idx][1], strength: 0.45 });
      }
      return out;
    },
  };
}
