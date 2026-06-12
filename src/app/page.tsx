"use client";

import dynamic from "next/dynamic";
import { PromptFeed } from "@/components/PromptFeed";
import { HUD } from "@/components/HUD";
import { VersionRemote } from "@/components/VersionRemote";
import { ScenarioBar } from "@/components/ScenarioBar";
import { PandemicCaption } from "@/components/PandemicCaption";
import { BriefingPanel } from "@/components/BriefingPanel";
import { ExhibitionController } from "@/components/ExhibitionController";
import { MobileFeedSheet } from "@/components/MobileFeedSheet";
import { useViz } from "@/store/useViz";

// R3F Canvas는 브라우저 전용 → SSR 끄고 클라이언트에서만 로드
const GlobeScene = dynamic(() => import("@/components/GlobeScene"), {
  ssr: false,
  loading: () => <SceneLoading />,
});

export default function Home() {
  const config = useViz((s) => s.config);
  const isOrigin = !config.showEarth && !config.showNet;

  return (
    <main className="flex h-[100dvh] w-screen overflow-hidden">
      {/* 전시(자동순환) 디렉터 — 화면 없음. 실시간↔창세↔팬데믹을 스스로 넘김 */}
      <ExhibitionController />
      {/* 3D 씬 — 데스크탑 좌 3/4, 모바일 풀스크린 무대 */}
      <section className="relative flex-[3] min-w-0 bg-[radial-gradient(circle_at_50%_40%,#0b1430_0%,#050810_70%)]">
        <GlobeScene />
        {/* 필름 프레임 — CSS 비네팅(WebGL 후처리 대신, 깜빡임 0). 시선을 가운데로 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.5) 100%)" }}
        />
        {isOrigin && <OriginPlaceholder />}
        <HUD />
        <VersionRemote />
        <PandemicCaption />
        <BriefingPanel />
        <ScenarioBar />
      </section>

      {/* 오른쪽 1/4 — 프롬프트 피드 (데스크탑 전용. 모바일은 바텀시트가 담당) */}
      <aside className="hidden h-full flex-[1] min-w-[360px] max-w-[480px] lg:block">
        <PromptFeed />
      </aside>

      {/* 모바일 — 보고서/브리핑 바텀시트 */}
      <MobileFeedSheet />
    </main>
  );
}

/** '처음 (지구 이전)' 버전 — 네온 아이콘 화면 */
function OriginPlaceholder() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6 text-center">
      <div className="relative h-44 w-44">
        <div className="absolute inset-0 animate-ping rounded-full border border-neon-cyan/25" />
        <div className="absolute inset-3 rounded-full border border-neon-cyan/15" />
        <div className="absolute inset-0 grid place-items-center text-5xl">🌐</div>
      </div>
      <div className="font-mono text-xs tracking-widest text-white/40">
        NEURO·EARTH — 시작 전
      </div>
    </div>
  );
}

function SceneLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="font-mono text-xs tracking-widest text-white/40">
        지구 불러오는 중…
      </div>
    </div>
  );
}
