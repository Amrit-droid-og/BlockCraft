import * as THREE from 'three';
import { CONFIG } from './config.js';
import { generateTextureAtlasCanvas, generateCrackStagesCanvases } from './blocks.js';
import { World } from './world.js';
import { Player } from './player.js';
import { HUD } from './hud.js';

const canvas = document.getElementById('game-canvas');
const banner = document.getElementById('instructions-banner');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x78a7ff);
renderer.sortObjects = true;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x78a7ff, 0.0055);

const camera = new THREE.PerspectiveCamera(
  CONFIG.FOV,
  window.innerWidth / window.innerHeight,
  CONFIG.NEAR_PLANE,
  CONFIG.FAR_PLANE
);

// Generate procedural 16x16 tile atlas texture
const atlasCanvas = generateTextureAtlasCanvas();
const atlasTexture = new THREE.CanvasTexture(atlasCanvas);
atlasTexture.magFilter = THREE.NearestFilter;
atlasTexture.minFilter = THREE.NearestFilter;
atlasTexture.colorSpace = THREE.SRGBColorSpace;
atlasTexture.needsUpdate = true;

// Generate 10 procedural crack stage textures
const crackCanvases = generateCrackStagesCanvases();
const crackTextures = crackCanvases.map((c) => {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
});

const world = new World(scene, atlasTexture, CONFIG.DEFAULT_SEED);
const player = new Player(world, camera, crackTextures, canvas);
const hud = new HUD(player, world, atlasCanvas);

// Pointer lock binding
banner.addEventListener('click', () => {
  canvas.requestPointerLock();
});
canvas.addEventListener('click', () => {
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
});
document.addEventListener('pointerlockchange', () => {
  banner.classList.toggle('hidden', document.pointerLockElement === canvas);
});

// Render distance hotkeys ([ and ])
window.addEventListener('keydown', (e) => {
  if (e.code === 'BracketLeft') {
    world.renderDistance = Math.max(CONFIG.MIN_RENDER_DISTANCE, world.renderDistance - 1);
  } else if (e.code === 'BracketRight') {
    world.renderDistance = Math.min(CONFIG.MAX_RENDER_DISTANCE, world.renderDistance + 1);
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Fixed 20 TPS simulation loop + interpolated render loop
let lastFrameTime = performance.now();
let accumulator = 0;
let fpsSmoothed = 60;

function frame(now) {
  requestAnimationFrame(frame);

  const rawDelta = now - lastFrameTime;
  lastFrameTime = now;
  const clampedDelta = Math.min(rawDelta, 250);
  accumulator += clampedDelta;

  if (rawDelta > 0) {
    fpsSmoothed = fpsSmoothed * 0.92 + (1000 / rawDelta) * 0.08;
  }

  while (accumulator >= CONFIG.TICK_MS) {
    player.tick();
    world.updateChunksAroundPlayer(player.pos.x, player.pos.z);
    accumulator -= CONFIG.TICK_MS;
  }

  const alpha = accumulator / CONFIG.TICK_MS;
  player.syncCamera(alpha);
  hud.update(fpsSmoothed);

  renderer.render(scene, camera);
}

requestAnimationFrame(frame);
