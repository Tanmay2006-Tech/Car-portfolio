import { useEffect, useRef } from 'react'

import { scroll, DOOR_OPEN_START } from '../scene/scrollState'

// The 36% column from CLAUDE.md section 2's layout, made physical: a pale
// pane behind the leg text so roadside volumes passing behind it never
// cost the copy its contrast. Arrives as the hero text leaves (the hero
// sits on open sky and doesn't need it) and leaves as the camera swings to
// the door in leg 5, where "the column drops away". Desktop only — mobile
// already has a solid panel under the car.
export function ColumnPane() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let id = requestAnimationFrame(function tick() {
      const el = ref.current
      if (el) {
        let opacity = 0
        if (scroll.phase === 'coldstart') opacity = Math.min(1, Math.max(0, (scroll.phaseProgress - 0.55) / 0.35))
        else if (scroll.phase === 'route') opacity = Math.min(1, Math.max(0, (DOOR_OPEN_START - 0.012 - scroll.routeP) / 0.012))
        el.style.opacity = opacity.toFixed(3)
      }
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  return <div ref={ref} className="column-pane" aria-hidden="true" style={{ opacity: 0 }} />
}
