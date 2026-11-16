/* ==========================================================================
   portfolio.js — ALL editable content lives here.

   Change text, skills, projects and links in this file; the UI, the
   terminal (`whoami`, `cat skills.txt`, `projects` …) and the 3D scene all
   read from it. No other file needs to change for normal content edits.
   ========================================================================== */

export const PROFILE = {
  name: 'Pankaj Sahu',
  // Big 3D ASCII banners in the hero.
  // Supported characters: A–Z, 0–9, space, . - _
  bannerLine1: 'PANKAJ',
  bannerLine2: 'SAHU',
  role: 'Forward Deployed Engineer',
  roleTag: 'Forward',
  roleLine: 'Deployed Engineer',
  location: 'India',
  node: 'PKS-01',
  tagline: ['Building software where engineering,', 'systems and real-world problems meet.'],
};

/* Links — leave '' to hide one. */
export const LINKS = {
  email: 'sahu94002@gmail.com',
  github: 'https://github.com/Pankaj2612',
  repos: 'https://github.com/Pankaj2612?tab=repositories',
  linkedin: 'https://www.linkedin.com/in/pankaj-kumar-sahu-8a8939291',
  leetcode: 'https://leetcode.com/u/pankajsahu26/',
  // Résumé: put your PDF in /public (e.g. public/resume.pdf) and set 'resume.pdf' here.
  // Empty = the résumé button and `resume` command stay hidden.
  resume: '',
};

/* ==========================================================================
   CONTACT FORM DELIVERY  (see src/lib/mail.js)
   provider:
     'formsubmit'  default. No account needed: messages go to `to`.
                   The FIRST message triggers a one-time "Activate form" email
                   to that inbox; click it once and every message after that
                   is delivered. Optional: replace `to` with the random alias
                   FormSubmit shows after activation, to hide your address.
     'formspree'   set endpoint: 'https://formspree.io/f/xxxxxxx'
     'web3forms'   set accessKey from https://web3forms.com
     'custom'      set endpoint to your own API (JSON POST {name,email,message})
     'mailto'      no backend: the form opens the visitor's mail app
   ========================================================================== */
export const CONTACT = {
  provider: 'formsubmit',
  to: LINKS.email,
  endpoint: '',
  accessKey: '',
  subject: 'New message from your portfolio',
};

/* Live GitHub activity window (Projects section). Cached for 1 hour per visitor. */
export const GITHUB = {
  user: 'Pankaj2612',
  count: 6,
  // shown until the live list loads (or if GitHub is unreachable) — your pinned repos
  pinned: [
    { name: 'AI-Calendar-Agent', lang: 'Python' },
    { name: 'PullAI', lang: 'Python' },
    { name: 'Artistly', lang: 'TypeScript' },
    { name: 'CeetCode', lang: 'TypeScript' },
    { name: 'PlayFairEncyption', lang: 'TypeScript' },
    { name: 'drawdb', lang: 'JavaScript' },
  ],
};

/* Optional privacy-friendly analytics. Leave provider '' to disable.
   plausible: { provider: 'plausible', domain: 'yourdomain.com' }
   umami:     { provider: 'umami', websiteId: 'xxxxxxxx-…', src: 'https://cloud.umami.is/script.js' } */
export const ANALYTICS = { provider: '', domain: '', websiteId: '', src: '' };

/* Section headings: banner = 3D ASCII block letters (same character set as above). */
export const SECTIONS = {
  about: { kicker: '// 01 ─ ABOUT', banner: 'ABOUT', title: '> from ambiguity to working systems' },
  skills: { kicker: '// 02 ─ SYSTEM_CAPABILITIES', banner: 'STACK', title: '> tools in the system' },
  projects: { kicker: '// 03 ─ PROJECT_ARCHIVE', banner: 'PROJECTS', title: '> stored builds' },
  contact: { kicker: '// 04 ─ ESTABLISH_CONNECTION', banner: 'CONTACT', title: ["LET'S BUILD", 'SOMETHING USEFUL.'] },
};

export const ABOUT = [
  `${PROFILE.name} is an FDE Software Engineer focused on turning ambiguous real-world requirements into reliable software systems.`,
  'Working close to the people who will actually use the software, he clarifies what the problem really is, designs a system that fits it, and carries the work through to something deployed, observable and maintainable.',
];

/* Experience timeline (About section → ~/log). Edit freely; newest first. */
export const EXPERIENCE = [
  {
    when: 'NOW', title: 'Graduate Apprentice', org: 'LTIMindtree',
    text: 'Engineering apprenticeship building production-style services and models: Python, FastAPI, SQLAlchemy, SQL, pandas and deep-learning labs (CNNs, transfer learning, detection).',
    tags: ['Python', 'FastAPI', 'SQL', 'ML'],
  },
  {
    when: 'ONGOING', title: 'Independent builds', org: 'github.com/Pankaj2612',
    text: 'AI agents, developer tooling and apps shipped end to end: an AI calendar agent, an automated PR reviewer and an Android torrent manager.',
    tags: ['AI agents', 'Dev tooling', 'Android'],
  },
];

export const WORKFLOW = [
  { title: 'DISCOVER', text: 'Understand the people, the constraints and what "done" really means.' },
  { title: 'ARCHITECT', text: 'Shape data models, interfaces and boundaries that can evolve.' },
  { title: 'BUILD', text: 'Typed, readable code delivered in small reviewable increments.' },
  { title: 'VALIDATE', text: 'Tests, evaluation and real feedback before anything is called finished.' },
  { title: 'DEPLOY', text: 'Ship, observe in production and iterate.' },
];

/* Skill groups. `key` links a card to its node in the 3D graph — keep these six keys.
   `status` is optional and null by default. Set 'ACTIVE' | 'EXPERIENCED' | 'EXPLORING'
   only where it is honestly true. No percentages are shown anywhere. */
