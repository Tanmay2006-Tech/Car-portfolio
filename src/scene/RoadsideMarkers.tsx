import { useEffect, useMemo } from 'react'
import { ROAD_PROJECTS, EXPERIENCE } from '../content'
import { DAWN_HIGH, DAWN_LOW, srgb } from './colors'
import { makeLabelTexture, LABEL_INK, DISPLAY_FONT, BODY_FONT } from './labelTexture'
import { projectMarkerDistance, servicePostDistance, roadside, ROADSIDE_OFFSET } from './routeMarks'

// Leg 1's five project markers and leg 3's four service-log posts. Both
// are simple pastel volumes (CLAUDE.md section 6: "abstract forms read as
// intentional"), carrying a painted label on the face the camera sees.
// Numbered markers appear only on the leg 3 posts (CLAUDE.md section 2).

const SLAB_SIZE: [number, number, number] = [2.6, 3.4, 0.28]
const POST_SIZE: [number, number, number] = [0.9, 1.9, 0.22]
// Face colour behind the label: the pale end of the sky, so ink reads at
// full contrast without introducing a new hue.
const FACE_BG = '#eef1f5'

function ProjectSlab({ index }: { index: number }) {
  const project = ROAD_PROJECTS[index]
  const { position, quaternion } = useMemo(
    () => roadside(projectMarkerDistance(index), ROADSIDE_OFFSET + 1.2),
    [index],
  )
  const label = useMemo(
    () =>
      makeLabelTexture((ctx, w, h) => {
        ctx.fillStyle = FACE_BG
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = LABEL_INK
        // Top third of the face: the car covers the lower half as it passes.
        ctx.fillRect(48, 56, 72, 8)
        ctx.font = `600 104px ${DISPLAY_FONT}`
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(project.name, 46, 190, w - 92)
        ctx.font = `400 38px ${BODY_FONT}`
        ctx.fillText(project.kind, 50, 250, w - 96)
      }, 640, 832),
    [project],
  )
  useEffect(() => () => label.dispose(), [label])

  const body = useMemo(() => srgb(DAWN_HIGH), [])
  return (
    <group position={position} quaternion={quaternion}>
      <mesh position={[0, SLAB_SIZE[1] / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={SLAB_SIZE} />
        <meshStandardMaterial attach="material-0" color={body} roughness={0.9} />
        <meshStandardMaterial attach="material-1" color={body} roughness={0.9} />
        <meshStandardMaterial attach="material-2" color={body} roughness={0.9} />
        <meshStandardMaterial attach="material-3" color={body} roughness={0.9} />
        <meshStandardMaterial attach="material-4" map={label} roughness={0.85} />
        <meshStandardMaterial attach="material-5" color={body} roughness={0.9} />
      </mesh>
    </group>
  )
}

function ServicePost({ index }: { index: number }) {
  const { position, quaternion } = useMemo(
    () => roadside(servicePostDistance(index), ROADSIDE_OFFSET - 0.6),
    [index],
  )
  const label = useMemo(
    () =>
      makeLabelTexture((ctx, w, h) => {
        ctx.fillStyle = FACE_BG
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = LABEL_INK
        ctx.font = `600 150px ${BODY_FONT}`
        ctx.textAlign = 'center'
        ctx.fillText(String(index + 1).padStart(2, '0'), w / 2, h * 0.36)
        ctx.font = `500 34px ${BODY_FONT}`
        ctx.fillText(EXPERIENCE[index].dates, w / 2, h * 0.52, w - 40)
      }, 256 * 2, 540 * 2),
    [index],
  )
  useEffect(() => () => label.dispose(), [label])

  const body = useMemo(() => srgb(DAWN_LOW), [])
  // Turned to face oncoming traffic (local -X, back down the road toward
  // the approaching car and the chase camera behind it).
  return (
    <group position={position} quaternion={quaternion}>
      <group rotation={[0, -Math.PI / 2 + 0.35, 0]}>
        <mesh position={[0, POST_SIZE[1] / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={POST_SIZE} />
          <meshStandardMaterial attach="material-0" color={body} roughness={0.9} />
          <meshStandardMaterial attach="material-1" color={body} roughness={0.9} />
          <meshStandardMaterial attach="material-2" color={body} roughness={0.9} />
          <meshStandardMaterial attach="material-3" color={body} roughness={0.9} />
          <meshStandardMaterial attach="material-4" map={label} roughness={0.85} />
          <meshStandardMaterial attach="material-5" color={body} roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}

export function RoadsideMarkers() {
  return (
    <>
      {ROAD_PROJECTS.map((_, i) => (
        <ProjectSlab key={i} index={i} />
      ))}
      {EXPERIENCE.map((_, i) => (
        <ServicePost key={i} index={i} />
      ))}
    </>
  )
}

