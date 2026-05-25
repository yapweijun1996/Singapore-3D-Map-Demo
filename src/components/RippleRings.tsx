import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ThreeTokens } from '../lib/theme';
import { CONFIG } from '../config';

interface Props {
  visible: boolean;
  theme: ThreeTokens;
  reducedMotion: boolean;
}

export function RippleRings({ visible, theme, reducedMotion }: Props) {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<THREE.Mesh[]>([]);
  const { count, baseRadius, thickness, speed, maxScale, segments } = CONFIG.ripple;

  useFrame((state) => {
    if (reducedMotion || !visible || !group.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < meshes.current.length; i++) {
      const m = meshes.current[i];
      const phase = (t * speed + i / count) % 1;
      const scale = 1 + phase * (maxScale - 1);
      m.scale.set(scale, scale, 1);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = theme.rippleOpacity * (1 - phase);
    }
  });

  return (
    <group ref={group} rotation-x={-Math.PI / 2} visible={visible}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) meshes.current[i] = el;
          }}
        >
          <ringGeometry args={[baseRadius, baseRadius + thickness, segments]} />
          <meshBasicMaterial
            color={theme.ripple}
            side={THREE.DoubleSide}
            transparent
            opacity={theme.rippleOpacity}
          />
        </mesh>
      ))}
    </group>
  );
}
