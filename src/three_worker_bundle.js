// three_worker_bundle.js
// Worker bootstrap that attempts multiple paths to load three.min.js for OffscreenCanvas rendering
(function(){
  function tryImport(paths){
    for (let p of paths){
      try{
        importScripts(p);
        if (typeof THREE !== 'undefined'){
          postMessage({type:'three-loaded', path:p});
          return true;
        }
      }catch(e){}
    }
    return false;
  }

  const candidates = [
    'three.min.js',
    'node_modules/three/build/three.min.js',
    '/node_modules/three/build/three.min.js',
    '../node_modules/three/build/three.min.js',
    '../../node_modules/three/build/three.min.js'
  ];

  const ok = tryImport(candidates);
  if (!ok){
    postMessage({type:'error', message:'three.js not found in worker candidates'});
  }

  // Delegate to existing three_worker.js behavior by importing it (if available)
  try{
    importScripts('three_worker.js');
  }catch(e){
    // nothing else we can do
    postMessage({type:'error', message:'three_worker script not found or failed to load', detail: String(e)});
  }
})();
