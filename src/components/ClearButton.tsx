"use client";

import { useIdle } from "@/store/useIdle";

/**
 * 비우기(몰입) 버튼 — 누르면 모든 UI 크롬을 잠시 비우고 지구만 남긴다.
 * 화면 아무 곳이나 누르면(IdleController의 입력 리스너) 즉시 전부 복귀.
 * 버전 무관 전역 프레젠테이션(자동 9초 숨김은 attract 버전 전용, 이건 수동).
 *
 * onPointerDown에서 stopPropagation — 같은 탭이 window 리스너로 새어나가
 * wake()(setIdle(false))를 부르는 레이스를 막는다(누르자마자 다시 켜지는 것 방지).
 * 버튼 자신도 크롬이라 비워지면 사라진다 — 복귀는 어디든 탭.
 */
export function ClearButton() {
  const idle = useIdle((s) => s.idle);
  return (
    <button
      onPointerDown={(e) => {
        e.stopPropagation();
        useIdle.getState().setIdle(true);
      }}
      className={`absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-panel-border bg-black/65 px-3 py-1.5 text-[11px] font-semibold text-white/65 backdrop-blur-sm transition-opacity duration-700 hover:border-neon-cyan/50 hover:text-neon-cyan ${
        idle ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      title="UI를 비우고 지구만 보기 · 화면 아무 곳이나 누르면 복귀"
    >
      ⤢ 비우기
    </button>
  );
}
