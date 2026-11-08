import { CONFIG } from './config.js';
import { mulberry32 } from './noise.js';

export const RENDER_TYPE = Object.freeze({
  NONE: 0,
  OPAQUE: 1,
  CUTOUT: 2,
  TRANSPARENT: 3
});

export const BLOCK = Object.freeze({
  AIR: 0,
  STONE: 1,
  GRASS: 2,
  DIRT: 3,
  COBBLESTONE: 4,
  OAK_PLANKS: 5,
  BEDROCK: 6,
  SAND: 7,
  GRAVEL: 8,
  OAK_LOG: 9,
  OAK_LEAVES: 10,
  GLASS: 11,
  WATER: 12,
  COAL_ORE: 13,
  IRON_ORE: 14,
  GOLD_ORE: 15,
  DIAMOND_ORE: 16,
  GLOWSTONE: 17
});

// Tile indices in the 16x16 atlas
export const TEX = Object.freeze({
  STONE: 0,
  DIRT: 1,
  GRASS_TOP: 2,
  GRASS_SIDE: 3,
  COBBLESTONE: 4,
  OAK_PLANKS: 5,
  BEDROCK: 6,
  SAND: 7,
  GRAVEL: 8,
  OAK_LOG_SIDE: 9,
  OAK_LOG_TOP: 10,
  OAK_LEAVES: 11,
  GLASS: 12,
  WATER: 13,
  COAL_ORE: 14,
  IRON_ORE: 15,
  GOLD_ORE: 16,
  DIAMOND_ORE: 17,
  GLOWSTONE: 18
});

