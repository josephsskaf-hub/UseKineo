// ═══ KINEO-PROXIMO-EPISODIO-0111 — a ideia do episódio seguinte, com a FICHA do personagem (vai do fundador 01/11 "vai tudo") ═══
//
// O DEFEITO QUE SOBROU DEPOIS DO CONSERTO DE 13/10 (KINEO-EPISODIO2-NO-ASSUNTO, lib/episodeContinuity.ts): o assunto
// passou a ficar, mas o PERSONAGEM não. Medido em `events.next_episode_written` de 13/10 a 01/11: o robô que conserta
// brinquedos virou coadjuvante de uma "little girl, named Mia" (nome inventado, 2 vezes); o urso de pelúcia ganhou o nome
// "Tofu"; a história de Kali e Kameron virou aula ("Did you know that boats can float…"). E o botão de continuar levava só
// o TÍTULO do filme para o Studio: nome, espécie e aparência ("Roland Pernicus Oznard, a gruff old man with shoulder-length
// gray-brown hair") ficavam para trás, e o episódio 2 nascia com outra cara.
//
// O QUE ESTE MÓDULO FAZ (puro, sem rede; a rota app/api/next-episode/studio chama):
//   · `modoDaFicha` — de onde veio a ficha. KINEO-PROXIMO-EPISODIO-0111-SEMANTICA: a ficha NÃO é mais deduzida aqui por
//     lista de palavras nem pelo elenco determinístico do roteiro (a reserva pelo elenco inventava "Pakistan", "York",
//     "Bitcoin, the king"…). Ela chega pronta: o rótulo do autor ("Main character: …", lib/episodeContinuity) ou a leitura
//     semântica do roteiro (lib/fichaDoEpisodio.ts, chamada pela rota). Sem ficha = filme factual ou leitura que falhou:
//     a ideia fica sem "Main character" e com "Stay on the same subject".
//   · `episodioFicaNoAssunto` — o episódio escrito cita o personagem no centro (ou, sem personagem, divide palavras de
//     assunto com o filme de origem) e a leitura do episódio não diz que ele segue OUTRO ser? Se não, o gancho escrito NÃO
//     entra na ideia: o Studio recebe só a ficha + "a história até aqui".
//   · `ideiaDoProximoEpisodio` — o texto que entra na caixa do Studio (modo "Let AI structure"): episódio N, ficha, história
//     até aqui, o gancho novo, e a ordem de não repetir. Sem preço, sem crédito, sem promessa de recurso.
import { assuntoDoFilme, fichaRotulada, mesmoSer, type FichaAplicada } from '@/lib/episodeContinuity'
import { IDEIA_MAX_CHARS } from '@/lib/proximoEpisodioLink'

/** No máximo 2 personagens (o mesmo teto da folha). */
export const MAX_FICHAS = 2
/** Teto de cada ficha na ideia. */
export const FICHA_MAX_CHARS = 240
/** Teto do pedaço do episódio escrito (título + gancho + 1ª revelação) que entra na ideia. */
export const EPISODIO_NA_IDEIA_MAX_CHARS = 520
/** Teto do nome da série na ideia (cortado em fronteira de palavra). */
export const NOME_DA_SERIE_MAX_CHARS = 90

const limpa = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim()
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 'autor' = rótulo escrito; 'modelo' = leitura semântica com personagem; 'historia_sem_ficha' = a leitura diz história mas
 *  ninguém com nome age; 'nenhum' = factual, ou a leitura falhou (falha segura). */
export type ModoDaFicha = 'autor' | 'modelo' | 'historia_sem_ficha' | 'nenhum'

