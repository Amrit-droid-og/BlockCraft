import { TerrainGenerator } from './generator.js';
import { meshSectionPadded } from './mesher.js';

let generator = null;
let currentSeed = null;

self.onmessage = function (e) {
  const msg = e.data;

  if (msg.type === 'generate') {
    if (!generator || currentSeed !== msg.seed) {
      currentSeed = msg.seed;
      generator = new TerrainGenerator(msg.seed);
    }
    const generated = generator.generateChunkData(msg.cx, msg.cz);
    const transferables = [generated.heightmap];
    for (let i = 0; i < generated.sections.length; i++) {
      transferables.push(
        generated.sections[i].blocks,
        generated.sections[i].light,
        generated.sections[i].meta
      );
    }
    self.postMessage(
      {
        type: 'generated',
        jobId: msg.jobId,
        cx: msg.cx,
        cz: msg.cz,
        sections: generated.sections,
        heightmap: generated.heightmap
      },
      transferables
    );
  } else if (msg.type === 'mesh') {
    const paddedBlocks = new Uint16Array(msg.paddedBlocks);
    const paddedLight = new Uint8Array(msg.paddedLight);
    const result = meshSectionPadded(paddedBlocks, paddedLight);

    self.postMessage(
      {
        type: 'meshed',
        jobId: msg.jobId,
        cx: msg.cx,
        cz: msg.cz,
        sy: msg.sy,
        priority: Boolean(msg.priority),
        passes: result.passes
      },
      result.transferables
    );
  }
};
