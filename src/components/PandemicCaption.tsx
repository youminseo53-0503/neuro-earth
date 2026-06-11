"use client";

import { usePandemic } from "@/store/usePandemic";

/**
 * 팬데믹 '멸종' 시네마틱의 화면 하단 자막(다큐멘터리 로어서드).
 *   · 큰 날짜(2019.12→2021) + 한 줄 내레이션 + 감염률 바.
 *   · pandemicArc 버전(26)을 볼 때만 EmergentLayer가 active=true로 켠다.
 */
export function PandemicCaption() {
  const { active, dateLabel, caption, infectedPct, phase } = usePandemic();
  if (!active) return null;

  const pct = Math.round(infectedPct * 100);
  const frozen = phase === "lockdown" || phase === "frozen";

  return (
    <div className="pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2 select-none text-center">
      <div
        className="font-mono text-5xl font-bold tracking-[0.18em] text-white/95"
        style={{ textShadow: "0 2px 24px rgba(255,40,40,0.55), 0 0 2px rgba(0,0,0,0.8)" }}
      >
        {dateLabel}
      </div>
      <div className="mt-2 text-sm font-medium tracking-wide text-white/65">{caption}</div>

      {/* 감염률 바 */}
      <div className="mx-auto mt-3 flex w-64 items-center gap-2">
        <span className="font-mono text-[10px] tracking-wider text-rose-300/70">감염</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${pct}%`,
              background: frozen
                ? "linear-gradient(90deg,#7f1d1d,#ef4444)"
                : "linear-gradient(90deg,#f59e0b,#ef4444)",
            }}
          />
        </div>
        <span className="w-8 text-right font-mono text-[10px] text-rose-200/80">{pct}%</span>
      </div>
    </div>
  );
}
