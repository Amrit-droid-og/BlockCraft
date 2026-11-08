import * as THREE from 'three';
import { CONFIG } from './config.js';
import { BLOCK, HOTBAR_BLOCKS, getBlockDef, isBlockSolid } from './blocks.js';
import { raycastVoxel } from './raycast.js';

export class Player {
  constructor(world, camera, crackTextures, domElement) {
    this.world = world;
    this.camera = camera;
    this.crackTextures = crackTextures;
    this.domElement = domElement;

    // Position is player feet center (x, y, z)
    this.pos = new THREE.Vector3(8.5, 85, 8.5);
    this.prevPos = this.pos.clone();
    this.vel = new THREE.Vector3(0, 0, 0);

    this.yaw = 0;
    this.pitch = -0.25;
    this.onGround = false;
    this.flying = false;
    this.gamemode = 'survival'; // 'survival' | 'creative'
    this.spawnInitialized = false;

    this.selectedHotbarIndex = 0;
    this.keys = new Set();
    this.mouseButtons = { left: false, right: false };
    this.placeCooldown = 0;
    this.creativeBreakCooldown = 0;

    // Block breaking state
    this.breakTarget = null; // { x, y, z, blockId }
    this.breakProgress = 0;  // 0..1

    // Selection wireframe + crack overlay meshes
    this.raycastHit = null;
    this.initTargetVisuals();
    this.bindInputEvents();
  }

  initTargetVisuals() {
    const boxGeom = new THREE.BoxGeometry(1.004, 1.004, 1.004);
    const edges = new THREE.EdgesGeometry(boxGeom);
    this.outlineMesh = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
    );
    this.outlineMesh.visible = false;
    this.world.scene.add(this.outlineMesh);

    const crackGeom = new THREE.BoxGeometry(1.006, 1.006, 1.006);
    this.crackMaterial = new THREE.MeshBasicMaterial({
      map: this.crackTextures[0],
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    this.crackMesh = new THREE.Mesh(crackGeom, this.crackMaterial);
    this.crackMesh.visible = false;
    this.crackMesh.renderOrder = 5;
    this.world.scene.add(this.crackMesh);
  }

  bindInputEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);

