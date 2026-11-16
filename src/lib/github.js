/* ==========================================================================
   github.js — public GitHub activity for the "~/github --live" window.
   Unauthenticated GitHub API (60 requests/hour per visitor IP), so results
   are cached in localStorage for an hour. Any failure returns null and the UI
   falls back to the static project list — the page never breaks.
   ========================================================================== */
import { GITHUB } from '../data/portfolio.js';

const KEY = `pks.gh.${GITHUB.user}`;
const TTL = 60 * 60 * 1000;

export function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    return c && Date.now() - c.t < TTL ? c.data : null;
  } catch { return null; }
}

export async function fetchActivity() {
  const cached = readCache();
  if (cached) return cached;
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(GITHUB.user)}/repos?sort=pushed&per_page=30&type=owner`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const repos = await res.json();
    const data = repos
      .filter(r => !r.fork && !r.archived)
      .slice(0, GITHUB.count)
      .map(r => ({ name: r.name, url: r.html_url, desc: r.description || '', lang: r.language || '', stars: r.stargazers_count, pushed: r.pushed_at }));
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), data })); } catch { /* ignore */ }
    return data;
  } catch { return null; }
}

/** "3d ago", "5h ago" … */
export function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const units = [[31536000, 'y'], [2592000, 'mo'], [86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [n, u] of units) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  return 'just now';
}
