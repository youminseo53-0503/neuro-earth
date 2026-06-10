import type { NextRequest } from "next/server";
import { STARLINK_FALLBACK_TLE } from "@/lib/signals/starlink-fallback";

// 라이브가 막혔을 때 쓰는 번들 스냅샷(실제 TLE)
const FALLBACK: Record<string, string> = { starlink: STARLINK_FALLBACK_TLE };

// 외부 데이터 프록시·캐시 (단일 동적 라우트).
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

// 서버 메모리의 마지막 성공분 + 시각. 자체 TTL로 upstream을 최소로만 두드린다
// (CelesTrak 2h / USGS 60s 레이트리밋 회피). 실패하면 stale로라도 제공.
const lastGood: Record<string, { body: string; ct: string; at: number }> = {};

// 레이트리밋 안내 텍스트 등 '가짜 성공'을 캐시에 넣지 않도록 검증
function looksValid(id: string, body: string): boolean {
  if (id === "starlink") return body.includes("\n1 ") && body.length > 500;
  if (id === "quakes") return body.includes('"features"');
  return body.length > 0;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const up = UPSTREAM[id];
  if (!up) return new Response("unknown signal", { status: 404 });

  const cached = lastGood[id];
  const serve = (hit: string) =>
    new Response(cached!.body, {
      headers: { "content-type": cached!.ct, "x-cache": hit },
    });

  // 신선하면 upstream 안 두드리고 메모리에서
  if (cached && Date.now() - cached.at < up.revalidate * 1000) return serve("hit");

  try {
    const res = await fetch(up.url, { next: { revalidate: up.revalidate } });
    if (res.ok) {
      const body = await res.text();
      const ct = res.headers.get("content-type") ?? "text/plain";
      if (looksValid(id, body)) {
        lastGood[id] = { body, ct, at: Date.now() };
        return new Response(body, { headers: { "content-type": ct } });
      }
    }
    return cached ? serve("stale") : fallbackOr502(id, "upstream error");
  } catch {
    return cached ? serve("stale") : fallbackOr502(id, "fetch failed");
  }
}

function fallbackOr502(id: string, msg: string): Response {
  const fb = FALLBACK[id];
  if (fb) {
    lastGood[id] = { body: fb, ct: "text/plain", at: Date.now() };
    return new Response(fb, {
      headers: { "content-type": "text/plain", "x-cache": "fallback" },
    });
  }
  return new Response(msg, { status: 502 });
}
