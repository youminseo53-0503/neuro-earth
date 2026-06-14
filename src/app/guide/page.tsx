import type { Metadata } from "next";
import Link from "next/link";
import { BRIEFINGS } from "@/lib/briefings";
import { ScenarioKeyVisual, type KeyPalette } from "@/components/ScenarioKeyVisual";

export const metadata: Metadata = {
  title: "작품 도록 — NEURO·EARTH",
  description:
    "NEURO·EARTH 작품 도록 — 지구 스케일 신경가소성으로 그린 네 개의 시나리오(실시간·창세·팬데믹·전쟁)와 회복. by 민서",
};

// ─────────────────────────────────────────────────────────────
// /guide — QR로 들어오는 '진짜 잡지' 작품 도록(팜플렛).
//   전시장 라이브 화면(/)과 별개의 정적 디지털 도록: 작품마다 키비주얼 + 해설.
//   콘텐츠는 briefings.ts(작품 해설)를 그대로 쓴다 — 화면과 도록이 한 소스.
//   서버 컴포넌트(정적) — 인터랙션 없음, 폰에서 가볍게 스크롤.
// ─────────────────────────────────────────────────────────────

interface Work {
  key: keyof typeof BRIEFINGS;
  no: string;
  kicker: string;
  pal: KeyPalette;
  accent: string; // 제목/번호 강조색 클래스
  soon?: boolean;
}

const WORKS: Work[] = [
  {
    key: "live",
    no: "01",
    kicker: "LIVE · 실시간",
    accent: "text-neon-green",
    pal: { from: "#06151a", to: "#001f1a", dot: "#00ff9c", seed: 0.4 },
  },
  {
    key: "genesis",
    no: "02",
    kicker: "SCENE · 창세",
    accent: "text-[#ffd866]",
    pal: { from: "#1b1305", to: "#2a1d02", dot: "#ffd866", seed: 1.7 },
  },
  {
    key: "pandemic",
    no: "03",
    kicker: "SCENE · 팬데믹",
    accent: "text-[#ff6b6b]",
    pal: { from: "#1c0707", to: "#2c0404", dot: "#ff5a5a", seed: 2.9 },
  },
  {
    key: "trauma",
    no: "04",
    kicker: "SCENE · 전쟁",
    accent: "text-[#c084fc]",
    pal: { from: "#140618", to: "#220734", dot: "#c084fc", seed: 4.2 },
  },
  {
    key: "recovery",
    no: "05",
    kicker: "SCENE · 회복",
    accent: "text-slate-300",
    soon: true,
    pal: { from: "#0a1018", to: "#0f1826", dot: "#94a3b8", seed: 5.6 },
  },
];

export default function GuidePage() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* 상단 바 */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-panel-border bg-background/80 px-5 py-3 backdrop-blur-md">
        <span className="font-mono text-[12px] tracking-[0.3em] text-white/70">NEURO·EARTH</span>
        <Link
          href="/"
          className="rounded-full border border-panel-border px-3 py-1 text-[11px] text-white/60 transition hover:text-neon-cyan"
        >
          전시 화면 →
        </Link>
      </header>

      {/* 표지 */}
      <section className="relative mx-auto max-w-[860px] overflow-hidden">
        <div className="relative h-[64vh] min-h-[420px] w-full">
          <ScenarioKeyVisual pal={{ from: "#0a1430", to: "#04060f", dot: "#00e5ff", seed: 3.3 }} idKey="cover" />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 text-center">
            <p className="mb-3 font-mono text-[11px] tracking-[0.45em] text-neon-cyan/80">EXHIBITION CATALOG · 작품 도록</p>
            <h1 className="px-4 font-serif text-[clamp(40px,11vw,84px)] font-bold leading-[0.95] tracking-tight text-white">
              살아있는<br />인공뇌
            </h1>
            <p className="mt-4 max-w-[34ch] text-balance px-6 text-[13px] leading-relaxed text-white/65">
              지구 스케일의 신경가소성 — 실제 지구 데이터가 자극하면 스스로 배선되는 뇌.
              네 개의 장면과, 그 너머의 회복.
            </p>
            <p className="mt-5 font-mono text-[11px] tracking-[0.3em] text-white/45">by 민서</p>
          </div>
        </div>
      </section>

      {/* 작품들 */}
      <main className="mx-auto max-w-[860px]">
        {WORKS.map((w) => {
          const b = BRIEFINGS[w.key];
          const paras = b.body.split("\n\n");
          return (
            <article key={w.key} className="border-t border-panel-border">
              {/* 키비주얼 + 표제 */}
              <div className="relative h-[52vh] min-h-[340px] w-full overflow-hidden">
                <ScenarioKeyVisual pal={w.pal} idKey={w.key} />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
                  <div className={`mb-2 flex items-baseline gap-3 ${w.accent}`}>
                    <span className="font-serif text-[clamp(34px,8vw,60px)] font-bold leading-none opacity-80">{w.no}</span>
                    <span className="font-mono text-[11px] tracking-[0.3em]">{w.kicker}</span>
                  </div>
                  <h2 className="font-serif text-[clamp(30px,7vw,56px)] font-bold leading-[1.02] tracking-tight text-white">
                    {b.title}
                    {w.soon && <span className="ml-3 align-middle text-[12px] font-normal tracking-wide text-white/40">준비 중</span>}
                  </h2>
                </div>
              </div>

              {/* 해설 */}
              <div className="mx-auto max-w-[660px] px-6 py-10 sm:py-14">
                <p className={`mb-7 flex items-start gap-2 text-[13.5px] italic leading-relaxed ${w.accent}`}>
                  <span className="mt-px shrink-0 not-italic opacity-70">🧠</span>
                  <span>{b.brain}</span>
                </p>
                <div className="space-y-5 text-[15px] leading-[1.95] text-white/82">
                  {paras.map((p, i) => (
                    <p
                      key={i}
                      className={
                        i === 0
                          ? "first-letter:float-left first-letter:mr-2.5 first-letter:font-serif first-letter:text-[56px] first-letter:font-bold first-letter:leading-[0.78] first-letter:text-white"
                          : ""
                      }
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </main>

      {/* 푸터 */}
      <footer className="border-t border-panel-border px-6 py-12 text-center">
        <p className="font-serif text-[22px] font-bold tracking-tight text-white/80">NEURO·EARTH</p>
        <p className="mt-2 text-[12px] leading-relaxed text-white/45">
          살아있는 인공뇌 — 지구 스케일 신경가소성
          <br />
          작년 NEURO-SIM의 가소성 모델을 지구 규모로 키운 연장선의 작품.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full border border-panel-border px-5 py-2 text-[12px] text-white/65 transition hover:text-neon-cyan"
        >
          살아있는 전시 화면으로 →
        </Link>
        <p className="mt-8 font-mono text-[10px] tracking-[0.3em] text-white/30">by 민서</p>
      </footer>
    </div>
  );
}
