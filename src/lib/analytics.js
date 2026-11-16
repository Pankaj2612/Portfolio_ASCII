/* ==========================================================================
   analytics.js — optional, privacy-friendly analytics (Plausible or Umami).
   Off unless ANALYTICS.provider is set in data/portfolio.js. Never loads in
   critic mode. track() is a no-op when analytics is off.
   Events sent: terminal_open, project_inspect, case_study_open, contact_sent,
                resume_open, github_repo_click, konami
   ========================================================================== */
import { ANALYTICS } from '../data/portfolio.js';

let started = false;

export function initAnalytics() {
  if (started || document.documentElement.classList.contains('critic')) return;
  const a = ANALYTICS;
  const s = document.createElement('script');
  s.defer = true;
  if (a.provider === 'plausible' && a.domain) {
    // queue stub so events sent before the script loads are not lost
    window.plausible = window.plausible || function (...args) { (window.plausible.q = window.plausible.q || []).push(args); };
    s.src = a.src || 'https://plausible.io/js/script.js';
    s.dataset.domain = a.domain;
  } else if (a.provider === 'umami' && a.websiteId) {
    s.src = a.src || 'https://cloud.umami.is/script.js';
    s.dataset.websiteId = a.websiteId;
  } else return;
  started = true;
  document.head.append(s);
}

export function track(name, props) {
  if (!started) return;
  try {
    if (window.plausible) window.plausible(name, props ? { props } : undefined);
    if (window.umami && window.umami.track) window.umami.track(name, props);
  } catch { /* analytics must never break the page */ }
}
