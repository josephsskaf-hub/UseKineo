// ═══ KINEO-RECREATE-MOVIMENTO-1411 [dono 14/11 05:35: "O motion de colocar a pessoa no lugar daquele vídeo que viralizou. Isso que é o que chama
// cliente. […] Deixar perfeito, igual do Higgsfield"; depois do teste: "Vamos já inserir já na homepage para as pessoas poderem usar."
// CEO 14/11 07:00: OK para a etapa 2 do desenho docs/DESENHO-RECREATE-MOVIMENTO-2026-11-14.md, com 6 ajustes] ═══
// O molde de MOVIMENTO: a cena e a pessoa saem de uma IMAGEM NOSSA (passo 1) e do vídeo-guia NOSSO sai só o movimento (passo 2).
//   passo 1 — fal-ai/nano-banana-pro/edit: a foto do cliente + o cenário do molde (meio corpo ou joelhos para cima, rosto visível) + a descrição
//             do cabelo, da barba e dos óculos lida da foto (lib/recreate/descricaoDaPessoa.ts). US$ 0,15.
//   juiz    — "é a pessoa da foto?" na IMAGEM, antes de pagar o vídeo (lib/recreate/movimentoJuiz.ts). Outra pessoa = estorno, o vídeo nunca sai.
//   passo 2 — fal-ai/kling-video/v2.6/standard/motion-control: image_url = a imagem do passo 1 (no NOSSO bucket), video_url = o guia do molde (no
//             NOSSO bucket), character_orientation 'video', keep_original_sound false, prompt = ação + câmera + cenário. US$ 0,07/s, sai sem som.
// A ordem dos dois passos mora no settleClip (lib/clips/clipFlow.ts), a MESMA máquina do "Put your face in it" (KINEO-ROSTO-QUADRO-CHAVE-2810):
// a etapa vive na coluna `model` da linha; o passo 2 é reservado por UPDATE condicional (um ator só), com a marca de envio em failure_reason.
// Este módulo é PURO (sem rede, sem env): textos, entradas, a etapa da linha e as frases da tela.
import { NANO_BANANA_EDIT_SLUG } from '@/lib/imageReference'
import { ownedClipImageUrl, type ClipEngineKey, type ClipRequestInput } from '@/lib/clips/clipCatalog'
import { recreateCreditCost } from '@/lib/checkoutPricing'
import { RECREATE_ASSETS, RECREATE_FORMATS, type RecreateFormat } from './formats'

export const MOVIMENTO_MARK = 'KINEO-RECREATE-MOVIMENTO-1411'
export const MOVIMENTO_CENA_MODEL = NANO_BANANA_EDIT_SLUG
export const MOVIMENTO_VIDEO_MODEL = 'fal-ai/kling-video/v2.6/standard/motion-control'
/** A linha guarda um motor do catálogo de clipes; o selo honesto da Library vem de MOVIMENTO_SELO (o motor real), nunca do rótulo deste. */
export const MOVIMENTO_ENGINE: ClipEngineKey = 'kling'
export const MOVIMENTO_SELO = 'Kling 2.6 Motion'
export const MOVIMENTO_CENA_USD = 0.15
export const MOVIMENTO_VIDEO_USD_POR_S = 0.07
/** Leitor da pessoa + juiz da imagem (gpt-4o da casa), arredondado para cima. */
export const MOVIMENTO_VISAO_USD = 0.01
export const movimentoFalUsd = (seconds: number) => Math.round((MOVIMENTO_CENA_USD + MOVIMENTO_VIDEO_USD_POR_S * seconds) * 100) / 100

/** Motivos de falha que a tela traduz (failure_reason tem 60 caracteres). */
export const MOVIMENTO_FALHA = { cena: 'motion_scene_failed', naoEVoce: 'motion_not_you', bloqueada: 'motion_scene_blocked' } as const // KINEO-RECREATE-MOVIMENTO-1411 — + bloqueada (o nosso moderador recusou a imagem do passo 1)
// KINEO-MOVIMENTO-ANTES-DO-CLIENTE-1411 [CEO 14/11 10:55, item 2] — + moderadorFora: o nosso moderador não respondeu sobre a imagem do passo 1 e o pedido seguiu para o juiz (contável).
export const MOVIMENTO_EVENTOS = { cena: 'recreate_movimento_cena', descricao: 'recreate_pessoa_descricao', moderadorFora: 'recreate_movimento_moderador_fora' } as const