// Single source of truth for block definitions
const RAW_BLOCKS = [
  {
    id: BLOCK.AIR,
    name: 'Air',
    hardness: 0,
    resistance: 0,
    tool: null,
    requiresTool: false,
    drops: null,
    stackSize: 0,
    emission: 0,
    opacity: 0,
    solid: false,
    targetable: false,
    renderType: RENDER_TYPE.NONE,
    sound: 'none',
    textures: { top: 0, bottom: 0, north: 0, south: 0, east: 0, west: 0 }
  },
  {
    id: BLOCK.STONE,
    name: 'Stone',
    hardness: 1.5,
    resistance: 6.0,
    tool: 'pickaxe',
    requiresTool: true,
    drops: BLOCK.COBBLESTONE,
    stackSize: 64,
    emission: 0,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'stone',
    textures: { top: TEX.STONE, bottom: TEX.STONE, north: TEX.STONE, south: TEX.STONE, east: TEX.STONE, west: TEX.STONE }
  },
  {
    id: BLOCK.GRASS,
    name: 'Grass Block',
    hardness: 0.6,
    resistance: 0.6,
    tool: 'shovel',
    requiresTool: false,
    drops: BLOCK.DIRT,
    stackSize: 64,
    emission: 0,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'grass',
    textures: { top: TEX.GRASS_TOP, bottom: TEX.DIRT, north: TEX.GRASS_SIDE, south: TEX.GRASS_SIDE, east: TEX.GRASS_SIDE, west: TEX.GRASS_SIDE }
  },
  {
    id: BLOCK.DIRT,
    name: 'Dirt',
    hardness: 0.5,
    resistance: 0.5,
    tool: 'shovel',
    requiresTool: false,
    drops: BLOCK.DIRT,
    stackSize: 64,
    emission: 0,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'gravel',
    textures: { top: TEX.DIRT, bottom: TEX.DIRT, north: TEX.DIRT, south: TEX.DIRT, east: TEX.DIRT, west: TEX.DIRT }
  },
  {
    id: BLOCK.COBBLESTONE,
    name: 'Cobblestone',
    hardness: 2.0,
    resistance: 6.0,
    tool: 'pickaxe',
    requiresTool: true,
    drops: BLOCK.COBBLESTONE,
    stackSize: 64,
    emission: 0,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'stone',
    textures: { top: TEX.COBBLESTONE, bottom: TEX.COBBLESTONE, north: TEX.COBBLESTONE, south: TEX.COBBLESTONE, east: TEX.COBBLESTONE, west: TEX.COBBLESTONE }
  },
  {
    id: BLOCK.OAK_PLANKS,
    name: 'Oak Planks',
    hardness: 2.0,
    resistance: 3.0,
    tool: 'axe',
    requiresTool: false,
    drops: BLOCK.OAK_PLANKS,
    stackSize: 64,
    emission: 0,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'wood',
    textures: { top: TEX.OAK_PLANKS, bottom: TEX.OAK_PLANKS, north: TEX.OAK_PLANKS, south: TEX.OAK_PLANKS, east: TEX.OAK_PLANKS, west: TEX.OAK_PLANKS }
  },
  {
    id: BLOCK.BEDROCK,
    name: 'Bedrock',
    hardness: -1,
    resistance: 3600000,
    tool: null,
    requiresTool: true,
    drops: null,
    stackSize: 64,
    emission: 0,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'stone',
    textures: { top: TEX.BEDROCK, bottom: TEX.BEDROCK, north: TEX.BEDROCK, south: TEX.BEDROCK, east: TEX.BEDROCK, west: TEX.BEDROCK }
  },
  {
    id: BLOCK.SAND,
    name: 'Sand',
    hardness: 0.5,
    resistance: 0.5,
    tool: 'shovel',
    requiresTool: false,
    drops: BLOCK.SAND,
    stackSize: 64,
    emission: 0,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'sand',
    textures: { top: TEX.SAND, bottom: TEX.SAND, north: TEX.SAND, south: TEX.SAND, east: TEX.SAND, west: TEX.SAND }
  },
  {
    id: BLOCK.GRAVEL,
    name: 'Gravel',
    hardness: 0.6,
    resistance: 0.6,
    tool: 'shovel',
    requiresTool: false,
    drops: BLOCK.GRAVEL,
    stackSize: 64,
    emission: 0,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'gravel',
    textures: { top: TEX.GRAVEL, bottom: TEX.GRAVEL, north: TEX.GRAVEL, south: TEX.GRAVEL, east: TEX.GRAVEL, west: TEX.GRAVEL }
  },
  {
    id: BLOCK.OAK_LOG,
    name: 'Oak Log',
    hardness: 2.0,
    resistance: 2.0,
    tool: 'axe',
    requiresTool: false,
    drops: BLOCK.OAK_LOG,
    stackSize: 64,
    emission: 0,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'wood',
    textures: { top: TEX.OAK_LOG_TOP, bottom: TEX.OAK_LOG_TOP, north: TEX.OAK_LOG_SIDE, south: TEX.OAK_LOG_SIDE, east: TEX.OAK_LOG_SIDE, west: TEX.OAK_LOG_SIDE }
  },
  {
    id: BLOCK.OAK_LEAVES,
    name: 'Oak Leaves',
    hardness: 0.2,
    resistance: 0.2,
    tool: 'hoe',
    requiresTool: false,
    drops: null,
    stackSize: 64,
    emission: 0,
    opacity: 1,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.CUTOUT,
    sound: 'grass',
    textures: { top: TEX.OAK_LEAVES, bottom: TEX.OAK_LEAVES, north: TEX.OAK_LEAVES, south: TEX.OAK_LEAVES, east: TEX.OAK_LEAVES, west: TEX.OAK_LEAVES }
  },
  {
    id: BLOCK.GLASS,
    name: 'Glass',
    hardness: 0.3,
    resistance: 0.3,
    tool: null,
    requiresTool: false,
    drops: null,
    stackSize: 64,
    emission: 0,
    opacity: 0,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.CUTOUT,
    sound: 'glass',
    textures: { top: TEX.GLASS, bottom: TEX.GLASS, north: TEX.GLASS, south: TEX.GLASS, east: TEX.GLASS, west: TEX.GLASS }
  },
  {
    id: BLOCK.WATER,
    name: 'Water',
    hardness: 100,
    resistance: 100,
    tool: null,
    requiresTool: false,
    drops: null,
    stackSize: 0,
    emission: 0,
    opacity: 2, // VERIFY: Water attenuates skylight by 2 in classic/pre-1.13, 1 in 1.13+
    solid: false,
    targetable: false,
    renderType: RENDER_TYPE.TRANSPARENT,
    sound: 'water',
    textures: { top: TEX.WATER, bottom: TEX.WATER, north: TEX.WATER, south: TEX.WATER, east: TEX.WATER, west: TEX.WATER }
  },
  {
    id: BLOCK.COAL_ORE,
    name: 'Coal Ore',
    hardness: 3.0,
    resistance: 3.0,
    tool: 'pickaxe',
    requiresTool: true,
    drops: BLOCK.COAL_ORE,
    stackSize: 64,
    emission: 0,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'stone',
    textures: { top: TEX.COAL_ORE, bottom: TEX.COAL_ORE, north: TEX.COAL_ORE, south: TEX.COAL_ORE, east: TEX.COAL_ORE, west: TEX.COAL_ORE }
  },
  {
    id: BLOCK.IRON_ORE,
    name: 'Iron Ore',
    hardness: 3.0,
    resistance: 3.0,
    tool: 'pickaxe',
    requiresTool: true,
    drops: BLOCK.IRON_ORE,
    stackSize: 64,
    emission: 0,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'stone',
    textures: { top: TEX.IRON_ORE, bottom: TEX.IRON_ORE, north: TEX.IRON_ORE, south: TEX.IRON_ORE, east: TEX.IRON_ORE, west: TEX.IRON_ORE }
  },
  {
    id: BLOCK.GOLD_ORE,
    name: 'Gold Ore',
    hardness: 3.0,
    resistance: 3.0,
    tool: 'pickaxe',
    requiresTool: true,
    drops: BLOCK.GOLD_ORE,
    stackSize: 64,
    emission: 0,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'stone',
    textures: { top: TEX.GOLD_ORE, bottom: TEX.GOLD_ORE, north: TEX.GOLD_ORE, south: TEX.GOLD_ORE, east: TEX.GOLD_ORE, west: TEX.GOLD_ORE }
  },
  {
    id: BLOCK.DIAMOND_ORE,
    name: 'Diamond Ore',
    hardness: 3.0,
    resistance: 3.0,
    tool: 'pickaxe',
    requiresTool: true,
    drops: BLOCK.DIAMOND_ORE,
    stackSize: 64,
    emission: 0,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'stone',
    textures: { top: TEX.DIAMOND_ORE, bottom: TEX.DIAMOND_ORE, north: TEX.DIAMOND_ORE, south: TEX.DIAMOND_ORE, east: TEX.DIAMOND_ORE, west: TEX.DIAMOND_ORE }
  },
  {
    id: BLOCK.GLOWSTONE,
    name: 'Glowstone',
    hardness: 0.3,
    resistance: 0.3,
    tool: null,
    requiresTool: false,
    drops: BLOCK.GLOWSTONE,
    stackSize: 64,
    emission: 15,
    opacity: 15,
    solid: true,
    targetable: true,
    renderType: RENDER_TYPE.OPAQUE,
    sound: 'glass',
    textures: { top: TEX.GLOWSTONE, bottom: TEX.GLOWSTONE, north: TEX.GLOWSTONE, south: TEX.GLOWSTONE, east: TEX.GLOWSTONE, west: TEX.GLOWSTONE }
  }
];

