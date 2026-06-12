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

// 창세 다음에 갈 '사건' 시나리오 — 번갈아 돌려 변주를 준다(팬데믹 ↔ 외상).
const EVENTS = ["pandemic", "trauma"] as const;

/**
 * 전시(자동순환) 디렉터 — auto가 켜져 있으면 시나리오를 스스로 넘긴다.
 *   실시간(45s) → 창세(다 자람+감상) → 사건(팬데믹/외상 번갈아 →끝→실시간) → …
 * DOM 컴포넌트라 setInterval로 현재 시나리오·노드 수를 보고 조건이 되면 전환한다.
 * (프로그램적 전환은 auto를 끄지 않음 — 사용자가 직접 누를 때만 ScenarioBar/리모컨에서 끔)
 */
export function ExhibitionController() {
  const enterAt = useRef(0); // 현재 시나리오 진입 시각
  const scene = useRef("");  // 현재 시나리오 키
  const grownAt = useRef(0); // 창세가 다 자란 시각
  const eventIdx = useRef(0); // 사건 시나리오 번갈이 인덱스

  useEffect(() => {
    const id = setInterval(() => {
      if (!useExhibition.getState().auto) return;
      const { mode, versionId, setMode, config } = useViz.getState();
      // 자동재생은 exhibit/pandemicArc/traumaArc 버전에서만 — 옛 버전 화면은 자동순환이 안 건드림.
      if (!config.exhibit && !config.pandemicArc && !config.traumaArc) return;
      const now = Date.now();
      const cur =
        mode === "trauma"
          ? "event"
          : isPandemicView(versionId, mode)
            ? "event"
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
            // 사건 시나리오로 — 팬데믹/외상 번갈아(한 버전 안에서 모드 전환). 끝나면 디렉터가 live로 핸드오프.
            setMode(EVENTS[eventIdx.current++ % EVENTS.length]);
          }
        }
      }
      // event(팬데믹/외상): 각 디렉터의 끝→실시간 핸드오프에 맡김
    }, 500);
    return () => clearInterval(id);
  }, []);

  return null;
}
