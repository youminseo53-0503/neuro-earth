// 실시간 항공 — 커뮤니티 ADS-B 피드(adsb.fi, 무키·클라우드 차단 안 함)에서 항공기 위치를 모아
// 공항별 '근처 비행기 수'로 집계. (OpenSky는 클라우드 IP를 방화벽 차단해서 배포본에서 못 씀.)
// 출력 모양은 동일: { total, airports: [{icao, lat, lon, count}] } → flightslive 소스 무수정.
const ADSB = (lat: number, lon: number, nm: number) =>
  `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${nm}`;
const SAMPLE_RADIUS_NM = 250; // 한 점당 커버 반경(API 상한)
const NEAR_DEG2 = 0.36; // 공항 근처 판정: 0.6°(~66km) 제곱

// 주요 항공 트래픽 허브 샘플 포인트(반경 250nm). 대륙을 인터리브 — 레이트리밋에 후반이 잘려도
// 전 지구가 고르게 커버되게. 5분에 한 번만(캐시). 각 점이 근처 여러 공항을 커버.
const SAMPLE_POINTS: [number, number][] = [
  [35.5, 139.5], // 도쿄
  [51.5, -0.2],  // 런던
  [40.6, -73.8], // 뉴욕
  [25.3, 55.4],  // 두바이
  [-23.4, -46.5],// 상파울루
  [1.4, 104],    // 싱가포르
  [50, 8.6],     // 프랑크푸르트
  [33.9, -118.4],// LA
  [-33.9, 151.2],// 시드니
  [37, 127],     // 서울
  [41.8, 12.3],  // 로마
  [41.9, -87.9], // 시카고
  [28.6, 77.1],  // 델리
  [-26.1, 28.2], // 요하네스버그
  [31, 121.5],   // 상하이
  [55.9, 37.4],  // 모스크바
  [33.6, -84.4], // 애틀랜타
  [22.7, 113.8], // 홍콩/광저우
];

// 공항 거점(출력 버킷) — 대륙별 균형 분포
const AIRPORTS: { icao: string; lat: number; lon: number }[] = [
  { icao: "ICN", lat: 37.46, lon: 126.44 }, { icao: "GMP", lat: 37.56, lon: 126.79 },
  { icao: "HND", lat: 35.55, lon: 139.78 }, { icao: "NRT", lat: 35.77, lon: 140.39 },
  { icao: "KIX", lat: 34.43, lon: 135.24 }, { icao: "CTS", lat: 42.78, lon: 141.69 },
  { icao: "FUK", lat: 33.59, lon: 130.45 }, { icao: "PEK", lat: 40.08, lon: 116.58 },
  { icao: "PVG", lat: 31.14, lon: 121.81 }, { icao: "CAN", lat: 23.39, lon: 113.3 },
  { icao: "SZX", lat: 22.64, lon: 113.81 }, { icao: "CTU", lat: 30.58, lon: 103.95 },
  { icao: "KMG", lat: 25.1, lon: 102.94 }, { icao: "XIY", lat: 34.45, lon: 108.75 },
  { icao: "HKG", lat: 22.31, lon: 113.91 }, { icao: "TPE", lat: 25.08, lon: 121.23 },
  { icao: "SIN", lat: 1.36, lon: 103.99 }, { icao: "BKK", lat: 13.69, lon: 100.75 },
  { icao: "KUL", lat: 2.74, lon: 101.71 }, { icao: "CGK", lat: -6.13, lon: 106.66 },
  { icao: "MNL", lat: 14.51, lon: 121.02 }, { icao: "SGN", lat: 10.82, lon: 106.66 },
  { icao: "DEL", lat: 28.56, lon: 77.1 }, { icao: "BOM", lat: 19.09, lon: 72.87 },
  { icao: "BLR", lat: 13.2, lon: 77.71 }, { icao: "HYD", lat: 17.24, lon: 78.43 },
  { icao: "DXB", lat: 25.25, lon: 55.36 }, { icao: "DOH", lat: 25.27, lon: 51.61 },
  { icao: "AUH", lat: 24.43, lon: 54.65 }, { icao: "IST", lat: 41.26, lon: 28.74 },
  { icao: "JED", lat: 21.68, lon: 39.16 },
  { icao: "SYD", lat: -33.95, lon: 151.18 }, { icao: "MEL", lat: -37.67, lon: 144.84 },
  { icao: "BNE", lat: -27.38, lon: 153.12 }, { icao: "AKL", lat: -37.01, lon: 174.79 },
  { icao: "PER", lat: -31.94, lon: 115.97 },
  { icao: "LHR", lat: 51.47, lon: -0.46 }, { icao: "CDG", lat: 49.01, lon: 2.55 },
  { icao: "AMS", lat: 52.31, lon: 4.76 }, { icao: "FRA", lat: 50.03, lon: 8.56 },
  { icao: "MAD", lat: 40.47, lon: -3.56 }, { icao: "BCN", lat: 41.3, lon: 2.08 },
  { icao: "MUC", lat: 48.35, lon: 11.79 }, { icao: "FCO", lat: 41.8, lon: 12.25 },
  { icao: "ZRH", lat: 47.46, lon: 8.55 }, { icao: "CPH", lat: 55.62, lon: 12.65 },
  { icao: "ARN", lat: 59.65, lon: 17.92 }, { icao: "SVO", lat: 55.97, lon: 37.41 },
  { icao: "LIS", lat: 38.77, lon: -9.13 }, { icao: "ATH", lat: 37.94, lon: 23.95 },
  { icao: "ATL", lat: 33.64, lon: -84.43 }, { icao: "JFK", lat: 40.64, lon: -73.78 },
  { icao: "LAX", lat: 33.94, lon: -118.41 }, { icao: "ORD", lat: 41.98, lon: -87.9 },
  { icao: "DFW", lat: 32.9, lon: -97.04 }, { icao: "DEN", lat: 39.86, lon: -104.67 },
  { icao: "SFO", lat: 37.62, lon: -122.38 }, { icao: "SEA", lat: 47.45, lon: -122.31 },
  { icao: "MIA", lat: 25.79, lon: -80.29 }, { icao: "YYZ", lat: 43.68, lon: -79.61 },
  { icao: "MEX", lat: 19.44, lon: -99.07 }, { icao: "YVR", lat: 49.19, lon: -123.18 },
  { icao: "GRU", lat: -23.43, lon: -46.47 }, { icao: "EZE", lat: -34.82, lon: -58.54 },
  { icao: "BOG", lat: 4.7, lon: -74.15 }, { icao: "LIM", lat: -12.02, lon: -77.11 },
  { icao: "SCL", lat: -33.39, lon: -70.79 }, { icao: "GIG", lat: -22.81, lon: -43.25 },
  { icao: "PTY", lat: 9.07, lon: -79.38 },
  { icao: "CAI", lat: 30.11, lon: 31.4 }, { icao: "JNB", lat: -26.13, lon: 28.24 },
  { icao: "CPT", lat: -33.97, lon: 18.6 }, { icao: "LOS", lat: 6.58, lon: 3.32 },
  { icao: "NBO", lat: -1.32, lon: 36.93 }, { icao: "ADD", lat: 8.98, lon: 38.8 },
  { icao: "CMN", lat: 33.37, lon: -7.59 }, { icao: "LAD", lat: -8.86, lon: 13.23 },
  { icao: "ACC", lat: 5.61, lon: -0.17 }, { icao: "ALG", lat: 36.69, lon: 3.22 },
  { icao: "DAR", lat: -6.88, lon: 39.2 }, { icao: "TUN", lat: 36.85, lon: 10.23 },
];

