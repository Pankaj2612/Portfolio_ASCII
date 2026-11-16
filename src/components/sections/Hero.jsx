/* HERO — terminal window with the 3D name banner, role, actions and status bar. */
import { useEffect, useMemo, useState } from 'react';
import AsciiBanner from '../ui/AsciiBanner.jsx';
import Stage3D from '../ui/Stage3D.jsx';
import WindowBar from '../ui/WindowBar.jsx';
import { useApp } from '../../app/AppContext.js';
import { PROFILE, LINKS } from '../../data/portfolio.js';
import { track } from '../../lib/analytics.js';

const pad = n => String(n).padStart(2, '0');
const COMMAND = 'whoami';

function Uptime() {
  const [t0] = useState(() => Date.now());
  const [s, setS] = useState(0);
  useEffect(() => { const id = setInterval(() => setS(Math.floor((Date.now() - t0) / 1000)), 1000); return () => clearInterval(id); }, [t0]);
  return <>{pad(Math.floor(s / 3600))}:{pad(Math.floor(s / 60) % 60)}:{pad(s % 60)}</>;
}

export default function Hero() {
  const { renderMode, glStatus, terminalOpen, openTerminal, onNavClick, booted, instant } = useApp();
  const [typed, setTyped] = useState(instant ? COMMAND : '');
  const [caret, setCaret] = useState(!instant);
  const [stage, setStage] = useState(instant ? 4 : 0); // 0..4 revealed blocks

  // intro: type the command, then reveal name → role → tagline → buttons
  useEffect(() => {
    if (!booted || instant) return undefined;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    let t = 120;
    for (let i = 1; i <= COMMAND.length; i++) { t += 60; later(() => setTyped(COMMAND.slice(0, i)), t); }
    t += 150;
    later(() => setCaret(false), t);
    for (let k = 1; k <= 4; k++) later(() => setStage(k), t + (k - 1) * 140);
    return () => timers.forEach(clearTimeout);
  }, [booted, instant]);

  const session = useMemo(() => {
    const now = new Date();
    return `session ${now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' })} ${pad(now.getHours())}:${pad(now.getMinutes())} · tty/pks0`;
  }, []);
  const on = n => (stage >= n ? 'on' : '');

  return (
    <section id="home" aria-labelledby="heroName" className="hero relative flex min-h-svh items-start pb-20 pt-[calc(var(--header-h)+36px)] lg:items-center">
      <div className="shell grid grid-cols-1 items-center gap-[clamp(24px,3vw,48px)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <Stage3D
          id="home"
          className="h-[clamp(170px,28vh,300px)] lg:order-2 lg:h-[min(70vh,600px)]"
          topLeft="CORE.SYS"
          bottomRight={<>RENDER:<b className="ml-1 font-semibold text-fg">{renderMode.toUpperCase()}</b></>}
        />

        <div className="window lg:order-1">
          <WindowBar title="pankaj@portfolio: ~" right={<span className="wb-btn wb-chip text-secondary max-sm:hidden" aria-hidden="true">[↕]</span>} />
          <div className="px-3.5 py-4 sm:p-[clamp(22px,4vw,44px)]">
            <p className="mb-1.5 mt-0 text-sm text-fg-2">{session}</p>
            <p className="mb-1.5 mt-0 text-sm">
              <span className="text-secondary">pankaj@portfolio:~$</span> <span>{typed}</span>
              {caret && <span className="caret" aria-hidden="true" />}
            </p>

            <h1 className="sr-only" id="heroName">{PROFILE.name}</h1>
            <div className={`hero-name mb-2.5 mt-[18px] grid gap-1.5 ${on(1)}`} data-stage="" aria-hidden="true">
              <div className="banner-host min-w-0"><AsciiBanner text={PROFILE.bannerLine1} max={15} /></div>
              <div className="banner-host min-w-0"><AsciiBanner text={PROFILE.bannerLine2} max={15} className="banner-b" /></div>
            </div>

            <p className={`hero-role mb-3 mt-3.5 font-crt text-[clamp(22px,2.6vw,32px)] leading-[1.1] tracking-[.08em] ${on(2)}`} data-stage="">
              <span className="mr-2.5 inline-block bg-highlight px-2 text-ink-0">{PROFILE.roleTag}</span>&gt; {PROFILE.roleLine}<span className="caret" aria-hidden="true" />
            </p>
            <p className={`mb-6 mt-0 max-w-[44ch] text-[clamp(14px,1.4vw,16px)] text-fg-2 ${on(3)}`} data-stage="">
              {PROFILE.tagline[0]}<br className="max-sm:hidden" /> {PROFILE.tagline[1]}
            </p>

            <div className={`flex flex-wrap gap-4 ${on(4)}`} data-stage="">
              <button id="enterTerminal" className="btn btn-primary max-sm:flex-auto" type="button" aria-haspopup="dialog" aria-controls="terminal" aria-expanded={terminalOpen} onClick={e => openTerminal(e.currentTarget)}>
                [ ENTER TERMINAL ]
              </button>
              <a className="btn btn-ghost max-sm:flex-auto" href="#projects" data-nav="projects" onClick={onNavClick}>[ VIEW PROJECTS ]</a>
              {LINKS.resume && (
                <a id="resumeBtn" className="btn btn-ghost max-sm:flex-auto" href={LINKS.resume} target="_blank" rel="noopener noreferrer" onClick={() => track('resume_open')}>[ RÉSUMÉ.PDF ]</a>
              )}
            </div>
          </div>
          <div className="statusbar flex flex-wrap gap-x-3 gap-y-0.5 border-t border-line-strong bg-primary/15 px-3.5 py-1.5 text-[11px] sm:gap-x-[18px] sm:text-xs" aria-label="Session status">
            {[['NODE', PROFILE.node], ['ROLE', PROFILE.roleTag], ['REGION', PROFILE.location.toUpperCase()], ['UP', <Uptime key="u" />]].map(([k, v]) => (
              <span key={k}><b className="mr-1 font-semibold text-secondary">{k}</b>{v}</span>
            ))}
            <span><b className="mr-1 font-semibold text-secondary">GL</b><span id="renderStatus" className={glStatus.warn ? 'text-highlight' : ''}>{glStatus.label}</span></span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[22px] left-1/2 -translate-x-1/2 animate-blink-slow whitespace-nowrap bg-plate px-2 py-0.5 text-[11px] tracking-[.24em] text-fg-2" aria-hidden="true">
        SCROLL ▼ ENTER THE SYSTEM
      </div>
    </section>
  );
}


