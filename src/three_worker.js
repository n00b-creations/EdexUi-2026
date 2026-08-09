// three_worker.js
// Worker that attempts to import three.js and render a simple rotating globe into an OffscreenCanvas.
self.onmessage = function (ev) {
  const data = ev.data || {};
  if (data.type === 'init') {
    initWorker(data.canvas, data.width, data.height);
  } else if (data.type === 'resize') {
    if (self.renderer && typeof self.resize === 'function') self.resize(data.width, data.height);
  }
};

async function initWorker(canvas, width, height) {
  try {
    // Try to import three from the local node_modules relative path
    // Note: importScripts may fail depending on environment; catch and fallback
    try { importScripts('node_modules/three/build/three.min.js'); } catch(e) {
      try { importScripts('/node_modules/three/build/three.min.js'); } catch(e2) { console.warn('three_worker: importScripts failed', e, e2); }
    }

    if (typeof THREE === 'undefined') {
      console.warn('three_worker: THREE not available in worker. Worker cannot render.');
      return;
    }

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(width || 300, height || 150);
    self.renderer = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, (width||300)/(height||150), 0.1, 1000);
    camera.position.set(0, 0, 4);

    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0x2a8bd6, metalness: 0.1, roughness: 0.8 });
    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 3, 5);
    scene.add(dir);

    let running = true;
    function tick() {
      if (!running) return;
      globe.rotation.y += 0.003;
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();

    self.resize = function (w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    self.onmessage = function (ev) {
      if (ev.data && ev.data.type === 'shutdown') running = false;
    };

  } catch (e) {
    console.warn('three_worker init failed', e);
  }
}
