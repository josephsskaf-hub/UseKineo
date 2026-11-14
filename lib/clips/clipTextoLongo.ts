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
  if (pareceRoteiroEmQualquerLingua(t)) return true // KINEO-CLIPE-ROTEIRO-QUALQUER-LINGUA-1411
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
    .reduce((n, linha) => n + Math.max(1, (linha.match(FIM_DE_FRASE_RE) ?? []).length), 0)
}
// KINEO-CLIPE-ROTEIRO-QUALQUER-LINGUA-1411 — também o ponto árabe (؟), o danda (।) e o ponto chinês/japonês (。！？, que vem
// grudado na frase seguinte, sem espaço).
const FIM_DE_FRASE_RE = /[.!?…؟।]+(?=\s|$)|[。！？]+/g

// ═══ KINEO-CLIPE-ROTEIRO-QUALQUER-LINGUA-1411 [revisor 14/11 12:21] ═══
// 1º vídeo de um cliente dos EUA, nota 5, não baixou: um roteiro de desenho 3D de 30 s em ÁRABE (três falas entre «», contagem,
// narração) virou um clipe de 5 s. As regras de cima só conheciam as 5 línguas do site (en/de/es/pt/fr) e a contagem de palavras
// por espaço (japonês, chinês e tailandês não têm espaço). Aqui, sinais que não dependem da língua, decididos por código:
//   · duração maior que a do clipe, em qualquer algarismo (٠-٩ ۰-۹ ०-९ ０-９) e com a palavra de segundo/minuto de 15 línguas;
//   · duas ou mais FALAS entre aspas de qualquer tipo (« » “ ” „ “ " " 「 」 『 』), com 3+ palavras (ou 5+ ideogramas) cada;
//   · pedido de narração/locução nas línguas que dá para cobrir sem falso positivo;
//   · texto longo em escrita sem espaço (mais de 120 ideogramas/letras tailandesas).
// "16:9", "9:16" e "1080x1920" não são duração: o número precisa da palavra de tempo logo depois.
/** Algarismos de outras escritas viram 0-9 (só para medir duração). */
function algarismosLatinos(t: string): string {
  return t.replace(/[٠-٩۰-۹०-९０-９]/g, (c) => {
    const n = c.charCodeAt(0)
    for (const base of [0x0660, 0x06f0, 0x0966, 0xff10]) if (n >= base && n <= base + 9) return String(n - base)
    return c
  })
}
// Segundos (13 a 199) e minutos (1 a 30): o clipe faz até 12 s. Unidades com fronteira à direita (palavra inteira; turco aceita
// sufixo: "30 saniyelik") e unidades de escritas sem espaço (CJK, coreano, tailandês), sem fronteira.
const UNIDADE_SEGUNDO = '(?:s|secs?|seconds?|secondes?|secondi|segundos?|sekunden?|sek|секунд[аы]?|сек|ثاني[ةه]|ثانیه|ثوان[يى]?|saniye\\p{L}*|detik|giây|सेकंड|सेकेंड|सेकण्ड)'
const UNIDADE_MINUTO = '(?:min(?:s|utes?|utos?|uten|uti)?|минут[аы]?|мин|دقيق[ةه]|دقائق|dakika\\p{L}*|menit|phút|मिनट)'
const UNIDADE_SEM_ESPACO_SEG = '(?:秒|초|วินาที)'
const UNIDADE_SEM_ESPACO_MIN = '(?:分钟|分間|分(?!の)|분|นาที)'
const ANTES_DO_NUMERO = '(?<![\\d:.,x×/])'
const SEGUNDOS = '(?:1[3-9]|[2-9]\\d|1\\d\\d)(?!\\d)'
const MINUTOS = '(?:[1-9]|[12]\\d|30)(?!\\d)'
const DURACAO_QUALQUER_LINGUA_RE = new RegExp(
  `${ANTES_DO_NUMERO}(?:${SEGUNDOS}[\\s-]*(?:${UNIDADE_SEGUNDO}[\\p{M}]*(?![\\p{L}\\p{M}])|${UNIDADE_SEM_ESPACO_SEG})` +
  `|${MINUTOS}[\\s-]*(?:${UNIDADE_MINUTO}[\\p{M}]*(?![\\p{L}\\p{M}])|${UNIDADE_SEM_ESPACO_MIN}))`, 'iu')
/** Pede mais tempo do que o clipe tem, em qualquer língua e algarismo. */
export function pedeDuracaoDeFilme(texto: string): boolean {
  return DURACAO_QUALQUER_LINGUA_RE.test(algarismosLatinos(String(texto ?? '')))
}

