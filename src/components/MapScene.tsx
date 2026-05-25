import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { AreaModel } from '../lib/geojson';
import type { ThreeTokens } from '../lib/theme';
import { Floor } from './Floor';
import { Particles } from './Particles';
import { RippleRings } from './RippleRings';
import { PlanningArea } from './PlanningArea';

interface Toggles {
  pillars: boolean;
  tags: boolean;
  ripple: boolean;
  particles: boolean;
}

interface Props {
  models: AreaModel[];
  selected: string | null;
  toggles: Toggles;
  theme: ThreeTokens;
  onSelect: (m: AreaModel) => void;
  onDeselect: () => void;
}

export function MapScene({
  models,
  selected,
  toggles,
  theme,
  onSelect,
  onDeselect,
}: Props) {
  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      dpr={[1, 2]}
      camera={{ fov: 38, near: 0.1, far: 2000, position: [0, 105, 135] }}
      onPointerMissed={onDeselect}
    >
      <color attach="background" args={[theme.sceneBg]} />

      <ambientLight intensity={theme.ambientI} />
      <directionalLight color={theme.keyLight} intensity={theme.keyI} position={[40, 80, 30]} />
      <directionalLight color={theme.fillLight} intensity={theme.fillI} position={[-40, 30, -30]} />

      <Floor theme={theme} />
      <RippleRings visible={toggles.ripple} theme={theme} />
      <Particles visible={toggles.particles} theme={theme} />

      {models.map((m) => (
        <PlanningArea
          key={m.id}
          model={m}
          selected={selected === m.name}
          showTag={toggles.tags}
          showPillar={toggles.pillars}
          theme={theme}
          onClick={onSelect}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={40}
        maxDistance={260}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.05}
      />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={theme.bloomIntensity}
          luminanceThreshold={theme.bloomThreshold}
          luminanceSmoothing={theme.bloomSmoothing}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
