"use client";

import { useEffect } from "react";

/**
 * 키오스크/전시 잠금(JS) — CSS로 못 막는 동작들을 전역에서 차단한다.
 *   · contextmenu  : 우클릭/롱프레스 메뉴
 *   · dragstart    : 요소·이미지·텍스트 드래그(고스트 이미지)
 *   · selectstart  : 텍스트 선택 시작(드래그 선택)
 *   · gesturestart : iOS 사파리 핀치 줌 제스처
 *   OrbitControls(지구 회전)·바텀시트(스와이프)는 pointer/touch 이벤트라 영향 없음.
 *   (이 앱엔 입력창이 없어 selectstart 차단이 타이핑을 막지 않는다.)
 */
export function KioskGuards() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const events = ["contextmenu", "dragstart", "selectstart", "gesturestart"];
    events.forEach((ev) => document.addEventListener(ev, prevent));

    // 더블탭 줌/돋보기 차단 — iOS/iPadOS는 user-scalable=no를 무시해서 더블탭 줌이 살아있다.
    //   같은 자리 두 번 탭(≤300ms·40px 이내)일 때만 막아 → 서로 다른 버튼 연타는 안 막힘.
    let lastT = 0;
    let lastX = 0;
    let lastY = 0;
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const now = Date.now();
      if (now - lastT <= 300 && Math.abs(t.clientX - lastX) < 40 && Math.abs(t.clientY - lastY) < 40) {
        e.preventDefault(); // 둘째 탭의 더블탭-줌 기본동작만 차단(첫 탭/단일 탭은 정상)
      }
      lastT = now;
      lastX = t.clientX;
      lastY = t.clientY;
    };
    document.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, prevent));
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return null;
}
