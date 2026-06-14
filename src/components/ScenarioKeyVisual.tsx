// ─────────────────────────────────────────────────────────────
// 작품 도록(잡지) 표지 비주얼 — 작품별 색 정체성으로 그린 추상 신경망.
//   순수 SVG·결정론(고정 좌표, Math.random 없음) → 서버 렌더 안전(hydration mismatch 0).
//   진짜 전시 장면 캡처가 준비되면 이 자리에 갈아끼울 수 있게 컴포넌트로 분리해 둠.
// ─────────────────────────────────────────────────────────────

export interface KeyPalette {
  from: string; // 배경 그라데 시작
  to: string;   // 배경 그라데 끝
  dot: string;  // 노드/선 색
  seed: number; // 점 배치 변주
}

interface Node {
  x: number;
  y: number;
  r: number;
}

// 황금각 스파이럴로 흩뿌린 노드 — 해바라기처럼 자연스러운 신경절 분포
function makeNodes(seed: number, n: number): Node[] {
  const out: Node[] = [];
  for (let i = 0; i < n; i++) {
    const t = seed + i * 2.39996323; // 황금각(rad)
    const rad = 7 + (i / n) * 45;
    out.push({
      x: 50 + rad * Math.cos(t),
      y: 50 + rad * Math.sin(t),
      r: 0.5 + (i % 5) * 0.24,
    });
  }
  return out;
}

const N = 34;

export function ScenarioKeyVisual({ pal, idKey }: { pal: KeyPalette; idKey: string }) {
  const nodes = makeNodes(pal.seed, N);
  const gid = `kv-${idKey}`;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id={gid} cx="42%" cy="38%" r="80%">
          <stop offset="0%" stopColor={pal.from} />
          <stop offset="100%" stopColor={pal.to} />
        </radialGradient>
        <filter id={`${gid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      <rect x="0" y="0" width="100" height="100" fill={`url(#${gid})`} />

      {/* 시냅스 — 스파이럴 이웃 + 가끔 가로지르는 선 */}
      <g stroke={pal.dot} strokeWidth="0.18" opacity="0.32">
        {nodes.map((nd, i) => {
          const a = nodes[i + 1];
          const b = nodes[i + 7];
          return (
            <g key={i}>
              {a && <line x1={nd.x} y1={nd.y} x2={a.x} y2={a.y} />}
              {b && i % 3 === 0 && <line x1={nd.x} y1={nd.y} x2={b.x} y2={b.y} />}
            </g>
          );
        })}
      </g>

      {/* 노드 — 글로우 한 겹 + 선명 한 겹 */}
      <g fill={pal.dot} filter={`url(#${gid}-glow)`} opacity="0.55">
        {nodes.map((nd, i) => (
          <circle key={i} cx={nd.x} cy={nd.y} r={nd.r * 1.8} />
        ))}
      </g>
      <g fill={pal.dot}>
        {nodes.map((nd, i) => (
          <circle key={i} cx={nd.x} cy={nd.y} r={nd.r} opacity={0.7 + (i % 3) * 0.1} />
        ))}
      </g>

      {/* 아래로 갈수록 어둡게(텍스트 오버레이 가독성) */}
      <rect x="0" y="0" width="100" height="100" fill="url(#kv-vignette)" />
      <defs>
        <linearGradient id="kv-vignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.78" />
        </linearGradient>
      </defs>
    </svg>
  );
}
