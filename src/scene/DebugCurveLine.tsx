import { useEffect, useMemo, useState } from 'react'
import { Line } from '@react-three/drei'

import { ROUTE_CURVE } from './curve'
import { INK, srgb } from './colors'

// Toggle with "D" — a discrete key event, not a per-frame value, so plain
// React state is fine here (CLAUDE.md section 5's "never setState during
// scroll" rule is about the scroll-driven values, not one-off UI toggles).
export function DebugCurveLine() {
  const [visible, setVisible] = useState(true)
  const points = useMemo(() => ROUTE_CURVE.getSpacedPoints(300), [])
  const color = useMemo(() => srgb(INK), [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'd') setVisible((v) => !v)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!visible) return null
  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      position={[0, 0.05, 0]}
      // The route now spans ~900m and the top-down debug camera sits 700m
      // up to fit it — verified with a live render that at that distance
      // this line, only 0.04m above the road ribbon, was losing the depth
      // test to it: invisible from directly overhead, though it rendered
      // fine up close (three-quarter). A bigger Y offset alone would just
      // move the same failure to a different camera distance/angle, so
      // instead this always draws on top regardless of depth, the way a
      // debug overlay should — it's not part of the real scene.
      depthTest={false}
      renderOrder={999}
    />
  )
}
