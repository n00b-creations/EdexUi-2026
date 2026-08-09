(function(global){
  // raymarch.class.js - fullscreen shader background using a simple raymarch SDF.
  function RaymarchBackground(container){
    if (!container) throw new Error('container required');
    if (typeof THREE === 'undefined') { console.warn('Raymarch: THREE missing'); return; }
    this.container = container; this.width=container.clientWidth||800; this.height=container.clientHeight||600;
    this.renderer = new THREE.WebGLRenderer({ alpha:true }); this.renderer.setSize(this.width,this.height); this.renderer.setPixelRatio(window.devicePixelRatio||1); container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const geom = new THREE.PlaneGeometry(2,2);
    const mat = new THREE.ShaderMaterial({ uniforms: { iTime:{value:0}, iResolution:{value:new THREE.Vector3(this.width,this.height,1)} }, vertexShader: `void main(){ gl_Position = vec4(position,1.0); }`, fragmentShader: `precision mediump float; uniform float iTime; uniform vec3 iResolution; 
      // simple moving bands shader fallback
      void main(){ vec2 uv = gl_FragCoord.xy / iResolution.xy; float y = uv.y + 0.1*sin(iTime*0.5 + uv.x*10.0); vec3 col = mix(vec3(0.02,0.04,0.08), vec3(0.08,0.16,0.32), smoothstep(0.2,0.8,y)); gl_FragColor = vec4(col,1.0); }` , depthWrite:false });
    const mesh = new THREE.Mesh(geom, mat); this.scene.add(mesh);
    this._start = performance.now(); this._raf=null; this._running=true; this._tick=this._tick.bind(this); requestAnimationFrame(this._tick);
    window.addEventListener('resize', ()=>this.resize());
  }
  RaymarchBackground.prototype._tick = function(){ if(!this._running) return; const t=(performance.now()-this._start)/1000; this.scene.children[0].material.uniforms.iTime.value = t; this.renderer.render(this.scene,this.camera); this._raf=requestAnimationFrame(this._tick); };
  RaymarchBackground.prototype.resize = function(){ const w=this.container.clientWidth||800; const h=this.container.clientHeight||600; if(this.scene.children[0]) this.scene.children[0].material.uniforms.iResolution.value.set(w,h,1); this.renderer.setSize(w,h); };
  RaymarchBackground.prototype.destroy = function(){ this._running=false; cancelAnimationFrame(this._raf); try{ this.renderer.dispose(); if(this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);}catch(e){} };

  global.createRaymarchBackground = function(containerId){ const el=document.getElementById(containerId); if(!el) throw new Error('No element '+containerId); return new RaymarchBackground(el); };

})(window);
