// KINEO-VERSAO-B-PAINEL-2026-09-08 — o funil da porta de $1, por PESSOA, numa
// função só: o /admin/overview e o cron do placar diário leem daqui, nunca
// recontam com regras próprias (a lição da manhã de 08/09: 16 tabelas de
// "plano pago" e cada tela contava um cliente diferente).
export type EventRow = { name: string; user_id: string | null; created_at?: string | null; metadata?: Record<string, unknown> | null }
export type FunilB = { signups: number; sawDoor: number; clickedDoor: number; checkout: number; paid1: number; autostart: number; converted: number; paywallHits: number }

// KINEO-PRICING-V7-2026-09-09 — o marco anda para o deploy dos preços novos: o
// "depois $X/mês" da porta mudou, então a medição da porta recomeça aqui.
// O dia 08/09 ($9/$19/$29) fica registrado em docs/PLACAR-VERSAO-B-2026-09.md.
export const VERSAO_B_SINCE = '2026-09-09T00:00:00.000Z'

/** Os nomes de evento que o funil lê — o cron e o painel pedem exatamente estes. */
export const VERSAO_B_EVENT_NAMES = [
  'card_entry_required',
  'card_entry_banner_shown',
  'card_entry_banner_clicked',
  // KINEO-TROCA-2026-09-09 — a folha door_v2 (rotina da noite de 08/09) é a
  // mesma porta, vista de outro jeito: conta em viram/clicaram.
  'card_entry_door_shown',
  'card_entry_door_clicked',
  'checkout_started',
  'payment_success',
  'card_entry_resume_autostart',
  'subscription_invoice_paid',
  'paywall_hit',
] as const

export const metaTrue = (m: Record<string, unknown> | null | undefined, k: string) => m?.[k] === true || m?.[k] === 'true' || m?.[k] === '1'

export function funilVersaoB(rows: EventRow[], sinceMs: number, extIds: Set<string>, untilMs: number = Number.POSITIVE_INFINITY): FunilB {
  const sets: Record<keyof FunilB, Set<string>> = { signups: new Set(), sawDoor: new Set(), clickedDoor: new Set(), checkout: new Set(), paid1: new Set(), autostart: new Set(), converted: new Set(), paywallHits: new Set() }
  for (const e of rows) {
    if (!e.user_id || !extIds.has(e.user_id)) continue
    const t = e.created_at ? new Date(e.created_at).getTime() : 0
    if (t < sinceMs || t >= untilMs) continue
    const m = e.metadata ?? null
    const ic = typeof m?.intent_campaign === 'string' ? m.intent_campaign : ''
    switch (e.name) {
      case 'card_entry_required': sets.signups.add(e.user_id); break
      case 'card_entry_banner_shown':
      case 'card_entry_door_shown': sets.sawDoor.add(e.user_id); break
      case 'card_entry_banner_clicked':
      case 'card_entry_door_clicked': sets.clickedDoor.add(e.user_id); break
      case 'checkout_started': if (metaTrue(m, 'card_trial') || ic === 'card_entry' || ic === 'door_v2' || ic.startsWith('trial_1usd')) sets.checkout.add(e.user_id); break
      case 'payment_success': if (metaTrue(m, 'card_trial')) sets.paid1.add(e.user_id); break
      case 'card_entry_resume_autostart': sets.autostart.add(e.user_id); break
      case 'subscription_invoice_paid': if (metaTrue(m, 'trial_conversion')) sets.converted.add(e.user_id); break
      case 'paywall_hit': sets.paywallHits.add(e.user_id); break
    }
  }
  const n = (k: keyof FunilB) => sets[k].size
  return { signups: n('signups'), sawDoor: n('sawDoor'), clickedDoor: n('clickedDoor'), checkout: n('checkout'), paid1: n('paid1'), autostart: n('autostart'), converted: n('converted'), paywallHits: n('paywallHits') }
}

/** Uma linha de diário, sempre na mesma ordem — para o placar automático. */
export function funilVersaoBLinha(rotulo: string, f: FunilB): string {
  return `${rotulo}: nasceram ${f.signups} → viram ${f.sawDoor} → clicaram ${f.clickedDoor} → checkout ${f.checkout} → pagaram $1 ${f.paid1} → filme ${f.autostart} → viraram (dia 8) ${f.converted} · bateram na porta ${f.paywallHits}`
}
