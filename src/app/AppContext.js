/* AppContext — shared, rarely-changing app state and actions.
   Fast-changing scroll values live in uiStore (see lib/store.js). */
import { createContext, useContext } from 'react';

export const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppContext.Provider>');
  return ctx;
}


