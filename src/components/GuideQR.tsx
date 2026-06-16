"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * 좌측 하단 QR — 찍으면 작품 도록(/guide·메뉴얼)으로. 전시 관람객 안내용이라 늘 보인다.
 *   URL은 접속한 곳 기준(window.origin)이라 어디 배포돼도 그 도메인의 /guide로 연결.
 */
export function GuideQR() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(window.location.origin + "/guide");
  }, []);
  if (!url) return null;

  return (
    <a
      href="/guide"
      target="_blank"
      rel="noopener"
      className="group pointer-events-auto absolute bottom-3 left-3 z-20 hidden flex-col items-center gap-1 opacity-40 transition-opacity hover:opacity-100 lg:flex"
      title="작품 도록(메뉴얼) 열기"
    >
      <div className="rounded-md bg-white p-1 ring-1 ring-black/10">
        <QRCodeSVG value={url} size={44} bgColor="#ffffff" fgColor="#050810" level="M" />
      </div>
      <span className="font-mono text-[7.5px] tracking-[0.2em] text-white/40 group-hover:text-neon-cyan">
        SCAN · 도록
      </span>
    </a>
  );
}
