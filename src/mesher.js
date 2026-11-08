import { CONFIG } from './config.js';
import { BLOCK, RENDER_TYPE, getBlockDef, isBlockOpaque } from './blocks.js';

// Padded 18x18x18 index for coordinates lx, ly, lz in [-1 .. 16]
export function paddedIndex(lx, ly, lz) {
  return (ly + 1) * 324 + (lz + 1) * 18 + (lx + 1);
}

// 6 faces with CCW winding, outward normal, shade multiplier, and tangent basis (uAxis, vAxis) for AO
const FACES = [
  {
    name: 'top',
    dir: [0, 1, 0],
    shade: CONFIG.FACE_SHADE.TOP,
    corners: [
      { pos: [0, 1, 1], uv: [0, 1], du: -1, dv: 1 },
      { pos: [1, 1, 1], uv: [1, 1], du: 1, dv: 1 },
      { pos: [1, 1, 0], uv: [1, 0], du: 1, dv: -1 },
      { pos: [0, 1, 0], uv: [0, 0], du: -1, dv: -1 }
    ],
    uAxis: [1, 0, 0],
    vAxis: [0, 0, 1]
  },
  {
    name: 'bottom',
    dir: [0, -1, 0],
    shade: CONFIG.FACE_SHADE.BOTTOM,
    corners: [
      { pos: [0, 0, 0], uv: [0, 0], du: -1, dv: -1 },
      { pos: [1, 0, 0], uv: [1, 0], du: 1, dv: -1 },
      { pos: [1, 0, 1], uv: [1, 1], du: 1, dv: 1 },
      { pos: [0, 0, 1], uv: [0, 1], du: -1, dv: 1 }
    ],
    uAxis: [1, 0, 0],
    vAxis: [0, 0, 1]
  },
  {
    name: 'north', // -Z
    dir: [0, 0, -1],
    shade: CONFIG.FACE_SHADE.NORTH,
    corners: [
      { pos: [1, 0, 0], uv: [0, 1], du: 1, dv: -1 },
      { pos: [0, 0, 0], uv: [1, 1], du: -1, dv: -1 },
      { pos: [0, 1, 0], uv: [1, 0], du: -1, dv: 1 },
      { pos: [1, 1, 0], uv: [0, 0], du: 1, dv: 1 }
    ],
    uAxis: [1, 0, 0],
    vAxis: [0, 1, 0]
  },
  {
    name: 'south', // +Z
    dir: [0, 0, 1],
    shade: CONFIG.FACE_SHADE.SOUTH,
    corners: [
      { pos: [0, 0, 1], uv: [0, 1], du: -1, dv: -1 },
      { pos: [1, 0, 1], uv: [1, 1], du: 1, dv: -1 },
      { pos: [1, 1, 1], uv: [1, 0], du: 1, dv: 1 },
      { pos: [0, 1, 1], uv: [0, 0], du: -1, dv: 1 }
    ],
    uAxis: [1, 0, 0],
    vAxis: [0, 1, 0]
  },
  {
    name: 'east', // +X
    dir: [1, 0, 0],
    shade: CONFIG.FACE_SHADE.EAST,
    corners: [
      { pos: [1, 0, 1], uv: [0, 1], du: 1, dv: -1 },
      { pos: [1, 0, 0], uv: [1, 1], du: -1, dv: -1 },
      { pos: [1, 1, 0], uv: [1, 0], du: -1, dv: 1 },
      { pos: [1, 1, 1], uv: [0, 0], du: 1, dv: 1 }
    ],
    uAxis: [0, 0, 1],
    vAxis: [0, 1, 0]
  },
  {
    name: 'west', // -X
    dir: [-1, 0, 0],
    shade: CONFIG.FACE_SHADE.WEST,
    corners: [
      { pos: [0, 0, 0], uv: [0, 1], du: -1, dv: -1 },
      { pos: [0, 0, 1], uv: [1, 1], du: 1, dv: -1 },
      { pos: [0, 1, 1], uv: [1, 0], du: 1, dv: 1 },
      { pos: [0, 1, 0], uv: [0, 0], du: -1, dv: 1 }
    ],
    uAxis: [0, 0, 1],
    vAxis: [0, 1, 0]
  }
];

