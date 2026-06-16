/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { BRIEFINGS } from "@/lib/briefings";

export const metadata: Metadata = {
  title: "작품 도록 — NEURO·EARTH",
  description:
    "NEURO·EARTH 작품 도록 — 지구 스케일 신경가소성으로 그린 다섯 장면(실시간·창세·팬데믹·전쟁·회복). by 민서",
};

// ─────────────────────────────────────────────────────────────
// /guide — QR로 들어오는 작품 도록(팜플렛).
//   톤(ilkw 무드): 연그레이 지면 + 굵은 산세리프 + 좌우 분할(텍스트 ↔ 이미지, 작품마다 교차)
//        + 광활한 여백. "빈 공간이 많고, 글씨는 적당하되 공간을 해치지 않게."(민서)
//        텍스트는 좁은 칼럼·넓은 줄간격으로 여백 위에 얹고, 이미지는 스크롤 중 옆에 머문다(sticky).
//   콘텐츠는 briefings.ts(작품 해설)를 그대로 쓴다 — 화면과 도록이 한 소스. 정적 서버 컴포넌트.
// ─────────────────────────────────────────────────────────────

interface Work {
  key: keyof typeof BRIEFINGS;
  no: string;
  kicker: string;
  img: string;
  pos?: string;
}

const WORKS: Work[] = [
  { key: "live", no: "I", kicker: "Live · 실시간", img: "/guide/live.jpg", pos: "object-top" },
  { key: "genesis", no: "II", kicker: "Scene · 창세", img: "/guide/genesis.jpg" },
  { key: "pandemic", no: "III", kicker: "Scene · 팬데믹", img: "/guide/pandemic.jpg" },
  { key: "trauma", no: "IV", kicker: "Scene · 전쟁", img: "/guide/trauma.jpg" },
  { key: "recovery", no: "V", kicker: "Scene · 회복", img: "/guide/recovery.jpg" },
];

export default function GuidePage() {
  return (
    <div className="min-h-[100dvh] bg-[#e8e7e3] font-sans text-[#1b1b1b] antialiased selection:bg-black selection:text-white">
      {/* 상단 바 */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/10 bg-[#e8e7e3]/80 px-6 py-4 backdrop-blur-md sm:px-10">
        <span className="text-[12px] font-bold tracking-[0.3em]">NEURO·EARTH</span>
        <Link
          href="/"
          className="text-[11px] tracking-[0.2em] text-black/45 underline-offset-4 transition hover:text-black hover:underline"
        >
          → 전시 화면
        </Link>
      </header>

      {/* 표지 — 좌우 분할, 광활한 여백 */}
      <section className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 pt-24 pb-28 sm:px-10 sm:pt-36 sm:pb-40 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        <div>
          <p className="mb-10 text-[11px] font-medium tracking-[0.45em] text-black/40">EXHIBITION CATALOG</p>
          <h1 className="text-[clamp(46px,8.5vw,108px)] font-black leading-[0.9] tracking-[-0.03em]">
            살아있는
            <br />
            인공뇌
          </h1>
          <p className="mt-10 max-w-[40ch] text-[14px] leading-[1.9] text-black/55">
            지구 스케일의 신경가소성. 실제 지구 데이터가 자극하면 스스로 배선되는 뇌 — 다섯 개의 장면.
          </p>
          <p className="mt-14 text-[11px] tracking-[0.35em] text-black/40">BY 민서</p>
        </div>
        <figure className="relative aspect-square w-full overflow-hidden bg-black">
          <img src="/guide/cover.jpg" alt="" className="h-full w-full object-cover" />
        </figure>
      </section>

      {/* 작품 — 좌우 지그재그, 큰 여백 */}
      <main className="mx-auto max-w-[1280px] px-6 sm:px-10">
        {WORKS.map((w, idx) => {
          const b = BRIEFINGS[w.key];
          const paras = b.body.split("\n\n");
          const flip = idx % 2 === 1;
          return (
            <article
              key={w.key}
              className="grid items-start gap-10 border-t border-black/10 py-20 sm:py-32 lg:grid-cols-2 lg:gap-20"
            >
              {/* 이미지 — 스크롤 중 옆에 머문다 */}
              <figure
                className={`relative aspect-square w-full overflow-hidden bg-black lg:sticky lg:top-24 ${
                  flip ? "lg:order-2" : ""
                }`}
              >
                <img src={w.img} alt={b.title} className={`h-full w-full object-cover ${w.pos ?? ""}`} />
              </figure>

              {/* 텍스트 — 좁은 칼럼, 넓은 줄간격 */}
              <div className={`lg:pt-1 ${flip ? "lg:order-1" : ""}`}>
                <div className="mb-6 flex items-baseline gap-4">
                  <span className="text-[clamp(40px,7vw,76px)] font-black leading-none text-black/15">{w.no}</span>
                  <span className="text-[11px] font-medium tracking-[0.35em] text-black/45">
                    {w.kicker.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-[clamp(34px,6vw,60px)] font-black leading-[0.98] tracking-[-0.02em]">{b.title}</h2>
                <p className="mt-7 max-w-[42ch] text-[14px] font-medium leading-[1.7] text-black/50">{b.brain}</p>
                <div className="mt-10 max-w-[46ch] space-y-5 text-[14px] leading-[1.95] text-black/75">
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
      <footer className="mx-auto max-w-[1280px] border-t border-black/10 px-6 py-28 sm:px-10 sm:py-36">
        <p className="text-[clamp(32px,6vw,68px)] font-black leading-none tracking-[-0.02em]">NEURO·EARTH</p>
        <p className="mt-8 max-w-[44ch] text-[13px] leading-[1.9] text-black/50">
          살아있는 인공뇌 — 지구 스케일 신경가소성. 작년 NEURO-SIM의 가소성 모델을 지구 규모로 키운 연장선의 작품.
        </p>
        <Link
          href="/"
          className="mt-12 inline-block text-[12px] tracking-[0.2em] text-black/70 underline underline-offset-4 transition hover:text-black"
        >
          → 살아있는 전시 화면으로
        </Link>
        <p className="mt-16 text-[11px] tracking-[0.35em] text-black/35">BY 민서</p>
      </footer>
    </div>
  );
}
