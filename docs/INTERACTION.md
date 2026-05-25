# Interaction

## Camera

`OrbitControls` instance, tuned with:

- `enableDamping = true`
- Pitch/zoom clamped (see `sample.html:315–323`)

## Picking

A single `THREE.Raycaster` + `THREE.Vector2` is reused. On every `mousemove` and `click`:

1. `mouse.x / mouse.y` are computed in NDC from the canvas bounding rect.
2. `raycaster.setFromCamera(mouse, camera)`.
3. Intersect against **all extruded top meshes** collected from `modelByName` (one mesh per area, not the whole scene).
4. Walk up `hit.object.parent` chain until a node with `userData.metrics` is found — that's the _model_ (area-level container).

### Hover

`mousemove` only changes the cursor (`pointer` vs `default`). It does **not** highlight.

### Click

```
click ─▶ pick(e)
         ├── model found      → highlightModel(model) → showCard(model)
         └── nothing hit      → no-op
```

`#card .card_close` and `Escape` would both ideally close the card. Today only the close icon does (`sample.html:659`).

## Highlight

`highlightModel(model)` mutates the area's _own_ `topMat`:

```js
mat.userData.origColor = mat.color.getHex();
mat.userData.origEmissive = mat.emissive.getHex();
mat.emissive.set(0xffffff);
// (color tweak applied here)
```

`clearHighlight()` restores the saved hex values. Because `topMat` is unique per area (see `createTopMaterial()`), this never bleeds into another area.

## Toggles

The four pill buttons in `.controls` are wired by `data-value`:

```js
const toggles = { pillars: true, tags: true, ripple: true, particles: true };
```

`applyToggles()` walks the scene once and flips visibility:

| Toggle      | Affects                                                              |
| ----------- | -------------------------------------------------------------------- |
| `pillars`   | Any object with `name === 'pillar'` (beam groups)                    |
| `tags`      | CSS2DObjects — toggles `.visible` CSS class on the `.mapTag` element |
| `ripple`    | `rippleGroup.visible`                                                |
| `particles` | `particles.visible`                                                  |

Each click also toggles the button's `.active` class so the indicator dot lights.

## Resize

See [RENDERING.md → Resize](RENDERING.md#resize).

## Keyboard

Currently none. `Escape` to close the card and arrow-key area cycling are obvious gaps — see [task.md §4](../task.md).
