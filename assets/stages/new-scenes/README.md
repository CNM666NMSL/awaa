# Four additional battle stages

- `astral.webp` — 星辉王城, Western magical citadel.
- `arcane.webp` — 秘法回廊, Western arcane academy courtyard.
- `neoncity.webp` — 霓雨旧城, Chinese urban night street; uses the existing rain renderer.
- `lanterncity.webp` — 灯河夜市, Chinese riverside city plaza at dusk.

Generated with the built-in image_gen tool using the existing industrial-rain stage as an art-style reference. `prompts.json` contains the exact prompts; `generation-jobs.json` records the selected original generation outputs. Full-quality PNGs are preserved in `sources/`. Run `tools/import-new-stages.cjs` to recreate 1600×720 WebP game backgrounds from those saved PNGs.

Select a scene in local/CPU or practice character selection. The shared picker supports Western magic, Chinese urban, classic and all filters, a selected-scene preview, keyboard focus and mobile widths. Local and practice choices share a remembered selection in localStorage, with an in-memory fallback if storage is unavailable. LAN hosts select through the same picker; guests receive the existing options message and cannot change the scene. Scene choice does not alter fighter movement or stage geometry.

Browser validation: `tools/test-stage-select.cjs` checks all four practice backgrounds actually load, style filtering, selected state, persistence on reload, local and CPU launch, host option messages, disabled guest choices, 390px layout, and absence of JavaScript/HTTP errors. The LAN message test uses an in-page stub transport; it does not test a live connection between devices.
