// ─────────────────────────────────────────────────────────────
// 작품 도록(잡지) 이미지 — 흑백 모노크롬 신경망(네거티브: 검은 지면 위 흰 선·점).
//   흰 지면의 잡지와 대비되는 '검은 이미지 블록' — 모던·신비로운 갤러리 도록 톤.
//   순수 SVG·결정론(고정 좌표, Math.random 없음) → 서버 렌더 안전.
//   진짜 전시 장면 캡처가 준비되면 이 자리에 갈아끼울 수 있게 컴포넌트로 분리해 둠.
// ─────────────────────────────────────────────────────────────

interface Node {
  x: number;
  y: number;
  r: number;
}

// 황금각 스파이럴로 흩뿌린 노드 — 검은 우주에 떠 있는 성운처럼
function makeNodes(seed: number, n: number): Node[] {
  const out: Node[] = [];
  for (let i = 0; i < n; i++) {
    const t = seed + i * 2.39996323; // 황금각(rad)
    const rad = 6 + (i / n) * 46;
    out.push({
      x: 50 + rad * Math.cos(t),
      y: 50 + rad * Math.sin(t),
      r: 0.45 + (i % 5) * 0.2,
    });
  }
  return out;
}

const N = 40;

export function ScenarioKeyVisual({ seed, idKey }: { seed: number; idKey: string }) {
  const nodes = makeNodes(seed, N);
  const gid = `kv-${idKey}`;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id={gid} cx="50%" cy="44%" r="78%">
          <stop offset="0%" stopColor="#1c1c1c" />
          <stop offset="100%" stopColor="#040404" />
        </radialGradient>
        <filter id={`${gid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.85" />
        </filter>
      </defs>

      <rect x="0" y="0" width="100" height="100" fill={`url(#${gid})`} />

      {/* 시냅스 — 가는 흰 선 */}
      <g stroke="#ffffff" strokeWidth="0.1" opacity="0.2">
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

      {/* 노드 — 은은한 글로우 + 선명한 흰 점 */}
      <g fill="#ffffff" filter={`url(#${gid}-glow)`} opacity="0.16">
        {nodes.map((nd, i) => (
          <circle key={i} cx={nd.x} cy={nd.y} r={nd.r * 2} />
        ))}
      </g>
      <g fill="#ffffff">
        {nodes.map((nd, i) => (
          <circle key={i} cx={nd.x} cy={nd.y} r={nd.r} opacity={0.55 + (i % 3) * 0.15} />
        ))}
      </g>
    </svg>
  );
}
