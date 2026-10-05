// Written once, in Car.tsx's mount effect, the moment a named node the
// rig depends on (a wheel, a door) turns out to be missing from the
// loaded GLTF. Read by DebugHud.tsx to show a visible warning — the bug
// this exists for (tools/optimize.sh silently regenerating Porsche.tsx
// without gltfjsx's -k flag, dropping wheel_FL/FR/RL/RR and door_1/door_2's
// name="..." attributes entirely) failed completely silently before this:
// Car.tsx's own `if (wheels.FL)` guard swallowed the missing lookup, the
// wheels just stopped spinning, and nothing anywhere said why. A model
// this central to the whole site must never fail that quietly again.
export const modelIntegrity = {
  missing: [] as string[],
}

export function reportMissingNode(name: string, consequence: string) {
  modelIntegrity.missing.push(name)
  console.error(`Car: "${name}" node not found in the loaded model — ${consequence}`)
}
