// Splits the optimised desktop model into two files so the car can appear
// before its cabin has downloaded:
//
//   porsche-exterior.glb   everything the outside of the car needs — loaded
//                          first, it's what the landing shot shows
//   porsche-interior.glb   the cabin trim only — streamed in the background
//                          once the exterior is on screen, long before leg 5
//
// Both keep the FULL node hierarchy (only mesh primitives are removed), so
// src/components/Porsche.tsx renders either file unchanged: nodes whose
// mesh lives in the other file just render empty (it optional-chains every
// geometry lookup). Rendering both, overlaid in the same group, gives the
// whole car.
//
// Interior is selected by material, the same list prepare-model.mjs uses
// for the mobile strip, plus the dash clock mesh by name.
//
// Run after tools/optimize.sh. Usage: node tools/split-interior.mjs
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import fs from 'node:fs'

const SRC = 'public/models/porsche-desktop.glb'
const OUT_EXTERIOR = 'public/models/porsche-exterior.glb'
const OUT_INTERIOR = 'public/models/porsche-interior.glb'

const INTERIOR_MATERIALS = new Set([
  'carbon_int',
  'chrom_int',
  'pl_leather_int',
  'leather_int',
  'leather_seam',
  'leather_perforated',
  'bl_pl_M_int',
  'interior_grid',
  'rug_interior',
  'upholstery',
  'belts',
])
const INTERIOR_MESHES = new Set(['monitors_seconds_monitor_0'])

await MeshoptDecoder.ready
await MeshoptEncoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

function isInterior(mesh, prim) {
  return INTERIOR_MESHES.has(mesh.getName()) || INTERIOR_MATERIALS.has(prim.getMaterial()?.getName() ?? '')
}

async function emit(keepInterior, out) {
  const doc = await io.read(SRC)
  let kept = 0
  let dropped = 0
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (isInterior(mesh, prim) === keepInterior) kept++
      else {
        mesh.removePrimitive(prim)
        prim.dispose()
        dropped++
      }
    }
  }
  // Detach meshes left with no primitives, but keep their nodes — the
  // hierarchy is what lines the two files up.
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh()
    if (mesh && mesh.listPrimitives().length === 0) node.setMesh(null)
  }
  await doc.transform(prune({ keepLeaves: true, keepAttributes: true }))
  await io.write(out, doc)
  const mb = (fs.statSync(out).size / 1048576).toFixed(2)
  console.log(`${out}: ${mb} MB (${kept} primitives kept, ${dropped} dropped)`)
}

await emit(false, OUT_EXTERIOR)
await emit(true, OUT_INTERIOR)
console.log(`source ${SRC}: ${(fs.statSync(SRC).size / 1048576).toFixed(2)} MB`)
