// headless_test.js - run map JS with minimal stubs using Node vm
const fs = require('fs');
const vm = require('vm');

function safeRead(path){ return fs.readFileSync(path,'utf8'); }

// Load towns JSON saved earlier
const townsJson = JSON.parse(fs.readFileSync('/tmp/towns_geojson.json','utf8'));

// Minimal window/document stub
const listeners = {};
const document = {
  addEventListener: (evt, fn) => { listeners[evt] = listeners[evt] || []; listeners[evt].push(fn); },
  getElementById: (id) => ({ style: {} }),
  createElement: () => ({ style: {}, appendChild: ()=>{} }),
};

// Minimal DOMContentLoaded trigger
function triggerDOMContentLoaded(){ (listeners['DOMContentLoaded']||[]).forEach(fn=>{ try{ fn(); }catch(e){ console.error('DOMContentLoaded handler error',e); } }); }

// Minimal console to capture logs
const console = global.console;

// Minimal L (Leaflet) stub with methods used by our scripts
const L = (function(){
  function noop(){ return this; }
  function map(id){
    return {
      setView: (v,z)=>{},
      addLayer: ()=>{},
      on: ()=>{},
      fitBounds: ()=>{},
      addControl: ()=>{},
      zoomIn: ()=>{},
      zoomOut: ()=>{},
      setView: ()=>{},
    };
  }
  function tileLayer(url, opts){ return { addTo: ()=>{} }; }
  function layerGroup(){ return { addTo: ()=>{ return { clearLayers: ()=>{}, addLayer: ()=>{} }; } }; }
  function FeatureGroup(){ return { addLayer: ()=>{}, clearLayers: ()=>{}, getLayers: ()=>[] }; }
  function marker(coords, opts){ return { bindPopup: ()=>{}, addTo: ()=>{}, on: ()=>{}, getLatLng: ()=>({lat: coords[0], lng: coords[1]}) }; }
  function circleMarker(coords, opts){ return marker(coords, opts); }
  function polygon(coords){ return { getBounds: ()=>({ contains: ()=>true }), toGeoJSON: ()=>({ geometry: { coordinates: coords }}) }; }
  const Control = { Draw: function(){ return {}; } };
  return { map, tileLayer, layerGroup, FeatureGroup, marker, circleMarker, polygon, Control, ControlDraw: Control.Draw };
})();

// Minimal global fetch that returns the saved towns JSON when requested
async function fetchStub(url, opts){
  // map relative path to local saved file
  if(url.includes('/api/trails/towns/geojson')){
    return { ok:true, json: async ()=> townsJson };
  }
  return { ok:false, status:404, json: async ()=> ({}) };
}

// Provide globals for the VM
const sandbox = {
  window: {},
  document: document,
  console: console,
  L: L,
  fetch: fetchStub,
  navigator: { userAgent: 'node' },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
};

// Read scripts
const mapInterface = safeRead('./static/advanced_js_mapping/js/map-interface.js');
const spatialAnalysis = safeRead('./static/advanced_js_mapping/js/spatial-analysis.js');
const uiControls = safeRead('./static/advanced_js_mapping/js/ui-controls.js');

// Execute in vm
const context = vm.createContext(sandbox);
try{
  vm.runInContext(uiControls, context, { filename: 'ui-controls.js' });
  vm.runInContext(mapInterface, context, { filename: 'map-interface.js' });
  vm.runInContext(spatialAnalysis, context, { filename: 'spatial-analysis.js' });
  console.log('Scripts loaded into VM successfully. Triggering DOMContentLoaded...');
  triggerDOMContentLoaded();
  console.log('DOMContentLoaded triggered. Checking for errors...');
  console.log('window.AdvancedMapping:', !!context.window.AdvancedMapping || !!context.AdvancedMapping);
}catch(err){
  console.error('Error while running scripts:', err);
  process.exit(2);
}

console.log('Headless test completed successfully.');
