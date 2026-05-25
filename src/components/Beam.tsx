import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { beamHeight } from '../lib/metrics';
import type { ThreeTokens } from '../lib/theme';

interface Props {
  position: [number, number, number];
  value: number;
  index: number;
  theme: ThreeTokens;
}

export function Beam({ position, value, index, theme }: Props) {
  const halo = useRef<THREE.Mesh>(null);
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);
  const h = beamHeight(value);

  useFrame((state) => {
    if (!halo.current || !haloMat.current) return;
    const t = state.clock.elapsedTime;
    const s = 1 + 0.35 * Math.sin(t * 1.3 + index * 0.27);
    halo.current.scale.set(s, s, s);
    haloMat.current.opacity =
      theme.beamHaloOpacity * (0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.3 + index * 0.27)));
  });

  return (
    <group position={position} name="pillar">
      <mesh position-y={h / 2}>
        <cylinderGeometry args={[0.04, 0.04, h, 6]} />
        <meshBasicMaterial
          color={theme.beamCore}
          transparent
          opacity={theme.beamCoreOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position-y={h}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial color={theme.beamCore} transparent opacity={0.95} />
      </mesh>
      <mesh ref={halo} position-y={h}>
        <sphereGeometry args={[0.55, 16, 16]} />
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
