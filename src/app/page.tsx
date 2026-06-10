"use client";

import dynamic from "next/dynamic";
import { PromptFeed } from "@/components/PromptFeed";
import { HUD } from "@/components/HUD";
import { VersionRemote } from "@/components/VersionRemote";
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
    <main className="flex h-screen w-screen overflow-hidden">
      {/* 왼쪽 3/4 — 3D 씬 (지구 + 신경 가소성 망). 레이아웃 고정 */}
      <section className="relative flex-[3] min-w-0 bg-[radial-gradient(circle_at_50%_40%,#0b1430_0%,#050810_70%)]">
        <GlobeScene />
        {isOrigin && <OriginPlaceholder />}
        <HUD />
        <VersionRemote />
      </section>

      {/* 오른쪽 1/4 — 프롬프트 피드 (항상 표시) */}
      <aside className="h-full flex-[1] min-w-[360px] max-w-[480px]">
        <PromptFeed />
      </aside>
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
