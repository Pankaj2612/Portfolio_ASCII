/* useSound — React view of the sound on/off state (see lib/sound.js). */
import { useSyncExternalStore } from 'react';
import { sfx } from '../lib/sound.js';

export function useSoundEnabled() {
  return useSyncExternalStore(sfx.subscribe, sfx.isEnabled, () => false);
}

