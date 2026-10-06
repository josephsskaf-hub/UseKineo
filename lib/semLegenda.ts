// KINEO-SEM-LEGENDA-2026-10-06 — FILME SÓ COM A VOZ: a versão B do teste A/B de retenção.
//
// Fundador, 06/10: "vai sem legenda, pode montar o teste". Instagram e TikTok, EUA e Brasil:
//   A = o filme como sai hoje (legenda karaokê embaixo e, nas contas da casa, o título-gancho no topo);
//   B = o MESMO filme só com a voz — nenhum texto por cima; narração, música, cortes, logo e marca d'água iguais.
//
// ONDE O TEXTO MORA NO RENDERSCRIPT (lib/compose, trava 8.2 — este módulo não a muda):
//   · legenda: `type:'text'` nas trilhas 5 (a palavra falada / karaokê) e 7 (o destaque antigo, hoje vazia) — os mesmos
//     elementos que o "sem legenda" do Studio Ads tira desde 26/09 (lib/ads/adStyle isCaptionElement);
//   · título-gancho do 1º quadro: `type:'text'` na trilha 11 (lib/hookFirstFrame GANCHO_1Q_TRACK, só contas internas);
//   · marca d'água: `type:'text'` na trilha 9 — FICA (é obrigatória da conta); logo da marca: imagem na trilha 10 — FICA.
//
// QUEM PODE: só conta interna (lib/internalAccounts isInternalEmail, calculado na rota). Cliente que mandar
// `captions:false` é ignorado — o filme sai como sai hoje, com legenda — e o servidor grava EVENTO_IGNORADO.
// A exceção que já existia continua igual: o Studio Ads (modo serviço + narration_source 'tts') tira a legenda quando a
// pessoa desligou a legenda na tela dele (KINEO-ADS-SEM-LEGENDA-2026-09-26).
//
// VERSÃO B DE UM FILME JÁ PRONTO: a montagem antiga NÃO guardava nada com que remontar — nem o RenderScript, nem a URL do
// mp3 da narração (vai para o bucket `voiceovers` com o nome vo-<uid>-<hora>.mp3, sem vínculo com o render), nem as
// palavras do Whisper que decidem os cortes do clássico (só no cache por hash do texto), nem a trilha escolhida (a Lyria
// gerada não é persistida), nem a lista de clipes do Kineo 1 (só o navegador tinha). Por isso, a partir deste deploy,
// todo filme de conta interna grava o RenderScript JÁ SEM legenda e sem gancho (EVENTO_FONTE_B, ligado pelo render_id);
// a rota /api/admin/recompose-sem-legenda reenvia ESSE RenderScript ao Creatomate: mesmos clipes, mesma narração,
// mesmos cortes, zero crédito — o custo é só a montagem.
//
// Módulo puro, sem import: o guardião scripts/test-sem-legenda-2026-10-06.mjs o executa isolado (transpile).

export const SEM_LEGENDA_MARCA = 'KINEO-SEM-LEGENDA-2026-10-06'
/** Trilhas da legenda (espelho de lib/ads/adStyle isCaptionElement e do filtro do Studio Ads em /api/compose). */
export const LEGENDA_TRILHAS: readonly number[] = [5, 7]
/** Trilha do título-gancho (espelho de lib/hookFirstFrame GANCHO_1Q_TRACK). */
export const GANCHO_TRILHA = 11
/** Trilha da marca d'água — texto que FICA na versão B. */
export const MARCA_DAGUA_TRILHA = 9

/** Cliente pediu captions:false e foi ignorado (o filme sai com legenda, como hoje). */
export const EVENTO_IGNORADO = 'compose_captions_off_ignored'
/** RenderScript da versão B (sem legenda e sem gancho) de um filme de conta interna, ligado pelo render_id. */
export const EVENTO_FONTE_B = 'film_source_b_saved'
/** Uma versão do teste gerada: { variant 'A'|'B', video_id, original, render_id }. */
export const EVENTO_VERSAO = 'film_variant'
/** Pedido de versão B de um filme pronto (linha-trava com id determinístico: um B por filme). */
export const EVENTO_PEDIDO_B = 'film_variant_b_request'
export const TITULO_B_PREFIXO = '[B sem legenda] '
/** Teto do RenderScript guardado (caracteres de JSON). Sem legenda ele tem ~10-40 mil; acima disto não grava. */
export const FONTE_B_MAX_CHARS = 400_000

/** O que a montagem antiga não guardou — a resposta da rota para um filme montado antes deste deploy. */
export const FALTA_FILME_ANTIGO: readonly string[] = [
  'o RenderScript da montagem (nunca foi gravado antes de 06/10/2026)',
  'a URL do mp3 da narração (bucket voiceovers, nome vo-<uid>-<hora>.mp3, sem vínculo com o render)',
  'as palavras do Whisper que decidem os cortes do clássico (só no cache por hash do texto)',
  'a URL da trilha escolhida (a trilha gerada pela Lyria não é guardada)',
  'a lista de clipes do Kineo 1 (só o navegador tinha)',
]

export type MotivoLegenda = 'nao_pedido' | 'interna' | 'studio_ads' | 'ignorado_cliente'

