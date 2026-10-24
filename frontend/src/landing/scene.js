// The home page's 3D scooter. The scooter and the map layer are a pure function of the
// scroll position: one keyframe per section, interpolated every frame, then eased.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const MODEL_URL = "/models/scooter.glb"; // optional; a placeholder is built if it's missing
const MODEL_TURN = 0;                     // radians: turn the model if it faces the wrong way
const MODEL_SIZE = 2.2;                   // longest side of the model, in scene units
const LOOK_Y = 0.95;
const ROT0 = -0.5;                        // opening angle: a three-quarter view
const TURN = Math.PI;
const PROPS = ["rot", "scale", "xFrac", "yFrac", "camZ", "mapOpacity", "mapScale", "mapBlur", "mapTilt", "vignette", "sceneOpacity"];
const STATIC = { rot: 0.95, scale: 0.75, xFrac: 0.42, yFrac: 0, camZ: 8, mapOpacity: 0.45, mapScale: 1.05, mapBlur: 2, mapTilt: 0, vignette: 0.8, sceneOpacity: 1 };

// ---- Scooter models -------------------------------------------------------
function fit(object) {
  const holder = new THREE.Group();
  holder.add(object);
  object.rotation.y = MODEL_TURN;
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  object.scale.multiplyScalar(MODEL_SIZE / Math.max(size.x, size.y, size.z));
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;
  return holder;
}

function contactShadow() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(0,0,0,0.55)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.22)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(MODEL_SIZE * 1.15, MODEL_SIZE * 0.45),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.002;
  return mesh;
}

// A clean, product-style scooter from simple shapes, used until a real model is added.
function placeholderScooter() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x1c222b, metalness: 0.65, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9aa6b6, metalness: 1, roughness: 0.28 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.92 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x3cd6c4, emissive: 0x2bb3a4, emissiveIntensity: 0.9, roughness: 0.4 });
  const grip = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.8 });
  const between = (a, b, r, mat) => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 24), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return m;
  };
  const wheel = (x) => {
    const w = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 32), metal);
    hub.rotation.x = Math.PI / 2;
    w.add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.055, 20, 48), rubber), hub);
    w.position.set(x, 0.225, 0);
    return w;
  };
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.075, 0.2), bodyMat);
  deck.position.set(-0.02, 0.24, 0);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.012, 0.004), accent);
  strip.position.set(-0.02, 0.24, 0.102);
  const strip2 = strip.clone();
  strip2.position.z = -0.102;
  g.add(deck, strip, strip2, wheel(0.62), wheel(-0.6));
  const neck = new THREE.Vector3(0.5, 0.42, 0);
  const top = new THREE.Vector3(0.36, 1.62, 0);
  g.add(between(new THREE.Vector3(0.62, 0.225, 0), neck, 0.035, metal));
  g.add(between(new THREE.Vector3(0.44, 0.27, 0), neck, 0.045, bodyMat));
  g.add(between(neck, top, 0.042, bodyMat));
  g.add(between(new THREE.Vector3(0.36, 1.62, -0.3), new THREE.Vector3(0.36, 1.62, 0.3), 0.022, bodyMat));
  g.add(between(new THREE.Vector3(0.36, 1.62, 0.2), new THREE.Vector3(0.36, 1.62, 0.32), 0.03, grip));
  g.add(between(new THREE.Vector3(0.36, 1.62, -0.2), new THREE.Vector3(0.36, 1.62, -0.32), 0.03, grip));
  const fender = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.022, 12, 40, Math.PI * 0.6), bodyMat);
  fender.position.set(-0.6, 0.225, 0);
  fender.rotation.z = Math.PI * 0.25;
  g.add(fender);
  return g;
}

// ---- Keyframes: one per section ------------------------------------------
const lerpAll = (a, b, t) => Object.fromEntries(PROPS.map((p) => [p, a[p] + (b[p] - a[p]) * t]));
const topOf = (el) => el.getBoundingClientRect().top + window.scrollY;