/** O texto da LINHA (row.prompt): fixo por molde, escrito só pelo servidor. É por ele que a linha é reconhecida como movimento. */
export const movimentoRowPrompt = (f: Pick<RecreateFormat, 'id' | 'title'>) => `Recreate motion: ${f.title} [${f.id}]`

// KINEO-MOVIMENTO-ANTES-DO-CLIENTE-1411 [CEO 14/11 10:55, item 1] — a linha de movimento pelo que ELA diz (texto fixo do servidor + motor + modo), sem depender do molde seguir no
// catálogo: é por aqui que a varredura horária acha o movimento que falhou com o estorno por fazer.
export const MOVIMENTO_PROMPT_PREFIXO = 'Recreate motion: '
// KINEO-MOVIMENTO-VARREDURA-1411 [CEO 14/11 11:50, item 2: "reconhecer só o que o servidor gravou"] — antes bastava o texto ter a forma "Recreate motion: x [y]" (um clipe de
// cliente com esse texto casava). Agora só o que o servidor grava: o texto EXATO de um molde de movimento da lista (movimentoForRow: id, título, duração,
// kling, image) E o modelo de um dos dois passos. Molde que sai da vitrine fica na lista com movimentoAprovado false, nunca apagado, para o estorno achar.
export const ehLinhaDeMovimento = (row: { prompt: string; engine: string; seconds: number; mode: string; model: string }, catalogo: readonly RecreateFormat[] = RECREATE_FORMATS) => (row.model === MOVIMENTO_CENA_MODEL || row.model === MOVIMENTO_VIDEO_MODEL) && movimentoForRow(row, catalogo) !== null

export function movimentoForRow(row: { prompt: string; engine: string; seconds: number; mode: string }, catalogo: readonly RecreateFormat[] = RECREATE_FORMATS): RecreateFormat | null {
  if (row.mode !== 'image' || row.engine !== MOVIMENTO_ENGINE) return null
  return catalogo.find(f => f.type === 'motion' && movimentoRowPrompt(f) === row.prompt && f.seconds === row.seconds) ?? null
}
/** 'scene' = o passo 1 (a imagem); 'motion' = o passo 2 (animando); null = não é movimento (ou modelo estranho: nunca adivinha). */
export function movimentoStageForRow(row: { prompt: string; engine: string; seconds: number; mode: string; model: string }, catalogo: readonly RecreateFormat[] = RECREATE_FORMATS): 'scene' | 'motion' | null {
  if (!movimentoForRow(row, catalogo)) return null
  return row.model === MOVIMENTO_CENA_MODEL ? 'scene' : row.model === MOVIMENTO_VIDEO_MODEL ? 'motion' : null
}

/** A imagem do passo 1 no NOSSO bucket (caminho fixo: dois atores escrevem o MESMO arquivo). */
export const movimentoCenaPath = (userId: string, clipId: string) => `clips/${userId}/${clipId}-motion-scene.png`
/** O guia no bucket: o POST sobe o arquivo do repositório aqui (o mesmo caminho das fontes da troca); o passo 2 só calcula a URL. */
export const movimentoGuiaPath = (f: RecreateFormat) => (f.guia && RECREATE_ASSETS[f.guia] ? `recreate-sources/v1/${RECREATE_ASSETS[f.guia].file}` : null)
export function movimentoGuiaUrl(f: RecreateFormat, supabaseUrl: string): string | null {
  const path = movimentoGuiaPath(f)
  const base = supabaseUrl.replace(/\/+$/, '')
  return path && /^https:\/\//.test(base) ? `${base}/storage/v1/object/public/renders/${path}` : null
}

/** A marca do envio do passo 2 (failure_reason enquanto o request_id não está gravado): a rede de 10 min conta dela, não da criação da linha. */
export const MOVIMENTO_ENVIO_PREFIX = 'movenvio_'
export const movimentoEnvio = (now: number) => `${MOVIMENTO_ENVIO_PREFIX}${String(Math.max(0, Math.floor(now))).padStart(13, '0')}`
export function movimentoEnvioEm(failureReason: unknown): number | null {
  const m = typeof failureReason === 'string' ? /^movenvio_(\d{13})$/.exec(failureReason) : null
  return m ? Number(m[1]) : null
}

