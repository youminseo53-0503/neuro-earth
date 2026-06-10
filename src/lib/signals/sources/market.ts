import type { SignalSource, StimulusEvent } from "../types";

// 심볼 → 세계 금융 중심지 좌표 (거래는 물리적 위치가 없으므로 시각화상 배치)
const PLACES: Record<string, [number, number]> = {
  BTCUSDT: [40.71, -74.0], // 뉴욕
  ETHUSDT: [51.51, -0.13], // 런던
  BNBUSDT: [1.35, 103.82], // 싱가포르
  SOLUSDT: [35.68, 139.69], // 도쿄
  XRPUSDT: [22.32, 114.17], // 홍콩
  ADAUSDT: [50.11, 8.68], // 프랑크푸르트
  DOGEUSDT: [37.57, 126.98], // 서울
  AVAXUSDT: [47.37, 8.54], // 취리히
  LINKUSDT: [25.2, 55.27], // 두바이
  DOTUSDT: [-33.87, 151.21], // 시드니
  LTCUSDT: [43.65, -79.38], // 토론토
  XLMUSDT: [19.43, -99.13], // 멕시코시티
};

/**
 * 실시간 시장 (암호화폐, Binance 웹소켓). 진짜 라이브 스트림.
 *   · 24시간, 초당 수십~수백 체결이 푸시로 들어옴(폴링 스냅샷이 아님).
 *   · 가격 ↑(직전 대비) → 흥분(+), 가격 ↓ → 억제(−). 부호 있는 신호.
 *   · 각 코인을 금융 중심지에 배치 → 거기서 ±자극.
 * 키 불필요. 새로고침마다 시장이 달라서 '녹화 재생' 느낌이 사라진다.
 */
export function createMarketSource(): SignalSource {
  const symbols = Object.keys(PLACES);
  const last: Record<string, number> = {};
  let buffer: StimulusEvent[] = [];
  let ws: WebSocket | null = null;
  let connecting = false;

  function connect(signal: AbortSignal) {
    if (connecting || signal.aborted) return;
    connecting = true;
    const streams = symbols.map((s) => s.toLowerCase() + "@aggTrade").join("/");
    try {
      ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    } catch {
      connecting = false;
      return;
    }
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)?.data;
        if (!d?.s || !d?.p) return;
        const price = parseFloat(d.p);
        const qty = parseFloat(d.q);
        const place = PLACES[d.s];
        if (!place || !Number.isFinite(price)) return;
        const prev = last[d.s];
        last[d.s] = price;
        if (prev === undefined) return;
        // 체결 금액(가격×수량)으로 세기 가중 → 큰 거래가 큰 자극(규모 반영)
        const notional = price * (Number.isFinite(qty) ? qty : 0);
        const mag = Math.max(0.5, Math.min(1.6, 0.45 + Math.log10(notional + 1) / 5));
        // 가격 ↑ = 흥분(+), ↓ = 억제(−)
        buffer.push({
          lat: place[0],
          lon: place[1],
          strength: price >= prev ? mag : -mag,
          radius: 0.12,
        });
        if (buffer.length > 400) buffer.splice(0, buffer.length - 400);
      } catch {
        // 무시
      }
    };
    ws.onclose = () => {
      connecting = false;
      ws = null;
      if (!signal.aborted) setTimeout(() => connect(signal), 2000); // 재연결
    };
    ws.onerror = () => {
      try {
        ws?.close();
      } catch {
        // 무시
      }
    };
    signal.addEventListener(
      "abort",
      () => {
        try {
          ws?.close();
        } catch {
          // 무시
        }
        connecting = false;
      },
      { once: true },
    );
  }

  return {
    id: "crypto",
    label: "실시간 시장 (암호화폐·Binance)",
    enabled: true,
    refreshMs: 3_600_000, // ws는 상시연결; 이 주기는 재연결 점검용
    async refresh({ signal }) {
      connect(signal);
    },
    poll(): StimulusEvent[] {
      if (buffer.length === 0) return [];
      const out = buffer;
      buffer = [];
      return out;
    },
  };
}
