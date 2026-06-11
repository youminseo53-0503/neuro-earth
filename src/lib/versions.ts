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
  /** 연결선 밝기 기준: weight=정적 가중치(줄전구) / act=신호 흐름 */
  colorMode: "weight" | "act";
  /** 노드 무작위 지터(도) */
  jitter: number;
  /** 활성 신호 소스 */
  sources: SourceId[];
  /** 신호 세기 배율 (버전별 발광 강도 조절). 기본 1 */
  gain?: number;
  /** 노드 크기를 vitality(누적 활동)로 키울지. 끄면 고정 크기(옛 버전 원본) */
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
  /** 노드 절대 수명(틱) 직접 지정. 없으면 mortal일 때 1500 */
  lifespan?: number;
  /** 8대 문명 영속 앵커 심기(창세 모드 전용) — genesis 소스의 pollAnchors 사용 */
  civAnchors?: boolean;
  /** 항공 노선 아치를 출발→도착으로 점진적으로 그림(한 번에 팍 X) */
  routeGrow?: boolean;
}

/** 단계를 보는 방식 — 직각 축 */
export type ViewMode = "live" | "genesis";

export interface VizVersion {
  id: string;
  /** 연결되는 timeline 항목 번호 */
  n: number;
  label: string;
  /** 옛 단일 버전(0-15) */
  config?: VizConfig;
  /** 시나리오 단계(16+) — 창세·실시간 두 모드를 다 가짐 */
  modes?: Record<ViewMode, VizConfig>;
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
];

export const LATEST: VizVersion = VERSIONS[VERSIONS.length - 1];

/** 버전 + 모드 → 실제 config. 옛 버전은 모드 무관 단일 config. */
export function configFor(v: VizVersion, mode: ViewMode): VizConfig {
  return v.modes ? v.modes[mode] : v.config!;
}

/** timeline 항목 번호 → 그 항목에 달린 버전(있으면) */
export function versionForEntry(n: number): VizVersion | undefined {
  return VERSIONS.find((v) => v.n === n);
}
