import { CLIP_EFFECTS, clipEffectCredits } from '@/lib/clips/clipEffects'
import { recreateCreditCost } from '@/lib/checkoutPricing'

export interface RecreateFormat {
  id: string
  title: string
  preview: string
  poster: string
  seconds: number
  type: 'swap' | 'effect' | 'motion' // KINEO-RECREATE-MOVIMENTO-1411 — + motion (imagem nossa com a pessoa + o movimento do vídeo-guia nosso)
  prompt: string
  photoSlots: number
  effectKey?: string
  /** Swap only. KINEO-RECREATE-TRAVA-1011: true ONLY after a paid swap test (two different photos) swapped EVERY person. */
  swapApproved?: boolean
  /** Swap only, not approved: visible to the exact house allowlist while it is tested — never to customers. */
  swapInTest?: boolean
  /** Swap only: date of the approving paid test (YYYY-MM-DD). */
  approvedOn?: string
  /** Swap only: short note on the test state. */
  // KINEO-RECEITA-FORA-DO-JS-2-1411 [CEO 14/11: "nota interna não tem por que ir ao cliente"] — swapNote saiu: as notas dos testes da troca moram em lib/recreate/notasDaTroca.ts.
  /** KINEO-RECREATE-ORDEM-1311 — day the model entered the Recreate catalog (YYYY-MM-DD), taken from git history (first commit that added
   *  it here), never guessed. The catalog is listed newest first. Required: a new model without it does not compile (swap) or turns the
   *  guardian red (effect missing from RECREATE_EFFECT_DESDE). */
  desde: string
  /** KINEO-RECREATE-ELEVADOR-1011 — swap only: the base video shows more people than photoSlots; only this person is replaced
   *  (and checked). Example: 'the man'. Absent = every person in the video is replaced. */
  swapSubject?: string
  // KINEO-RECEITA-FORA-DO-JS-2-1411 [CEO 14/11: "checkFrames: se só o servidor usa, tire"] — o campo saiu: toda troca compara os mesmos quadros (RECREATE_CHECK_FRAMES), e só o
  // servidor (lib/recreate/swapCheck.ts) os usa.
  /** KINEO-RECREATE-MOVIMENTO-1411 — motion only: chave do MP4 NOSSO em RECREATE_ASSETS que guia o movimento (o próprio vídeo de demonstração do
   *  cartão). Nunca o vídeo de terceiros: ele não entra no repositório nem no bucket. */
  guia?: string // KINEO-GUIA-PRIVADO-1411 — a chave do guia em GUIAS_MANIFESTO (lib/recreate/guiasManifesto.ts): o MP4 mora no bucket privado, não no pacote
  /** Motion only: o cenário e o enquadramento da imagem do passo 1 (meio corpo ou joelhos para cima, rosto visível), em frase positiva. */
  cena?: string
  /** Motion only: a ação + a câmera + o cenário do passo 2 (o objeto citado aqui aparece), em frase positiva. */
  acao?: string
  /** Motion only (KINEO-ACAO-SO-O-GUIA-1411): o que o vídeo-guia MOSTRA de fato, para a ação poder citar. Sem a prova aqui, a régua recusa na ação as palavras de
   *  MOVIMENTO_PEDE_PROVA (choque, defensor, TV): o motor inventa o que o guia não tem, e inventa com marca. */
  guiaMostra?: readonly ('choque' | 'defensor' | 'tv')[]
  /** Motion only: pessoas no vídeo-guia. O motor guia UMA; o guardião recusa outro número. */
  pessoasNoGuia?: 1
  /** Motion only: true SÓ depois da validação paga da CEO. Sem isso, só a casa vê (com RECREATE_MOVIMENTO_RELEASE diferente de 'off'). */
  movimentoAprovado?: boolean
  /** KINEO-INVASOR-DE-CAMPO-1511 — swap com preço fora da tabela por duração (o molde de vários trechos): os créditos, LIDOS de lib/checkoutPricing.ts pelo servidor. Ausente = a tabela. */
  creditos?: number | null
  /** KINEO-INVASOR-DE-CAMPO-1511 [dono 15/11: "tira esse e coloca esse"] — molde RETIRADO da grade e do catálogo para todos (casa incluída): fica na lista só para as linhas antigas acharem o molde (estorno, passo 2). Valor = o dia e o motivo. */
  retirado?: string
  /** KINEO-INVASOR-DE-CAMPO-1511 — a espera real que a tela promete enquanto o vídeo é feito, em minutos [mínimo, máximo]. Ausente = a frase de sempre. */
  esperaMinutos?: readonly [number, number]
  /** KINEO-PALCO-INVADER-1611 — o molde ABERTO da máquina de trechos: o palco da tela única (Clip + Recreate) abre nele. Só o servidor marca. */
  palco?: boolean
  /** KINEO-DOG-YOU-ABRE-1611 — só do servidor: o instante em que o molde de vários trechos abriu ao público (ISO, com hora). Desempata a ordem de novidade no mesmo dia. */
  abertoEm?: string
}