/** A ficha que vale: o rótulo do autor sempre vence (mesmo que a rota não tenha passado nada); senão a da rota. */
export function fichaQueVale(ficha: FichaAplicada | null | undefined, ...fontes: Array<string | null | undefined>): FichaAplicada | null {
  return fichaRotulada(...fontes) ?? ficha ?? null
}
export function modoDaFicha(ficha: FichaAplicada | null | undefined): ModoDaFicha {
  if (!ficha) return 'nenhum'
  if (ficha.formato === 'story' && ficha.fichas.length) return ficha.origem
  return ficha.formato === 'story' ? 'historia_sem_ficha' : 'nenhum'
}

/** O nome que identifica a ficha na fala: "Roland Pernicus Oznard", "BRO", ou o núcleo do papel ("robot"). */
export function nomeDaFicha(ficha: string): string {
  const antesDaVirgula = limpa(ficha).split(',')[0]
  if (/^the\s/i.test(antesDaVirgula)) return antesDaVirgula.split(' ').pop() ?? antesDaVirgula
  return antesDaVirgula
}

const PALAVRAS_VAZIAS = new Set(('this|that|these|those|with|from|into|about|after|before|their|there|where|which|while|would|could|should|every|never|always|something|nothing|everyone|people|story|video|episode|first|again|still|really|today|years|later|world|other|being|have|were|what|when|then|than|they|them|your|just|more|most|some|only|also|over|under|very|much|many|like|make|made|takes|said|says|isso|esta|este|para|como|mais|quando|depois|antes|sobre|ainda|tudo|nada|todos|pela|pelo|uma|com|historia|história|video|vídeo|episodio|episódio|esto|esta|para|como|pero|cuando|después|antes|sobre|todo|nada|todos').split('|'))
function palavrasDeAssunto(texto: string): Set<string> {
  const out = new Set<string>()
  for (const w of limpa(texto).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []) if (!PALAVRAS_VAZIAS.has(w)) out.add(w)
  return out
}

// ── KINEO-PROXIMO-EPISODIO-0111 (revisão) — o protagonista no CENTRO do episódio, com fronteira de palavra ──
// Antes: `includes(nome)` sem fronteira ("Use" passava com "because", "Son" com "season", "Moon" com "Moonlight") e bastava o
// nome APARECER — o episódio que rebaixa o protagonista a coadjuvante e põe outro no centro passava.
const MARCADOR_DE_SECAO = /^(?:HOOK|MICRO REWARD|ESCALATION|PAYOFF|RHYTHM)\s*:?\s*$/i
// KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — além da lista, qualquer abertura curta antes de vírgula ("This time, Roland…",
// "Naquela noite, Roland…", "Al amanecer, Roland…"): episódio fiel era recusado e o gancho do cartão sumia do Studio.
const CONECTIVO = String.raw`(?:(?:[\p{L}'’-]+\s+){0,3}[\p{L}'’-]+,\s+)?(?:(?:and|but|then|so|now|suddenly|today|tonight|meanwhile|later|finally|soon|still|this time|that night|that morning|one day|e|mas|então|entao|naquela noite|y|pero|entonces)\s*,?\s+)?`
const HONORIFICOS = /^(?:dr|dra|mr|mrs|ms|mx|prof|profa|capt|gen|lt|sgt|col|st|sr|sra|srta)\.?$/i

