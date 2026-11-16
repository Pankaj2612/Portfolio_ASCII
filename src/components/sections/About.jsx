/* ABOUT — about.txt window + scroll-driven workflow (the 3D rings follow it). */
import SectionHead from '../ui/SectionHead.jsx';
import Window from '../ui/Window.jsx';
import { Section, Split } from '../ui/Section.jsx';
import { useApp } from '../../app/AppContext.js';
import { useStore } from '../../lib/store.js';
import { ABOUT, WORKFLOW, PROFILE, EXPERIENCE } from '../../data/portfolio.js';

function Para({ text }) {
  const i = text.indexOf(PROFILE.name);
  if (i < 0) return <p className="mb-3.5 mt-0 text-prose">{text}</p>;
  return <p className="mb-3.5 mt-0 text-prose">{text.slice(0, i)}<strong className="font-semibold text-fg">{PROFILE.name}</strong>{text.slice(i + PROFILE.name.length)}</p>;
}

export default function About() {
  const { uiStore } = useApp();
  const step = useStore(uiStore, s => s.workflowStep);
  return (
    <Section id="about" labelledBy="aboutTitle">
      <SectionHead section="about" titleId="aboutTitle" srPrefix="About: " />
      <Split side="right" stage={{ id: 'about', topLeft: 'WORKFLOW.CORE', bottomRight: 'RINGS = STAGES' }}>
        <Window title="~/about.txt" meta="r--" reveal="crt">
          <p className="mb-1.5 mt-0 text-sm"><span className="text-secondary">$</span> cat about.txt</p>
          {ABOUT.map((t, i) => <Para key={i} text={t} />)}
          <p className="m-0 text-[.82rem] text-fg-2">-rw-r--r--  pankaj  engineering  about.txt</p>
        </Window>
        <Window title="~/workflow.sh" meta="exec" reveal="crt" className="mt-[30px]">
          <ol id="workflow" aria-label="Engineering workflow" className="m-0 list-none p-0">
            {WORKFLOW.map((w, i) => {
              const done = i <= step, cur = i === step;
              return (
                <li key={w.title} className={`wf-step relative grid grid-cols-[3.4em_minmax(0,1fr)] gap-3 pb-[18px] last:pb-0 ${cur ? 'current' : ''}`}>
                  <span className={`wf-idx self-start py-px text-center font-semibold transition-colors duration-200 ease-[steps(2)] ${cur ? 'bg-highlight text-ink-0' : done ? 'bg-secondary text-ink-0' : 'text-fg-2'}`}>
                    [{String(i + 1).padStart(2, '0')}]
                  </span>
                  <div>
                    <h3 className={`mb-0.5 mt-0 text-sm tracking-[.2em] ${cur ? 'text-highlight' : done ? 'text-fg' : 'text-fg-2'}`}>{w.title}</h3>
                    <p className="m-0 text-[13.5px] text-fg-2">{w.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Window>
        {EXPERIENCE.length > 0 && (
          <Window title="~/log" meta="tail -f" reveal="crt" className="mt-[30px]">
            <p className="mb-3 mt-0 text-sm"><span className="text-secondary">$</span> cat experience.log</p>
            <ol aria-label="Experience" className="m-0 list-none p-0">
              {EXPERIENCE.map((x, i) => (
                <li key={`${x.title}-${i}`} className="grid grid-cols-1 gap-x-3 gap-y-1 border-b border-dashed border-line py-3 first:pt-0 last:border-0 last:pb-0 sm:grid-cols-[5.5em_minmax(0,1fr)]">
                  <span className="self-start whitespace-nowrap py-px text-xs font-semibold tracking-[.12em] text-secondary sm:text-center">[{x.when}]</span>
                  <div className="min-w-0">
                    <h3 className="m-0 text-sm tracking-[.08em] text-fg">{x.title} <span className="font-normal text-fg-2">@ {x.org}</span></h3>
                    <p className="mb-2 mt-1 text-[13.5px] text-fg-2">{x.text}</p>
                    {x.tags?.length > 0 && (
                      <p className="m-0 flex flex-wrap gap-1.5 text-[11.5px]">
                        {x.tags.map(t => <span key={t} className="border border-line-strong px-1.5 text-fg-2">{t}</span>)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Window>
        )}
      </Split>
    </Section>
  );
}