// Falas entre aspas: cada par de abre/fecha; o miolo precisa ter cara de fala (3+ palavras ou 5+ ideogramas) — o letreiro
// "OPEN" ou o nome "Happy Birthday" não contam.
const FALA_ENTRE_ASPAS_RE = /«([^«»\n]+)»|“([^“”\n]+)”|„([^„“”\n]+)[“”]|"([^"\n]+)"|「([^「」\n]+)」|『([^『』\n]+)』|‹([^‹›\n]+)›|”([^”\n]+)”/gu
const IDEOGRAMA_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/gu
/** Quantas falas (trechos entre aspas com cara de frase) o texto traz. */
export function falasEntreAspas(texto: string): number {
  let n = 0
  for (const m of String(texto ?? '').matchAll(FALA_ENTRE_ASPAS_RE)) {
    const miolo = (m.slice(1).find((g) => g !== undefined) ?? '').trim()
    if (miolo.split(/\s+/).filter(Boolean).length >= 3 || (miolo.match(IDEOGRAMA_RE) ?? []).length >= 5) n++
  }
  return n
}
export const CLIP_FALAS_ENTRE_ASPAS = 2

// Narração/locução fora das 5 línguas (as 5 já estão em PEDE_FALA_RE). Só palavras que não aparecem num pedido de imagem.
const PEDE_NARRACAO_RE = /(?:تعليق[\s\p{M}]*صوت|التعليق الصوتي|الراوي|راوٍ|سرد صوتي|озвучк|закадров|рассказчик|диктор|ナレーション|語り手|旁白|画外音|配音|解说|解說|내레이션|나레이션|seslendirme|anlatıcı|dış ses|वॉइसओवर|वॉयसओवर|वॉयस ओवर|कथावाचक|नैरेशन|सूत्रधार|sulih suara|narasi|lồng tiếng|thuyết minh|người dẫn chuyện|การบรรยาย|ผู้บรรยาย|erzähler|erzählstimme|narratore|voce fuori campo|narrateur|voix off)/iu

/** Texto longo em escrita sem espaço (a contagem de palavras por espaço não mede japonês, chinês nem tailandês). */
export const CLIP_ROTEIRO_IDEOGRAMAS = 120

/** Sinais de roteiro de filme que não dependem da língua (KINEO-CLIPE-ROTEIRO-QUALQUER-LINGUA-1411). */
export function pareceRoteiroEmQualquerLingua(texto: string): boolean {
  const t = String(texto ?? '')
  if (pedeDuracaoDeFilme(t)) return true
  if (falasEntreAspas(t) >= CLIP_FALAS_ENTRE_ASPAS) return true
  if (PEDE_NARRACAO_RE.test(t)) return true
  return (t.match(IDEOGRAMA_RE) ?? []).length > CLIP_ROTEIRO_IDEOGRAMAS
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

// KINEO-CLIPE-OU-FILME-3010 [vai do fundador 30/10 "A, B, C e D … estão todos autorizados"] — o aviso de roteiro longo
// existia desde 29/10, mas o botão principal seguia "Gerar": na rodada de 30/10 (15:45) 4 de 6 vídeos eram CONTOS colados no
// Clipe (o colombiano fez 7), 0 downloads. Agora, com texto de filme, o botão principal é o Filme narrado e o clipe vira a
// opção pequena. E o aviso passa a ser MEDIDO (antes não gravava nada): visto, clicou no filme, fez o clipe mesmo assim.
export const CLIPE_ROTEIRO_EVENTOS = {
  shown: 'clip_long_script_shown',
  film: 'clip_long_script_film_clicked',
  clipAnyway: 'clip_long_script_clip_anyway',
} as const

// KINEO-CLIPE-LOGO-3010 [vai do fundador 30/10] — revisor 30/10: anúncio da Trans Web Internet ("young guy wearing your
// company shirt") saiu com camisa sem marca e nada de internet: sem foto/logo o motor não tem como pôr a marca. A tela pede o
// logo quando o texto cita marca/empresa e não há foto. Nota, nunca bloqueio.
const CITA_MARCA_RE = /\b(?:company|brand|logo|business|store|shop|our (?:product|service)|empresa|marca|logotipo|loja|neg[oó]cio|nosso produto|tienda|negocio|compa[ñn][ií]a|nuestra (?:marca|tienda)|unternehmen|firma|entreprise|marque|azienda|negozio|şirket|marka)\b/i
/** O texto cita marca/empresa (o motor precisa do logo ou da foto do produto para mostrá-la). */
export function citaMarcaNoClipe(texto: string): boolean {
  return CITA_MARCA_RE.test(String(texto ?? ''))
}
export const CLIPE_LOGO_EVENTOS = { shown: 'clip_logo_hint_shown', clicked: 'clip_logo_hint_clicked' } as const
