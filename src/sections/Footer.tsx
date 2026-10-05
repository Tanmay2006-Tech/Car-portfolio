import { OTHER_PROJECTS, MODEL_CREDIT, PERSON } from '../content'
import { scrollToPx } from '../scene/ScrollSetup'
import { carPose } from '../scene/carPose'

// Everything that isn't on the road (CLAUDE.md section 8: "a plain text
// list at the end — name, one line, GitHub link, no images, no cards"),
// plus the credits the model licence and trademark require (section 10).
export function Footer({ layout }: { layout: 'drive' | 'static' }) {
  // Back to the parked car at the start, snapped there rather than driven
  // 950m in reverse.
  function driveAgain(event: React.MouseEvent<HTMLAnchorElement>) {
    if (layout !== 'drive') return
    event.preventDefault()
    scrollToPx(0)
    carPose.snap = true
  }

  return (
    <footer className="footer">
      <div className="footer__close">
        <p className="footer__line">That's the drive. If you're hiring for machine learning or full-stack work, I'd like to hear about it.</p>
        <p className="footer__actions">
          <a className="button button--solid" href={`mailto:${PERSON.email}`}>Email me</a>
          <a className="button button--outline" href="#top" onClick={driveAgain}>Drive it again</a>
        </p>
      </div>
      <div className="footer__inner">
        <section aria-labelledby="also-built">
          <h2 id="also-built">Also built</h2>
          <ul className="also">
            {OTHER_PROJECTS.map((p) => (
              <li key={p.name}>
                <a href={p.github} target="_blank" rel="noopener noreferrer">{p.name}</a>
                <span>{p.line}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="credits" aria-label="Credits">
          <p>
            3D model: <a href={MODEL_CREDIT.url} target="_blank" rel="noopener noreferrer">{MODEL_CREDIT.text}</a>
          </p>
          <p>
            Porsche is a trademark of Dr. Ing. h.c. F. Porsche AG. This is a personal portfolio, not affiliated with or endorsed by Porsche.
          </p>
          <p>
            © 2026 {PERSON.name}. Built with React Three Fiber, GSAP and Lenis.
          </p>
        </section>
      </div>
    </footer>
  )
}
