import * as THREE from 'three';

let scene, camera, renderer;

export function initScene() {
  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x87CEEB, 80, 250);

  // Camera – third-person behind and above car
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 6, 10);
  camera.lookAt(0, 1, -10);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.body.prepend(renderer.domElement);

  // Sky background
  scene.background = new THREE.Color(0x87CEEB);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
  sun.position.set(20, 40, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  scene.add(sun);

  // Ground plane (grass/sidewalk)
  const groundGeo = new THREE.PlaneGeometry(200, 800);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x5a8f3c, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -300;
  ground.receiveShadow = true;
  scene.add(ground);

  // Handle resize
  window.addEventListener('resize', onResize);

  return { scene, camera, renderer };
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
