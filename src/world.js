import * as THREE from 'three';
import { CONFIG } from './config.js';
import { floorDiv, floorMod } from './noise.js';
import { BLOCK, getBlockDef } from './blocks.js';
import { ChunkColumn } from './chunk.js';
import { paddedIndex } from './mesher.js';

export function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

export function sectionKey(cx, cz, sy) {
  return `${cx},${cz},${sy}`;
}

export class World {
  constructor(scene, atlasTexture, seed = CONFIG.DEFAULT_SEED) {
    this.scene = scene;
    this.seed = seed;
    this.renderDistance = CONFIG.DEFAULT_RENDER_DISTANCE;

    this.chunks = new Map();
    this.pendingChunks = new Set();
    this.dirtySectionsQueue = [];
    this.dirtySectionsSet = new Set();
    this.prioritySectionsQueue = [];
    this.prioritySectionsSet = new Set();
    this.readyMeshUploads = [];

    // Group containers for 3 render passes
    this.opaqueGroup = new THREE.Group();
    this.cutoutGroup = new THREE.Group();
    this.transparentGroup = new THREE.Group();
    this.scene.add(this.opaqueGroup);
    this.scene.add(this.cutoutGroup);
    this.scene.add(this.transparentGroup);

    this.materials = {
      opaque: new THREE.MeshBasicMaterial({
        map: atlasTexture,
        vertexColors: true
      }),
      cutout: new THREE.MeshBasicMaterial({
        map: atlasTexture,
        vertexColors: true,
        alphaTest: 0.5,
        transparent: false
      }),
      transparent: new THREE.MeshBasicMaterial({
        map: atlasTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        depthWrite: false
      })
    };

    // Map<sectionKey, { opaque: Mesh|null, cutout: Mesh|null, transparent: Mesh|null }>
    this.sectionMeshes = new Map();

    this.jobIdCounter = 1;
    this.activeGenJobs = 0;

    this.worker = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module'
    });
    this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
  }

  handleWorkerMessage(msg) {
    if (msg.type === 'generated') {
      this.activeGenJobs = Math.max(0, this.activeGenJobs - 1);
      const key = chunkKey(msg.cx, msg.cz);
      this.pendingChunks.delete(key);

      const column = new ChunkColumn(msg.cx, msg.cz, msg);
      this.chunks.set(key, column);

      // Only queue sections that can contain blocks (up to max terrain height in chunk + 1)
      let maxH = 0;
      for (let i = 0; i < 256; i++) {
        if (column.heightmap[i] > maxH) maxH = column.heightmap[i];
      }
      const maxSy = Math.min(CONFIG.NUM_SECTIONS - 1, (maxH >> 4) + 1);

      for (let sy = 0; sy <= maxSy; sy++) {
        this.markSectionDirty(msg.cx, msg.cz, sy);
        this.markSectionDirty(msg.cx - 1, msg.cz, sy);
        this.markSectionDirty(msg.cx + 1, msg.cz, sy);
        this.markSectionDirty(msg.cx, msg.cz - 1, sy);
        this.markSectionDirty(msg.cx, msg.cz + 1, sy);
      }
    } else if (msg.type === 'meshed') {
      const sKey = sectionKey(msg.cx, msg.cz, msg.sy);
      this.pendingMeshes.delete(sKey);
      if (this.chunks.has(chunkKey(msg.cx, msg.cz))) {
        if (msg.priority) {
          this.applySectionMesh(msg.cx, msg.cz, msg.sy, msg.passes);
        } else {
          this.readyMeshUploads.push(msg);
        }
      }
    }
  }

  getChunk(cx, cz) {
    return this.chunks.get(chunkKey(cx, cz)) || null;
  }

  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= CONFIG.WORLD_HEIGHT) return BLOCK.AIR;
    const cx = floorDiv(wx, 16);
    const cz = floorDiv(wz, 16);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return BLOCK.AIR;
    const lx = floorMod(wx, 16);
    const lz = floorMod(wz, 16);
    return chunk.getBlock(lx, wy, lz);
  }

  getLightByte(wx, wy, wz) {
    if (wy < 0) return 0x00;
    if (wy >= CONFIG.WORLD_HEIGHT) return 0xf0;
    const cx = floorDiv(wx, 16);
    const cz = floorDiv(wz, 16);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 0xf0;
    const lx = floorMod(wx, 16);
    const lz = floorMod(wz, 16);
    return chunk.getLightByte(lx, wy, lz);
  }

  setBlock(wx, wy, wz, blockId) {
    if (wy < 0 || wy >= CONFIG.WORLD_HEIGHT) return false;
    const cx = floorDiv(wx, 16);
    const cz = floorDiv(wz, 16);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return false;

    const lx = floorMod(wx, 16);
    const lz = floorMod(wz, 16);
    const changed = chunk.setBlock(lx, wy, lz, blockId);
    if (!changed) return false;

    // Recompute column vertical skylight for immediate local accuracy
    this.recomputeColumnSkylight(chunk, lx, lz);

    const sy = wy >> 4;
    const ly = wy & 15;
    this.markSectionDirty(cx, cz, sy, true);

    // Remesh adjacent sections when a border voxel changes
    if (lx === 0) this.markSectionDirty(cx - 1, cz, sy, true);
    if (lx === 15) this.markSectionDirty(cx + 1, cz, sy, true);
    if (lz === 0) this.markSectionDirty(cx, cz - 1, sy, true);
    if (lz === 15) this.markSectionDirty(cx, cz + 1, sy, true);
    if (ly === 0 && sy > 0) this.markSectionDirty(cx, cz, sy - 1, true);
    if (ly === 15 && sy < CONFIG.NUM_SECTIONS - 1) this.markSectionDirty(cx, cz, sy + 1, true);

    return true;
  }

  recomputeColumnSkylight(chunk, lx, lz) {
    let sky = 15;
    for (let y = CONFIG.WORLD_HEIGHT - 1; y >= 0; y--) {
      const sy = y >> 4;
      const ly = y & 15;
      const sec = chunk.sections[sy];
      const idx = (ly << 8) | (lz << 4) | lx;
      const def = getBlockDef(sec.blocks[idx]);
      if (def.opacity >= 15) sky = 0;
      else if (def.opacity > 0) sky = Math.max(0, sky - def.opacity);
      sec.light[idx] = (sky << 4) | (def.emission & 0x0f);
    }
  }

  markSectionDirty(cx, cz, sy, priority = false) {
    if (sy < 0 || sy >= CONFIG.NUM_SECTIONS) return;
    if (!this.chunks.has(chunkKey(cx, cz))) return;
    const sKey = sectionKey(cx, cz, sy);
    if (priority) {
      if (!this.prioritySectionsSet.has(sKey)) {
        this.prioritySectionsSet.add(sKey);
        this.prioritySectionsQueue.push({ cx, cz, sy });
      }
      this.pendingMeshes.delete(sKey);
    } else {
      if (!this.dirtySectionsSet.has(sKey)) {
        this.dirtySectionsSet.add(sKey);
        this.dirtySectionsQueue.push({ cx, cz, sy });
      }
    }
  }

  buildSpiralOffsets(radius) {
    const coords = [];
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dz * dz <= (radius + 0.5) * (radius + 0.5)) {
          coords.push({ dx, dz, distSq: dx * dx + dz * dz });
        }
      }
    }
    coords.sort((a, b) => a.distSq - b.distSq);
    return coords;
  }

  updateChunksAroundPlayer(playerX, playerZ) {
    const centerCx = floorDiv(Math.floor(playerX), 16);
    const centerCz = floorDiv(Math.floor(playerZ), 16);
    const r = this.renderDistance;

    // 1. Unload out-of-range chunks
    const unloadDistSq = (r + 1.5) * (r + 1.5);
    for (const [key, chunk] of this.chunks.entries()) {
      const dx = chunk.cx - centerCx;
      const dz = chunk.cz - centerCz;
      if (dx * dx + dz * dz > unloadDistSq) {
        this.unloadChunk(chunk.cx, chunk.cz);
      }
    }

    // 2. Request missing chunks in spiral order
    if (this.activeGenJobs < CONFIG.MAX_CONCURRENT_CHUNK_JOBS) {
      const spiral = this.buildSpiralOffsets(r);
      for (let i = 0; i < spiral.length; i++) {
        if (this.activeGenJobs >= CONFIG.MAX_CONCURRENT_CHUNK_JOBS) break;
        const cx = centerCx + spiral[i].dx;
        const cz = centerCz + spiral[i].dz;
        const key = chunkKey(cx, cz);
        if (!this.chunks.has(key) && !this.pendingChunks.has(key)) {
          this.pendingChunks.add(key);
          this.activeGenJobs++;
          this.worker.postMessage({
            type: 'generate',
            jobId: this.jobIdCounter++,
            cx,
            cz,
            seed: this.seed
          });
        }
      }
    }

    // 3. Dispatch priority user interaction mesh jobs immediately
    while (this.prioritySectionsQueue.length > 0) {
      const item = this.prioritySectionsQueue.shift();
      const sKey = sectionKey(item.cx, item.cz, item.sy);
      this.prioritySectionsSet.delete(sKey);
      if (!this.chunks.has(chunkKey(item.cx, item.cz))) continue;

      this.pendingMeshes.add(sKey);
      const padded = this.extractPaddedSection(item.cx, item.cz, item.sy);
      if (!padded) {
        this.disposeSectionMesh(sKey);
        this.pendingMeshes.delete(sKey);
        continue;
      }
      this.worker.postMessage(
        {
          type: 'mesh',
          jobId: this.jobIdCounter++,
          cx: item.cx,
          cz: item.cz,
          sy: item.sy,
          priority: true,
          paddedBlocks: padded.paddedBlocks.buffer,
          paddedLight: padded.paddedLight.buffer
        },
        [padded.paddedBlocks.buffer, padded.paddedLight.buffer]
      );
    }

    // 4. Dispatch background dirty section mesh jobs to worker
    let dispatched = 0;
    while (this.dirtySectionsQueue.length > 0 && dispatched < 12) {
      const item = this.dirtySectionsQueue.shift();
      const sKey = sectionKey(item.cx, item.cz, item.sy);
      this.dirtySectionsSet.delete(sKey);

      if (!this.chunks.has(chunkKey(item.cx, item.cz))) continue;
      if (this.pendingMeshes.has(sKey)) continue;

      this.pendingMeshes.add(sKey);
      const padded = this.extractPaddedSection(item.cx, item.cz, item.sy);
      if (!padded) {
        this.disposeSectionMesh(sKey);
        this.pendingMeshes.delete(sKey);
        continue;
      }
      this.worker.postMessage(
        {
          type: 'mesh',
          jobId: this.jobIdCounter++,
          cx: item.cx,
          cz: item.cz,
          sy: item.sy,
          priority: false,
          paddedBlocks: padded.paddedBlocks.buffer,
          paddedLight: padded.paddedLight.buffer
        },
        [padded.paddedBlocks.buffer, padded.paddedLight.buffer]
      );
      dispatched++;
    }

    // 5. Upload completed section meshes to Three.js scene
    let uploads = 0;
    while (this.readyMeshUploads.length > 0 && uploads < CONFIG.MAX_MESH_UPLOADS_PER_FRAME) {
      const msg = this.readyMeshUploads.shift();
      this.applySectionMesh(msg.cx, msg.cz, msg.sy, msg.passes);
      uploads++;
    }
  }

  extractPaddedSection(cx, cz, sy) {
    const paddedBlocks = new Uint16Array(5832);
    const paddedLight = new Uint8Array(5832);
    paddedLight.fill(0xf0);

    const baseWx = cx << 4;
    const baseWy = sy << 4;
    const baseWz = cz << 4;

    const centerChunk = this.getChunk(cx, cz);
    const centerSec = centerChunk ? centerChunk.sections[sy] : null;
    if (!centerSec || centerSec.nonAirCount === 0) {
      return null;
    }

    // Fast path for interior 16x16x16
    for (let ly = 0; ly < 16; ly++) {
      for (let lz = 0; lz < 16; lz++) {
        const srcRow = (ly << 8) | (lz << 4);
        const dstRow = paddedIndex(0, ly, lz);
        for (let lx = 0; lx < 16; lx++) {
          paddedBlocks[dstRow + lx] = centerSec.blocks[srcRow + lx];
          paddedLight[dstRow + lx] = centerSec.light[srcRow + lx];
        }
      }
    }

    // Populate 1-voxel halo border
    for (let ly = -1; ly <= 16; ly++) {
      for (let lz = -1; lz <= 16; lz++) {
        for (let lx = -1; lx <= 16; lx++) {
          if (lx >= 0 && lx < 16 && ly >= 0 && ly < 16 && lz >= 0 && lz < 16) {
            continue;
          }
          const wx = baseWx + lx;
          const wy = baseWy + ly;
          const wz = baseWz + lz;
          const pIdx = paddedIndex(lx, ly, lz);
          paddedBlocks[pIdx] = this.getBlock(wx, wy, wz);
          paddedLight[pIdx] = this.getLightByte(wx, wy, wz);
        }
      }
    }

    return { paddedBlocks, paddedLight };
  }

  applySectionMesh(cx, cz, sy, passes) {
    if (!this.chunks.has(chunkKey(cx, cz))) return;
    const sKey = sectionKey(cx, cz, sy);
    this.disposeSectionMesh(sKey);

    const holder = { opaque: null, cutout: null, transparent: null };
    const worldX = cx * 16;
    const worldY = sy * 16;
    const worldZ = cz * 16;

    const buildPassMesh = (passData, material, group, renderOrder) => {
      if (!passData || passData.vertexCount === 0) return null;
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(passData.positions), 3));
      geom.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(passData.normals), 3));
      geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(passData.uvs), 2));
      geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(passData.colors), 3));
      geom.setIndex(new THREE.BufferAttribute(new Uint32Array(passData.indices), 1));
      geom.computeBoundingSphere();

      const mesh = new THREE.Mesh(geom, material);
      mesh.position.set(worldX, worldY, worldZ);
      mesh.renderOrder = renderOrder;
      mesh.frustumCulled = true;
      group.add(mesh);
      return mesh;
    };

    holder.opaque = buildPassMesh(passes.opaque, this.materials.opaque, this.opaqueGroup, 0);
    holder.cutout = buildPassMesh(passes.cutout, this.materials.cutout, this.cutoutGroup, 1);
    holder.transparent = buildPassMesh(passes.transparent, this.materials.transparent, this.transparentGroup, 2);

    this.sectionMeshes.set(sKey, holder);
  }

  disposeSectionMesh(sKey) {
    const existing = this.sectionMeshes.get(sKey);
    if (!existing) return;
    if (existing.opaque) {
      this.opaqueGroup.remove(existing.opaque);
      existing.opaque.geometry.dispose();
    }
    if (existing.cutout) {
      this.cutoutGroup.remove(existing.cutout);
      existing.cutout.geometry.dispose();
    }
    if (existing.transparent) {
      this.transparentGroup.remove(existing.transparent);
      existing.transparent.geometry.dispose();
    }
    this.sectionMeshes.delete(sKey);
  }

  unloadChunk(cx, cz) {
    this.chunks.delete(chunkKey(cx, cz));
    for (let sy = 0; sy < CONFIG.NUM_SECTIONS; sy++) {
      this.disposeSectionMesh(sectionKey(cx, cz, sy));
    }
  }

  getSurfaceHeightAt(wx, wz) {
    const cx = floorDiv(Math.floor(wx), 16);
    const cz = floorDiv(Math.floor(wz), 16);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return CONFIG.SEA_LEVEL + 6;
    const lx = floorMod(Math.floor(wx), 16);
    const lz = floorMod(Math.floor(wz), 16);
    return chunk.heightmap[(lz << 4) | lx];
  }

  getRenderedSectionCount() {
    let count = 0;
    for (const h of this.sectionMeshes.values()) {
      if (h.opaque || h.cutout || h.transparent) count++;
    }
    return count;
  }
}
