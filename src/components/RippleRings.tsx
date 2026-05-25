import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ThreeTokens } from '../lib/theme';

const COUNT = 3;
const BASE_RADIUS = 20;
const SPEED = 0.18;

interface Props {
  visible: boolean;
  theme: ThreeTokens;
}

export function RippleRings({ visible, theme }: Props) {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    if (!visible || !group.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < meshes.current.length; i++) {
      const m = meshes.current[i];
      const phase = (t * SPEED + i / COUNT) % 1;
      const scale = 1 + phase * 5;
      m.scale.set(scale, scale, 1);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = theme.rippleOpacity * (1 - phase);
    }
  });

  return (
    <group ref={group} rotation-x={-Math.PI / 2} visible={visible}>
      {Array.from({ length: COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) meshes.current[i] = el;
          }}
        >
          <ringGeometry args={[BASE_RADIUS, BASE_RADIUS + 0.12, 96]} />
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
