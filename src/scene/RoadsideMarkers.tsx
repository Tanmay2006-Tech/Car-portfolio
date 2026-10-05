import { useEffect, useMemo } from 'react'

import { ROAD_PROJECTS, EXPERIENCE } from '../content'
import { INK, srgb } from './colors'
import { makeLabelTexture, LABEL_INK, DISPLAY_FONT, BODY_FONT } from './labelTexture'
import { projectMarkerDistance, servicePostDistance, roadside, ROADSIDE_OFFSET } from './routeMarks'

// Leg 1's five project boards and leg 3's four numbered service posts —
// roadside signage, not floating cards (CLAUDE.md section 1: "the projects
// are physical"). Each board stands on two slim ink posts with its face
// turned to the road; the face is drawn once into a canvas with the site's
// own fonts. Numbered markers appear only on the leg 3 posts (section 2).

const BOARD_W = 3.4
const BOARD_H = 2.1
const BOARD_D = 0.1
const BOARD_BOTTOM = 1.55
const POST_R = 0.055
const FACE = '#fbf4ec'
const EDGE = '#e9ddd2'

function useDispose(texture: { dispose: () => void }) {
  useEffect(() => () => texture.dispose(), [texture])
}

function ProjectBoard({ index }: { index: number }) {
  const project = ROAD_PROJECTS[index]
  const { position, quaternion } = useMemo(
    () => roadside(projectMarkerDistance(index), ROADSIDE_OFFSET + 1.2),
    [index],
  )
  const label = useMemo(
    () =>
      makeLabelTexture(
        (ctx, w, h) => {
          ctx.fillStyle = FACE
          ctx.fillRect(0, 0, w, h)
          ctx.strokeStyle = LABEL_INK
          ctx.lineWidth = 5
          ctx.strokeRect(26, 26, w - 52, h - 52)
          ctx.fillStyle = LABEL_INK
          ctx.textBaseline = 'alphabetic'
          ctx.font = `600 132px ${DISPLAY_FONT}`
          ctx.fillText(project.name, 70, 200, w - 140)
          ctx.font = `400 42px ${BODY_FONT}`
          ctx.fillText(project.kind, 74, 262, w - 140)
          ctx.fillRect(74, 312, 90, 5)
          if (project.figure) {
            ctx.font = `600 120px ${BODY_FONT}`
            ctx.fillText(project.figure.value, 70, 488)
            ctx.font = `400 38px ${BODY_FONT}`
            ctx.fillText(project.figure.label, 74, 548, w - 140)
          } else {
            ctx.font = `400 38px ${BODY_FONT}`
            ctx.fillText(project.stack.join(', '), 74, 548, w - 140)
          }
        },
        1088,
        672,
      ),
    [project],
  )
  useDispose(label)
  const ink = useMemo(() => srgb(INK), [])
  const edge = useMemo(() => srgb(EDGE), [])

  return (
    <group position={position} quaternion={quaternion}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (BOARD_W / 2 - 0.35), (BOARD_BOTTOM + BOARD_H) / 2, -0.02]} castShadow>
          <cylinderGeometry args={[POST_R, POST_R, BOARD_BOTTOM + BOARD_H, 10]} />
          <meshStandardMaterial color={ink} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, BOARD_BOTTOM + BOARD_H / 2, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[BOARD_W, BOARD_H, BOARD_D]} />
        <meshStandardMaterial attach="material-0" color={edge} roughness={0.8} />
        <meshStandardMaterial attach="material-1" color={edge} roughness={0.8} />
        <meshStandardMaterial attach="material-2" color={edge} roughness={0.8} />
        <meshStandardMaterial attach="material-3" color={edge} roughness={0.8} />
        {/* A touch of self-light so the face stays legible when the low sun
            is behind it. */}
        <meshStandardMaterial attach="material-4" map={label} roughness={0.75} emissive="#ffffff" emissiveMap={label} emissiveIntensity={0.28} />
        <meshStandardMaterial attach="material-5" color={edge} roughness={0.8} />
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
      makeLabelTexture(
        (ctx, w, h) => {
          ctx.fillStyle = FACE
          ctx.fillRect(0, 0, w, h)
          ctx.strokeStyle = LABEL_INK
          ctx.lineWidth = 6
          ctx.strokeRect(22, 22, w - 44, h - 44)
          ctx.fillStyle = LABEL_INK
          ctx.textAlign = 'center'
          ctx.font = `600 230px ${BODY_FONT}`
          ctx.fillText(String(index + 1).padStart(2, '0'), w / 2, h * 0.62)
          ctx.font = `500 40px ${BODY_FONT}`
          ctx.fillText(EXPERIENCE[index].dates, w / 2, h * 0.84, w - 60)
        },
        512,
        512,
      ),
    [index],
  )
  useDispose(label)
  const ink = useMemo(() => srgb(INK), [])
  const edge = useMemo(() => srgb(EDGE), [])

  // Turned to face oncoming traffic, toward the approaching car and the
  // chase camera behind it.
  return (
    <group position={position} quaternion={quaternion}>
      <group rotation={[0, -Math.PI / 2 + 0.35, 0]}>
        <mesh position={[0, 1.1, -0.03]} castShadow>
          <cylinderGeometry args={[POST_R, POST_R, 2.2, 10]} />
          <meshStandardMaterial color={ink} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.75, 0.03]} castShadow>
          <boxGeometry args={[1.05, 1.05, 0.08]} />
          <meshStandardMaterial attach="material-0" color={edge} />
          <meshStandardMaterial attach="material-1" color={edge} />
          <meshStandardMaterial attach="material-2" color={edge} />
          <meshStandardMaterial attach="material-3" color={edge} />
          <meshStandardMaterial attach="material-4" map={label} roughness={0.75} emissive="#ffffff" emissiveMap={label} emissiveIntensity={0.28} />
          <meshStandardMaterial attach="material-5" color={edge} />
        </mesh>
      </group>
    </group>
  )
}

export function RoadsideMarkers() {
  return (
    <>
      {ROAD_PROJECTS.map((_, i) => (
        <ProjectBoard key={i} index={i} />
      ))}
      {EXPERIENCE.map((_, i) => (
        <ServicePost key={i} index={i} />
      ))}
    </>
  )
}
