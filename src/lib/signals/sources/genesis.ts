import { mulberry32 } from "../../seededRng";
import type { RouteEvent, SignalSource, StimulusEvent } from "../types";

// 창세(genesis) 소스 — '이상적' 재구성. 인터넷·계정 불필요(시드 = 재현 가능).
//   · 바다(태평양 등)가 아니라 '육지 핵심 거점'(문명 발상지)에서 탄생.
//   · 아프리카(요람)에서 출발해 시간순으로 거점이 깨어나고(Out of Africa),
//     각 거점은 시간이 지나며 주변으로 '번진다'(자극 반경이 점점 넓어짐).
//   · 강도 절제(0.6) + 점진 공개 → 한 번에 saturate되지 않고 '촤라락 깔리는' 과정이 보임.

// 육지 문명 거점 — 대략 'Out of Africa' 확산 순서(요람 → 아시아 → 유럽 → 아메리카 → 오세아니아)
const CORES: [number, number][] = [
  [2, 37], // 동아프리카(요람) — 케냐/에티오피아
  [9, 8], // 서아프리카 — 나이지리아
  [30, 31], // 이집트(나일)
  [33, 44], // 메소포타미아 — 이라크
  [32, 53], // 페르시아 — 이란
  [28, 77], // 인도 — 델리
  [23, 90], // 벵골
  [35, 104], // 중국 중원
  [31, 121], // 상하이
  [37, 127], // 한국
  [36, 138], // 일본
  [14, 101], // 동남아 — 태국
  [-6, 107], // 인도네시아
  [41, 12], // 로마
  [48, 2], // 파리
  [52, 13], // 베를린
  [51, 0], // 런던
  [55, 37], // 모스크바
  [40, -3], // 마드리드
  [19, -99], // 멕시코(메소아메리카)
  [-13, -72], // 안데스(잉카) — 페루
  [40, -74], // 뉴욕(동부 미국)
  [-23, -46], // 상파울루
  [37, -122], // 샌프란시스코(서부)
  [-33, 151], // 시드니
];

const REVEAL_EVERY = 75; // 75틱(≈1.3초)마다 거점 하나씩 깨어남 → 전부 ~31초
const SPREAD_MAX = 11; // 거점 번짐 반경(도) 한계
const DEG = 180 / Math.PI;

// 8대 문명 — '영속(불멸) 앵커'. 실제 역사 발생 순서대로 깨어남(탄생 tick).
// 망은 흥망성쇠로 끊임없이 바뀌지만, 이 8개 거점만은 영원히 남는다.
const CIV_ANCHORS: { lat: number; lon: number; name: string; tick: number }[] = [
  { lat: 32, lon: 45, name: "메소포타미아", tick: 40 }, // ~BCE 3500 수메르
  { lat: 27, lon: 31, name: "이집트", tick: 240 }, // ~BCE 3100 나일
  { lat: -10, lon: -77, name: "노르테치코(안데스)", tick: 440 }, // ~BCE 3000 카랄
  { lat: 27, lon: 68, name: "인더스", tick: 660 }, // ~BCE 2600 하라파
  { lat: 35, lon: 113, name: "황하(중국)", tick: 900 }, // ~BCE 2000
  { lat: 35, lon: 25, name: "미노아(에게)", tick: 1160 }, // ~BCE 2000 크레타
  { lat: 18, lon: -94, name: "올메카(메소아메리카)", tick: 1440 }, // ~BCE 1500
  { lat: 42, lon: 12, name: "로마", tick: 1740 }, // ~BCE 753
];

