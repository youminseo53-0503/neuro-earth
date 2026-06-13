"use client";

import { useEffect, useRef } from "react";
import { useViz } from "@/store/useViz";
import { useMetrics } from "@/store/useMetrics";
import { useExhibition } from "@/store/useExhibition";
import { useStage } from "@/store/useStage";
import { isPandemicView } from "@/lib/versions";
import type { Briefing } from "@/lib/briefings";

// ─────────────────────────────────────────────────────────────
// 전시(자동순환) 디렉터 — 모든 시나리오가 같은 리듬으로 흐른다:
//   재생(지구/망 위에서 장면 진행) → 관조(카메라가 확 빠져 지구가 작아지고, 그 자리에 나레이션 등장,
//   ~1분 충분히 읽기) → 다음 장면. 창세가 '다 자라 줌아웃됐을 때 설명이 뜨는' 그 느낌을 전 시나리오로.
//   실시간→창세→팬데믹→전쟁→… 무한 순환. 사용자가 직접 누르면 auto 꺼짐(자유 탐색).
// ─────────────────────────────────────────────────────────────

const SCENES = ["live", "genesis", "pandemic", "trauma"] as const;
type Scene = (typeof SCENES)[number];

const LIVE_PLAY_MS = 24_000;   // 실시간 재생 → 관조
const GENESIS_GROWN = 5_200;   // 창세 '다 자람' 노드 기준
const GENESIS_HOLD_MS = 4_000; // 다 자람 잠깐 감상 → 관조
const CONTEMPLATE_MS = 52_000; // 관조 — 지구 작게 + 나레이션, 충분히 읽기(~1분 가까이)

const NARR: Record<Scene, Briefing["key"]> = {
  live: "live",
  genesis: "genesis",
  pandemic: "pandemic",
  trauma: "trauma",
};

function sceneOf(versionId: string, mode: string): Scene {
  if (mode === "trauma") return "trauma";
  if (isPandemicView(versionId, mode)) return "pandemic";
  if (mode === "genesis") return "genesis";
  return "live";
}

export function ExhibitionController() {
  const phase = useRef<"play" | "contemplate">("play");
  const enterAt = useRef(0);
  const grownAt = useRef(0);
  const lastScene = useRef<Scene | "">("");

  useEffect(() => {
    const id = setInterval(() => {
      const auto = useExhibition.getState().auto;
      const stage = useStage.getState();
      if (!auto) {
        // 수동 전환 — 관조/나레이션 정리(크롬은 IdleController가 되살림)
        if (stage.narrKey || stage.contemplate) stage.set({ narrKey: null, contemplate: false, sceneDone: false });
        return;
      }
      const { mode, versionId, setMode, config } = useViz.getState();
      if (!config.exhibit && !config.pandemicArc && !config.traumaArc) return;
      const now = Date.now();
      const scene = sceneOf(versionId, mode);

      // 장면이 바뀌면(전환·핸드오프) 재생 단계로 리셋
      if (scene !== lastScene.current) {
        lastScene.current = scene;
        phase.current = "play";
        enterAt.current = now;
        grownAt.current = 0;
        stage.set({ narrKey: null, contemplate: false, sceneDone: false });
        return;
      }

      if (phase.current === "play") {
        let ready = false;
        if (scene === "live") {
          ready = now - enterAt.current > LIVE_PLAY_MS;
        } else if (scene === "genesis") {
          const nodes = useMetrics.getState().emergent?.nodes ?? 0;
          if (nodes >= GENESIS_GROWN) {
            if (!grownAt.current) grownAt.current = now;
            else if (now - grownAt.current > GENESIS_HOLD_MS) ready = true;
          } else {
            grownAt.current = 0;
          }
        } else {
          // 팬데믹/전쟁 — 디렉터가 제 시네마틱을 끝냈다는 신호(EmergentLayer가 sceneDone 세팅)
          ready = stage.sceneDone;
        }
        if (ready) {
          phase.current = "contemplate";
          enterAt.current = now;
          stage.set({ narrKey: NARR[scene], contemplate: true, sceneDone: false });
        }
      } else {
        // 관조 — 지구 작게 + 나레이션. 충분히 읽힌 뒤 다음 장면으로.
        if (now - enterAt.current > CONTEMPLATE_MS) {
          const next = SCENES[(SCENES.indexOf(scene) + 1) % SCENES.length];
          stage.set({ narrKey: null, contemplate: false, sceneDone: false });
          setMode(next); // 다음 장면 — 다음 틱에 scene 변경 감지되어 play로 리셋
        }
      }
    }, 400);
    return () => clearInterval(id);
  }, []);

  return null;
}
