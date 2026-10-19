(function (global) {
  // A compact, data-driven view of the busiest processes. The widget deliberately
  // keeps one geometry per process because the small number of bars makes picking
  // and keyboard interaction considerably more useful than an instanced-only view.
  function ProcessBarsWidget(container, options) {
    if (!container) throw new Error("container required");

    this.container = container;
    this.options = options || {};
    this.maxBars = this.options.maxBars || 8;
    this.quality = "balanced";
    this.bars = [];
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.selectedIndex = -1;
    this._running = true;
    this._paused = false;
    this._lastUpdate = 0;
    this._lastFrame = 0;
    this._slowFrames = 0;
    this._refreshing = false;
    this._pollInterval = 2000;
    this._resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => this.resize()) : null;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    this.camera.position.set(0, 6, 12);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.domElement.className = "three-widget-canvas";
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute("role", "application");
    this.renderer.domElement.setAttribute("aria-label", "Interactive top processes visualization");
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 7);
    this.scene.add(directional);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 10),
      new THREE.MeshStandardMaterial({ color: 0x000000, opacity: 0, transparent: true })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);

    this._createBars();
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._tick = this._tick.bind(this);
    this.container.addEventListener("pointermove", this._onPointerMove);
    this.container.addEventListener("pointerleave", this._onPointerLeave);
    this.container.addEventListener("click", this._onClick);
    this.renderer.domElement.addEventListener("keydown", this._onKeyDown);
    if (this._resizeObserver) this._resizeObserver.observe(this.container);
    else window.addEventListener("resize", this.resize.bind(this));
    this.setQuality(this.options.quality || "balanced");
    this.resize();
    requestAnimationFrame(this._tick);
  }

  ProcessBarsWidget.prototype._createBars = function () {
    const spacing = 1.2;
    for (let index = 0; index < this.maxBars; index++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.1, 0.8),
        new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(index / this.maxBars, 0.6, 0.5) })
      );
      mesh.position.set((index - (this.maxBars - 1) / 2) * spacing, 0.05, 0);
      mesh.userData.index = index;
      this.scene.add(mesh);
      this.bars.push({ mesh, height: 0.1, target: 0.1, process: null });
    }
  };

  ProcessBarsWidget.prototype._onPointerMove = function (event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this._updateSelection(false);
  };

  ProcessBarsWidget.prototype._onPointerLeave = function () {
    this._select(-1, false);
  };

  ProcessBarsWidget.prototype._onClick = function () {
    this._updateSelection(true);
  };

  ProcessBarsWidget.prototype._onKeyDown = function (event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const next = Math.max(0, Math.min(this.maxBars - 1, (this.selectedIndex < 0 ? 0 : this.selectedIndex) + direction));
      this._select(next, false);
    } else if (this.selectedIndex >= 0) {
      this._select(this.selectedIndex, true);
    }
  };

  ProcessBarsWidget.prototype._updateSelection = function (activate) {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.bars.map(bar => bar.mesh), false)[0];
    this._select(hit ? hit.object.userData.index : -1, activate);
  };

  ProcessBarsWidget.prototype._select = function (index, activate) {
    if (index === this.selectedIndex && !activate) return;
    this.selectedIndex = index;
    this.bars.forEach((bar, barIndex) => {
      bar.mesh.material.emissive.setHex(barIndex === index ? 0x2d8cff : 0x000000);
      bar.mesh.material.emissiveIntensity = barIndex === index ? 0.75 : 0;
    });
    const process = index >= 0 ? this.bars[index].process : null;
    if (typeof this.options.onSelection === "function") this.options.onSelection(process, activate);
  };

  ProcessBarsWidget.prototype._readProcesses = async function () {
    if (!window.si || typeof window.si.processes !== "function") return [];
    const result = await window.si.processes();
    const list = Array.isArray(result) ? result : (result && result.list) || [];
    return list
      .filter(process => Number.isFinite(process.cpu ?? process.pcpu))
      .sort((left, right) => (right.cpu ?? right.pcpu) - (left.cpu ?? left.pcpu))
      .slice(0, this.maxBars);
  };

  ProcessBarsWidget.prototype._refresh = async function () {
    if (this._refreshing) return;
    this._refreshing = true;
    try {
      const processes = await this._readProcesses();
      this.bars.forEach((bar, index) => {
        const process = processes[index] || null;
        const cpu = process ? (process.cpu ?? process.pcpu) : 0;
        bar.process = process;
        bar.target = 0.1 + Math.max(0.001, Math.min(1, cpu / 100)) * 6;
        bar.mesh.material.color.setHSL(process ? index / this.maxBars : 0.1, 0.6, 0.5);
      });
      if (this.selectedIndex >= 0 && !this.bars[this.selectedIndex].process) this._select(-1, false);
    } catch (error) {
      console.warn("ProcessBarsWidget: failed to read processes", error);
    } finally {
      this._refreshing = false;
    }
  };

  ProcessBarsWidget.prototype._tick = async function (time) {
    if (!this._running) return;
    if (this._lastFrame) {
      const frameTime = time - this._lastFrame;
      this._slowFrames = frameTime > 50 ? this._slowFrames + 1 : Math.max(0, this._slowFrames - 1);
      if (this._slowFrames >= 45 && this.quality !== "minimal") {
        this._slowFrames = 0;
        const fallback = this.quality === "cinematic" ? "balanced" : "minimal";
        this.setQuality(fallback);
        if (typeof this.options.onPerformanceFallback === "function") this.options.onPerformanceFallback(fallback);
      }
    }
    this._lastFrame = time;
    if (!this._paused && time - this._lastUpdate > this._pollInterval) {
      this._lastUpdate = time;
      this._refresh();
    }
    if (!this._paused) {
      this.bars.forEach((bar, index) => {
        bar.height += (bar.target - bar.height) * 0.08;
        bar.mesh.scale.y = Math.max(0.01, bar.height);
        bar.mesh.position.y = bar.height / 2;
        bar.mesh.rotation.y += this.quality === "cinematic" ? 0.002 * (index % 2 === 0 ? 1 : -1) : 0;
      });
      this.renderer.render(this.scene, this.camera);
    }
    this._raf = requestAnimationFrame(this._tick);
  };

  ProcessBarsWidget.prototype.setPaused = function (paused) { this._paused = Boolean(paused); };
  ProcessBarsWidget.prototype.setQuality = function (quality) {
    this.quality = ["minimal", "balanced", "cinematic"].includes(quality) ? quality : "balanced";
    const ratio = this.quality === "minimal" ? 1 : this.quality === "cinematic" ? 2 : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, ratio));
  };
  ProcessBarsWidget.prototype.resize = function () {
    const width = this.container.clientWidth || 400;
    const height = this.container.clientHeight || 200;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };
  ProcessBarsWidget.prototype.destroy = function () {
    this._running = false;
    cancelAnimationFrame(this._raf);
    this.container.removeEventListener("pointermove", this._onPointerMove);
    this.container.removeEventListener("pointerleave", this._onPointerLeave);
    this.container.removeEventListener("click", this._onClick);
    this.renderer.domElement.removeEventListener("keydown", this._onKeyDown);
    if (this._resizeObserver) this._resizeObserver.disconnect();
    this.scene.traverse(object => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) object.material.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  };

  global.createThreeWidget = function (containerId, options) {
    const element = document.getElementById(containerId);
    if (!element) throw new Error("No element with id " + containerId);
    return new ProcessBarsWidget(element, options);
  };
})(window);
