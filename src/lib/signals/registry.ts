import type { SignalSource, SourceId } from "./types";
import { createLocalSource } from "./localSource";
import { createFlightSource } from "./flightSource";

const FACTORIES: Record<SourceId, () => SignalSource> = {
  local: () => createLocalSource(),
  flight: () => createFlightSource(),
};

/**
 * id 목록으로 신호 소스 생성.
 * 나중에 quake/starlink를 FACTORIES에 추가하면 끝(엔진·렌더는 그대로).
 */
export function makeSources(ids: SourceId[]): SignalSource[] {
  return ids.map((id) => FACTORIES[id]());
}

export function createSources(): SignalSource[] {
  return makeSources(["local", "flight"]);
}
