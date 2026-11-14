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
import { recreateMovimentoCredits } from './formats' // KINEO-MOVIMENTO-ANTES-DE-ABRIR-1411
import { guiaDoManifesto } from './guiasManifesto' // KINEO-GUIA-PRIVADO-1411
import { type RecreateFormat } from './formats'
import { RECREATE_ASSETS_SERVIDOR as RECREATE_ASSETS, RECREATE_FORMATS_SERVIDOR as RECREATE_FORMATS } from './catalogoServidor' // KINEO-RECEITA-FORA-DO-JS-1411 — o catálogo e os assets do SERVIDOR (com os moldes de movimento)

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
// KINEO-MOVIMENTO-ANTES-DE-ABRIR-1411 [revisor da CEO 14/11 12:30, item c: "guardar o id do molde à parte na linha e não depender do texto gravado"] — antes a linha era reconhecida
// pelo texto EXATO do molde no catálogo (título + id + duração): molde renomeado, com duração trocada ou tirado da lista deixava as linhas antigas sem
// dono (o estorno se perdia; pior, a linha do passo 1 caía no caminho do clipe comum). Agora o id do molde vai na IMPRESSÃO DIGITAL da linha (coluna
// fingerprint, que só o servidor escreve, em clipFlow.submitClip: [pedido, modelo do passo 1, {…entrada do passo 1, molde: <id>}]). A linha é de movimento
// pelo que ELA guarda: o id do molde na impressão digital + o modelo de um dos dois passos + kling + image. Não depende do catálogo nem do texto.
// O catálogo só é lido para RODAR o passo 2 (o guia e a ação): molde que saiu da lista = o envio do passo 2 falha e a linha é estornada (nunca entrega a imagem).
export const MOVIMENTO_MOLDE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/
/** O id do molde guardado pelo servidor na impressão digital da linha; null em qualquer outra linha. */
export function movimentoIdDaLinha(row: { fingerprint?: string | null }): string | null {
  if (typeof row.fingerprint !== 'string' || !row.fingerprint.startsWith('[')) return null
  try {
    const fp = JSON.parse(row.fingerprint) as unknown
    if (!Array.isArray(fp) || fp.length !== 3 || fp[1] !== MOVIMENTO_CENA_MODEL || !fp[2] || typeof fp[2] !== 'object') return null
    const id = (fp[2] as Record<string, unknown>).molde
    return typeof id === 'string' && id.length <= 60 && MOVIMENTO_MOLDE_ID.test(id) ? id : null
  } catch { return null }
}
type LinhaDoMovimento = { engine: string; mode: string; model: string; fingerprint?: string | null }
export const ehLinhaDeMovimento = (row: LinhaDoMovimento) => (row.model === MOVIMENTO_CENA_MODEL || row.model === MOVIMENTO_VIDEO_MODEL) && row.mode === 'image' && row.engine === MOVIMENTO_ENGINE && movimentoIdDaLinha(row) !== null

/** O molde da linha (pelo id guardado), para RODAR o passo 2; null se a linha não é movimento ou o molde saiu do catálogo. */
export function movimentoForRow(row: LinhaDoMovimento, catalogo: readonly RecreateFormat[] = RECREATE_FORMATS): RecreateFormat | null {
  if (!ehLinhaDeMovimento(row)) return null
  const id = movimentoIdDaLinha(row)
  return catalogo.find(f => f.type === 'motion' && f.id === id) ?? null
}
/** 'scene' = o passo 1 (a imagem); 'motion' = o passo 2 (animando); null = não é movimento. Pela LINHA, sem o catálogo. */
export function movimentoStageForRow(row: LinhaDoMovimento): 'scene' | 'motion' | null {
  if (!ehLinhaDeMovimento(row)) return null
  return row.model === MOVIMENTO_CENA_MODEL ? 'scene' : 'motion'
}

/** A imagem do passo 1 no NOSSO bucket (caminho fixo: dois atores escrevem o MESMO arquivo). */
export const movimentoCenaPath = (userId: string, clipId: string) => `clips/${userId}/${clipId}-motion-scene.png`
// KINEO-GUIA-PRIVADO-1411 — o guia não é mais publicado nem calculado aqui: mora no bucket PRIVADO (lib/recreate/guiasManifesto.ts) e o passo 2 recebe uma URL assinada de 1 h
// (lib/recreate/guias.ts assinarGuia). Era: movimentoGuiaPath/movimentoGuiaUrl (público em renders/recreate-sources/v1).

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

