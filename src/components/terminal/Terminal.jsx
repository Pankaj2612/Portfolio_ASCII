/* ==========================================================================
   TERMINAL — pks-sh, docked to the left or right edge of the screen.
   Commands live in lib/terminalCommands.js.
   Keys: Enter run · ↑/↓ history · Tab autocomplete · Esc close · Ctrl+L clear
   Dock: the [⇄] button or `dock left|right` (remembered in localStorage).
   On phones (< 640px) it becomes a bottom sheet.
   ========================================================================== */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import WindowBar from '../ui/WindowBar.jsx';
import { bannerLines } from '../../lib/ascii.js';
import { createCommands, completionsFor } from '../../lib/terminalCommands.js';
import { sfx } from '../../lib/sound.js';
import { track } from '../../lib/analytics.js';
import SnakeGame from '../../features/snake-game/SnakeGame.jsx';

const HISTORY_KEY = 'pks.history';
const MAX_LINES = 400;
const MAX_HISTORY = 100;
const CHIPS = ['help', 'about', 'skills', 'projects', 'contact', 'clear'];

const loadHistory = () => { try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]').slice(-MAX_HISTORY); } catch { return []; } };

const Terminal = forwardRef(function Terminal({ actions, reduced, onOpenChange, dock = 'right', onDockChange }, ref) {
  const [mounted, setMounted] = useState(false);   // not `hidden`
  const [visible, setVisible] = useState(false);   // `.open` (transition)
  const [lines, setLines] = useState([]);
  const [value, setValue] = useState('');
  const [game, setGame] = useState(false);
  const bodyRef = useRef(null), inputRef = useRef(null), openerRef = useRef(null);
  const history = useRef(loadHistory());
  const hIndex = useRef(history.current.length);
  const draft = useRef('');
  const greeted = useRef(false);
  const seq = useRef(0);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const commands = useMemo(() => createCommands(), []);
  const completions = useMemo(() => completionsFor(commands), [commands]);

  /* ---------------- output ---------------- */
  const print = useCallback((...ls) => {
    setLines(prev => {
      const next = prev.concat(ls.map(l => ({ id: ++seq.current, segs: Array.isArray(l) ? l : [[l, '']] })));
      return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
    });
  }, []);
  const banner = useCallback((text, cls = 't-vi') => {
    const ls = bannerLines(text);
    const cols = [...ls[0]].length;
    const avail = (bodyRef.current?.clientWidth || 600) - 36;
    const size = Math.max(4, Math.min(12, Math.floor((avail / (cols * 0.61)) * 10) / 10));
    setLines(prev => prev.concat({ id: ++seq.current, banner: ls.join('\n'), cls, size, label: text }));
  }, []);
  const echo = useCallback((raw) => print([['pankaj@portfolio:~$ ', 't-acc'], [raw, 't-echo']]), [print]);

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [lines]);

  /* ---------------- open / close ---------------- */
  const open = useCallback((from) => {
          openerRef.current = from || document.activeElement;
              if (!mounted) { sfx.play('open'); track('terminal_open'); }
      setMounted(true);
    requestAnimationFrame(() => setVisible(true));
    onOpenChange?.(true);
    if (!greeted.current) {
      greeted.current = true;
      requestAnimationFrame(() => {
        banner('PKS-SH', 't-acc');
        print([['v1.3', 't-strong'], ['  ·  local shell for this portfolio', 't-dim']], [['type ', 't-dim'], ['help', 't-acc'], [' to list commands, or try ', 't-dim'], ['banner hello', 't-acc']], '');
      });
    }
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 30);
  }, [banner, print, onOpenChange, mounted]);

  const close = useCallback(({ restoreFocus = true } = {}) => {
          setVisible(false);
      sfx.play('close');
      onOpenChange?.(false);
    setTimeout(() => setMounted(false), reduced ? 0 : 260);
    const opener = openerRef.current;
    if (restoreFocus && opener && document.contains(opener)) opener.focus({ preventScroll: true });
  }, [reduced, onOpenChange]);

  useImperativeHandle(ref, () => ({
    open, close,
    toggle: (from) => (mounted ? close() : open(from)),
    isOpen: () => mounted,
    run: (cmd) => run(cmd),
  }));

  /* ---------------- execution ---------------- */
  function run(raw) {
    const line = String(raw).replace(/[\u0000-\u001f]/g, '').slice(0, 200);
    echo(line);
    const trimmed = line.trim();
    if (!trimmed) return;
    const h = history.current;
    if (h[h.length - 1] !== trimmed) h.push(trimmed);
    if (h.length > MAX_HISTORY) h.shift();
    hIndex.current = h.length; draft.current = '';
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch { /* ignore */ }

    const [name, ...args] = trimmed.split(/\s+/);
    const a = actionsRef.current;
    const ctx = {
      print, banner,
      clear: () => setLines([]),
      close: () => close(),
      go: (id) => {
        print([['→ ', 't-hi'], ['cd ', 't-dim'], [`/${id}`, 't-acc']]);
        a.navigate(id);
        if (innerWidth < 640) setTimeout(() => close({ restoreFocus: false }), 650);
      },
      getSection: a.getSection,
      getTheme: a.getTheme, setTheme: a.setTheme,
      getRender: a.getRender, setRender: a.setRender,
      getRendererLabel: a.getRendererLabel,
      getHistory: () => history.current.slice(),
              getDock: () => actionsRef.current.getDock(), setDock: side => actionsRef.current.setDock(side),
        startGame: () => setGame(true),
        openUrl: (url, ev) => { window.open(url, '_blank', 'noopener,noreferrer'); if (ev) track(ev); },
        getSound: () => actionsRef.current.getSound(), setSound: on => actionsRef.current.setSound(on), playSound: n => actionsRef.current.playSound(n),
    };
    const key = name.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(commands, key)) commands[key](args, ctx);
          else { print([[`Command not found: ${name}`, 't-err']], [['Try: ', 't-dim'], ['help', 't-acc']]); sfx.play('error'); }
  }

  const setInput = (v) => {
    setValue(v);
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(v.length, v.length));
  };

  function onKeyDown(e) {
    const h = history.current;
    switch (e.key) {
      case 'ArrowUp':
        if (!h.length) return;
        e.preventDefault();
        if (hIndex.current === h.length) draft.current = value;
        hIndex.current = Math.max(0, hIndex.current - 1);
        setInput(h[hIndex.current]);
        break;
      case 'ArrowDown':
        if (!h.length) return;
        e.preventDefault();
        hIndex.current = Math.min(h.length, hIndex.current + 1);
        setInput(hIndex.current === h.length ? draft.current : h[hIndex.current]);
        break;
      case 'Tab': {
        const v = value.replace(/^\s+/, '').toLowerCase();
        if (!v) return; // empty → let Tab move focus (keyboard accessibility)
        const matches = [...new Set(completions.filter(c => c.startsWith(v)))];
        if (!matches.length) return;
        e.preventDefault();
        if (matches.length === 1) setInput(matches[0] + (matches[0].includes(' ') ? '' : ' '));
        else {
          let p = matches[0];
          for (const s of matches) while (!s.startsWith(p)) p = p.slice(0, -1);
          if (p.length > v.length) setInput(p); else { echo(value); print([[matches.join('   '), 't-dim']]); }
        }
        break;
      }
      case 'Escape': e.preventDefault(); close(); break;
      case 'l': if (e.ctrlKey) { e.preventDefault(); setLines([]); } break;
      default:
    }
  }

  const other = dock === 'right' ? 'left' : 'right';
  const closed = `pointer-events-none opacity-0 max-sm:translate-y-4 ${dock === 'right' ? 'sm:translate-x-6' : 'sm:-translate-x-6'}`;
  const chrome = 'wb-chip flex-none border border-line-strong px-1.5 text-xs text-fg-2 hover:text-ink-0';

  return (
    <div
      id="terminal"
      role="dialog"
      aria-modal="false"
      aria-labelledby="terminalTitle"
      hidden={!mounted}
      data-dock={dock}
      onKeyDown={(e) => { if (e.key === 'Escape' && e.target !== inputRef.current) { e.preventDefault(); close(); } }}
      className={`terminal fixed z-150 transition-[opacity,translate] duration-200 ease-[steps(4)]
        max-sm:inset-x-2 max-sm:bottom-2 max-sm:h-[50vh]
        sm:top-[calc(var(--header-h)+12px)] sm:h-[min(480px,calc(100svh-var(--header-h)-24px))] sm:w-[min(380px,calc(100vw-24px))]
        ${dock === 'right' ? 'sm:right-[calc(var(--rail-w)+12px)]' : 'sm:left-3'} ${visible ? 'opacity-100' : closed}`}
    >
      <div className="window flex h-full flex-col shadow-[0_0_0_3px_var(--color-ink-0),0_0_0_4px_var(--primary),10px_10px_0_4px_rgba(0,0,0,.6)]">
        <WindowBar
          title="pks-sh"
          titleId="terminalTitle"
          right={(
            <>
              <button type="button" onClick={() => onDockChange?.(other)} aria-label={`Dock terminal to the ${other}`} title={`dock ${other}`} className={`${chrome} hover:bg-secondary max-sm:hidden`}>[⇄]</button>
              <button type="button" onClick={() => close()} aria-label="Close terminal (Escape)" className={`${chrome} hover:bg-highlight`}>[ESC]</button>
            </>
          )}
        />
        <div
          ref={bodyRef}
          onClick={() => { if (!getSelection().toString()) inputRef.current?.focus({ preventScroll: true }); }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 text-[12.5px] leading-[1.55] [scrollbar-color:var(--primary)_transparent] [scrollbar-width:thin]"
        >
          <div role="log" aria-live="polite" aria-relevant="additions">
            {lines.map(l => (l.banner
              ? <pre key={l.id} className={`my-1 overflow-hidden whitespace-pre font-banner leading-[1.02] ${l.cls}`} style={{ fontSize: `${l.size}px` }} aria-label={l.label}>{l.banner}</pre>
              : <div key={l.id} className="min-h-[1.55em] whitespace-pre-wrap break-words">{l.segs.map(([t, c, href], i) => (href
                  ? <a key={i} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer" className={`${c || ''} underline decoration-dotted underline-offset-2 hover:text-highlight`}>{t}</a>
                  : <span key={i} className={c || undefined}>{t}</span>))}</div>))}
          </div>
          {game && (
              <SnakeGame onExit={(score) => {
                setGame(false);
                print([['SNAKE.EXE exited · score ', 't-dim'], [String(score), 't-acc']]);
                setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
              }} />
            )}
            <form hidden={game} className="flex items-center gap-2" autoComplete="off" onSubmit={(e) => { e.preventDefault(); const v = value; setValue(''); sfx.play('enter'); run(v); }}>
            <label className="whitespace-nowrap text-secondary" htmlFor="termInput">~$</label>
            <input
              id="termInput" ref={inputRef} type="text" value={value} onChange={(e) => { const v = e.target.value; sfx.play(v.length < value.length ? 'backspace' : 'key'); setValue(v); }} onKeyDown={onKeyDown}
              spellCheck={false} autoCapitalize="off" autoCorrect="off" enterKeyHint="go" aria-describedby="termHint"
              className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0.5 font-mono text-[12.5px] text-fg caret-highlight outline-none max-sm:text-base"
            />
          </form>
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2" aria-label="Quick commands">
          <span id="termHint" className="sr-only">Type a command and press Enter. Arrow keys browse history, Tab autocompletes, Escape closes.</span>
          {CHIPS.map(c => (
            <button key={c} type="button" onClick={() => { run(c); inputRef.current?.focus({ preventScroll: true }); }} className="border border-line-strong bg-ink-1 px-2 py-0.5 text-[11px] text-fg-2 hover:border-secondary hover:bg-secondary hover:text-ink-0">
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export default Terminal;


