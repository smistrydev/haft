# Haft

Parametric 3D handle workshop. Design a replacement grip for a hairbrush, tool, or utensil, preview it, then export an STL for Bambu Studio, OrcaSlicer, or PrusaSlicer.

Units are millimetres. Every handle can have a round mounting hole in the bottom (socket), a pin (tenon), or a closed end.

## Run locally

Needs Node 22+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (port 8080).

```bash
npm run build
```

## Use it

- Pick a preset (paddle brush, swirl, hook, driver, …) or drag the sliders.
- Measure the remaining stem on your broken tool and set **round hole** diameter + depth with a little clearance.
- A slight print-flat is already cut on the bed side for adhesion.
- **Download STL** — binary, print-ready, Z-up, length along X. Drop into Bambu Studio at 100% scale (1 unit = 1 mm).
- **OBJ** is also available.

## Layout

| Path | What |
| --- | --- |
| `src/lib/handle/geometry.ts` | Parametric mesh (centerline, radius, texture, socket bore) |
| `src/lib/handle/export.ts` | Binary STL / OBJ, print-bed transform |
| `src/lib/handle/presets.ts` | Starting shapes |
| `src/components/viewport.tsx` | Live 3D preview |
| `src/components/control-panel.tsx` | Shape, texture, mounting hole |
| `src/store/handle.ts` | Saved designs (local) |

## Print notes

- PETG or PLA both work; PETG is tougher for a daily hairbrush.
- Orient as exported (flat on the bed). Supports usually not needed if print-flat is on.
- After printing, test-fit the stem. If tight, add 0.1–0.2 mm clearance and reprint.
