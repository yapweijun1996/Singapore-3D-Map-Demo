# Rendering

## Pipeline

```
scene ──▶ EffectComposer
            ├── RenderPass (scene, camera)
            ├── UnrealBloomPass (strength 0.35, radius 0.5, threshold 0.85)
            └── OutputPass         ──▶ canvas
CSS2DRenderer (labels) ───────────────▶ DOM overlay (#threejs)
```

The 3D layer composes through bloom for the glow on beams/halos. The CSS2D layer (`.mapTag`) renders on top of the canvas in HTML so labels stay sharp at any zoom.

## Scene graph

```
scene
├── AmbientLight (0xffffff, 0.45)
├── DirectionalLight key  (0xeef4ff, 0.65)
├── DirectionalLight fill (0x6688aa, 0.25)
├── floor                  (Circle 280r, custom shader, opacity 0.7)
├── particles              (Points × 250, additive blending)
├── rippleGroup
│   └── 3 × Ring meshes    (animated scale + opacity, phases 0/⅓/⅔)
└── mapGroup
    └── per-area model     × 55
        ├── Mesh           (ExtrudeGeometry, [topMat, sideMaterial])
        ├── Line           (top edge outline)
        ├── CSS2DObject    (.mapTag)
        └── beam group     (cylinder + dot + halo, additive)
```

`mapGroup` is re-centered on its own bounding box (`centerMap()`) so the camera always frames the country regardless of projection origin.

## Materials

| Mesh                 | Material                                                        |
| -------------------- | --------------------------------------------------------------- |
| Side walls (extrude) | `ShaderMaterial` — vertical gradient `uColorBottom → uColorTop` |
| Top face             | `MeshPhongMaterial` (one per area, so highlight can mutate it)  |
| Edge line            | `LineBasicMaterial`                                             |
| Floor                | `ShaderMaterial` — radial fade                                  |
| Beam cylinder        | `ShaderMaterial` — vertical fade, additive blending             |
| Beam dot             | `MeshBasicMaterial` (top of beam)                               |
| Beam halo            | `MeshBasicMaterial` — additive, animated opacity                |
| Particles            | `PointsMaterial` — additive, no depthWrite                      |
| Ripple rings         | `MeshBasicMaterial` — double-sided, transparent                 |

> A separate `topMat` is created per area (`createTopMaterial()`) specifically so the hover/click highlight can mutate that one area's emissive color without affecting the others. Side material is shared across all 55.

## Animation loop

`animate()` runs each frame:

| Subject     | Update                                                                            |
| ----------- | --------------------------------------------------------------------------------- |
| Ripples     | Each ring's `phase = ((t*0.18 + ring.userData.phase) % 1)`; scale = `1 + phase*5` |
| Particles   | Drift on Z, wrap when out of range                                                |
| Beam halos  | Scale + opacity pulse using `sin(t * 1.3 + i * 0.27)`                             |
| Shader time | `mapUf.uTime.value = t` (currently unused by shaders, plumbed for future)         |
| Render      | `composer.render()` then `css2DRenderer.render(scene, camera)`                    |

The loop runs unconditionally — no `document.visibilityState` pause, no FPS cap.

## Resize

```js
window.addEventListener('resize', () => {
  W = window.innerWidth;
  H = window.innerHeight;
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
  css2DRenderer.setSize(W, H);
  composer.setSize(W, H);
  bloomPass.setSize(W, H);
});
```

No debounce — fires every resize event. Cheap enough at this scene complexity.

## Intro animation

`introAnim()` (`sample.html:816`) interpolates the camera from a high oblique position `(-20, 200, 200)` down to the final orbit position `(0, 105, 135)` over 2.4 s using a quintic ease-out, called 600 ms after the page loads (lets the hero title fade in first).
