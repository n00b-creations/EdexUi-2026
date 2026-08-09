(function(global){
  // sequencer.class.js - simple orchestrator for intro animations
  function Sequencer(opts){
    this.steps = opts && opts.steps ? opts.steps : [];
    this.index = 0; this.running=false; this._current=null;
  }
  Sequencer.prototype.start = function(){ if(this.running) return; this.running=true; this._next(); };
  Sequencer.prototype._next = function(){ if(this.index>=this.steps.length){ this.running=false; return; } const step=this.steps[this.index++]; try{ if(typeof step.action==='function') step.action(); }catch(e){} const wait = step.wait || 600; setTimeout(()=>this._next(), wait); };
  Sequencer.prototype.stop = function(){ this.running=false; this.index=0; };
  global.createSequencer = function(opts){ return new Sequencer(opts||{}); };
})(window);
