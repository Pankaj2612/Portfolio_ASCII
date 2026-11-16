/* ==========================================================================
   store.js — a tiny external store for values that change during scrolling
   (active section, scroll %, workflow step, active project).
   Components subscribe to just the slice they need, so scrolling never
   re-renders the whole app.
   ========================================================================== */
import { useSyncExternalStore } from 'react';

export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      let changed = false;
      for (const k in patch) if (state[k] !== patch[k]) { changed = true; break; }
      if (!changed) return;
      state = { ...state, ...patch };
      subs.forEach(fn => fn());
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

export function useStore(store, selector) {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()), () => selector(store.get()));
}


