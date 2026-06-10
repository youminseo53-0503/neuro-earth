"use client";

import { useState } from "react";
import type { TimelineMessage } from "@/data/timeline";

const PREVIEW_LEN = 110;

export function FeedEntry({ msg }: { msg: TimelineMessage }) {
  const isMinseo = msg.role === "minseo";
  const collapsible = Boolean(msg.long) && msg.text.length > PREVIEW_LEN;
  const [open, setOpen] = useState(false);

  const shown =
    collapsible && !open ? msg.text.slice(0, PREVIEW_LEN).trimEnd() + "…" : msg.text;

  return (
    <div
      className={`flex w-full flex-col gap-1 ${
        isMinseo ? "items-end" : "items-start"
      }`}
    >
      {/* 메타 라벨 */}
      <div
        className={`flex items-center gap-2 px-1 text-[11px] tracking-wide ${
          isMinseo ? "flex-row-reverse" : ""
        }`}
      >
        <span
          className="font-mono font-semibold"
          style={{ color: isMinseo ? "var(--minseo)" : "var(--neon-cyan)" }}
        >
          #{String(msg.n).padStart(2, "0")}
        </span>
        <span className="font-semibold text-white/80">
          {isMinseo ? "민서" : "클로드"}
        </span>
      </div>

      {/* 말풍선 */}
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
          isMinseo
            ? "rounded-tr-sm bg-[#3a3420] text-amber-50 ring-1 ring-amber-400/25"
            : "rounded-tl-sm bg-panel text-foreground/90 ring-1 ring-panel-border"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{shown}</p>
        {collapsible && (
          <button
            onClick={() => setOpen((v) => !v)}
            className={`mt-1.5 text-[11px] font-semibold ${
              isMinseo ? "text-amber-300/80" : "text-neon-cyan/80"
            } hover:underline`}
          >
            {open ? "접기 ▲" : "더보기 ▼"}
          </button>
        )}
      </div>
    </div>
  );
}
