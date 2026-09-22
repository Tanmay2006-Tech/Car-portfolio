import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { HERO_PX, COLD_START_PX } from './scrollState'

gsap.registerPlugin(ScrollTrigger)

// TODO: real GitHub/LinkedIn profile URLs — not guessed (see CLAUDE.md's
// own rule against fabricating links). Swap these the moment they're known.
const GITHUB_URL = '#'
const LINKEDIN_URL = '#'
const EMAIL = 'tanmaytripathi7525@gmail.com'
const RESUME_URL = 'https://tanmay-portfolio-3.vercel.app/resume/Tanmay_Tripathi_Resume.pdf'

const linkStyle: React.CSSProperties = {
  color: 'var(--ink)',
  fontFamily: 'var(--font-body)',
  fontSize: 15,
  textDecoration: 'none',
  borderBottom: '1px solid currentColor',
  paddingBottom: 2,
}

// CLAUDE.md section 1 phase A: "All hero text is DOM and must NOT wait for
// the GLB — text renders first, the car fades in when loaded." This
// component has no dependency on the model or its loading state at all;
// it mounts and renders immediately regardless of what's happening inside
// <Canvas>.
//
// The fade-out (phase B, "hero text eases out") is its own ScrollTrigger,
// separate from the main one in ScrollSetup.tsx but sharing the same
// `#page` trigger element — multiple triggers on one element is normal
// GSAP usage. It ends halfway through the cold-start budget, so the hero
// is fully gone well before the camera finishes arriving at CHASE and the
// ignition sweep peaks, rather than the two competing for attention at the
// same instant.
export function HeroOverlay() {
  const copyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!copyRef.current) return
    const trigger = ScrollTrigger.create({
      trigger: '#page',
      start: 0,
      end: HERO_PX + COLD_START_PX * 0.5,
      scrub: true,
      onUpdate: (self) => {
        gsap.set(copyRef.current, {
          autoAlpha: 1 - self.progress,
          y: -24 * self.progress,
        })
      },
    })
    return () => trigger.kill()
  }, [])

  return (
    <div
      ref={copyRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100%',
        width: 'min(36%, 480px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 16,
        padding: '0 48px',
        zIndex: 5,
      }}
    >
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--ink)', margin: 0 }}>
        Machine learning engineer &amp; full-stack developer
      </p>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.1rem, 4.4vw, 3.2rem)',
          fontWeight: 600,
          color: 'var(--ink)',
          margin: 0,
          lineHeight: 1.05,
        }}
      >
        Tanmay Tripathi
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, lineHeight: 1.55, maxWidth: '32ch', color: 'var(--ink)', margin: 0 }}>
        Ships production ML and full-stack systems — including a published traffic-severity model trained on 8,173 incidents.
      </p>
      <div style={{ display: 'flex', gap: 24, marginTop: 8, flexWrap: 'wrap' }}>
        <a href={GITHUB_URL} style={linkStyle}>GitHub</a>
        <a href={LINKEDIN_URL} style={linkStyle}>LinkedIn</a>
        <a href={`mailto:${EMAIL}`} style={linkStyle}>Email</a>
        <a href={RESUME_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>Resume</a>
      </div>
    </div>
  )
}
