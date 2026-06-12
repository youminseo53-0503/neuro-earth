// OpenSky 실시간 항공 — 서버에서만 키 사용(클라 노출 X).
// OAuth2 client_credentials로 토큰 발급 → /states/all → 공항별 '근처 비행기 수' 집계.
import { Agent } from "undici";

const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const STATES_URL = "https://opensky-network.org/api/states/all";

// 서버리스(Vercel)에서 IPv6 happy-eyeballs로 외부 API 연결이 'fetch failed' 나는 걸 피해 IPv4 강제.
let ipv4Dispatcher: Agent | null = null;
try {
  ipv4Dispatcher = new Agent({ connect: { family: 4 } });
} catch {
  ipv4Dispatcher = null;
}
const UA = "neuro-earth/1.0 (+https://github.com/youminseo53-0503/neuro-earth)";

/** 타임아웃·User-Agent·IPv4 강제를 입힌 fetch(연결 실패/지연으로 함수가 매달리지 않게). */
function osFetch(url: string, opts: RequestInit = {}) {
  const final = {
    ...opts,
    headers: { "user-agent": UA, ...(opts.headers || {}) },
    signal: AbortSignal.timeout(8000),
    ...(ipv4Dispatcher ? { dispatcher: ipv4Dispatcher } : {}),
  };
  return fetch(url, final as RequestInit);
}

// 주요 공항 거점 (ICAO, 위도, 경도) — 대륙별 균형 있게 분포
const AIRPORTS: { icao: string; lat: number; lon: number }[] = [
  // 동아시아 (한국·일본·중국·대만·홍콩)
  { icao: "ICN", lat: 37.46, lon: 126.44 }, { icao: "GMP", lat: 37.56, lon: 126.79 },
  { icao: "HND", lat: 35.55, lon: 139.78 }, { icao: "NRT", lat: 35.77, lon: 140.39 },
  { icao: "KIX", lat: 34.43, lon: 135.24 }, { icao: "CTS", lat: 42.78, lon: 141.69 },
  { icao: "FUK", lat: 33.59, lon: 130.45 }, { icao: "PEK", lat: 40.08, lon: 116.58 },
  { icao: "PVG", lat: 31.14, lon: 121.81 }, { icao: "CAN", lat: 23.39, lon: 113.3 },
  { icao: "SZX", lat: 22.64, lon: 113.81 }, { icao: "CTU", lat: 30.58, lon: 103.95 },
  { icao: "KMG", lat: 25.1, lon: 102.94 }, { icao: "XIY", lat: 34.45, lon: 108.75 },
  { icao: "HKG", lat: 22.31, lon: 113.91 }, { icao: "TPE", lat: 25.08, lon: 121.23 },
  // 동남아·남아시아
  { icao: "SIN", lat: 1.36, lon: 103.99 }, { icao: "BKK", lat: 13.69, lon: 100.75 },
  { icao: "KUL", lat: 2.74, lon: 101.71 }, { icao: "CGK", lat: -6.13, lon: 106.66 },
  { icao: "MNL", lat: 14.51, lon: 121.02 }, { icao: "SGN", lat: 10.82, lon: 106.66 },
  { icao: "DEL", lat: 28.56, lon: 77.1 }, { icao: "BOM", lat: 19.09, lon: 72.87 },
  { icao: "BLR", lat: 13.2, lon: 77.71 }, { icao: "HYD", lat: 17.24, lon: 78.43 },
  // 중동
  { icao: "DXB", lat: 25.25, lon: 55.36 }, { icao: "DOH", lat: 25.27, lon: 51.61 },
  { icao: "AUH", lat: 24.43, lon: 54.65 }, { icao: "IST", lat: 41.26, lon: 28.74 },
  { icao: "JED", lat: 21.68, lon: 39.16 },
  // 오세아니아
  { icao: "SYD", lat: -33.95, lon: 151.18 }, { icao: "MEL", lat: -37.67, lon: 144.84 },
  { icao: "BNE", lat: -27.38, lon: 153.12 }, { icao: "AKL", lat: -37.01, lon: 174.79 },
  { icao: "PER", lat: -31.94, lon: 115.97 },
  // 유럽
  { icao: "LHR", lat: 51.47, lon: -0.46 }, { icao: "CDG", lat: 49.01, lon: 2.55 },
  { icao: "AMS", lat: 52.31, lon: 4.76 }, { icao: "FRA", lat: 50.03, lon: 8.56 },
  { icao: "MAD", lat: 40.47, lon: -3.56 }, { icao: "BCN", lat: 41.3, lon: 2.08 },
  { icao: "MUC", lat: 48.35, lon: 11.79 }, { icao: "FCO", lat: 41.8, lon: 12.25 },
  { icao: "ZRH", lat: 47.46, lon: 8.55 }, { icao: "CPH", lat: 55.62, lon: 12.65 },
  { icao: "ARN", lat: 59.65, lon: 17.92 }, { icao: "SVO", lat: 55.97, lon: 37.41 },
  { icao: "LIS", lat: 38.77, lon: -9.13 }, { icao: "ATH", lat: 37.94, lon: 23.95 },
  // 북미
  { icao: "ATL", lat: 33.64, lon: -84.43 }, { icao: "JFK", lat: 40.64, lon: -73.78 },
  { icao: "LAX", lat: 33.94, lon: -118.41 }, { icao: "ORD", lat: 41.98, lon: -87.9 },
  { icao: "DFW", lat: 32.9, lon: -97.04 }, { icao: "DEN", lat: 39.86, lon: -104.67 },
  { icao: "SFO", lat: 37.62, lon: -122.38 }, { icao: "SEA", lat: 47.45, lon: -122.31 },
  { icao: "MIA", lat: 25.79, lon: -80.29 }, { icao: "YYZ", lat: 43.68, lon: -79.61 },
  { icao: "MEX", lat: 19.44, lon: -99.07 }, { icao: "YVR", lat: 49.19, lon: -123.18 },
  // 남미
  { icao: "GRU", lat: -23.43, lon: -46.47 }, { icao: "EZE", lat: -34.82, lon: -58.54 },
  { icao: "BOG", lat: 4.7, lon: -74.15 }, { icao: "LIM", lat: -12.02, lon: -77.11 },
  { icao: "SCL", lat: -33.39, lon: -70.79 }, { icao: "GIG", lat: -22.81, lon: -43.25 },
  { icao: "PTY", lat: 9.07, lon: -79.38 },
  // 아프리카
  { icao: "CAI", lat: 30.11, lon: 31.4 }, { icao: "JNB", lat: -26.13, lon: 28.24 },
  { icao: "CPT", lat: -33.97, lon: 18.6 }, { icao: "LOS", lat: 6.58, lon: 3.32 },
  { icao: "NBO", lat: -1.32, lon: 36.93 }, { icao: "ADD", lat: 8.98, lon: 38.8 },
  { icao: "CMN", lat: 33.37, lon: -7.59 }, { icao: "LAD", lat: -8.86, lon: 13.23 },
  { icao: "ACC", lat: 5.61, lon: -0.17 }, { icao: "ALG", lat: 36.69, lon: 3.22 },
  { icao: "DAR", lat: -6.88, lon: 39.2 }, { icao: "TUN", lat: 36.85, lon: 10.23 },
];

