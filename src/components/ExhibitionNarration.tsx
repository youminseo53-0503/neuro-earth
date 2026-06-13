"use client";

import { useEffect, useState } from "react";
import { BRIEFINGS, type Briefing } from "@/lib/briefings";
import { isPandemicView } from "@/lib/versions";
import { useViz } from "@/store/useViz";
import { useExhibition } from "@/store/useExhibition";

/**
 * 전시(자동) 나레이션 — 자동순환일 때만, 지금 보는 시나리오의 설명을 신경망 '옆에' 띄운다.
 *   · 세로(아이패드 미니 등): 하단 밴드 / 가로: 좌측 컬럼 — 가운데 망을 가리지 않게.
 *   · 시나리오가 시작되고 잠깐 뒤 떠서, 읽을 시간을 충분히 두고 머문다.
 *   · 수동 모드에선 안 뜬다(그땐 사용자가 직접 브리핑 패널을 펼쳐 읽음).
 */
export function ExhibitionNarration() {
  const mode = useViz((s) => s.mode);
  const versionId = useViz((s) => s.versionId);
  const auto = useExhibition((s) => s.auto);

  const key: Briefing["key"] =
    mode === "trauma"
      ? "trauma"
      : isPandemicView(versionId, mode)
        ? "pandemic"
        : mode === "genesis"
          ? "genesis"
          : "live";

  // 시나리오가 바뀌면 잠깐 뒤(6초) 나레이션 등장 — 먼저 장면을 보고, 그 다음 설명.
  // setState는 타임아웃 콜백에서만(effect 본문 동기 setState 금지 규칙 회피). shown은 파생값.
  const [readyKey, setReadyKey] = useState<string | null>(null);
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => setReadyKey(key), 6000);
    return () => clearTimeout(t);
  }, [auto, key]);
  const shown = auto && readyKey === key;

  if (!auto) return null;
  const b = BRIEFINGS[key];
  const live = key === "live";

  return (
    <div
      className={`pointer-events-none fixed z-30 transition-opacity duration-[1200ms] max-lg:inset-x-3 max-lg:bottom-6 lg:left-8 lg:top-1/2 lg:w-[360px] lg:-translate-y-1/2 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="rounded-2xl border border-panel-border bg-black/55 px-5 py-4 backdrop-blur-md">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
              live
                ? "bg-neon-green/15 text-neon-green ring-1 ring-neon-green/40"
                : "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40"
            }`}
          >
            {live ? "● 실시간" : "시나리오"}
          </span>
          <span className="text-[15px] font-bold text-white/90">{b.title}</span>
        </div>
        <div className="mb-2 flex items-start gap-1.5 text-[12px] leading-snug text-neon-cyan/75">
          <span className="mt-px shrink-0">🧠</span>
          <span className="italic">{b.brain}</span>
        </div>
        <p className="text-[12.5px] leading-relaxed text-white/70">{b.body}</p>
      </div>
    </div>
  );
}
