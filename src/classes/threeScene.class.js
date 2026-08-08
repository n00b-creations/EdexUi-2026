(function (global) {
  // ProcessBarsWidget: uses three.js to render top processes as 3D bars.
  // It polls window.si.processes() when available; otherwise runs a demo animation.
  function ProcessBarsWidget(container) {
    if (!container) throw new Error('container required');
    this.container = container;
    this.width = container.clientWidth || 400;
    this.height = container.clientHeight || 200;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 6, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);

    // ground plane
    const groundGeo = new THREE.PlaneGeometry(20, 10);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x000000, opacity: 0, transparent: true });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);

    this.bars = [];
    this.maxBars = 8;
    this._createBars();

    this.pointer = new THREE.Vector2();
    this.container.addEventListener('pointermove', this._onPointerMove.bind(this));

    this._running = true;
    this._tick = this._tick.bind(this);
    this._lastUpdate = 0;
    this._pollInterval = 2000;
    requestAnimationFrame(this._tick);
  }

  ProcessBarsWidget.prototype._createBars = function () {
    const spacing = 1.2;
    for (let i = 0; i < this.maxBars; i++) {
      const geo = new THREE.BoxGeometry(0.8, 0.1, 0.8);
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(i / this.maxBars, 0.6, 0.5) });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((i - (this.maxBars - 1) / 2) * spacing, 0.05, 0);
      this.scene.add(mesh);
      this.bars.push({ mesh, height: 0.1, target: 0.1, label: '' });
    }
  };

  ProcessBarsWidget.prototype._onPointerMove = function (ev) {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  };

  ProcessBarsWidget.prototype._tick = async function (t) {
    if (!this._running) return;

    // Poll processes periodically
    if (!this._siUnavailable && (t - this._lastUpdate) > this._pollInterval) {
      this._lastUpdate = t;
      try {
        if (window.si && typeof window.si.processes === 'function') {
          const res = await window.si.processes();
          // systeminformation returns object { list: [...] } in some versions
          const list = Array.isArray(res) ? res : (res && res.list) ? res.list : [];
          const top = list
            .filter(p => typeof p.pcpu === 'number')
            .sort((a, b) => b.pcpu - a.pcpu)
            .slice(0, this.maxBars);

          for (let i = 0; i < this.maxBars; i++) {
            const proc = top[i];
            const pct = proc ? Math.max(0.001, Math.min(1, proc.pcpu / 100)) : 0.001;
            const target = 0.1 + pct * 6.0; // height
            this.bars[i].target = target;
            this.bars[i].label = proc ? `${proc.name} (${Math.round(proc.pcpu)}%)` : '';
            this.bars[i].mesh.material.color.setHSL((proc ? i / this.maxBars : 0.1), 0.6, 0.5);
          }
        } else {
          // si not ready yet
          this._siUnavailable = true; // prevent repeated checks for a moment
          setTimeout(() => { this._siUnavailable = false; }, 5000);
        }
      } catch (e) {
        console.warn('ProcessBarsWidget: failed to poll si.processes()', e);
        this._siUnavailable = true;
      }
    }

    // smooth animation towards target heights
    this.bars.forEach((b, idx) => {
      b.height += (b.target - b.height) * 0.08;
      b.mesh.scale.y = Math.max(0.01, b.height);
      b.mesh.position.y = b.height / 2;
      // subtle rotation interaction
      b.mesh.rotation.y += (this.pointer.x * 0.005) + 0.002 * (idx % 2 === 0 ? 1 : -1);
    });

    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this._tick);
  };

  ProcessBarsWidget.prototype.resize = function () {
    const w = this.container.clientWidth || 400;
    const h = this.container.clientHeight || 200;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  ProcessBarsWidget.prototype.destroy = function () {
    this._running = false;
    cancelAnimationFrame(this._raf);
    this.container.removeEventListener('pointermove', this._onPointerMove);
    this.scene.traverse(function (obj) {
      if (obj.geometry) obj.geometry.dispose && obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose && m.dispose());
        else obj.material.dispose && obj.material.dispose();
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  };

  global.createThreeWidget = function (containerId) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error('No element with id ' + containerId);
    return new ProcessBarsWidget(el);
  };

})(window);
