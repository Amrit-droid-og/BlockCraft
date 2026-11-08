# BlockCraft ⛏️

<div align="center">

  <img src="https://raw.githubusercontent.com/Amrit-droid-og/BlockCraft/main/docs/banner.png" alt="BlockCraft Voxel Engine Banner" width="100%" onerror="this.style.display='none'"/>

  ### 🌐 A High-Performance WebGL 3D Voxel Sandbox Engine & Minecraft Core
  **Engineered with Three.js, Procedural Chunk Meshing, and Real-Time Web Workers**

  <p align="center">
    <a href="https://github.com/Amrit-droid-og/BlockCraft/stargazers"><img src="https://img.shields.io/github/stars/Amrit-droid-og/BlockCraft?color=f59e0b&label=Stars&logo=github&style=for-the-badge" alt="GitHub Stars" /></a>
    <a href="https://github.com/Amrit-droid-og/BlockCraft/network/members"><img src="https://img.shields.io/github/forks/Amrit-droid-og/BlockCraft?color=3b82f6&label=Forks&logo=github&style=for-the-badge" alt="GitHub Forks" /></a>
    <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-r160-black?style=for-the-badge&logo=three.js" alt="Three.js" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API"><img src="https://img.shields.io/badge/WebGL-2.0-990000?style=for-the-badge&logo=webgl&logoColor=white" alt="WebGL 2.0" /></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge" alt="MIT License" /></a>
  </p>

  <p align="center">
    <b>Explore infinite voxel worlds directly in your web browser with zero plugins or installation required.</b>
  </p>

</div>

---

## 📖 Overview

**BlockCraft** is a lightweight, high-performance browser-based 3D voxel sandbox engine built from the ground up using **Three.js** and modern **JavaScript (ES Modules)**. Designed to faithfully replicate the core feel, physics, and world-generation algorithms of classic voxel games like Minecraft, BlockCraft executes real-time chunk meshing, AABB physics, procedural texture synthesis, and multithreaded terrain computation at a rock-solid 60 FPS.

Whether you are studying 3D graphics rendering, voxel optimization techniques (such as face culling and greedy meshing), or exploring game physics architectures, BlockCraft delivers a modular, transparent, and battle-tested codebase.

---

## ✨ Core Features

### 🌍 Infinite Procedural World Generation
- **Multi-Octave Simplex & Perlin Noise**: Dynamically calculates elevation, continental shapes, mountain ranges, and biome transitions.
- **Subterranean 3D Cave Networks**: Generates natural worm caves and caverns using 3D Perlin noise thresholds.
- **Vertical Chunk Sections**: 16×16×256 voxel columns segmented into 16 vertical sections for spatial hierarchy and memory optimization.
- **Foliage & Ore Seeding**: Procedural oak trees, surface vegetation, water tables at Sea Level ($Y=63$), and stratified bedrock barriers ($Y \le 4$).

### ⚡ Optimized Chunk Meshing & Web Workers
- **Face Culling Algorithm**: Renders only exposed boundary faces between opaque and transparent/air blocks, slashing vertex counts by over 80%.
- **Off-Thread Terrain Generation**: Heavy math for chunk terrain calculation is dispatched to background **Web Workers** (`worker.js`), ensuring smooth UI rendering and zero frame drops during movement.
- **Dynamic Render Distance**: Real-time chunk streaming around player coordinates with configurable horizons (4 to 16 chunks).

### 🏃 Authentic First-Person Physics Pipeline
- **Fixed-Step Simulation Loop**: Runs deterministic physics calculations at **20 TPS (Ticks Per Second)** decoupled from the rendering loop via delta accumulation and state interpolation.
- **Voxel AABB Collision Detection**: Precise multi-axis player bounding box resolution preventing clipping into walls, ceilings, and terrain.
- **Dynamic Movement States**:
  - 🚶 Walking ($4.317\text{ m/s}$)
  - 🏃 Sprinting ($5.612\text{ m/s}$) with FOV velocity scaling
  - 🧘 Sneaking ($1.295\text{ m/s}$) with camera dip and edge fall prevention
  - 🕊️ Creative Flight Mode with smooth vertical ascent/descent impulses
- **Realistic Slipperiness & Drag**: Fine-tuned per-tick friction, gravitational acceleration ($0.08\text{ blocks/tick}^2$), and terminal velocity damping.

### ⛏️ Raycast Voxel Interaction & Dynamic Cracking
- **Fast Voxel Ray Traversal**: Digital Differential Analyzer (DDA) raycasting identifies exact intersected voxel faces up to 5 blocks away.
- **Procedural 10-Stage Crack Animations**: Interactive block degradation with animated overlay meshes reflecting structural damage progress.
- **Instant Placement & Breaking**: Seamless block destruction and voxel surface placement with immediate adjacent chunk neighbor re-meshing.

