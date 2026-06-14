"use client";

import { BRIEFINGS } from "@/lib/briefings";
import { useStage } from "@/store/useStage";
import { usePandemic } from "@/store/usePandemic";
import { useIdle } from "@/store/useIdle";

/**
 * 전시(자동) 나레이션 — 관조 비트에서만 뜬다(카메라가 빠져 지구가 작아진 상태).
 *   지구 신경망은 무조건 중앙이라, 나레이션은 '작아진 지구 아래' 낮고 컴팩트한 하단 띠로만 둔다.
 *   긴 본문(브리핑)은 모바일 시트/보고서에서 읽고, 여기선 핵심 한두 문장(b.short)만 — 절대 지구를 가리지 않게.
 *   수동 모드에선 컨트롤러가 narrKey를 비워 안 뜬다.
 */
export function ExhibitionNarration() {
  const narrKey = useStage((s) => s.narrKey);
  const dateLabel = usePandemic((s) => s.dateLabel); // 팬데믹: 관조 동안 오늘까지 흐르는 날짜
  const photo = useIdle((s) => s.photo); // 사진찍기 모드면 나레이션도 치움
  const live = narrKey === "live";
  const b = !photo && narrKey ? BRIEFINGS[narrKey] : null;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-[4dvh] z-30 flex justify-center px-3 transition-opacity duration-[1100ms] ${
        narrKey && !photo ? "opacity-100" : "opacity-0"
      }`}
    >
      {b && (
        <div className="w-[min(94vw,600px)] rounded-2xl border border-panel-border bg-black/55 px-5 py-3 text-center backdrop-blur-md">
          {narrKey === "pandemic" && dateLabel && (
            <div
              className="mb-1.5 font-mono text-[clamp(16px,2vw,24px)] font-bold tracking-[0.16em] text-white/92"
              style={{ textShadow: "0 2px 16px rgba(255,70,70,0.45)" }}
            >
              {dateLabel}
            </div>
          )}
          {/* 키커 + 제목 한 줄 */}
          <div className="flex items-center justify-center gap-2">
            <span
              className={`shrink-0 text-[9px] font-semibold uppercase tracking-[0.28em] ${
                live ? "text-neon-green/80" : "text-amber-300/80"
              }`}
            >
              {live ? "Live" : "Scene"}
            </span>
            <h2 className="text-[clamp(15px,1.8vw,20px)] font-bold leading-tight tracking-tight text-white">
              {b.title}
            </h2>
          </div>
          {/* 핵심 한두 문장 */}
          <p className="mt-1 text-pretty text-[clamp(12px,1.4vw,14px)] leading-snug text-white/78">
            {b.short}
          </p>
        </div>
      )}
    </div>
  );
}
