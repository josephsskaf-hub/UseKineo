import { PRESENTER_APPROVED_IDS_2410 } from '../presenterCandidates2410' // KINEO-APRESENTADORES-2410
// KINEO-ADS-CENA-95-2110 — biblioteca aprovada, seleção por dono e exclusão dos três pedidos mais recentes.
import { ADS_V2_PRESENTER_LIBRARY, type AdsV2PresenterEntry } from '../v2Presenter'
import type { CenaCategory } from './catalog'
export const CENA95_ACTORS: Record<CenaCategory, readonly string[]> = {
  wearable: ['jade', 'marcus', 'sofia', 'rahul', 'chloe'],
  footwear: ['marcus', 'jade', 'rahul', 'sofia', 'chloe'],
  skincare: ['clara', 'amara', 'sofia', 'chloe', 'hannah'],
  perfume: ['sofia', 'kenji', 'hannah', 'clara', 'rahul'],
  bag: ['hannah', 'kenji', 'sofia', 'rahul', 'chloe'],
  bottle: ['jade', 'marcus', 'rahul', 'sofia', 'chloe'],
  supplement: ['marcus', 'jade', 'rahul', 'sofia', 'chloe'],
  tea: ['sofia', 'clara', 'hannah', 'rahul', 'robert'],
  other: ['sofia', 'clara', 'hannah', 'marcus', 'rahul', 'robert'],
}
export const CENA95_MUSIC = { wearable: 'hustle', footwear: 'hustle', skincare: 'nature', perfume: 'emotional', bag: 'tech', bottle: 'nature', supplement: 'hustle', tea: 'nature', other: 'tech' } as const
export interface Cena95Presenter { id: string; name: string; portrait: string; look: string; gender: 'female' | 'male'; age: 'young_adult' | 'adult' | 'mature' }
const profile = (p: AdsV2PresenterEntry): Cena95Presenter => ({ id: p.id, name: p.name, portrait: `https://www.usekineo.com${p.portrait}`, look: p.look, gender: p.gender === 'woman' ? 'female' : 'male', age: p.ageMin >= 50 ? 'mature' : p.ageMax <= 30 ? 'young_adult' : 'adult' })
/** History is already ordered newest first and scoped by user_id on the server. Never use a caller-supplied history. */
export function chooseCena95Presenter(category: CenaCategory, userId: string, recent: readonly string[], requestedPortrait?: string): Cena95Presenter {
  if (!userId || !Array.isArray(recent)) throw new Error('cena95_history_required')
  const excluded = new Set(recent.slice(0, 3))
  const approved = [...new Set([...CENA95_ACTORS[category].filter(id => PRESENTER_APPROVED_IDS_2410.includes(id)), ...PRESENTER_APPROVED_IDS_2410])].map(id => ADS_V2_PRESENTER_LIBRARY.find(p => p.id === id)).filter((p): p is AdsV2PresenterEntry => !!p?.portrait)
  if (requestedPortrait) {
    const requested = approved.find(p => `https://www.usekineo.com${p.portrait}` === requestedPortrait)
    if (!requested) throw new Error('cena95_actor_not_approved')
    if (excluded.has(requested.id)) throw new Error('cena95_actor_recent')
    return profile(requested)
  }
  const offset = [...userId].reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) >>> 0, 0) % approved.length
  const choice = [...approved.slice(offset), ...approved.slice(0, offset)].find(p => !excluded.has(p.id))
  if (!choice) throw new Error('cena95_actor_rotation_exhausted')
  return profile(choice)
}
export function cena95ActorFromOrder(plan: unknown): string | null {
  if (!plan || typeof plan !== 'object') return null
  const p = plan as { cena?: { plan?: { quality95?: { presenter?: { id?: string } }; input?: { actorUrl?: string } } }; presenter?: { actor_id?: string; id?: string } }
  const id = p.cena?.plan?.quality95?.presenter?.id ?? p.presenter?.actor_id ?? p.presenter?.id
  if (id && ADS_V2_PRESENTER_LIBRARY.some(a => a.id === id)) return id
  const url = p.cena?.plan?.input?.actorUrl
  return ADS_V2_PRESENTER_LIBRARY.find(a => a.portrait && url === `https://www.usekineo.com${a.portrait}`)?.id ?? null
}
