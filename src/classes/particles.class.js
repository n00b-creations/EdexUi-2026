(function(global){
  // particles.class.js
  // GPU-friendly particle layer. Provides audio-reactive uniform 'uAmp' that can be driven by an analyser or fallback animation.
  function ParticlesLayer(container) {
    if (!container) throw new Error('container required');
    if (typeof THREE === 'undefined') { console.warn('ParticlesLayer: THREE missing'); return; }
    this.container = container;
    this.width = container.clientWidth || 800;
    this.height = container.clientHeight || 600;

    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(this.width, this.height);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    const count = 1200;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i=0;i<count;i++){
      positions[i*3+0] = (Math.random()-0.5)*20;
      positions[i*3+1] = (Math.random()-0.5)*10;
      positions[i*3+2] = (Math.random()-0.5)*4;
      speeds[i] = Math.random()*0.01+0.002;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions,3));
    geom.setAttribute('aSpeed', new THREE.BufferAttribute(speeds,1));

    const vert = `attribute float aSpeed; varying float vSpeed; uniform float uTime; uniform float uAmp; void main(){ vSpeed = aSpeed; vec3 pos = position; float pulse = sin(uTime*2.0 + aSpeed*100.0) * (uAmp*1.5); pos.y += pulse; gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0); gl_PointSize = 1.5 + uAmp*6.0; }`;
    const frag = `precision mediump float; varying float vSpeed; uniform float uAmp; void main(){ float d = length(gl_PointCoord - vec2(0.5)); float alpha = 1.0 - smoothstep(0.35,0.5,d); vec3 col = mix(vec3(0.2,0.6,1.0), vec3(1.0,0.6,0.2), vSpeed*10.0); gl_FragColor = vec4(col, alpha*uAmp*0.9); }`;

    const mat = new THREE.ShaderMaterial({ uniforms: { uTime: {value:0}, uAmp: {value:0.1} }, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false });
    this.points = new THREE.Points(geom, mat);
    this.scene.add(this.points);

    this._start = performance.now();
    this._raf = null;
    this._running = true;

    // audio analyser
    this._analyser = null;
    this._freq = new Uint8Array(128);
    this._setupAnalyser();

    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);

    window.addEventListener('resize', () => { this.resize(); });
  }

  ParticlesLayer.prototype._setupAnalyser = function(){
    try {
      if (window.audioContext && window.audioContext.createAnalyser) {
        this._analyser = window.audioContext.createAnalyser();
      } else {
        window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this._analyser = window.audioContext.createAnalyser();
      }
      this._analyser.fftSize = 256;
      // Try to connect to any HTMLAudioElement in document
      const audioEls = document.querySelectorAll('audio');
      if (audioEls.length) {
        const src = window.audioContext.createMediaElementSource(audioEls[0]);
        src.connect(this._analyser);
        this._analyser.connect(window.audioContext.destination);
      } else {
        // no audio element available; leave analyser unattached. We'll use a fallback animation
        this._analyser = null;
      }
    } catch (e) {
      console.warn('ParticlesLayer analyser setup failed', e);
      this._analyser = null;
    }
  };

  ParticlesLayer.prototype._tick = function(){
    if (!this._running) return;
    const now = (performance.now() - this._start)/1000;
    if (this._analyser) {
      this._analyser.getByteFrequencyData(this._freq);
      let sum = 0; for (let i=0;i<this._freq.length;i++) sum += this._freq[i];
      const amp = Math.min(1, sum / (this._freq.length * 255));
      this.points.material.uniforms.uAmp.value = 0.2 + amp*1.8;
    } else {
      // fallback pulsate
      this.points.material.uniforms.uAmp.value = 0.3 + Math.abs(Math.sin(now*0.9))*0.7;
    }
    this.points.material.uniforms.uTime.value = now;
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this._tick);
  };

  ParticlesLayer.prototype.resize = function(){
    const w = this.container.clientWidth || 800; const h = this.container.clientHeight || 600;
    this.camera.aspect = w/h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w,h);
  };

  ParticlesLayer.prototype.destroy = function(){
    this._running = false; cancelAnimationFrame(this._raf);
    try { this.renderer.dispose(); if (this.renderer.domElement && this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement); }catch(e){}
  };

  global.createParticlesLayer = function(containerId){ const el = document.getElementById(containerId); if (!el) throw new Error('No element '+containerId); return new ParticlesLayer(el); };

})(window);
