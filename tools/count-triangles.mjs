// Prints total triangle count and draw call count for a GLB.
// Usage: node tools/count-triangles.mjs <path-to-glb>

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node tools/count-triangles.mjs <path-to-glb>');
  process.exit(1);
}

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read(filePath);
let triangles = 0;
let drawCalls = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    drawCalls++;
    const idx = prim.getIndices();
    triangles += idx ? idx.getCount() / 3 : prim.getAttribute('POSITION').getCount() / 3;
  }
}
console.log(`${filePath}: ${triangles} triangles, ${drawCalls} draw calls`);
