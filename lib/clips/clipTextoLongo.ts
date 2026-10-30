// KINEO-CENA-PEDIDO-3010 — pedido do revisor de vídeos (29/10): 2 primeiros vídeos de brasileiros vieram como clipe de 12 s
// de um homem real de terno, porque a pessoa colou um ROTEIRO de filme ("Crie um vídeo animado 1080x1920 em terceira pessoa…")
// na tela do Clipe. A tela não avisava que aquilo vira UM clipe curto, e o "animado" do pedido não chegava ao prompt.
// Lib pura: o aviso de roteiro longo (com a porta para o Filme narrado, texto preenchido) e o estilo pedido no texto.

/** Acima disto o texto é história, não um clipe de 5–12 s. */
export const CLIP_ROTEIRO_PALAVRAS = 60

/** O texto tem cara de roteiro de filme (longo ou com marcas de roteiro)? */
export function pareceRoteiroDeFilme(texto: string): boolean {
  const t = String(texto ?? '').trim()
  if (!t) return false
  if (t.split(/\s+/).filter(Boolean).length > CLIP_ROTEIRO_PALAVRAS) return true
  if (PEDE_FALA_RE.test(t) || PEDE_DURACAO_LONGA_RE.test(t) || FALA_DE_PERSONAGEM_RE.test(t)) return true // KINEO-REVISOR-RESTO-3010
  if (frasesDoTexto(t) >= CLIP_CONTO_FRASES) return true // KINEO-CLIPE-CONTO-3010
  return /\b(?:HOOK|MICRO REWARD|ESCALATION|PAYOFF|CENA \d|SCENE \d|Cena \d|Scene \d)\b|\[Pexels:/.test(t)
}

// KINEO-REVISOR-RESTO-3010 — revisões de 30/10: 6 de 19 filmes eram clipe MUDO para quem pediu fala (urdu, espanhol, PT),
// e um anúncio de 30 s virou clipe de 10 s. Texto curto também é roteiro quando pede voz, fala ou mais tempo do que o clipe tem.
const PEDE_FALA_RE = /\b(?:narrat(?:or|ion|ed)|voice[\s-]?over|voiceover|dialogues?|speaking|talking to (?:the )?camera|says to the camera|narrador|narra[çc][aã]o|narrado|locu[çc][aã]o|locutor|di[aá]logos?|falando|fala para a c[aâ]mera|hablando|voz en off|narraci[oó]n)\b/i
const PEDE_DURACAO_LONGA_RE = /\b(?:1[3-9]|[2-9]\d|1\d\d)\s*(?:s|sec|secs|seconds?|segundos?)\b|\b(?:1|2|3)\s*(?:min|mins|minutes?|minutos?)\b/i
// KINEO-CLIPE-CONTO-3010 — revisão de 30/10 (15:45): o conto das 3:33 (~12 frases, BR) e 7 contos de espelho/porta do mesmo
// cliente (ES) viraram clipe que acaba no susto, 0 downloads — prosa curta sem as palavras de fala passava sem aviso.
/** Com tantas frases, o texto é um conto (começo, meio e fim), não um plano de 5–12 s. */
export const CLIP_CONTO_FRASES = 5
/** Frases do texto: termina em . ! ? … (reticências contam uma vez); linha não vazia sem pontuação também conta. */
export function frasesDoTexto(texto: string): number {
  return String(texto ?? '').split(/\n+/).map((l) => l.trim()).filter(Boolean)
    .reduce((n, linha) => n + Math.max(1, (linha.match(/[.!?…]+(?=\s|$)/g) ?? []).length), 0)
}
/** Fala de personagem no formato de roteiro: `Nome: "…"` numa linha. */
const FALA_DE_PERSONAGEM_RE = /(?:^|\n)\s*\p{Lu}[\p{L}'’ -]{0,30}:\s*["“«]/u

/** O link do Studio com o texto do cliente preenchido (o Studio lê ?prompt=). */
export function hrefDoFilmeComTexto(texto: string): string {
  return `/studio?${new URLSearchParams({ prompt: String(texto ?? '').trim().slice(0, 4000), intent_campaign: 'clips_long_script' }).toString()}`
}

const ESTILOS: ReadonlyArray<{ re: RegExp; frase: string }> = [
  { re: /\banime\b/i, frase: 'anime style animation, not live action' },
  { re: /\b(?:animad[oa]s?|anima[çc][aã]o|desenho animado|desenho|cartoon|animated|animation|pixar|3d animado|animado em 3d|dibujo animado|dessin anim[ée])\b/i, frase: '3D animated cartoon style, not live action' },
  { re: /\b(?:ilustra[çc][aã]o|illustration|illustrated|aquarela|watercolou?r)\b/i, frase: 'illustrated storybook style, not live action' },
]

/** O estilo visual que o texto pede ("animado", "anime", "ilustração"); null = o texto não pede estilo. */
export function estiloPedidoNoTexto(texto: string): string | null {
  const t = String(texto ?? '')
  return ESTILOS.find((e) => e.re.test(t))?.frase ?? null
}

/** O prompt que vai ao servidor: o texto do cliente + o estilo pedido em inglês, dentro do limite de 1000 da tela. */
export function promptDoClipeComEstilo(texto: string, max = 1000): string {
  const t = String(texto ?? '').trim()
  const estilo = estiloPedidoNoTexto(t)
  if (!estilo || t.toLowerCase().includes(estilo.split(',')[0].toLowerCase())) return t
  const sufixo = ` Visual style: ${estilo}.`
  return `${Array.from(t).slice(0, Math.max(0, max - sufixo.length - 1)).join('').replace(/[\s.]+$/, '')}.${sufixo}`
}