class PassBuilder {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.uvs = [];
    this.colors = [];
    this.indices = [];
    this.vertCount = 0;
  }

  toTransferable() {
    const positions = new Float32Array(this.positions);
    const normals = new Float32Array(this.normals);
    const uvs = new Float32Array(this.uvs);
    const colors = new Float32Array(this.colors);
    const indices = new Uint32Array(this.indices);
    return {
      data: {
        positions: positions.buffer,
        normals: normals.buffer,
        uvs: uvs.buffer,
        colors: colors.buffer,
        indices: indices.buffer,
        vertexCount: this.vertCount
      },
      transferables: [
        positions.buffer,
        normals.buffer,
        uvs.buffer,
        colors.buffer,
        indices.buffer
      ]
    };
  }
}

function shouldRenderFace(selfId, selfDef, neighborId, neighborDef) {
  if (neighborId === BLOCK.AIR) return true;
  if (selfDef.renderType === RENDER_TYPE.OPAQUE) {
    return neighborDef.renderType !== RENDER_TYPE.OPAQUE;
  }
  if (selfDef.renderType === RENDER_TYPE.TRANSPARENT) {
    // Cull internal water-to-water faces and faces against opaque blocks
    if (neighborId === selfId) return false;
    return neighborDef.renderType !== RENDER_TYPE.OPAQUE;
  }
  if (selfDef.renderType === RENDER_TYPE.CUTOUT) {
    if (selfId === BLOCK.GLASS && neighborId === BLOCK.GLASS) return false;
    return neighborDef.renderType !== RENDER_TYPE.OPAQUE;
  }
  return true;
}