function buildKeys(sections) {
  const desk = window.innerWidth > 900;
  const H = window.innerHeight;
  const { story, my, map, closing } = sections;
  const hero = { rot: ROT0, scale: desk ? 0.82 : 0.7, xFrac: 0, yFrac: desk ? -0.31 : -0.3, camZ: 7, mapOpacity: 0.32, mapScale: 1.35, mapBlur: 3, mapTilt: 0, vignette: 1, sceneOpacity: 1 };
  const storyEnd = { ...hero, rot: ROT0 + TURN * (desk ? 1.25 : 1), scale: desk ? 0.58 : 0.6, xFrac: desk ? 0.42 : 0, yFrac: desk ? 0 : 0.3, camZ: 9, mapOpacity: 0.9, mapScale: 1, mapBlur: 0, vignette: 0.55 };
  const mine = { ...storyEnd, rot: ROT0 + TURN * 2, scale: desk ? 0.82 : 0.62, xFrac: desk ? 0.45 : 0, yFrac: desk ? 0 : 0.34, camZ: 8, mapOpacity: 0.32, mapBlur: 3, vignette: 0.95 };
  const mapK = { ...mine, rot: ROT0 + TURN * 2.5, scale: 0.3, xFrac: desk ? 0.62 : 0.3, yFrac: desk ? -0.45 : 0.5, mapOpacity: 1, mapScale: desk ? 1.12 : 1.5, mapBlur: 0, mapTilt: desk ? 34 : 22, vignette: 0.3, sceneOpacity: 0 };
  const end = { ...mapK, mapOpacity: 0.2, mapBlur: 5, mapTilt: 10, vignette: 1 };
  const yMy = topOf(my) + my.offsetHeight / 2 - H / 2;
  const yMap = topOf(map);
  return [
    [0, hero],
    [topOf(story) + story.offsetHeight - H, storyEnd],
    [yMy, mine],
    [yMy + (yMap - yMy) * 0.65, { ...lerpAll(mine, mapK, 0.65), sceneOpacity: 1 }], // fade only near the map
    [yMap, mapK],
    [topOf(closing) - H, mapK],
    [topOf(closing) - H * 0.3, end],
  ];
}

function targetsAt(keys, y) {
  if (y <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [y0, a] = keys[i], [y1, b] = keys[i + 1];
    if (y <= y1) return lerpAll(a, b, y1 === y0 ? 1 : (y - y0) / (y1 - y0));
  }
  return keys[keys.length - 1][1];
}

// ---- Mount / unmount ------------------------------------------------------
export function mountScooterScene({ canvas, root, sections, reducedMotion, canRotate }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 5, 4);
  const rim = new THREE.DirectionalLight(0x3cd6c4, 2.2);
  rim.position.set(-4, 2.5, -3);
  scene.add(key, rim, new THREE.HemisphereLight(0xa9c8ff, 0x0a111e, 0.55));

  const rig = new THREE.Group();
  const turntable = new THREE.Group();
  rig.add(turntable);
  scene.add(rig);

  let disposed = false;
  const useModel = (object) => {
    if (disposed) return;
    turntable.clear();
    turntable.add(fit(object), contactShadow());
  };
  new GLTFLoader().load(MODEL_URL, (gltf) => useModel(gltf.scene), undefined, () => useModel(placeholderScooter()));

  let keys = buildKeys(sections);
  const rebuild = () => { keys = buildKeys(sections); };
  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    rebuild();
  };
  window.addEventListener("resize", resize);
  resize();

  // drag to rotate (only where canRotate() says so)
  let dragRot = 0, dragVel = 0, dragging = false, lastX = 0;
  const down = (e) => {
    if (!canRotate()) return;
    dragging = true;
    lastX = e.clientX;
    root.classList.add("lp-dragging", "lp-rotated");
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!dragging) return;
    dragVel = (e.clientX - lastX) * 0.008;
    lastX = e.clientX;
    dragRot += dragVel;
  };
  const up = () => { dragging = false; root.classList.remove("lp-dragging"); };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  let mapZoom = 1;
  let L = null;
  const clock = new THREE.Clock();
  let raf = 0;
  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const target = reducedMotion ? STATIC : targetsAt(keys, window.scrollY);
    if (!L) L = { ...target };
    const k = reducedMotion ? 1 : 1 - Math.pow(0.0015, dt);
    for (const p of PROPS) L[p] += (target[p] - L[p]) * k;
    if (!dragging) { dragRot += dragVel; dragVel *= reducedMotion ? 0 : 0.92; }

    camera.position.set(0, 1.15, L.camZ);
    camera.lookAt(0, LOOK_Y, 0);
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * L.camZ;
    rig.position.set(L.xFrac * halfH * camera.aspect, L.yFrac * halfH, 0);
    rig.scale.setScalar(L.scale);
    turntable.position.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.2) * 0.012;
    turntable.rotation.y = L.rot + dragRot;

    const s = root.style;
    s.setProperty("--map-opacity", L.mapOpacity.toFixed(3));
    s.setProperty("--map-scale", (L.mapScale * mapZoom).toFixed(3));
    s.setProperty("--map-blur", L.mapBlur.toFixed(2) + "px");
    s.setProperty("--map-tilt", L.mapTilt.toFixed(2) + "deg");
    s.setProperty("--vignette", L.vignette.toFixed(3));
    s.setProperty("--scene-opacity", L.sceneOpacity.toFixed(3));

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    rebuild,
    setMapZoom: (z) => { mapZoom = z; },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      scene.traverse((o) => {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => { Object.values(m).forEach((v) => v?.isTexture && v.dispose()); m.dispose(); });
      });
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