// KINEO-MOVIMENTO-CORPO-INTEIRO-1411 [CEO 14/11, teste pago no painel: corpo inteiro + cabelo e barba descritos = o rosto se mantém] — a descrição lida da foto entra DENTRO da frase de
// identidade ("… same age, with <cabelo, barba, óculos>."), como no teste; antes ela ia logo depois de "The person from the reference photo".
// KINEO-MOVIMENTO-REVISOR-2-1411 [2º revisor, item 5] — quando o leitor diz careca ("shaved") ou sem barba ("clean-shaven"), a frase fixa não fala de linha do cabelo nem de barba.
function identidade(descricao: string | null): string {
  const tracos = ['face shape', 'eyes', 'eyebrows', 'nose', 'lips', ...(descricao && /\bshaved\b/.test(descricao) ? [] : ['hairline']), ...(descricao && /\bclean-shaven\b/.test(descricao) ? [] : ['beard']), 'skin texture']
  return `Keep their real face exactly: same ${tracos.slice(0, -1).join(', ')} and ${tracos[tracos.length - 1]}, same age`
}
/** O texto do passo 1. `descricao` = o que o leitor viu na foto (cabelo, barba, óculos), ou null quando a leitura falhou. */
export function movimentoTextoDaCena(f: RecreateFormat, descricao: string | null): string {
  const ident = descricao ? `${identidade(descricao)}, ${descricao}.` : `${identidade(null)}.` // KINEO-MOVIMENTO-CORPO-INTEIRO-1411 — era: "The person from the reference photo, <descrição>,"
  return `Photorealistic vertical photo. The person from the reference photo ${f.cena ?? ''}. ${ident} This one person is the only person in the frame. Plain unmarked surfaces and clean natural light.`.replace(/\s+/g, ' ').trim()
}
export function movimentoEntradaDaCena(f: RecreateFormat, foto: string, descricao: string | null): Record<string, unknown> {
  return { prompt: movimentoTextoDaCena(f, descricao), image_urls: [foto], aspect_ratio: '9:16', num_images: 1, resolution: '1K', output_format: 'png' }
}
/** O texto do passo 2: a ação + a câmera + o cenário do molde (o objeto citado aqui aparece: a bola veio do texto no teste da CEO). */
export const movimentoTextoDoVideo = (f: RecreateFormat) => (f.acao ?? '').replace(/\s+/g, ' ').trim()
export function movimentoEntradaDoVideo(f: RecreateFormat, cenaUrl: string, guiaUrl: string): Record<string, unknown> {
  return { image_url: cenaUrl, video_url: guiaUrl, character_orientation: 'video', keep_original_sound: false, prompt: movimentoTextoDoVideo(f), enable_safety_checker: true }
}