export interface DecisaoLegenda {
  /** Tirar a legenda (trilhas 5/7). */
  tirarLegenda: boolean
  /** Tirar também o título-gancho (trilha 11) — só a versão B da casa. */
  tirarGancho: boolean
  motivo: MotivoLegenda
  /** Só conta interna tem versão no teste: 'B' = só voz, 'A' = como hoje; null = cliente (nada é gravado). */
  versao: 'A' | 'B' | null
}

/**
 * O que fazer com `captions` do pedido. `captions` vem cru do corpo: só o booleano `false` pede "sem legenda" — string
 * "false", 0, null e ausente são o filme de sempre.
 */
export function decidirLegenda(input: { captions: unknown; interna: boolean; studioAds: boolean }): DecisaoLegenda {
  const pediu = input?.captions === false
  const casa = input?.interna === true
  if (pediu && casa) return { tirarLegenda: true, tirarGancho: true, motivo: 'interna', versao: 'B' }
  if (pediu && input?.studioAds === true) return { tirarLegenda: true, tirarGancho: false, motivo: 'studio_ads', versao: null }
  if (pediu) return { tirarLegenda: false, tirarGancho: false, motivo: 'ignorado_cliente', versao: null }
  return { tirarLegenda: false, tirarGancho: false, motivo: 'nao_pedido', versao: casa ? 'A' : null }
}

type El = Record<string, unknown>

/** Texto de legenda (trilha 5 ou 7). */
export function ehLegenda(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const x = e as { type?: unknown; track?: unknown }
  return x.type === 'text' && LEGENDA_TRILHAS.includes(Number(x.track))
}

/** Texto do título-gancho do 1º quadro (trilha 11). */
export function ehGancho(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const x = e as { type?: unknown; track?: unknown }
  return x.type === 'text' && Number(x.track) === GANCHO_TRILHA
}

export interface Retirada {
  source: Record<string, unknown>
  legendas: number
  gancho: number
}

/**
 * Um source SEM legenda e/ou sem gancho. Não muda o objeto recebido (cópia rasa com outra lista de elementos). Áudio,
 * vídeo, imagem, formas, marca d'água (texto da 9) e logo (imagem da 10) passam intactos — mesma ordem, mesmo objeto.
 */
export function tirarLegendaEGancho(
  source: Record<string, unknown>,
  o: { legenda?: boolean; gancho?: boolean } = {},
): Retirada {
  const els = source && typeof source === 'object' ? (source as { elements?: unknown }).elements : undefined
  if (!Array.isArray(els)) return { source, legendas: 0, gancho: 0 }
  const tirarLeg = o.legenda !== false
  const tirarGan = o.gancho !== false
  let legendas = 0
  let gancho = 0
  const kept = els.filter((e) => {
    if (tirarLeg && ehLegenda(e)) { legendas += 1; return false }
    if (tirarGan && ehGancho(e)) { gancho += 1; return false }
    return true
  })
  return { source: { ...source, elements: kept }, legendas, gancho }
}

export interface FonteB {
  /** RenderScript da versão B pronto para reenviar; null quando não dá para guardar. */
  fonte: Record<string, unknown> | null
  legendas: number
  gancho: number
  elementos: number
  chars: number
  motivo: 'ok' | 'sem_elementos' | 'grande_demais'
}

/**
 * O RenderScript da versão B a guardar: o source enviado, sem legenda e sem gancho, sem `snapshot_time` (o envio ao
 * Creatomate pede a capa de novo). Nada além disso muda: os mesmos clipes, a mesma narração, os mesmos cortes.
 */
export function fonteVersaoB(source: Record<string, unknown>): FonteB {
  const r = tirarLegendaEGancho(source)
  const els = (r.source as { elements?: unknown }).elements
  if (!Array.isArray(els) || els.length === 0) return { fonte: null, legendas: r.legendas, gancho: r.gancho, elementos: 0, chars: 0, motivo: 'sem_elementos' }
  const fonte: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(r.source)) if (k !== 'snapshot_time') fonte[k] = v
  const chars = JSON.stringify(fonte).length
  if (chars > FONTE_B_MAX_CHARS) return { fonte: null, legendas: r.legendas, gancho: r.gancho, elementos: els.length, chars, motivo: 'grande_demais' }
  return { fonte, legendas: r.legendas, gancho: r.gancho, elementos: els.length, chars, motivo: 'ok' }
}

/** As URLs de mídia (vídeo, áudio, imagem) do source, sem repetição — o que a rota confere antes de remontar. */
export function urlsDaFonte(source: unknown): string[] {
  const els = source && typeof source === 'object' ? (source as { elements?: unknown }).elements : undefined
  if (!Array.isArray(els)) return []
  const out: string[] = []
  for (const e of els) {
    if (!e || typeof e !== 'object') continue
    const x = e as { type?: unknown; source?: unknown }
    if ((x.type === 'video' || x.type === 'audio' || x.type === 'image') && typeof x.source === 'string' && !out.includes(x.source)) out.push(x.source)
  }
  return out
}

export type FonteValida = { ok: true; fonte: Record<string, unknown>; urls: string[] } | { ok: false; falta: string[] }

