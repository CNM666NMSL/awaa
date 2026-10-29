# Resource loading and edge-rendering repair

The practice camera previously translated/scaled a background painted only within the original world rectangle. Frames were never cleared at the identity transform, so exposed screen edges retained old pixels and accumulated striped texture trails. This was especially visible near map boundaries and during camera zoom changes.

The renderer now resets the transform, clears the complete physical canvas and paints an opaque base each frame. Background cover uses the union of the arena and visible world rectangle, with padding for shake. The practice camera's horizontal pan is bounded when zoomed in and centered when zoomed out. Procedural backgrounds and floors also cover exposed regions. Rain effects are already projected into screen coordinates, so they are composited at the identity transform instead of receiving the camera transform twice.

`js/resource-loader.js` manages versioned critical images by normalized URL. Character portraits, frame aliases, wolf companion images and stage images share decoded Image objects. The fullscreen loading curtain has an animated seal, real resource counts, a percentage and retry for failed images. Gameplay is inert during loading; simulation and automatic practice entry wait for readiness. Readiness requires all registered images to finish decoding and the page's modules to finish loading. Completion resets the loop accumulator and compensates battle/intro timing. Failed-image retries retain all sprite alias callbacks. Optional future story videos are not part of the battle-image preload.

Relevant files: `loading.css`, the loading markup in `index.html`, and loader integration in `fighter.js`, `game.js`, `noble-practice.js` and `cyber-combat.js`.

`tools/test-loading-render.cjs` holds a real image request to verify the curtain, progress and simulation gate; injects a missing image and verifies retry plus all aliases; compares raw canvas pixels after different sentinel-colored previous frames at left/right map edges, wide separation and an aerial zoom-out; checks full opacity and the rain overlay transform. Screenshots are saved in `assets/loading-preview.png` and `assets/render-edge-fixed.png`.

Regression checks cover the previous continuous idle / planted feet, ordinary and charged U cooldowns, exit-to-main flow, mobility, new roster mechanics and stage selection. These checks substantiate the known fixes; they do not claim that arbitrary undiscovered bugs are impossible.
