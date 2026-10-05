import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import { PERSON } from '../content'
import { DAWN_LOW, INK } from './colors'
import { makeLabelTexture, DISPLAY_FONT, BODY_FONT } from './labelTexture'

// Leg 5: contact details on the car's own centre screen (CLAUDE.md
// section 1). The real form is DOM (sections/ContactPanel.tsx); this is
// the in-world echo of it. Position found by raycasting the rendered cabin
// shot: the dash's screen surface sits at x=0.46 in the car's local frame,
// facing back toward the driver (-X), centred on the car's centreline.
const SCREEN_W = 0.29
const SCREEN_H = 0.112
const SCREEN_TINT = new THREE.Color(0.9, 0.9, 0.9)
const SCREEN_POS: [number, number, number] = [0.452, 0.8, 0.03]

export function InfotainmentScreen() {
  const texture = useMemo(
    () =>
      makeLabelTexture((ctx, w, h) => {
        ctx.fillStyle = INK
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = DAWN_LOW
        ctx.font = `600 64px ${DISPLAY_FONT}`
        ctx.fillText(PERSON.name, 48, 92)
        ctx.font = `400 34px ${BODY_FONT}`
        ctx.fillText(PERSON.email, 48, 160)
        ctx.fillText('github.com/Tanmay2006-Tech', 48, 210)
        ctx.font = `400 28px ${BODY_FONT}`
        ctx.fillText('Send a message from the form', 48, 290)
        ctx.fillRect(48, 310, 52, 4)
      }, 1024, 400),
    [],
  )
  useEffect(() => () => texture.dispose(), [texture])

  return (
    // Turned to face the driver (-X), then tilted back to match the dash
    // surface's own normal (-1, 0.07, 0) from the raycast.
    <group position={SCREEN_POS} rotation={[0, -Math.PI / 2, 0]}>
      <mesh rotation={[-0.07, 0, 0]}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        {/* Unlit and untone-mapped: a screen emits its own light. */}
        <meshBasicMaterial map={texture} toneMapped={false} color={SCREEN_TINT} />
      </mesh>
    </group>
  )
}