/** O RenderScript guardado serve para remontar? Ausente = filme montado antes deste deploy (FALTA_FILME_ANTIGO). */
export function validarFonteB(x: unknown): FonteValida {
  if (x === undefined || x === null) return { ok: false, falta: [...FALTA_FILME_ANTIGO] }
  if (typeof x !== 'object' || Array.isArray(x)) return { ok: false, falta: ['o RenderScript gravado não é um objeto'] }
  const f = x as El
  const falta: string[] = []
  const els = Array.isArray(f.elements) ? (f.elements as unknown[]) : null
  if (!els || els.length === 0) falta.push('elements (a lista de elementos do RenderScript)')
  const dur = Number(f.duration)
  if (!(Number.isFinite(dur) && dur > 0 && dur <= 600)) falta.push('duration')
  if (!(Number(f.width) > 0) || !(Number(f.height) > 0)) falta.push('width/height')
  const visuais = (els ?? []).filter((e) => !!e && typeof e === 'object' && ((e as El).type === 'video' || (e as El).type === 'image'))
  if (visuais.length === 0) falta.push('os clipes (elementos video/image)')
  const urls = urlsDaFonte(f)
  if (urls.some((u) => !/^https:\/\//i.test(u))) falta.push('URL de mídia que não é https')
  if (falta.length > 0) return { ok: false, falta }
  // Cinto e suspensório: o que foi guardado já veio sem legenda/gancho; tirar de novo não custa nada.
  return { ok: true, fonte: tirarLegendaEGancho(f).source, urls }
}

export interface VideoParaB {
  id?: unknown
  user_id?: unknown
  status?: unknown
  render_id?: unknown
  title?: unknown
}

export type AvaliacaoB =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 404 | 409; motivo: string; falta?: string[] }

/**
 * A rota de versão B pode remontar ESTE filme para ESTA conta? Ordem: login → conta interna → o vídeo existe → é da
 * própria conta → está pronto → tem render → não é ele mesmo um B → há RenderScript guardado e válido.
 */
export function avaliarPedidoB(p: { userId: string | null | undefined; interna: boolean; video: VideoParaB | null | undefined; fonte?: unknown }): AvaliacaoB {
  if (!p || typeof p.userId !== 'string' || !p.userId) return { ok: false, status: 401, motivo: 'sem_login' }
  if (p.interna !== true) return { ok: false, status: 403, motivo: 'so_conta_interna' }
  const v = p.video
  if (!v || typeof v !== 'object' || typeof v.id !== 'string' || !v.id) return { ok: false, status: 404, motivo: 'video_nao_encontrado' }
  if (String(v.user_id ?? '') !== p.userId) return { ok: false, status: 403, motivo: 'video_de_outra_conta' }
  if (v.status !== 'completed') return { ok: false, status: 409, motivo: 'video_nao_concluido' }
  if (typeof v.render_id !== 'string' || !v.render_id.trim()) return { ok: false, status: 409, motivo: 'video_sem_render' }
  if (String(v.title ?? '').startsWith(TITULO_B_PREFIXO)) return { ok: false, status: 409, motivo: 'ja_e_versao_b' }
  const f = validarFonteB(p.fonte)
  if (!f.ok) return { ok: false, status: 409, motivo: 'sem_fonte', falta: f.falta }
  return { ok: true }
}

/** "[B sem legenda] <título do original>" — nunca dobra o prefixo; teto de 140 caracteres. */
export function tituloVersaoB(original: unknown): string {
  const t = String(original ?? '').trim()
  const base = t.startsWith(TITULO_B_PREFIXO) ? t.slice(TITULO_B_PREFIXO.length).trim() : t
  return (TITULO_B_PREFIXO + (base || 'Untitled Short')).slice(0, 140)
}

/** Metadados do EVENTO_VERSAO. `video_id` é null no compose (a linha de `videos` nasce no status: junte por render_id). */
export function metadadosVersao(a: {
  variant: 'A' | 'B'
  videoId: string | null
  original: string | null
  renderId: string | null
  generationId: string | null
  via: 'compose' | 'recompose'
  quality?: string | null
}): Record<string, unknown> {
  return {
    marca: SEM_LEGENDA_MARCA,
    variant: a.variant,
    video_id: a.videoId,
    original: a.original,
    render_id: a.renderId,
    generation_id: a.generationId,
    via: a.via,
    quality: a.quality ?? null,
  }
}

/** Metadados do EVENTO_FONTE_B (o RenderScript vai em `source_b`). */
export function metadadosFonteB(a: { renderId: string; generationId: string | null; quality: string | null; decisao: DecisaoLegenda; fonteB: FonteB }): Record<string, unknown> {
  return {
    marca: SEM_LEGENDA_MARCA,
    render_id: a.renderId,
    generation_id: a.generationId,
    quality: a.quality,
    variant: a.decisao.versao,
    captions_removed: a.fonteB.legendas,
    hook_removed: a.fonteB.gancho,
    elements: a.fonteB.elementos,
    chars: a.fonteB.chars,
    source_b: a.fonteB.fonte,
  }
}
