// KINEO-RESGATE-FILME-MONTADO-2026-09-02 — parte pura (testavel) da rota
// /api/admin/rescue-composed-films. Ver o cabecalho da rota.
export type RescueVerdict = 'persist' | 'already_persisted' | 'file_gone' | 'not_succeeded' | 'lookup_failed' | 'internal'

// Decide o que fazer com um candidato a partir do que a Creatomate e o banco
// disseram. NUNCA devolve 'persist' sem status succeeded + url.
export function decideRescue(args: {
  alreadyPersisted: boolean
  internal: boolean
  state: { status: string; url?: string | null } | null
}): RescueVerdict {
  if (args.internal) return 'internal'
  if (args.alreadyPersisted) return 'already_persisted'
  if (!args.state) return 'lookup_failed'
  if (args.state.status !== 'succeeded') return 'not_succeeded'
  if (!args.state.url) return 'file_gone'
  return 'persist'
}

// Mesma derivacao de titulo do persist canonico do compose/status (#357).
export function rescueTitle(topic: string | null): string | null {
  if (!topic) return null
  const first = topic.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? topic
  return first.replace(/\[[^\]]*\]/g, '').trim().slice(0, 120) || null
}
