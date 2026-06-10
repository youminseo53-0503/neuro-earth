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
    label: "실데이터 (지진)",
    config: { showEarth: true, showNet: true, colorMode: "act", jitter: 4, sources: ["flight", "quakes"] },
  },
];

export const LATEST: VizVersion = VERSIONS[VERSIONS.length - 1];

/** timeline 항목 번호 → 그 항목에 달린 버전(있으면) */
export function versionForEntry(n: number): VizVersion | undefined {
  return VERSIONS.find((v) => v.n === n);
}
