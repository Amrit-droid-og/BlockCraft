export const CONFIG = Object.freeze({
  // Simulation timing
  TPS: 20,
  TICK_MS: 50,
  TICK_DT: 0.05,
  DAY_TICKS: 24000,
  RANDOM_TICK_SPEED: 3,

  // World dimensions
  CHUNK_SIZE: 16,
  SECTION_HEIGHT: 16,
  NUM_SECTIONS: 16,
  WORLD_HEIGHT: 256,
  SEA_LEVEL: 63,
  BEDROCK_MAX_Y: 4,
  LAVA_LEVEL: 10,
  CLOUD_Y: 128,

  // Render & Chunk loading
  DEFAULT_RENDER_DISTANCE: 8,
  MIN_RENDER_DISTANCE: 4,
  MAX_RENDER_DISTANCE: 16,
  MAX_CONCURRENT_CHUNK_JOBS: 6,
  MAX_MESH_UPLOADS_PER_FRAME: 6,

  // Player dimensions & camera
  PLAYER_WIDTH: 0.6,
  PLAYER_HALF_WIDTH: 0.3,
  PLAYER_HEIGHT: 1.8,
  PLAYER_SNEAK_HEIGHT: 1.5,
  PLAYER_EYE_HEIGHT: 1.62,
  PLAYER_SNEAK_EYE_HEIGHT: 1.27,
  FOV: 70,
  NEAR_PLANE: 0.1,
  FAR_PLANE: 512,

  // Player speeds (blocks / second)
  WALK_SPEED: 4.317,
  SPRINT_SPEED: 5.612,
  SNEAK_SPEED: 1.295,
  CREATIVE_FLY_SPEED: 10.89,
  CREATIVE_FLY_SPRINT_MULT: 2.0,

  // Per-tick physics constants
  GRAVITY_PER_TICK: 0.08,
  VERTICAL_DRAG: 0.98,
  JUMP_IMPULSE: 0.42,
  SLIPPERINESS_DEFAULT: 0.6,
  AIR_DRAG: 0.91,
  GROUND_FRICTION: 0.546, // 0.6 * 0.91

  // Reach & Interaction
  SURVIVAL_REACH: 4.5,
  CREATIVE_REACH: 5.0,
  ENTITY_REACH: 3.0,
  PLACE_COOLDOWN_TICKS: 4, // VERIFY: Vanilla right-click hold block place delay is 4 ticks (200 ms)

  // Baked lighting & AO
  FACE_SHADE: Object.freeze({
    TOP: 1.0,    // +Y
    BOTTOM: 0.5, // -Y
    NORTH: 0.8,  // -Z
    SOUTH: 0.8,  // +Z
    EAST: 0.6,   // +X
    WEST: 0.6    // -X
  }),
  // VERIFY: Smooth AO vertex multipliers for levels 0 (3 occluders) to 3 (0 occluders)
  AO_CURVE: Object.freeze([0.45, 0.65, 0.82, 1.0]),

  // Texture Atlas
  TILE_SIZE: 16,
  ATLAS_COLS: 16,
  ATLAS_ROWS: 16,

  // Default seed
  DEFAULT_SEED: 1337420
});