// ─── Frases (CEO 14/11, ajuste 6: nada de frase negativa; "plain unmarked boards", "plain solid-colour kits") ───
/** Palavras que o texto enviado ao motor nunca leva. A única exceção é "no glasses" nas formas da receita aprovada: "wearing no glasses",
 *  "he wears no glasses", "she wears no glasses", "they wear no glasses" (CEO 14/11 08:45). */
export const FRASE_NEGATIVA = /\b(no|not|never|without|avoid|cannot|don'?t|doesn'?t|isn'?t|aren'?t|nothing|none|neither|nor)\b|n't\b/i // KINEO-RECREATE-MOVIMENTO-1411 — + cannot (revisor 14/11)
export function temFraseNegativa(texto: string): boolean {
  return FRASE_NEGATIVA.test(texto.replace(/\b(wearing|(?:he|she) wears|they wear) no glasses\b/gi, '$1 bare-faced'))
}

const IDENTIDADE = 'Keep their real face exactly: same face shape, eyes, eyebrows, nose, lips, hairline, beard and skin texture, same age.'
/** O texto do passo 1. `descricao` = o que o leitor viu na foto (cabelo, barba, óculos), ou null quando a leitura falhou. */
export function movimentoTextoDaCena(f: RecreateFormat, descricao: string | null): string {
  const pessoa = descricao ? `The person from the reference photo, ${descricao},` : 'The person from the reference photo'
  return `Photorealistic vertical photo. ${pessoa} ${f.cena ?? ''}. ${IDENTIDADE} This one person is the only person in the frame. Plain unmarked surfaces and clean natural light.`.replace(/\s+/g, ' ').trim()
}
export function movimentoEntradaDaCena(f: RecreateFormat, foto: string, descricao: string | null): Record<string, unknown> {
  return { prompt: movimentoTextoDaCena(f, descricao), image_urls: [foto], aspect_ratio: '9:16', num_images: 1, resolution: '1K', output_format: 'png' }
}
/** O texto do passo 2: a ação + a câmera + o cenário do molde (o objeto citado aqui aparece: a bola veio do texto no teste da CEO). */
export const movimentoTextoDoVideo = (f: RecreateFormat) => (f.acao ?? '').replace(/\s+/g, ' ').trim()
export function movimentoEntradaDoVideo(f: RecreateFormat, cenaUrl: string, guiaUrl: string): Record<string, unknown> {
  return { image_url: cenaUrl, video_url: guiaUrl, character_orientation: 'video', keep_original_sound: false, prompt: movimentoTextoDoVideo(f), enable_safety_checker: true }
}

/** O que um molde de movimento precisa para existir (o guardião roda isto em todo molde do catálogo). Vazio = válido. */
export function movimentoProblemasDoMolde(f: RecreateFormat): string[] {
  const p: string[] = []
  if (f.type !== 'motion') return ['não é motion']
  if (recreateCreditCost(f.seconds) === null) p.push(`${f.seconds} s sem tarifa na tabela do Recreate`)
  if (f.photoSlots !== 1) p.push('uma foto só')
  if (f.pessoasNoGuia !== 1) p.push('o guia precisa ter UMA pessoa (pessoasNoGuia: 1)')
  const asset = f.guia ? RECREATE_ASSETS[f.guia] : undefined
  if (!asset || asset.contentType !== 'video/mp4') p.push('o guia precisa ser um MP4 nosso em RECREATE_ASSETS')
  if (!f.cena || !/\b(knees up|waist up)\b/i.test(f.cena) || !/face clearly visible/i.test(f.cena)) p.push('a cena enquadra joelhos ou cintura para cima, com "face clearly visible"')
  if (!f.acao) p.push('o molde precisa da ação do passo 2')
  for (const [nome, texto] of [['cena', f.cena ?? ''], ['acao', f.acao ?? '']] as const) if (temFraseNegativa(texto)) p.push(`${nome} com frase negativa`)
  return p
}

