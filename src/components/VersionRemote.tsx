"use client";

import { useState } from "react";
import { VERSIONS, type VizVersion } from "@/lib/versions";
import { useViz } from "@/store/useViz";
import { useExhibition } from "@/store/useExhibition";
import { useIdle } from "@/store/useIdle";

/**
 * 버전 리모컨 — 좌측 가장자리 탭. 기본은 접힘(작은 탭),
 * 클릭하면 스크롤되는 컴팩트 타임라인이 펼쳐진다(버전 20개+라도 안 길어짐).
 *   · 누르면 그 버전으로 시간여행 + 오른쪽 피드가 해당 항목으로 스크롤.
 *   · 시나리오(실시간/창세)와 양방향 연동되므로 현재 버전이 항상 하이라이트.
 */
export function VersionRemote() {
  const versionId = useViz((s) => s.versionId);
  const setVersion = useViz((s) => s.setVersion);
  const idle = useIdle((s) => s.idle);
  const [open, setOpen] = useState(false);
  const idleCls = idle ? "pointer-events-none opacity-0" : "opacity-100";

  const current = VERSIONS.find((v) => v.id === versionId);
  const curIdx = current ? VERSIONS.indexOf(current) : -1;

  const select = (v: VizVersion) => {
    useExhibition.getState().setAuto(false); // 직접 버전 선택 → 자동순환 중단
    setVersion(v.id);
    document
      .getElementById(`feed-${v.n}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // 접힌 상태 — 데스크탑: 좌측 엣지 탭 / 모바일: 우상단 작은 칩
  if (!open) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={`absolute left-0 top-1/2 z-20 hidden -translate-y-1/2 items-center gap-1.5 rounded-r-lg border border-l-0 border-panel-border bg-black/70 py-2 pl-2 pr-2.5 text-[11px] font-semibold text-white/70 backdrop-blur-sm transition-opacity duration-700 hover:border-neon-cyan/50 hover:text-neon-cyan lg:flex ${idleCls}`}
          title="버전 타임라인 열기"
        >
          🕹️ 버전
          {curIdx >= 0 && (
            <span className="font-mono text-neon-green">
              {String(curIdx).padStart(2, "0")}
            </span>
          )}
          <span className="text-white/30">▸</span>
        </button>
        <button
          onClick={() => setOpen(true)}
          className={`absolute right-3 top-3 z-20 rounded-full border border-panel-border bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-sm transition-opacity duration-700 lg:hidden ${idleCls}`}
          title="버전 타임라인 열기"
        >
          🕹️ v{curIdx >= 0 ? String(curIdx).padStart(2, "0") : "—"}
        </button>
      </>
    );
  }

  // 펼친 상태 — 데스크탑: 좌측 패널 / 모바일: 중앙 팝오버(+백드롭, 밖 탭=닫기)
  return (
    <>
    <div className="absolute inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
    <div className="absolute z-30 flex flex-col border border-panel-border bg-black/85 backdrop-blur-sm max-lg:inset-x-4 max-lg:top-14 max-lg:max-h-[62dvh] max-lg:rounded-xl lg:left-0 lg:top-1/2 lg:max-h-[82vh] lg:w-52 lg:-translate-y-1/2 lg:rounded-r-lg lg:border-l-0 lg:bg-black/80">
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-2">
        <span className="text-[11px] font-bold text-white/70">🕹️ 버전 타임라인</span>
        <button
          onClick={() => setOpen(false)}
          className="text-[11px] text-white/40 transition hover:text-neon-cyan"
        >
          ◂ 접기
        </button>
      </div>
      <div className="feed-scroll flex flex-col gap-0.5 overflow-y-auto p-2">
        {VERSIONS.map((v, i) => (
          <button
            key={v.id}
            onClick={() => select(v)}
            className={`rounded px-2 py-1.5 text-left text-[11px] font-medium leading-tight transition ${
              versionId === v.id
                ? "bg-neon-green/15 text-neon-green ring-1 ring-neon-green/40"
                : "text-white/50 hover:bg-white/5 hover:text-neon-cyan"
            }`}
          >
            <span className="font-mono opacity-50">{String(i).padStart(2, "0")}</span>{" "}
            {v.label}
          </button>
        ))}
      </div>
    </div>
    </>
  );
}
