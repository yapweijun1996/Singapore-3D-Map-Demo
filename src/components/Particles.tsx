import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ThreeTokens } from '../lib/theme';

const COUNT = 250;

interface Props {
  visible: boolean;
  theme: ThreeTokens;
}

export function Particles({ visible, theme }: Props) {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, velocities } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const r = 30 + Math.random() * 80;
      const a = Math.random() * Math.PI * 2;
      positions[i * 3 + 0] = Math.cos(a) * r;
      positions[i * 3 + 1] = 10 + Math.random() * 40;
      positions[i * 3 + 2] = Math.sin(a) * r;
      vel[i] = 0.05 + Math.random() * 0.1;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geometry: geom, velocities: vel };
  }, []);

  useFrame((_, dt) => {
    if (!visible || !pointsRef.current) return;
    const attr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 2] += velocities[i] * dt * 8;
      if (arr[i * 3 + 2] > 110) arr[i * 3 + 2] = -110;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} visible={visible}>
      <pointsMaterial
        size={0.5}
        color={theme.particle}
        transparent
        opacity={theme.particleOpacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