### 🎨 100% Procedural Texture Atlas Engine
- **No External Image Assets**: Eliminates network latency by synthesizing 16×16 pixel pixel-art textures procedurally on an HTML5 canvas:
  - 🌿 *Grass Block* (multi-sided texture mapping with grassy top, soil base, and dirt-fringe overhangs)
  - 🪨 *Stone, Cobblestone, Bedrock, and Dirt*
  - 🪵 *Oak Wood Log (radial ring tops & bark grain) and Oak Leaves*
  - 🏖️ *Sand, Glass, Planks, and Bricks*
- **Nearest-Neighbor Filtering**: Crisp retro pixelated fidelity (`THREE.NearestFilter`) without blur or mipmap bleeding.

### 🖥️ Authentic HUD & Debug Overlay
- **F3 Debug Telemetry**: Detailed real-time HUD displaying XYZ coordinates, facing direction, chunk section, biome metadata, active render distance, and smoothed FPS.
- **Interactive Hotbar**: 9-slot inventory bar with active selection rings and procedurally rendered icon previews.
- **Difference-Blend Crosshair**: Dynamic center targeting reticle with CSS `mix-blend-mode: difference` for high contrast against any block surface.

---

## 🕹️ Controls & Keybindings

| Key / Input | Action |
| :--- | :--- |
| **`W` / `A` / `S` / `D`** | Move Forward / Left / Backward / Right |
| **`Mouse`** | First-Person Camera Look (Pointer Lock) |
| **`Left Click`** | Mine / Break targeted block |
| **`Right Click`** | Place selected block from hotbar |
| **`Space`** | Jump / Ascend (in Flying mode) |
| **`Left Shift`** | Sneak / Crouch / Descend (in Flying mode) |
| **`Left Ctrl`** | Sprint |
| **`F`** | Toggle Creative Flight Mode |
| **`1` – `9`** | Select Hotbar Item Slot |
| **`Scroll Wheel`** | Cycle through Hotbar Blocks |
| **`F3`** | Toggle Debug Diagnostics Overlay |
| **`[` / `]`** | Decrease / Increase Render Distance |
| **`Escape`** | Release Mouse Pointer Lock |

---

## 🏗️ Architecture & Project Structure

```
minecraft/
├── index.html          # Canvas root, HUD elements, CSS crosshair & F3 overlay
├── package.json        # Dependencies (Three.js) & build configuration
├── vite.config.js      # Vite bundle optimizer and asset server
└── src/
    ├── main.js         # Engine entry point, fixed-tick loop, and scene setup
    ├── config.js       # Game constants, physics coefficients, and block IDs
    ├── blocks.js       # Block definitions & procedural canvas texture generator
    ├── world.js        # Chunk manager, render distance queues, and meshing pipeline
    ├── chunk.js        # 16x16x256 voxel column container and section partitioning
    ├── mesher.js       # Face culling algorithm & Three.js BufferGeometry builder
    ├── generator.js    # Perlin/Simplex terrain, elevation, and biome math
    ├── worker.js       # Web Worker for asynchronous chunk computation
    ├── noise.js        # 2D & 3D gradient noise implementations
    ├── player.js       # AABB physics engine, input coordinator, and camera controls
    ├── raycast.js      # Fast voxel raycaster and face-normal detector
    └── hud.js          # Hotbar inventory renderer and F3 telemetry binder
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v16.0 or higher) and `npm` installed.

### 1. Clone the Repository
```bash
git clone https://github.com/Amrit-droid-og/BlockCraft.git
cd BlockCraft
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173/` (or the URL displayed in your terminal). Click anywhere on the screen to engage the pointer lock and start exploring!

### 4. Build for Production
```bash
npm run build
```
The compiled, tree-shaken, and optimized production bundle will be output to `./dist`.

---

## ⚡ Performance Optimizations

1. **Sectional Meshing**: Chunks are split into sixteen $16 \times 16 \times 16$ sections. Empty air sections produce zero geometry, conserving GPU memory.
2. **Backface & Hidden Face Culling**: Internal voxel faces that share a boundary with adjacent opaque blocks are skipped during geometry assembly.
3. **Decoupled Physics Tick**: Fixed 20 TPS physics calculations ensure consistent jump heights and collision bounds regardless of whether the client runs at 60 Hz, 144 Hz, or 240 Hz displays.
4. **Single Draw-Call Atlas**: All block surfaces are mapped from a single dynamically generated texture atlas, minimizing WebGL context switches.

---

## 🗺️ Roadmap

- [ ] Dynamic day/night sun cycle with shadow mapping
- [ ] Liquid simulation (water and lava spread physics)
- [ ] Multiplayer support via WebSockets / WebRTC data channels
- [ ] Sound effects engine via Web Audio API (synthesized footstep and block strike sounds)
- [ ] Custom inventory crafting table grid (2x2 and 3x3 recipe resolution)

---

## 🤝 Contributing

Contributions, issues, and feature suggestions are welcome!
Feel free to check out the [issues page](https://github.com/Amrit-droid-og/BlockCraft/issues) or submit a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

---

<div align="center">
  <sub>Crafted with passion by <a href="https://github.com/Amrit-droid-og">Amrit</a> • Show some ❤️ by starring this repository!</sub>
</div>