export const BLOCK_DEFS = new Array(256).fill(null);
for (const def of RAW_BLOCKS) {
  BLOCK_DEFS[def.id] = Object.freeze(def);
}

export function getBlockDef(id) {
  return BLOCK_DEFS[id] || BLOCK_DEFS[BLOCK.AIR];
}

export function isBlockOpaque(id) {
  const def = BLOCK_DEFS[id];
  return def !== null && def !== undefined && def.renderType === RENDER_TYPE.OPAQUE;
}

export function isBlockSolid(id) {
  const def = BLOCK_DEFS[id];
  return def !== null && def !== undefined && def.solid;
}

// Hotbar default blocks for M1 testing
export const HOTBAR_BLOCKS = [
  BLOCK.GRASS,
  BLOCK.DIRT,
  BLOCK.STONE,
  BLOCK.COBBLESTONE,
  BLOCK.OAK_PLANKS,
  BLOCK.OAK_LOG,
  BLOCK.OAK_LEAVES,
  BLOCK.GLASS,
  BLOCK.GLOWSTONE
];

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function drawTilePixel(ctx, tileIndex, px, py, r, g, b, a = 255) {
  const col = tileIndex % CONFIG.ATLAS_COLS;
  const row = Math.floor(tileIndex / CONFIG.ATLAS_COLS);
  const x = col * CONFIG.TILE_SIZE + px;
  const y = row * CONFIG.TILE_SIZE + py;
  ctx.fillStyle = `rgba(${clampByte(r)},${clampByte(g)},${clampByte(b)},${(a / 255).toFixed(3)})`;
  ctx.fillRect(x, y, 1, 1);
}

