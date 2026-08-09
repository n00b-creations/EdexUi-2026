(function (global) {
  // SceneThemes: manages visual themes (space, snowy, alien, deep-space)
  // Uses existing global widgets if available: window.threeGlobeWidget, window.particlesLayer, window.processCity, window.raymarchBg
  // Falls back to setting scene backgrounds and globe textures when possible.
  function SceneThemes(opts) {
    this.themes = ['space-hub', 'snowy-land', 'alien-planet', 'deep-space'];
    this.current = null;
    this.opts = opts || {};
    this.loader = new THREE.TextureLoader();
    this.cubeLoader = new THREE.CubeTextureLoader();
    this.localAssetPrefix = this.opts.assetPrefix || 'assets/themes/';
  }

  SceneThemes.prototype._local = function(name) {
    // map theme to local filename
    const map = {
      'space-hub': 'space_hub.jpg',
      'snowy-land': 'snowy_land.jpg',
      'alien-planet': 'alien_planet.jpg',
      'deep-space': 'deep_space.jpg'
    };
    return this.localAssetPrefix + (map[name] || map['deep-space']);
  };

  SceneThemes.prototype._applyEquirect = function (textureUrl) {
    const self = this;
    return new Promise((resolve) => {
      this.loader.load(textureUrl, function (tex) {
        try {
          if (window.threeGlobalScene) {
            // use equirectangular mapping
            tex.mapping = THREE.EquirectangularReflectionMapping;
            window.threeGlobalScene.background = tex;
          }
        } catch (e) {}
        resolve(tex);
      }, undefined, function () { resolve(null); });
    });
  };

  SceneThemes.prototype._applySkybox = function (urls) {
    const self = this;
    return new Promise((resolve) => {
      try {
        this.cubeLoader.load(urls, function (tex) {
          if (window.threeGlobalScene) window.threeGlobalScene.background = tex;
          resolve(tex);
        }, undefined, function () { resolve(null); });
      } catch (e) { resolve(null); }
    });
  };

  SceneThemes.prototype.setTheme = async function (name) {
    if (!name || this.current === name) return;
    this.current = name;

    // Basic default: reset background
    try { if (window.threeGlobalScene) window.threeGlobalScene.background = null; } catch(e){}

    // Try to use a local equirectangular texture first for high fidelity backgrounds
    const localTex = this._local(name);

    switch (name) {
      case 'space-hub':
        await this._applyEquirect(localTex).catch(()=>{});
        if (window.particlesLayer && window.particlesLayer.points) {
          window.particlesLayer.points.material.uniforms.uAmp.value = 0.6;
        }
        if (window.threeGlobeWidget && window.threeGlobeWidget.globe && window.threeGlobeWidget.globe.material) {
          try {
            const mat = window.threeGlobeWidget.globe.material;
            mat.color.setHex(0xffffff);
            this.loader.load(this.localAssetPrefix + 'space_hub.jpg', (tex) => { mat.map = tex; mat.needsUpdate = true; });
          } catch (e) {}
        }
        break;

      case 'snowy-land':
        await this._applyEquirect(localTex).catch(()=>{});
        if (window.particlesLayer && window.particlesLayer.points) {
          window.particlesLayer.points.material.uniforms.uAmp.value = 0.2;
        }
        if (window.threeGlobeWidget && window.threeGlobeWidget.globe && window.threeGlobeWidget.globe.material) {
          try {
            const mat = window.threeGlobeWidget.globe.material;
            mat.color.setHex(0xcfe8ff);
            this.loader.load(this.localAssetPrefix + 'snowy_land.jpg', (tex) => { mat.map = tex; mat.needsUpdate = true; });
          } catch (e) {}
        }
        break;

      case 'alien-planet':
        await this._applyEquirect(localTex).catch(()=>{});
        if (window.particlesLayer && window.particlesLayer.points) window.particlesLayer.points.material.uniforms.uAmp.value = 0.9;
        if (window.threeGlobeWidget && window.threeGlobeWidget.globe && window.threeGlobeWidget.globe.material) {
          const mat = window.threeGlobeWidget.globe.material;
          mat.color.setHex(0xff88cc);
          this.loader.load(this.localAssetPrefix + 'alien_planet.jpg', (tex) => { mat.map = tex; mat.needsUpdate = true; });
        }
        break;

      case 'deep-space':
      default:
        await this._applyEquirect(localTex).catch(()=>{});
        if (window.particlesLayer && window.particlesLayer.points) window.particlesLayer.points.material.uniforms.uAmp.value = 0.2;
        if (window.threeGlobeWidget && window.threeGlobeWidget.globe && window.threeGlobeWidget.globe.material) {
          const mat = window.threeGlobeWidget.globe.material;
          mat.color.setHex(0x88bbff);
          this.loader.load(this.localAssetPrefix + 'deep_space.jpg', (tex) => { mat.map = tex; mat.needsUpdate = true; });
        }
        break;
    }

    // Persist selection to settings if available
    try {
      if (window.settings) {
        window.settings.visualTheme = name;
        if (typeof fs !== 'undefined' && window.settingsFile) {
          try { fs.writeFileSync(window.settingsFile, JSON.stringify(window.settings, null, 4)); } catch (e) { console.warn('failed to persist theme', e); }
        }
      }
    } catch (e) {}
  };

  SceneThemes.prototype.list = function () { return this.themes.slice(); };

  global.createSceneThemes = function () { return new SceneThemes(); };

})(window);
