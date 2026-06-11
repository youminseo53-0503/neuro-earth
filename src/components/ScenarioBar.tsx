"use client";

import { SCENARIOS, scenarioById } from "@/lib/scenarios";
import { useViz } from "@/store/useViz";

/**
 * 하단 중앙 시나리오 바 — 보고서의 4개 입구.
 *   · 실시간(LIVE) / 창세 / 팬데믹 / 회복
 *   · 활성 시나리오의 '정직성 배지'(LIVE=초록 / 시나리오=호박색)와 한 줄 설명을 위에 띄움.
 *   · '준비 중(soon)'은 비활성 + '곧' 표시.
 */
export function ScenarioBar() {
  const scenarioId = useViz((s) => s.scenarioId);
  const setScenario = useViz((s) => s.setScenario);
  const active = scenarioById(scenarioId);

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 select-none">
      {/* 정직성 배지 + 한 줄 설명 */}
      {active && (
        <div className="mb-2 flex items-center justify-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${
              active.kind === "live"
                ? "bg-neon-green/15 text-neon-green ring-1 ring-neon-green/40"
                : "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40"
            }`}
          >
            {active.badge}
          </span>
          <span className="font-mono text-[10px] text-white/45">{active.blurb}</span>
        </div>
      )}

      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-panel-border bg-black/70 p-1 backdrop-blur-sm">
        {SCENARIOS.map((s) => {
          const on = s.id === scenarioId;
          const soon = s.status === "soon";
          return (
            <button
              key={s.id}
              disabled={soon}
              onClick={() => setScenario(s.id)}
              title={s.blurb}
              className={`relative rounded-full px-4 py-1.5 text-[12px] font-medium transition ${
                on
                  ? "bg-white/10 text-white ring-1 ring-white/30"
                  : soon
                    ? "cursor-not-allowed text-white/25"
                    : "text-white/55 hover:bg-white/5 hover:text-neon-cyan"
              }`}
            >
              {s.label}
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
