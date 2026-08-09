### Visual Enhancements

This commit adds a suite of visual enhancements to EdexUi-2026:

- Post-processing stack (bloom, film grain, chromatic aberration)
- Audio-reactive particle background
- Process city skyline (instanced meshes driven by system processes)
- Network arcs renderer
- Sequencer for coordinated intro animations
- Raymarch fullscreen background shader

Files added:
- src/classes/postprocess.class.js
- src/classes/particles.class.js
- src/classes/processCity.class.js
- src/classes/networkArcs.class.js
- src/classes/sequencer.class.js
- src/classes/raymarch.class.js
- src/three_worker.js (worker for offscreen globe rendering)
- assets/css/visuals.css

See docs/GRAPHICS.md for notes and configuration.
