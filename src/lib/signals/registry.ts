import type { SignalSource } from "./types";
import { createLocalSource } from "./localSource";

/**
 * 활성 신호 소스 목록.
 * 지금은 로컬 신호 하나. 나중에 createQuakeSource()/createStarlinkSource()를
 * 여기 추가하면 끝 (엔진·렌더는 그대로).
 */
export function createSources(): SignalSource[] {
  return [createLocalSource()];
}
