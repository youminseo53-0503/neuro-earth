"use client";

import { PromptFeed } from "@/components/PromptFeed";
import { useUI } from "@/store/useUI";

export default function Home() {
  const globeVisible = useUI((s) => s.globeVisible);

  return (
    <main className="flex h-screen w-screen overflow-hidden">
      {/* 왼쪽 3/4 — 지구본 자리 (M3에서 3D 지구 들어옴) */}
      {globeVisible && (
        <section className="relative flex flex-[3] min-w-0 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#0b1430_0%,#050810_70%)]">
          <GlobePlaceholder />
        </section>
      )}

      {/* 오른쪽 — 프롬프트 피드 */}
      <aside
        className={`h-full ${
          globeVisible ? "flex-[1] min-w-[360px] max-w-[480px]" : "w-full"
        }`}
      >
        <PromptFeed />
      </aside>
    </main>
  );
}

function GlobePlaceholder() {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="relative h-56 w-56">
        <div className="absolute inset-0 animate-ping rounded-full border border-neon-cyan/20" />
        <div className="absolute inset-2 rounded-full border border-neon-cyan/15" />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#123,#04060d_70%)] shadow-[0_0_80px_-10px_var(--neon-cyan)]" />
        <div className="absolute inset-0 grid place-items-center text-5xl">🌐</div>
      </div>
      <div className="font-mono text-xs tracking-widest text-white/40">
        3D EARTH — 곧 연결됨 (Milestone 3)
      </div>
    </div>
  );
}
