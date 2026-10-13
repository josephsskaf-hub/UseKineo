// KINEO-ADS-ROTEIROS-2026-10-13 — 2 a 3 ROTEIROS para escolher no Studio Ads v2 (benchmark Creatify/Topview, item 2; fundador
// aprovou em 13/10). Módulo PURO (sem modelo, sem banco, sem fetch): a forma dos roteiros no plano, na resposta do /plan e a
// troca do roteiro escolhido (POST /api/ads/v2/plan/choose).
//
// De onde vêm os roteiros: lib/ads/v2Brief.ts extractAdsV2Brief({ scripts: true }) escreve o texto de sempre (o roteiro 'a',
// tom 'benefit' — o MESMO texto, a mesma régua, a mesma correção de antes) e, em paralelo e sob o MESMO prazo, UMA chamada a
// mais ao gpt-4o-mini pede 2 versões em outros tons ('bold' e 'story'). Cada versão passa pela MESMA régua do texto de sempre
// (checkV2Copy: palavras da duração, frases de tela, nome da marca, anti-invenção, honestidade/FTC do ator; conserto em código
// de repairCopyRaw). Versão reprovada, repetida, ou chamada que estourou o prazo = sai; o plano NUNCA falha por causa dela.
//
// CONTRATO DA RESPOSTA do POST /api/ads/v2/plan (campos novos; todo o resto igual):
//   scripts: [{ id: 'a'|'b'|'c', tone: 'benefit'|'bold'|'story', label: string, narration: string|null,
//               overlays: [{ role, start, end, text }], words: number }]   — 1 a 3 itens; o 1º é SEMPRE o roteiro de sempre
//   script_id: 'a'                                                             — o roteiro que está no plano agora
//   (`narration` e `overlays` da resposta continuam sendo os do roteiro escolhido — quem não conhece `scripts` segue igual.)
// Corpo do /plan com `scripts: false` (ex.: o lote, que vai direto para a fila) = nenhuma chamada a mais e 1 roteiro.
// A tela mostra o seletor só com scripts.length >= 2. Para trocar:
//   POST /api/ads/v2/plan/choose { order_id, script_id } → { order_id, script_id, narration, overlays, credits }
//   O servidor só COPIA o roteiro guardado no plano do pedido para plan.narration/plan.overlays (texto do cliente não entra);
//   preço, nível, duração e planos de câmera não mudam. O /start de sempre usa o plano gravado (logo, o roteiro escolhido).
import type { AdsV2StoredOverlay } from '@/lib/ads/v2Advance'

export const ADS_V2_SCRIPT_IDS = ['a', 'b', 'c'] as const
export type AdsV2ScriptId = (typeof ADS_V2_SCRIPT_IDS)[number]
export const ADS_V2_SCRIPT_TONES = ['benefit', 'bold', 'story'] as const
export type AdsV2ScriptTone = (typeof ADS_V2_SCRIPT_TONES)[number]
/** No máximo 3 roteiros (o de sempre + 2 tons). */
export const ADS_V2_SCRIPTS_MAX = 3
/** Rótulos em inglês (a tela traduz pelo `tone`). */
export const ADS_V2_SCRIPT_LABELS: Readonly<Record<AdsV2ScriptTone, string>> = {
  benefit: 'Benefit-first',
  bold: 'Bold hook',
  story: 'Story',
}

export interface AdsV2Script {
  id: AdsV2ScriptId
  tone: AdsV2ScriptTone
  label: string
  narration: string | null
  overlays: AdsV2StoredOverlay[]
  words: number
}

/** Um texto aprovado pela régua (o de sempre ou uma versão), antes de virar roteiro. */
export interface AdsV2ScriptCopy {
  tone: AdsV2ScriptTone
  narration: string | null
  overlays: readonly string[]
}

export function isAdsV2ScriptTone(x: unknown): x is AdsV2ScriptTone {
  return typeof x === 'string' && (ADS_V2_SCRIPT_TONES as readonly string[]).includes(x)
}

const wordsOf = (s: string | null) => (s ?? '').trim().split(/\s+/).filter(Boolean).length

/**
 * As frases de tela de UM texto nas janelas do plano — a MESMA conta do núcleo do /plan (lib/ads/v2PlanCore.ts): frases
 * desligadas = []; senão cada janela recebe a frase de mesmo índice e janela sem frase sai. Pura.
 */
