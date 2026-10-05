import { useState } from 'react'

import { PERSON } from '../content'

// Leg 5's contact form (CLAUDE.md section 7: "a real, focusable,
// submittable <form>"). There's no backend on a static deploy, so sending
// hands the message to the visitor's own mail client, addressed and
// filled in — nothing is collected or stored by the site itself.
export function ContactPanel() {
  const [sent, setSent] = useState(false)

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
      <p>
        Write to <a href={`mailto:${PERSON.email}`}>{PERSON.email}</a>, or use the form.
      </p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          <span>Name</span>
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="form__wide">
          <span>Message</span>
          <textarea name="message" rows={3} required />
        </label>
        <div className="form__wide form__row">
          <button type="submit" className="cta">Send message</button>
          <p className="form__status" role="status">
            {sent ? 'Your mail app should open with the message ready to send.' : ''}
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
