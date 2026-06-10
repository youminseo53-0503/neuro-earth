"use client";

import { PromptFeed } from "@/components/PromptFeed";
import { useUI } from "@/store/useUI";

export default function Home() {
  const earthVisible = useUI((s) => s.earthVisible);

  return (
    <main className="flex h-screen w-screen overflow-hidden">
      {/* 왼쪽 3/4 — 3D 씬 자리 (지구 + 신경 가소성 망). 레이아웃 고정 */}
      <section className="relative flex flex-[3] min-w-0 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#0b1430_0%,#050810_70%)]">
        <ScenePlaceholder earthVisible={earthVisible} />
      </section>

      {/* 오른쪽 1/4 — 프롬프트 피드 (항상 표시) */}
      <aside className="h-full flex-[1] min-w-[360px] max-w-[480px]">
        <PromptFeed />
      </aside>
    </main>
  );
}

/** M3/M4 전 임시 자리. earthVisible에 따라 지구 구체만 토글된다(망은 항상 표시). */
function ScenePlaceholder({ earthVisible }: { earthVisible: boolean }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="relative h-56 w-56">
        {/* 신경 가소성 망 (항상 표시) */}
        <div className="absolute inset-0 animate-ping rounded-full border border-neon-green/25" />
        <div className="absolute inset-0 rounded-full border border-neon-green/15" />
        {/* 3D 지구 구체 (토글 대상) */}
        {earthVisible && (
          <>
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#123,#04060d_70%)] shadow-[0_0_80px_-10px_var(--neon-cyan)]" />
            <div className="absolute inset-0 grid place-items-center text-5xl">
              🌐
            </div>
          </>
        )}
      </div>
      <div className="font-mono text-xs tracking-widest text-white/40">
        {earthVisible
          ? "3D EARTH + 가소성 망 — 곧 연결됨 (M3·M4)"
          : "지구 OFF · 가소성 망만 표시"}
      </div>
    </div>
  );
}
