"use client";

import { useMetrics } from "@/store/useMetrics";
import { useViz } from "@/store/useViz";
import { VERSIONS } from "@/lib/versions";

/** 왼쪽 씬 위에 떠 있는 실시간 측정 readout. */
export function HUD() {
  const m = useMetrics((s) => s.metrics);
  const e = useMetrics((s) => s.emergent);
  const engine = useViz((s) => s.config.engine ?? "grid");
  const versionId = useViz((s) => s.versionId);
  const version = VERSIONS.find((v) => v.id === versionId);

  return (
    <div className="pointer-events-none absolute left-4 top-4 select-none font-mono text-[11px] leading-relaxed">
      <div className="mb-1 text-sm font-bold tracking-wide text-white">
        NEURO·EARTH
      </div>
      <div className="text-white/40">살아있는 인공뇌 · 신경가소성</div>

      {version && (
        <div className="mt-2 inline-block rounded border border-neon-green/40 bg-neon-green/5 px-2 py-0.5 text-[10px] text-neon-green">
          버전: {version.label}
        </div>
      )}

      <div className="mt-3 space-y-0.5 rounded-md border border-panel-border bg-black/40 px-3 py-2 backdrop-blur-sm">
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
