import { useRef, useState } from 'react'

// protects a save button against double clicks: a double click on a slow connection used to
// send the same form twice (e.g. the same delivery recorded twice). Two clicks in a row both run
// before react re-renders, so a ref is checked first; the state is only there to disable the button
// usage: const [saving, guard] = useSaving(); await guard(async () => { ... })
export function useSaving() {
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);

  async function guard(task) {
    if (busy.current) return; // already saving, ignore this click
    busy.current = true;
    setSaving(true);
    try {
      await task();
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return [saving, guard];
}
