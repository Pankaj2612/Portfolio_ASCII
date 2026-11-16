/* Section heading plate: kicker, 3D banner, real <h2>. Text comes from data/portfolio.js → SECTIONS. */
import { Fragment } from 'react';
import AsciiBanner from './AsciiBanner.jsx';
import { useReveal } from '../../hooks/useReveal.js';
import { SECTIONS } from '../../data/portfolio.js';

export default function SectionHead({ section, titleId, srPrefix, big = false }) {
  const s = SECTIONS[section];
  const [ref, shown] = useReveal();
  const title = Array.isArray(s.title) ? s.title.map((line, i) => <Fragment key={i}>{i > 0 && <br />}{line}</Fragment>) : s.title;
  return (
    <header
      ref={ref}
      data-reveal="print"
      className={`sec-head mb-[clamp(26px,4vw,44px)] w-full border-l-[3px] border-primary bg-plate px-3.5 pb-3 pt-3.5 shadow-[var(--hard)] sm:w-fit sm:max-w-full sm:px-5 sm:pb-3.5 sm:pt-4 ${shown ? 'in' : ''}`}
    >
      <p className="mb-3 mt-0 text-xs tracking-[.2em] text-secondary">{s.kicker}</p>
      <div className="banner-host block w-full min-w-0"><AsciiBanner text={s.banner} max={12} /></div>
      <h2
        id={titleId}
        className={`mb-0 mt-3 font-crt font-normal leading-[1.05] tracking-[.02em] text-fg ${big ? 'text-[clamp(32px,5.4vw,64px)] [text-shadow:-1px_0_rgba(251,113,133,.4),1px_0_rgba(103,232,249,.4)]' : 'text-[clamp(24px,3vw,36px)]'}`}
      >
        {srPrefix && <span className="sr-only">{srPrefix}</span>}
        {title}
      </h2>
    </header>
  );
}