function frasesDoEpisodio(script: string): string[] {
  return String(script ?? '').replace(/\r\n/g, '\n').split('\n')
    .filter((l) => !MARCADOR_DE_SECAO.test(l.trim()))
    .join('\n')
    .split(/(?<=[.!?…؟。])\s+|\n+/)
    .map((f) => f.trim())
    .filter(Boolean)
}
/** As formas do nome que contam: o nome inteiro, o 1º nome ("Roland") e, com título, o sobrenome ("Vega" de "Dr. Vega"). */
function formasDoNome(nome: string): string[] {
  const n = limpa(nome)
  if (!n) return []
  const palavras = n.split(' ')
  const out = [n]
  if (palavras.length > 1) {
    if (HONORIFICOS.test(palavras[0])) out.push(palavras[palavras.length - 1])
    else if (palavras[0].length >= 3) out.push(palavras[0])
  }
  return out
}
/** Nome próprio: a ocorrência tem de começar com maiúscula ("Use" não casa com "use"); papel ("robot") casa em qualquer caixa. */
function citaNome(texto: string, forma: string, papel: boolean): boolean {
  const re = new RegExp(String.raw`(?<![\p{L}\p{N}])${escapaRe(forma)}(?![\p{L}\p{N}])`, 'giu')
  for (const m of texto.matchAll(re)) if (papel || /^\p{Lu}/u.test(m[0])) return true
  return false
}
/** Em quantas frases o nome é o SUJEITO (abre a frase, depois de um conectivo; papel aceita "The tiny robot …"). */
function vezesComoSujeito(frases: readonly string[], forma: string, papel: boolean): number {
  const prefixoPapel = papel ? String.raw`(?:(?:the|a|an|our|this|that|o|um|uma|el|la|un|una)\s+)?(?:[\p{Ll}'’-]+\s+){0,3}?` : ''
  const re = new RegExp(String.raw`^${CONECTIVO}${prefixoPapel}(${escapaRe(forma)})(?:['’]s)?(?![\p{L}\p{N}])`, 'iu')
  let n = 0
  for (const f of frases) {
    const m = re.exec(f)
    if (m && (papel || /^\p{Lu}/u.test(m[1]))) n += 1
  }
  return n
}

/**
 * O episódio escrito ficou no assunto do filme de origem?
 *  · com personagem: o protagonista está no CENTRO — é sujeito de alguma frase, ou está no título ou na 1ª frase — e,
 *    quando a leitura semântica do EPISÓDIO veio (lib/fichaDoEpisodio protagonistaDoEpisodio), o ser que o episódio segue
 *    é o nosso. KINEO-PROXIMO-EPISODIO-0111-SEMANTICA: antes o rival saía do regex de aposto ("Mia, a girl") e o personagem
 *    novo sem ficha passava ("While Roland slept, Mia opened the mailbox. Mia read the letter." = aceito). Leitura que não
 *    veio (undefined) = só a checagem determinística, como antes;
 *  · sem personagem (factual): divide pelo menos 2 palavras de assunto com a âncora (1 quando a âncora só tem 1-2).
 * Sem âncora e sem ficha não há com o que comparar: true (nada a vigiar).
 */
export function episodioFicaNoAssunto(
  episodio: { title?: string | null; script?: string | null },
  ref: { fichas: readonly string[]; assunto: string; protagonistaDoEpisodio?: string | null },
): boolean {
  const texto = `${episodio.title ?? ''}\n${episodio.script ?? ''}`
  if (!limpa(texto)) return false
  if (ref.fichas.length) {
    const titulo = limpa(episodio.title ?? '')
    const frases = frasesDoEpisodio(episodio.script ?? '')
    const primeira = frases[0] ?? ''
    let noCentro = false
    const nomes: string[] = []
    for (const f of ref.fichas) {
      const nome = nomeDaFicha(f)
      if (!nome) continue
      nomes.push(nome)
      const papel = !/^\p{Lu}/u.test(nome)
      for (const forma of formasDoNome(nome)) {
        if (vezesComoSujeito(frases, forma, papel) > 0 || citaNome(titulo, forma, papel) || citaNome(primeira, forma, papel)) noCentro = true
      }
    }
    if (!noCentro) return false
    // KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — quem o episódio SEGUE, pela leitura (string). Outro ser no centro = fora.
    const lido = ref.protagonistaDoEpisodio
    if (typeof lido === 'string' && limpa(lido) && !nomes.some((n) => mesmoSer(n, lido) || n.toLowerCase().split(' ').includes(limpa(lido).toLowerCase()))) return false
    return true
  }
  const ancora = palavrasDeAssunto(ref.assunto)
  if (ancora.size === 0) return true
  const doEpisodio = palavrasDeAssunto(texto)
  let comum = 0
  for (const w of ancora) if (doEpisodio.has(w)) comum += 1
  return comum >= Math.min(2, ancora.size)
}

