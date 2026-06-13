import { create } from "zustand";
import type { Briefing } from "@/lib/briefings";

/**
 * 전시(자동) 단계 상태 — ExhibitionController가 쓰고, 렌더가 읽는다.
 *   · narrKey   : 지금 띄울 나레이션(시나리오 설명). null=안 띄움.
 *   · contemplate: '관조 비트' — true면 카메라가 확 빠져 지구가 작아진다(나레이션 둘 자리 확보).
 *   · sceneDone : 팬데믹/전쟁 디렉터가 제 시네마틱을 끝냈다는 신호(컨트롤러가 받아 관조로 넘어감).
 */
interface StageState {
  narrKey: Briefing["key"] | null;
  contemplate: boolean;
  sceneDone: boolean;
  set: (p: Partial<Omit<StageState, "set">>) => void;
}

export const useStage = create<StageState>((set) => ({
  narrKey: null,
  contemplate: false,
  sceneDone: false,
  set: (p) => set(p),
}));
