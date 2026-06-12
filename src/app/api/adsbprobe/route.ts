// 임시 진단 — ADS-B 후보 API들이 Vercel(클라우드)에서 닿는지 확인. 검증 후 삭제.
const CANDIDATES = [
  { name: "adsb.lol", url: "https://api.adsb.lol/v2/lat/37.46/lon/126.44/dist/200", arr: "ac" },
  { name: "adsb.fi", url: "https://opendata.adsb.fi/api/v2/lat/37.46/lon/126.44/dist/200", arr: "aircraft" },
  { name: "airplanes.live", url: "https://api.airplanes.live/v2/point/37.46/126.44/200", arr: "ac" },
];

export async function GET() {
  const results = await Promise.all(
    CANDIDATES.map(async (c) => {
      const t0 = Date.now();
      try {
        const res = await fetch(c.url, {
          headers: { "user-agent": "neuro-earth/1.0" },
          signal: AbortSignal.timeout(8000),
        });
        const ms = Date.now() - t0;
        if (!res.ok) return { name: c.name, ok: false, status: res.status, ms };
        const j = await res.json();
        const count = Array.isArray(j[c.arr]) ? j[c.arr].length : null;
        return { name: c.name, ok: true, status: res.status, ms, count };
      } catch (e) {
        return { name: c.name, ok: false, error: (e as Error)?.message ?? String(e), ms: Date.now() - t0 };
      }
    }),
  );
  return Response.json({ region: process.env.VERCEL_REGION ?? "?", results });
}
