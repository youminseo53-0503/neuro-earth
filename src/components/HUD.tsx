"use client";

import { useMetrics } from "@/store/useMetrics";
import { useViz } from "@/store/useViz";
import { useUI } from "@/store/useUI";
import { useIdle } from "@/store/useIdle";
import { VERSIONS, isPandemicView } from "@/lib/versions";
import { modeById } from "@/lib/scenarios";

/** 왼쪽 씬 위에 떠 있는 실시간 측정 readout. */
export function HUD() {
  const m = useMetrics((s) => s.metrics);
  const e = useMetrics((s) => s.emergent);
  const engine = useViz((s) => s.config.engine ?? "grid");
  const versionId = useViz((s) => s.versionId);
  const mode = useViz((s) => s.mode);
  const version = VERSIONS.find((v) => v.id === versionId);
  const activeMode = isPandemicView(versionId, mode) ? "pandemic" : mode;
  const modeInfo = modeById(activeMode); // 실시간/창세/팬데믹
  const idle = useIdle((s) => s.idle);
  const earthVisible = useUI((s) => s.earthVisible);
  const toggleEarth = useUI((s) => s.toggleEarth);

  return (
    <div
      className={`pointer-events-none absolute left-4 top-4 select-none font-mono text-[11px] leading-relaxed transition-opacity duration-700 ${
        idle ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="mb-1 text-sm font-bold tracking-wide text-white">
        NEURO·EARTH
      </div>
      <div className="text-white/40">살아있는 인공뇌 · 신경가소성</div>

      {/* 정직성(모드) + 현재 단계 */}
      {modeInfo ? (
        <>
          <div
            className={`mt-2 inline-block rounded px-2 py-0.5 text-[10px] ${
              modeInfo.kind === "live"
                ? "border border-neon-green/40 bg-neon-green/5 text-neon-green"
                : "border border-amber-400/40 bg-amber-400/5 text-amber-300"
            }`}
          >
            {modeInfo.kind === "live" ? "● LIVE · 실시간" : `시나리오(가상) · ${modeInfo.label}`}
          </div>
          {version && <div className="mt-1 text-[10px] text-white/40">단계 · {version.label}</div>}
        </>
      ) : (
        version && (
          <div className="mt-2 inline-block rounded border border-neon-green/40 bg-neon-green/5 px-2 py-0.5 text-[10px] text-neon-green">
            버전: {version.label}
          </div>
        )
      )}

      {/* 지구 토글 — '지구 끄기'는 파란 구체만 끄고 신경 가소성 망은 남긴다. 크롬 뜰 때만 클릭 가능 */}
      {!idle && (
        <button
          onClick={toggleEarth}
          className="pointer-events-auto mt-3 flex items-center gap-1.5 rounded-md border border-panel-border bg-black/40 px-2.5 py-1.5 text-[11px] font-semibold text-white/75 backdrop-blur-sm transition hover:border-neon-cyan/50 hover:text-neon-cyan"
        >
          <span aria-hidden>{earthVisible ? "🌍" : "🧠"}</span>
          {earthVisible ? "지구 끄기" : "지구 켜기"}
        </button>
      )}

      {/* 상세 수치 — 모바일에선 숨김(제목+모드 배지만 남겨 지구가 주인공) */}
      <div className="mt-3 hidden space-y-0.5 rounded-md border border-panel-border bg-black/40 px-3 py-2 backdrop-blur-sm lg:block">
        {engine === "emergent" ? (
          <>
            <Row label="tick" value={e ? e.tick.toLocaleString() : "—"} />
            <Row label="노드 수" value={e ? `${e.nodes}` : "—"} accent="#00e5ff" />
            <Row label="시냅스 수" value={e ? `${e.synapses}` : "—"} accent="#00ff9c" />
            <Row label="발화" value={e ? `${e.firing}` : "—"} />
            <Row label="문화 (호르몬)" value={e ? e.hormone.toFixed(0) : "—"} accent="#ffb84d" />
            <Row label="탄생 / 죽음" value={e ? `+${e.births} / -${e.deaths}` : "—"} />
          </>
        ) : (
          <>
            <Row label="tick" value={m ? m.tick.toLocaleString() : "—"} />
            <Row label="발화 노드" value={m ? `${m.firing}` : "—"} accent="#00e5ff" />
            <Row
              label="가소성 이벤트/s"
              value={m ? `${m.plasticityEvents}` : "—"}
              accent="#00ff9c"
            />
            <Row label="평균 가중치" value={m ? m.meanWeight.toFixed(3) : "—"} />
            <Row label="총 활성도" value={m ? m.totalActivation.toFixed(1) : "—"} />
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-white/45">{label}</span>
      <span style={{ color: accent ?? "#e6f0ff" }}>{value}</span>
    </div>
  );
}
