(function (global) {
  // Minimal three.js widget for EdexUi-2026
  // Exposes createThreeWidget(containerId) that returns an instance with destroy() and resize()
  function ThreeWidget(container) {
    if (!container) throw new Error('container required');
    this.container = container;
    this.width = container.clientWidth || 400;
    this.height = container.clientHeight || 300;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(this.width, this.height);
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    // Scene + Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 4);

    // Simple scene content
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3399ff, metalness: 0.2, roughness: 0.6 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.mesh);

    // Light
    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 5, 5);
    this.scene.add(dir);

    // Interaction
    this.pointer = new THREE.Vector2();
    this.onPointerMove = this.onPointerMove.bind(this);
    container.addEventListener('pointermove', this.onPointerMove);

    // Resize handling
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    // Animation loop
    this._running = true;
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  ThreeWidget.prototype.onPointerMove = function (ev) {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  };

  ThreeWidget.prototype._tick = function (t) {
    if (!this._running) return;
    // simple animation tied to pointer
    this.mesh.rotation.x += 0.01 + (this.pointer.y * 0.02);
    this.mesh.rotation.y += 0.01 + (this.pointer.x * 0.02);
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this._tick);
  };

  ThreeWidget.prototype.resize = function () {
    const w = this.container.clientWidth || 400;
    const h = this.container.clientHeight || 300;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  ThreeWidget.prototype.onResize = function () {
    this.resize();
  };

  ThreeWidget.prototype.destroy = function () {
    this._running = false;
    cancelAnimationFrame(this._raf);
    this.container.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('resize', this.onResize);
    // dispose hierarchy
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

  // Global helper
  global.createThreeWidget = function (containerId) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error('No element with id ' + containerId);
    return new ThreeWidget(el);
  };

})(window);
