"use client";

import { timeline } from "@/data/timeline";
import { useUI } from "@/store/useUI";
import { FeedEntry } from "./FeedEntry";

export function PromptFeed() {
  const { globeVisible, toggleGlobe } = useUI();
  const pairCount = new Set(timeline.map((m) => m.n)).size;

  return (
    <div className="flex h-full flex-col bg-[#070b16]">
      {/* 헤더 */}
      <header className="flex items-center justify-between gap-2 border-b border-panel-border px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate font-mono text-sm font-bold tracking-tight text-white">
            NEURO·EARTH <span className="text-neon-cyan">개발 로그</span>
          </h1>
          <p className="truncate text-[11px] text-white/40">
            민서 × 클로드 · 프롬프트 {pairCount}묶음 (= 보고서 본문)
          </p>
        </div>
        <button
          onClick={toggleGlobe}
          className="shrink-0 rounded-lg border border-panel-border px-2.5 py-1.5 text-[11px] font-semibold text-white/70 transition hover:border-neon-cyan/50 hover:text-neon-cyan"
        >
          {globeVisible ? "지구 끄기" : "지구 켜기"}
        </button>
      </header>

      {/* 피드 (카톡식, 위 → 아래) */}
      <div className="feed-scroll flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {timeline.map((msg, i) => (
          <FeedEntry key={`${msg.n}-${msg.role}-${i}`} msg={msg} />
        ))}
        <div className="pt-2 text-center text-[11px] text-white/25">
          — 여기까지가 현재 기록 · 작업이 진행되면 계속 쌓입니다 —
        </div>
      </div>
    </div>
  );
}
