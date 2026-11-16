/* ~/github --live — your most recently pushed public repositories.
   Fetched from the GitHub API after the section scrolls into view, cached for an
   hour. Until then (or if GitHub is unreachable / rate-limited) it shows the repos
   linked from your project cards, so the window is never empty. Height is
   reserved up front, so loading never shifts the layout. */
import { useEffect, useMemo, useRef, useState } from 'react';
import Window from '../../components/ui/Window.jsx';
import { useApp } from '../../app/AppContext.js';
import { GITHUB, LINKS, PROJECTS } from '../../data/portfolio.js';
import { fetchActivity, readCache, ago } from '../../lib/github.js';
import { track } from '../../lib/analytics.js';

const fallbackRepos = () => (GITHUB.pinned?.length
  ? GITHUB.pinned.map(r => ({ name: r.name, url: `https://github.com/${GITHUB.user}/${r.name}`, lang: r.lang || '', stars: null, pushed: null }))
  : PROJECTS.filter(p => p.links?.repo).map(p => ({ name: p.links.repo.split('/').pop(), url: p.links.repo, lang: p.tech[0] || '', stars: null, pushed: null })));

export default function GitHubActivity() {
  const { instant } = useApp();
  const critic = typeof document !== 'undefined' && document.documentElement.classList.contains('critic');
  const [live, setLive] = useState(() => (critic ? null : readCache()));
  const [state, setState] = useState(live ? 'live' : 'idle'); // idle | loading | live | offline
  const ref = useRef(null);
  const fallback = useMemo(fallbackRepos, []);

  useEffect(() => {
    if (critic || live || !ref.current) return undefined;
    let alive = true;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some(e => e.isIntersecting)) return;
      io.disconnect();
      setState('loading');
      fetchActivity().then((data) => {
        if (!alive) return;
        if (data && data.length) { setLive(data); setState('live'); } else setState('offline');
      });
    }, { rootMargin: '300px 0px' });
    io.observe(ref.current);
    return () => { alive = false; io.disconnect(); };
  }, [critic, live, instant]);

  const repos = (live || fallback).slice(0, GITHUB.count);
  const meta = state === 'live' ? '● LIVE' : state === 'loading' ? '◌ SYNC' : '○ CACHED';

  return (
    <div ref={ref} className="mt-[clamp(40px,8vh,80px)]">
      <Window title="~/github --live" meta={meta} metaClass={state === 'live' ? 'text-secondary' : 'text-fg-2'} reveal="card">
        <p className="mb-3 mt-0 text-sm"><span className="text-secondary">$</span> gh repo list {GITHUB.user} --sort pushed --limit {GITHUB.count}</p>
        <ul className="m-0 grid min-h-[13.5em] list-none content-start md:min-h-[7.2em] gap-x-6 gap-y-1 p-0 text-[13.5px] md:grid-cols-2" aria-label="Recently updated repositories">
          {repos.map(r => (
            <li key={r.name} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-dashed border-line py-1.5">
              <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={() => track('github_repo_click', { repo: r.name })} className="truncate text-fg hover:text-secondary">
                <span className="text-fg-3" aria-hidden="true">▸ </span>{r.name}
              </a>
              <span className="whitespace-nowrap text-xs text-fg-2">
                {r.lang && <span>{r.lang}</span>}
                {r.stars ? <span> · ★{r.stars}</span> : null}
                {r.pushed && <span> · {ago(r.pushed)}</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="mb-0 mt-3 text-xs text-fg-2">
          {state === 'live' ? '' : state === 'offline' ? 'GitHub is unreachable right now — showing pinned repositories. ' : 'pinned repositories · live activity loads when you scroll here. '}
          <a href={LINKS.repos || `https://github.com/${GITHUB.user}`} target="_blank" rel="noopener noreferrer" className="border-b border-current text-secondary">all repositories ↗</a>
        </p>
      </Window>
    </div>
  );
}
