// ─────────────────────────────────────────────────────────────
// 신호 플러그인 인터페이스
//
// 모든 신호(로컬·지진·스타링크·…)는 SignalSource로 구현된다.
// 매 틱 poll(tick)이 자극 이벤트를 뱉고, 엔진이 그걸 노드에 주입한다.
// 새 신호 추가 = 이 인터페이스를 구현해서 registry에 넣기만 하면 됨.
// 런타임에 enabled로 켜고/끄고/교체한다.
// ─────────────────────────────────────────────────────────────

export interface StimulusEvent {
  lat: number;
  lon: number;
  /** 자극 세기 */
  strength: number;
  /** 자극 반경(라디안). 없으면 엔진 기본값. 움직이는 점(항공)은 좁게. */
  radius?: number;
}

export interface SignalSource {
  id: string;
  label: string;
  /** 런타임 on/off */
  enabled: boolean;
  /** 외부 데이터가 필요한 소스용(지진/위성). 로컬은 불필요. */
  start?(): void | Promise<void>;
  stop?(): void;
  /** 이번 틱에 주입할 자극들. 내부 상태에서 동기적으로 뱉는다. */
  poll(tick: number): StimulusEvent[];
}
