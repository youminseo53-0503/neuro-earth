import type { SourceId } from "./signals/types";

// ─────────────────────────────────────────────────────────────
// "살아있는 보고서" — 각 시각 버전을 프리셋으로 박제.
// 개발 로그(timeline)의 항목 n과 연결되어, '이 버전 보기'/리모컨을 누르면
// 화면이 그 버전 설정으로 되돌아가고 해당 채팅 위치로 스크롤된다.
// 큰 시각 변화가 생길 때마다 여기에 버전을 하나씩 append.
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
}

export interface VizVersion {
  id: string;
  /** 연결되는 timeline 항목 번호 */
  n: number;
  label: string;
  config: VizConfig;
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
    config: {
      showEarth: true,
      showNet: true,
      colorMode: "act",
      jitter: 4,
      sources: ["crypto", "quakes"],
      gain: 1,
      engine: "emergent",
    },
  },
  {
    id: "v-alive",
    n: 29,
    label: "Emergent + 내재활동 (스스로 발화)",
    config: {
      showEarth: true,
      showNet: true,
      colorMode: "act",
      jitter: 4,
      sources: ["crypto", "quakes"],
      gain: 1,
      engine: "emergent",
      intrinsic: true,
    },
  },
  {
    id: "v-flights",
    n: 31,
    label: "실시간 항공 유동인구 (OpenSky·진짜)",
    config: {
      showEarth: true,
      showNet: true,
      colorMode: "act",
      jitter: 4,
      sources: ["flightslive"],
      gain: 1,
      engine: "emergent",
      intrinsic: true,
    },
  },
  {
    id: "v-hormone",
    n: 34,
    label: "문화 (전 지구 전파·연쇄) — 항공 뇌",
    config: {
      showEarth: true,
      showNet: true,
      colorMode: "act",
      jitter: 4,
      sources: ["flightslive"],
      gain: 1,
      engine: "emergent",
      intrinsic: true,
      hormone: true,
    },
  },
  {
    id: "v-social",
    n: 40,
    label: "완성형 — 문화·식상함·평준화 (항공 뇌)",
    config: {
      showEarth: true,
      showNet: true,
      colorMode: "act",
      jitter: 4,
      sources: ["flightslive"],
      gain: 1,
      engine: "emergent",
      intrinsic: true,
      hormone: true,
      fatigue: true,
      homeo: true,
    },
  },
  {
    id: "v-dual",
    n: 45,
    label: "이중 신경계 — 체성(항공·이동) + 자율(스타링크 배경망)",
    config: {
      showEarth: true,
      showNet: true,
      colorMode: "act",
      jitter: 4,
      sources: ["flightslive"],
      gain: 1,
      engine: "emergent",
      intrinsic: true,
      hormone: true,
      fatigue: true,
      homeo: true,
      gridWave: true,
      smallNodes: true,
    },
  },
];

export const LATEST: VizVersion = VERSIONS[VERSIONS.length - 1];

/** timeline 항목 번호 → 그 항목에 달린 버전(있으면) */
export function versionForEntry(n: number): VizVersion | undefined {
  return VERSIONS.find((v) => v.n === n);
}
