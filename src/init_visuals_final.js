// init_visuals_final.js
// This script initializes visual layers, scene themes, postprocessing, and wires settings toggles.
(function(){
  function safe(fn){ try{ fn(); }catch(e){ console.warn('visuals init error', e);} }

  function init(){
    if (!document.getElementById('visuals-root')) return setTimeout(init, 400);

    // create layers if not present
    try{
      // particles
      if (!window.particlesLayer){
        try{ window.particlesLayer = createParticlesLayer('particles-layer'); }catch(e){ console.warn('particles init failed', e); }
      }
      // globe
      if (!window.threeGlobeWidget){
        try{ window.threeGlobeWidget = createThreeGlobeWidget('globe-layer'); }catch(e){ console.warn('globe init failed', e); }
      }
      // process city
      if (!window.processCity){
        try{ window.processCity = createProcessCity('processcity-layer', { maxCount: 64 }); }catch(e){ console.warn('process city init failed', e); }
      }
      // arcs
      if (!window.networkArcs){
        try{ window.networkArcs = createNetworkArcs('arcs-layer'); }catch(e){ console.warn('network arcs init failed', e); }
      }
      // raymarch
      if (!window.raymarchBg){
        try{ window.raymarchBg = createRaymarchBackground('raymarch-layer'); }catch(e){ console.warn('raymarch init failed', e); }
      }

      // postprocess: attempt to attach to globe renderer if present
      if (!window.postprocess){
        try{
          if (window.threeGlobeWidget && window.threeGlobeWidget.renderer){
            window.postprocess = createPostProcess({ renderer: window.threeGlobeWidget.renderer, scene: window.threeGlobeWidget.scene, camera: window.threeGlobeWidget.camera });
          }
        }catch(e){ console.warn('postprocess init failed', e); }
      }

      // scene themes
      if (!window.sceneThemes){
        try{ window.sceneThemes = createSceneThemes(); }catch(e){ console.warn('sceneThemes init failed', e); }
      }

      // apply saved theme
      try{
        if (window.settings && window.settings.visualTheme && window.sceneThemes){
          window.sceneThemes.setTheme(window.settings.visualTheme);
          const sel = document.getElementById('theme-selector'); if (sel) sel.value = window.settings.visualTheme;
        }
      }catch(e){}

      // wire theme selector
      const sel = document.getElementById('theme-selector');
      if (sel){ sel.addEventListener('change', function(e){ try{ window.sceneThemes.setTheme(e.target.value); }catch(err){console.warn(err);} }); }

      // Cinematic presets
      window.setCinematicPreset = function(level){
        // level: 'low' | 'high' | 'ultra'
        const preset = level || 'high';
        if (preset === 'low'){
          // reduce particles and disable bloom
          try{ if (window.particlesLayer) window.particlesLayer.points.material.uniforms.uAmp.value = 0.2; }catch(e){}
          try{ if (window.postprocess && window.postprocess.composer){ /* TODO: reduce composer passes */ } }catch(e){}
        } else if (preset === 'high'){
          try{ if (window.particlesLayer) window.particlesLayer.points.material.uniforms.uAmp.value = 0.5; }catch(e){}
        } else if (preset === 'ultra'){
          try{ if (window.particlesLayer) window.particlesLayer.points.material.uniforms.uAmp.value = 1.0; }catch(e){}
        }
        try{ if (window.settings) { window.settings.cinematicPreset = preset; if (typeof fs !== 'undefined' && window.settingsFile) fs.writeFileSync(window.settingsFile, JSON.stringify(window.settings, null, 4)); } }catch(e){}
      };

      // Sequencer demo button
      if (!document.getElementById('visuals-demo-btn')){
        const btn = document.createElement('button'); btn.id='visuals-demo-btn'; btn.textContent='Run Cinematic Demo'; btn.style.position='absolute'; btn.style.right='12px'; btn.style.top='12px'; btn.style.zIndex=10002; btn.style.pointerEvents='auto'; document.body.appendChild(btn);
        btn.addEventListener('click', function(){
          try{
            const seq = createSequencer({ steps: [
              { action: ()=>{ window.setCinematicPreset('ultra'); }, wait: 1500 },
              { action: ()=>{ if (window.sceneThemes) window.sceneThemes.setTheme('space-hub'); }, wait: 1800 },
              { action: ()=>{ if (window.processCity) window.processCity.resize(); }, wait: 1200 },
              { action: ()=>{ if (window.threeGlobeWidget && window.threeGlobeWidget.globe) window.threeGlobeWidget.globe.rotation.y += Math.PI/4; }, wait: 800 },
              { action: ()=>{ window.setCinematicPreset('high'); }, wait: 1000 }
            ]}); seq.start();
          }catch(e){ console.warn('demo run failed', e); }
        });
      }

      // Auto-run initial cinematic preset
      if (window.settings && window.settings.cinematicPreset) setTimeout(()=>window.setCinematicPreset(window.settings.cinematicPreset), 800);

    }catch(e){ console.warn('visuals init general error', e); }
  }

  // Wait until DOM ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(init, 200);
  else document.addEventListener('DOMContentLoaded', init);
})();
