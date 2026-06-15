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
    return () => events.forEach((ev) => document.removeEventListener(ev, prevent));
  }, []);

  return null;
}
