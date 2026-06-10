# 신호 플러그인 + 데이터 계층 아키텍처 (실데이터/Supabase/Vercel 대비)

> 다중 관점 병렬 설계 → 적대적 비평 → 종합 워크플로우 결과 (2026-06-11).
> **지금 코드는 이대로 두고**, 실데이터 신호(USGS 지진 / Starlink / 낮밤) + 런타임 토글 +
> Supabase를 붙이는 **M6 시점에 이 문서를 그대로 따라 구현**한다.

## 핵심 결정 (왜 이렇게)

잘 도는 **동기 pull 루프**(`NeuralLayer`의 `useFrame` → `src.poll(tick)` → `injectStimulus` → `step`)를
async fetch push로 갈아치우면 두 시계가 뭉개진다:

- **(A) 60fps 렌더/시뮬 시계** — 동기 `poll`. flight/local은 매 프레임 전진해야 함.
- **(B) 벽시계 데이터 갱신** — 지진 60s, Starlink 2h 네트워크.

→ **둘을 분리 유지하고 '소스 내부 버퍼'로 잇는다.** 기존 `SignalSource.poll(tick)`(동기)은 유지하고,
외부 데이터 소스만 선택적 `refresh(ctx)`(벽시계)를 구현해 내부 버퍼를 채운다. `poll`은 그 버퍼를 동기로 읽기만.

런타임 토글: `source.enabled`(mutable, 렌더 루프가 읽는 진실) + `useSignals` store의 `enabledIds`(UI 리렌더용 미러)를 toggle에서 함께 갱신. **registry를 `createSources()` 함수 → 모듈 싱글톤 `SIGNAL_SOURCES` 배열로 승격**해야 store/훅/렌더가 같은 인스턴스를 공유(=토글 작동)한다. (현재는 함수형이라 토글 불가 — 이 리팩터가 선행 조건.)

## 인터페이스 / 코드 청사진

```ts
// src/lib/signals/types.ts — 기존 확장(파괴 X)
export interface StimulusEvent {
  lat: number; lon: number; strength: number; radius?: number;
}
export interface SignalSource {
  id: string; label: string; color?: string;
  enabled: boolean;                       // 진실 필드(store가 동기화)
  poll(tick: number): StimulusEvent[];    // 동기, 매 프레임 — 내부 버퍼/시뮬에서 즉시 방출
  refresh?(ctx: { signal: AbortSignal }): Promise<void>; // 외부 소스만; /api/signals/{id} 프록시로 버퍼 적재
  refreshMs?: number;                     // 지진 60_000, 스타링크 7_200_000
}
```

```ts
// src/lib/signals/registry.ts — 함수 아님! 모듈 싱글톤
export const SIGNAL_SOURCES: SignalSource[] = [
  createLocalSource(), createFlightSource(),
  createQuakeSource(), createStarlinkSource(), createDayNightSource(),
];
export const sourceById = (id: string) => SIGNAL_SOURCES.find((s) => s.id === id);
```

```ts
// src/store/useSignals.ts — 런타임 토글(zustand)
export const useSignals = create<SignalState>((set) => ({
  enabledIds: new Set(SIGNAL_SOURCES.filter((s) => s.enabled).map((s) => s.id)),
  toggle: (id) => set((st) => {
    const src = sourceById(id); if (src) src.enabled = !src.enabled;   // 진실 갱신
    const next = new Set(st.enabledIds);
    next.has(id) ? next.delete(id) : next.add(id);                     // 새 Set → 리렌더
    return { enabledIds: next };
  }),
  setOnly: (id) => set(() => {
    for (const s of SIGNAL_SOURCES) s.enabled = s.id === id;
    return { enabledIds: new Set([id]) };
  }),
}));
// 구독: useSignals(useShallow(s => [...s.enabledIds]))
```

```ts
// src/lib/signals/useStimulusStream.ts — 벽시계 폴링(클라 전용). 렌더 루프와 독립.
export function useStimulusStream() {
  const enabledIds = useSignals((s) => s.enabledIds);
  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = []; const acs: AbortController[] = [];
    for (const src of SIGNAL_SOURCES) {
      if (!src.refresh || !enabledIds.has(src.id)) continue;
      const ac = new AbortController(); acs.push(ac);
      const run = () => src.refresh!({ signal: ac.signal }).catch(() => {});
      run(); timers.push(setInterval(run, src.refreshMs ?? 60_000));
    }
    return () => { timers.forEach(clearInterval); acs.forEach((c) => c.abort()); };
  }, [enabledIds]);
}
// NeuralLayer/GlobeScene에서 한 줄 호출. useFrame은 동기 poll만 유지.
```

