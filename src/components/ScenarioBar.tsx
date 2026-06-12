"use client";

import { MODES, modeById } from "@/lib/scenarios";
import { isPandemicVersion, LATEST } from "@/lib/versions";
import { useViz } from "@/store/useViz";
import { useExhibition } from "@/store/useExhibition";
import { useSheet } from "@/store/useSheet";
import { useIdle } from "@/store/useIdle";

/**
 * 하단 중앙 모드 바 — 실시간 / 창세 / 팬데믹 / 회복.
 *   · 버전(단계)과 직각인 '보는 방식' 토글. 현재 단계를 그 모드로 다시 그린다.
 *   · 정직성 배지(LIVE=초록 / 시나리오=호박색)와 한 줄 설명을 위에 띄움.
 *   · 옛 버전(단계 아님)을 보는 중엔 누르면 최신 단계로 점프.
 */
export function ScenarioBar() {
  const mode = useViz((s) => s.mode);
  const versionId = useViz((s) => s.versionId);
  const setMode = useViz((s) => s.setMode);
  const auto = useExhibition((s) => s.auto);
  const sheetStage = useSheet((s) => s.stage); // 모바일 시트가 열려 있으면 바는 숨김(시트 헤더 배지가 대신)
  const idle = useIdle((s) => s.idle); // 무반응 시 어트랙트 모드 — 바 숨김

  // 팬데믹은 별도 버전 라인 → 그 버전을 보는 중이면 하단 바도 '팬데믹' 활성
  const activeMode = isPandemicVersion(versionId) ? "pandemic" : mode;
  const activeInfo = modeById(activeMode);

  // 사용자가 직접 모드를 누르면 자동순환 중단(자유 탐색)
  const pick = (id: string) => {
    useExhibition.getState().setAuto(false);
    setMode(id);
  };

  // 자동순환 켜기 — 자동재생을 지원 안 하는 옛 버전(v27 미만)을 보던 중이면 최신 단계로 점프
  const onToggleAuto = () => {
    const turningOn = !auto;
    useExhibition.getState().setAuto(turningOn);
    if (turningOn && !useViz.getState().config.exhibit) {
      useViz.getState().setVersion(LATEST.id);
    }
  };

  return (
    <div
      className={`pointer-events-none absolute bottom-28 left-1/2 z-20 w-max max-w-[calc(100vw-16px)] -translate-x-1/2 select-none transition-opacity duration-700 lg:bottom-4 lg:max-w-none ${
        sheetStage !== "peek" ? "max-lg:hidden" : ""
      } ${idle ? "opacity-0" : "opacity-100"}`}
    >
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
          <span className="hidden font-mono text-[10px] text-white/45 lg:inline">{activeInfo.blurb}</span>
        </div>
      )}

      <div className={`flex items-center gap-1 overflow-x-auto rounded-full border border-panel-border bg-black/70 p-1 backdrop-blur-sm ${idle ? "pointer-events-none" : "pointer-events-auto"}`}>
        {/* 자동순환 토글 — 켜면 시나리오를 스스로 왔다갔다(전시 모드) */}
        <button
          onClick={onToggleAuto}
          title="자동순환(전시 모드) — 실시간→창세→팬데믹을 스스로 넘김"
          className={`mr-0.5 shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-medium transition lg:py-1.5 ${
            auto
              ? "bg-neon-cyan/15 text-neon-cyan ring-1 ring-neon-cyan/40"
              : "text-white/45 hover:bg-white/5 hover:text-neon-cyan"
          }`}
        >
          🔁 자동
        </button>
        {MODES.map((m) => {
          const on = m.id === activeMode;
          const soon = m.status === "soon";
          return (
            <button
              key={m.id}
              disabled={soon}
              onClick={() => pick(m.id)}
              title={m.blurb}
              className={`relative shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-medium transition lg:px-4 lg:py-1.5 ${
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
