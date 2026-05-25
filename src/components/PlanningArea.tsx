import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { AreaModel } from '../lib/geojson';
import type { ThreeTokens } from '../lib/theme';
import { CONFIG } from '../config';
import { Beam } from './Beam';

const EXTRUDE_DEPTH = CONFIG.extrude.depth;

interface Props {
  model: AreaModel;
  selected: boolean;
  showTag: boolean;
  showPillar: boolean;
  theme: ThreeTokens;
  reducedMotion: boolean;
  onClick: (m: AreaModel) => void;
  onHover: (name: string | null) => void;
}

export function PlanningArea({
  model,
  selected,
  showTag,
  showPillar,
  theme,
  reducedMotion,
  onClick,
  onHover,
}: Props) {
  // Build ONE ExtrudeGeometry per polygon (Polygon or MultiPolygon piece) so
  // that earcut failing on a single degenerate island (e.g. 4-vertex triangle
  // with collinear points) doesn't take down the whole multi-polygon feature.
  // For "WEST REGION" — 20 polygons including small islands — a single fragile
  // shape would otherwise erase the entire region.
  const { geometries, lineGeom } = useMemo(() => {
    if (model.polygons.length === 0) {
      return { geometries: [], lineGeom: null };
    }

    const geoms: THREE.ExtrudeGeometry[] = [];
    const linePoints: THREE.Vector3[] = [];

    for (const poly of model.polygons) {
      const shape = new THREE.Shape();
      poly.outer.forEach(([x, y], i) => {
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      });
      for (const hole of poly.holes) {
        const holePath = new THREE.Path();
        hole.forEach(([x, y], i) => {
          if (i === 0) holePath.moveTo(x, y);
          else holePath.lineTo(x, y);
        });
        shape.holes.push(holePath);
      }

      try {
        const g = new THREE.ExtrudeGeometry(shape, {
          depth: EXTRUDE_DEPTH,
          bevelEnabled: false,
          curveSegments: 4,
        });
        g.rotateX(-Math.PI / 2);
        geoms.push(g);
        poly.outer.forEach(([x, y]) => {
          linePoints.push(new THREE.Vector3(x, y, EXTRUDE_DEPTH + 0.015));
        });
      } catch (e) {
        // Skip this single polygon; siblings render normally.
        console.warn(`[${model.name}] dropped polygon (${poly.outer.length} pts):`, e);
      }
    }

    const lineG = new THREE.BufferGeometry().setFromPoints(linePoints);
    lineG.rotateX(-Math.PI / 2);

    return { geometries: geoms, lineGeom: lineG };
  }, [model]);

  if (geometries.length === 0 || !lineGeom) return null;

  const topColor = selected ? theme.areaTopSelected : theme.areaTop;
  const emissive = selected ? theme.areaEmissiveSelected : theme.areaEmissive;

  const cx = model.center[0];
  const cy = model.center[1];

  return (
    <group>
      {geometries.map((g, i) => (
        <mesh
          key={i}
          geometry={g}
          onClick={(e) => {
            e.stopPropagation();
            onClick(model);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
            onHover(model.name);
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default';
            onHover(null);
          }}
        >
          <meshPhongMaterial
            color={topColor}
            emissive={emissive}
            emissiveIntensity={selected ? 0.6 : 0}
            shininess={20}
            flatShading
          />
        </mesh>
      ))}

      <lineSegments geometry={lineGeom}>
        <lineBasicMaterial color={theme.areaLine} transparent opacity={theme.areaLineOpacity} />
      </lineSegments>

      {showPillar && (
        <Beam
          position={[cx, EXTRUDE_DEPTH, -cy]}
          value={model.metrics.value}
          index={Math.abs(model.name.charCodeAt(0))}
          theme={theme}
          reducedMotion={reducedMotion}
        />
      )}

      {showTag && (
        <Html
          position={[cx, EXTRUDE_DEPTH + CONFIG.tag.yOffset, -cy]}
          distanceFactor={CONFIG.tag.distanceFactor}
          pointerEvents="none"
          zIndexRange={[10, 0]}
        >
          <div className="map-tag">
            <span className="tag-name">{model.name}</span>
            <span className="tag-stem" />
            <span className="tag-dot" />
          </div>
        </Html>
      )}
    </group>
  );
}
