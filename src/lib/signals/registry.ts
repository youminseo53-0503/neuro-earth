import type { SignalSource, SourceId } from "./types";
import { createLocalSource } from "./localSource";
import { createFlightSource } from "./flightSource";
import { createQuakeSource } from "./sources/quakes";
import { createStarlinkSource } from "./sources/starlink";
import { createMarketSource } from "./sources/market";
import { createFlightsLiveSource } from "./sources/flightsLive";

const FACTORIES: Record<SourceId, () => SignalSource> = {
  local: () => createLocalSource(),
  flight: () => createFlightSource(),
  quakes: () => createQuakeSource(),
  starlink: () => createStarlinkSource(),
  crypto: () => createMarketSource(),
  flightslive: () => createFlightsLiveSource(),
};

/**
 * id 목록으로 신호 소스 생성.
 * 새 신호 추가 = sources/<id>.ts 만들고 여기 FACTORIES에 한 줄(엔진·렌더는 그대로).
 */
export function makeSources(ids: SourceId[]): SignalSource[] {
  return ids.map((id) => FACTORIES[id]());
}

export function createSources(): SignalSource[] {
  return makeSources(["local", "flight"]);
}
