import * as THREE from "three";

export const EARTH_RADIUS = 2;

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