export const SKILLS = [
  { key: 'languages', title: 'LANGUAGES', items: [{ name: 'Python', status: null }, { name: 'JavaScript', status: null }, { name: 'TypeScript', status: null }, { name: 'SQL', status: null }] },
  { key: 'backend', title: 'BACKEND', items: [{ name: 'FastAPI', status: null }, { name: 'Node.js', status: null }, { name: 'REST APIs', status: null }, { name: 'SQLAlchemy', status: null }] },
  { key: 'ai', title: 'AI / ML', items: [{ name: 'TensorFlow', status: null }, { name: 'Keras', status: null }, { name: 'scikit-learn', status: null }, { name: 'Computer Vision', status: null }] },
  { key: 'frontend', title: 'FRONTEND', items: [{ name: 'HTML', status: null }, { name: 'CSS', status: null }, { name: 'JavaScript', status: null }, { name: 'Three.js', status: null }, { name: 'WebGL', status: null }] },
  { key: 'data', title: 'DATA', items: [{ name: 'PostgreSQL', status: null }, { name: 'SQLite', status: null }, { name: 'Pandas', status: null }, { name: 'NumPy', status: null }] },
  { key: 'tools', title: 'TOOLS', items: [{ name: 'Git', status: null }, { name: 'Docker', status: null }, { name: 'CI/CD', status: null }] },
];

/* Projects. color = accent (also drives the 3D lighting while the card is active).
   Add repo / demo URLs when they exist — empty links are hidden. */
export const PROJECTS = [
  {
    title: 'AI CALENDAR AGENT', dir: 'ai-calendar-agent', color: 'var(--violet)', textColor: 'var(--violet-soft)',
    desc: 'Chat-based assistant that schedules and manages Google Calendar events from plain English: it creates, updates and checks availability for meetings in real time.',
    tech: ['Python', 'FastAPI', 'Streamlit', 'OpenAI', 'Google Calendar API'],
    flowLabel: 'AGENT LOOP', flow: ['chat', 'parse intent', 'ask follow-up', 'calendar API', 'confirm'],
    details: [
      'Extracts date, time, attendees, duration and intent with an OpenAI GPT model',
      'Creates events, checks availability, modifies events and prevents overlaps',
      'Asks follow-up questions when details are missing',
      'FastAPI backend, Streamlit chat UI, Google OAuth2',
    ],
    outcome: 'Turns a one-line request like “book a meeting with John tomorrow at 3 PM” into a confirmed calendar event, and asks a follow-up when details are missing.',
    caseStudy: {
      problem: 'Scheduling by hand means bouncing between chat, calendar and email to find a slot, then re-typing the details into an event.',
      constraints: [
        'Plain-English requests are ambiguous: dates, durations and attendees are often missing',
        'It must never double-book, so availability is checked before anything is created',
        'Users keep control of their data: Google OAuth2, events live in their own calendar',
      ],
      design: [
        'A GPT model extracts intent, date/time, attendees and duration into a structured request',
        'Missing fields trigger a follow-up question instead of a guess',
        'calendar_tools wraps the Google Calendar API: create, update and free/busy checks',
        'FastAPI backend with a Streamlit chat front-end',
      ],
      next: [
        'Move OAuth client secrets out of the repository into environment secrets',
        'Add tests for date-parsing edge cases (time zones, “next Friday”)',
        'Publish a hosted demo',
      ],
    },
    links: { repo: 'https://github.com/Pankaj2612/AI-Calendar-Agent', demo: '' },
  },
  {
    title: 'PULLAI', dir: 'pullai', color: 'var(--cyan)', textColor: 'var(--cyan)',
    desc: 'Automated pull request reviewer: connect a GitHub repository and every new pull request gets AI-generated review comments and suggestions.',
    tech: ['Python', 'Flask', 'GitHub OAuth', 'Webhooks', 'Google Gemini'],
    flowLabel: 'REVIEW PIPELINE', flow: ['GitHub login', 'webhook', 'PR opened', 'AI review', 'comment'],
    details: [
      'GitHub OAuth login and automatic webhook creation for your repositories',
      'Reviews pull request changes with Google generative AI',
      'Posts review feedback straight onto the pull request',
      'Stores OAuth tokens in a database; secrets kept in environment variables',
    ],
    outcome: 'Every new pull request on a connected repository gets an AI first-pass review automatically, with no manual trigger.',
    links: { repo: 'https://github.com/Pankaj2612/PullAI', 'demo-video': 'https://github.com/Pankaj2612/PullAI#readme' },
  },
  {
    title: 'FTORR', dir: 'ftorr', color: 'var(--coral)', textColor: 'var(--coral)',
    desc: 'Android torrent manager with built-in search: browse results by category, powered by Jackett scraping your configured indexers.',
    tech: ['Android', 'Jackett', 'BitTorrent'],
    flowLabel: 'SEARCH FLOW', flow: ['query', 'category', 'Jackett', 'indexers', 'download'],
    details: [
      'Category-based torrent search from inside the app',
      'Uses Jackett to query and scrape torrent indexers',
      'Manages downloads on the device',
    ],
    outcome: 'Search, filter by category and download from one Android app instead of juggling indexer sites.',
    // TODO: paste the FTorr repository URL here (I could not find it on your public profile)
    links: { repo: '', demo: '' },
  },
];

/* 'amber' is the hidden CRT theme (Konami code ↑↑↓↓←→←→BA, or `theme amber`). */
export const THEMES = ['aurora', 'ember', 'glacier', 'amber'];
export const SECTION_ORDER = ['home', 'about', 'skills', 'projects', 'contact'];


