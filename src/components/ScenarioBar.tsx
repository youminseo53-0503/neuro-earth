"use client";

import { MODES, modeById } from "@/lib/scenarios";
import { useViz } from "@/store/useViz";

/**
 * 하단 중앙 모드 바 — 실시간 / 창세 / 팬데믹 / 회복.
 *   · 버전(단계)과 직각인 '보는 방식' 토글. 현재 단계를 그 모드로 다시 그린다.
 *   · 정직성 배지(LIVE=초록 / 시나리오=호박색)와 한 줄 설명을 위에 띄움.
 *   · 옛 버전(단계 아님)을 보는 중엔 누르면 최신 단계로 점프.
 */
export function ScenarioBar() {
  const mode = useViz((s) => s.mode);
  const setMode = useViz((s) => s.setMode);

  const activeMode = mode; // 현재 모드(실시간/창세/팬데믹)
  const activeInfo = modeById(activeMode);

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 select-none">
      {activeInfo && (
        <div className="mb-2 flex items-center justify-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${
              activeInfo.kind === "live"
                ? "bg-neon-green/15 text-neon-green ring-1 ring-neon-green/40"
                : "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40"
            }`}
          >
            {activeInfo.badge}
          </span>
          <span className="font-mono text-[10px] text-white/45">{activeInfo.blurb}</span>
        </div>
      )}

      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-panel-border bg-black/70 p-1 backdrop-blur-sm">
        {MODES.map((m) => {
          const on = m.id === activeMode;
          const soon = m.status === "soon";
          return (
            <button
              key={m.id}
              disabled={soon}
              onClick={() => setMode(m.id)}
              title={m.blurb}
              className={`relative rounded-full px-4 py-1.5 text-[12px] font-medium transition ${
                on
                  ? "bg-white/10 text-white ring-1 ring-white/30"
                  : soon
                    ? "cursor-not-allowed text-white/25"
                    : "text-white/55 hover:bg-white/5 hover:text-neon-cyan"
              }`}
            >
              {m.label}
              {soon && (
                <span className="ml-1 rounded bg-white/10 px-1 align-middle text-[8px] text-white/40">
                  곧
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
