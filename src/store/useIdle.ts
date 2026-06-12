import { create } from "zustand";

/**
 * 무반응/비우기(idle) 상태 — UI 크롬을 다 숨기고 지구만 남긴다.
 *   · 자동(어트랙트, attract 버전): 9초 무반응 → idle. 아무 입력(마우스 이동 포함)이나 깨움.
 *   · 수동(비우기 버튼): manual=true. 데스크탑에선 마우스가 늘 미세하게 움직이므로,
 *     manual이면 mousemove/wheel로는 안 풀리고 클릭·탭·키로만 복귀(가로에서도 비우기가 유지됨).
 */
interface IdleState {
  idle: boolean;
  manual: boolean;
  setIdle: (v: boolean, manual?: boolean) => void;
}

export const useIdle = create<IdleState>((set) => ({
  idle: false,
  manual: false,
  setIdle: (v, manual = false) =>
    set((s) =>
      s.idle === v && s.manual === (v ? manual : false)
        ? s
        : { idle: v, manual: v ? manual : false },
    ),
}));