const UA = "neuro-earth/1.0 (+https://github.com/youminseo53-0503/neuro-earth)";
let lastGood: { body: string; at: number } | null = null;

/** 한 샘플 포인트의 항공기 [hex, lat, lon] 목록(실패 시 빈 배열). */
async function fetchPoint(lat: number, lon: number): Promise<[string, number, number][]> {
  try {
    const res = await fetch(ADSB(lat, lon, SAMPLE_RADIUS_NM), {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const j = await res.json();
    const ac = Array.isArray(j?.aircraft) ? j.aircraft : Array.isArray(j?.ac) ? j.ac : [];
    const out: [string, number, number][] = [];
    for (const a of ac) {
      if (typeof a?.lat === "number" && typeof a?.lon === "number") {
        out.push([String(a.hex ?? `${a.lat},${a.lon}`), a.lat, a.lon]);
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function GET() {
  const serveStale = () =>
    lastGood
      ? new Response(lastGood.body, { headers: { "content-type": "application/json", "x-cache": "stale" } })
      : null;

  // 5분 TTL (커뮤니티 API 부담 줄이기)
  if (lastGood && Date.now() - lastGood.at < 300_000) {
    return new Response(lastGood.body, { headers: { "content-type": "application/json", "x-cache": "hit" } });
  }

  try {
    // 순차 호출 + 텀(280ms) — adsb.fi 레이트리밋(429) 회피. 인터리브라 도중 잘려도 전 지구 커버.
    const planes = new Map<string, [number, number]>();
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < SAMPLE_POINTS.length; i++) {
      const [la, lo] = SAMPLE_POINTS[i];
      for (const [hex, alat, alon] of await fetchPoint(la, lo)) planes.set(hex, [alat, alon]);
      if (i + 1 < SAMPLE_POINTS.length) await sleep(280);
    }

    if (planes.size === 0) return serveStale() ?? new Response("no aircraft", { status: 502 });

    const coords = [...planes.values()];
    const out = AIRPORTS.map((a) => {
      let count = 0;
      for (const [la, lo] of coords) {
        const dlat = la - a.lat;
        const dlon = lo - a.lon;
        if (dlat * dlat + dlon * dlon < NEAR_DEG2) count++;
      }
      return { icao: a.icao, lat: a.lat, lon: a.lon, count };
    });

    const body = JSON.stringify({ total: planes.size, airports: out });
    lastGood = { body, at: Date.now() };
    return new Response(body, { headers: { "content-type": "application/json" } });
  } catch (e) {
    console.error("adsb fetch failed:", (e as Error)?.message ?? e);
    return serveStale() ?? new Response("fetch failed", { status: 502 });
  }
}
