import { getBlockDef } from './blocks.js';

// Amanatides & Woo 3D DDA voxel traversal
export function raycastVoxel(world, origin, dir, maxDist) {
  const dx = dir.x;
  const dy = dir.y;
  const dz = dir.z;

  const len = Math.hypot(dx, dy, dz);
  if (len === 0) return null;
  const ndx = dx / len;
  const ndy = dy / len;
  const ndz = dz / len;

  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = ndx > 0 ? 1 : ndx < 0 ? -1 : 0;
  const stepY = ndy > 0 ? 1 : ndy < 0 ? -1 : 0;
  const stepZ = ndz > 0 ? 1 : ndz < 0 ? -1 : 0;

  const tDeltaX = stepX !== 0 ? Math.abs(1 / ndx) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / ndy) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / ndz) : Infinity;

  let tMaxX = stepX > 0 ? (x + 1 - origin.x) * tDeltaX : stepX < 0 ? (origin.x - x) * tDeltaX : Infinity;
  let tMaxY = stepY > 0 ? (y + 1 - origin.y) * tDeltaY : stepY < 0 ? (origin.y - y) * tDeltaY : Infinity;
  let tMaxZ = stepZ > 0 ? (z + 1 - origin.z) * tDeltaZ : stepZ < 0 ? (origin.z - z) * tDeltaZ : Infinity;

  let nx = 0, ny = 0, nz = 0;
  let dist = 0;

  while (dist <= maxDist) {
    if (dist > 0) {
      const blockId = world.getBlock(x, y, z);
      const def = getBlockDef(blockId);
      if (def.targetable) {
        return {
          x,
          y,
          z,
          blockId,
          normal: { x: nx, y: ny, z: nz },
          distance: dist,
          hitPoint: {
            x: origin.x + ndx * dist,
            y: origin.y + ndy * dist,
            z: origin.z + ndz * dist
          }
        };
      }
    }

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        x += stepX;
        dist = tMaxX;
        tMaxX += tDeltaX;
        nx = -stepX; ny = 0; nz = 0;
      } else {
        z += stepZ;
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
        nx = 0; ny = 0; nz = -stepZ;
      }
    } else {
      if (tMaxY < tMaxZ) {
        y += stepY;
        dist = tMaxY;
        tMaxY += tDeltaY;
        nx = 0; ny = -stepY; nz = 0;
      } else {
        z += stepZ;
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
        nx = 0; ny = 0; nz = -stepZ;
      }
    }
  }

  return null;
}