      if (e.code.startsWith('Digit')) {
        const num = parseInt(e.code.slice(5), 10);
        if (num >= 1 && num <= 9) {
          this.selectedHotbarIndex = num - 1;
        }
      } else if (e.code === 'KeyF') {
        this.flying = !this.flying;
        this.vel.y = 0;
      } else if (e.code === 'KeyC') {
        this.gamemode = this.gamemode === 'survival' ? 'creative' : 'survival';
        this.resetBreakState();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== this.domElement) return;
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;
      const maxPitch = Math.PI / 2 - 0.001;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    });

    window.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement !== this.domElement) return;
      if (e.button === 0) {
        this.mouseButtons.left = true;
      } else if (e.button === 2) {
        this.mouseButtons.right = true;
        this.tryPlaceBlock();
        this.placeCooldown = CONFIG.PLACE_COOLDOWN_TICKS;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouseButtons.left = false;
        this.resetBreakState();
      } else if (e.button === 2) {
        this.mouseButtons.right = false;
      }
    });

    window.addEventListener('wheel', (e) => {
      if (document.pointerLockElement !== this.domElement) return;
      const dir = Math.sign(e.deltaY);
      this.selectedHotbarIndex = (this.selectedHotbarIndex + dir + 9) % 9;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  getEyeHeight() {
    const sneaking = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    return sneaking && !this.flying
      ? CONFIG.PLAYER_SNEAK_EYE_HEIGHT
      : CONFIG.PLAYER_EYE_HEIGHT;
  }

  getPlayerHeight() {
    const sneaking = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    return sneaking && !this.flying
      ? CONFIG.PLAYER_SNEAK_HEIGHT
      : CONFIG.PLAYER_HEIGHT;
  }

  getReachDistance() {
    return this.gamemode === 'creative' ? CONFIG.CREATIVE_REACH : CONFIG.SURVIVAL_REACH;
  }

  getLookDirection() {
    const cosPitch = Math.cos(this.pitch);
    return new THREE.Vector3(
      -Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * cosPitch
    ).normalize();
  }

  initSpawn() {
    // Search outward for a clear spawn location that has a solid ground block and at least 3 air blocks above
    for (let r = 0; r <= 16; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (r > 0 && Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const wx = 8 + dx;
          const wz = 8 + dz;
          for (let y = CONFIG.WORLD_HEIGHT - 4; y >= 1; y--) {
            const b0 = this.world.getBlock(wx, y, wz);
            if (isBlockSolid(b0) && b0 !== BLOCK.OAK_LEAVES && b0 !== BLOCK.WATER) {
              const b1 = this.world.getBlock(wx, y + 1, wz);
              const b2 = this.world.getBlock(wx, y + 2, wz);
              const b3 = this.world.getBlock(wx, y + 3, wz);
              if (b1 === BLOCK.AIR && b2 === BLOCK.AIR && b3 === BLOCK.AIR) {
                this.pos.set(wx + 0.5, y + 1.0, wz + 0.5);
                this.prevPos.copy(this.pos);
                this.vel.set(0, 0, 0);
                this.onGround = true;
                this.spawnInitialized = true;
                return;
              }
            }
          }
        }
      }
    }
    const sy = this.world.getSurfaceHeightAt(8, 8);
    this.pos.set(8.5, sy + 3.0, 8.5);
    this.prevPos.copy(this.pos);
    this.spawnInitialized = true;
  }

  tick() {
    this.prevPos.copy(this.pos);

    // Wait until origin chunk is loaded before dropping player
    const centerChunk = this.world.getChunk(0, 0);
    if (!centerChunk) return;

    if (!this.spawnInitialized) {
      this.initSpawn();
    }

    this.stepMovementTick();
    this.updateRaycast(1.0);
    this.stepBlockInteractionTick();
  }

  stepMovementTick() {
    const sneaking = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const sprinting = (this.keys.has('ControlLeft') || this.keys.has('KeyQ')) && !sneaking;

    let forward = 0;
    let strafe = 0;
    if (this.keys.has('KeyW')) forward += 1;
    if (this.keys.has('KeyS')) forward -= 1;
    if (this.keys.has('KeyD')) strafe += 1;
    if (this.keys.has('KeyA')) strafe -= 1;

    const inputLen = Math.hypot(forward, strafe);
    if (inputLen > 0) {
      forward /= inputLen;
      strafe /= inputLen;
    }

    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    const wishX = -sinYaw * forward + cosYaw * strafe;
    const wishZ = -cosYaw * forward - sinYaw * strafe;

    if (this.flying) {
      const flySpeed = CONFIG.CREATIVE_FLY_SPEED * (sprinting ? CONFIG.CREATIVE_FLY_SPRINT_MULT : 1.0) * CONFIG.TICK_DT;
      this.vel.x = wishX * flySpeed;
      this.vel.z = wishZ * flySpeed;
      let up = 0;
      if (this.keys.has('Space')) up += 1;
      if (sneaking) up -= 1;
      this.vel.y = up * flySpeed;
      this.moveAndCollide(this.vel.x, this.vel.y, this.vel.z);
      return;
    }

    let targetSpeed = CONFIG.WALK_SPEED;
    if (sneaking) targetSpeed = CONFIG.SNEAK_SPEED;
    else if (sprinting && forward > 0) targetSpeed = CONFIG.SPRINT_SPEED;

    const tickSpeed = targetSpeed * CONFIG.TICK_DT;
    const accel = this.onGround ? 0.4 : 0.1;
    this.vel.x += (wishX * tickSpeed - this.vel.x) * accel;
    this.vel.z += (wishZ * tickSpeed - this.vel.z) * accel;

    // Trigger jump impulse BEFORE applying vertical delta
    if (this.onGround && this.keys.has('Space')) {
      this.vel.y = CONFIG.JUMP_IMPULSE;
      this.onGround = false;
    }

    // Move first using current velocity
    this.moveAndCollide(this.vel.x, this.vel.y, this.vel.z);

    // Apply gravity and drag AFTER displacement
    this.vel.y -= CONFIG.GRAVITY_PER_TICK;
    this.vel.y *= CONFIG.VERTICAL_DRAG;

    if (this.onGround) {
      this.vel.x *= CONFIG.GROUND_FRICTION;
      this.vel.z *= CONFIG.GROUND_FRICTION;
    } else {
      this.vel.x *= CONFIG.AIR_DRAG;
      this.vel.z *= CONFIG.AIR_DRAG;
    }
  }

  moveAndCollide(dx, dy, dz) {
    const hw = CONFIG.PLAYER_HALF_WIDTH;
    const h = this.getPlayerHeight();

    // 1. Resolve Y axis
    if (dy !== 0) {
      this.pos.y += dy;
      if (this.checkAABBOverlap(this.pos.x, this.pos.y, this.pos.z, hw, h)) {
        if (dy < 0) {
          this.pos.y = Math.floor(this.pos.y) + 1.0;
          this.onGround = true;
        } else {
          this.pos.y = Math.floor(this.pos.y + h) - h - 0.0001;
        }
        this.vel.y = 0;
      } else {
        this.onGround = false;
      }
    }

    // 2. Resolve X and Z with step assist
    this.moveHorizontalAxis('x', dx, hw, h);
    this.moveHorizontalAxis('z', dz, hw, h);
  }

  moveHorizontalAxis(axis, delta, hw, h) {
    if (delta === 0) return;
    this.pos[axis] += delta;
    if (this.checkAABBOverlap(this.pos.x, this.pos.y, this.pos.z, hw, h)) {
      let stepped = false;
      // Step assist: if on ground, allow stepping up to 0.6 blocks
      if (this.onGround) {
        const stepHeight = 0.6;
        const origY = this.pos.y;
        this.pos.y += stepHeight;
        if (!this.checkAABBOverlap(this.pos.x, this.pos.y, this.pos.z, hw, h)) {
          for (let step = 0; step < 12; step++) {
            this.pos.y -= 0.05;
            if (this.checkAABBOverlap(this.pos.x, this.pos.y, this.pos.z, hw, h)) {
              this.pos.y = Math.floor(this.pos.y) + 1.0;
              stepped = true;
              break;
            }
          }
        }
        if (!stepped) {
          this.pos.y = origY;
        }
      }
      if (!stepped) {
        this.pos[axis] -= delta;
        this.vel[axis] = 0;
      }
    }
  }

  checkAABBOverlap(px, py, pz, hw, h) {
    const minX = Math.floor(px - hw + 0.0001);
    const maxX = Math.floor(px + hw - 0.0001);
    const minY = Math.floor(py + 0.0001);
    const maxY = Math.floor(py + h - 0.0001);
    const minZ = Math.floor(pz - hw + 0.0001);
    const maxZ = Math.floor(pz + hw - 0.0001);

    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          if (isBlockSolid(this.world.getBlock(x, y, z))) {
            return true;
          }
        }
      }
    }
    return false;
  }

  computeBreakTimeSeconds(blockDef) {
    if (this.gamemode === 'creative' || blockDef.hardness === 0) return 0;
    if (blockDef.hardness < 0) return Infinity; // Bedrock
    // Hand mining formula
    const mult = blockDef.requiresTool ? 5.0 : 1.5;
    return blockDef.hardness * mult;
  }

  stepBlockInteractionTick() {
    if (this.placeCooldown > 0) this.placeCooldown--;
    if (this.creativeBreakCooldown > 0) this.creativeBreakCooldown--;

    if (this.mouseButtons.right && this.placeCooldown === 0) {
      this.tryPlaceBlock();
      this.placeCooldown = CONFIG.PLACE_COOLDOWN_TICKS;
    }

    if (!this.mouseButtons.left || !this.raycastHit) {
      this.resetBreakState();
      return;
    }

    const hit = this.raycastHit;
    const def = getBlockDef(hit.blockId);
    if (def.hardness < 0 && this.gamemode !== 'creative') {
      this.resetBreakState();
      return;
    }

    // Creative mode instant block breaking
    if (this.gamemode === 'creative') {
      if (this.creativeBreakCooldown === 0) {
        this.world.setBlock(hit.x, hit.y, hit.z, BLOCK.AIR);
        this.creativeBreakCooldown = 4;
        this.resetBreakState();
      }
      return;
    }

    // Survival mode progressive breaking
    if (
      !this.breakTarget ||
      this.breakTarget.x !== hit.x ||
      this.breakTarget.y !== hit.y ||
      this.breakTarget.z !== hit.z
    ) {
      this.breakTarget = { x: hit.x, y: hit.y, z: hit.z, blockId: hit.blockId };
      this.breakProgress = 0;
    }

    const breakSeconds = this.computeBreakTimeSeconds(def);
    if (breakSeconds === 0) {
      this.world.setBlock(hit.x, hit.y, hit.z, BLOCK.AIR);
      this.resetBreakState();
      return;
    }

    this.breakProgress += CONFIG.TICK_DT / breakSeconds;
    if (this.breakProgress >= 1.0) {
      this.world.setBlock(hit.x, hit.y, hit.z, BLOCK.AIR);
      this.resetBreakState();
    } else {
      const stage = Math.min(9, Math.floor(this.breakProgress * 10));
      this.crackMaterial.map = this.crackTextures[stage];
      this.crackMaterial.needsUpdate = true;
      this.crackMesh.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      this.crackMesh.visible = true;
    }
  }

  resetBreakState() {
    this.breakTarget = null;
    this.breakProgress = 0;
    this.crackMesh.visible = false;
  }

  tryPlaceBlock() {
    if (!this.raycastHit) return;
    const normal = this.raycastHit.normal;
    if (normal.x === 0 && normal.y === 0 && normal.z === 0) return;

    const tx = this.raycastHit.x + normal.x;
    const ty = this.raycastHit.y + normal.y;
    const tz = this.raycastHit.z + normal.z;

    if (ty < 0 || ty >= CONFIG.WORLD_HEIGHT) return;
    const existing = this.world.getBlock(tx, ty, tz);
    if (existing !== BLOCK.AIR && existing !== BLOCK.WATER) return;

    const placeBlockId = HOTBAR_BLOCKS[this.selectedHotbarIndex] || BLOCK.STONE;
    const placeDef = getBlockDef(placeBlockId);

    // Prevent placing a solid block intersecting the player's own AABB
    if (placeDef.solid) {
      const hw = CONFIG.PLAYER_HALF_WIDTH;
      const h = this.getPlayerHeight();
      const pMinX = this.pos.x - hw + 0.001;
      const pMaxX = this.pos.x + hw - 0.001;
      const pMinY = this.pos.y + 0.001;
      const pMaxY = this.pos.y + h - 0.001;
      const pMinZ = this.pos.z - hw + 0.001;
      const pMaxZ = this.pos.z + hw - 0.001;

      const overlapsPlayer =
        pMaxX > tx && pMinX < tx + 1 &&
        pMaxY > ty && pMinY < ty + 1 &&
        pMaxZ > tz && pMinZ < tz + 1;

      if (overlapsPlayer) return;
    }

    this.world.setBlock(tx, ty, tz, placeBlockId);
  }

  updateRaycast(alpha) {
    const ix = this.prevPos.x + (this.pos.x - this.prevPos.x) * alpha;
    const iy = this.prevPos.y + (this.pos.y - this.prevPos.y) * alpha + this.getEyeHeight();
    const iz = this.prevPos.z + (this.pos.z - this.prevPos.z) * alpha;

    const origin = { x: ix, y: iy, z: iz };
    const dir = this.getLookDirection();
    this.raycastHit = raycastVoxel(this.world, origin, dir, this.getReachDistance());

    if (this.raycastHit) {
      this.outlineMesh.position.set(
        this.raycastHit.x + 0.5,
        this.raycastHit.y + 0.5,
        this.raycastHit.z + 0.5
      );
      this.outlineMesh.visible = true;
    } else {
      this.outlineMesh.visible = false;
      if (!this.breakTarget) {
        this.crackMesh.visible = false;
      }
    }
  }

  syncCamera(alpha) {
    const ix = this.prevPos.x + (this.pos.x - this.prevPos.x) * alpha;
    const iy = this.prevPos.y + (this.pos.y - this.prevPos.y) * alpha + this.getEyeHeight();
    const iz = this.prevPos.z + (this.pos.z - this.prevPos.z) * alpha;

    this.camera.position.set(ix, iy, iz);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.updateRaycast(alpha);
  }
}
