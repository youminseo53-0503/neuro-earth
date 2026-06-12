"use client";

import { useEffect, useRef } from "react";
import { timeline } from "@/data/timeline";
import { BRIEFINGS, type Briefing } from "@/lib/briefings";
import { isPandemicView } from "@/lib/versions";
import { useSheet, type SheetStage } from "@/store/useSheet";
import { useUI } from "@/store/useUI";
import { useViz } from "@/store/useViz";
import { useIdle } from "@/store/useIdle";
import { PromptFeed } from "./PromptFeed";

// 시트는 높이 고정(92dvh) + translateY로만 움직임 — height 애니메이션과 달리
// transform은 CLS(레이아웃 시프트)에 안 잡히고 GPU 합성이라 폰에서도 부드럽다.
const TRANSLATE: Record<SheetStage, string> = {
  peek: "translateY(calc(92dvh - 6rem))", // 상단 6rem(h-24)만 보임
  half: "translateY(40dvh)", // 52dvh 보임
  full: "translateY(0)",
};
/** 시트 내용 영역 높이 — 보이는 만큼만(헤더 ~60px 제외). 단계 전환 시 즉시 스냅 */
const CONTENT_H: Record<SheetStage, string> = {
  peek: "0px",
  half: "calc(52dvh - 60px)",
  full: "calc(92dvh - 60px)",
};

/**
 * 모바일 바텀시트(md 미만 전용) — 지구 풀스크린 위로 보고서(피드)/브리핑을 끌어올린다.
 *   · peek: 손잡이 + "💬 개발 보고서" 라벨 + 마지막 기록 1줄 미리보기
 *   · half/full: 카톡식 피드 전체(=보고서 본문) 또는 시나리오 브리핑
 *   · 드래그는 손잡이 영역에서만(지구 궤도 드래그와 충돌 방지). 스크림 탭 = 내리기.
 *   · 첫 방문 3초 뒤 half로 한 번 자동 오픈 — "이 앱의 본체는 보고서"라는 첫인상 보장.
 */
export function MobileFeedSheet() {
  const { stage, mode, setStage, open } = useSheet();
  const { earthVisible, toggleEarth } = useUI();
  const versionId = useViz((s) => s.versionId);
  const vizMode = useViz((s) => s.mode);
  const idle = useIdle((s) => s.idle);
  const touchY = useRef<number | null>(null);
  const swiped = useRef(false); // 스와이프로 스냅했으면 브라우저가 합성하는 click 무시(이중 전환 방지)

  // 첫 방문 — 3초 뒤 half 1회 자동 오픈(다음부턴 안 함)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("ne-sheet-seen")) return;
    const t = setTimeout(() => {
      open("feed", "half");
      localStorage.setItem("ne-sheet-seen", "1");
    }, 3000);
    return () => clearTimeout(t);
  }, [open]);

  const last = timeline[timeline.length - 1];
  const preview = last ? `#${String(last.n).padStart(2, "0")} ${last.text.slice(0, 42)}…` : "";

  // 손잡이 드래그/탭 — 임계 40px로 스냅 한 단계씩.
  // 스와이프로 스냅한 직후 브라우저가 합성하는 click은 무시(한 번에 두 단계 점프 방지).
  const onTouchStart = (e: React.TouchEvent) => {
    touchY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchY.current;
    touchY.current = null;
    if (dy < -40) {
      swiped.current = true;
      setStage(stage === "peek" ? "half" : "full"); // 위로 스와이프
    } else if (dy > 40) {
      swiped.current = true;
      setStage(stage === "full" ? "half" : "peek"); // 아래로
    }
  };
  const onHandleTap = () => {
    if (swiped.current) {
      swiped.current = false; // 방금 스와이프가 처리함 — 합성 click 무시
      return;
    }
    setStage(stage === "peek" ? "half" : stage === "half" ? "full" : "peek");
  };

  // 구독 기반 — 자동순환으로 시나리오가 바뀌면 브리핑도 따라 바뀐다
  const briefingKey: Briefing["key"] = isPandemicView(versionId, vizMode)
    ? "pandemic"
    : vizMode === "genesis"
      ? "genesis"
      : "live";
  const b = BRIEFINGS[briefingKey];

  return (
    <div className="lg:hidden">
      {/* 스크림 — half/full 공통(half는 옅게), 탭하면 내려감 */}
      {stage !== "peek" && (
        <div
          className={`fixed inset-0 z-20 ${stage === "full" ? "bg-black/40" : "bg-black/15"}`}
          onClick={() => setStage("peek")}
        />
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-30 mx-auto flex h-[92dvh] w-full max-w-[640px] flex-col rounded-t-2xl border-t border-x border-panel-border bg-[#070b16]/95 backdrop-blur-md transition-transform duration-500 will-change-transform"
        style={{ transform: idle && stage === "peek" ? "translateY(100%)" : TRANSLATE[stage] }}
      >
        {/* 손잡이 + 헤더(여기서만 드래그) */}
        <div
          className="shrink-0 cursor-grab select-none px-4 pb-2 pt-2"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={onHandleTap}
        >
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/25" />
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-[13px] font-bold text-white/85">
              <span className="truncate">{mode === "feed" ? "💬 개발 보고서" : "🧠 시나리오 브리핑"}</span>
              {/* 현재 시나리오 배지 — 시트가 시나리오바를 가려도 자동순환 전환이 보이게 */}
              <span
                key={briefingKey}
                className={`shrink-0 animate-[pulse_1.2s_ease-in-out_2] rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  briefingKey === "live"
                    ? "bg-neon-green/15 text-neon-green ring-1 ring-neon-green/40"
                    : "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40"
                }`}
              >
                {briefingKey === "live" ? "● 실시간" : briefingKey === "genesis" ? "창세" : "팬데믹"}
              </span>
            </span>
            {stage !== "peek" && (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => open(mode === "feed" ? "briefing" : "feed", stage)}
                  className="rounded-md border border-panel-border px-2 py-1 text-[11px] text-white/60"
                >
                  {mode === "feed" ? "브리핑" : "보고서"}
                </button>
                <button
                  onClick={toggleEarth}
                  className="rounded-md border border-panel-border px-2 py-1 text-[11px] text-white/60"
                >
                  {earthVisible ? "지구 끄기" : "지구 켜기"}
                </button>
              </div>
            )}
          </div>
          {stage === "peek" && (
            <p className="mt-1 truncate text-[11px] text-white/40">{preview}</p>
          )}
        </div>

        {/* 내용 — 보이는 높이만큼만(시트 자체는 92dvh 고정, 아랫부분은 화면 밖) */}
        {stage !== "peek" && (
          <div
            className="min-h-0 overflow-hidden border-t border-panel-border"
            style={{ height: CONTENT_H[stage] }}
          >
            {mode === "feed" ? (
              <PromptFeed compact />
            ) : (
              <div className="feed-scroll h-full overflow-y-auto px-4 py-4">
                <div className="mb-1 text-[14px] font-bold text-white/85">{b.title}</div>
                <div className="mb-3 flex items-start gap-1.5 text-[12px] leading-snug text-neon-cyan/70">
                  <span className="mt-px shrink-0">🧠</span>
                  <span className="italic">{b.brain}</span>
                </div>
                <p className="text-[13px] leading-relaxed text-white/70">{b.body}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
