"use client";

import { BRIEFINGS } from "@/lib/briefings";
import { useStage } from "@/store/useStage";
import { usePandemic } from "@/store/usePandemic";

/**
 * 전시(자동) 나레이션 — 관조 비트에서만 뜬다(카메라가 빠져 지구가 작아진 상태).
 *   작아진 지구 '아래' 하단 밴드. 글 배치는 잡지 기사처럼: 키커 → 제목 → 데크(뇌과학) → 구분선 →
 *   본문(좌측 정렬·넉넉한 행간·문단 분리)로 가독성을 잡았다.
 *   수동 모드에선 컨트롤러가 narrKey를 비워 안 뜬다(그땐 브리핑 패널로 직접 펼쳐 읽기).
 */
export function ExhibitionNarration() {
  const narrKey = useStage((s) => s.narrKey);
  const dateLabel = usePandemic((s) => s.dateLabel); // 팬데믹: 관조 동안 오늘까지 흐르는 날짜
  const live = narrKey === "live";
  const b = narrKey ? BRIEFINGS[narrKey] : null;

  return (
    <div
      className={`pointer-events-none fixed bottom-[5dvh] left-1/2 z-30 w-[min(92vw,660px)] -translate-x-1/2 transition-opacity duration-[1200ms] ${
        narrKey ? "opacity-100" : "opacity-0"
      }`}
    >
      {b && (
        <div className="rounded-2xl border border-panel-border bg-black/60 px-7 py-5 backdrop-blur-md">
          {narrKey === "pandemic" && dateLabel && (
            <div
              className="mb-3 text-center font-mono text-[clamp(22px,2.4vw,34px)] font-bold tracking-[0.18em] text-white/92"
              style={{ textShadow: "0 2px 18px rgba(255,70,70,0.45)" }}
            >
              {dateLabel}
            </div>
          )}
          {/* 키커 */}
          <div
            className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.3em] ${
              live ? "text-neon-green/80" : "text-amber-300/80"
            }`}
          >
            {live ? "Live · 실시간" : "Scenario · 시나리오"}
          </div>
          {/* 제목 */}
          <h2 className="text-balance text-[clamp(19px,2.2vw,27px)] font-bold leading-tight tracking-tight text-white">
            {b.title}
          </h2>
          {/* 데크(본뜬 뇌과학) */}
          <p className="mt-1 text-[12.5px] italic leading-snug text-neon-cyan/80">{b.brain}</p>
          {/* 구분선 */}
          <div className="my-3 h-px w-16 bg-white/25" />
          {/* 본문 — 좌측 정렬·넉넉한 행간·문단 분리 */}
          <p className="whitespace-pre-line text-pretty text-[13.5px] leading-[1.85] text-white/80">{b.body}</p>
        </div>
      )}
    </div>
  );
}
