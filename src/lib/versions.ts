import type { SourceId } from "./signals/types";

// ─────────────────────────────────────────────────────────────
// "살아있는 보고서" — 각 시각 버전을 프리셋으로 박제.
// 개발 로그(timeline)의 항목 n과 연결되어, '이 버전 보기'/리모컨을 누르면
// 화면이 그 버전 설정으로 되돌아가고 해당 채팅 위치로 스크롤된다.
//
// 두 개의 직각 축:
//   · 버전(VizVersion) = 진화 '단계'(리모컨)
//   · 모드(ViewMode)   = 그 단계를 보는 방식 — 실시간 / 창세 (시나리오 바)
// 시나리오 단계(16+)는 modes(창세·실시간)를 둘 다 갖는다. 옛 버전(0-15)은 단일 config.
// ─────────────────────────────────────────────────────────────

export interface VizConfig {
  /** 3D 지구 표시 (false면 '지구 이전' 상태) */
  showEarth: boolean;
  /** 신경망 표시 */
  showNet: boolean;
  /** (grid 엔진 전용) 연결선 밝기 기준: weight=정적 가중치(줄전구) / act=신호 흐름. emergent는 안 읽음 */
  colorMode: "weight" | "act";
  /** (grid 엔진 전용) 노드 무작위 지터(도). emergent는 안 읽음 */
  jitter: number;
  /** 활성 신호 소스 */
  sources: SourceId[];
  /** (grid 엔진 전용) 신호 세기 배율. emergent는 안 읽음 */
  gain?: number;
  /** (grid 엔진 전용) 노드 크기를 vitality로 키울지. emergent는 항상 vitality 기반이라 안 읽음 */
  grow?: boolean;
  /** 렌더 엔진: grid=고정격자(기존) / emergent=노드가 데이터에서 생멸 */
  engine?: "grid" | "emergent";
  /** emergent에서 내재 활동(스스로 발화) 켜기 — 자극 없어도 살아있는 뇌 */
  intrinsic?: boolean;
  /** 호르몬(느린 확산·장기 유지 modulation) 켜기 — 연쇄반응 */
  hormone?: boolean;
  /** 피로(사회=식상함) — 과사용 시 쉬게 됨, 활동이 옮겨다님 */
  fatigue?: boolean;
  /** 항상성(평준화) — 입력 정규화로 폭주·쏠림 방지 */
  homeo?: boolean;
  /** 그리드 파동 레이어 — 고정 인프라(스타링크) 위 정보 파동(보라), 항공망과 독립 */
  gridWave?: boolean;
  /** 노드 크기를 작은 5단계로(선이 주인공). 끄면 옛 버전 큰 공 — 시간순 인프라 변화용 */
  smallNodes?: boolean;
  /** 노드 절대 수명(턴오버) — 활성이어도 나이 들면 죽어 슬롯이 풀림. 활동이 옮겨다니고 정적이지 않게 */
  mortal?: boolean;
  /** emergent 노드 슬롯 상한(밀도). 안 주면 기본 1200 */
  maxNodes?: number;
  /** 밀도 의존 자기조절 목표(수용한계). 하드캡 무관 이 근처에서 출렁이며 유지 */
  softCap?: number;
  /** 수용한계를 이 틱 동안 L자(느림→폭발)로 키움(문명사 성장곡선). 0/없음=상수 */
  softCapRamp?: number;
  /** 지역(격자 셀)별 수용한계 — 한 지역이 차도 빈 지역은 따로 자람(균등 성장). softCap 대신 */
  localCap?: number;
  /** 수상돌기 성장 확률 직접 지정(부익부·셀 채우는 속도). 없으면 genesis류 0.05 */
  growthProb?: number;
  /** 로컬 셀 한계를 면적(cos위도)으로 보정 — 극지방 과밀(격자 인공물) 방지 */
  areaCap?: boolean;
  /** 팬데믹 — SIR 전염 파동(확산성 탈분극). 우한 시작, 노선 타고 번짐(빨강=감염/파랑=회복) */
  pandemic?: boolean;
  /** 팬데믹 '멸종' 시네마틱 — 실제 코로나 타임라인(2019.12→2021): 활발→삽시간 빨강→대봉쇄 정지 + 날짜 자막 */
  pandemicArc?: boolean;
  /** 팬데믹 단절·재배선 — 대봉쇄에 시냅스(선)가 다 끊기고, 회복기에 더디게 다시 이어짐(v31+, 렌더 전용·엔진 불변) */
  pandemicSever?: boolean;
  /** 외상/전쟁 '두부외상' 시네마틱 — 한 방의 타격으로 국소 병변(흉터) + 가소성 우회 재배선(emergent) */
  traumaArc?: boolean;
  /** 노드 절대 수명(틱) 직접 지정. 없으면 mortal일 때 1500 */
  lifespan?: number;
  /** 8대 문명 영속 앵커 심기(창세 모드 전용) — genesis 소스의 pollAnchors 사용 */
  civAnchors?: boolean;
  /** 항공 노선 아치를 출발→도착으로 점진적으로 그림(한 번에 팍 X) */
  routeGrow?: boolean;
  /** 자동재생(전시 모드) 지원 — 시나리오 자동순환 + 카메라 무빙 + 클라이맥스 연출(v27+).
   *  옛 버전은 끔 → 자동순환·카메라가 과거 버전 화면을 건드리지 않는다(미래가 과거 안 바꿈) */
  exhibit?: boolean;
  /** 어트랙트 모드 — 무반응(9초) 시 UI 크롬을 다 숨기고 지구만(설치/전시용). v29+.
   *  옛 전시 버전(27·28)은 끔 → 새 기능이 과거 버전 화면을 건드리지 않는다(미래가 과거 안 바꿈) */
  attract?: boolean;
}