function paintTile(ctx, tileIndex, rand, pixelFn) {
  for (let py = 0; py < 16; py++) {
    for (let px = 0; px < 16; px++) {
      const [r, g, b, a = 255] = pixelFn(px, py, rand);
      drawTilePixel(ctx, tileIndex, px, py, r, g, b, a);
    }
  }
}

export function generateTextureAtlasCanvas() {
  const width = CONFIG.ATLAS_COLS * CONFIG.TILE_SIZE;
  const height = CONFIG.ATLAS_ROWS * CONFIG.TILE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(9001);

  // Stone
  paintTile(ctx, TEX.STONE, rand, (x, y, r) => {
    const n = (r() - 0.5) * 22 + (((x + y * 3) % 5 === 0) ? -8 : 0);
    return [125 + n, 125 + n, 125 + n, 255];
  });

  // Dirt
  paintTile(ctx, TEX.DIRT, rand, (x, y, r) => {
    const n = (r() - 0.5) * 28;
    const speck = r() > 0.88 ? -16 : 0;
    return [134 + n + speck, 96 + n + speck, 67 + n + speck, 255];
  });

  // Grass Top
  paintTile(ctx, TEX.GRASS_TOP, rand, (x, y, r) => {
    const n = (r() - 0.5) * 24;
    return [92 + n, 158 + n, 58 + n, 255];
  });

  // Grass Side
  paintTile(ctx, TEX.GRASS_SIDE, rand, (x, y, r) => {
    const fringe = 2 + Math.floor(Math.sin(x * 1.3) * 1.5 + r() * 2);
    if (y <= fringe) {
      const n = (r() - 0.5) * 22;
      return [92 + n, 158 + n, 58 + n, 255];
    }
    const n = (r() - 0.5) * 28;
    return [134 + n, 96 + n, 67 + n, 255];
  });

  // Cobblestone
  paintTile(ctx, TEX.COBBLESTONE, rand, (x, y, r) => {
    const cell = ((x >> 2) * 7 + (y >> 2) * 13) % 5;
    const edge = (x % 4 === 0 || y % 4 === 0);
    const base = edge ? 82 : 115 + cell * 7;
    const n = (r() - 0.5) * 18;
    return [base + n, base + n, base + n, 255];
  });

  // Oak Planks
  paintTile(ctx, TEX.OAK_PLANKS, rand, (x, y, r) => {
    const seam = (y % 4 === 0) || (x === ((y >> 2) * 7) % 16);
    const grain = Math.sin(x * 0.6 + y * 0.2) * 6 + (r() - 0.5) * 10;
    const s = seam ? -22 : 0;
    return [162 + grain + s, 130 + grain + s, 78 + grain + s, 255];
  });

  // Bedrock
  paintTile(ctx, TEX.BEDROCK, rand, (x, y, r) => {
    const v = 35 + Math.floor(r() * 65);
    return [v, v, v, 255];
  });

  // Sand
  paintTile(ctx, TEX.SAND, rand, (x, y, r) => {
    const n = (r() - 0.5) * 20;
    return [218 + n, 210 + n, 158 + n, 255];
  });

  // Gravel
  paintTile(ctx, TEX.GRAVEL, rand, (x, y, r) => {
    const n = (r() - 0.5) * 38;
    return [130 + n, 126 + n, 124 + n, 255];
  });

  // Oak Log Side
  paintTile(ctx, TEX.OAK_LOG_SIDE, rand, (x, y, r) => {
    const stripe = Math.sin(x * 1.4) * 10 + (r() - 0.5) * 14;
    return [102 + stripe, 81 + stripe, 50 + stripe, 255];
  });

  // Oak Log Top
  paintTile(ctx, TEX.OAK_LOG_TOP, rand, (x, y, r) => {
    const dx = x - 7.5;
    const dy = y - 7.5;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    if (dist > 6.5) {
      const n = (r() - 0.5) * 12;
      return [102 + n, 81 + n, 50 + n, 255];
    }
    const ring = Math.sin(dist * 2.2) * 10 + (r() - 0.5) * 8;
    return [168 + ring, 137 + ring, 86 + ring, 255];
  });

  // Oak Leaves (Cutout)
  paintTile(ctx, TEX.OAK_LEAVES, rand, (x, y, r) => {
    if (((x * 3 + y * 5) % 7 === 0) && r() > 0.35) {
      return [0, 0, 0, 0];
    }
    const n = (r() - 0.5) * 26;
    return [56 + n, 118 + n, 38 + n, 255];
  });

  // Glass (Cutout border + streaks)
  paintTile(ctx, TEX.GLASS, rand, (x, y) => {
    const border = x === 0 || x === 15 || y === 0 || y === 15;
    const streak = (x + y === 5) || (x + y === 6) || (x + y === 19);
    if (border || streak) {
      return [220, 245, 255, 255];
    }
    return [0, 0, 0, 0];
  });

  // Water (Transparent)
  paintTile(ctx, TEX.WATER, rand, (x, y, r) => {
    const wave = Math.sin((x + y) * 0.7) * 12 + (r() - 0.5) * 8;
    return [42 + wave, 95 + wave, 215 + wave, 180];
  });

  // Ores helper
  const paintOre = (tileIdx, oreColor) => {
    const stoneRand = mulberry32(3000 + tileIdx);
    paintTile(ctx, tileIdx, stoneRand, (x, y, r) => {
      const isSpeck =
        ((x >= 3 && x <= 5 && y >= 4 && y <= 5) ||
         (x >= 10 && x <= 12 && y >= 5 && y <= 7) ||
         (x >= 5 && x <= 7 && y >= 10 && y <= 12) ||
         (x >= 11 && x <= 12 && y >= 11 && y <= 13)) && r() > 0.2;
      if (isSpeck) {
        const n = (r() - 0.5) * 20;
        return [oreColor[0] + n, oreColor[1] + n, oreColor[2] + n, 255];
      }
      const n = (r() - 0.5) * 22;
      return [125 + n, 125 + n, 125 + n, 255];
    });
  };

  paintOre(TEX.COAL_ORE, [35, 35, 35]);
  paintOre(TEX.IRON_ORE, [216, 175, 147]);
  paintOre(TEX.GOLD_ORE, [250, 238, 77]);
  paintOre(TEX.DIAMOND_ORE, [92, 237, 218]);

  // Glowstone
  paintTile(ctx, TEX.GLOWSTONE, rand, (x, y, r) => {
    const bright = r() > 0.65 ? 35 : 0;
    const n = (r() - 0.5) * 30;
    return [215 + bright + n, 175 + bright + n, 75 + bright + n, 255];
  });

  return canvas;
}