export const RECREATE_SWAP_PROMPT = 'Face swap only. Replace only the face with the face from the reference photo. Keep the original clothing, body, scene, lighting, camera, movement, cuts and audio unchanged.'
// KINEO-RECREATE-ELEVADOR-1011 [fundador 10/11: "é só para trocar a foto só do homem… A mulher não precisa trocar"] — one person of several.
export const recreateSwapPromptFor = (subject?: string) => subject
  ? `Face swap only. Replace only the face of ${subject} with the face from the reference photo. Do not change any other person in the video. Keep the original clothing, body, scene, lighting, camera, movement, cuts and audio unchanged.`
  : RECREATE_SWAP_PROMPT
export const RECREATE_ASSETS = {
  'outfit-morph.mp4': { file: 'outfit-morph-v6.mp4', contentType: 'video/mp4' },
  // KINEO-RECREATE-CARTAO-BRANCO-1011 — era um PNG de 1,96 MB (768×1376) servido com no-store: o cartão ficava branco até ele chegar. Agora o
  // quadro de 1 s do próprio vídeo, 720 px, JPEG (~100 KB), como os outros pôsteres da casa. Guardião: scripts/test-recreate-poster-1011.mjs.
  'outfit-morph.jpg': { file: 'outfit-morph.jpg', contentType: 'image/jpeg' },
  'elevador.mp4': { file: 'elevador-v1.mp4', contentType: 'video/mp4' },
  'elevador.jpg': { file: 'elevador.jpg', contentType: 'image/jpeg' },
  // KINEO-RECREATE-TRAVA-1011 — house candidates (docs/referencias/vitrine-10-0911), 716×1280, 24 fps; poster = frame at 1 s, 720 px.
  // Money fan (dinheiro) saiu por decisão do fundador em 10/11.
  'passarela.mp4': { file: 'recreate-passarela.mp4', contentType: 'video/mp4' },
  'passarela.jpg': { file: 'recreate-passarela.jpg', contentType: 'image/jpeg' },
  'escolha-o-favorito.mp4': { file: 'recreate-favorito.mp4', contentType: 'video/mp4' },
  'escolha-o-favorito.jpg': { file: 'recreate-favorito.jpg', contentType: 'image/jpeg' },
  'duelo-de-danca.mp4': { file: 'recreate-danca.mp4', contentType: 'video/mp4' },
  'duelo-de-danca.jpg': { file: 'recreate-danca.jpg', contentType: 'image/jpeg' },
  // KINEO-RECREATE-HOME-1311 — clipes novos da home (docs/home-1311/clipes, 768×1152, 6,6 s, sem som). Base = o clipe em câmera lenta
  // suave até 8,0 s (0,81×, quadros interpolados por movimento, sem corte), porque o recast sai com a duração da base e só 8/10/15 s
  // têm tarifa. Pôster = quadro de 1 s, 720 px. O id do formato é o mesmo da vitrine: o cartão ganha o botão Recreate sozinho.
  'sueter-aconchegante.mp4': { file: 'recreate-sueter.mp4', contentType: 'video/mp4' },
  'sueter-aconchegante.jpg': { file: 'recreate-sueter.jpg', contentType: 'image/jpeg' },
  'selfie-confete.mp4': { file: 'recreate-selfie.mp4', contentType: 'video/mp4' },
  'selfie-confete.jpg': { file: 'recreate-selfie.jpg', contentType: 'image/jpeg' },
} as const

