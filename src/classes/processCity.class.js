(function(global){
  // processCity.class.js
  // Instanced city skyline representing processes. Uses InstancedMesh for performance.
  function ProcessCity(container, opts){
    if (!container) throw new Error('container required');
    if (typeof THREE === 'undefined') { console.warn('ProcessCity: THREE missing'); return; }
    this.container = container;
    this.width = container.clientWidth || 600; this.height = container.clientHeight || 300;

    this.renderer = new THREE.WebGLRenderer({ alpha:true, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, this.width/this.height, 0.1, 1000);
    this.camera.position.set(0, 6, 16);
    this.camera.lookAt(0,0,0);

    const light = new THREE.DirectionalLight(0xffffff,0.8); light.position.set(5,10,7); this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xffffff,0.4));

    const geometry = new THREE.BoxGeometry(1,1,1);
    const material = new THREE.MeshStandardMaterial({ color:0x44bbff, metalness:0.2, roughness:0.6 });
    this.max = opts && opts.maxCount ? opts.maxCount : 64;
    this.instanced = new THREE.InstancedMesh(geometry, material, this.max);
    this.instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.instanced);

    this._data = new Array(this.max).fill({});
    this._tick = this._tick.bind(this);
    this._raf = null; this._running=true; this._lastUpdate=0; this._pollInterval=2000;
    requestAnimationFrame(this._tick);

    window.addEventListener('resize',()=>this.resize());
  }

  ProcessCity.prototype._tick = async function(t){
    if (!this._running) return;
    if ((t - this._lastUpdate)>this._pollInterval){
      this._lastUpdate = t;
      try{
        if (window.si && typeof window.si.processes === 'function'){
          const res = await window.si.processes();
          const list = Array.isArray(res)?res:(res && res.list)?res.list:[];
          const top = list.filter(p=>typeof p.pcpu==='number').sort((a,b)=>b.pcpu-a.pcpu).slice(0,this.max);
          // update instance transforms
          for (let i=0;i<this.max;i++){
            const proc = top[i];
            const height = proc ? Math.max(0.2, (proc.pcpu/100)*12 + 0.2) : 0.2;
            const x = (i - (this.max-1)/2) * 0.8;
            const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, height/2, 0), new THREE.Quaternion(), new THREE.Vector3(0.6, height, 0.6));
            this.instanced.setMatrixAt(i, matrix);
            // color per instance
            const color = new THREE.Color().setHSL(proc ? (i/this.max) : 0.1, 0.6, 0.5);
            this.instanced.setColorAt && this.instanced.setColorAt(i, color);
          }
          this.instanced.instanceMatrix.needsUpdate = true;
          if (this.instanced.instanceColor) this.instanced.instanceColor.needsUpdate = true;
        }
      }catch(e){console.warn('ProcessCity poll failed',e);}    }
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this._tick);
  };

  ProcessCity.prototype.resize = function(){ const w=this.container.clientWidth||600; const h=this.container.clientHeight||300; this.camera.aspect=w/h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w,h); };
  ProcessCity.prototype.destroy = function(){ this._running=false; cancelAnimationFrame(this._raf); try{ this.renderer.dispose(); if(this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);}catch(e){} };

  global.createProcessCity = function(containerId, opts){ const el=document.getElementById(containerId); if(!el) throw new Error('No element '+containerId); return new ProcessCity(el, opts||{}); };

})(window);
