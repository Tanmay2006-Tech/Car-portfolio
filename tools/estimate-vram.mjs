// Estimates GPU texture memory for a GLB: sums width*height*bytesPerPixel
// (plus ~33% for mipmaps) across all textures. Compressed GPU formats
// (KTX2/Basis) are charged at ~1 byte/px (a rough blended UASTC/ETC1S
// estimate); anything else (PNG/JPEG source images) uploads as full
// uncompressed RGBA8 regardless of file compression, at 4 bytes/px — that
// gap is the whole reason KTX2 matters.
//
// Usage: node tools/estimate-vram.mjs <path-to-glb>

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sizeOf from 'image-size';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node tools/estimate-vram.mjs <path-to-glb>');
  process.exit(1);
}

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(filePath);
const textures = doc.getRoot().listTextures();

let totalBytes = 0;
console.log(`Textures in ${filePath}: ${textures.length}`);
for (const tex of textures) {
  const mimeType = tex.getMimeType();
  const image = tex.getImage();
  if (!image) continue;
  const isKTX2 = mimeType === 'image/ktx2';
  const { width, height } = sizeOf(Buffer.from(image));
  const bytesPerPixel = isKTX2 ? 1 : 4;
  const withMips = width * height * bytesPerPixel * 1.333;
  totalBytes += withMips;
  console.log(
    `  ${tex.getName() || tex.getURI() || '(unnamed)'}: ${width}x${height} ${isKTX2 ? 'KTX2' : mimeType} -> ${(withMips / (1024 * 1024)).toFixed(2)} MB`
  );
}
console.log(`Estimated total GPU texture memory: ${(totalBytes / (1024 * 1024)).toFixed(1)} MB`);
