/**
 * 결정론적 의사난수 생성기 (mulberry32).
 * 같은 seed → 어디서나 같은 수열. 노드 배치·초기 가중치를 고정해
 * 보고서/스크린샷의 재현성을 보장한다(라이브 신호만 달라짐).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