const MARCADOR_LINHA = /^(HOOK|MICRO REWARD|ESCALATION|PAYOFF)\s*$/i

/** HOOK + MICRO REWARD do episódio escrito (o gancho novo e a 1ª revelação), sem rótulos. */
export function ganchoDoEpisodio(script: string | null | undefined): string {
  const linhas = String(script ?? '').replace(/\r\n/g, '\n').split('\n')
  const secoes: Record<string, string[]> = {}
  let atual = ''
  for (const l of linhas) {
    const m = MARCADOR_LINHA.exec(l.trim())
    if (m) { atual = m[1].toUpperCase(); secoes[atual] = []; continue }
    if (atual && l.trim()) secoes[atual].push(l.trim())
  }
  const hook = limpa((secoes.HOOK ?? []).join(' '))
  const micro = limpa((secoes['MICRO REWARD'] ?? []).join(' '))
  if (!hook && !micro) return limpa(linhas.filter((l) => !MARCADOR_LINHA.test(l.trim())).join(' ')).split(/(?<=[.!?؟。])\s+/).slice(0, 2).join(' ')
  const primeiraRevelacao = micro.split(/(?<=[.!?؟。])\s+/).slice(0, 2).join(' ')
  return limpa(`${hook} ${primeiraRevelacao}`)
}

/** Corta em fronteira de palavra (o nome da série no filme 4b3b7668 saía "…a family repo"). */
export function cortarNaPalavra(texto: string, max: number): string {
  const t = limpa(texto)
  if (t.length <= max) return t
  const janela = t.slice(0, max + 1)
  const fim = janela.lastIndexOf(' ')
  return (fim > 0 ? janela.slice(0, fim) : t.slice(0, max)).replace(/[\s,;:–—-]+$/u, '')
}

function cortar(texto: string, max: number): string {
  const t = limpa(texto)
  if (t.length <= max) return t
  const janela = t.slice(0, max)
  const fim = Math.max(janela.lastIndexOf('. '), janela.lastIndexOf('! '), janela.lastIndexOf('? '))
  if (fim > max * 0.5) return janela.slice(0, fim + 1)
  return `${janela.slice(0, Math.max(0, janela.lastIndexOf(' ')))}…`
}

export interface EntradaDaIdeia {
  /** Título do filme de origem (videos.title). */
  titulo?: string | null
  /** O pedido do autor (videos.topic) — onde a ficha costuma estar escrita. */
  pedido?: string | null
  /** A narração que o filme falou (videos.script). */
  narracao?: string | null
  /** O episódio que /api/next-episode escreveu (null quando falhou ou esperou o cooldown). */
  episodio?: { title?: string | null; script?: string | null } | null
  /** Número do episódio novo (≥ 2). Sem ele, sai do próprio pedido ("Episode 2 of my series …" → 3) ou é 2. */
  episodeNumber?: number | null
  /** KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — a ficha que a rota leu (lib/fichaDoEpisodio lerFichaDoFilme). null/ausente =
   *  leitura falhou ou não houve: sem ficha (o rótulo "Main character:" do autor continua valendo). */
  ficha?: FichaAplicada | null
  /** Quem o episódio escrito segue, pela leitura (string); null = ninguém nomeado; undefined = não lido. */
  protagonistaDoEpisodio?: string | null
}

// O filme que JÁ nasceu deste botão carrega a moldura no pedido/título: 'Episode 2 of my series "The Mailbox".'
const MOLDURA_DA_SERIE = /^\s*Episode\s+(\d{1,3})\s+of my series(?:\s+"([^"\n]{1,120})")?\.?/i