// ─── O plano (o POST) ───
export type MovimentoPlanResult =
  | { ok: true; plan: { body: ClipRequestInput; model: string; credits: number; falUsd: number; photos: string[]; input: Record<string, unknown>; fingerprintInput: Record<string, unknown> } }
  | { ok: false; status: number; error: string }

/** O pedido do cliente vira o plano do passo 1. Só o servidor escreve o texto; o do navegador é ignorado (o molde é um preset). */
export function planMovimento(raw: Record<string, unknown>, ctx: { userId: string; supabaseUrl: string; paying: boolean }, descricao: string | null, catalogo: readonly RecreateFormat[] = RECREATE_FORMATS): MovimentoPlanResult {
  const bad = (error: string, status = 400): MovimentoPlanResult => ({ ok: false, status, error })
  const f = catalogo.find(x => x.id === raw.format) ?? null
  if (!f || f.type !== 'motion') return bad('Choose a video from the Kineo catalog.')
  if (movimentoProblemasDoMolde(f).length) return bad('This video is not available yet. Nothing was charged.', 409)
  if (raw.consent !== true) return bad('Confirm you have permission to use these photos.')
  const seconds = Number(raw.seconds)
  const credits = recreateCreditCost(seconds)
  if (credits === null) return bad('Choose an available duration.')
  if (seconds !== f.seconds) return bad('This duration needs an approved source video of the same length.', 409)
  if (seconds === 15 && !ctx.paying) return bad('Upgrade your plan to use this duration.', 402)
  if (!Array.isArray(raw.photos) || raw.photos.length !== 1) return bad('Add one photo of the person.')
  const foto = typeof raw.photos[0] === 'string' ? ownedClipImageUrl(raw.photos[0], ctx.userId, ctx.supabaseUrl) : null
  if (!foto) return bad('Upload photos to your own account before continuing.', 403)
  const input = movimentoEntradaDaCena(f, foto, descricao)
  return { ok: true, plan: {
    body: { engine: MOVIMENTO_ENGINE, seconds, aspect: null, prompt: movimentoRowPrompt(f), imageUrl: foto },
    model: MOVIMENTO_CENA_MODEL, credits, falUsd: movimentoFalUsd(seconds), photos: [foto], input,
    // A descrição lida da foto pode variar entre duas leituras: a repetição do MESMO pedido (mesma chave) não pode virar conflito por isso.
    fingerprintInput: movimentoEntradaDaCena(f, foto, null),
  } }
}

// ─── A tela (lib do status) ───
export const MOVIMENTO_FRASES = {
  naoEVoce: 'The scene did not look like you, so we stopped before animating it.',
  motorRecusou: 'The engine declined this photo. Try a clear, front-facing photo of one person.',
  cenaFalhou: 'We could not prepare your scene.',
  cenaBloqueada: 'This scene could not be used. Try another photo.',
  devolvido: 'We returned your credits.',
  devolveDepois: 'Your credits will be returned within the hour.',
} as const
/** A razão e a frase da falha para a tela; "returned" só com o estorno gravado na linha. */
export function movimentoFalhaParaTela(failureReason: string | null, creditsRefunded: number): { reason: 'not_you' | 'engine_refused' | 'scene_failed' | 'scene_blocked'; message: string } | null {
  const fim = creditsRefunded > 0 ? MOVIMENTO_FRASES.devolvido : MOVIMENTO_FRASES.devolveDepois
  if (failureReason === MOVIMENTO_FALHA.naoEVoce) return { reason: 'not_you', message: `${MOVIMENTO_FRASES.naoEVoce} ${fim}` }
  if (failureReason === 'provider_failed' || failureReason === 'provider_rejected') return { reason: 'engine_refused', message: `${MOVIMENTO_FRASES.motorRecusou} ${fim}` }
  if (failureReason === MOVIMENTO_FALHA.cena) return { reason: 'scene_failed', message: `${MOVIMENTO_FRASES.cenaFalhou} ${fim}` }
  if (failureReason === MOVIMENTO_FALHA.bloqueada) return { reason: 'scene_blocked', message: `${MOVIMENTO_FRASES.cenaBloqueada} ${fim}` }
  return null
}
