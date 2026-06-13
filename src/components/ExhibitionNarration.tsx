"use client";

import { BRIEFINGS } from "@/lib/briefings";
import { useStage } from "@/store/useStage";
import { usePandemic } from "@/store/usePandemic";

/**
 * 전시(자동) 나레이션 — 관조 비트에서만 뜬다(컨트롤러가 narrKey 세팅 = 카메라가 빠져 지구가 작아진 상태).
 *   지구가 작아진 '아래'에 하단 밴드로 — 모니터 크기와 무관하게 안 가린다. 부드럽게 페이드.
 *   수동 모드에선 컨트롤러가 narrKey를 비우므로 안 뜬다(그땐 브리핑 패널로 직접 펼쳐 읽기).
 */
export function ExhibitionNarration() {
  const narrKey = useStage((s) => s.narrKey);
  const dateLabel = usePandemic((s) => s.dateLabel); // 팬데믹: 관조 동안 오늘까지 흐르는 날짜
  const live = narrKey === "live";
  const b = narrKey ? BRIEFINGS[narrKey] : null;

  return (
    <div
      className={`pointer-events-none fixed bottom-[5dvh] left-1/2 z-30 w-[min(92vw,640px)] -translate-x-1/2 transition-opacity duration-[1200ms] ${
        narrKey ? "opacity-100" : "opacity-0"
      }`}
    >
      {b && (
        <div className="rounded-2xl border border-panel-border bg-black/55 px-5 py-4 text-center backdrop-blur-md">
          {narrKey === "pandemic" && dateLabel && (
            <div
              className="mb-1 font-mono text-[clamp(20px,2vw,30px)] font-bold tracking-[0.15em] text-white/90"
              style={{ textShadow: "0 2px 18px rgba(255,60,60,0.45)" }}
            >
              {dateLabel}
            </div>
          )}
          <div className="mb-1.5 flex items-center justify-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                live
                  ? "bg-neon-green/15 text-neon-green ring-1 ring-neon-green/40"
                  : "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40"
              }`}
            >
              {live ? "● 실시간" : "시나리오"}
            </span>
            <span className="text-[16px] font-bold text-white/90">{b.title}</span>
          </div>
          <div className="mb-2 text-[12px] italic leading-snug text-neon-cyan/75">🧠 {b.brain}</div>
          <p className="text-[12.5px] leading-relaxed text-white/72">{b.body}</p>
        </div>
      )}
    </div>
  );
}
