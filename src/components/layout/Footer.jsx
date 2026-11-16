import { PROFILE } from '../../data/portfolio.js';

export default function Footer() {
  return (
    <footer className="relative z-2 border-t border-line-strong bg-ink-1">
      <div className="shell flex flex-col justify-between gap-x-5 gap-y-2.5 pb-[26px] pt-[22px] text-xs tracking-[.1em] sm:flex-row sm:flex-wrap">
        <span>© {new Date().getFullYear()} {PROFILE.name.toUpperCase()}</span>
        <span className="text-fg-2">press <kbd>/</kbd> to open the terminal</span>
        <span>BUILT_WITH: REACT + TAILWIND + THREE.JS</span>
      </div>
    </footer>
  );
}


