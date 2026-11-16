/* NAV — fixed text-mode menu bar with the sound toggle and terminal button.
   (The scroll indicator is the spider in the right-hand rail: features/scroll-spider.) */
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext.js';
import { useStore } from '../../lib/store.js';
import { sfx } from '../../lib/sound.js';
import { useSoundEnabled } from '../../hooks/useSound.js';

const LINKS = [['about', '01', 'ABOUT'], ['skills', '02', 'STACK'], ['projects', '03', 'PROJECTS'], ['contact', '04', 'CONTACT']];

export default function Nav() {
  const { uiStore, onNavClick, toggleTerminal, terminalOpen } = useApp();
  const active = useStore(uiStore, s => s.section);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);
  const soundOn = useSoundEnabled();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); } };
    const onClick = (e) => { if (!e.target.closest('.nav')) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick); };
  }, [open]);

  const go = (e) => { setOpen(false); onNavClick(e); };

  return (
    <header className="nav fixed inset-x-0 top-0 z-100 border-b border-line-strong bg-ink-1 shadow-[0_1px_0_var(--color-ink-0),0_2px_0_rgba(139,92,246,.25)]">
      <div className="flex h-[var(--nav-h)] items-center justify-between gap-4 px-[clamp(12px,3vw,32px)]">
        <a href="#home" data-nav="home" aria-label="PKS.OS — back to top" onClick={go} className="flex min-h-8 items-center whitespace-nowrap text-sm font-semibold tracking-[.1em] xs:text-[15px]">
          <span className="mr-2 bg-primary-fill px-1.5 py-px text-on-primary shadow-[3px_3px_0_var(--secondary)]">PKS</span>.OS
        </a>

        <nav
          id="navLinks"
          aria-label="Primary"
          className={`${open ? 'flex' : 'hidden'} md:flex md:gap-0.5 max-md:absolute max-md:inset-x-0 max-md:top-full max-md:flex-col max-md:border-b max-md:border-line-strong max-md:bg-ink-1`}
        >
          {LINKS.map(([id, num, label]) => {
            const on = active === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                data-nav={id}
                onClick={go}
                aria-current={on ? 'location' : undefined}
                className={`px-2.5 py-1.5 text-[13px] tracking-[.1em] transition-colors max-md:border-t max-md:border-line max-md:px-[clamp(12px,3vw,32px)] max-md:py-3.5 max-md:text-sm ${on ? 'bg-secondary text-ink-0' : 'text-fg-2 hover:bg-primary/15 hover:text-fg'}`}
              >
                <span className={`mr-1.5 ${on ? 'text-ink-0' : 'text-primary-text'}`}>[{num}]</span>{label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="soundToggle"
            type="button"
            aria-pressed={soundOn}
            aria-label="Sound effects"
            title={soundOn ? 'sound on — click to mute' : 'sound off — click for retro sound effects'}
            onClick={() => sfx.toggle()}
            className={`min-h-8 whitespace-nowrap border px-2.5 py-1.5 text-xs tracking-[.1em] transition-colors ${soundOn ? 'border-secondary bg-secondary text-ink-0' : 'border-line-strong text-fg-2 hover:text-fg'}`}
          >
            <span aria-hidden="true">♪</span><span className="max-sm:hidden" aria-hidden="true"> {soundOn ? 'ON' : 'OFF'}</span>
          </button>
          <button
            id="openTerminalNav"
            type="button"
            aria-haspopup="dialog"
            aria-controls="terminal"
            aria-expanded={terminalOpen}
            onClick={(e) => toggleTerminal(e.currentTarget)}
            className="whitespace-nowrap border border-line-strong px-2.5 py-1.5 text-xs tracking-[.1em] transition-colors hover:bg-primary-fill hover:text-on-primary"
          >
            <span aria-hidden="true">&gt;_</span><span className="max-sm:hidden"> TERMINAL</span><span className="sr-only"> open terminal</span>
          </button>
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="navLinks"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen(o => !o)}
            className={`h-9 w-10 border border-line-strong text-[22px] leading-none md:hidden ${open ? 'bg-secondary text-ink-0' : ''}`}
          >
            <span aria-hidden="true">≡</span>
          </button>
        </div>
      </div>
      
    </header>
  );
}