/** 단계를 보는 방식 — 직각 축 */
export type ViewMode = "live" | "genesis" | "pandemic" | "trauma";

export interface VizVersion {
  id: string;
  /** 연결되는 timeline 항목 번호 */
  n: number;
  label: string;
  /** 옛 단일 버전(0-15) */
  config?: VizConfig;
  /** 시나리오 단계(16+) — 실시간·창세(+통합 버전은 팬데믹까지). 버전마다 가진 모드만 둔다. */
  modes?: Partial<Record<ViewMode, VizConfig>>;
}

// ── 시나리오 단계의 모드 베이스 ──
// 실시간 = 항공(emergent) + 스타링크 그리드 / 창세 = 육지에서 스스로 깔림
const EM_BASE = {
  showEarth: true,
  showNet: true,
  colorMode: "act" as const,
  jitter: 4,
  gain: 1,
  engine: "emergent" as const,
  smallNodes: true,
  intrinsic: true,
  hormone: true,
  homeo: true,
};
function live(extra: Partial<VizConfig> = {}): VizConfig {
  return { ...EM_BASE, sources: ["flightslive"], gridWave: true, fatigue: true, routeGrow: true, ...extra };
}
function genLocal(extra: Partial<VizConfig> = {}): VizConfig {
  // 초기 창세 — 로컬 시드(아프리카 뭉침)
  return { ...EM_BASE, sources: ["local"], ...extra };
}
function genCores(extra: Partial<VizConfig> = {}): VizConfig {
  // 창세 — 육지 거점 번짐(Out of Africa)
  return { ...EM_BASE, sources: ["genesis"], ...extra };
}
function genCiv(extra: Partial<VizConfig> = {}): VizConfig {
  // 문명사 — 초기인류→기차·자동차→비행기 폭발(L자), 노선 점진 연결
  return { ...EM_BASE, sources: ["genesisciv"], routeGrow: true, ...extra };
}

