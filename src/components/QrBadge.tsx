"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/** 폰에서 못 여는 주소(자기 자신/내부망 전용) — QR 띄울 때 경고 */
function unreachableFromPhone(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.startsWith("172.25.") // WSL 내부 대역
  );
}

/**
 * QR 접속 버튼(데스크탑 피드 헤더) — 누르면 현재 주소의 QR을 띄워 폰으로 이어 본다.
 *   주소 우선순위: NEXT_PUBLIC_QR_URL(고정 주소, 예: Tailscale) → 현재 origin.
 *   localhost 등 폰이 못 여는 주소면 경고를 함께 표시.
 */
export function QrBadge() {
  // url이 비어있으면 '닫힘', 채워지면 '열림'. effect 없이 클릭 시점에 주소를 읽는다
  // (window는 클릭 시점엔 항상 있음 → SSR/hydration·cascading-render 문제 없음).
  const [url, setUrl] = useState("");

  const open = () => setUrl(process.env.NEXT_PUBLIC_QR_URL || window.location.origin);
  const close = () => setUrl("");

  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  const warn = unreachableFromPhone(host);

  return (
    <>
      <button
        onClick={open}
        title="폰으로 보기 — QR 접속"
        className="shrink-0 rounded-lg border border-panel-border px-2.5 py-1.5 text-[clamp(11px,0.8vw,16px)] font-semibold text-white/70 transition hover:border-neon-cyan/50 hover:text-neon-cyan"
      >
        📱 QR
      </button>

      {url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border border-panel-border bg-[#0a1020] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-bold text-white/85">📱 폰으로 이어 보기</div>
            <div className="rounded-xl bg-white p-3">
              <QRCodeSVG value={url} size={196} />
            </div>
            <div className="max-w-[240px] text-center font-mono text-[11px] text-white/45 break-all">
              {url}
            </div>
            {warn && (
              <div className="max-w-[250px] rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-center text-[11px] leading-snug text-amber-200">
                ⚠ 이 주소는 폰에서 안 열려. 폰이 닿는 주소(예: 배포 주소)로 열거나
                NEXT_PUBLIC_QR_URL을 설정해줘.
              </div>
            )}
            <button
              onClick={close}
              className="mt-1 rounded-lg border border-panel-border px-4 py-1.5 text-[12px] text-white/60 transition hover:text-neon-cyan"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
