/* SKILLS — module cards; hovering/focusing a card lights its node in the 3D graph. */
import SectionHead from '../ui/SectionHead.jsx';
import WindowBar from '../ui/WindowBar.jsx';
import Lede from '../ui/Lede.jsx';
import { Section, Split } from '../ui/Section.jsx';
import { useApp } from '../../app/AppContext.js';
import { useReveal } from '../../hooks/useReveal.js';
import { SKILLS } from '../../data/portfolio.js';

const BADGE = { ACTIVE: 'text-cyan', EXPERIENCED: 'text-violet-soft', EXPLORING: 'text-coral' };

function SkillCard({ group, index }) {
  const { sceneRef } = useApp();
  const [ref, shown] = useReveal();
  const on = () => sceneRef.current?.highlightSkill(group.key);
  const off = () => sceneRef.current?.highlightSkill(null);
  return (
    <div role="listitem" className="min-w-0">
      <article
        ref={ref}
        data-reveal="card"
        data-skill={group.key}
        tabIndex={0}
        style={{ transitionDelay: `${(index % 2) * 60}ms` }}
        aria-label={`${group.title}: ${group.items.map(x => x.name).join(', ')}`}
        onPointerEnter={on} onPointerLeave={off} onFocus={on} onBlur={off}
        className={`skill-card window group h-full outline-none ${shown ? 'in' : ''}`}
      >
        <WindowBar title={`~/${group.key}`} right={<span className="sk-node wb-chip text-[13px] text-secondary group-hover:text-highlight group-focus-visible:text-highlight" aria-hidden="true">◉</span>} />
        <div className="px-4 pb-3 pt-3.5">
          <h3 className="mb-2 mt-0 text-[13px] font-semibold tracking-[.2em] text-secondary">{group.title}</h3>
          <ul className="tree m-0 list-none p-0 text-sm" aria-label={`${group.title} tools`}>
            {group.items.map(it => (
              <li key={it.name}>
                {it.name}
                {it.status && <span className={`ml-2 border border-current px-1 text-[10px] tracking-[.12em] ${BADGE[it.status] || ''}`}>{it.status}</span>}
              </li>
            ))}
          </ul>
          <p className="mb-0 mt-2.5 border-t border-dashed border-line pt-2 text-[11.5px] tracking-[.06em] text-fg-2">{group.items.length} modules · linked to core</p>
        </div>
      </article>
    </div>
  );
}

export default function Skills() {
  return (
    <Section id="skills" labelledBy="skillsTitle">
      <SectionHead section="skills" titleId="skillsTitle" srPrefix="Tech stack: " />
      <Split side="left" stage={{ id: 'skills', topLeft: 'CORE.GRAPH', bottomRight: 'HOVER A MODULE' }}>
        <Lede>Each module is a node in the graph. Hover or focus a card to light up its node.</Lede>
        <div role="list" className="grid grid-cols-1 gap-x-[22px] gap-y-[26px] sm:grid-cols-2">
          {SKILLS.map((g, i) => <SkillCard key={g.key} group={g} index={i} />)}
        </div>
      </Split>
    </Section>
  );
}


