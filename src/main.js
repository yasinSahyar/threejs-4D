import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let container, camera, scene, renderer, cube;
let controls;
let moveState = { forward: 0, back: 0, left: 0, right: 0 };
let moveSpeed = 6; // units per second
let lastTime = performance.now();

init();

function init() {
  // prefer attaching renderer to existing #app element in index.html
  container = document.getElementById('app');
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  // make sure the container fills available space
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.margin = '0';
  container.style.padding = '0';

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  // place the camera so the full grid is visible on load
  camera.position.set(0, 6, 12);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // make canvas scale to container
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  // Cube
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Add sample geometries (grid)
  createGeometries();

  // Light and helpers
  const light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
  scene.add(light);

  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // Start render loop
  renderer.setAnimationLoop(animate);

  // Orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // smoothes camera movement
  controls.dampingFactor = 0.05;
  // start looking at origin (where geometries will be centered)
  controls.target.set(0, 0.6, 0);
  controls.update();

  // WASD movement state
  initWASDControls();

  // HUD for controls
  createHUD();

  // Handle resize
  window.addEventListener('resize', onWindowResize, false);
}

function createHUD() {
  const hud = document.createElement('div');
  hud.id = 'wasd-hud';
  hud.style.position = 'fixed';
  hud.style.left = '90px';
  // hud.style.top = '50%';
  hud.style.transform = 'translateY(-50%)';
  hud.style.maxWidth = '220px';
  hud.style.padding = '10px 12px';
  hud.style.background = 'rgba(0,0,0,0.6)';
  hud.style.color = '#fff';
  hud.style.fontFamily = 'sans-serif';
  hud.style.fontSize = '13px';
  hud.style.borderRadius = '6px';
  hud.style.zIndex = '9999';
  hud.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px;">Controls</div>
    <div>W / S - forward / back</div>
    <div>A / D - left / right</div>
    <div style="margin-top:6px; font-size:12px; opacity:0.9">Click canvas to focus. Use mouse to orbit.</div>
    <div style="margin-top:8px; text-align:right;"><button id="hud-hide" style="background:#fff;color:#000;border:none;padding:4px 6px;border-radius:4px;cursor:pointer">Hide</button></div>
  `;
  document.body.appendChild(hud);

  const btn = document.getElementById('hud-hide');
  btn.addEventListener('click', () => {
    hud.style.display = 'none';
  });
}

function createGeometries() {
  const materials = [
    new THREE.MeshPhongMaterial({ color: 0xff4444 }),
    new THREE.MeshPhongMaterial({ color: 0x44ff44 }),
    new THREE.MeshPhongMaterial({ color: 0x4444ff }),
    new THREE.MeshPhongMaterial({ color: 0xffff44 })
  ];

  const geometries = [
    new THREE.SphereGeometry(0.9, 20, 12),
    new THREE.IcosahedronGeometry(0.9),
    new THREE.OctahedronGeometry(0.9),
    new THREE.TetrahedronGeometry(0.9),
    new THREE.PlaneGeometry(1.6, 1.6, 4, 4),
    new THREE.BoxGeometry(1.2, 1.2, 1.2, 2, 2, 2),
    new THREE.CircleGeometry(0.8, 32),
    new THREE.RingGeometry(0.2, 0.8, 32),
    new THREE.CylinderGeometry(0.4, 0.9, 1.2, 16, 1),
    new THREE.TorusGeometry(0.8, 0.25, 16, 32),
    new THREE.TorusKnotGeometry(0.6, 0.18, 64, 8),
    new THREE.CapsuleGeometry(0.3, 0.8, 4, 8)
  ];

  const rows = 4;
  const cols = 4;
  const spacing = 3.0;
  let index = 0;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const geo = geometries[index % geometries.length];
      const mat = materials[(i + j) % materials.length];
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.x = (i - (rows - 1) / 2) * spacing + 8; // offset so camera starts near
      mesh.position.z = (j - (cols - 1) / 2) * spacing;
      mesh.position.y = 0.6;
      mesh.rotation.y = Math.PI * 0.1 * (i + j);
      scene.add(mesh);
      index++;
    }
  }

  // Additional parametric shapes
  // simple klein / mobius could be added if needed via ParametricGeometry import
}

function animate() {
  const now = performance.now();
  const delta = (now - lastTime) / 1000; // seconds
  lastTime = now;

  // apply WASD movement
  updateMovement(delta);

  // rotate the main cube a bit
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  // rotate all other meshes in the scene
  scene.traverse(function (object) {
    if (object.isMesh && object !== cube) {
      object.rotation.x += 0.005;
      object.rotation.y += 0.01;
    }
  });

  // update controls for damping
  if (controls) controls.update();

  renderer.render(scene, camera);
}

function initWASDControls() {
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW': moveState.forward = 1; break;
      case 'KeyS': moveState.back = 1; break;
      case 'KeyA': moveState.left = 1; break;
      case 'KeyD': moveState.right = 1; break;
    }
  });
  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': moveState.forward = 0; break;
      case 'KeyS': moveState.back = 0; break;
      case 'KeyA': moveState.left = 0; break;
      case 'KeyD': moveState.right = 0; break;
    }
  });
}

function updateMovement(delta) {
  const dir = new THREE.Vector3();
  // forward/back relative to camera direction (ignore y)
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(camera.up, dir).normalize();

  const move = new THREE.Vector3();
  if (moveState.forward) move.add(dir);
  if (moveState.back) move.sub(dir);
  if (moveState.left) move.addScaledVector(right, 1);
  if (moveState.right) move.addScaledVector(right, -1);

  if (move.lengthSq() > 0) {
    move.normalize();
    move.multiplyScalar(moveSpeed * delta);
    camera.position.add(move);
    // also move the controls target so orbit center follows camera movements
    controls.target.add(move);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