/** KINEO-RECREATE-TRAVA-1011 — frames 84 and 168 (3.5 s and 7.0 s at 24 fps) of base and result feed the "not swapped" check. */
export const RECREATE_CHECK_FRAMES = [84, 168] as const
const swapSource = (id: string) => ({ preview: `/api/recreate/assets/${id}.mp4` }) // KINEO-RECEITA-FORA-DO-JS-2-1411 — era: + checkFrames: RECREATE_CHECK_FRAMES

// KINEO-RECREATE-TRAVA-1011 [fundador 10/11: "tem que fazer tudo funcionar agora. Sem erros"] — a swap format reaches customers ONLY
// with swapApproved: true, set by hand after its paid swap test. swapInTest: only the exact house allowlist sees it.
// KINEO-RECREATE-ORDEM-1311 [dono 13/11: "Todo recreate que a gente comprar ou fizer tem que vir na lista por ordem na página dos
// templates"] — the day each effect entered the Recreate catalog, by git history: the catalog was born on 09/11 (20d959ae5, which already
// listed every effect with a preview poster) and every poster below is older (05/10 to 30/10), so all effects entered on 09/11. A new
// effect enters on the day its poster lands in lib/clips/clipEffects.ts — add it here in the same commit, or the guardian turns red.
// Guardian: scripts/test-recreate-ordem-1311.mjs.
export const RECREATE_EFFECT_DESDE: Readonly<Record<string, string>> = {
  bring_to_life: '2026-11-09', product_360: '2026-11-09', zoom_out_earth: '2026-11-09', cinematic_slowmo: '2026-11-09',
  restore_old_photo: '2026-11-09', color_burst: '2026-11-09', storm_behind: '2026-11-09', melt: '2026-11-09', secret_cake: '2026-11-09',
  wings: '2026-11-09', dollar_rain: '2026-11-09', muscle_surge: '2026-11-09', witch: '2026-11-09', zombie: '2026-11-09',
  dust_away: '2026-11-09', figurine_3d: '2026-11-09', snow_globe: '2026-11-09', santa_cartoon: '2026-11-09', giant_product: '2026-11-09',
  pet_xmas_angel: '2026-11-09', pet_xmas_tree: '2026-11-09', pet_lion: '2026-11-09', pet_bee: '2026-11-09', catrina: '2026-11-09',
  catrina_pet: '2026-11-09', werewolf: '2026-11-09', hug: '2026-11-09', kiss: '2026-11-09',
}

/** KINEO-RECREATE-ORDEM-1311 — newest first by `desde`; same day keeps the order of the list below (stable, by index). */
export function recreateNewestFirst<T extends { desde: string }>(list: readonly T[]): T[] {
  return list.map((f, i) => ({ f, i })).sort((a, b) => (a.f.desde < b.f.desde ? 1 : a.f.desde > b.f.desde ? -1 : a.i - b.i)).map(x => x.f)
}

const HALLOWEEN_AND_DAY_OF_THE_DEAD = new Set(['effect-witch', 'effect-zombie', 'effect-werewolf', 'effect-catrina', 'effect-catrina-pet'])

export function recreateAutumnTemplatesLast<T extends { id: string }>(list: readonly T[]): T[] {
  return [
    ...list.filter((format) => !HALLOWEEN_AND_DAY_OF_THE_DEAD.has(format.id)),
    ...list.filter((format) => HALLOWEEN_AND_DAY_OF_THE_DEAD.has(format.id)),
  ]
}

