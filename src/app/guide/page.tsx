import type { Metadata } from "next";
import Link from "next/link";
import { BRIEFINGS } from "@/lib/briefings";
import { ScenarioKeyVisual } from "@/components/ScenarioKeyVisual";

export const metadata: Metadata = {
  title: "작품 도록 — NEURO·EARTH",
  description:
    "NEURO·EARTH 작품 도록 — 지구 스케일 신경가소성으로 그린 네 개의 시나리오(실시간·창세·팬데믹·전쟁)와 회복. by 민서",
};

// ─────────────────────────────────────────────────────────────
// /guide — QR로 들어오는 '진짜 잡지' 작품 도록(팜플렛).
//   톤: 흰 지면(off-white) + 검은 잉크 + 명조 헤드라인 + 큰 여백, 흑백 신경망 플레이트.
//        모던하면서 신비로운 갤러리 도록. 전시장 라이브 화면(/)과는 별개의 정적 도록.
//   콘텐츠는 briefings.ts(작품 해설)를 그대로 쓴다 — 화면과 도록이 한 소스.
//   서버 컴포넌트(정적) — 인터랙션 없음, 폰에서 가볍게 스크롤.
// ─────────────────────────────────────────────────────────────

interface Work {
  key: keyof typeof BRIEFINGS;
  no: string;
  kicker: string;
  seed: number;
  soon?: boolean;
  img?: string;
  pos?: string;
}

const WORKS: Work[] = [
  { key: "live", no: "I", kicker: "Live · 실시간", seed: 0.4, img: "/guide/live.jpg", pos: "object-top" },
  { key: "genesis", no: "II", kicker: "Scene · 창세", seed: 1.7, img: "/guide/genesis.jpg" },
  { key: "pandemic", no: "III", kicker: "Scene · 팬데믹", seed: 2.9, img: "/guide/pandemic.jpg" },
  { key: "trauma", no: "IV", kicker: "Scene · 전쟁", seed: 4.2, img: "/guide/trauma.jpg" },
  { key: "recovery", no: "V", kicker: "Scene · 회복", seed: 5.6, img: "/guide/recovery.jpg" },
];

export default function GuidePage() {
  return (
    <div className="min-h-[100dvh] bg-[#f7f6f3] text-[#121212] selection:bg-black selection:text-white">
      {/* 상단 바 */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/10 bg-[#f7f6f3]/85 px-5 py-3 backdrop-blur-md">
        <span className="font-mono text-[11px] tracking-[0.35em] text-black/70">NEURO·EARTH</span>
        <Link href="/" className="font-mono text-[10px] tracking-[0.25em] text-black/45 transition hover:text-black">
          전시 화면 →
        </Link>
      </header>

      {/* 표지 */}
      <section className="mx-auto flex min-h-[86vh] max-w-[880px] flex-col items-center justify-center px-6 py-20 text-center">
        {/* 흑백 신경망 엠블럼 */}
        <div className="relative mb-12 h-40 w-40 overflow-hidden rounded-full ring-1 ring-black/10 sm:h-52 sm:w-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/guide/cover.jpg" alt="" className="h-full w-full object-cover" />
        </div>
        <p className="mb-7 font-mono text-[10px] tracking-[0.5em] text-black/45">EXHIBITION CATALOG</p>
        <h1 className="font-serif text-[clamp(46px,13vw,104px)] font-extrabold leading-[0.95] tracking-[-0.01em]">
          살아있는<br />인공뇌
        </h1>
        <p className="mt-8 max-w-[36ch] text-balance text-[13.5px] leading-[1.8] text-black/55">
          지구 스케일의 신경가소성. 실제 지구 데이터가 자극하면 스스로 배선되는 뇌 —
          네 개의 장면과, 그 너머의 회복.
        </p>
        <div className="mt-12 h-px w-12 bg-black/25" />
        <p className="mt-6 font-mono text-[10px] tracking-[0.35em] text-black/45">BY 민서</p>
      </section>

      {/* 작품들 */}
      <main className="mx-auto max-w-[880px] px-5 sm:px-8">
        {WORKS.map((w) => {
          const b = BRIEFINGS[w.key];
          const paras = b.body.split("\n\n");
          return (
            <article key={w.key} className="border-t border-black/10 py-16 sm:py-24">
              {/* 표제 */}
              <div className="mb-8 flex items-baseline gap-4">
                <span className="font-serif text-[clamp(26px,6vw,46px)] font-bold leading-none text-black/20">{w.no}</span>
                <span className="font-mono text-[10px] tracking-[0.35em] text-black/50">{w.kicker.toUpperCase()}</span>
              </div>
              <h2 className="mb-7 font-serif text-[clamp(32px,7.5vw,64px)] font-bold leading-[1.0] tracking-[-0.01em]">
                {b.title}
                {w.soon && <span className="ml-3 align-middle font-sans text-[12px] font-normal tracking-wide text-black/35">준비 중</span>}
              </h2>

              {/* 흑백 신경망 플레이트(흰 지면에 검은 도판) */}
              <figure className="relative aspect-[16/10] w-full overflow-hidden bg-black ring-1 ring-black/10">
                {w.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.img} alt={b.title} className={`h-full w-full object-cover ${w.pos ?? ""}`} />
                ) : (
                  <ScenarioKeyVisual seed={w.seed} idKey={w.key} />
                )}
              </figure>

              {/* 해설 */}
              <div className="mx-auto mt-10 max-w-[620px]">
                <p className="mb-8 flex items-start gap-2 border-l-2 border-black/15 pl-4 font-serif text-[14px] italic leading-relaxed text-black/55">
                  <span>{b.brain}</span>
                </p>
                <div className="space-y-5 text-[15px] leading-[1.95] text-black/85 sm:text-[16px]">
                  {paras.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </main>

      {/* 푸터 */}
      <footer className="border-t border-black/10 px-6 py-16 text-center">
        <p className="font-serif text-[24px] font-bold tracking-tight text-black/80">NEURO·EARTH</p>
        <p className="mt-3 text-[12px] leading-relaxed text-black/45">
          살아있는 인공뇌 — 지구 스케일 신경가소성
          <br />
          작년 NEURO-SIM의 가소성 모델을 지구 규모로 키운 연장선의 작품.
        </p>
        <Link
          href="/"
          className="mt-7 inline-block border-b border-black/40 pb-0.5 font-mono text-[11px] tracking-[0.2em] text-black/70 transition hover:text-black"
        >
          살아있는 전시 화면으로 →
        </Link>
        <p className="mt-10 font-mono text-[10px] tracking-[0.35em] text-black/30">BY 민서</p>
      </footer>
    </div>
  );
}
