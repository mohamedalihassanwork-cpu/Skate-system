const fallbackKeys = new Map<string, { payload: string; key: string }>()
export function operationToken(actorId: number, action: string, payload: unknown) {
  const name = 'koshk-treasury-operation:' + actorId + ':' + action, fingerprint = JSON.stringify(payload)
  let saved = fallbackKeys.get(name)
  try { const raw = sessionStorage.getItem(name); if (raw) saved = JSON.parse(raw) } catch { /* memory fallback */ }
  if (!saved || saved.payload !== fingerprint) saved = { payload: fingerprint, key: crypto.randomUUID() }
  fallbackKeys.set(name, saved)
  try { sessionStorage.setItem(name, JSON.stringify(saved)) } catch { /* memory fallback */ }
  return { key: saved.key, clear: () => { fallbackKeys.delete(name); try { sessionStorage.removeItem(name) } catch { /* no storage */ } } }
}
