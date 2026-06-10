// OpenSky 실시간 항공 — 서버에서만 키 사용(클라 노출 X).
// OAuth2 client_credentials로 토큰 발급 → /states/all → 공항별 '근처 비행기 수' 집계.
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const STATES_URL = "https://opensky-network.org/api/states/all";

// 주요 공항 거점 (ICAO, 위도, 경도)
const AIRPORTS: { icao: string; lat: number; lon: number }[] = [
  { icao: "ATL", lat: 33.64, lon: -84.43 }, { icao: "PEK", lat: 40.08, lon: 116.58 },
  { icao: "LHR", lat: 51.47, lon: -0.46 }, { icao: "HND", lat: 35.55, lon: 139.78 },
  { icao: "LAX", lat: 33.94, lon: -118.41 }, { icao: "CDG", lat: 49.01, lon: 2.55 },
  { icao: "DXB", lat: 25.25, lon: 55.36 }, { icao: "FRA", lat: 50.03, lon: 8.56 },
  { icao: "IST", lat: 41.26, lon: 28.74 }, { icao: "AMS", lat: 52.31, lon: 4.76 },
  { icao: "CAN", lat: 23.39, lon: 113.3 }, { icao: "ICN", lat: 37.46, lon: 126.44 },
  { icao: "SIN", lat: 1.36, lon: 103.99 }, { icao: "DEN", lat: 39.86, lon: -104.67 },
  { icao: "JFK", lat: 40.64, lon: -73.78 }, { icao: "DFW", lat: 32.9, lon: -97.04 },
  { icao: "SFO", lat: 37.62, lon: -122.38 }, { icao: "ORD", lat: 41.98, lon: -87.9 },
  { icao: "PVG", lat: 31.14, lon: 121.81 }, { icao: "HKG", lat: 22.31, lon: 113.91 },
  { icao: "DEL", lat: 28.56, lon: 77.1 }, { icao: "BKK", lat: 13.69, lon: 100.75 },
  { icao: "MAD", lat: 40.47, lon: -3.56 }, { icao: "GRU", lat: -23.43, lon: -46.47 },
  { icao: "SYD", lat: -33.95, lon: 151.18 }, { icao: "YYZ", lat: 43.68, lon: -79.61 },
  { icao: "MEX", lat: 19.44, lon: -99.07 }, { icao: "JNB", lat: -26.13, lon: 28.24 },
  { icao: "SVO", lat: 55.97, lon: 37.41 }, { icao: "NRT", lat: 35.77, lon: 140.39 },
  { icao: "KUL", lat: 2.74, lon: 101.71 }, { icao: "BOM", lat: 19.09, lon: 72.87 },
  { icao: "CGK", lat: -6.13, lon: 106.66 }, { icao: "EZE", lat: -34.82, lon: -58.54 },
  { icao: "CAI", lat: 30.11, lon: 31.4 }, { icao: "DOH", lat: 25.27, lon: 51.61 },
  { icao: "SEA", lat: 47.45, lon: -122.31 }, { icao: "MIA", lat: 25.79, lon: -80.29 },
  { icao: "BCN", lat: 41.3, lon: 2.08 }, { icao: "MUC", lat: 48.35, lon: 11.79 },
];

let tokenCache: { token: string; exp: number } | null = null;
let lastGood: { body: string; at: number } | null = null;

async function getToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenCache.exp) return tokenCache.token;
  const id = process.env.OPENSKY_CLIENT_ID;
  const secret = process.env.OPENSKY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }),
  });
  if (!res.ok) return null;
  const j = await res.json();
  if (!j.access_token) return null;
  tokenCache = {
    token: j.access_token,
    exp: Date.now() + Math.max(60, (j.expires_in ?? 1800) - 60) * 1000,
  };
  return tokenCache.token;
}

export async function GET() {
  const serveStale = () =>
    lastGood
      ? new Response(lastGood.body, {
          headers: { "content-type": "application/json", "x-cache": "stale" },
        })
      : null;

  // 90초 TTL (크레딧 절약: 4000/일)
  if (lastGood && Date.now() - lastGood.at < 90_000) {
    return new Response(lastGood.body, {
      headers: { "content-type": "application/json", "x-cache": "hit" },
    });
  }

  const token = await getToken();
  if (!token) return serveStale() ?? new Response("no token (env?)", { status: 502 });

  try {
    const res = await fetch(STATES_URL, { headers: { authorization: `Bearer ${token}` } });
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
