"use client";

import { useRef, useState } from "react";
import { VERSIONS, type VizVersion } from "@/lib/versions";
import { useViz } from "@/store/useViz";

/**
 * 왼쪽 씬 위에 떠 있는 '버전 리모컨'.
 *   · 드래그로 이동
 *   · 누르면 화면이 그 버전으로 바뀌고 + 오른쪽 피드가 해당 항목으로 스크롤
 */
export function VersionRemote() {
  const versionId = useViz((s) => s.versionId);
  const setVersion = useViz((s) => s.setVersion);
  const [pos, setPos] = useState({ x: 16, y: 210 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const select = (v: VizVersion) => {
    setVersion(v.id);
    document
      .getElementById(`feed-${v.n}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div
      className="absolute z-20 w-44 select-none rounded-lg border border-panel-border bg-black/70 backdrop-blur-sm"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="cursor-move rounded-t-lg border-b border-panel-border px-3 py-1.5 text-[11px] font-bold text-white/70"
      >
        🕹️ 버전 리모컨
      </div>
      <div className="flex flex-col gap-1 p-2">
        {VERSIONS.map((v, i) => (
          <button
            key={v.id}
            onClick={() => select(v)}
            className={`rounded px-2 py-1.5 text-left text-[11px] font-medium transition ${
              versionId === v.id
                ? "bg-neon-green/15 text-neon-green ring-1 ring-neon-green/40"
                : "text-white/55 hover:bg-white/5 hover:text-neon-cyan"
            }`}
          >
            <span className="font-mono opacity-50">{String(i).padStart(2, "0")}</span>{" "}
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
