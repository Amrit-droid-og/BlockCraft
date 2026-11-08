import { CONFIG } from './config.js';

export function sectionIndex(lx, ly, lz) {
  return (ly << 8) | (lz << 4) | lx;
}

export class ChunkSection {
  constructor(sy, buffers = null) {
    this.sy = sy;
    this.nonAirCount = 0;
    if (buffers) {
      this.blocks = new Uint16Array(buffers.blocks);
      this.light = new Uint8Array(buffers.light);
      this.meta = new Uint8Array(buffers.meta);
      for (let i = 0; i < 4096; i++) {
        if (this.blocks[i] !== 0) this.nonAirCount++;
      }
    } else {
      this.blocks = new Uint16Array(4096);
      this.light = new Uint8Array(4096);
      this.light.fill(0xf0); // Default full skylight 15, blocklight 0
      this.meta = new Uint8Array(4096);
    }
    this.dirty = true;
  }

  getBlock(lx, ly, lz) {
    return this.blocks[(ly << 8) | (lz << 4) | lx];
  }

  setBlock(lx, ly, lz, id) {
    const idx = (ly << 8) | (lz << 4) | lx;
    const old = this.blocks[idx];
    if (old !== id) {
      if (old === 0 && id !== 0) this.nonAirCount++;
      else if (old !== 0 && id === 0) this.nonAirCount--;
      this.blocks[idx] = id;
      this.dirty = true;
      return true;
    }
    return false;
  }

  getSkylight(lx, ly, lz) {
    return (this.light[(ly << 8) | (lz << 4) | lx] >> 4) & 0x0f;
  }

  setSkylight(lx, ly, lz, val) {
    const idx = (ly << 8) | (lz << 4) | lx;
    this.light[idx] = (this.light[idx] & 0x0f) | ((val & 0x0f) << 4);
  }

  getBlocklight(lx, ly, lz) {
    return this.light[(ly << 8) | (lz << 4) | lx] & 0x0f;
  }

  setBlocklight(lx, ly, lz, val) {
    const idx = (ly << 8) | (lz << 4) | lx;
    this.light[idx] = (this.light[idx] & 0xf0) | (val & 0x0f);
  }
}

export class ChunkColumn {
  constructor(cx, cz, generatedData = null) {
    this.cx = cx;
    this.cz = cz;
    this.sections = new Array(CONFIG.NUM_SECTIONS);
    this.heightmap = generatedData
      ? new Uint8Array(generatedData.heightmap)
      : new Uint8Array(256);

    for (let sy = 0; sy < CONFIG.NUM_SECTIONS; sy++) {
      this.sections[sy] = new ChunkSection(
        sy,
        generatedData ? generatedData.sections[sy] : null
      );
    }
  }

  getBlock(lx, y, lz) {
    if (y < 0 || y >= CONFIG.WORLD_HEIGHT) return 0;
    const sy = y >> 4;
    const ly = y & 15;
    return this.sections[sy].getBlock(lx, ly, lz);
  }

  setBlock(lx, y, lz, id) {
    if (y < 0 || y >= CONFIG.WORLD_HEIGHT) return false;
    const sy = y >> 4;
    const ly = y & 15;
    const changed = this.sections[sy].setBlock(lx, ly, lz, id);
    if (changed) {
      const hIdx = (lz << 4) | lx;
      if (id !== 0 && y >= this.heightmap[hIdx]) {
        this.heightmap[hIdx] = y;
      } else if (id === 0 && y === this.heightmap[hIdx]) {
        let ny = y - 1;
        while (ny > 0 && this.getBlock(lx, ny, lz) === 0) ny--;
        this.heightmap[hIdx] = ny;
      }
    }
    return changed;
  }

  getLightByte(lx, y, lz) {
    if (y < 0) return 0x00;
    if (y >= CONFIG.WORLD_HEIGHT) return 0xf0;
    const sy = y >> 4;
    const ly = y & 15;
    return this.sections[sy].light[(ly << 8) | (lz << 4) | lx];
  }
}
