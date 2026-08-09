(function (global) {
  // threeGlobe.class.js
  // Renders a simple 3D globe. If OffscreenCanvas is supported and enabled via settings,
  // it will try to render via a worker using three_worker.js. Otherwise it renders on the main thread.
  function ThreeGlobeWidget(container) {
    if (!container) throw new Error('container required');
    this.container = container;
    this.width = container.clientWidth || 400;
    this.height = container.clientHeight || 200;
    this._useWorker = false;
    this._worker = null;
    this._offscreenCanvas = null;

    // Configuration: allow runtime toggle via window.settings.enableOffscreenThree
    this._tryWorker = (window.settings && window.settings.enableOffscreenThree) || false;

    if (this._tryWorker && typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this._setupWorker();
        this._useWorker = true;
        return;
      } catch (e) {
        console.warn('ThreeGlobe: Offscreen worker setup failed, falling back to main thread', e);
        this._useWorker = false;
      }
    }

    // Fallback to main-thread renderer
    this._initMain();
  }

  ThreeGlobeWidget.prototype._setupWorker = function () {
    // create an offscreen canvas and transfer it to the worker
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    this.container.appendChild(canvas);

    const off = canvas.transferControlToOffscreen();
    this._offscreenCanvas = off;

    // worker script path - assume src/three_worker.js relative to UI
    const worker = new Worker('three_worker.js');
    this._worker = worker;
    worker.postMessage({ type: 'init', canvas: off, width: this.width, height: this.height }, [off]);

    // Handle commands from worker if needed
    worker.onmessage = (ev) => {
      // future: handle hover info, labels, etc.
      // console.log('three worker:', ev.data);
    };

    // Handle resize
    this._onResize = () => {
      const w = this.container.clientWidth || 400;
      const h = this.container.clientHeight || 200;
      try { this._worker.postMessage({ type: 'resize', width: w, height: h }); } catch(e){}
    };
    window.addEventListener('resize', this._onResize);
  };

  ThreeGlobeWidget.prototype._initMain = function () {
    // main-thread three.js scene
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(this.width, this.height);
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 4);

    // Globe
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0x2a8bd6, metalness: 0.1, roughness: 0.8 });
    this.globe = new THREE.Mesh(geometry, material);
    this.scene.add(this.globe);

    // Atmosphere (simple slightly larger transparent sphere)
    const atmGeo = new THREE.SphereGeometry(1.02, 32, 32);
    const atmMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending });
    this.atmos = new THREE.Mesh(atmGeo, atmMat);
    this.scene.add(this.atmos);

    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 3, 5);
    this.scene.add(dir);

    this._raf = null;
    this._running = true;
    this._pointer = { x: 0, y: 0 };
    this._onPointer = (ev) => {
      const rect = this.container.getBoundingClientRect();
      this._pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      this._pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };
    this.container.addEventListener('pointermove', this._onPointer);

    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);

    this._onResize = () => {
      const w = this.container.clientWidth || 400;
      const h = this.container.clientHeight || 200;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', this._onResize);
  };

  ThreeGlobeWidget.prototype._tick = function () {
    if (!this._running) return;
    // rotate globe slowly and add subtle pointer influence
    this.globe.rotation.y += 0.002 + (this._pointer.x * 0.001);
    this.globe.rotation.x += (this._pointer.y * 0.0008);
    this.atmos.rotation.y = this.globe.rotation.y * 0.98;
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this._tick);
  };

  ThreeGlobeWidget.prototype.resize = function () {
    if (this._useWorker && this._worker) {
      try { this._worker.postMessage({ type: 'resize', width: this.container.clientWidth, height: this.container.clientHeight }); } catch(e){}
      return;
    }
    const w = this.container.clientWidth || 400;
    const h = this.container.clientHeight || 200;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  ThreeGlobeWidget.prototype.destroy = function () {
    if (this._useWorker && this._worker) {
      try { this._worker.terminate(); } catch(e){}
      window.removeEventListener('resize', this._onResize);
      this._worker = null;
      return;
    }

    this._running = false;
    cancelAnimationFrame(this._raf);
    this.container.removeEventListener('pointermove', this._onPointer);
    window.removeEventListener('resize', this._onResize);
    if (this.scene) {
      this.scene.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose && obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose && m.dispose());
          else obj.material.dispose && obj.material.dispose();
        }
      });
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  };

  global.createThreeGlobeWidget = function (containerId) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error('No element with id ' + containerId);
    return new ThreeGlobeWidget(el);
  };

})(window);
