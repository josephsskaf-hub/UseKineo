// KINEO-META95-REGUA-1910 — regras PURAS da régua 95 (sem banco, sem rede): de qual produto é cada entrega, qual é a ideia
// original da pessoa, e o "brief" de visão de cada produto. Usadas pelo cron (lib/regua95/coletar.ts), pelo painel e pelo
// calibrador offline — a mesma regra nos três.
import type { IdeaSource, ProdutoRegua } from '@/lib/regua95/coherenceV2'
import type { PixelContext } from '@/lib/regua95/pixelScore'
import { isScore } from '@/lib/regua95/evidence'

export const PRODUTOS_REGUA: ProdutoRegua[] = ['filme', 'ads', 'ugc', 'clipe']
export const ROTULO_PRODUTO_REGUA: Record<ProdutoRegua, string> = { filme: 'Filmes', ads: 'Ads', ugc: 'UGC / avatar', clipe: 'Clipes' }
/** Linha de corte padrão do painel: o dia desta entrega (as notas novas só existem daqui em diante). */
export const REGUA95_DEPLOY_DESDE = '2026-10-19T00:00:00Z'
/** A régua do fundador: 95 = perfeito (docs/DIAGNOSTICO-META-95-2026-10-19.md). */
export const META_95 = 95

/** quality_mode de `videos` + plano do pedido de Ads → produto. Ads com apresentador (plan.presenter objeto) = UGC. */
export function produtoDoVideo(qualityMode: string | null | undefined, adsPlanoTemApresentador?: boolean | null): ProdutoRegua {
  const q = String(qualityMode ?? '')
  if (q === 'ads_v2') return adsPlanoTemApresentador ? 'ugc' : 'ads'
  if (q === 'clip') return 'clipe'
  if (q === 'avatar') return 'ugc'
  return 'filme'
}

const norm = (s: string) => String(s ?? '').toLowerCase().replace(/\[[^\]]*\]/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim()

export type ScriptWrittenLido = { created_at: string; original_idea: string; script_head: string }

/**
 * A IDEIA ORIGINAL de um filme (item 2 da meta 95: julgar contra o que a pessoa digitou, não contra o roteiro da IA).
 *   · verbatim=false → o prompt do nascimento É a ideia (a IA do servidor escreveu a fala);
 *   · verbatim=true → procura o script_written (com original_idea, gravado por /api/generate-script desde esta entrega) da
 *     mesma pessoa até 3 h antes do nascimento; casa pelo começo do roteiro (60 caracteres normalizados); sem casar, o
 *     mais recente da janela;
 *   · nada → 'roteiro' (colado/ChatGPT/filme antigo): a ideia original não existe e o evento diz isso.
 */
export function resolverIdeia(input: { birthPrompt: string; verbatim: boolean | null; birthAt: string; scriptWritten: ScriptWrittenLido[] }): { idea: string; source: IdeaSource } {
  const prompt = String(input.birthPrompt ?? '')
  if (input.verbatim === false && prompt.trim()) return { idea: prompt, source: 'pedido_direto' }
  const fim = Date.parse(input.birthAt)
  const ini = fim - 3 * 3600_000
  const janela = (input.scriptWritten ?? [])
    .filter((s) => s && typeof s.original_idea === 'string' && s.original_idea.trim())
    .filter((s) => { const t = Date.parse(s.created_at); return Number.isFinite(t) && t >= ini && t <= fim + 60_000 })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const cabeca = norm(prompt).slice(0, 60)
  const casado = cabeca.length >= 20 ? janela.find((s) => { const h = norm(s.script_head).slice(0, 60); return h.length >= 20 && (h.startsWith(cabeca.slice(0, Math.min(cabeca.length, h.length))) || cabeca.startsWith(h)) }) : undefined
  if (casado) return { idea: casado.original_idea, source: 'script_written' }
  if (janela[0]) return { idea: janela[0].original_idea, source: 'script_written_janela' }
  return { idea: prompt, source: 'roteiro' }
}

