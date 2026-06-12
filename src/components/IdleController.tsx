"use client";

import { useEffect, useRef } from "react";
import { useIdle } from "@/store/useIdle";

const IDLE_MS = 9000; // 이만큼 무반응이면 어트랙트 모드(UI 숨김)

/**
 * 무반응 감지기(화면 없음). 어떤 입력(터치·포인터·키·휠·마우스이동)이든 들어오면 깨어나고,
 * IDLE_MS 동안 아무것도 없으면 idle=true. 마우스이동은 throttle로 과한 리셋 방지.
 */
export function IdleController() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMove = useRef(0);

  useEffect(() => {
    const setIdle = useIdle.getState().setIdle;
    const wake = () => {
      setIdle(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setIdle(true), IDLE_MS);
    };
    const onMove = () => {
      const now = Date.now();
      if (now - lastMove.current > 600) {
        lastMove.current = now;
        wake();
      }
    };

    window.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("touchstart", wake, { passive: true });
    window.addEventListener("keydown", wake);
    window.addEventListener("wheel", wake, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    wake(); // 타이머 시작

    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("touchstart", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("wheel", wake);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return null;
}