export function createGenesisSource(seed = 4242): SignalSource {
  const rng = mulberry32(seed);
  let nextAnchor = 0; // 다음에 깨어날 8대 문명 인덱스

  return {
    id: "genesis",
    label: "창세 (육지 거점·8대 문명·이상적 재구성)",
    enabled: true,
    // 8대 문명을 역사 순서대로(탄생 tick 도달 시) 하나씩 영속 앵커로 심는다.
    pollAnchors(tick: number) {
      const out: { lat: number; lon: number; name: string }[] = [];
      while (nextAnchor < CIV_ANCHORS.length && tick >= CIV_ANCHORS[nextAnchor].tick) {
        const c = CIV_ANCHORS[nextAnchor++];
        out.push({ lat: c.lat, lon: c.lon, name: c.name });
      }
      return out;
    },
    poll(tick: number): StimulusEvent[] {
      const revealed = Math.min(CORES.length, 1 + Math.floor(tick / REVEAL_EVERY));
      const out: StimulusEvent[] = [];
      for (let i = 0; i < revealed; i++) {
        const [clat, clon] = CORES[i];
        const ageTicks = tick - i * REVEAL_EVERY; // 이 거점이 깨어난 뒤 경과
        // 번짐: 시간이 지나며 자극 반경이 넓어짐(탄생이 주변으로 퍼짐)
        const spread = Math.min(SPREAD_MAX, 1.5 + ageTicks * 0.008);
        // 막 깨어난 거점은 더 활발히 탄생(2점), 자리 잡은 거점은 유지(1점)
        const n = i >= revealed - 2 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const dLat = (rng() - 0.5) * 2 * spread;
          // 경도 번짐은 위도 클수록 넓게(메르카토르 보정)
          const dLon = ((rng() - 0.5) * 2 * spread) / Math.max(0.25, Math.cos(clat / DEG));
          out.push({ lat: clat + dLat, lon: clon + dLon, strength: 0.6 });
        }
      }
      return out;
    },
  };
}

// ── 문명사(genesis-civ) — 인류 문명 성장곡선(L자/하키스틱) ──
// 초기 인류(핵심 지역, 느림·평탄) → 기차·자동차(지역 확산) → 비행기(대륙간 아치)로 폭발.
// 자기조절(softCap)과 합쳐져 ~1분에 천장. 슬로우-슬로우-폭발.
const P1 = 2000; // 노선 등장 시작(기차·자동차) — 그 전엔 걸어다님(노선 없음)
const P2 = 3000; // 비행기(대륙 간 아치 + 전 지구 글로벌) 시작
const RAMP_T = 3600; // 성장곡선 램프(엔진 softCapRamp와 일치)
const PEAK_SPAN = 3600; // 거점 융성 '피크 시점'이 퍼지는 범위(이른 index=고대 요람, 늦은 index=근대)
const WIDTH = 650; // 각 문명 활동 반치폭(짧을수록 흥망성쇠 뚜렷)

// 각 거점의 시점별 활동도 — 역사적 융성기를 중심으로 한 bump(+작은 baseline으로 완전 소멸 방지).
// 시간이 지나며 활동 중심이 고대 요람 → 근대로 이동 → 먼저 뜬 문명이 영원히 압도하지 않음.
function civActivity(i: number, n: number, tick: number): number {
  const peak = (i / (n - 1)) * PEAK_SPAN;
  const x = (tick - peak) / WIDTH;
  return Math.exp(-x * x) + 0.04;
}

function uvec(lat: number, lon: number): [number, number, number] {
  const p = (90 - lat) / DEG;
  const t = (lon + 180) / DEG;
  return [-Math.sin(p) * Math.cos(t), Math.cos(p), Math.sin(p) * Math.sin(t)];
}

