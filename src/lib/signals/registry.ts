import type { SignalSource } from "./types";
import { createLocalSource } from "./localSource";
import { createFlightSource } from "./flightSource";

/**
 * 활성 신호 소스 목록.
 * 지금: 로컬(시드 핫스팟) + 항공(시뮬 항적).
 * 나중에 createQuakeSource()/createStarlinkSource()를 여기 추가하면 끝
 * (엔진·렌더는 그대로). 런타임 토글은 각 소스의 enabled로.
 */
export function createSources(): SignalSource[] {
  return [createLocalSource(), createFlightSource()];
}
