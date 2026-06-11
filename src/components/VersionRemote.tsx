"use client";

import { useState } from "react";
import { VERSIONS, type VizVersion } from "@/lib/versions";
import { useViz } from "@/store/useViz";

/**
 * 버전 리모컨 — 좌측 가장자리 탭. 기본은 접힘(작은 탭),
 * 클릭하면 스크롤되는 컴팩트 타임라인이 펼쳐진다(버전 20개+라도 안 길어짐).
 *   · 누르면 그 버전으로 시간여행 + 오른쪽 피드가 해당 항목으로 스크롤.
 *   · 시나리오(실시간/창세)와 양방향 연동되므로 현재 버전이 항상 하이라이트.
 */
export function VersionRemote() {
  const versionId = useViz((s) => s.versionId);
  const setVersion = useViz((s) => s.setVersion);
  const [open, setOpen] = useState(false);

  const current = VERSIONS.find((v) => v.id === versionId);
  const curIdx = current ? VERSIONS.indexOf(current) : -1;

  const select = (v: VizVersion) => {
    setVersion(v.id);
    document
      .getElementById(`feed-${v.n}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // 접힌 상태 — 가장자리 작은 탭
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute left-0 top-1/2 z-20 flex -translate-y-1/2 items-center gap-1.5 rounded-r-lg border border-l-0 border-panel-border bg-black/70 py-2 pl-2 pr-2.5 text-[11px] font-semibold text-white/70 backdrop-blur-sm transition hover:border-neon-cyan/50 hover:text-neon-cyan"
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
    );
  }

  // 펼친 상태 — 스크롤되는 컴팩트 리스트
  return (
    <div className="absolute left-0 top-1/2 z-20 flex max-h-[82vh] w-52 -translate-y-1/2 flex-col rounded-r-lg border border-l-0 border-panel-border bg-black/80 backdrop-blur-sm">
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
  );
}