// 팬데믹 — 실시간/창세와 직각인 '독립 버전 라인'. 리모컨에서 따로 분리(25 초기 · 26 대봉쇄).
// 단일 config(모드 분기 없음) → 실시간/창세 양쪽에 새지 않는다.
// 수명(mortal)은 끔 — 문명 흥망이 아니라 '안정된 망 위 전염/회복'이라야 노드 교체로
// 빨강이 멋대로 걷히지 않고, 회복 속도를 디렉터가 온전히 통제한다.
const PANDEMIC_BASE: VizConfig = live({
  softCap: 6500,
  maxNodes: 8000,
  pandemic: true,
  gridWave: false,
});

export const VERSIONS: VizVersion[] = [
  {
    id: "v-origin",
    n: 6,
    label: "처음 (지구 이전)",
    config: { showEarth: false, showNet: false, colorMode: "act", jitter: 4, sources: ["local"] },
  },
  {
    id: "v-earth",
    n: 11,
    label: "지구만",
    config: { showEarth: true, showNet: false, colorMode: "act", jitter: 4, sources: ["local"] },
  },
  {
    id: "v-net1",
    n: 16,
    label: "첫 신경망 (줄전구)",
    config: { showEarth: true, showNet: true, colorMode: "weight", jitter: 0, sources: ["local"] },
  },
  {
    id: "v-net2",
    n: 17,
    label: "신호 흐름 + 항공",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["local", "flight"] },
  },
  {
    id: "v-real",
    n: 19,
    label: "실데이터 (지진+항공시뮬)",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["flight", "quakes"] },
  },
  {
    id: "v-quakes",
    n: 21,
    label: "순수 실데이터 (지진만)",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["quakes"] },
  },
  {
    id: "v-starlink-bug",
    n: 23,
    label: "스타링크 (버그·밋밋)",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["starlink", "quakes"], gain: 0.1 },
  },
  {
    id: "v-starlink-fix",
    n: 24,
    label: "스타링크 (수정)",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["starlink", "quakes"], gain: 0.8 },
  },
  {
    id: "v-market",
    n: 25,
    label: "실시간 시장 (암호화폐·라이브)",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["crypto"], gain: 1 },
  },
  {
    id: "v-grow",
    n: 26,
    label: "노드 성장 (가소성·크기 변화)",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["crypto"], gain: 1, grow: true },
  },
  {
    id: "v-emergent",
    n: 28,
    label: "Emergent 엔진 (빈 지구에서 자라남)",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["crypto", "quakes"], gain: 1, engine: "emergent" },
  },
  {
    id: "v-alive",
    n: 29,
    label: "Emergent + 내재활동 (스스로 발화)",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["crypto", "quakes"], gain: 1, engine: "emergent", intrinsic: true },
  },
  {
    id: "v-flights",
    n: 31,
    label: "실시간 항공 유동인구 (OpenSky·진짜)",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["flightslive"], gain: 1, engine: "emergent", intrinsic: true },
  },
  {
    id: "v-hormone",
    n: 34,
    label: "문화 (전 지구 전파·연쇄) — 항공 뇌",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["flightslive"], gain: 1, engine: "emergent", intrinsic: true, hormone: true },
  },
  {
    id: "v-social",
    n: 40,
    label: "완성형 — 문화·식상함·평준화 (항공 뇌)",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["flightslive"], gain: 1, engine: "emergent", intrinsic: true, hormone: true, fatigue: true, homeo: true },
  },
  {
    id: "v-dual",
    n: 45,
    label: "이중 신경계 — 체성(항공·이동) + 자율(스타링크 배경망)",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["flightslive"], gain: 1, engine: "emergent", intrinsic: true, hormone: true, fatigue: true, homeo: true, gridWave: true, smallNodes: true },
  },

  // ── 시나리오 단계(16+) — 각 단계가 창세·실시간 두 모드를 다 가짐 ──
  {
    id: "s-scene",
    n: 61,
    label: "시나리오 등장 — 창세/실시간 분기",
    modes: { live: live(), genesis: genLocal() },
  },
  {
    id: "s-mortal",
    n: 63,
    label: "셀데스(노드 수명) — 활동이 옮겨다님",
    modes: { live: live({ mortal: true }), genesis: genLocal({ mortal: true }) },
  },
  {
    id: "s-cores",
    n: 64,
    label: "창세 육지 거점 번짐 (Out of Africa)",
    modes: { live: live({ mortal: true }), genesis: genCores({ mortal: true }) },
  },
  {
    id: "s-civ",
    n: 65,
    label: "8대 문명 영속 앵커 (역사순)",
    modes: { live: live({ mortal: true }), genesis: genCores({ mortal: true, civAnchors: true }) },
  },
  {
    id: "s-dense",
    n: 66,
    label: "노드 6000 — 빽빽한 뇌",
    modes: {
      live: live({ mortal: true, maxNodes: 6000 }),
      genesis: genCores({ mortal: true, civAnchors: true, maxNodes: 6000 }),
    },
  },
  {
    id: "s-balance",
    n: 70,
    label: "자기조절 — 천장 무관 ~6천 유지(다이나믹 증감)",
    modes: {
      live: live({ mortal: true, lifespan: 900, softCap: 6500, maxNodes: 8000 }),
      genesis: genCores({ mortal: true, civAnchors: true, lifespan: 900, softCap: 6500, maxNodes: 8000 }),
    },
  },
  {
    id: "s-civhistory",
    n: 71,
    label: "문명사 — L자 성장 + 흥망성쇠 (전역 밀도)",
    modes: {
      live: live({ mortal: true, lifespan: 900, softCap: 6500, maxNodes: 8000 }),
      genesis: genCiv({
        mortal: true,
        civAnchors: true,
        lifespan: 900,
        softCap: 6500,
        softCapRamp: 3600,
        maxNodes: 8000,
      }),
    },
  },
  {
    id: "s-civeven",
    n: 73,
    label: "문명사 — 지역 균등 성장 (극지방 과밀 버그)",
    modes: {
      live: live({ mortal: true, lifespan: 900, softCap: 6500, maxNodes: 8000 }),
      genesis: genCiv({
        mortal: true,
        civAnchors: true,
        lifespan: 900,
        localCap: 22, // 지역(10°셀)별 한계 → 한 곳이 차도 빈 곳은 따로 자람(균등). 비행기=N≥4600
        softCapRamp: 3600, // 성장 '속도'를 L자로(밀도 게이트 아님) — 초반 느림→후반 전속, 균등 유지
        maxNodes: 8000,
      }),
    },
  },
  {
    id: "s-civarea",
    n: 74,
    label: "문명사 — 면적 보정 (극지방 과밀 해결)",
    modes: {
      live: live({ mortal: true, lifespan: 900, softCap: 6500, maxNodes: 8000 }),
      genesis: genCiv({
        mortal: true,
        civAnchors: true,
        lifespan: 900,
        localCap: 30, // 면적보정으로 줄어드는 만큼 한계 ↑(전체 ~6500, 하드캡 8000 여유)
        areaCap: true, // 셀 한계 × cos(위도) → 극지방 과밀 방지
        softCapRamp: 3600,
        maxNodes: 8000,
      }),
    },
  },

  // ── 팬데믹 라인(실시간/창세와 분리된 독립 버전) — 단일 config ──
  {
    id: "p-basic",
    n: 75,
    label: "팬데믹 — 초기 (SIR 전염 파동·우한발)",
    config: PANDEMIC_BASE,
  },
  {
    id: "p-extinct",
    n: 77,
    label: "팬데믹 — 대봉쇄 (2019.12→2021)",
    config: { ...PANDEMIC_BASE, pandemicArc: true },
  },

  // ── 27 자동재생(전시 모드) — 시나리오 자동순환 + 카메라 무빙 + 클라이맥스 연출 ──
  {
    id: "s-exhibit",
    n: 88,
    label: "자동재생 — 전시 모드 (순환·카메라 무빙)",
    modes: {
      live: live({ mortal: true, lifespan: 900, softCap: 6500, maxNodes: 8000, exhibit: true }),
      genesis: genCiv({
        mortal: true,
        civAnchors: true,
        lifespan: 900,
        localCap: 30,
        areaCap: true,
        softCapRamp: 3600,
        maxNodes: 8000,
        exhibit: true,
      }),
    },
  },
  // ── 28 모바일 친화 — 폰/아이패드 대응(바텀시트·QR). 시뮬은 27과 동일, 마일스톤 표석 ──
  {
    id: "s-mobile",
    n: 89,
    label: "모바일 — 폰·아이패드 (바텀시트·QR)",
    modes: {
      live: live({ mortal: true, lifespan: 900, softCap: 6500, maxNodes: 8000, exhibit: true }),
      genesis: genCiv({
        mortal: true,
        civAnchors: true,
        lifespan: 900,
        localCap: 30,
        areaCap: true,
        softCapRamp: 3600,
        maxNodes: 8000,
        exhibit: true,
      }),
    },
  },
  // ── 29 어트랙트(설치 모드) — 무반응 시 UI 숨기고 지구만. 시뮬은 27·28과 동일, attract 플래그만 추가 ──
  {
    id: "s-attract",
    n: 91,
    label: "어트랙트 — 설치 모드 (무반응 시 UI 숨김)",
    modes: {
      live: live({ mortal: true, lifespan: 900, softCap: 6500, maxNodes: 8000, exhibit: true, attract: true }),
      genesis: genCiv({
        mortal: true,
        civAnchors: true,
        lifespan: 900,
        localCap: 30,
        areaCap: true,
        softCapRamp: 3600,
        maxNodes: 8000,
        exhibit: true,
        attract: true,
      }),
    },
  },
  // ── 30 뷰 모드 v2 — 화면비 맞춤(세로/가로 짤림 해소) + 몰입 비우기(탭 한 번에 전부 복귀) ──
  //     fit-to-aspect·수동 비우기는 전역(모든 버전 공통)이라 시뮬은 v29와 동일. 기본은 attract=false
  //     (자동 9초 숨김 끔 → 데스크탑 독서 중 사라지는 문제 없음). 자동 어트랙트는 v29(설치용)로 존치.
  {
    id: "s-view2",
    n: 93,
    label: "뷰 모드 v2 — 화면비 맞춤 · 몰입 비우기",
    modes: {
      live: live({ mortal: true, lifespan: 900, softCap: 6500, maxNodes: 8000, exhibit: true }),
      genesis: genCiv({
        mortal: true,
        civAnchors: true,
        lifespan: 900,
        localCap: 30,
        areaCap: true,
        softCapRamp: 3600,
        maxNodes: 8000,
        exhibit: true,
      }),
    },
  },
  // ── 31 팬데믹 단절·재배선 — 대봉쇄에 선이 다 끊기고, 회복기에 더디게 다시 이어짐 ──
  //     v26(대봉쇄)엔 단절이 원래 없던 동작이라(코드에 미구현) 새 기능 → v26은 그대로 두고 별도 버전으로 분리.
  //     pandemicSever 켜진 이 버전만 시냅스가 끊겼다 재연결(렌더 전용, 엔진 가중치 불변 = 골든테스트 안전).
  //     맨 끝이라 LATEST_PANDEMIC(하단 '팬데믹' 버튼·자동순환)이 자동으로 여기로 잡힌다.
  {
    id: "p-sever",
    n: 94,
    label: "팬데믹 — 단절·재배선 (대봉쇄에 끊기고 더디게 재연결)",
    config: { ...PANDEMIC_BASE, pandemicArc: true, pandemicSever: true },
  },
  // ── 32 통합 — 한 버전 안에서 실시간·창세·팬데믹·외상을 모드로 전환 + 자동순환 ──
  //     각 시나리오를 별도 라인이 아니라 '모드'로 품는다(버튼 눌러도 버전 점프 없음).
  //     자동순환은 live→genesis→pandemic/trauma를 한 버전 안에서 돈다. 옛 버전은 그대로(과거 안 바꿈).
  //     새 시나리오 모드 추가는 '기존 모드 화면을 안 바꾸는' 순수 가산이라 미래가 과거를 안 바꾼다.
  {
    id: "s-unified",
    n: 97,
    label: "통합 — 실시간·창세·팬데믹·외상 (한 버전·자동순환)",
    modes: {
      // 라이브 — 지역별 수용한계(localCap)로 한 지역이 다 못 먹게. 실제 항공 분포(미국·유럽·아시아)를
      // 충실히 반영(전엔 부익부로 다 유럽에 쏠려 '전 세계가 유럽으로' 가던 왜곡 → 교정).
      live: live({ mortal: true, lifespan: 900, localCap: 70, areaCap: true, maxNodes: 8000, exhibit: true }),
      genesis: genCiv({
        mortal: true,
        civAnchors: true,
        lifespan: 900,
        localCap: 30,
        areaCap: true,
        softCapRamp: 3600,
        maxNodes: 8000,
        exhibit: true,
      }),
      pandemic: { ...PANDEMIC_BASE, pandemicArc: true, pandemicSever: true, exhibit: true },
      // 외상 — 호르몬은 켠다(끄면 4천에서 자연 평형에 갇혀 7천을 못 감). 대신 성장률만 낮춰 속도 조절.
      trauma: live({
        mortal: true,
        lifespan: 1600,
        softCap: 7500,
        maxNodes: 8000,
        exhibit: true,
        traumaArc: true,
        growthProb: 0.09,
      }),
    },
  },
];

