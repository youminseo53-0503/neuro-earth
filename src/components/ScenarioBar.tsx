"use client";

import { MODES, modeById } from "@/lib/scenarios";
import {
  VERSIONS,
  LATEST,
  modesOf,
  supportsAuto,
  isPandemicView,
  type ViewMode,
} from "@/lib/versions";
import { useViz } from "@/store/useViz";
import { useExhibition } from "@/store/useExhibition";
import { useSheet } from "@/store/useSheet";
import { useIdle } from "@/store/useIdle";

/**
 * 하단 중앙 모드 바 — 그 버전이 '그 시대에 가졌던' 컨트롤만 보여준다.
 *   · 모드(modes) 없는 옛 버전(0-15)·팬데믹 라인 버전 → 바 자체를 숨김(창세 전엔 시나리오 토글이 없었다).
 *   · exhibit 지원(v27+) → '자동' 버튼 표시. 그 전 버전엔 자동이 아예 없음.
 *   · 그 버전이 가진 모드 버튼만(통합 버전만 팬데믹까지). 팬데믹은 버전 점프가 아니라 모드 전환.
 */
export function ScenarioBar() {
  const mode = useViz((s) => s.mode);
  const versionId = useViz((s) => s.versionId);
  const setMode = useViz((s) => s.setMode);
  const auto = useExhibition((s) => s.auto);
  const sheetStage = useSheet((s) => s.stage); // 모바일 시트가 열려 있으면 바는 숨김(시트 헤더 배지가 대신)
  const idle = useIdle((s) => s.idle); // 무반응/비우기 시 — 바 숨김

  const cur = VERSIONS.find((v) => v.id === versionId);
  const avail = modesOf(cur); // ['live','genesis',('pandemic')] 또는 []
  const canAuto = supportsAuto(cur);

  // 모드가 없는 버전(옛 단일·팬데믹 라인)은 바 자체를 숨긴다 — 그 시대엔 시나리오 토글이 없었으니.
  if (avail.length === 0) return null;

  const activeMode = isPandemicView(versionId, mode) ? "pandemic" : mode;
  const activeInfo = modeById(activeMode);
  const shownModes = MODES.filter((m) => avail.includes(m.id as ViewMode));

  // 사용자가 직접 모드를 누르면 자동순환 중단(자유 탐색)
  const pick = (id: string) => {
    useExhibition.getState().setAuto(false);
    setMode(id);
  };

  // 자동순환 = 전 시나리오(실시간→창세→팬데믹) 순환 = 통합 경험.
  // 전체 모드를 못 가진 버전에서 켜면 통합 버전으로 옮겨가 거기서 돈다.
  const onToggleAuto = () => {
    const turningOn = !auto;
    useExhibition.getState().setAuto(turningOn);
    if (turningOn && !cur?.modes?.pandemic) useViz.getState().setVersion(LATEST.id);
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
        {/* 자동순환 토글 — exhibit 지원 버전에서만 보인다(자동재생 전 버전엔 아예 없음) */}
        {canAuto && (
          <button
            onClick={onToggleAuto}
            title="자동순환(전시 모드) — 실시간→창세→팬데믹을 한 버전 안에서 스스로 넘김"
            className={`mr-0.5 shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-medium transition lg:py-1.5 ${
              auto
                ? "bg-neon-cyan/15 text-neon-cyan ring-1 ring-neon-cyan/40"
                : "text-white/45 hover:bg-white/5 hover:text-neon-cyan"
            }`}
          >
            🔁 자동
          </button>
        )}
        {shownModes.map((m) => {
          const on = m.id === activeMode;
          return (
            <button
              key={m.id}
              onClick={() => pick(m.id)}
              title={m.blurb}
              className={`relative shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-medium transition lg:px-4 lg:py-1.5 ${
                on
                  ? "bg-white/10 text-white ring-1 ring-white/30"
                  : "text-white/55 hover:bg-white/5 hover:text-neon-cyan"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