/** O número do episódio seguinte pelo pedido do filme de origem (2 quando o filme não veio deste botão). */
export function numeroDoProximo(pedido: string | null | undefined): number {
  const m = MOLDURA_DA_SERIE.exec(String(pedido ?? ''))
  const n = m ? Number(m[1]) : 1
  return Number.isFinite(n) && n >= 1 ? Math.min(n + 1, 999) : 2
}

/** O nome da série: o que está entre aspas na moldura, ou o título do filme (sem a moldura). */
export function nomeDaSerie(titulo: string | null | undefined, pedido: string | null | undefined): string {
  for (const fonte of [pedido, titulo]) {
    const m = MOLDURA_DA_SERIE.exec(String(fonte ?? ''))
    if (m?.[2]) return limpa(m[2])
  }
  // KINEO-PROXIMO-EPISODIO-0111 (revisão) — videos.title cru: "HOOK:  Meet Tommy—…", "Create a 2D animated horror … inspired",
  // título com ponto final dentro. Tira o rótulo, corta na 1ª frase, e título que é ORDEM de produção não vira nome de série.
  const t = limpa(titulo ?? '').replace(/^(?:HOOK|TITLE|T[ÍI]TULO|MICRO REWARD|ESCALATION|PAYOFF)\s*[:\-–—]\s*/i, '')
  if (!t || MOLDURA_DA_SERIE.test(t)) return ''
  if (/^(?:create|make|generate|write|produce|render|crie|cria|gere|gera|fa[cç]a|escreva|crea|genera|haz|escribe)\b/i.test(t)) return ''
  return t.split(/(?<=[.!?])\s+/)[0].replace(/[.\s]+$/, '')
}

export interface IdeiaDoEpisodio {
  ideia: string
  fichas: string[]
  assunto: string
  /** O episódio escrito entrou na ideia (estava no assunto)? */
  usouEpisodio: boolean
  /** Havia episódio escrito e ele saiu do assunto (descartado — o Studio recebe só ficha + história). */
  episodioFora: boolean
  /** O número do episódio novo na série. */
  numero: number
  /** De onde veio a ficha (auditoria e linha de fecho). */
  modo: ModoDaFicha
}