// Generate 10 stages (0..9) of 16x16 block breaking crack textures
export function generateCrackStagesCanvases() {
  const canvases = [];
  for (let stage = 0; stage < 10; stage++) {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = 'rgba(15, 15, 15, 0.78)';
    ctx.lineWidth = 1;

    const branches = (stage + 1) * 2;
    const rand = mulberry32(777);
    for (let b = 0; b < branches; b++) {
      let cx = 8;
      let cy = 8;
      const steps = 2 + Math.floor(((stage + 1) / 10) * 7);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < steps; s++) {
        cx += (rand() - 0.5) * 5;
        cy += (rand() - 0.5) * 5;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    canvases.push(c);
  }
  return canvases;
}

export function renderBlockIconToCanvas(blockId, atlasCanvas) {
  const def = getBlockDef(blockId);
  const icon = document.createElement('canvas');
  icon.width = 16;
  icon.height = 16;
  const ctx = icon.getContext('2d');
  const tile = def.textures.north;
  const col = tile % CONFIG.ATLAS_COLS;
  const row = Math.floor(tile / CONFIG.ATLAS_COLS);
  ctx.drawImage(
    atlasCanvas,
    col * CONFIG.TILE_SIZE,
    row * CONFIG.TILE_SIZE,
    CONFIG.TILE_SIZE,
    CONFIG.TILE_SIZE,
    0,
    0,
    16,
    16
  );
  return icon;
}