export function meshSectionPadded(paddedBlocks, paddedLight) {
  const builders = {
    [RENDER_TYPE.OPAQUE]: new PassBuilder(),
    [RENDER_TYPE.CUTOUT]: new PassBuilder(),
    [RENDER_TYPE.TRANSPARENT]: new PassBuilder()
  };

  // UV inset prevents texture atlas edge bleeding at mipmap/angle boundaries
  const uvEps = 0.0015 / CONFIG.ATLAS_COLS;
  const tileW = 1.0 / CONFIG.ATLAS_COLS;
  const tileH = 1.0 / CONFIG.ATLAS_ROWS;

  for (let ly = 0; ly < 16; ly++) {
    for (let lz = 0; lz < 16; lz++) {
      for (let lx = 0; lx < 16; lx++) {
        const selfId = paddedBlocks[paddedIndex(lx, ly, lz)];
        if (selfId === BLOCK.AIR) continue;

        const selfDef = getBlockDef(selfId);
        if (selfDef.renderType === RENDER_TYPE.NONE) continue;

        const builder = builders[selfDef.renderType];

        for (let f = 0; f < 6; f++) {
          const face = FACES[f];
          const nx = lx + face.dir[0];
          const ny = ly + face.dir[1];
          const nz = lz + face.dir[2];

          const neighborId = paddedBlocks[paddedIndex(nx, ny, nz)];
          const neighborDef = getBlockDef(neighborId);

          if (!shouldRenderFace(selfId, selfDef, neighborId, neighborDef)) {
            continue;
          }

          const tileIndex = selfDef.textures[face.name];
          const col = tileIndex % CONFIG.ATLAS_COLS;
          const row = Math.floor(tileIndex / CONFIG.ATLAS_COLS);
          const u0 = col * tileW + uvEps;
          const u1 = (col + 1) * tileW - uvEps;
          // Three.js CanvasTexture flipY=true maps v=1 to top of canvas, so row 0 is at top (v: 1 - row*tileH)
          const vTop = 1.0 - row * tileH - uvEps;
          const vBot = 1.0 - (row + 1) * tileH + uvEps;

          const aoValues = [3, 3, 3, 3];
          const baseVertex = builder.vertCount;

          for (let c = 0; c < 4; c++) {
            const corner = face.corners[c];
            const vx = lx + corner.pos[0];
            const vy = ly + corner.pos[1];
            const vz = lz + corner.pos[2];

            // Compute 3-sample voxel ambient occlusion in the neighbor plane
            const s1x = nx + face.uAxis[0] * corner.du;
            const s1y = ny + face.uAxis[1] * corner.du;
            const s1z = nz + face.uAxis[2] * corner.du;

            const s2x = nx + face.vAxis[0] * corner.dv;
            const s2y = ny + face.vAxis[1] * corner.dv;
            const s2z = nz + face.vAxis[2] * corner.dv;

            const cxOff = nx + face.uAxis[0] * corner.du + face.vAxis[0] * corner.dv;
            const cyOff = ny + face.uAxis[1] * corner.du + face.vAxis[1] * corner.dv;
            const czOff = nz + face.uAxis[2] * corner.du + face.vAxis[2] * corner.dv;

            const side1 = isBlockOpaque(paddedBlocks[paddedIndex(s1x, s1y, s1z)]) ? 1 : 0;
            const side2 = isBlockOpaque(paddedBlocks[paddedIndex(s2x, s2y, s2z)]) ? 1 : 0;
            const cornerOcc = isBlockOpaque(paddedBlocks[paddedIndex(cxOff, cyOff, czOff)]) ? 1 : 0;

            const aoLevel = (side1 && side2) ? 0 : (3 - (side1 + side2 + cornerOcc));
            aoValues[c] = aoLevel;

            // Sample smooth light from neighbor plane cells that are not occluded
            let lightSum = 0;
            let samples = 1;
            const parseLight = (lb) => Math.max((lb >> 4) & 15, lb & 15) / 15.0;
            lightSum += parseLight(paddedLight[paddedIndex(nx, ny, nz)]);

            if (!side1) {
              lightSum += parseLight(paddedLight[paddedIndex(s1x, s1y, s1z)]);
              samples++;
            }
            if (!side2) {
              lightSum += parseLight(paddedLight[paddedIndex(s2x, s2y, s2z)]);
              samples++;
            }
            if (!(side1 && side2) && !cornerOcc) {
              lightSum += parseLight(paddedLight[paddedIndex(cxOff, cyOff, czOff)]);
              samples++;
            }

            const smoothLight = Math.max(0.08, lightSum / samples);
            const brightness = face.shade * CONFIG.AO_CURVE[aoLevel] * smoothLight;

            builder.positions.push(vx, vy, vz);
            builder.normals.push(face.dir[0], face.dir[1], face.dir[2]);
            builder.uvs.push(
              corner.uv[0] === 0 ? u0 : u1,
              corner.uv[1] === 0 ? vTop : vBot
            );
            builder.colors.push(brightness, brightness, brightness);
          }

          // Flip quad triangulation diagonal when needed to prevent AO anisotropy
          if (aoValues[0] + aoValues[2] > aoValues[1] + aoValues[3]) {
            builder.indices.push(
              baseVertex + 0, baseVertex + 1, baseVertex + 2,
              baseVertex + 0, baseVertex + 2, baseVertex + 3
            );
          } else {
            builder.indices.push(
              baseVertex + 1, baseVertex + 2, baseVertex + 3,
              baseVertex + 1, baseVertex + 3, baseVertex + 0
            );
          }

          builder.vertCount += 4;
        }
      }
    }
  }

  const opaqueOut = builders[RENDER_TYPE.OPAQUE].toTransferable();
  const cutoutOut = builders[RENDER_TYPE.CUTOUT].toTransferable();
  const transparentOut = builders[RENDER_TYPE.TRANSPARENT].toTransferable();

  return {
    passes: {
      opaque: opaqueOut.data,
      cutout: cutoutOut.data,
      transparent: transparentOut.data
    },
    transferables: [
      ...opaqueOut.transferables,
      ...cutoutOut.transferables,
      ...transparentOut.transferables
    ]
  };
}
