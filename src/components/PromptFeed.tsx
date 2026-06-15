"use client";

import { timeline } from "@/data/timeline";
import { FeedEntry } from "./FeedEntry";

/** compact: 모바일 바텀시트 안에서 렌더될 때 — 시트가 자체 헤더를 가지므로 헤더 생략 */
export function PromptFeed({ compact = false }: { compact?: boolean }) {
  const pairCount = new Set(timeline.map((m) => m.n)).size;

  return (
    <div className="flex h-full flex-col bg-[#070b16]">
      {/* 헤더 (데스크탑 사이드 패널 전용) */}
      {!compact && (
      <header className="flex items-center justify-between gap-2 border-b border-panel-border px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate font-mono text-[clamp(14px,1.05vw,22px)] font-bold tracking-tight text-white">
            NEURO·EARTH <span className="text-neon-cyan">개발 로그</span>
          </h1>
          <p className="truncate text-[11px] text-white/40">
            민서 × 클로드 · 프롬프트 {pairCount}묶음 (= 보고서 본문)
          </p>
          <p className="truncate text-[10px] text-white/25">
            ※ 민서 발화는 맞춤법·오타를 일부 다듬음
          </p>
        </div>
      </header>
      )}

      {/* 피드 (카톡식, 위 → 아래) */}
      <div className="feed-scroll flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {timeline.map((msg, i) => (
          <FeedEntry
            key={`${msg.n}-${msg.role}-${i}`}
            msg={msg}
            firstOfBundle={i === 0 || timeline[i - 1].n !== msg.n}
          />
        ))}
        <div className="pt-2 text-center text-[11px] text-white/25">
          — 여기까지가 현재 기록 · 작업이 진행되면 계속 쌓입니다 —
        </div>
      </div>
    </div>
  );
}
