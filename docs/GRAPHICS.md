# Graphics & Themes — Additional Notes

I added a small theme demo and a worker bootstrap that tries multiple locations for three.min.js to improve reliability. You can tune or replace the current placeholder textures with higher-quality HDR/equirectangular maps for each theme.

Worker notes
- three_worker_bundle.js will attempt to import three from several candidate paths then load three_worker.js. If your Electron packaging serves files from different locations, copy `node_modules/three/build/three.min.js` into `src/` or update the candidates list.

Visual demo
- Press the "Run Cinematic Demo" button (top-right) to see a short sequence. Use the Theme selector to switch themes at runtime.
