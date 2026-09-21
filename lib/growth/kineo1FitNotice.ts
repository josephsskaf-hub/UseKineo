// ═══ KINEO1-AVISO-DESENHO-2026-09-18 — o Kineo 1 não desenha; a pessoa fica sabendo ANTES de gastar crédito ═══
//
// MEDIDO (18/09, painel de coerência, notas 50 e 55): pedido em hindi "रंग-बिरंगे कार्टून स्टाइल में… मोटू, पतलू और
// चुटकी" (desenho animado com personagens de nome) rodou no Kineo 1 — que é filmagem REAL de banco (Pixabay) mais
// stills. Saiu pardal, vilarejo italiano e Bangladesh: o motor não tem como cumprir o pedido, e ninguém avisou. A
// pessoa pagou 5 créditos duas vezes.
//
// Fundador (18/09): "no 3 quero o aviso" (e não a troca automática de motor). Regra: com o Kineo 1 escolhido e
// um pedido de desenho/animação/anime no texto (nas 16 línguas da casa), a tela mostra o aviso com o caminho
// certo (Seedance 1.5 = cenas geradas) e um botão para trocar. Quem quiser insistir, insiste — informado.
// Nada aqui bloqueia o render; nada aqui toca o servidor.
//
// KINEO1-FILME-DESENHADO-2026-09-21 — as palavras de desenho moram em UM lugar (lib/cinematic/sceneStyle,
// DRAWN_LOOK_PATTERNS): o look do Seedance, este aviso e o modo desenhado do Kineo 1 leem a mesma lista. E o aviso
// passou a dizer a verdade nova: com pedido de desenho, o Kineo 1 troca o banco por stills desenhados + clipes
// gerados; o Seedance continua sendo o caminho para TODA cena animada.
import { looksLikeDrawnRequest } from '@/lib/cinematic/sceneStyle'

export const KINEO1_FIT_NOTICE_VERSION = 'kineo1_fit_notice_v2'

export interface Kineo1FitNoticeInput {
  /** Motor escolhido na tela (chave do Studio: 'fast' = Kineo 1). */
  engine: string
  /** O texto que a pessoa escreveu. */
  text: string
}

export type Kineo1FitReason = 'not_kineo1' | 'too_short' | 'no_cartoon_words' | 'cartoon'

export function decideKineo1FitNotice(input: Kineo1FitNoticeInput): { show: boolean; reason: Kineo1FitReason; version: typeof KINEO1_FIT_NOTICE_VERSION } {
  const version = KINEO1_FIT_NOTICE_VERSION
  if (input.engine !== 'fast') return { show: false, reason: 'not_kineo1', version }
  const text = (input.text ?? '').trim()
  if (text.length < 12) return { show: false, reason: 'too_short', version }
  if (!looksLikeDrawnRequest(text)) return { show: false, reason: 'no_cartoon_words', version }
  return { show: true, reason: 'cartoon', version }
}

export function kineo1FitNoticeCopy(seedanceCredits: string): { title: string; body: string; switchLabel: string; keepLabel: string } {
  return {
    title: 'Kineo 1 uses real footage — for a cartoon it switches to drawn stills',
    body: `Kineo 1 builds films from real stock clips. For an animated look it swaps the stock for drawn stills plus a few AI-animated clips, so most scenes won’t move. To animate every scene from your text, use Seedance 1.5 (${seedanceCredits}).`,
    switchLabel: 'Switch to Seedance 1.5 →',
    keepLabel: 'Keep Kineo 1 (drawn stills)',
  }
}