// KINEO-MOVIMENTO-CORPO-INTEIRO-1411 [CEO 14/11: "o demo do cartão separado do guia"] — o cartão mostra `preview`; o motor anima pelo `guia`. O demo pode ser um asset nosso
// (/api/recreate/assets/<chave em RECREATE_ASSETS>) ou um MP4 do NOSSO bucket público renders (o resultado do próprio produto, gerado pela conta da casa:
// o cartão passa a mostrar exatamente o que o cliente recebe). Nada de URL de terceiros.
// KINEO-MOVIMENTO-REVISOR-2-1411 [2º revisor, itens 1, 2 e 3] — o `preview` do CATÁLOGO (que vai no JavaScript público) é SÓ o asset nosso atrás do login. O demo que é resultado do
// produto mora em lib/recreate/movimentoDemos.ts (só do servidor) e a rota de assets redireciona para ele; aqui, a régua dessa URL: o bucket renders
// DESTE ambiente, em clips/<dono>/<clipe>.mp4, e o dono numa lista dada (a conta da casa).
export function movimentoDemoValido(preview: string): boolean {
  const local = /^\/api\/recreate\/assets\/([A-Za-z0-9_.-]+\.mp4)$/.exec(preview)
  if (!local) return false
  if (guiaDoManifesto(local[1])) return true // KINEO-GUIA-PRIVADO-1411 — o próprio guia no bucket privado (a rota de assets redireciona com URL assinada curta)
  return Object.hasOwn(RECREATE_ASSETS, local[1]) && (RECREATE_ASSETS as Record<string, { contentType: string }>)[local[1]].contentType === 'video/mp4'
}
export function movimentoDemoDoBucketValido(url: string, supabaseUrl: string, donos: readonly string[]): boolean {
  if (!/^https:\/\/[a-z0-9.-]+$/.test(supabaseUrl)) return false
  const prefixo = `${supabaseUrl}/storage/v1/object/public/renders/clips/`
  if (typeof url !== 'string' || !url.startsWith(prefixo)) return false
  const m = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.mp4$/.exec(url.slice(prefixo.length))
  return !!m && donos.includes(m[1])
}
// KINEO-MOVIMENTO-REVISOR-2-1411 [2º revisor, item 4] — a régua do molde recusa MARCA no texto (a cena e a ação vão ao motor): marcas e clubes conhecidos, e palavra com inicial
// maiúscula no meio da frase (nome próprio: marca, time, pessoa, lugar), menos as siglas permitidas.
export const MARCAS_CONHECIDAS = /\b(nike|adidas|puma|reebok|under armour|new balance|umbro|kappa|asics|mizuno|coca-?cola|pepsi|red bull|monster energy|gatorade|heineken|budweiser|emirates|qatar airways|etihad|visa|mastercard|apple|samsung|google|amazon|mcdonald'?s|starbucks|spotify|netflix|playstation|xbox|fifa|uefa|premier league|la liga|champions league|real madrid|barcelona|barça|manchester|chelsea|liverpool|arsenal|juventus|bayern|psg|flamengo|corinthians|palmeiras|boca juniors)\b/i
const SIGLAS_PERMITIDAS = new Set(['TV'])
export function temMarca(texto: string): boolean {
  if (MARCAS_CONHECIDAS.test(texto)) return true
  for (const frase of texto.split(/(?<=[.!?:;])\s+/)) {
    const palavras = frase.trim().split(/\s+/).slice(1).map((p) => p.replace(/[^A-Za-z'-]/g, ''))
    if (palavras.some((p) => /^[A-Z]/.test(p) && !SIGLAS_PERMITIDAS.has(p))) return true
  }
  return false
}
/** O que um molde de movimento precisa para existir (o guardião roda isto em todo molde do catálogo). Vazio = válido. */
// KINEO-RECEITA-FORA-DO-JS-1411 [revisor da CEO 14/11, item 1: "a régua vira checagem de quem ESCREVE o molde"] — movimentoProblemasNoPedido é o que o POST confere (estrutura:
// tarifa, uma foto, uma pessoa no guia, guia no manifesto, demo nosso); a régua de TEXTO (enquadramento, frase negativa, marca) roda só para quem
// escreve o molde (a ferramenta e o guardião, que garante que nenhum molde do catálogo tem problema): um falso positivo dela nunca vira 409 para cliente.
export function movimentoProblemasNoPedido(f: RecreateFormat): string[] {
  if (f.type !== 'motion') return ['não é motion']
  const p: string[] = []
  if (recreateMovimentoCredits(f) === null) p.push(`${f.seconds} s sem tarifa na tabela do Recreate (nem provisória da casa)`)
  if (f.photoSlots !== 1) p.push('uma foto só')
  if (f.pessoasNoGuia !== 1) p.push('o guia precisa ter UMA pessoa (pessoasNoGuia: 1)')
  if (!guiaDoManifesto(f.guia)) p.push('o guia precisa estar no manifesto do bucket privado (lib/recreate/guiasManifesto.ts)')
  if (!f.acao) p.push('o molde precisa da ação do passo 2')
  return p
}
export function movimentoProblemasDoMolde(f: RecreateFormat): string[] {
  const p: string[] = []
  if (f.type !== 'motion') return ['não é motion']
  if (recreateMovimentoCredits(f) === null) p.push(`${f.seconds} s sem tarifa na tabela do Recreate (nem provisória da casa)`) // KINEO-MOVIMENTO-ANTES-DE-ABRIR-1411 — era: recreateCreditCost(f.seconds)
  if (f.photoSlots !== 1) p.push('uma foto só')
  if (f.pessoasNoGuia !== 1) p.push('o guia precisa ter UMA pessoa (pessoasNoGuia: 1)')
  if (!guiaDoManifesto(f.guia)) p.push('o guia precisa estar no manifesto do bucket privado (lib/recreate/guiasManifesto.ts)') // KINEO-GUIA-PRIVADO-1411 — era: MP4 em RECREATE_ASSETS
  if (!f.cena || !/\b(knees up|waist up|full body from head to shoes)\b/i.test(f.cena) || !/face clearly visible/i.test(f.cena)) p.push('a cena enquadra joelhos ou cintura para cima ou o corpo inteiro ("full body from head to shoes"), com "face clearly visible"') // KINEO-MOVIMENTO-CORPO-INTEIRO-1411 — + corpo inteiro
  if (!movimentoDemoValido(f.preview)) p.push('o preview do catálogo é um asset nosso (/api/recreate/assets/<chave>); o demo do bucket mora em lib/recreate/movimentoDemos.ts') // KINEO-MOVIMENTO-REVISOR-2-1411 — era: asset ou URL do bucket
  if (!f.acao) p.push('o molde precisa da ação do passo 2')
  for (const [nome, texto] of [['cena', f.cena ?? ''], ['acao', f.acao ?? '']] as const) if (temFraseNegativa(texto)) p.push(`${nome} com frase negativa`)
  for (const [nome, texto] of [['cena', f.cena ?? ''], ['acao', f.acao ?? '']] as const) if (temMarca(texto)) p.push(`${nome} com marca ou nome próprio`) // KINEO-MOVIMENTO-REVISOR-2-1411
  for (const [prova, re] of Object.entries(MOVIMENTO_PEDE_PROVA) as [keyof typeof MOVIMENTO_PEDE_PROVA, RegExp][]) if (re.test(f.acao ?? '') && !(f.guiaMostra ?? []).includes(prova)) p.push(`a ação cita ${prova}, mas o molde não declara que o guia mostra isso (guiaMostra)`) // KINEO-ACAO-SO-O-GUIA-1411
  return p
}
// KINEO-ACAO-SO-O-GUIA-1411 [CEO 14/11: "a ação não pode citar collide, defender de perto nem TV se o molde não declarar que o guia mostra isso"] — palavras que exigem prova
// no vídeo-guia (campo guiaMostra do molde). Régua de TEXTO: roda na ferramenta e no guardião (movimentoProblemasDoMolde), nunca no caminho do pedido.
export const MOVIMENTO_PEDE_PROVA = {
  choque: /\b(collid\w*|collision\w*|clash\w*|tackl\w*|crash\w*|bump\w*|both fall)\b/i,
  defensor: /\b(defenders?|defending|marker|opponents?)\b/i,
  tv: /\b(tv|television|televised|broadcast\w*|live match|live football)\b/i,
} as const

// ─── O plano (o POST) ───
export type MovimentoPlanResult =
  | { ok: true; plan: { body: ClipRequestInput; model: string; credits: number; falUsd: number; photos: string[]; input: Record<string, unknown>; fingerprintInput: Record<string, unknown> } }
  | { ok: false; status: number; error: string }

/** O pedido do cliente vira o plano do passo 1. Só o servidor escreve o texto; o do navegador é ignorado (o molde é um preset). */
export function planMovimento(raw: Record<string, unknown>, ctx: { userId: string; supabaseUrl: string; paying: boolean }, descricao: string | null, catalogo: readonly RecreateFormat[] = RECREATE_FORMATS): MovimentoPlanResult {
  const bad = (error: string, status = 400): MovimentoPlanResult => ({ ok: false, status, error })
  const f = catalogo.find(x => x.id === raw.format) ?? null
  if (!f || f.type !== 'motion') return bad('Choose a video from the Kineo catalog.')
  if (movimentoProblemasNoPedido(f).length) return bad('This video is not available yet. Nothing was charged.', // KINEO-RECEITA-FORA-DO-JS-1411 — era: movimentoProblemasDoMolde (com a régua de texto)
    409)
  if (raw.consent !== true) return bad('Confirm you have permission to use these photos.')
  const seconds = Number(raw.seconds)
  if (seconds !== f.seconds) return recreateCreditCost(seconds) === null ? bad('Choose an available duration.') : bad('This duration needs an approved source video of the same length.', 409) // KINEO-MOVIMENTO-ANTES-DE-ABRIR-1411 — mesma resposta de antes para duração errada
  const credits = recreateMovimentoCredits(f) // KINEO-MOVIMENTO-ANTES-DE-ABRIR-1411 — era: recreateCreditCost(seconds) (6 s: o provisório da casa)
  if (credits === null) return bad('Choose an available duration.')
  if (seconds === 15 && !ctx.paying) return bad('Upgrade your plan to use this duration.', 402)
  if (!Array.isArray(raw.photos) || raw.photos.length !== 1) return bad('Add one photo of the person.')
  const foto = typeof raw.photos[0] === 'string' ? ownedClipImageUrl(raw.photos[0], ctx.userId, ctx.supabaseUrl) : null
  if (!foto) return bad('Upload photos to your own account before continuing.', 403)
  const input = movimentoEntradaDaCena(f, foto, descricao)
  return { ok: true, plan: {
    body: { engine: MOVIMENTO_ENGINE, seconds, aspect: null, prompt: movimentoRowPrompt(f), imageUrl: foto },
    model: MOVIMENTO_CENA_MODEL, credits, falUsd: movimentoFalUsd(seconds), photos: [foto], input,
    // A descrição lida da foto pode variar entre duas leituras: a repetição do MESMO pedido (mesma chave) não pode virar conflito por isso.
    fingerprintInput: { ...movimentoEntradaDaCena(f, foto, null), molde: f.id }, // KINEO-MOVIMENTO-ANTES-DE-ABRIR-1411 — o id do molde guardado na linha (impressão digital)
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
  naoCobrado: 'You were not charged.', // KINEO-MOVIMENTO-ANTES-DE-ABRIR-2-1411
} as const
// KINEO-MOVIMENTO-ANTES-DE-ABRIR-2-1411 [revisor da CEO 14/11, item 1] — a linha failed SEM débito no livro-razão (o processo caiu entre gravar a linha e debitar; ou o débito é de outra
// conta) ganha este motivo na varredura: sai da busca e a tela diz a verdade ("You were not charged"). O motivo de antes fica no evento clip_nunca_cobrado.
export const MOTIVO_NUNCA_COBRADO = 'never_charged'
/** A razão e a frase da falha para a tela; "returned" só com o estorno gravado na linha. */
export function movimentoFalhaParaTela(failureReason: string | null, creditsRefunded: number): { reason: 'not_you' | 'engine_refused' | 'scene_failed' | 'scene_blocked'; message: string } | null {
  if (failureReason === MOTIVO_NUNCA_COBRADO) return { reason: 'scene_failed', message: `${MOVIMENTO_FRASES.cenaFalhou} ${MOVIMENTO_FRASES.naoCobrado}` } // KINEO-MOVIMENTO-ANTES-DE-ABRIR-2-1411
  const fim = creditsRefunded > 0 ? MOVIMENTO_FRASES.devolvido : MOVIMENTO_FRASES.devolveDepois
  if (failureReason === MOVIMENTO_FALHA.naoEVoce) return { reason: 'not_you', message: `${MOVIMENTO_FRASES.naoEVoce} ${fim}` }
  if (failureReason === 'provider_failed' || failureReason === 'provider_rejected') return { reason: 'engine_refused', message: `${MOVIMENTO_FRASES.motorRecusou} ${fim}` }
  if (failureReason === MOVIMENTO_FALHA.cena) return { reason: 'scene_failed', message: `${MOVIMENTO_FRASES.cenaFalhou} ${fim}` }
  if (failureReason === MOVIMENTO_FALHA.bloqueada) return { reason: 'scene_blocked', message: `${MOVIMENTO_FRASES.cenaBloqueada} ${fim}` }
  return null
}
