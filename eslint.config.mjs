import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // 박제된 옛 격자/신경 레이어(grid 엔진) — R3F useFrame의 명령형 버퍼·로컬 변형은
  // React Compiler용 immutability 룰과 맞지 않는다(정상 패턴). 옛 버전 동작 보존상 손대지 않으므로 끔.
  {
    files: ["src/components/GridWaveLayer.tsx", "src/components/NeuralLayer.tsx"],
    rules: { "react-hooks/immutability": "off" },
  },
]);

export default eslintConfig;
