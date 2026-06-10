import type { NextRequest } from "next/server";

// 외부 데이터 프록시·캐시 (단일 동적 라우트).
// Next 16: route handler 기본 비캐시 → fetch(url, { next: { revalidate } })로 upstream 캐시.
// (Vercel 배포 시 Data Cache로 자동 승격 → 레이트리밋 회피)
const UPSTREAM: Record<string, { url: string; revalidate: number }> = {
  quakes: {
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
    revalidate: 60,
  },
  starlink: {
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle",
    revalidate: 7200,
  },
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const up = UPSTREAM[id];
  if (!up) return new Response("unknown signal", { status: 404 });

  try {
    const res = await fetch(up.url, { next: { revalidate: up.revalidate } });
    if (!res.ok) return new Response("upstream error", { status: 502 });
    return new Response(await res.text(), {
      headers: {
        "content-type": res.headers.get("content-type") ?? "text/plain",
      },
    });
  } catch {
    return new Response("fetch failed", { status: 502 });
  }
}
