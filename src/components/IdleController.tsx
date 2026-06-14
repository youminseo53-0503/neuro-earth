"use client";

import { useEffect, useRef } from "react";
import { useIdle } from "@/store/useIdle";
import { useExhibition } from "@/store/useExhibition";

const IDLE_MS = 10000; // 이만큼 무반응이면 자동(전시)으로 복귀 + 크롬 숨김

/**
 * 키오스크 모델 — 토글 버튼 없이 '상호작용 ↔ 무반응'으로만 자동/수동을 오간다.
 *   · 기본: immersive(패널 다 치움) + 자동 전시 순환.
 *   · 어떤 입력이든(클릭·터치·드래그·키·휠·마우스이동) → 수동(자동 멈춤) + 크롬 등장.
 *   · 10초 무반응 → 다시 자동 전시 + 크롬 숨김.
 */
export function IdleController() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMove = useRef(0);

  useEffect(() => {
    const setIdle = useIdle.getState().setIdle;
    const setAuto = useExhibition.getState().setAuto;

    const toAuto = () => {
      setAuto(true); // 자동 전시 재개
      setIdle(true); // 크롬 숨김(immersive)
    };
    const arm = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(toAuto, IDLE_MS);
    };
    const interact = () => {
      setIdle(false); // 크롬 등장
      setAuto(false); // 수동(자동 멈춤)
      arm();
    };
    const onMove = () => {
      const n = Date.now();
      if (n - lastMove.current > 500) {
        lastMove.current = n;
        interact();
      }
    };

    window.addEventListener("pointerdown", interact, { passive: true });
    window.addEventListener("touchstart", interact, { passive: true });
    window.addEventListener("keydown", interact);
    window.addEventListener("wheel", interact, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    // 시작은 immersive(useIdle 기본 idle=true) — 입력이 오기 전까진 자동 전시.

    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("pointerdown", interact);
      window.removeEventListener("touchstart", interact);
      window.removeEventListener("keydown", interact);
      window.removeEventListener("wheel", interact);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return null;
}
