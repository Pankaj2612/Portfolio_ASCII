/* PROJECTS — cards with a subtle (±4°) tilt, ASCII pipeline diagram and expandable
   details. The card nearest the viewport centre is "active" and tints the 3D lighting. */
import { useRef, useState } from 'react';
import SectionHead from '../ui/SectionHead.jsx';
import WindowBar, { Meta } from '../ui/WindowBar.jsx';
import { Section } from '../ui/Section.jsx';
import { useApp } from '../../app/AppContext.js';
import { useReveal } from '../../hooks/useReveal.js';
import { useStore } from '../../lib/store.js';
import { PROJECTS } from '../../data/portfolio.js';
import { track } from '../../lib/analytics.js';
import GitHubActivity from '../../features/github/GitHubActivity.jsx';

const MAX_TILT = 4;
const FINE = typeof window !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches;

/* vertical ASCII box diagram: ┌──────┐ │ step │ └──┬───┘ ▼ … */
function BoxDiagram({ steps, active }) {
  const w = Math.max(...steps.map(s => s.length)) + 2;
  const half = Math.floor(w / 2);
  return (
    <pre className="m-0 hidden overflow-hidden whitespace-pre font-banner text-[12.5px] leading-[1.15] text-fg-2 md:block">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <span key={s}>
            <span className={`transition-colors duration-300 ease-[steps(3)] ${active ? 'text-accent-text' : 'text-fg'}`}>
              {`┌${'─'.repeat(w)}┐\n│ ${s.padEnd(w - 1)}│\n└${'─'.repeat(half)}${last ? '─' : '┬'}${'─'.repeat(w - half - 1)}┘`}
            </span>
            {!last && <>{'\n'}<span>{`${' '.repeat(half + 1)}▼`}</span>{'\n'}</>}
          </span>
        );
      })}
    </pre>
  );
}

const toggleCls = 'border border-accent px-3 py-[7px] text-[12.5px] tracking-[.08em] transition-colors';
const toggleOn = 'border-solid bg-accent text-ink-0';
const toggleOff = 'border-dashed bg-ink-1 hover:border-solid hover:bg-accent hover:text-ink-0';

/* a short write-up: problem → constraints → design → what's next */
function CaseStudy({ id, cs, hidden }) {
  const block = (label, items) => (
    <div className="mb-3">
      <h4 className="mb-1 mt-0 text-xs font-semibold tracking-[.18em] text-accent-text">{label}</h4>
      {Array.isArray(items)
        ? <ul className="m-0 list-none p-0">{items.map(t => <li key={t}><span className="text-fg-3" aria-hidden="true">› </span>{t}</li>)}</ul>
        : <p className="m-0">{items}</p>}
    </div>
  );
  return (
    <div id={id} hidden={hidden} className="mt-4 border border-dashed border-accent bg-ink-0 px-4 py-3 text-[13.5px] text-prose">
      <p className="mb-2.5 mt-0 text-xs text-fg-2">$ cat case-study.md</p>
      {block('PROBLEM', cs.problem)}
      {block('CONSTRAINTS', cs.constraints)}
      {block('DESIGN', cs.design)}
      {block("WHAT I'D DO NEXT", cs.next)}
    </div>
  );
}

