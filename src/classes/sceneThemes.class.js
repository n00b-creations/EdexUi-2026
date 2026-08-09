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
  }

  SceneThemes.prototype._applyEquirect = function (textureUrl) {
    const self = this;
    return new Promise((resolve) => {
      this.loader.load(textureUrl, function (tex) {
        if (window.threeGlobalScene) {
          // use equirectangular mapping
          tex.mapping = THREE.EquirectangularReflectionMapping;
          window.threeGlobalScene.background = tex;
        }
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
    if (window.threeGlobalScene) window.threeGlobalScene.background = null;

    // tweak particles, globe and raymarch depending on theme
    switch (name) {
      case 'space-hub':
        // Equirectangular space nebula (use threejs example if available)
        await this._applyEquirect('https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg');
        // enhance particles (blueish, higher amp)
        if (window.particlesLayer && window.particlesLayer.points) {
          window.particlesLayer.points.material.uniforms.uAmp.value = 0.6;
        }
        // globe: add city lights/emissive if present
        if (window.threeGlobeWidget && window.threeGlobeWidget.globe && window.threeGlobeWidget.globe.material) {
          try {
            const mat = window.threeGlobeWidget.globe.material;
            mat.color.setHex(0xffffff);
            // try load earth texture
            this.loader.load('https://threejs.org/examples/textures/earth_atmos_2048.jpg', (tex) => { mat.map = tex; mat.needsUpdate = true; });
          } catch (e) {}
        }
        break;

      case 'snowy-land':
        // Soft snowy sky via equirectangular winter sky
        await this._applyEquirect('https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg');
        // create snow effect by increasing particle count (if possible) or fallback to raymarch color
        if (window.particlesLayer && window.particlesLayer.points) {
          window.particlesLayer.points.material.uniforms.uAmp.value = 0.2;
          // tint particles to white/blue
          // not exposing direct color uniform here - rely on particle shader mixing
        }
        // if raymarch exists, tint it colder
        if (window.raymarchBg && window.raymarchBg.scene && window.raymarchBg.scene.children[0]) {
          try { window.raymarchBg.scene.children[0].material.uniforms.iTime.value = 0.0; } catch(e){}
        }
        if (window.threeGlobeWidget && window.threeGlobeWidget.globe && window.threeGlobeWidget.globe.material) {
          try {
            const mat = window.threeGlobeWidget.globe.material;
            mat.color.setHex(0xcfe8ff);
            this.loader.load('https://threejs.org/examples/textures/earth_daymap_1024.jpg', (tex) => { mat.map = tex; mat.needsUpdate = true; });
          } catch (e) {}
        }
        break;

      case 'alien-planet':
        // vivid color sky + strange atmosphere
        await this._applyEquirect('https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg');
        if (window.particlesLayer && window.particlesLayer.points) window.particlesLayer.points.material.uniforms.uAmp.value = 0.9;
        if (window.threeGlobeWidget && window.threeGlobeWidget.globe && window.threeGlobeWidget.globe.material) {
          const mat = window.threeGlobeWidget.globe.material;
          mat.color.setHex(0xff88cc);
          mat.needsUpdate = true;
        }
        break;

      case 'deep-space':
      default:
        // starfield skybox
        await this._applyEquirect('https://threejs.org/examples/textures/galaxy_starfield.png');
        if (window.particlesLayer && window.particlesLayer.points) window.particlesLayer.points.material.uniforms.uAmp.value = 0.2;
        if (window.threeGlobeWidget && window.threeGlobeWidget.globe && window.threeGlobeWidget.globe.material) {
          const mat = window.threeGlobeWidget.globe.material;
          mat.color.setHex(0x88bbff);
          mat.needsUpdate = true;
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
