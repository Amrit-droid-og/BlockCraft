import { floorDiv, floorMod } from './noise.js';
import { HOTBAR_BLOCKS, getBlockDef, renderBlockIconToCanvas } from './blocks.js';

export class HUD {
  constructor(player, world, atlasCanvas) {
    this.player = player;
    this.world = world;
    this.atlasCanvas = atlasCanvas;

    this.f3Element = document.getElementById('f3-overlay');
    this.hotbarElement = document.getElementById('hotbar');
    this.labelElement = document.getElementById('selected-item-label');
    this.showF3 = true;
    this.lastSelectedSlot = -1;

    this.slotElements = [];
    this.buildHotbarDOM();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.showF3 = !this.showF3;
        this.f3Element.classList.toggle('hidden', !this.showF3);
      }
    });
  }

  buildHotbarDOM() {
    this.hotbarElement.innerHTML = '';
    this.slotElements = [];

    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot';

      const keyNum = document.createElement('span');
      keyNum.className = 'hotbar-key';
      keyNum.textContent = String(i + 1);
      slot.appendChild(keyNum);

      const blockId = HOTBAR_BLOCKS[i];
      if (blockId) {
        const iconCanvas = renderBlockIconToCanvas(blockId, this.atlasCanvas);
        slot.appendChild(iconCanvas);
      }

      this.hotbarElement.appendChild(slot);
      this.slotElements.push(slot);
    }
  }

  getCardinalFacing(yaw) {
    const deg = ((yaw * 180) / Math.PI % 360 + 360) % 360;
    if (deg >= 315 || deg < 45) return 'North (-Z)';
    if (deg >= 45 && deg < 135) return 'West (-X)';
    if (deg >= 135 && deg < 225) return 'South (+Z)';
    return 'East (+X)';
  }

  update(fps) {
    // Update Hotbar Selection
    if (this.lastSelectedSlot !== this.player.selectedHotbarIndex) {
      this.lastSelectedSlot = this.player.selectedHotbarIndex;
      for (let i = 0; i < 9; i++) {
        this.slotElements[i].classList.toggle('selected', i === this.lastSelectedSlot);
      }
      const def = getBlockDef(HOTBAR_BLOCKS[this.lastSelectedSlot]);
      this.labelElement.textContent = def.name;
    }

    if (!this.showF3) return;

    const p = this.player.pos;
    const bx = Math.floor(p.x);
    const by = Math.floor(p.y);
    const bz = Math.floor(p.z);
    const cx = floorDiv(bx, 16);
    const cz = floorDiv(bz, 16);
    const sy = Math.max(0, Math.min(15, by >> 4));
    const lx = floorMod(bx, 16);
    const ly = by & 15;
    const lz = floorMod(bz, 16);

    const lightByte = this.world.getLightByte(bx, by + 1, bz);
    const skyLight = (lightByte >> 4) & 15;
    const blockLight = lightByte & 15;

    const hit = this.player.raycastHit;
    const targetStr = hit
      ? `${hit.x}, ${hit.y}, ${hit.z} (${getBlockDef(hit.blockId).name})`
      : 'None';

    this.f3Element.textContent =
      `BlockCraft 1.16-M1 (${Math.round(fps)} fps)\n` +
      `Chunks: ${this.world.chunks.size} loaded | Sections rendered: ${this.world.getRenderedSectionCount()} | Render Dist: ${this.world.renderDistance}\n` +
      `XYZ: ${p.x.toFixed(3)} / ${p.y.toFixed(3)} / ${p.z.toFixed(3)}\n` +
      `Block: ${bx} ${by} ${bz} [${lx} ${ly} ${lz}]\n` +
      `Chunk: ${cx} ${sy} ${cz}\n` +
      `Facing: ${this.getCardinalFacing(this.player.yaw)} (Yaw: ${((this.player.yaw * 180) / Math.PI).toFixed(1)}, Pitch: ${((this.player.pitch * 180) / Math.PI).toFixed(1)})\n` +
      `Light: ${Math.max(skyLight, blockLight)} (${skyLight} sky, ${blockLight} block)\n` +
      `Mode: ${this.player.gamemode.toUpperCase()} | Fly: ${this.player.flying ? 'ON' : 'OFF'} | Ground: ${this.player.onGround}\n` +
      `Looking at: ${targetStr}`;
  }
}
