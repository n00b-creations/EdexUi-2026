(function(global){
  // networkArcs.class.js
  // Simple arc renderer that draws curved lines between 2D positions. Exposes update(connections)
  function NetworkArcs(container){
    if (!container) throw new Error('container required');
    if (typeof THREE === 'undefined') { console.warn('NetworkArcs: THREE missing'); return; }
    this.container = container;
    this.width = container.clientWidth || 600; this.height = container.clientHeight || 300;

    this.renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true });
    this.renderer.setSize(this.width, this.height); this.renderer.setPixelRatio(window.devicePixelRatio||1);
    this.container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, this.width/this.height, 0.1, 1000); this.camera.position.set(0,4,12);
    this.scene.add(new THREE.AmbientLight(0xffffff,0.6)); this.scene.add(new THREE.DirectionalLight(0xffffff,0.6));

    this.group = new THREE.Group(); this.scene.add(this.group);
    this._raf=null; this._running=true; this._tick=this._tick.bind(this); requestAnimationFrame(this._tick);
    window.addEventListener('resize',()=>this.resize());
  }

  NetworkArcs.prototype._bezierPoints = function(a,b,segments=48){
    const cp = new THREE.Vector3((a.x+b.x)/2, Math.max(a.y,b.y)+3, (a.z+b.z)/2);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a.x,a.y,a.z), cp, new THREE.Vector3(b.x,b.y,b.z));
    return curve.getPoints(segments);
  };

  NetworkArcs.prototype.update = function(connections){
    // connections: [{from:{x,y,z}, to:{x,y,z}, color:'#ff0'}]
    // clear group
    while(this.group.children.length) this.group.remove(this.group.children[0]);
    connections = connections || [];
    connections.forEach(conn=>{
      const a = conn.from; const b = conn.to; const pts = this._bezierPoints(a,b,64);
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: conn.color||0x66ccff, linewidth: 1, transparent:true, opacity:0.9 });
      const line = new THREE.Line(geom, mat);
      this.group.add(line);
    });
  };

  NetworkArcs.prototype._tick = function(){ if(!this._running) return; this.renderer.render(this.scene, this.camera); this._raf=requestAnimationFrame(this._tick); };
  NetworkArcs.prototype.resize = function(){ const w=this.container.clientWidth||600; const h=this.container.clientHeight||300; this.camera.aspect=w/h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w,h); };
  NetworkArcs.prototype.destroy = function(){ this._running=false; cancelAnimationFrame(this._raf); try{ this.renderer.dispose(); if(this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);}catch(e){} };

  global.createNetworkArcs = function(containerId){ const el=document.getElementById(containerId); if(!el) throw new Error('No element '+containerId); return new NetworkArcs(el); };

})(window);
