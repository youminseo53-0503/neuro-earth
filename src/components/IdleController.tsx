"use client";

import { useEffect, useRef } from "react";
import { useIdle } from "@/store/useIdle";
import { useViz } from "@/store/useViz";
import { useExhibition } from "@/store/useExhibition";

const IDLE_MS = 9000; // 이만큼 무반응이면 어트랙트 모드(UI 숨김)

/** 지금 무반응 시 UI를 숨겨야 하는 상황인가 — 자동순환(전시) 중이거나 attract 버전. */
function shouldHide(): boolean {
  return useExhibition.getState().auto || (useViz.getState().config.attract ?? false);
}

/**
 * 무반응 감지기(화면 없음). 어떤 입력(터치·포인터·키·휠·마우스이동)이든 들어오면 깨어나고,
 * IDLE_MS 동안 아무것도 없으면 idle=true. 마우스이동은 throttle로 과한 리셋 방지.
 *
 * idle 진입은 '자동순환(전시) 중'이거나 attract 버전일 때만 — 즉 자동을 켜면 가로·세로 모두
 * 크롬이 싹 사라지고 지구만 남는다(전시 모드). 자동을 끄거나 attract를 떠나면 즉시 깨운다.
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
        if (shouldHide()) setIdle(true); // 자동순환 중 or attract 버전만 숨김
      }, IDLE_MS);
    };
    // attract를 '떠나는' 순간에만 숨겨둔 UI를 되살린다(엣지 감지).
    const unsubViz = useViz.subscribe((s, prev) => {
      if (prev.config.attract && !s.config.attract) setIdle(false);
    });
    // 자동순환 토글 — 켜면 곧 immersive(카운트다운 시작), 끄면(수동 takeover) 즉시 크롬 복귀.
    const unsubExh = useExhibition.subscribe((s, prev) => {
      if (s.auto !== prev.auto) {
        if (s.auto) wake();
        else setIdle(false);
      }
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
      unsubExh();
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("touchstart", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return null;
}