// Written in the order models were added; RECREATE_FORMATS (and so the public grid, the signed-in grid and /ai-face-swap-video) lists
// them newest first.
const RECREATE_CATALOG: readonly RecreateFormat[] = [
  { id: 'outfit-morph', title: 'Outfit Morph', desde: '2026-11-09', ...swapSource('outfit-morph'), poster: '/api/recreate/assets/outfit-morph.jpg', seconds: 10, type: 'swap', prompt: RECREATE_SWAP_PROMPT, photoSlots: 1, swapApproved: false, swapInTest: true },
  { id: 'elevador', title: 'Elevator', desde: '2026-11-09', ...swapSource('elevador'), poster: '/api/recreate/assets/elevador.jpg', seconds: 10, type: 'swap', prompt: recreateSwapPromptFor('the man'), photoSlots: 1, swapSubject: 'the man', swapApproved: false, swapInTest: true },
  { id: 'passarela', title: 'Runway walk', desde: '2026-11-10', ...swapSource('passarela'), poster: '/api/recreate/assets/passarela.jpg', seconds: 10, type: 'swap', prompt: RECREATE_SWAP_PROMPT, photoSlots: 1, swapApproved: true, swapInTest: false, approvedOn: '2026-11-10' },
  { id: 'escolha-o-favorito', title: 'Guess my favorite', desde: '2026-11-10', ...swapSource('escolha-o-favorito'), poster: '/api/recreate/assets/escolha-o-favorito.jpg', seconds: 8, type: 'swap', prompt: RECREATE_SWAP_PROMPT, photoSlots: 2, swapApproved: true, swapInTest: false, approvedOn: '2026-11-10' },
  { id: 'duelo-de-danca', title: 'Dance duo', desde: '2026-11-10', ...swapSource('duelo-de-danca'), poster: '/api/recreate/assets/duelo-de-danca.jpg', seconds: 10, type: 'swap', prompt: RECREATE_SWAP_PROMPT, photoSlots: 2, swapApproved: false, swapInTest: true },
  // KINEO-RECREATE-HOME-1311 [dono 13/11: "não tem o botão recreate" no cartão do topo; teste pago aprovado pelo dono, teto US$ 7]
  { id: 'sueter-aconchegante', title: 'Cozy sweater flip', desde: '2026-11-13', ...swapSource('sueter-aconchegante'), poster: '/api/recreate/assets/sueter-aconchegante.jpg', seconds: 8, type: 'swap', prompt: RECREATE_SWAP_PROMPT, photoSlots: 1, swapApproved: true, swapInTest: false, approvedOn: '2026-11-13' },
  // Casal em selfie: troca SÓ o homem (uma foto), como o Elevator.
  { id: 'selfie-confete', title: 'Selfie with the crowd', desde: '2026-11-13', ...swapSource('selfie-confete'), poster: '/api/recreate/assets/selfie-confete.jpg', seconds: 8, type: 'swap', prompt: recreateSwapPromptFor('the man'), photoSlots: 1, swapSubject: 'the man', swapApproved: true, swapInTest: false, approvedOn: '2026-11-13' },
  ...CLIP_EFFECTS.filter(e => e.preview?.poster).map(e => ({
    id: `effect-${e.key.replaceAll('_', '-')}`, title: e.title, preview: e.preview!.video,
    poster: e.preview!.poster!, desde: RECREATE_EFFECT_DESDE[e.key] ?? '', seconds: e.seconds, type: 'effect' as const, prompt: e.template ? e.sub : e.prompt,
    photoSlots: e.pair ? 2 : 1, effectKey: e.key,
  })),
]
// KINEO-RECEITA-FORA-DO-JS-1411 [CEO 14/11: "a receita está no JavaScript público"] — os moldes de MOVIMENTO (inteiros: vitrine E receita) saíram daqui para
// lib/recreate/movimentoMoldes.ts, que só o servidor lê: este arquivo vai no JavaScript do navegador (RecreateClient, access, entry). O servidor monta
// o catálogo completo em lib/recreate/catalogoServidor.ts e manda ao cliente só os campos de vitrine dos moldes que aquela pessoa pode ver.
// KINEO-RECEITA-FORA-DO-JS-1411 — a VITRINE (sem receita: nada de cena, ação nem guia) dos moldes de movimento JÁ APROVADOS para o público, para o link público e o catálogo
// do navegador acharem o molde; o servidor troca cada um pela versão completa de ./movimentoMoldes. Molde fechado NUNCA entra aqui (o guardião confere).
export const RECREATE_MOVIMENTO_PUBLICOS: readonly RecreateFormat[] = []
export const RECREATE_FORMATS: readonly RecreateFormat[] = recreateNewestFirst([...RECREATE_CATALOG, ...RECREATE_MOVIMENTO_PUBLICOS]) // KINEO-RECEITA-FORA-DO-JS-1411 — o catálogo do NAVEGADOR: troca, efeito e a vitrine do movimento aprovado; o movimento fechado e a receita vêm do servidor (catalogoServidor)
export const recreateFormat = (id: unknown) => RECREATE_FORMATS.find(f => f.id === id) ?? null
/** KINEO-RECREATE-TRAVA-1011 — a swap is sold only at an approved tariff (RECREATE_PRICING). 8 s = 45 since 10/11 ("Cobra 45"). */
// KINEO-MOVIMENTO-ANTES-DE-ABRIR-1411 [CEO 14/11 12:30: "prepare o molde para aceitar 6 s com o preço lido de lib/checkoutPricing.ts; para a casa, um valor PROVISÓRIO atrás do
// interruptor internal, marcado no código"] — PROVISÓRIO: 6 s não tem tarifa em RECREATE_PRICING; o preço público é do dono (foto de decisão de 14/11:
// A = 6 s por 25, recomendada; B = 40; C = esperar 10 s encadeado). Este valor vale SÓ para molde de movimento SEM aprovação (movimentoAprovado !== true),
// que só a casa vê; molde aprovado (público) exige a tarifa da tabela de lib/checkoutPricing.ts, senão some do catálogo. Com o sim do dono, a linha de
// preço entra em RECREATE_PRICING e esta tabela sai.
export const RECREATE_MOVIMENTO_PROVISORIO_CASA: Readonly<Record<number, number>> = { 6: 25 }
/** Os créditos de um molde de movimento: a tabela do Recreate (lib/checkoutPricing.ts); sem tarifa, o provisório da casa SÓ se o molde não for aprovado. */
export const recreateMovimentoCredits = (f: RecreateFormat): number | null => recreateCreditCost(f.seconds) ?? (f.type === 'motion' && f.movimentoAprovado !== true ? RECREATE_MOVIMENTO_PROVISORIO_CASA[f.seconds] ?? null : null)
export const recreateSwapPriced = (f: RecreateFormat) => (f.type !== 'swap' && f.type !== 'motion') || (f.type === 'motion' ? recreateMovimentoCredits(f) : f.creditos !== undefined ? f.creditos : recreateCreditCost(f.seconds)) !== null // KINEO-INVASOR-DE-CAMPO-1511 — + f.creditos (swap fora da tabela por duração) // KINEO-MOVIMENTO-ANTES-DE-ABRIR-1411 — era: recreateCreditCost(f.seconds) para os dois // KINEO-RECREATE-MOVIMENTO-1411 — o movimento usa a MESMA tabela da troca (CEO 14/11: 10 s = 40)
export const RECREATE_UNPRICED_ERROR = 'This video is not available yet: its price for this length is still being decided. Nothing was charged.'
/** KINEO-RECREATE-MOVIMENTO-1411 — os créditos de qualquer molde: troca e movimento pela tabela do Recreate (mesma duração, mesmo preço); efeito pelo
 *  preço do efeito. Toda tela e rota que mostra ou cobra créditos do catálogo passa por aqui (nunca uma bifurcação "troca ? … : efeito"). */
export function recreateCreditsFor(f: RecreateFormat): number | null {
  return f.type === 'motion' ? recreateMovimentoCredits(f) : f.type === 'swap' ? (f.creditos !== undefined ? f.creditos : recreateCreditCost(f.seconds)) : recreateEffectCredits(f) // KINEO-INVASOR-DE-CAMPO-1511 — + f.creditos // KINEO-MOVIMENTO-ANTES-DE-ABRIR-1411 — era: swap ou motion pela tabela
}
export function recreateEffectCredits(f: RecreateFormat): number | null {
  const effect = CLIP_EFFECTS.find(e => e.key === f.effectKey)
  return effect ? clipEffectCredits(effect) : null
}
