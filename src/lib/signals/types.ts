// ─────────────────────────────────────────────────────────────
// 신호 플러그인 인터페이스
//
// 모든 신호(로컬·지진·스타링크·…)는 SignalSource로 구현된다.
// 매 틱 poll(tick)이 자극 이벤트를 뱉고, 엔진이 그걸 노드에 주입한다.
// 새 신호 추가 = 이 인터페이스를 구현해서 registry에 넣기만 하면 됨.
// 런타임에 enabled로 켜고/끄고/교체한다.
// ─────────────────────────────────────────────────────────────

export type SourceId =
  | "local"
  | "flight"
  | "quakes"
  | "starlink"
  | "crypto"
  | "flightslive"
  | "netinfo"
  | "genesis"
  | "genesisciv";

export interface StimulusEvent {
  lat: number;
  lon: number;
  /** 자극 세기 */
  strength: number;
  /** 자극 반경(라디안). 없으면 엔진 기본값. 움직이는 점(항공)은 좁게. */
  radius?: number;
}

/** 두 지점을 잇는 장거리 연결(축삭) — 실제 항공 노선 등 */
export interface RouteEvent {
  latA: number;
  lonA: number;
  latB: number;
  lonB: number;
  weight?: number;
}

export interface SignalSource {
  id: string;
  label: string;
  /** 런타임 on/off */
  enabled: boolean;
  /** 이번 틱에 주입할 자극들. 내부 상태/버퍼에서 동기적으로 뱉는다(매 프레임). */
  poll(tick: number): StimulusEvent[];
  /** 선택. 장거리 연결(축삭) 요청 — emergent 엔진의 injectRoute로 전달. */
  pollRoutes?(tick: number): RouteEvent[];
  /** 선택. 영속(불멸) 앵커를 심을 위치 — emergent 엔진의 birthAnchor로 전달(8대 문명 등). */
  pollAnchors?(tick: number): { lat: number; lon: number; name?: string }[];
  /**
   * 선택. 외부 데이터 소스만 구현. refreshMs마다 벽시계로 호출되어
   * /api/signals/{id} 프록시에서 데이터를 받아 내부 버퍼를 채운다(렌더 루프와 독립).
   */
  refresh?(ctx: { signal: AbortSignal }): Promise<void>;
  /** refresh 폴링 주기(ms). 지진 60_000 등. */
  refreshMs?: number;
}
