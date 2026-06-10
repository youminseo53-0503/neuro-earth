import { mulberry32 } from "../seededRng";
import { latLonToVec3, vec3ToLatLon } from "../geo";
import type { SignalSource, StimulusEvent } from "./types";

// 주요 공항(위도, 경도)
const AIRPORTS: [number, number][] = [
  [37.46, 126.44], // 인천
  [35.55, 139.78], // 도쿄
  [40.07, 116.6], // 베이징
  [1.36, 103.99], // 싱가포르
  [25.25, 55.36], // 두바이
  [28.56, 77.1], // 델리
  [41.26, 28.74], // 이스탄불
  [51.47, -0.45], // 런던
  [49.0, 2.55], // 파리
  [40.64, -73.78], // 뉴욕
  [33.94, -118.4], // LA
  [-23.43, -46.47], // 상파울루
  [-33.94, 151.18], // 시드니
  [-26.13, 28.24], // 요하네스버그
  [55.41, 37.9], // 모스크바
  [30.11, 31.4], // 카이로
];

type V3 = [number, number, number];
interface Flight {
  a: V3;
  b: V3;
  t: number;
  speed: number;
  str: number;
}

function slerp(a: V3, b: V3, t: number): V3 {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  dot = Math.max(-1, Math.min(1, dot));
  const th = Math.acos(dot);
  if (th < 1e-4) return a;
  const s = Math.sin(th);
  const s0 = Math.sin((1 - t) * th) / s;
  const s1 = Math.sin(t * th) / s;
  const x = a[0] * s0 + b[0] * s1;
  const y = a[1] * s0 + b[1] * s1;
  const z = a[2] * s0 + b[2] * s1;
  const m = Math.hypot(x, y, z) || 1;
  return [x / m, y / m, z / m];
}

/**
 * 항공 신호 (시뮬, 오프라인) — 공항 간 대권항로를 따라 비행기가 이동.
 * 움직이는 좁은 자극이 연결 경로를 따라 불을 켜고 지나간다(불규칙·유기적).
 * 출발/도착 순간엔 더 강한 펄스. 나중에 실제 항적(ADS-B)으로 교체 가능.
 */
export function createFlightSource(seed = 4242): SignalSource {
  const rng = mulberry32(seed);
  const ports: V3[] = AIRPORTS.map(([la, lo]) => {
    const v = latLonToVec3(la, lo, 1);
    return [v.x, v.y, v.z];
  });
  const flights: Flight[] = [];
  const MAX = 22;

  return {
    id: "flight",
    label: "항공 신호 (시뮬)",
    enabled: true,
    poll(): StimulusEvent[] {
      const out: StimulusEvent[] = [];

      if (flights.length < MAX && rng() < 0.1) {
        const i = Math.floor(rng() * ports.length);
        let j = Math.floor(rng() * ports.length);
        if (j === i) j = (j + 1) % ports.length;
        flights.push({
          a: ports[i],
          b: ports[j],
          t: 0,
          speed: 0.004 + rng() * 0.008,
          str: 0.8 + rng() * 0.6,
        });
      }

      for (let f = flights.length - 1; f >= 0; f--) {
        const fl = flights[f];
        const p = slerp(fl.a, fl.b, fl.t);
        const ll = vec3ToLatLon(p[0], p[1], p[2]);
        const edge = fl.t < 0.07 || fl.t > 0.93; // 출발/도착
        out.push({
          lat: ll.lat,
          lon: ll.lon,
          strength: fl.str * (edge ? 1.5 : 0.75),
          radius: edge ? 0.2 : 0.1,
        });
        fl.t += fl.speed;
        if (fl.t >= 1) flights.splice(f, 1);
      }
      return out;
    },
  };
}
