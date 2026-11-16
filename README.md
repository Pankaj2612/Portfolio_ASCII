# PKS.OS — Pankaj Kumar Sahu · FDE Software Engineer

A retro text-mode portfolio on top of a 3D ASCII world.
Built with **React 19**, **Tailwind CSS v4**, **Three.js** and **Vite**.

- The 3D scene is rendered into ASCII glyphs on the GPU.
- Every section has a 3D block-letter banner.
- An **ASCII spider** lowers itself down the right-hand rail as you scroll and catches one fly per section.
- Optional **8-bit sound effects**, synthesised live (no audio files).
- A real **terminal**, docked to the left or right edge, lets you navigate by typing.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173  (hot reload)
npm run build      # production build → dist/
npm run preview    # serve dist/ locally
```

You need Node.js 18 or newer.

---

## What's included

- **Working contact form.** Messages are delivered by email (FormSubmit by default, or Formspree, Web3Forms or your own API). There's a spam honeypot, a resend cooldown, and a prefilled "open in mail app" fallback whenever delivery fails. The form never claims a message was sent unless the mail service confirmed it.
- **Projects with outcomes.** Each card has a one-line result, expandable details, repo and demo links, and an optional `./case-study` write-up.
- **Experience timeline** (`~/log` in About) and a **live GitHub window** (recently pushed repos, cached for an hour, falls back to your pinned repos).
- **Résumé** button and `resume` command (appear once you add a PDF).
- **SEO:** a social-preview image (`public/og.png`), Open Graph and Twitter tags, Person JSON-LD, and canonical URL, sitemap and robots.txt generated at build time.
- **Optional analytics** (Plausible or Umami); off by default.
- **Deploy:** a GitHub Pages workflow, `netlify.toml`, and a CI job that runs the critic on every pull request.
- **Extras:** `snake` (a game in the terminal), the Konami code (↑↑↓↓←→←→BA) for a hidden amber CRT theme, and `links`, `github`, `email` and `cat experience.txt` commands.

---

## Make the contact form deliver to your inbox (2 minutes)

Delivery is already switched on: `CONTACT.provider = 'formsubmit'`, sending to `LINKS.email`.

1. Run the site (`npm run dev`) and send yourself a test message from the form.
2. FormSubmit emails **you** an **"Activate Form"** link. Click it once. Until you do, the form honestly tells visitors their message wasn't delivered yet and offers the mail-app fallback.
3. Send another test: it arrives in your inbox. Replying goes straight to the visitor.
4. Optional: FormSubmit's activation page gives you a random alias. Put it in `CONTACT.to` so your real address isn't in the page source.

Other providers: set `provider` to `'formspree'` (plus `endpoint`), `'web3forms'` (plus `accessKey`), `'custom'` (plus `endpoint`) or `'mailto'` (no backend). All of these live in `src/data/portfolio.js`.

> Activation is tied to the website's address. After you deploy to a new domain, send one test message from the live site and activate again if FormSubmit asks.

---

## Deploy

**GitHub Pages (included):** push the project to a GitHub repo, then go to Settings → Pages → Source and choose **GitHub Actions**. Every push to `main` builds and publishes the site.
Optionally, set a repository variable `SITE_URL` (Settings → Secrets and variables → Actions → Variables) to your public URL, for canonical URLs, the sitemap and absolute preview images.

**Netlify / Vercel:** import the repo; the defaults work (`netlify.toml` is included). Set `SITE_URL` in the site's environment variables.

**Quality gate:** `.github/workflows/quality.yml` builds the site and runs `tools/critic.py` on every pull request, and uploads screenshots and a JSON report.

## Where to edit things

| I want to change… | Edit |
|---|---|
| Name, role, tagline, about text, workflow, skills, projects, links | **`src/data/portfolio.js`** (all content lives here) |
| Contact form delivery | `CONTACT` in `src/data/portfolio.js` (see above) |
| Experience timeline | `EXPERIENCE` in `src/data/portfolio.js` |
| Project outcome / case study / links | `outcome`, `caseStudy`, `links` on each entry in `PROJECTS` |
| Résumé | put `resume.pdf` in `public/` and set `LINKS.resume: 'resume.pdf'` |
| GitHub window | `GITHUB` (user, count, pinned fallback) |
| Analytics | `ANALYTICS` (Plausible domain or Umami website ID) |
| Social preview image | replace `public/og.png` (1200×630) |
| Colours, fonts, breakpoints | `@theme` block in `src/styles/index.css` |
| Theme variants (aurora / ember / glacier) | `:root` and `html[data-theme=…]` in `src/styles/index.css` |
| Layout or spacing of a section | Tailwind classes in `src/components/sections/*.jsx` |
| Terminal commands | `src/lib/terminalCommands.js` (one function per command) |
| Spider look and leg speed | constants at the top of `src/features/scroll-spider/spider.js` |
| Sound volume and recipes | `MASTER`, `FX`, `THROTTLE` in `src/lib/sound.js` |
| 3D look per section | `sceneStates` in `src/features/three/scene.js` |

---

## Project structure

```
src/
├── main.jsx                     React entry
├── app/
│   ├── App.jsx                  composes the page, owns the engines (3D, scroll, terminal)
│   └── AppContext.js            shared state + actions
├── data/
│   └── portfolio.js             ← all editable content
├── styles/
│   └── index.css                Tailwind v4: @theme tokens, themes, retro component classes
├── components/
│   ├── layout/                  Nav (+ sound toggle), Footer, Boot, Cursor, CrtOverlay
│   ├── sections/                Hero, About, Skills, Projects, Contact
│   ├── terminal/                Terminal (docked dialog)
│   └── ui/                      Window, WindowBar, Section/Split, SectionHead, AsciiBanner, Stage3D, Lede
├── features/
│   ├── scroll-spider/           spider.js (pure logic) + ScrollSpider.jsx (rendering)
│   ├── three/                   scene.js (WebGL + ASCII post-process, lazy-loaded)
│   ├── github/                  GitHubActivity.jsx (live repo window)
│   └── snake-game/              game.js (pure logic) + SnakeGame.jsx (terminal game)
├── hooks/                       useReveal, useReducedMotion
├── lib/                         ascii font, scroll engine, scroll→3D bridge, store, terminal commands
└── dev/                         debugApi (window.PKS, used by tools/critic.py)
tools/
├── critic.py                    automated UI / smoothness / performance / contact critic
└── vite-seo.js                  build-time canonical URL, sitemap, robots.txt
.github/workflows/               deploy.yml (GitHub Pages) · quality.yml (critic on PRs)
```

### Styling approach
Layout, spacing, colour and typography are **Tailwind utilities in the JSX**.
The palette is closed: `--color-*: initial` removes Tailwind's default colours, so only the portfolio palette exists (`bg-ink-0`, `text-fg-2`, `border-primary` …), and no green utility can be generated.
A small `@layer components` block keeps the retro chrome that utilities can't express cleanly: double-rule window title bars, ASCII banners, corner-bracket stages, CRT overlays and reveal effects.

A few plain class names (`nav`, `sec-head`, `project`, `terminal`, `rail`, `spider` …) stay as stable hooks for the scroll engine and the critic. They carry little or no styling.

---

## The scroll spider

```
  ┬        ← anchor
  ¦
  @        ← a fly already caught, wrapped in silk
  ¦
\(oo)/     ← the spider (legs switch pose every few pixels)
/(  )\
  ж        ← next fly: the start of the next section
```

- It hangs in a narrow rail on the right edge, and page content is padded so the rail never covers it.
- Scrolling lowers the spider. Reaching a section start wraps that fly into a cocoon; scrolling back up releases it.
- Click anywhere on the rail to jump there. It's an ARIA `progressbar` ("2 of 4 sections reached").

## Sound

All effects are synthesised in the browser with the Web Audio API, so there are no audio files.
Sound is **off by default**: turn it on with the **[♪ OFF]** header button or `sound on`, and the choice is remembered.
No audio context is created until you opt in, and every effect is throttled so fast scrolling or typing never turns into noise. Overall volume is `MASTER` in `src/lib/sound.js`.

## The terminal

- Opens with `/`, `` ` ``, **[ ENTER TERMINAL ]** or the header **>_** button.
- Docked 12px from the right edge by default and 380px wide.
- Move it with **[⇄]** or `dock left` / `dock right`. The choice is remembered.
- On phones it becomes a bottom sheet.

Commands: `help` `about` `skills` `projects` `contact` `home` `open <section>` `cd <section>` `whoami` `ls` `pwd` `cat about.txt|skills.txt|projects.txt` `banner <text>` `render ascii|vector` `theme aurora|ember|glacier` `dock left|right` `history` `clear` `exit`

Easter eggs: `coffee` `matrix` `neofetch` `sudo hire pankaj` · Konami code ↑↑↓↓←→←→BA → amber CRT theme

Commands come only from a fixed map. There is no `eval`, and output is rendered as text.

---

## Critic

```bash
pip install playwright pillow numpy && playwright install chromium
npm run build && npx vite preview --port 8000
python tools/critic.py --url http://localhost:8000/ --shots critic-shots
```

It scores UI & layout, readability (WCAG contrast against real pixels), smoothness, performance, accessibility and retro identity, each out of 10, at 320–1920px.
It also checks the snake (fits its track, advances and eats one pellet per section) and the terminal (docked to an edge, ≤ 400px wide, inside the viewport, dock toggle works, full-width sheet on phones).

---

## Accessibility
- `prefers-reduced-motion`: no boot screen, no render loop, no smooth scrolling, tilt or reveals.
- Semantic landmarks and a skip link.
- Every banner is `aria-hidden` and has a real heading.
- The terminal is a labelled dialog: Escape closes it and focus returns to the button that opened it.
- Focus is visible everywhere.