```ts
// src/app/api/signals/[id]/route.ts — 외부 프록시·캐시(단일 동적 라우트)
// Next 16: route handler 기본 비캐시 + force-static은 동적 [id]와 충돌
//  → fetch(url, { next: { revalidate } })로 upstream 캐시(=Vercel Data Cache 승격)
const UPSTREAM: Record<string, { url: string; revalidate: number }> = {
  quakes:   { url: ".../all_hour.geojson", revalidate: 60 },
  starlink: { url: ".../gp.php?GROUP=starlink&FORMAT=tle", revalidate: 7200 },
};
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/signals/[id]">) {
  const { id } = await ctx.params;                 // Next 16: params는 Promise
  const up = UPSTREAM[id]; if (!up) return new Response("unknown", { status: 404 });
  const res = await fetch(up.url, { next: { revalidate: up.revalidate } });
  if (!res.ok) return new Response("upstream error", { status: 502 });
  return new Response(await res.text(), { headers: { "content-type": res.headers.get("content-type") ?? "text/plain" } });
}
```

```ts
// src/lib/data/repo.ts — Supabase가 붙는 유일한 경계 (지금은 staticRepo)
export interface Repo {
  getTimeline(): Promise<TimelineMessage[]>;
  saveSnapshot?(snap: { takenAt: number; weights: number[] }): Promise<void>; // 확장점
}
export const staticRepo: Repo = { async getTimeline() { return timeline; } };
// src/lib/data/index.ts: repo = ENV==='supabase' ? supabaseRepo : staticRepo
```

## 새 신호 추가 = 3스텝
1. `src/lib/signals/sources/<id>.ts`에 `createXxxSource()` 작성 — `poll(tick)` 필수, 외부 데이터면 `refresh`+`refreshMs` 추가(`/api/signals/<id>` fetch→버퍼), 순수계산(daynight)이면 `poll`에서 바로 계산.
2. (외부 데이터일 때만) `[id]/route.ts`의 `UPSTREAM`에 `<id>: { url, revalidate }` 한 줄.
3. `registry.ts`의 `SIGNAL_SOURCES`에 import + 한 줄. 끝(토글 목록·폴링·기본 enabled가 전부 registry에서 파생).

## Supabase 부착 시
- **바뀌는 것**: `repo.ts`에 `supabaseRepo` 본문 1개, route handler에 '캐시 테이블 조회→없으면 upstream→upsert' 블록, `supabase/migrations/0001_init.sql`(timeline 테이블 + `timeline.ts` seed), `supabase.ts`(anon=읽기/구독, service_role=route handler 전용).
- **안 바뀌는 것**: 모든 SignalSource, poll/refresh 루프, useStimulusStream, plasticity 엔진, NeuralLayer, 컴포넌트의 `repo.getTimeline()` 호출부.
- **env**: `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`(클라), `SUPABASE_SERVICE_ROLE_KEY`(**서버 전용, NEXT_PUBLIC 절대 금지**, `import 'server-only'` 가드), `NEXT_PUBLIC_DATA_BACKEND=supabase`.

## Vercel / SSR / 성능 주의
- `fetch(url,{next:{revalidate}})`는 Vercel **Data Cache**로 승격 → CelesTrak 2h·USGS 60s 레이트리밋 회피가 배포에서 그대로 작동(리전별 cold 가능). **force-static을 동적 [id]에 쓰지 말 것.**
- R3F Canvas는 `page.tsx`에서 `dynamic(ssr:false)` 유지 → three/satellite.js가 SSR로 안 돎. registry/소스는 **클라이언트 트리에서만 import**.
- Repo 경계는 반대로: timeline 같은 영속 데이터는 **Server에서 `repo.getTimeline()`→props 주입**이 정석(현재 PromptFeed가 'use client'로 timeline 직접 import → Supabase 전환 전 이 리팩터 필요).
- **Starlink 7000기 함정**: TLE만 2h 캐시, 위치계산은 `poll`에서 satellite.js `BulkPropagator`로 **N기(150~300) 샘플 + 수십 프레임마다 재계산 + 보간**. 더 무거우면 Web Worker로 승격.
- quakes `poll`은 이벤트당 **쿨다운**(같은 지진 N틱마다 1회)으로 매 프레임 도배 방지.

## 지금 미적용(의도적 보류)
- registry 싱글톤 승격·useSignals·useStimulusStream·API 라우트·repo.ts는 **실데이터(M6) 때 도입**. 현재 버전 시스템(`makeSources(config.sources)`)은 버전별 고정 소스라 그대로 둠.
- 제안2의 Repository 3종/Realtime/인메모리 repo = 현재 wiring 없어 **죽은 추상화 → 기각**. Repo 1개 + 확장점만.
