import type { SignalSource, StimulusEvent } from "../types";

// 언어판(위키 도메인) → 대표 좌표. 그 언어가 주로 쓰이는 지역에 정보 활동을 근사 배치.
// 여러 점을 가진 언어(en·es 등)는 들어오는 편집을 점들에 돌려가며 흩뿌려 한 곳에 쏠리지 않게.
const LANG_GEO: Record<string, [number, number][]> = {
  en: [[39, -98], [52, -1], [20, 78], [-25, 134], [56, -106], [-1, 37]], // US·UK·India·Australia·Canada·동아프리카
  ja: [[36, 138]],
  de: [[51, 10]],
  fr: [[47, 2], [5, -4]], // France·서아프리카
  es: [[40, -4], [19, -99], [-34, -64], [4, -74]], // Spain·Mexico·Argentina·Colombia
  ru: [[56, 38]],
  zh: [[35, 104], [24, 121]], // China·Taiwan
  pt: [[-10, -52], [39, -8]], // Brazil·Portugal
  it: [[42, 13]],
  ar: [[26, 45], [30, 31], [33, 44]], // Saudi·Egypt·Iraq
  ko: [[37, 128]],
  nl: [[52, 5]],
  pl: [[52, 19]],
  id: [[-2, 118]],
  tr: [[39, 35]],
  fa: [[32, 53]],
  uk: [[49, 32]],
  vi: [[16, 108]],
  hi: [[22, 79]],
  th: [[15, 101]],
  sv: [[62, 15]],
  he: [[31, 35]],
  cs: [[49, 15]],
  fi: [[64, 26]],
  el: [[39, 22]],
  hu: [[47, 19]],
  ro: [[46, 25]],
  da: [[56, 9]],
  no: [[62, 10]],
  bg: [[43, 25]],
  sr: [[44, 21]],
  ca: [[42, 2]],
  ms: [[4, 102]],
  bn: [[24, 90]],
  ta: [[11, 78]],
  ur: [[30, 70]],
  sw: [[-6, 35]], // Swahili — 동아프리카
  af: [[-29, 24]], // Afrikaans — 남아프리카
  am: [[9, 39]], // Amharic — 에티오피아
};

/**
 * 인터넷 사용량(네트워크로 퍼지는 정보) — Wikimedia EventStreams 실시간 편집 스트림.
 *   · 지금 이 순간 전 세계가 만들고 고치는 위키 문서가 SSE로 실시간 푸시됨(폴링 아님).
 *   · 편집이 일어난 언어판 → 그 언어 지역 좌표에 +자극. 정보가 네트워크를 타고 퍼지는 파동.
 *   · 봇 편집·비(非)위키백과 도메인은 제외(사람이 만드는 정보만).
 *   · 키 불필요. 새로고침마다 실제 편집이 달라 '녹화 재생' 느낌이 없음.
 */
export function createWikiInfoSource(): SignalSource {
  let buffer: StimulusEvent[] = [];
  let es: EventSource | null = null;
  const rot: Record<string, number> = {}; // 언어별 다중 좌표 회전 인덱스

  function connect(signal: AbortSignal) {
    if (es || signal.aborted || typeof EventSource === "undefined") return;
    try {
      es = new EventSource("https://stream.wikimedia.org/v2/stream/recentchange");
    } catch {
      return;
    }
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        const server: string = d?.server_name ?? "";
        // 사람이 만드는 위키백과 편집만 (봇·로그·위키데이터/공용 제외)
        if (d?.bot) return;
        if (!server.endsWith(".wikipedia.org")) return;
        if (d?.type !== "edit" && d?.type !== "new") return;
        const lang = server.slice(0, server.indexOf("."));
        const pts = LANG_GEO[lang];
        if (!pts) return;
        const idx = (rot[lang] = (rot[lang] ?? 0) + 1) % pts.length;
        const [lat, lon] = pts[idx];
        // 새 문서(new)는 편집보다 조금 더 강하게(정보가 새로 생김)
        const mag = d.type === "new" ? 0.75 : 0.5;
        buffer.push({
          lat: lat + (Math.random() - 0.5) * 3,
          lon: lon + (Math.random() - 0.5) * 3,
          strength: mag,
          radius: 0.15,
        });
        if (buffer.length > 300) buffer.splice(0, buffer.length - 300);
      } catch {
        // 무시
      }
    };
    es.onerror = () => {
      // EventSource는 자동 재연결. 그대로 둔다.
    };
    signal.addEventListener(
      "abort",
      () => {
        try {
          es?.close();
        } catch {
          // 무시
        }
        es = null;
      },
      { once: true },
    );
  }

  return {
    id: "netinfo",
    label: "인터넷 정보 (Wikimedia 실시간 편집)",
    enabled: true,
    refreshMs: 3_600_000, // SSE 상시연결; 이 주기는 연결 점검용
    async refresh({ signal }) {
      connect(signal);
    },
    poll(): StimulusEvent[] {
      if (buffer.length === 0) return [];
      // 한 프레임에 쏟아붓지 않고 일정량씩 흘려보냄 → 끊김 없는 파동
      const TAKE = 8;
      if (buffer.length <= TAKE) {
        const out = buffer;
        buffer = [];
        return out;
      }
      return buffer.splice(0, TAKE);
    },
  };
}
