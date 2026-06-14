"use client";

import { MODES, modeById } from "@/lib/scenarios";
import { VERSIONS, modesOf, isPandemicView, type ViewMode } from "@/lib/versions";
import { useViz } from "@/store/useViz";
import { useExhibition } from "@/store/useExhibition";
import { useSheet } from "@/store/useSheet";
import { useIdle } from "@/store/useIdle";

/**
 * 하단 중앙 모드 바 — 그 버전이 '그 시대에 가졌던' 모드만 보여준다(자동 버튼은 없음 — 자동/수동은 상호작용으로).
 *   · 모드(modes) 없는 옛 버전·팬데믹 라인 버전 → 바 숨김.
 *   · 모드 직접 누르면 수동(자동 멈춤) + 그 시나리오로. 가만 두면 IdleController가 다시 자동.
 */
export function ScenarioBar() {
  const mode = useViz((s) => s.mode);
  const versionId = useViz((s) => s.versionId);
  const setMode = useViz((s) => s.setMode);
  const sheetStage = useSheet((s) => s.stage); // 모바일 시트가 열려 있으면 바는 숨김
  const idle = useIdle((s) => s.idle); // 무반응/immersive 시 — 바 숨김

  const cur = VERSIONS.find((v) => v.id === versionId);
  const avail = modesOf(cur); // ['live','genesis',('pandemic'),('trauma')] 또는 []

  // 모드 없는 버전(옛 단일·팬데믹 라인)은 바 숨김
  if (avail.length === 0) return null;

  const activeMode = isPandemicView(versionId, mode) ? "pandemic" : mode;
  const activeInfo = modeById(activeMode);
  const shownModes = MODES.filter((m) => avail.includes(m.id as ViewMode));

  // 모드 직접 선택 → 수동(자동 멈춤) + 그 모드로
  const pick = (id: string) => {
    useExhibition.getState().setAuto(false);
    setMode(id);
  };

  return (
    <div
      className={`pointer-events-none absolute bottom-28 left-1/2 z-20 flex w-[min(calc(100vw-1rem),560px)] -translate-x-1/2 flex-col items-center select-none transition-opacity duration-700 lg:bottom-4 ${
        sheetStage !== "peek" ? "max-lg:hidden" : ""
      } ${idle ? "opacity-0" : "opacity-100"}`}
    >
      {activeInfo && (
        <div className="mb-2 flex w-full justify-center">
          <span
            className={`max-w-full truncate rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${
              activeInfo.kind === "live"
                ? "bg-neon-green/15 text-neon-green ring-1 ring-neon-green/40"
                : "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40"
            }`}
          >
            {activeInfo.badge}
          </span>
        </div>
      )}

      <div className={`flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-panel-border bg-black/70 p-1 backdrop-blur-sm ${idle ? "pointer-events-none" : "pointer-events-auto"}`}>
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
