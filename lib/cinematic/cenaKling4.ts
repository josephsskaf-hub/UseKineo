// KINEO-CENA-PEDIDO-3010 — pedido do revisor de vídeos (29/10, rodada 23:17): no Kling 4 multi-cena a cena saía SEM a ação da fala
// (Arca de Noé sem arca, dilúvio nem arco-íris; Serafina andando de costas em 5 de 8 quadros, a luta e o resgate só na legenda).
// Medido com o texto real: cada cena do Kling 4 tem 512 caracteres, e o prompt clássico chega com ~240 de moldura que não é cena —
// "Opening shot: show the described subject…", o "photorealistic, ultra-detailed." repetido, o enquadramento 9:16 com faixa de
// legenda e "characters act naturally…". promptCurtoDoFilmeKling4 corta no orçamento e a cena 1 ficava só com moldura + ficha.
// Aqui, ANTES do corte: (1) a moldura sai (o meio, a época, a ficha do elenco, a proteção de texto e o "Mouth closed" ficam — quem
// cuida deles continua sendo promptCurtoDoFilmeKling4); (2) cada cena ganha um eixo de câmera determinístico (o mesmo rodízio do
// Kling 2.5, vizinhos sempre diferentes), curto, logo depois do meio — só se couber nos 512; senão a cena sai sem o eixo, nunca cortada.
import { promptCurtoDoFilmeKling4 } from '@/lib/cinematic/filmQuality'
import { kling25ShotAxis } from '@/lib/cinematic/klingShots'
import { CAMERA_CLAUSE_RE } from '@/lib/cinematic/sceneDescriptions' // KINEO-REPETICAO-FREE15-1011
import type { StyleAnchor } from '@/lib/cinematic/sceneStyle'
import { fraseUnicaDeSuperficie } from '@/lib/cinematic/superficieSemTexto'

export const CENA_KLING4_VERSAO = 'cena_kling4_3010_v1' as const
/** Teto do KlingV4Shot.prompt (code points), o mesmo que buildKling4TrialInput respeita. */
export const KLING4_PROMPT_MAX = 512
/** O que esta camada pode ocupar: o teto menos a instrução de imagem-chave que buildKling4TrialInput/o filme pago prefixam
 *  ("Scene 8: use middle keyframe 7. " ≈ 34) com folga — o eixo e a superfície só entram se couberem AQUI. */
export const KLING4_ORCAMENTO_DA_CAMADA = KLING4_PROMPT_MAX - 48

const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const MOLDURAS: ReadonlyArray<RegExp> = [
  /Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in\.\s*/i,
  /,?\s*\b(?:9:16|16:9|1:1|4:5)\s+\w+\s+(?:framing|composition)\b[^.]*?\bno logo\b/i,
  /,?\s*characters act naturally within the scene without addressing the viewer/i,
  /,\s*\b(?:9:16|16:9|1:1|4:5)\s+\w+\s+(?:framing|composition)\b(?!,)/i,
  // KINEO-K4-SEM-MOLDURA-3010 — revisão de 30/10 (Kling 4, 1º filme): a moldura do documentário enchia os 512 e o eixo da cena e a tela
  // descrita em positivo não cabiam — 2 cenas com o MESMO prompt (REPETICAO) e tela de site com letras falsas (TEXTO_INVENTADO, grego).
  /,?\s*faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces/i,
  /,?\s*subject clearly framed with the lower third clear for captions/i,
  /,?\s*energetic, natural, documentary, consistent color grade across all scenes/i,
  /,\s*no watermark, no logo(?=,)/i,
]

/** O prompt clássico sem a moldura que não é cena; meio ("Film visual medium: …"), elenco, época e proteções ficam. */
export function semMolduraParaKling4(prompt: string, style: StyleAnchor): string {
  const lock = /^Film visual medium: .+?\. /.exec(prompt)?.[0] ?? ''
  let corpo = prompt.slice(lock.length)
  for (const re of MOLDURAS) corpo = corpo.replace(re, '')
  corpo = corpo.replace(new RegExp(`^\\s*${escapa(style.lookPhrase)}[.,]?\\s*`, 'i'), '')
  corpo = corpo.replace(/\.\s*,\s*/g, '. ').replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').replace(/^[\s,.;]+/, '').trim()
  return lock + corpo
}

/** O eixo de câmera da cena, curto (até 2 trechos, ≤ 70 caracteres): "Low-angle shot looking up at the subject, slow upward tilt". */
export function eixoCurtoKling4(index: number): string {
  const partes = kling25ShotAxis(index).split(', ')
  let eixo = partes[0]
  if (partes[1] && (eixo + ', ' + partes[1]).length <= 70) eixo += ', ' + partes[1]
  return eixo
}