// 기본 진입점 = 마지막 '단계(staged)' 버전(s-civarea). 팬데믹은 별도 라인이라 기본값으로 안 잡음.
export const LATEST: VizVersion =
  [...VERSIONS].reverse().find((v) => v.modes) ?? VERSIONS[VERSIONS.length - 1];

/** 팬데믹 라인의 최신 버전(하단 바 '팬데믹' 버튼이 여기로 점프) */
export const LATEST_PANDEMIC: VizVersion | undefined =
  [...VERSIONS].reverse().find((v) => v.config?.pandemic);

/** 이 버전이 팬데믹 '라인'(독립 config 버전 25/26/31)인지 */
export function isPandemicVersion(id: string): boolean {
  const v = VERSIONS.find((x) => x.id === id);
  return !!v?.config?.pandemic;
}

/** 지금 화면이 팬데믹인지 — 팬데믹 모드이거나(통합 버전), 팬데믹 라인 버전이거나 */
export function isPandemicView(versionId: string, mode: string): boolean {
  return mode === "pandemic" || isPandemicVersion(versionId);
}

/** 그 버전이 가진 모드 목록(없으면 빈 배열 = 옛 단일/팬데믹 라인 버전) */
export function modesOf(v: VizVersion | undefined): ViewMode[] {
  return v?.modes ? (Object.keys(v.modes) as ViewMode[]) : [];
}

/** 그 버전이 자동순환(전시)을 지원하는지 — 어떤 모드든 exhibit이면 */
export function supportsAuto(v: VizVersion | undefined): boolean {
  if (!v) return false;
  if (v.modes) return Object.values(v.modes).some((c) => c?.exhibit);
  return !!v.config?.exhibit;
}

/** 버전 + 모드 → 실제 config. 옛 버전은 모드 무관 단일 config. 그 모드가 없으면 live로 폴백. */
export function configFor(v: VizVersion, mode: ViewMode): VizConfig {
  if (!v.modes) return v.config!;
  return v.modes[mode] ?? v.modes.live ?? v.modes.genesis!;
}

/** timeline 항목 번호 → 그 항목에 달린 버전(있으면) */
export function versionForEntry(n: number): VizVersion | undefined {
  return VERSIONS.find((v) => v.n === n);
}
