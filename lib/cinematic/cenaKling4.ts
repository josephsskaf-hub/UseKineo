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

/** O prompt final da cena do Kling 4: sem moldura, cortado pelo adaptador de sempre e com o eixo de câmera se couber. */
export function promptDaCenaKling4(prompt: string, style: StyleAnchor, index: number): string {
  return promptDaCenaKling4Com(promptCurtoDoFilmeKling4, prompt, style, index)
}

/** O mesmo, com o adaptador de corte injetado (os guardiões de texto rodam o adaptador antigo/mutante por aqui). */
export function promptDaCenaKling4Com(compactar: (p: string, s: StyleAnchor) => string, prompt: string, style: StyleAnchor, index: number): string {
  const curto = compactar(semMolduraParaKling4(prompt, style), style)
  const medio = /^[^.]+\. /.exec(curto)?.[0] ?? ''
  const comEixo = `${medio}${eixoCurtoKling4(index)}. ${curto.slice(medio.length)}`
  const base = Array.from(comEixo).length <= KLING4_ORCAMENTO_DA_CAMADA ? comEixo : curto
  // KINEO-CENA-PEDIDO-3010 — defeito 3: a superfície que costuma ganhar letra (lousa, tela, página, placa) vai descrita em positivo,
  // antes da cauda "Mouth closed", só se couber nos 512 (lib/cinematic/superficieSemTexto).
  const superficie = fraseUnicaDeSuperficie(prompt)
  const cauda = ' Mouth closed, no speaking.'
  if (!superficie || !base.endsWith(cauda) || base.includes(superficie)) return base
  const comSuperficie = `${base.slice(0, -cauda.length).replace(/[\s,.]+$/, '')}. ${superficie}${cauda}`
  return Array.from(comSuperficie).length <= KLING4_ORCAMENTO_DA_CAMADA ? comSuperficie : base
}
