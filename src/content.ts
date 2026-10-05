// Every word of copy on the site, in one place. Source of truth is the old
// portfolio (tanmay-portfolio-3.vercel.app) and the resume — names, stacks,
// links and numbers are taken from there verbatim, then rewritten to the
// copy rules in CLAUDE.md section 8: plain verbs, sentence case, specifics
// over adjectives, buttons that say what happens.

export const PERSON = {
  name: 'Tanmay Tripathi',
  role: 'Machine learning and full-stack engineer',
  summary:
    'I build systems that read signals and predict failure before it happens, from traffic incidents across Bangalore to service health in production logs.',
  location: 'Jammu, India',
  email: 'Tanmaytripathi7525@gmail.com',
  github: 'https://github.com/Tanmay2006-Tech',
  linkedin: 'https://www.linkedin.com/in/tanmay-tripathi-3a3139234/',
  resume: `${import.meta.env.BASE_URL}resume.pdf`,
}

export interface Project {
  name: string
  kind: string
  stack: string[]
  points: string[]
  github: string
  live?: string
  // One number that proves it, shown large on the card and the roadside sign.
  figure?: { value: string; label: string }
}

// Leg 1: five, in the order the car passes them (CLAUDE.md section 8).
export const ROAD_PROJECTS: Project[] = [
  {
    name: 'NooK',
    kind: 'Library seat occupancy',
    stack: ['React', 'TypeScript', 'Express', 'PostgreSQL'],
    points: [
      'Tracks occupancy across 90+ seats in real time with QR check-in.',
      'Server-authoritative sessions, an away mode, and automated seat recovery.',
      'Librarian command centre and occupancy analytics, OpenAPI-first.',
    ],
    figure: { value: '90+', label: 'seats tracked live' },
    github: 'https://github.com/Tanmay2006-Tech/NooK',
    live: 'https://noo-k-nook.vercel.app',
  },
  {
    name: 'bunkr',
    kind: 'Campus social platform',
    stack: ['TanStack Start', 'React 19', 'TypeScript', 'Supabase'],
    points: [
      'One feed for posts, notices, events and clubs.',
      'Domain-restricted signup with invite-code roles for students, club officers and faculty.',
      'Row-level security on every table; private media served through signed URLs.',
    ],
    figure: { value: '3', label: 'invite-code roles' },
    github: 'https://github.com/Tanmay2006-Tech/digital-campus-square',
    live: 'https://digital-campus-square.vercel.app',
  },
  {
    name: 'Groq Docs RAG',
    kind: 'Retrieval-augmented generation pipeline',
    stack: ['Python', 'FastAPI', 'ChromaDB', 'Groq LLM'],
    points: [
      'Scrapes, chunks, embeds, retrieves and generates over the Groq API docs.',
      'POST /ask pulls the top-k chunks and answers with a Groq model.',
      'Falls back to TF-IDF when sentence-transformers can’t download.',
    ],
    figure: { value: '5', label: 'pipeline stages' },
    github: 'https://github.com/Tanmay2006-Tech/Groq-Docs-RAG',
  },
  {
    name: 'NullTrace',
    kind: 'Infrastructure monitoring',
    stack: ['React', 'TypeScript', 'Express'],
    points: [
      'Real-time infrastructure monitoring and incident tracking.',
      'Log analysis, service health checks, and automated incident insight.',
      'Dashboards and backend workflows built on React and Express.',
    ],
    github: 'https://github.com/Tanmay2006-Tech/NullTrace-Final',
    live: 'https://null-trace-final-nulltrace.vercel.app',
  },
  {
    name: 'Zeno',
    kind: 'AI support assistant',
    stack: ['Three.js', 'Groq API', 'Vercel Edge Functions'],
    points: [
      'Groq-powered chat with sub-200ms streaming and real product knowledge.',
      'Four personas and four switchable Groq models.',
      'Landing page built around a 3D neural orb in Three.js.',
    ],
    figure: { value: '<200ms', label: 'streaming responses' },
    github: 'https://github.com/Tanmay2006-Tech/Zeno',
    live: 'https://zeno-five-topaz.vercel.app',
  },
]

// Leg 2: numbers that are actually true (CLAUDE.md section 1).
export const TELEMETRY: { value: number; decimals: number; suffix?: string; label: string }[] = [
  { value: 8173, decimals: 0, label: 'incidents processed' },
  { value: 63, decimals: 0, label: 'engineered features' },
  { value: 0.64, decimals: 3, label: 'macro F1' },
  { value: 75.5, decimals: 1, suffix: '%', label: 'high-risk recall' },
  { value: 4, decimals: 0, label: 'shipped to production' },
  { value: 1, decimals: 0, label: 'published preprint' },
]

