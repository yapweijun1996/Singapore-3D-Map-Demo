import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeTokens } from '../lib/theme';
import { CONFIG } from '../config';

interface Props {
  theme: ThreeTokens;
}

// Circular ground plane with a radial fade — recomputed when the theme changes
export function Floor({ theme }: Props) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(theme.floor) } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform vec3 uColor;
          void main() {
            float d = distance(vUv, vec2(0.5));
            float a = smoothstep(0.5, 0.18, d);
            gl_FragColor = vec4(uColor, a * 0.75);
          }
        `,
        transparent: true,
        depthWrite: false,
      }),
    [theme.floor],
  );

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
      <circleGeometry args={[CONFIG.floor.radius, CONFIG.floor.segments]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