// ═══ KINEO-REPETICAO-FREE15-1011 [aval permanente do fundador 01/11 (laço do revisor)] ═══════════════════════════════════
// Revisor 09/11: 4 de 4 primeiros filmes grátis de 15 s "mostram a mesma coisa" (mão no mapa em 3 quadros, rapaz escrevendo
// em 4 de 8). Provado no claim (cinematic_submission_claim.response): o vetor classicScenePrompts — que desenha as 3
// imagens-chave FLUX do Kling 4 grátis (MESMA seed nas 3) e é o prompt dos 3 clipes da reserva Seedance 1.5 — só tinha
// plano quando o descritor escrevia um ("A close-up of an ancient map"); nas outras cenas a única câmera era o "smooth camera
// motion" da moldura, igual em todas. O rodízio de klingShots só entra no Kling 2.5, e o eixo curto acima só no texto do
// clipe, depois da imagem-chave, e cai quando não cabe nos 512.
// v2 (revisão adversária 10/11): o plano é decidido para o FILME, não por índice cego —
//  (a) cena cujo texto JÁ diz plano/câmera (CAMERA_CLAUSE_RE de sceneDescriptions + medium/full/long/establishing) fica
//      INTOCADA; (b) a última cena nunca recebe close nem "subject small": mostra o sujeito inteiro na ação final; nenhuma
//      cena recebe "subject small" (personagem nomeado viraria figura pequena); (c) nenhuma cena recebe plano da mesma família
//      de um que o filme já tem. 3 cenas já com plano = nada muda. Prefixo depois da trava de estilo ("Film visual medium: …. "
//      continua a 1ª coisa do prompt); nada é cortado nem normalizado. Guardião: scripts/test-repeticao-free15-1011.mjs.
const TRAVA_DO_ESTILO_1011 = /^Film visual medium: .+?\. /
/** Os planos do filme grátis: [família, frase]. A frase curta do clipe do Kling 4 = os 2 primeiros trechos (como eixoCurtoKling4). */
export const PLANOS_DO_FILME_GRATIS: ReadonlyArray<readonly [string, string]> = [
  ['medio', 'Medium shot, subject centered and clearly readable, slow push-in'],
  ['close', 'Close-up on a telling detail of the action, shallow depth of field, gentle rack focus'],
  ['inteiro', 'Full shot showing the whole subject clearly in the final action, slow pull-back'],
  ['lateral', 'Tracking shot gliding alongside the subject, steady lateral travelling'],
  ['baixo', 'Low-angle shot looking up at the subject, slow upward tilt'],
  ['alto', 'High-angle shot looking down over the scene, slow descending crane move'],
]
const FRASE: Record<string, string> = Object.fromEntries(PLANOS_DO_FILME_GRATIS)
/** Preferência por posição: abertura médio; meio detalhe; fecho o sujeito inteiro na ação final (nunca close). */
const PREFERENCIA: Record<'abertura' | 'meio' | 'fecho', ReadonlyArray<string>> = {
  abertura: ['medio', 'lateral', 'baixo', 'inteiro', 'alto'],
  meio: ['close', 'medio', 'lateral', 'baixo', 'alto', 'inteiro'],
  fecho: ['inteiro', 'medio', 'lateral', 'baixo'],
}
/** Moldura que TODA cena carrega e fala de câmera sem ser plano: sai antes do teste (senão toda cena "já teria plano"). */
const MOLDURA_SEM_PLANO: ReadonlyArray<RegExp> = [
  /Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in\.\s*/gi,
  /\bsmooth camera motion\b/gi,
  /\b(?:looking directly into|addressing|address|at) the (?:camera|viewer)\b/gi,
]
const PLANO_EXTRA_RE = /\b(?:medium(?:[- ]close)?\s+shot|medium\s+close-up|full\s+shot|long\s+shot|wide\s+(?:angle|view|establishing)|wide-angle|establishing\s+shot|extreme\s+close-up|two-shot|point[- ]of[- ]view|pov|low\s+angle|high\s+angle|bird'?s[- ]eye\s+view)\b/i
const corpoDoPrompt = (texto: string) => { const trava = TRAVA_DO_ESTILO_1011.exec(texto)?.[0] ?? ''; return { trava, corpo: texto.slice(trava.length) } }
/** A família do plano que o texto da cena JÁ pede (null = a cena não diz plano nem câmera). */
export function planoQueACenaJaTem(prompt: string, style?: StyleAnchor | null): string | null {
  let t = corpoDoPrompt(String(prompt ?? '')).corpo
  if (style?.suffix) t = t.split(style.suffix).join(' ')
  for (const re of MOLDURA_SEM_PLANO) t = t.replace(re, ' ')
  if (!CAMERA_CLAUSE_RE.test(t) && !PLANO_EXTRA_RE.test(t)) return null
  if (/\b(?:close-up|closeup|close\s+up|macro|detail\s+shot)\b/i.test(t)) return 'close'
  if (/\b(?:wide|establishing|aerial|drone|overhead|long\s+shot|bird'?s[- ]eye)\b/i.test(t)) return 'aberto'
  if (/\bmedium\b/i.test(t)) return 'medio'
  if (/\bfull\s+shot\b/i.test(t)) return 'inteiro'
  if (/\blow[- ]angle\b/i.test(t)) return 'baixo'
  if (/\b(?:high[- ]angle|top-down)\b/i.test(t)) return 'alto'
  if (/\b(?:tracking|dolly)\b/i.test(t)) return 'lateral'
  return 'camera'
}
const planoGratisDe = (corpo: string) => PLANOS_DO_FILME_GRATIS.find(([, f]) => corpo.startsWith(`${f}. `)) ?? null

/** Os planos do filme grátis inteiro: cena com plano próprio fica intocada; as outras ganham um plano de família que o filme ainda não tem. */
export function eixosDoFilmeGratis(prompts: ReadonlyArray<string>, style?: StyleAnchor | null): string[] {
  const textos = prompts.map((p) => String(p ?? ''))
  const n = textos.length
  const proprio = textos.map((p) => planoGratisDe(corpoDoPrompt(p).corpo)?.[0] ?? planoQueACenaJaTem(p, style))
  const usadas = new Set(proprio.filter((f): f is string => !!f))
  return textos.map((p, i) => {
    if (proprio[i]) return p
    const lista = n > 1 && i === n - 1 ? PREFERENCIA.fecho : i === 0 ? PREFERENCIA.abertura : PREFERENCIA.meio
    const familia = lista.find((f) => !usadas.has(f)) ?? lista[0]
    usadas.add(familia)
    const { trava, corpo } = corpoDoPrompt(p)
    return `${trava}${FRASE[familia]}. ${corpo}`
  })
}

/** O inverso exato: devolve o prompt de antes (o texto do clipe do Kling 4 e a cópia do juiz de coerência nascem dele). */
export function semEixoDoFilmeGratis(prompt: string): string {
  const texto = String(prompt ?? '')
  const { trava, corpo } = corpoDoPrompt(texto)
  const plano = planoGratisDe(corpo)
  return plano ? trava + corpo.slice(plano[1].length + 2) : texto
}
/** A frase curta (≤ 2 trechos) do plano do filme grátis que o prompt carrega, ou null. */
export function eixoCurtoDoFilmeGratis(prompt: string): string | null {
  const plano = planoGratisDe(corpoDoPrompt(String(prompt ?? '')).corpo)
  return plano ? plano[1].split(', ').slice(0, 2).join(', ') : null
}

/** O prompt final da cena do Kling 4: sem moldura, cortado pelo adaptador de sempre e com o eixo de câmera se couber. */
export function promptDaCenaKling4(prompt: string, style: StyleAnchor, index: number): string {
  return promptDaCenaKling4Com(promptCurtoDoFilmeKling4, prompt, style, index)
}

/** O mesmo, com o adaptador de corte injetado (os guardiões de texto rodam o adaptador antigo/mutante por aqui). */
export function promptDaCenaKling4Com(compactar: (p: string, s: StyleAnchor) => string, prompt: string, style: StyleAnchor, index: number): string {
  const eixoGratis = eixoCurtoDoFilmeGratis(prompt) // KINEO-REPETICAO-FREE15-1011 — o plano do vetor do grátis sai do corpo e vira o eixo curto do clipe: imagem-chave e clipe pedem o mesmo plano
  prompt = semEixoDoFilmeGratis(prompt) // KINEO-REPETICAO-FREE15-1011
  const curto = compactar(semMolduraParaKling4(prompt, style), style)
  const medio = /^[^.]+\. /.exec(curto)?.[0] ?? ''
  const comEixo = `${medio}${eixoGratis ?? eixoCurtoKling4(index)}. ${curto.slice(medio.length)}` // KINEO-REPETICAO-FREE15-1011 — sem plano do grátis: o eixo de sempre
  const base = Array.from(comEixo).length <= KLING4_ORCAMENTO_DA_CAMADA ? comEixo : curto
  // KINEO-CENA-PEDIDO-3010 — defeito 3: a superfície que costuma ganhar letra (lousa, tela, página, placa) vai descrita em positivo,
  // antes da cauda "Mouth closed", só se couber nos 512 (lib/cinematic/superficieSemTexto).
  const superficie = fraseUnicaDeSuperficie(prompt)
  const cauda = ' Mouth closed, no speaking.'
  if (!superficie || !base.endsWith(cauda) || base.includes(superficie)) return base
  const comSuperficie = `${base.slice(0, -cauda.length).replace(/[\s,.]+$/, '')}. ${superficie}${cauda}`
  return Array.from(comSuperficie).length <= KLING4_ORCAMENTO_DA_CAMADA ? comSuperficie : base
}
