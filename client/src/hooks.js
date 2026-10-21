import { useRef, useState } from 'react'

// protects a save button against double clicks (docs/UX_EVALUATION.md, defect #1)
// a double click on a slow connection used to record the same receipt twice.
// state alone is not enough: two clicks in a row both run before react re-renders,
// so a ref is checked first, and the state is only there to disable the button
//
// usage: const [saving, guard] = useSaving();
//        await guard(async () => { await api.post(...) });
//        <button disabled={saving}>
export function useSaving() {
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);

  async function guard(task) {
    if (busy.current) return; // a save is already running, ignore this click
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
