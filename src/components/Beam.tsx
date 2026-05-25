import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { beamHeight } from '../lib/metrics';
import type { ThreeTokens } from '../lib/theme';
import { CONFIG } from '../config';

interface Props {
  position: [number, number, number];
  value: number;
  index: number;
  theme: ThreeTokens;
  reducedMotion: boolean;
}

export function Beam({ position, value, index, theme, reducedMotion }: Props) {
  const halo = useRef<THREE.Mesh>(null);
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);
  const h = beamHeight(value);
  const { radius, cylinderSegments, dotRadius, haloRadius, pulseFreq, phaseSpread } = CONFIG.beam;

  useFrame((state) => {
    if (reducedMotion || !halo.current || !haloMat.current) return;
    const t = state.clock.elapsedTime;
    const wave = 0.5 + 0.5 * Math.sin(t * pulseFreq + index * phaseSpread);
    halo.current.scale.setScalar(1 + 0.35 * (wave * 2 - 1));
    haloMat.current.opacity = theme.beamHaloOpacity * (0.6 + 0.4 * wave);
  });

  return (
    <group position={position} name="pillar">
      <mesh position-y={h / 2}>
        <cylinderGeometry args={[radius, radius, h, cylinderSegments]} />
        <meshBasicMaterial
          color={theme.beamCore}
          transparent
          opacity={theme.beamCoreOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position-y={h}>
        <sphereGeometry args={[dotRadius, 12, 12]} />
        <meshBasicMaterial color={theme.beamCore} transparent opacity={0.95} />
      </mesh>
      <mesh ref={halo} position-y={h}>
        <sphereGeometry args={[haloRadius, 16, 16]} />
        <meshBasicMaterial
          ref={haloMat}
          color={theme.beamHalo}
          transparent
          opacity={theme.beamHaloOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
