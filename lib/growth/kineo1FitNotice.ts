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

export const KINEO1_FIT_NOTICE_VERSION = 'kineo1_fit_notice_v1'

// Palavras de desenho/animação. Fronteira de palavra onde o alfabeto permite; nos alfabetos sem espaço fixo
// (hindi, árabe, urdu) a substring basta.
const CARTOON_PATTERNS: ReadonlyArray<RegExp> = [
  /\b(cartoon|cartoons|animated|animation|anime|manga|pixar|disney|dreamworks|claymation|stop[- ]motion|3d animated|2d animated|comic book style)\b/i,
  /\b(desenho animado|desenhos animados|animação|animacao|estilo anime|estilo cartoon)\b/i, // pt
  /\b(dibujos animados|dibujo animado|animación|animacion|caricatura|estilo anime)\b/i, // es
  /\b(dessin animé|dessins animés|animation 3d|style anime)\b/i, // fr
  /\b(zeichentrick|zeichentrickfilm|animationsfilm|animiert)\b/i, // de
  /\b(cartone animato|cartoni animati|animazione)\b/i, // it
  /\b(tekenfilm|animatie)\b/i, // nl
  /\b(kreskówka|kreskówki|animacja)\b/i, // pl
  /\b(çizgi film|animasyon)\b/i, // tr
  /(мультфильм|мультик|анимация|аниме)/i, // ru
  /(мультфільм|анімація)/i, // uk
  /(كرتون|كارتون|رسوم متحركة|أنمي)/, // ar
  /(کارٹون|اینیمیشن)/, // ur
  /(कार्टून|एनिमेशन|एनीमेशन|एनिमेटेड)/, // hi
  /\b(kartun|animasi)\b/i, // id
  /(hoạt hình|phim hoạt hình)/i, // vi
]

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
  if (!CARTOON_PATTERNS.some((re) => re.test(text))) return { show: false, reason: 'no_cartoon_words', version }
  return { show: true, reason: 'cartoon', version }
}

export function kineo1FitNoticeCopy(seedanceCredits: string): { title: string; body: string; switchLabel: string; keepLabel: string } {
  return {
    title: 'Kineo 1 uses real footage — it can’t draw cartoons',
    body: `Kineo 1 builds your film from real stock clips and photos, so cartoon characters and animated scenes won’t look like what you describe. For an animated look, Seedance 1.5 generates every scene from your text (${seedanceCredits}).`,
    switchLabel: 'Switch to Seedance 1.5 →',
    keepLabel: 'Keep Kineo 1 (real footage)',
  }
}
