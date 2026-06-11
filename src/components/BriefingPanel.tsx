"use client";

import { useState } from "react";
import { BRIEFINGS, type Briefing } from "@/lib/briefings";
import { isPandemicVersion } from "@/lib/versions";
import { useViz } from "@/store/useViz";

/**
 * 우측 하단 시나리오 브리핑 패널(캠페인 미션 브리핑 느낌).
 *   현재 보고 있는 시나리오가 '어떤 뇌과학 상황을 본떴고 무엇을 보여주려 했는지' 줄글로.
 *   접고 펼칠 수 있다(기본 펼침).
 */
export function BriefingPanel() {
  const mode = useViz((s) => s.mode);
  const versionId = useViz((s) => s.versionId);
  const [open, setOpen] = useState(true);

  const key: Briefing["key"] = isPandemicVersion(versionId)
    ? "pandemic"
    : mode === "genesis"
      ? "genesis"
      : "live";
  const b = BRIEFINGS[key];

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-20 w-[340px] max-w-[42vw] select-none">
      <div className="pointer-events-auto overflow-hidden rounded-lg border border-neon-cyan/25 bg-black/70 backdrop-blur-sm">
        {/* 헤더 */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 border-b border-white/10 bg-neon-cyan/5 px-3 py-2 text-left transition hover:bg-neon-cyan/10"
        >
          <span className="rounded bg-neon-cyan/15 px-1.5 py-px font-mono text-[9px] tracking-wider text-neon-cyan">
            BRIEFING
          </span>
          <span className="text-[12px] font-bold text-white/85">{b.title}</span>
          <span className="ml-auto text-[11px] text-white/35">{open ? "▾" : "▸"}</span>
        </button>

        {open && (
          <div className="px-3.5 py-3">
            <div className="mb-2 flex items-start gap-1.5 text-[10px] leading-snug text-neon-cyan/70">
              <span className="mt-px shrink-0">🧠</span>
              <span className="italic">{b.brain}</span>
            </div>
            <p className="whitespace-pre-line text-[11.5px] leading-relaxed text-white/65">
              {b.body}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
