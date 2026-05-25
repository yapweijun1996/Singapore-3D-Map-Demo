import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { lazy, Suspense } from 'react';
import * as THREE from 'three';
import type { AreaModel } from '../lib/geojson';
import type { ThreeTokens } from '../lib/theme';
import type { TagMode, Toggles } from '../App';
import { CONFIG } from '../config';
import { Floor } from './Floor';
import { Particles } from './Particles';
import { RippleRings } from './RippleRings';
import { PlanningArea } from './PlanningArea';
import { CameraTarget } from './CameraTarget';

// Split @react-three/postprocessing into its own chunk (~80 KB gzip).
// Falls back to no postprocessing for a beat on first paint.
const Postprocessing = lazy(() => import('./Postprocessing'));

interface Props {
  models: AreaModel[];
  selected: string | null;
  hovered: string | null;
  tagMode: TagMode;
  toggles: Toggles;
  theme: ThreeTokens;
  reducedMotion: boolean;
  visible: boolean;
  lerpTarget: [number, number, number] | null;
  onSelect: (m: AreaModel) => void;
  onHover: (name: string | null) => void;
  onDeselect: () => void;
  onContextLost: () => void;
}

function showTagFor(tagMode: TagMode, selected: boolean, hovered: boolean): boolean {
  switch (tagMode) {
    case 'all':
      return true;
    case 'hover':
      return selected || hovered;
    case 'off':
      return false;
  }
}

export function MapScene({
  models,
  selected,
  hovered,
  tagMode,
  toggles,
  theme,
  reducedMotion,
  visible,
  lerpTarget,
  onSelect,
  onHover,
  onDeselect,
  onContextLost,
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
      /* Pause the render loop when the tab is hidden. r3f keeps the canvas alive but stops the rAF queue. */
      frameloop={visible ? 'always' : 'demand'}
      camera={{
        fov: CONFIG.camera.fov,
        near: CONFIG.camera.near,
        far: CONFIG.camera.far,
        position: [...CONFIG.camera.position],
      }}
      onPointerMissed={onDeselect}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        const onLost = (e: Event) => {
          e.preventDefault();
          onContextLost();
        };
        canvas.addEventListener('webglcontextlost', onLost);
      }}
    >
      <color attach="background" args={[theme.sceneBg]} />

      <ambientLight intensity={theme.ambientI} />
      <directionalLight color={theme.keyLight} intensity={theme.keyI} position={[40, 80, 30]} />
      <directionalLight color={theme.fillLight} intensity={theme.fillI} position={[-40, 30, -30]} />

      <Floor theme={theme} />
      <RippleRings visible={toggles.ripple} theme={theme} reducedMotion={reducedMotion} />
      <Particles visible={toggles.particles} theme={theme} reducedMotion={reducedMotion} />

      {models.map((m) => (
        <PlanningArea
          key={m.id}
          model={m}
          selected={selected === m.name}
          showTag={showTagFor(tagMode, selected === m.name, hovered === m.name)}
          showPillar={toggles.pillars}
          theme={theme}
          reducedMotion={reducedMotion}
          onClick={onSelect}
          onHover={onHover}
        />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={CONFIG.camera.dampingFactor}
        minDistance={CONFIG.camera.minDistance}
        maxDistance={CONFIG.camera.maxDistance}
        minPolarAngle={CONFIG.camera.minPolarAngle}
        maxPolarAngle={CONFIG.camera.maxPolarAngle}
      />

      <CameraTarget target={lerpTarget} />

      <Suspense fallback={null}>
        <Postprocessing theme={theme} />
      </Suspense>
    </Canvas>
  );
}
