/* `snake` — a tiny ASCII game that runs inside the terminal.
   Arrows / WASD steer, P pauses, Q or Esc quits. On-screen arrows for touch. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { newGame, turn, step, render, TICK_MS } from './game.js';
import { sfx } from '../../lib/sound.js';

const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
const BEST_KEY = 'pks.snake.best';
const readBest = () => { try { return +localStorage.getItem(BEST_KEY) || 0; } catch { return 0; } };

export default function SnakeGame({ onExit }) {
  const [state, setState] = useState(() => newGame());
  const [paused, setPaused] = useState(false);
  const [best, setBest] = useState(readBest);
  const boxRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => { boxRef.current?.focus({ preventScroll: true }); }, []);

  useEffect(() => {
    if (paused || state.over) return undefined;
    const id = setInterval(() => {
      const { state: next, event } = step(stateRef.current);
      if (event === 'eat') sfx.play('catch');
      if (event === 'die') sfx.play('error');
      if (event === 'win') sfx.play('bootDone');
      setState(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [paused, state.over]);

  useEffect(() => {
    if (state.over && state.score > best) {
      setBest(state.score);
      try { localStorage.setItem(BEST_KEY, String(state.score)); } catch { /* ignore */ }
    }
  }, [state.over, state.score, best]);

  const steer = useCallback(dir => setState(s => turn(s, dir)), []);
  const restart = () => { setState(newGame()); setPaused(false); sfx.play('toggle'); boxRef.current?.focus({ preventScroll: true }); };

  const onKeyDown = (e) => {
    if (KEYS[e.key]) { e.preventDefault(); steer(KEYS[e.key]); return; }
    if (e.key === 'Escape' || e.key === 'q' || e.key === 'Q') { e.preventDefault(); e.stopPropagation(); onExit(state.score); return; }
    if (e.key === 'p' || e.key === 'P' || e.key === ' ') { e.preventDefault(); if (!state.over) setPaused(v => !v); return; }
    if ((e.key === 'Enter' || e.key === 'r' || e.key === 'R') && state.over) { e.preventDefault(); restart(); }
  };

  const pad = 'border border-line-strong bg-ink-1 px-2.5 py-1 text-fg-2 hover:border-secondary hover:text-fg';
  return (
    <div
      ref={boxRef}
      tabIndex={0}
      role="application"
      aria-label={`Snake game. Score ${state.score}. Arrow keys or W A S D steer, P pauses, Q quits.`}
      onKeyDown={onKeyDown}
      className="snake-game my-2 outline-none focus-visible:outline-1 focus-visible:outline-dashed focus-visible:outline-secondary"
    >
      <p className="m-0 flex flex-wrap justify-between gap-x-4 text-xs">
        <span className="text-secondary">SNAKE.EXE</span>
        <span className="text-fg">score {state.score} <span className="text-fg-2">· best {Math.max(best, state.score)}</span></span>
      </p>
      <pre className="my-1 overflow-hidden font-banner text-[12px] leading-[1.1] text-fg-2" aria-hidden="true">
        {render(state).map((row, i) => (
          <span key={i} className="block">
            {[...row].map((ch, j) => <span key={j} className={ch === '@' ? 'text-highlight' : ch === 'o' ? 'text-secondary' : ch === '*' ? 'text-highlight font-bold' : undefined}>{ch}</span>)}
          </span>
        ))}
      </pre>
      <p className="m-0 text-xs text-fg-2" aria-live="polite">
        {state.over ? (state.won ? '★ you filled the board! ' : '✕ game over. ') + 'Enter/R = restart · Q = quit' : paused ? '❚❚ paused · P = resume' : '←↑↓→ / WASD steer · P pause · Q quit'}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs" aria-label="Touch controls">
        {[['←', 'left'], ['↑', 'up'], ['↓', 'down'], ['→', 'right']].map(([l, d]) => (
          <button key={d} type="button" className={pad} aria-label={`steer ${d}`} onClick={() => { steer(d); boxRef.current?.focus({ preventScroll: true }); }}>{l}</button>
        ))}
        {state.over
          ? <button type="button" className={pad} onClick={restart}>restart</button>
          : <button type="button" className={pad} onClick={() => setPaused(v => !v)}>{paused ? 'resume' : 'pause'}</button>}
        <button type="button" className={pad} onClick={() => onExit(state.score)}>quit</button>
      </div>
    </div>
  );
}