let tokenCache: { token: string; exp: number } | null = null;
let lastGood: { body: string; at: number } | null = null;
let lastTokenError: unknown = null; // 진단용 — 마지막 토큰 실패 원인

async function getToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenCache.exp) return tokenCache.token;
  const id = process.env.OPENSKY_CLIENT_ID;
  const secret = process.env.OPENSKY_CLIENT_SECRET;
  if (!id || !secret) return null;
  try {
    const res = await osFetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: id,
        client_secret: secret,
      }),
    });
    if (!res.ok) {
      console.error("opensky token: HTTP", res.status);
      return null;
    }
    const j = await res.json();
    if (!j.access_token) return null;
    tokenCache = {
      token: j.access_token,
      exp: Date.now() + Math.max(60, (j.expires_in ?? 1800) - 60) * 1000,
    };
    return tokenCache.token;
  } catch (e) {
    // 연결 자체 실패(fetch failed 등) — 던지지 말고 null 반환(라우트는 stale/시뮬로 폴백). 원인은 로깅.
    const err = e as Error & { cause?: { code?: string; errno?: number } };
    lastTokenError = {
      name: err?.name,
      message: err?.message,
      cause: String(err?.cause ?? ""),
      code: err?.cause?.code,
    };
    console.error("opensky token fetch failed:", lastTokenError);
    return null;
  }
}

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.has("debug");
  const serveStale = () =>
    lastGood
      ? new Response(lastGood.body, {
          headers: { "content-type": "application/json", "x-cache": "stale" },
        })
      : null;

  // 5분 TTL (크레딧 절약: 4000/일 → 24h 풀가동도 ~1150/일)
  if (lastGood && Date.now() - lastGood.at < 300_000) {
    return new Response(lastGood.body, {
      headers: { "content-type": "application/json", "x-cache": "hit" },
    });
  }

  const token = await getToken();
  if (!token) {
    if (debug) return Response.json({ ok: false, hasEnv: !!process.env.OPENSKY_CLIENT_ID, lastTokenError });
    return serveStale() ?? new Response("no token (env?)", { status: 502 });
  }
  if (debug) return Response.json({ ok: true, gotToken: true });

  try {
    const res = await osFetch(STATES_URL, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return serveStale() ?? new Response("upstream error", { status: 502 });
    const data = await res.json();
    const states: unknown[][] = Array.isArray(data?.states) ? data.states : [];

    const out = AIRPORTS.map((a) => {
      let count = 0;
      for (const s of states) {
        const lon = s[5] as number | null;
        const lat = s[6] as number | null;
        const alt = s[7] as number | null;
        const ground = s[8] as boolean;
        if (lon == null || lat == null) continue;
        const dlat = lat - a.lat;
        const dlon = lon - a.lon;
        // 0.6°(~66km) 안 + 지상 또는 저고도(<2500m) = 이착륙/택싱 = 공항 활동
        if (dlat * dlat + dlon * dlon < 0.36 && (ground || (alt != null && alt < 2500))) {
          count++;
        }
      }
      return { icao: a.icao, lat: a.lat, lon: a.lon, count };
    });

    const body = JSON.stringify({ total: states.length, airports: out });
    lastGood = { body, at: Date.now() };
    return new Response(body, { headers: { "content-type": "application/json" } });
  } catch {
    return serveStale() ?? new Response("fetch failed", { status: 502 });
  }
}
