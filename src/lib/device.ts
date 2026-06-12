/** 터치 기기(폰·태블릿) 감지 — 터치 UX 판단용.
 *  렌더 전용 판단이라 SSR에선 false(서버는 그리지 않음). 엔진 동역학·버전 설정엔 절대 사용 금지. */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    navigator.maxTouchPoints > 1 ||
    /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
  );
}

/** 폰(작은 터치 기기) 감지 — 3D 렌더 품질(dpr·세그먼트·시냅스 캡)을 낮출 대상.
 *  아이패드 같은 태블릿은 GPU가 충분해서 데스크탑 품질 유지. */
export function isPhone(): boolean {
  if (typeof window === "undefined") return false;
  return isTouchDevice() && Math.min(window.screen.width, window.screen.height) < 700;
}