function ProjectCard({ p, index, active }) {
  const { reduced } = useApp();
  const [ref, shown] = useReveal();
  const [open, setOpen] = useState(false);
  const [study, setStudy] = useState(false);
  const cardRef = useRef(null);
  const raf = useRef(0);
  const num = String(index + 1).padStart(3, '0');
  const detailsId = `prj-details-${index + 1}`;
  const links = Object.entries(p.links || {}).filter(([, href]) => href);

  const onMove = (e) => {
    if (!FINE || reduced || raf.current) return;
    const { clientX, clientY } = e;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const card = cardRef.current;
      if (!card) return;
      const r = card.getBoundingClientRect();
      const px = (clientX - r.left) / r.width, py = (clientY - r.top) / r.height;
      card.classList.add('tilting');
      card.style.setProperty('--rx', `${((px - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${(-(py - 0.5) * 2 * MAX_TILT * 0.6).toFixed(2)}deg`);
    });
  };
  const onLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.classList.remove('tilting');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  };

  return (
    <article
      ref={ref}
      data-reveal="card"
      aria-labelledby={`prj-title-${index + 1}`}
      style={{ '--pc': p.color, '--pct': p.textColor }}
      className={`project min-w-0 [perspective:1400px] ${active ? 'active' : ''} ${shown ? 'in' : ''}`}
    >
      <div ref={cardRef} className="project-card window" onPointerMove={onMove} onPointerLeave={onLeave}>
        <WindowBar title={`~/${p.dir}/`} right={<Meta className="text-fg-2 max-[480px]:hidden">drwxr-xr-x</Meta>} />
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)] xl:grid-cols-[minmax(0,1.25fr)_minmax(0,.75fr)]">
          <div className="min-w-0 p-[clamp(18px,3vw,34px)]">
            <span className="pid bg-accent px-1.5 font-semibold text-ink-0">PROJECT {num}</span>
            <h3 id={`prj-title-${index + 1}`} className="mb-3 mt-1.5 font-crt text-[clamp(28px,5vw,60px)] font-normal leading-none tracking-[.04em] [overflow-wrap:anywhere] [text-shadow:2px_2px_0_color-mix(in_srgb,var(--pc)_55%,transparent)]">
              {p.title}
            </h3>
            <p className="mb-3 mt-0 max-w-[54ch] text-prose">{p.desc}</p>
            {p.outcome && (
              <p className="mb-[18px] mt-0 max-w-[54ch] border-l-2 border-accent pl-3 text-[13.5px] text-fg">
                <span className="font-semibold text-accent-text">result › </span>{p.outcome}
              </p>
            )}
            <dl className="mb-5 mt-0 flex flex-wrap items-center gap-2 text-[12.5px]">
              <dt className="tracking-[.14em] text-fg-2">TECH:</dt>
              {p.tech.map(t => <dd key={t} className="m-0 border border-accent px-2 py-0.5">{t}</dd>)}
            </dl>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={detailsId}
                onClick={() => { if (!open) track('project_inspect', { project: p.title }); setOpen(o => !o); }}
                className={`${toggleCls} ${open ? toggleOn : toggleOff}`}
              >
                {open ? './inspect --close' : './inspect --details'}
              </button>
              {p.caseStudy && (
                <button
                  type="button"
                  aria-expanded={study}
                  aria-controls={`${detailsId}-cs`}
                  onClick={() => { if (!study) track('case_study_open', { project: p.title }); setStudy(o => !o); }}
                  className={`${toggleCls} ${study ? toggleOn : toggleOff}`}
                >
                  {study ? './case-study --close' : './case-study'}
                </button>
              )}
            </div>
            {p.caseStudy && <CaseStudy id={`${detailsId}-cs`} cs={p.caseStudy} hidden={!study} />}
            <div id={detailsId} hidden={!open} className="mt-4 text-[13.5px] text-fg-2">
              <ul className="mb-2.5 mt-0 list-none p-0">
                {p.details.map(d => <li key={d}><span className="text-accent-text">› </span>{d}</li>)}
              </ul>
              {links.length
                ? <div className="flex flex-wrap gap-3">{links.map(([k, href]) => <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="border-b border-current text-accent-text">./{k} ↗</a>)}</div>
                : <p className="m-0 text-[.82rem]">links: not published yet</p>}
            </div>
          </div>
          <div className="flex min-w-0 flex-col items-center justify-center gap-2.5 border-line bg-ink-2 p-[clamp(16px,2.4vw,26px)] max-md:border-t md:border-l" aria-hidden="true">
            <span className="text-[11px] tracking-[.2em] text-fg-2">// {p.flowLabel}</span>
            <BoxDiagram steps={p.flow} active={active} />
            {/* phones: inline flow that wraps between steps */}
            <p className="m-0 max-w-full text-center text-[12.5px] leading-[1.9] md:hidden">
              {p.flow.map((f, k) => (
                <span key={f}>
                  {k > 0 && <i className="not-italic text-fg-2"> ─▶ </i>}
                  <span className="whitespace-nowrap">[{f}]</span>
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Projects() {
  const { uiStore } = useApp();
  const active = useStore(uiStore, s => s.activeProject);
  return (
    <Section id="projects" labelledBy="projectsTitle">
      <SectionHead section="projects" titleId="projectsTitle" srPrefix="Projects: " />
      <div className="grid grid-cols-1 gap-[clamp(40px,8vh,80px)]">
                  {PROJECTS.map((p, i) => <ProjectCard key={p.title} p={p} index={i} active={i === active} />)}
        </div>
        <GitHubActivity />
    </Section>
  );
}


