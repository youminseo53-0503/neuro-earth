"use client";

import { useUI } from "@/store/useUI";

/**
 * 충격 섬광 — 외상 타격 순간 화면 전체가 흰빛으로 번쩍였다 사그라든다.
 * useUI.flash(0..1)만 구독 → 평소엔 0이라 안 보이고, 외상 임팩트 때만 살아난다(리렌더 격리).
 */
export function FlashOverlay() {
  const flash = useUI((s) => s.flash);
  if (flash <= 0.001) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 bg-white"
      style={{ opacity: Math.min(1, flash) }}
    />
  );
}
