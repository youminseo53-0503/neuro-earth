"use client";

import { useState } from "react";
import { BRIEFINGS, type Briefing } from "@/lib/briefings";
import { isPandemicView } from "@/lib/versions";
import { useViz } from "@/store/useViz";
import { useIdle } from "@/store/useIdle";

/**
 * 우측 하단 시나리오 브리핑 패널(캠페인 미션 브리핑 느낌).
 *   현재 보고 있는 시나리오가 '어떤 뇌과학 상황을 본떴고 무엇을 보여주려 했는지' 줄글로.
 *   접고 펼칠 수 있다(기본 펼침).
 */
export function BriefingPanel() {
  const mode = useViz((s) => s.mode);
  const versionId = useViz((s) => s.versionId);
  const idle = useIdle((s) => s.idle);
  const [open, setOpen] = useState(true);

  const key: Briefing["key"] =
    mode === "trauma"
      ? "trauma"
      : isPandemicView(versionId, mode)
        ? "pandemic"
        : mode === "genesis"
          ? "genesis"
          : "live";
  const b = BRIEFINGS[key];

  return (
    <div
      className={`pointer-events-none absolute bottom-4 right-4 z-20 hidden w-[clamp(340px,24vw,480px)] max-w-[44vw] select-none transition-opacity duration-700 lg:block ${
        idle ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className={`overflow-hidden rounded-lg border border-neon-cyan/25 bg-black/70 backdrop-blur-sm ${idle ? "pointer-events-none" : "pointer-events-auto"}`}>
        {/* 헤더 */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 border-b border-white/10 bg-neon-cyan/5 px-3 py-2 text-left transition hover:bg-neon-cyan/10"
        >
          <span className="rounded bg-neon-cyan/15 px-1.5 py-px font-mono text-[clamp(9px,0.6vw,12px)] tracking-wider text-neon-cyan">
            BRIEFING
          </span>
          <span className="text-[clamp(13px,0.95vw,19px)] font-bold text-white/85">{b.title}</span>
          <span className="ml-auto text-[clamp(11px,0.8vw,15px)] text-white/35">{open ? "▾" : "▸"}</span>
        </button>

        {open && (
          <div className="px-3.5 py-3">
            <div className="mb-2 flex items-start gap-1.5 text-[clamp(11px,0.78vw,15px)] leading-snug text-neon-cyan/70">
              <span className="mt-px shrink-0">🧠</span>
              <span className="italic">{b.brain}</span>
            </div>
            <p className="whitespace-pre-line text-[clamp(12.5px,0.92vw,18px)] leading-relaxed text-white/70">
              {b.body}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
