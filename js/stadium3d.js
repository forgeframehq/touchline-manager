// 3D stadium viewer (ES module, loaded on demand). Sudhi's low-poly stadium pack (itch.io, free) shown as a
// floodlit miniature on a dark plinth: slow turntable, drag to orbit, pinch / wheel to zoom, day / night.
// Each club gets one of the 16 models (big English clubs first get the English grounds), "artist's impression".
import * as THREE from 'three';
import { FBXLoader } from './vendor/three/loaders/FBXLoader.js';
import { OrbitControls } from './vendor/three/controls/OrbitControls.js';

const MODELS = ['eng_001', 'eng_002', 'eng_003', 'eng_004', 'esp_001', 'esp_002', 'esp_003', 'esp_014', 'fra_001', 'fra_002', 'fra_003', 'fra_004', 'ita_001', 'ita_002', 'ita_003', 'ita_004'];
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
export function modelFor(club) {
  if (club.capacity >= 45000) return MODELS[hash(club.id) % 4];                 // the four English grounds for the big clubs
  if (club.capacity >= 25000) return MODELS[4 + hash(club.id) % 12];
  return ['fra_003', 'fra_001', 'esp_001', 'fra_002', 'ita_003'][hash(club.id) % 5];   // the compact ones
}
const cache = new Map();
export function mount(box, club, opts = {}) {
  const W = box.clientWidth, H = box.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W, H); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x050e09, 1800, 4200);
  const cam = new THREE.PerspectiveCamera(38, W / H, 5, 8000);
  const hemi = new THREE.HemisphereLight(0xdfeee4, 0x0b1a12, .55); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.6); sun.position.set(600, 900, 400); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -700, right: 700, top: 700, bottom: -700, near: 10, far: 3000 }); scene.add(sun);
  const floods = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => { const l = new THREE.SpotLight(0xfff6dc, 0, 2600, Math.PI / 5, .5, 1.2); l.position.set(x * 520, 620, z * 420); l.target.position.set(0, 0, 0); scene.add(l, l.target); return l; });
  // plinth
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(760, 800, 60, 64), new THREE.MeshStandardMaterial({ color: 0x0f2419, metalness: .3, roughness: .6 }));
  plinth.position.y = -32; plinth.receiveShadow = true; scene.add(plinth);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(780, 6, 8, 96), new THREE.MeshStandardMaterial({ color: 0xe7c25a, metalness: 1, roughness: .25, emissive: 0x3a2a08 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = -2; scene.add(rim);
  const controls = new OrbitControls(cam, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: .08, enablePan: false, minPolarAngle: .25, maxPolarAngle: 1.32, autoRotate: true, autoRotateSpeed: .9, rotateSpeed: .6 });
  let night = opts.night !== false, raf = 0, alive = true;
  function setNight(on) { night = on; hemi.intensity = on ? .25 : .75; sun.intensity = on ? .25 : 1.7; floods.forEach(f => f.intensity = on ? 2.2 : 0); renderer.toneMappingExposure = on ? 1.15 : 1.0; }
  setNight(night);
  const name = modelFor(club);
  const manager = new THREE.LoadingManager(); manager.setURLModifier(u => /pitch\.jpg/i.test(u) ? 'assets/3d/Pitch.jpg' : u);
  const done = (obj) => {
    if (!alive) return;
    const o = obj.clone(true);
    o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; [].concat(m.material).forEach(mt => { if (mt && mt.color && mt.color.getHex() === 0 && !mt.map) mt.color.set(0x9aa39c); if (mt) { mt.side = THREE.DoubleSide; } }); } });
    // the pack ships each stadium on a display stand (grey slab + orange column): drop those material groups
    const DROP = /^(Material #243797|Union)$/, b = new THREE.Box3(), v = new THREE.Vector3();
    o.traverse(m => { if (!m.isMesh) return; const mats = [].concat(m.material), g = m.geometry, pos = g.attributes.position, idx = g.index;
      if (g.groups && g.groups.length && Array.isArray(m.material)) g.groups = g.groups.filter(gr => !DROP.test((mats[gr.materialIndex] || {}).name || ''));
      m.updateWorldMatrix(true, false);
      const ranges = g.groups && g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.count : pos.count }];
      for (const gr of ranges) for (let i = gr.start; i < gr.start + gr.count; i += 3) { const k = idx ? idx.getX(i) : i; v.fromBufferAttribute(pos, k).applyMatrix4(m.matrixWorld); b.expandByPoint(v); } });
    const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const k = 1150 / Math.max(s.x, s.z); o.scale.setScalar(k); o.position.set(-c.x * k, -b.min.y * k, -c.z * k); scene.add(o);
    const fovH = 2 * Math.atan(Math.tan(cam.fov * Math.PI / 360) * cam.aspect), dist = Math.max(1500, 1250 / (2 * Math.tan(fovH / 2)) * .88);
    cam.position.copy(new THREE.Vector3(.55, .42, .72).normalize().multiplyScalar(dist)); cam.far = dist * 4; cam.updateProjectionMatrix(); scene.fog.near = dist * .9; scene.fog.far = dist * 2.6;
    controls.target.set(0, 40, 0); controls.minDistance = dist * .35; controls.maxDistance = dist * 1.3; controls.update();
    opts.onReady && opts.onReady(name);
  };
  if (cache.has(name)) done(cache.get(name));
  else new FBXLoader(manager).load(`assets/3d/st_${name}.fbx`, obj => { cache.set(name, obj); done(obj); }, undefined, e => opts.onError && opts.onError(e));
  const loop = () => { if (!alive) return; if (!box.isConnected) { alive = false; controls.dispose(); renderer.dispose(); return; } controls.update(); renderer.render(scene, cam); raf = requestAnimationFrame(loop); };
  loop();
  return {
    setNight, get night() { return night; },
    spin(on) { controls.autoRotate = on; },
    resize() { const w = box.clientWidth, h = box.clientHeight; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); },
    dispose() { alive = false; cancelAnimationFrame(raf); controls.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