export function createGenesisCivSource(seed = 4242): SignalSource {
  const rng = mulberry32(seed);
  let nextAnchor = 0;

  // 전 지구 피보나치(폭발기 글로벌 확산용)
  const FIB: [number, number][] = [];
  const NF = 200;
  const GA = Math.PI * (3 - Math.sqrt(5));
  for (let k = 0; k < NF; k++) {
    const y = 1 - (k / (NF - 1)) * 2;
    const lat = Math.asin(Math.max(-1, Math.min(1, y))) * DEG;
    let lon = (((k * GA * DEG) % 360) + 360) % 360;
    if (lon > 180) lon -= 360;
    FIB.push([lat, lon]);
  }

  // 노선 후보 — 거점 쌍을 대권 거리로 분류(중거리=기차/자동차, 장거리=비행기)
  const cu = CORES.map(([la, lo]) => uvec(la, lo));
  const regional: RouteEvent[] = [];
  const longHaul: RouteEvent[] = [];
  for (let i = 0; i < CORES.length; i++) {
    for (let j = i + 1; j < CORES.length; j++) {
      const dot = cu[i][0] * cu[j][0] + cu[i][1] * cu[j][1] + cu[i][2] * cu[j][2];
      const ang = Math.acos(Math.max(-1, Math.min(1, dot)));
      const ev: RouteEvent = { latA: CORES[i][0], lonA: CORES[i][1], latB: CORES[j][0], lonB: CORES[j][1], weight: 0.4 };
      if (ang > 0.9) longHaul.push(ev); // 대륙 간(비행기)
      else if (ang > 0.3) regional.push(ev); // 지역(기차·자동차)
    }
  }
  let regCursor = 0;
  let longCursor = 0;

  function jitter(lat: number, lon: number, reach: number, strength: number): StimulusEvent {
    const dLat = (rng() - 0.5) * 2 * reach;
    const dLon = ((rng() - 0.5) * 2 * reach) / Math.max(0.25, Math.cos(lat / DEG));
    return { lat: lat + dLat, lon: lon + dLon, strength };
  }

  const ANCHOR_EVERY = Math.floor(2200 / (CIV_ANCHORS.length + 1)); // 8대 문명 역사순 등장
  const NC = CORES.length;
  const act = new Array(NC).fill(0); // 거점별 활동도(재사용)

  return {
    id: "genesisciv",
    label: "문명사 (초기인류→기차·자동차→비행기 폭발)",
    enabled: true,
    pollAnchors(tick: number) {
      const out: { lat: number; lon: number; name: string }[] = [];
      while (nextAnchor < CIV_ANCHORS.length && tick >= (nextAnchor + 1) * ANCHOR_EVERY) {
        const c = CIV_ANCHORS[nextAnchor++];
        out.push({ lat: c.lat, lon: c.lon, name: c.name });
      }
      return out;
    },
    poll(tick: number): StimulusEvent[] {
      const out: StimulusEvent[] = [];
      const progress = Math.min(1, tick / RAMP_T);
      const nPts = 4 + Math.floor(progress * 16); // 초기 적게(느림) → 후기 많이(폭발)
      // 거점 활동도(역사적 융성 bump) — 활동 중심이 시간 따라 이동
      let total = 0;
      for (let i = 0; i < NC; i++) {
        act[i] = civActivity(i, NC, tick);
        total += act[i];
      }
      const reach = 3 + progress * 7;
      for (let k = 0; k < nPts; k++) {
        if (tick > P2 && rng() < 0.4) {
          // 비행기 시대 — 전 지구 글로벌 fill(연결된 근대 세계)
          const c = FIB[Math.floor(rng() * FIB.length)];
          out.push(jitter(c[0], c[1], 13, 0.55));
        } else {
          // 활동도 가중 샘플 — 융성 중인 문명에 자극이 몰림(옛 문명은 자극 끊겨 쇠퇴)
          let r = rng() * total;
          let i = 0;
          while (i < NC - 1 && (r -= act[i]) > 0) i++;
          out.push(jitter(CORES[i][0], CORES[i][1], reach, 0.55));
        }
      }
      return out;
    },
    pollRoutes(tick: number): RouteEvent[] {
      // phase1: 노선 없음(걸어다님). phase2: 지역(중거리). phase3: 비행기(장거리·폭발).
      if (tick < P1 || tick % 14 !== 0) return [];
      const out: RouteEvent[] = [];
      if (tick < P2) {
        if (regional.length === 0) return [];
        for (let k = 0; k < 6; k++) { out.push(regional[regCursor % regional.length]); regCursor++; }
      } else {
        const pool = longHaul.length ? longHaul : regional;
        if (pool.length === 0) return [];
        for (let k = 0; k < 10; k++) { out.push(pool[longCursor % pool.length]); longCursor++; }
      }
      return out;
    },
  };
}
