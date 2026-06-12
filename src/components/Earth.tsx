"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { EARTH_RADIUS } from "@/lib/geo";
import { isPhone } from "@/lib/device";
import { useUI } from "@/store/useUI";
import { useViz } from "@/store/useViz";

// 모바일은 구 세그먼트를 낮춰 정점 수 ~55% 절감(카메라 거리상 화질 체감 없음)
const SEG_BODY = isPhone() ? 64 : 96;
const SEG_SUB = isPhone() ? 48 : 64;

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMO_FRAG = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
    gl_FragColor = vec4(0.25, 0.6, 1.0, 1.0) * intensity;
  }
`;

/**
 * 3D 지구 — 본체(낮 텍스처 + 바다 반사) + 구름 + 대기광.
 * earthVisible 토글 시 지구만 사라지고(신경망은 유지) Stars 배경만 남는다.
 */
export function Earth() {
  const earthVisible = useUI((s) => s.earthVisible);
  const showEarth = useViz((s) => s.config.showEarth);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [dayMap, specMap, cloudsMap] = useTexture([
    "/textures/earth_atmos_2048.jpg",
    "/textures/earth_specular_2048.jpg",
    "/textures/earth_clouds_2048.png",
  ]);

  useFrame((_, dt) => {
    if (cloudsRef.current) cloudsRef.current.rotation.y += dt * 0.006;
  });

  if (!earthVisible || !showEarth) return null;

  return (
    <group>
      {/* 본체 */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, SEG_BODY, SEG_BODY]} />
        <meshStandardMaterial
          map={dayMap}
          roughnessMap={specMap}
          metalness={0.1}
          roughness={0.9}
          // 밤쪽 어스샤인 — 낮 텍스처를 은은한 달빛 톤으로 자체발광시켜, 태양 반대편(밤)도
          // 지구가 흐릿하게 보이게 한다. 창세엔 스타링크 선이 없어 밤 지역이 완전 검정이 되던 문제 해소.
          // (지구를 끄는 봉쇄 클라이맥스와 무관 — 그건 메시 자체를 숨김.)
          emissive={new THREE.Color("#8aa6d2")}
          emissiveMap={dayMap}
          emissiveIntensity={0.48}
        />
      </mesh>

      {/* 구름 */}
      <mesh ref={cloudsRef} scale={1.012}>
        <sphereGeometry args={[EARTH_RADIUS, SEG_SUB, SEG_SUB]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.32}
          depthWrite={false}
        />
      </mesh>

      {/* 대기광 (Fresnel rim) */}
      <mesh scale={1.16}>
        <sphereGeometry args={[EARTH_RADIUS, SEG_SUB, SEG_SUB]} />
        <shaderMaterial
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
          vertexShader={ATMO_VERT}
          fragmentShader={ATMO_FRAG}
        />
      </mesh>
    </group>
  );
}
