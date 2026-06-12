import * as THREE from "three";

export const EARTH_RADIUS = 2;

/** 카메라 수직 FOV(도). GlobeScene Canvas와 반드시 일치. */
export const CAMERA_FOV = 45;

/**
 * 화면비에 맞춘 카메라 거리 보정 배수.
 * three.js fov는 '수직' 화각이라, 세로 화면(aspect<1)은 수평 화각이 좁아져 지구 양옆이 짤린다.
 * 이때 수평이 binding(더 좁은 축)이므로 그만큼 더 물러나야 지구 전체가 들어온다.
 *   - 가로(aspect≥1): 수직이 binding → 1.0 → 데스크탑/가로 화면은 기존과 100% 동일(미래가 과거 안 바꿈)
 *   - 세로(aspect<1): 수평이 binding → >1 → 물러나서 양옆 짤림 해소
 * 'binding 축에서의 지구 점유 비율'을 보존하므로 가로에서의 연출 프레이밍이 세로에서도 그대로 재현된다.
 */
export function aspectDollyFactor(aspect: number): number {
  const vHalf = (CAMERA_FOV * Math.PI) / 360; // (FOV/2) in radians
  const hHalf = Math.atan(Math.max(aspect, 1e-4) * Math.tan(vHalf));
  return Math.sin(vHalf) / Math.sin(Math.min(vHalf, hHalf));
}

/**
 * 위경도(도) → 구면 위 3D 좌표. 표준 equirectangular earth 텍스처와 정렬.
 * 나중에 신경 노드·신호(지진/위성)를 같은 함수로 구면에 배치한다.
 */
export function latLonToVec3(
  lat: number,
  lon: number,
  radius = EARTH_RADIUS,
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/**
 * 주어진 시각의 태양 직하점(subsolar point) 방향 단위벡터.
 * 이 방향에 directional light를 두면 실시간 낮밤 경계가 생긴다.
 */
export function getSunDirection(date = new Date()): THREE.Vector3 {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000);
  // 적위(declination) 근사
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
  // UTC 정오에 경도 0이 직하점
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  const sunLon = (12 - utcHours) * 15;
  return latLonToVec3(decl, sunLon, 1).normalize();
}

/** latLonToVec3의 역변환: 단위벡터 → {lat,lon}(도). 항공 궤도 보간 등에 사용. */
export function vec3ToLatLon(x: number, y: number, z: number): { lat: number; lon: number } {
  const lat = Math.asin(Math.max(-1, Math.min(1, y))) * (180 / Math.PI);
  let lon = Math.atan2(z, -x) * (180 / Math.PI) - 180;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return { lat, lon };
}
