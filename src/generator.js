import { CONFIG } from './config.js';
import { SimplexNoise, hashCoords } from './noise.js';
import { BLOCK, getBlockDef } from './blocks.js';

export class TerrainGenerator {
  constructor(seed = CONFIG.DEFAULT_SEED) {
    this.seed = seed;
    this.elevNoise = new SimplexNoise(seed);
    this.detailNoise = new SimplexNoise(seed ^ 0x5f3759df);
    this.oreNoise = new SimplexNoise(seed ^ 0x13579bdf);
  }

  computeSurfaceHeight(wx, wz) {
    const continental = this.elevNoise.fbm2D(wx * 0.004, wz * 0.004, 4, 0.5, 2.0);
    const hills = this.detailNoise.fbm2D(wx * 0.018, wz * 0.018, 3, 0.5, 2.0);
    const height = Math.floor(CONFIG.SEA_LEVEL + 4 + continental * 22 + hills * 8);
    return Math.max(8, Math.min(CONFIG.WORLD_HEIGHT - 16, height));
  }

  generateChunkData(cx, cz) {
    const sections = new Array(CONFIG.NUM_SECTIONS);
    for (let sy = 0; sy < CONFIG.NUM_SECTIONS; sy++) {
      sections[sy] = {
        blocks: new Uint16Array(4096),
        light: new Uint8Array(4096),
        meta: new Uint8Array(4096)
      };
    }
    const heightmap = new Uint8Array(256);

    const setBlockLocal = (lx, y, lz, id) => {
      if (y < 0 || y >= CONFIG.WORLD_HEIGHT) return;
      const sy = y >> 4;
      const ly = y & 15;
      sections[sy].blocks[(ly << 8) | (lz << 4) | lx] = id;
    };

    const getBlockLocal = (lx, y, lz) => {
      if (y < 0 || y >= CONFIG.WORLD_HEIGHT) return BLOCK.AIR;
      const sy = y >> 4;
      const ly = y & 15;
      return sections[sy].blocks[(ly << 8) | (lz << 4) | lx];
    };

    // Pass 1: Base stratigraphy + water + ores
    for (let lz = 0; lz < 16; lz++) {
      for (let lx = 0; lx < 16; lx++) {
        const wx = (cx << 4) + lx;
        const wz = (cz << 4) + lz;
        const surfY = this.computeSurfaceHeight(wx, wz);
        heightmap[(lz << 4) | lx] = Math.max(surfY, CONFIG.SEA_LEVEL);

        for (let y = 0; y <= Math.max(surfY, CONFIG.SEA_LEVEL); y++) {
          let blockId = BLOCK.AIR;
          if (y === 0) {
            blockId = BLOCK.BEDROCK;
          } else if (y <= CONFIG.BEDROCK_MAX_Y && hashCoords(wx, y, wz, this.seed) < (CONFIG.BEDROCK_MAX_Y - y) * 0.25) {
            blockId = BLOCK.BEDROCK;
          } else if (y < surfY - 3) {
            blockId = BLOCK.STONE;
            // Basic ore veins
            const oreVal = this.oreNoise.noise3D(wx * 0.14, y * 0.14, wz * 0.14);
            if (oreVal > 0.72) {
              if (y < 16 && oreVal > 0.81) blockId = BLOCK.DIAMOND_ORE;
              else if (y < 32 && oreVal > 0.78) blockId = BLOCK.GOLD_ORE;
              else if (y < 64 && oreVal > 0.75) blockId = BLOCK.IRON_ORE;
              else blockId = BLOCK.COAL_ORE;
            }
          } else if (y < surfY) {
            blockId = surfY <= CONFIG.SEA_LEVEL + 2 ? BLOCK.SAND : BLOCK.DIRT;
          } else if (y === surfY) {
            if (surfY < CONFIG.SEA_LEVEL - 1) {
              blockId = BLOCK.GRAVEL;
            } else if (surfY <= CONFIG.SEA_LEVEL + 1) {
              blockId = BLOCK.SAND;
            } else {
              blockId = BLOCK.GRASS;
            }
          } else if (y <= CONFIG.SEA_LEVEL) {
            blockId = BLOCK.WATER;
          }

          if (blockId !== BLOCK.AIR) {
            setBlockLocal(lx, y, lz, blockId);
          }
        }
      }
    }

    // Pass 2: Simple Oak Trees (padded away from chunk borders so canopies don't clip)
    for (let lz = 3; lz <= 12; lz++) {
      for (let lx = 3; lx <= 12; lx++) {
        const wx = (cx << 4) + lx;
        const wz = (cz << 4) + lz;
        const surfY = heightmap[(lz << 4) | lx];
        if (surfY > CONFIG.SEA_LEVEL + 2 && getBlockLocal(lx, surfY, lz) === BLOCK.GRASS) {
          const treeChance = hashCoords(wx, 0, wz, this.seed + 101);
          if (treeChance < 0.012) {
            const trunkHeight = 4 + Math.floor(hashCoords(wx, 1, wz, this.seed) * 2);
            setBlockLocal(lx, surfY, lz, BLOCK.DIRT);
            for (let ty = 1; ty <= trunkHeight; ty++) {
              setBlockLocal(lx, surfY + ty, lz, BLOCK.OAK_LOG);
            }
            for (let lyOff = trunkHeight - 2; lyOff <= trunkHeight + 1; lyOff++) {
              const radius = lyOff >= trunkHeight ? 1 : 2;
              for (let dz = -radius; dz <= radius; dz++) {
                for (let dx = -radius; dx <= radius; dx++) {
                  if (Math.abs(dx) === radius && Math.abs(dz) === radius && lyOff > trunkHeight - 2) {
                    continue;
                  }
                  const tx = lx + dx;
                  const ty = surfY + lyOff;
                  const tz = lz + dz;
                  if (getBlockLocal(tx, ty, tz) === BLOCK.AIR) {
                    setBlockLocal(tx, ty, tz, BLOCK.OAK_LEAVES);
                  }
                }
              }
            }
            if (surfY + trunkHeight + 1 > heightmap[(lz << 4) | lx]) {
              heightmap[(lz << 4) | lx] = surfY + trunkHeight + 1;
            }
          }
        }
      }
    }

    // Pass 3: Initial Top-Down Skylight Column Sweep
    for (let lz = 0; lz < 16; lz++) {
      for (let lx = 0; lx < 16; lx++) {
        let sky = 15;
        for (let y = CONFIG.WORLD_HEIGHT - 1; y >= 0; y--) {
          const sy = y >> 4;
          const ly = y & 15;
          const idx = (ly << 8) | (lz << 4) | lx;
          const blockId = sections[sy].blocks[idx];
          const def = getBlockDef(blockId);
          if (def.opacity >= 15) {
            sky = 0;
          } else if (def.opacity > 0) {
            sky = Math.max(0, sky - def.opacity);
          }
          sections[sy].light[idx] = (sky << 4) | (def.emission & 0x0f);
        }
      }
    }

    return {
      sections: sections.map((s) => ({
        blocks: s.blocks.buffer,
        light: s.light.buffer,
        meta: s.meta.buffer
      })),
      heightmap: heightmap.buffer
    };
  }
}