export const SPEC_SHEET: [string, string][] = [
  ['Languages', 'Python, TypeScript, JavaScript, C++, C'],
  ['Machine learning', 'LightGBM, CatBoost, scikit-learn, RAG, embeddings'],
  ['Frontend', 'React, Next.js, Three.js, Tailwind CSS'],
  ['Backend', 'Node.js, Express, FastAPI, REST'],
  ['Data', 'PostgreSQL, MySQL, Supabase, ChromaDB, Prisma'],
  ['Tooling', 'Git, GitHub, Vercel'],
]

// Leg 3: the service log. Chronological, numbered, dated.
export const EXPERIENCE = [
  {
    dates: '07/2025',
    role: 'Python development intern',
    org: 'ShadowFox',
    note: 'Wrote Python solutions to practical problems inside a professional review workflow.',
  },
  {
    dates: '05/2026 – 06/2026',
    role: 'Machine learning intern',
    org: 'Intern Career Path',
    note: 'Built and evaluated machine learning models in Python, from preprocessing through evaluation.',
  },
  {
    dates: '06/2026',
    role: 'Frontend developer intern',
    org: 'Ladybird Web Solution',
    note: 'Built reusable UI components and fixed responsiveness and cross-browser issues.',
  },
  {
    dates: '05/2026 – 09/2026',
    role: 'Student ambassador',
    org: 'Google Gemini',
    note: 'Represented Central University of Jammu; ran AI and Gemini sessions for students.',
  },
]

// Leg 4: the road-risk pair.
export const GRIDSENSE = {
  name: 'GridSense',
  kind: 'Traffic incident severity, Bangalore',
  points: [
    'Predicts congestion severity from 8,173 historical incidents with a three-model ensemble.',
    'LightGBM and CatBoost over 63 engineered features: 0.640 macro F1, 75.5% recall on high-risk incidents.',
    'City risk index, incident map, explainable contributing factors and a what-if simulator.',
  ],
  github: 'https://github.com/Tanmay2006-Tech/Grid-Sense',
  live: 'https://grid-sense-gridsense.vercel.app',
}

export const RISKPATH = {
  name: 'RiskPath',
  kind: 'Road Safety Hackathon 2026, IIT Madras',
  points: [
    'Scores route risk before you travel and compares safer alternatives, factor by factor.',
    'Live map of hotspots, hazards, nearby hospitals and police, with SOS and crash detection.',
  ],
  github: 'https://github.com/Tanmay2006-Tech/Road-Safety-Hackathon-2026-IIT-Madras',
  live: 'https://road-safety-hackathon-2026-iit-madr.vercel.app',
}

export const PAPER = {
  title: 'GridSense: traffic incident severity prediction for Bangalore',
  authors: 'Tanmay Tripathi and Anandi Mahajan',
  venue: 'Preprint, Zenodo',
  doi: '10.5281/zenodo.21724749',
  url: 'https://doi.org/10.5281/zenodo.21724749',
}

// Leg 5.
export const ABOUT = [
  'Computer science undergraduate at Central University of Jammu, class of 2028.',
  'Most of my work sits where models meet production: data pipelines, prediction services, and the interfaces people use to act on them. I care about the number that proves it works.',
  'Open to internships and research collaboration.',
]

// Everything else: a plain list, no cards (CLAUDE.md section 8).
export const OTHER_PROJECTS: { name: string; line: string; github: string }[] = [
  { name: 'Cognify', line: 'Student performance prediction with study planning and progress tracking.', github: 'https://github.com/Tanmay2006-Tech/Cognify' },
  { name: 'Upchaar', line: 'Healthcare web app built for accessibility.', github: 'https://github.com/Tanmay2006-Tech/Upchaar' },
  { name: 'EchoForge-AI', line: 'AI content generation workflows.', github: 'https://github.com/Tanmay2006-Tech/EchoForge-AI' },
  { name: 'RetainIQ', line: 'Churn risk prediction with a what-if simulator and retention actions.', github: 'https://github.com/Tanmay2006-Tech/RetainIQ' },
  { name: 'Feedora', line: 'Food donation platform linking donors, NGOs and volunteers in real time.', github: 'https://github.com/Tanmay2006-Tech/Feedora' },
  { name: 'Tanmay Studio', line: 'Editorial portfolio with a Gemini-powered quote calculator.', github: 'https://github.com/Tanmay2006-Tech/Demo-Studio' },
  { name: 'RepoScan', line: 'Scores a GitHub repository’s health from its URL.', github: 'https://github.com/Tanmay2006-Tech/RepoScan' },
]

export const EDUCATION = [
  { dates: '2024 – 2028', what: 'B.Tech, Computer Science and Engineering', where: 'Central University of Jammu' },
  { dates: '2023 – 2024', what: 'Senior secondary (class 12)', where: 'Birla Open Mind International School, Jammu' },
]

export const MODEL_CREDIT = {
  text: 'Porsche 911 with interior by n.brizitskaya, CC BY 4.0',
  url: 'https://sketchfab.com/3d-models/porsche-911-with-interior-877b1bc1739f4a2bb65d62fd7ffd9f75',
}