/** A ideia que entra na caixa do Studio. Inglês na moldura; a história segue na língua do filme (o link leva ?language=). */
export function ideiaDoProximoEpisodio(e: EntradaDaIdeia): IdeiaDoEpisodio {
  const ficha = fichaQueVale(e.ficha, e.pedido, e.narracao, e.titulo)
  const modo = modoDaFicha(ficha)
  const fichas = ficha && ficha.formato === 'story' ? ficha.fichas.slice(0, MAX_FICHAS).map((f) => f.slice(0, FICHA_MAX_CHARS)) : []
  const assunto = assuntoDoFilme(e.narracao, e.pedido, e.titulo)
  // O número é o da SÉRIE (moldura do pedido), não o total de filmes da conta (o do escritor conta tudo o que a pessoa já fez).
  const n = typeof e.episodeNumber === 'number' && Number.isFinite(e.episodeNumber) && e.episodeNumber >= 2 ? Math.round(e.episodeNumber) : numeroDoProximo(e.pedido)
  const titulo = cortarNaPalavra(nomeDaSerie(e.titulo, e.pedido).replace(/["“”]/g, ''), NOME_DA_SERIE_MAX_CHARS) // KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — fronteira de palavra
  const temEpisodio = Boolean(e.episodio && limpa(`${e.episodio.title ?? ''} ${e.episodio.script ?? ''}`))
  const noAssunto = temEpisodio ? episodioFicaNoAssunto(e.episodio!, { fichas, assunto, protagonistaDoEpisodio: e.protagonistaDoEpisodio }) : false
  const linhas: string[] = []
  linhas.push(`Episode ${n} of my series${titulo ? ` "${titulo}"` : ''}.`)
  // "Main character: …" é o mesmo rótulo que lib/cinematic/sceneStyle deriveExplicitCharacter reconhece como ficha do autor.
  if (fichas[0]) linhas.push(`Main character: ${fichas[0].replace(/[.\s]+$/, '')}.`)
  if (fichas[1]) linhas.push(`Also in the story: ${fichas[1].replace(/[.\s]+$/, '')}.`)
  if (assunto) linhas.push(`Story so far: ${assunto.replace(/\s+$/, '')}`)
  if (temEpisodio && noAssunto) {
    const tituloEp = limpa(e.episodio!.title ?? '').replace(/^episode\s+\d+\s*[:\-–—]?\s*/i, '')
    const gancho = ganchoDoEpisodio(e.episodio!.script)
    const corpo = cortar(`${tituloEp ? `${tituloEp}. ` : ''}${gancho}`, EPISODIO_NA_IDEIA_MAX_CHARS)
    if (corpo) linhas.push(`This episode: ${corpo}`)
  }
  // KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — "mesmos personagens" só com ficha (do autor ou da leitura: nome + ser que age).
  // História sem ninguém nomeado fica no meio-termo; filme factual (ou leitura que falhou) mantém "Stay on the same subject".
  linhas.push((modo === 'autor' || modo === 'modelo') && fichas.length
    ? 'Keep the same characters (same names, same species, same look) in the same world and tone. A new hook, new events and a fresh payoff; do not repeat what already happened.'
    : modo === 'historia_sem_ficha'
      ? 'Stay on the same subject: if it is a story, keep the same characters in the same world; if it is factual, take the next angle. A new hook and a fresh payoff; do not repeat what episode 1 already said.'
      : 'Stay on the same subject and take the next angle of it. A new hook, new facts and a fresh payoff; do not repeat what episode 1 already said.')
  let ideia = linhas.join('\n')
  if (ideia.length > IDEIA_MAX_CHARS) ideia = ideia.slice(0, IDEIA_MAX_CHARS)
  return { ideia, fichas, assunto, usouEpisodio: temEpisodio && noAssunto, episodioFora: temEpisodio && !noAssunto, numero: n, modo }
}

// ── a língua do filme quando a tela não sabe (a biblioteca não guarda a língua) ──────────────────────────────
// O detector da casa (lib/textLanguage detectNarrationLanguage) cobre en/pt/es/fr/de/it por vocabulário; aqui a escrita
// cobre as línguas de alfabeto próprio que aparecem na base (árabe, grego, hindi, russo, japonês, coreano, chinês…).
const POR_ESCRITA: ReadonlyArray<readonly [RegExp, string]> = [
  [/[؀-ۿ]/, 'ar'],
  [/[֐-׿]/, 'he'],
  [/[Ͱ-Ͽ]/, 'el'],
  [/[ऀ-ॿ]/, 'hi'],
  [/[ঀ-৿]/, 'bn'],
  [/[฀-๿]/, 'th'],
  [/[가-힯]/, 'ko'],
  [/[぀-ヿ]/, 'ja'],
  [/[一-鿿]/, 'zh'],
  [/[Ѐ-ӿ]/, 'ru'],
]
/** Língua pela escrita do texto (só alfabetos próprios). null = latino/indefinido (quem chama usa o detector da casa). */
export function linguaPelaEscrita(texto: string | null | undefined): string | null {
  const t = String(texto ?? '')
  // japonês mistura kanji com kana: kana presente decide, senão o kanji contaria como chinês
  if ((t.match(/[぀-ヿ]/g) ?? []).length >= 5) return 'ja'
  // maioria simples: conta letras de cada escrita e exige pelo menos 20 para não decidir por uma palavra solta
  let melhor: string | null = null
  let maior = 0
  for (const [re, code] of POR_ESCRITA) {
    const n = (t.match(new RegExp(re.source, 'g')) ?? []).length
    if (n > maior) { maior = n; melhor = code }
  }
  return maior >= 20 ? melhor : null
}