export function adsV2ScriptOverlays(slots: readonly { role: string; start: number; end: number }[], texts: readonly string[], overlaysOn: boolean): AdsV2StoredOverlay[] {
  return !overlaysOn ? [] : slots.map((slot, i) => ({ role: slot.role, start: slot.start, end: slot.end, text: texts[i] ?? '' })).filter((o) => o.text)
}

/**
 * Os roteiros do plano: o 1º texto é SEMPRE o de sempre (id 'a'); depois as versões, na ordem, sem tom repetido e sem texto
 * igual a um anterior; no máximo ADS_V2_SCRIPTS_MAX. Pura.
 */
export function adsV2BuildScripts(copies: readonly AdsV2ScriptCopy[], slots: readonly { role: string; start: number; end: number }[], overlaysOn: boolean): AdsV2Script[] {
  const out: AdsV2Script[] = []
  const seenTone = new Set<string>()
  const seenText = new Set<string>()
  for (const c of copies) {
    if (out.length >= ADS_V2_SCRIPTS_MAX) break
    if (!isAdsV2ScriptTone(c.tone) || seenTone.has(c.tone)) continue
    const overlays = adsV2ScriptOverlays(slots, c.overlays, overlaysOn)
    const key = JSON.stringify([(c.narration ?? '').toLowerCase().replace(/\s+/g, ' ').trim(), overlays.map((o) => o.text.toLowerCase())])
    if (seenText.has(key)) continue
    seenTone.add(c.tone)
    seenText.add(key)
    const id = ADS_V2_SCRIPT_IDS[out.length]
    out.push({ id, tone: c.tone, label: ADS_V2_SCRIPT_LABELS[c.tone], narration: c.narration, overlays, words: wordsOf(c.narration) })
  }
  return out
}

/** Os roteiros guardados no plano (o que o /plan gravou). Lixo = []. Pura. */
export function adsV2StoredScripts(plan: unknown): AdsV2Script[] {
  const p = plan && typeof plan === 'object' ? (plan as { scripts?: unknown }) : null
  if (!p || !Array.isArray(p.scripts)) return []
  return p.scripts.filter((s): s is AdsV2Script => !!s && typeof s === 'object' && (ADS_V2_SCRIPT_IDS as readonly string[]).includes((s as AdsV2Script).id) && isAdsV2ScriptTone((s as AdsV2Script).tone) && Array.isArray((s as AdsV2Script).overlays)).slice(0, ADS_V2_SCRIPTS_MAX)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Corpo do POST /api/ads/v2/plan/choose: só { order_id, script_id }. Texto do cliente não existe aqui. Pura. */
export function sanitizeChooseBody(raw: unknown): { ok: true; value: { order_id: string; script_id: AdsV2ScriptId } } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'bad_body' }
  const b = raw as Record<string, unknown>
  if (typeof b.order_id !== 'string' || !UUID.test(b.order_id)) return { ok: false, error: 'bad_order_id' }
  if (typeof b.script_id !== 'string' || !(ADS_V2_SCRIPT_IDS as readonly string[]).includes(b.script_id)) return { ok: false, error: 'bad_script_id' }
  return { ok: true, value: { order_id: b.order_id.toLowerCase(), script_id: b.script_id as AdsV2ScriptId } }
}

/**
 * Troca o roteiro do plano: plan.narration e plan.overlays passam a ser os do roteiro GUARDADO `scriptId`, e plan.script_id
 * marca a escolha. Planos de câmera, duração, ator, estilo e tudo mais ficam como estão (o preço é do nível × duração). Pura.
 */
export function adsV2ChooseScript<P extends { shots?: unknown; narration: string | null; overlays: readonly AdsV2StoredOverlay[] }>(
  plan: P | null | undefined,
  scriptId: AdsV2ScriptId,
): { ok: true; plan: P & { script_id: AdsV2ScriptId }; script: AdsV2Script } | { ok: false; error: string; status: number } {
  if (!plan || !Array.isArray(plan.shots) || plan.shots.length === 0) return { ok: false, error: 'plan_required', status: 409 }
  const scripts = adsV2StoredScripts(plan)
  if (scripts.length === 0) return { ok: false, error: 'no_scripts', status: 409 }
  const script = scripts.find((s) => s.id === scriptId)
  if (!script) return { ok: false, error: 'script_not_found', status: 404 }
  return { ok: true, plan: { ...plan, narration: script.narration, overlays: script.overlays.map((o) => ({ role: o.role, start: o.start, end: o.end, text: o.text })), script_id: script.id }, script }
}
