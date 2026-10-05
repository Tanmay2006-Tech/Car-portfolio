import { OTHER_PROJECTS, MODEL_CREDIT, PERSON } from '../content'

// Everything that isn't on the road (CLAUDE.md section 8: "a plain text
// list at the end — name, one line, GitHub link, no images, no cards"),
// plus the credits the model licence and trademark require (section 10).
export function Footer() {
  return (
    <footer className="footer">
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
