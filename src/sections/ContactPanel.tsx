import { useState } from 'react'

import { PERSON } from '../content'

// Leg 5's contact form (CLAUDE.md section 7: "a real, focusable,
// submittable <form>"). There's no backend on a static deploy, so sending
// hands the message to the visitor's own mail client, addressed and
// filled in — nothing is collected or stored by the site itself.
export function ContactPanel() {
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState(false)

  // Mail links don't open anything for every visitor (no mail app set up,
  // or an embedded viewer that blocks them), so the address is always
  // visible as text and one click copies it.
  async function copyEmail(event: React.MouseEvent<HTMLButtonElement>) {
    try {
      await navigator.clipboard.writeText(PERSON.email)
      setCopied(true)
    } catch {
      const text = event.currentTarget.parentElement?.querySelector('.contact__email')
      if (text) window.getSelection()?.selectAllChildren(text)
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const from = String(data.get('email') ?? '').trim()
    const message = String(data.get('message') ?? '').trim()
    const subject = `Message from ${name || 'your portfolio'}`
    const body = `${message}\n\n${name}${from ? `\n${from}` : ''}`
    window.location.href = `mailto:${PERSON.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <div className="contact">
      <h2>Get in touch</h2>
      <p className="contact__line">
        <span className="contact__email">{PERSON.email}</span>
        <button type="button" className="copy" onClick={copyEmail}>
          {copied ? 'Copied' : 'Copy email'}
        </button>
      </p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          <span>Name</span>
          <input id="contact-name" name="name" autoComplete="name" required />
        </label>
        <label>
          <span>Email</span>
          <input id="contact-email" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="form__wide">
          <span>Message</span>
          <textarea id="contact-message" name="message" rows={3} required />
        </label>
        <div className="form__wide form__row">
          <button type="submit" className="cta">Send message</button>
          <p className="form__status" role="status">
            {sent ? 'Opening your mail app with this message. If nothing opened, copy the address above.' : ''}
          </p>
        </div>
      </form>
      <p className="links">
        <a href={PERSON.github} target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href={PERSON.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a href={PERSON.resume} target="_blank" rel="noopener noreferrer">Resume</a>
      </p>
    </div>
  )
}
