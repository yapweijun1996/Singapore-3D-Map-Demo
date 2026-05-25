import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ThreeTokens } from '../lib/theme';
import { CONFIG } from '../config';

interface Props {
  visible: boolean;
  theme: ThreeTokens;
  reducedMotion: boolean;
}

// Module-scope seeding. react-hooks/purity (v7+) bans Math.random() during
// render; particle layout is fixed for the session anyway, so we initialise
// once at module load.
const PARTICLE_SEED = (() => {
  const { count, rMin, rMax, yMin, yMax, vMin, vMax } = CONFIG.particles;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = rMin + Math.random() * (rMax - rMin);
    const a = Math.random() * Math.PI * 2;
    positions[i * 3 + 0] = Math.cos(a) * r;
    positions[i * 3 + 1] = yMin + Math.random() * (yMax - yMin);
    positions[i * 3 + 2] = Math.sin(a) * r;
    velocities[i] = vMin + Math.random() * (vMax - vMin);
  }
  return { positions, velocities };
})();

export function Particles({ visible, theme, reducedMotion }: Props) {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, velocities } = useMemo(() => {
    // Copy positions so each instance can mutate independently; velocities
    // are read-only after init so they can share.
    const positions = new Float32Array(PARTICLE_SEED.positions);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geometry: geom, velocities: PARTICLE_SEED.velocities };
  }, []);

  useFrame((_, dt) => {
    if (reducedMotion || !visible || !pointsRef.current) return;
    const attr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const { count, wrap } = CONFIG.particles;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 2] += velocities[i] * dt * 8;
      if (arr[i * 3 + 2] > wrap) arr[i * 3 + 2] = -wrap;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} visible={visible}>
      <pointsMaterial
        size={CONFIG.particles.size}
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
