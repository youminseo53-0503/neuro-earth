"use client";

import { useEffect, useRef } from "react";
import { useViz } from "@/store/useViz";
import { useMetrics } from "@/store/useMetrics";
import { useExhibition } from "@/store/useExhibition";
import { isPandemicView } from "@/lib/versions";

// 순환 타이밍(전시 모드). 틱이 아니라 실제 시간(ms) 기준.
const LIVE_MS = 45_000;       // 실시간을 보여주는 시간 → 창세로
const GENESIS_GROWN = 5_200;  // 창세 '다 자람' 노드 기준
const GROWN_HOLD_MS = 9_000;  // 다 자란 창세를 감상하는 시간 → 팬데믹으로
// (팬데믹은 '오늘'에 닿으면 EmergentLayer가 알아서 실시간으로 핸드오프 → 순환이 이어짐)

/**
 * 전시(자동순환) 디렉터 — auto가 켜져 있으면 시나리오를 스스로 넘긴다.
 *   실시간(45s) → 창세(다 자람+감상) → 팬데믹(→오늘→실시간) → …
 * DOM 컴포넌트라 setInterval로 현재 시나리오·노드 수를 보고 조건이 되면 전환한다.
 * (프로그램적 전환은 auto를 끄지 않음 — 사용자가 직접 누를 때만 ScenarioBar/리모컨에서 끔)
 */
export function ExhibitionController() {
  const enterAt = useRef(0); // 현재 시나리오 진입 시각
  const scene = useRef("");  // 현재 시나리오 키
  const grownAt = useRef(0); // 창세가 다 자란 시각

  useEffect(() => {
    const id = setInterval(() => {
      if (!useExhibition.getState().auto) return;
      const { mode, versionId, setMode, config } = useViz.getState();
      // 자동재생은 exhibit/pandemicArc 버전에서만 — 옛 버전 화면은 자동순환이 건드리지 않는다.
      // (팬데믹 중엔 디렉터의 '오늘→실시간' 핸드오프가 순환을 이어줌)
      if (!config.exhibit && !config.pandemicArc) return;
      const now = Date.now();
      const cur = isPandemicView(versionId, mode)
        ? "pandemic"
        : mode === "genesis"
          ? "genesis"
          : "live";
      if (cur !== scene.current) {
        scene.current = cur;
        enterAt.current = now;
        grownAt.current = 0;
      }
      if (cur === "live") {
        if (now - enterAt.current > LIVE_MS) setMode("genesis");
      } else if (cur === "genesis") {
        const nodes = useMetrics.getState().emergent?.nodes ?? 0;
        if (nodes >= GENESIS_GROWN) {
          if (!grownAt.current) grownAt.current = now;
          else if (now - grownAt.current > GROWN_HOLD_MS) {
            setMode("pandemic"); // 통합 버전 안에서 팬데믹 모드로(버전 점프 없음). 끝나면 디렉터가 live로 핸드오프.
          }
        }
      }
      // pandemic: 자기-핸드오프(오늘→실시간)에 맡김
    }, 500);
    return () => clearInterval(id);
  }, []);

  return null;
}
