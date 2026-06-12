"use client";

import { useEffect, useRef } from "react";
import { useIdle } from "@/store/useIdle";
import { useViz } from "@/store/useViz";

const IDLE_MS = 9000; // 이만큼 무반응이면 어트랙트 모드(UI 숨김)

/**
 * 무반응 감지기(화면 없음). 어떤 입력(터치·포인터·키·휠·마우스이동)이든 들어오면 깨어나고,
 * IDLE_MS 동안 아무것도 없으면 idle=true. 마우스이동은 throttle로 과한 리셋 방지.
 *
 * 단, idle 진입은 attract 버전(v29+)에서만 — 옛 버전·일반 버전은 UI를 절대 숨기지 않는다
 * (미래가 과거 안 바꿈). 어트랙트가 아닌 버전으로 바뀌면 즉시 깨운다.
 */
export function IdleController() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMove = useRef(0);

  useEffect(() => {
    const setIdle = useIdle.getState().setIdle;
    const wake = () => {
      setIdle(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (useViz.getState().config.attract) setIdle(true); // 어트랙트 버전만 숨김
      }, IDLE_MS);
    };
    // 어트랙트 버전을 '떠나는' 순간에만 숨겨둔 UI를 되살린다(엣지 감지).
    // 매 변경마다 깨우면 비-어트랙트 버전에서 수동 비우기가 모드전환 때 풀려버림 → 엣지로 한정.
    const unsubViz = useViz.subscribe((s, prev) => {
      if (prev.config.attract && !s.config.attract) setIdle(false);
    });
    // 마우스 이동/휠은 '수동 비우기' 중엔 무시 — 데스크탑에서 비우기가 손짓 한 번에 안 풀리게.
    const onMove = () => {
      if (useIdle.getState().manual) return;
      const now = Date.now();
      if (now - lastMove.current > 600) {
        lastMove.current = now;
        wake();
      }
    };
    const onWheel = () => {
      if (!useIdle.getState().manual) wake();
    };

    // 포인터다운·터치·키는 '의도적 복귀'라 수동 비우기도 즉시 깨운다.
    window.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("touchstart", wake, { passive: true });
    window.addEventListener("keydown", wake);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    wake(); // 타이머 시작

    return () => {
      if (timer.current) clearTimeout(timer.current);
      unsubViz();
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("touchstart", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return null;
}
