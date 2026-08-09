(function(global){
  // postprocess.class.js
  // Sets up EffectComposer with bloom, film grain, vignette and a chromatic aberration shader.
  function PostProcess(manager) {
    this.manager = manager || {};
    if (typeof THREE === 'undefined') {
      console.warn('PostProcess: THREE not available');
      return;
    }

    try {
      // Ensure example passes are available
      if (typeof THREE.EffectComposer === 'undefined' && typeof EffectComposer === 'undefined') {
        console.warn('PostProcess: EffectComposer not found (examples not loaded)');
        return;
      }

      var renderer = this.manager.renderer || (window.threeGlobalRenderer ? window.threeGlobalRenderer : null);
      var scene = this.manager.scene || (window.threeGlobalScene ? window.threeGlobalScene : null);
      var camera = this.manager.camera || (window.threeGlobalCamera ? window.threeGlobalCamera : null);

      if (!renderer || !scene || !camera) {
        // The manager can supply these later; caller should call initWith(renderer, scene, camera)
        this.pending = true;
        this._deferred = { renderer: renderer, scene: scene, camera: camera };
        return;
      }

      this._init(renderer, scene, camera);
    } catch (e) {
      console.warn('PostProcess init failed', e);
    }
  }

  PostProcess.prototype.initWith = function(renderer, scene, camera) {
    if (this.composer) return;
    this._init(renderer, scene, camera);
  };

  PostProcess.prototype._init = function(renderer, scene, camera) {
    try {
      const composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      // UnrealBloomPass signature: (resolution, strength, radius, threshold)
      if (typeof UnrealBloomPass !== 'undefined') {
        const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85);
        bloom.threshold = 0.1;
        bloom.strength = 0.8;
        bloom.radius = 0.55;
        composer.addPass(bloom);
      }

      // FilmPass (grain + scanlines)
      if (typeof FilmPass !== 'undefined') {
        const film = new FilmPass(0.35, 0.025, 648, false);
        composer.addPass(film);
      }

      // Vignette / chromatic aberration shader pass (small custom shader)
      const chromatShader = {
        uniforms: {
          tDiffuse: { value: null },
          amount: { value: 0.0025 },
        },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; varying vec2 vUv; void main(){ vec2 uv = vUv; vec2 offset = (uv - 0.5) * amount; vec4 c = texture2D(tDiffuse, uv);
          float r = texture2D(tDiffuse, uv + offset).r;
          float g = texture2D(tDiffuse, uv).g;
          float b = texture2D(tDiffuse, uv - offset).b;
          gl_FragColor = vec4(r,g,b, c.a);
        }`
      };

      const chromaPass = new ShaderPass(chromatShader);
      chromaPass.renderToScreen = true;
      composer.addPass(chromaPass);

      this.composer = composer;
      this.renderer = renderer;
      this.scene = scene;
      this.camera = camera;

      // Hook into main render loop if provided
      this._origRender = renderer.render;
      var self = this;
      // Caller should call this.render() each frame
    } catch (e) {
      console.warn('PostProcess _init failed', e);
    }
  };

  PostProcess.prototype.render = function() {
    if (this.composer) this.composer.render();
    else if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  };

  global.createPostProcess = function (manager) { return new PostProcess(manager); };

})(window);