type Foto = { url?: unknown; kind?: unknown }
type Roteiro = { id?: unknown; narration?: unknown; overlays?: unknown }

/** Pedido de Ads v2 (ads_v2_orders) → contexto do juiz de visão: o que foi pedido, a fala escolhida, a foto real do produto. */
export function contextoDoAnuncio(order: { brief?: unknown; plan?: unknown; photos?: unknown; language?: unknown }, produto: ProdutoRegua): PixelContext {
  const brief = (order.brief && typeof order.brief === 'object' ? order.brief : {}) as Record<string, unknown>
  const plan = (order.plan && typeof order.plan === 'object' ? order.plan : {}) as Record<string, unknown>
  const s = (x: unknown) => (typeof x === 'string' ? x.trim() : '')
  const roteiros = Array.isArray(plan.scripts) ? (plan.scripts as Roteiro[]) : []
  const escolhido = roteiros.find((r) => s(r?.id) && s(r?.id) === s(plan.script_id)) ?? roteiros[0]
  const copy = (brief.copy && typeof brief.copy === 'object' ? brief.copy : {}) as Record<string, unknown>
  const narration = s(escolhido?.narration) || s(copy.narration)
  const overlays = (Array.isArray(escolhido?.overlays) ? (escolhido!.overlays as unknown[]) : Array.isArray(copy.overlays) ? (copy.overlays as unknown[]) : [])
    .map((o) => (typeof o === 'string' ? o : o && typeof o === 'object' ? s((o as Record<string, unknown>).text) : ''))
    .filter(Boolean)
  const fotos = Array.isArray(order.photos) ? (order.photos as Foto[]) : []
  const doProduto = fotos.filter((f) => s(f?.kind) === 'product' && s(f?.url))
  const refs = (doProduto.length ? doProduto : fotos.filter((f) => s(f?.url))).map((f) => s(f.url)).slice(0, 3)
  const asked = [
    s(brief.sentence) || s(brief.business),
    s(brief.business) && s(brief.business) !== s(brief.sentence) ? `negócio: ${s(brief.business)}` : '',
    s(brief.scene) ? `cena pedida: ${s(brief.scene)}` : '',
    overlays.length ? `texto na tela: ${overlays.map((o) => `"${o}"`).join(' / ')}` : '',
  ].filter(Boolean).join(' · ')
  const lang = s(order.language) || s((brief.extracted as Record<string, unknown> | undefined)?.language)
  return { product: produto, engine: 'ads_v2', asked, narration: narration || null, productPhotoUrls: refs, language: lang || null }
}

/** Nota combinada da régua 95: as duas notas quando existem (o vídeo só é 95 se o texto E o pixel forem 95) → a MENOR. */
export function notaRegua(coerencia: number | null | undefined, pixel: number | null | undefined): number | null {
  const c = typeof coerencia === 'number' && Number.isFinite(coerencia) ? coerencia : null
  const p = typeof pixel === 'number' && Number.isFinite(pixel) ? pixel : null
  if (c == null && p == null) return null
  if (c == null) return p
  if (p == null) return c
  return Math.min(c, p)
}

/** Explicit applicability. Missing a REQUIRED judge is not a passing grade. Legacy helper stays available for history. */
export function combinarNotaPorProduto(product: ProdutoRegua, notas: { coerencia?: number | null; pixel?: number | null; ugc?: number | null }): number | null {
  const required = product === 'filme' ? [notas.coerencia, notas.pixel] : product === 'ugc' ? [notas.pixel, notas.ugc] : [notas.pixel]
  return required.every(isScore) ? Math.min(...required as number[]) : null
}

export type LinhaPlacar = { n: number; media: number | null; pct95: number | null }
/** Placar de uma lista de notas: n, média e % ≥ 95 (null quando vazia — nunca 0% sem denominador). */
export function placar(notas: Array<number | null | undefined>): LinhaPlacar {
  const xs = notas.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  if (xs.length === 0) return { n: 0, media: null, pct95: null }
  return { n: xs.length, media: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length), pct95: Math.round((100 * xs.filter((x) => x >= META_95).length) / xs.length) }
}
