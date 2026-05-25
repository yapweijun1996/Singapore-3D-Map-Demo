import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface Props {
  /** Target point in scene-space, or null when no animation is desired. */
  target: [number, number, number] | null;
}

/**
 * Smoothly lerps `OrbitControls.target` toward the given point each frame.
 * Lives inside `<Canvas>` so it can read controls via `useThree`. Needs
 * `<OrbitControls makeDefault />` upstream so r3f exposes the instance.
 *
 * Cheap: when the target is null OR the controls' target is already within
 * epsilon of the destination, the loop body short-circuits.
 */
export function CameraTarget({ target }: Props) {
  const controls = useThree((s) => s.controls) as
    | (THREE.EventDispatcher & { target: THREE.Vector3; update: () => void })
    | null;
  const tmp = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!target || !controls) return;
    tmp.current.set(target[0], target[1], target[2]);
    if (controls.target.distanceToSquared(tmp.current) < 1e-3) return;
    controls.target.lerp(tmp.current, 0.08);
    controls.update();
  });

  return null;
}
