"use client";

import { useIdle } from "@/store/useIdle";

/**
 * 사진찍기 모드 버튼 — 오른쪽 아래(사진에 방해 안 되게 작고 은은하게).
 *   누르면 모든 오버레이를 치우고(idle), 화면을 만져도 크롬이 다시 안 뜨게 잠근다(photo sticky).
 *   → 이 버튼 자체의 터치는 stopPropagation으로 '화면 터치'에서 제외 → 눌러도 개발로그 안 뜸.
 *   immersive(idle)거나 사진 모드일 때만 보인다(수동 탐색 중엔 숨겨 오른쪽 피드와 안 겹침).
 */
export function PhotoButton() {
  const idle = useIdle((s) => s.idle);
  const photo = useIdle((s) => s.photo);
  const setPhoto = useIdle((s) => s.setPhoto);
  const setIdle = useIdle((s) => s.setIdle);

  if (!idle && !photo) return null; // 수동 탐색 중엔 숨김

  const toggle = () => {
    if (!photo) {
      setPhoto(true);
      setIdle(true); // 다 치움
    } else {
      setPhoto(false);
      setIdle(false); // 크롬 복귀(수동) — IdleController가 곧 다시 자동으로
    }
  };
  const stop = (e: React.SyntheticEvent) => e.stopPropagation(); // 버튼 조작은 '화면 터치'로 안 침

  return (
    <button
      onClick={toggle}
      onPointerDown={stop}
      onTouchStart={stop}
      onMouseDown={stop}
      title={photo ? "사진찍기 모드 끄기" : "사진찍기 모드 — 다 치우기"}
      aria-label={photo ? "사진찍기 모드 끄기" : "사진찍기 모드"}
      className={`pointer-events-auto fixed bottom-4 right-4 z-40 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition-opacity ${
        photo ? "opacity-25 hover:opacity-90" : "opacity-55 hover:opacity-100"
      }`}
    >
      {photo ? (
        // 사진 모드 ON — 끄기(되돌리기) 아이콘
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8" />
          <path d="M3 4v4h4" />
        </svg>
      ) : (
        // 사진 모드 OFF — 카메라 아이콘
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )}
    </button>
  );
}
