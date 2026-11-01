// ═══ KINEO-PROXIMO-EPISODIO-0111 — a ideia do episódio seguinte, com a FICHA do personagem (vai do fundador 01/11 "vai tudo") ═══
//
// O DEFEITO QUE SOBROU DEPOIS DO CONSERTO DE 13/10 (KINEO-EPISODIO2-NO-ASSUNTO, lib/episodeContinuity.ts): o assunto
// passou a ficar, mas o PERSONAGEM não. Medido em `events.next_episode_written` de 13/10 a 01/11: o robô que conserta
// brinquedos virou coadjuvante de uma "little girl, named Mia" (nome inventado, 2 vezes); o urso de pelúcia ganhou o nome
// "Tofu"; a história de Kali e Kameron virou aula ("Did you know that boats can float…"). E o botão de continuar levava só
// o TÍTULO do filme para o Studio: nome, espécie e aparência ("Roland Pernicus Oznard, a gruff old man with shoulder-length
// gray-brown hair") ficavam para trás, e o episódio 2 nascia com outra cara.
//
// O QUE ESTE MÓDULO FAZ (sem rede; a rota app/api/next-episode/studio chama):
//   · `fichasDoFilme` — a ficha do(s) personagem(ns): primeiro a que o AUTOR escreveu, palavra por palavra
//     (lib/episodeContinuity.ts `fichasExplicitas`: "Nome, a/an descrição" · "a descrição named Nome"); sem ela, o elenco
//     do roteiro (lib/cinematic/folhaDePersonagem.ts `elencoDeterministico`) — só nome + espécie, NUNCA a aparência
//     sorteada (a folha sorteia cabelo/roupa/cor; colar isso como "mantenha a aparência" inventaria uma cara nova).
//   · `episodioFicaNoAssunto` — o episódio escrito cita o personagem (ou, sem personagem, divide palavras de assunto com o
//     filme de origem)? Se não, o gancho escrito NÃO entra na ideia: o Studio recebe só a ficha + "a história até aqui".
//   · `ideiaDoProximoEpisodio` — o texto que entra na caixa do Studio (modo "Let AI structure"): episódio N, ficha, história
//     até aqui, o gancho novo, e a ordem de não repetir. Sem preço, sem crédito, sem promessa de recurso.
import { assuntoDoFilme, especieFigurada, especieJuntoDoNome, fichasExplicitas, formatoDoFilme, naoEhNome, serComoCabeca } from '@/lib/episodeContinuity'
import { elencoDeterministico, type FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { IDEIA_MAX_CHARS } from '@/lib/proximoEpisodioLink'

/** No máximo 2 personagens (o mesmo teto da folha). */
export const MAX_FICHAS = 2
/** Teto de cada ficha na ideia. */
export const FICHA_MAX_CHARS = 240
/** Teto do pedaço do episódio escrito (título + gancho + 1ª revelação) que entra na ideia. */
export const EPISODIO_NA_IDEIA_MAX_CHARS = 520

const limpa = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim()
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ═══ KINEO-PROXIMO-EPISODIO-0111 (revisão adversarial) — a reserva pelo elenco NÃO inventa personagem ═══
// Medido nos 250 filmes reais de 30 dias: 127 caíam na reserva pelo elenco e ~30 viravam personagem inventado ("Pakistan",
// "Literacy", "Use", "Kineo", "Bible", "Moon") — e a ficha ainda ganhava gênero que ninguém escreveu ("Rome, a man",
// "Helping, a dinosaur"). Agora, sem ficha do AUTOR, um nome só vira ficha quando é um SER QUE AGE no texto (ri, fala,
// sussurra, corre… ou tem fala "Nome:"), e a espécie só entra se o próprio texto a colou no nome ("Dino the dinosaur").
// Nunca gênero, nunca aparência sorteada. Papel sem nome ("the tiny discarded robot") só em história; num filme 'livre' só
// os seres que não são documentário (robô, dragão, fada, brinquedo…). Filme factual = [] → "Stay on the same subject".

/** Verbo que só um ser vivo/personagem faz (sujeito logo depois do nome). De propósito SEM "says/runs/plays/holds/hopes":
 *  país e conceito também "dizem", "correm" e "jogam" em documentário ("Pakistan plays cricket", "Inflation runs wild").
 *  KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — FORMAS EXATAS, não radical + sufixo: "hop"+"es" virava "hopes" ("Pakistan
 *  hopes…") e "hid"+"es" virava "hides" ("The Moon hides a secret"). "hide" saiu de vez (a Lua "esconde"). */
const VERBO_DE_SER_QUE_AGE = new RegExp(String.raw`^(?:(?:then|slowly|quickly|suddenly|softly|quietly|happily|sadly|just|also|finally|still|never|always|gently|nervously|proudly|bravely|excitedly|loudly)\s+)?(?:laughs|laughed|laughing|smiles|smiled|smiling|cries|cried|crying|giggles|giggled|giggling|whispers|whispered|whispering|shouts|shouted|screams|screamed|yells|yelled|sighs|sighed|nods|nodded|waves|waved|hugs|hugged|hugging|kisses|kissed|sings|sang|singing|dances|danced|dancing|sleeps|slept|wakes|woke|frowns|frowned|grins|grinned|winks|winked|claps|clapped|barks|barked|meows|meowed|purrs|purred|growls|growled|chirps|chirped|squeaks|squeaked|tiptoes|tiptoed|sneaks|sneaked|snuck|peeks|peeked|sniffs|sniffed|whimpers|whimpered|sobs|sobbed|shivers|shivered|gasps|gasped|blinks|blinked|swoops|swooped|cuddles|cuddled|snuggles|snuggled|wiggles|wiggled|waddles|waddled|hops|hopped|hopping|scurries|scurried|munches|munched|yawns|yawned|shrugs|shrugged|stares|stared|staring|gazes|gazed|gazing)(?![\p{L}])`, 'u')
// Seres de ficção: num filme sem sinal de história, só estes viram "Main character" sem nome (documentário não tem).
// KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — sem dragon/monster/wizard/witch: são metáfora em documentário ("the sleeping
// dragon" = China; "the monster" = inflação; "the wizard of Wall Street").
const SER_DE_FICCAO = /^(?:robot|android|cyborg|unicorn|fairy|elf|troll|goblin|mermaid|genie|gnome|toy|doll|teddy|puppet)s?$/i

/** Quantas vezes o nome AGE como ser vivo; fala de roteiro ("Kali: …") conta como prova forte (99). */
function vezesQueAge(texto: string, nome: string): number {
  const esc = escapaRe(nome)
  if (new RegExp(String.raw`(?:^|\n)\s*${esc}\s*:`, 'u').test(texto)) return 99 // fala de roteiro: "Kali: …"
  const re = new RegExp(String.raw`(?<![\p{L}\p{N}])${esc}(?![\p{L}\p{N}'’])\s+`, 'gu')
  let n = 0
  for (const m of texto.matchAll(re)) {
    // KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — pedaço de nome composto ("New York laughs" → "York"): não é o nome.
    const antes = /(\p{Lu}[\p{L}'’-]*)\s+$/u.exec(texto.slice(Math.max(0, (m.index ?? 0) - 30), m.index ?? 0))?.[1]
    if (antes && !naoEhNome(antes)) continue
    if (VERBO_DE_SER_QUE_AGE.test(texto.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 40))) n += 1
  }
  return n
}

export type ModoDaFicha = 'autor' | 'ser_que_age' | 'papel' | 'nenhum'
export interface FichasDoFilme { fichas: string[]; modo: ModoDaFicha }

/** Ficha do elenco que o TEXTO sustenta; '' quando o nome não é um ser que age (país, conceito, palavra solta). */
function fichaDoElenco(f: FichaDePersonagem, texto: string, historia: boolean): { ficha: string; modo: ModoDaFicha } {
  // sem nome ("the tiny discarded robot"): o papel JÁ é a ficha fiel do roteiro — mas só em história (ou ser de ficção)
  if (f.nome.toLowerCase().startsWith('the ')) {
    const nucleo = f.nome.split(' ').pop() ?? ''
    // KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — fora de história, o ser tem de ser a CABEÇA no texto ("Tesla, the robot maker" não)
    return historia || (SER_DE_FICCAO.test(nucleo) && serComoCabeca(texto, nucleo)) ? { ficha: f.nome, modo: 'papel' } : { ficha: '', modo: 'nenhum' }
  }
  const nome = limpa(f.nome)
  if (!nome || naoEhNome(nome.split(' ')[0]) || !/^\p{Lu}/u.test(nome)) return { ficha: '', modo: 'nenhum' }
  // KINEO-PROXIMO-EPISODIO-0111 (revisão 2) — nome próprio de SER QUE AGE, com espécie só a que o texto escreveu:
  //   · espécie colada no nome ("Dino the dinosaur", "Bolt the robot"); espécie de metáfora ("Bitcoin, the king", "China,
  //     the dragon") só se o nome age ou o filme é história;
  //   · sem espécie: o nome age com prova forte — história, fala de roteiro ("Kali:") ou 2+ ações de ser vivo. Uma ação solta
  //     ("New York laughs at your salary", "The Moon hides…") não basta.
  const age = vezesQueAge(texto, nome)
  const especie = especieJuntoDoNome(texto, nome)
  if (especie && (age > 0 || historia || !especieFigurada(especie))) return { ficha: `${nome}, ${especie}`, modo: 'ser_que_age' }
  return age > 0 && (historia || age >= 2) ? { ficha: nome, modo: 'ser_que_age' } : { ficha: '', modo: 'nenhum' }
}

/**
 * As fichas do filme de origem + de onde vieram. Primeiro as escritas pelo autor (verbatim); sem nenhuma, o elenco do
 * roteiro SÓ quando o texto sustenta (ser que age / papel de história). { fichas: [], modo: 'nenhum' } = filme factual.
 */
export function fichasDoFilmeComModo(...fontes: Array<string | null | undefined>): FichasDoFilme {
  const validas = fontes.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
  const explicitas = fichasExplicitas(...validas)
  if (explicitas.length) return { fichas: explicitas.slice(0, MAX_FICHAS).map((f) => f.slice(0, FICHA_MAX_CHARS)), modo: 'autor' }
  const texto = validas.join('\n')
  if (!texto) return { fichas: [], modo: 'nenhum' }
  const historia = formatoDoFilme(...validas) === 'historia'
  let elenco: FichaDePersonagem[] = []
  try { elenco = elencoDeterministico(texto) } catch { elenco = [] }
  const out: string[] = []
  let modo: ModoDaFicha = 'nenhum'
  for (const f of elenco) {
    const r = fichaDoElenco(f, texto, historia)
    const ficha = r.ficha.slice(0, FICHA_MAX_CHARS)
    if (!ficha || out.some((o) => o.toLowerCase() === ficha.toLowerCase())) continue
    out.push(ficha)
    if (r.modo === 'ser_que_age' || modo === 'nenhum') modo = r.modo
    if (out.length >= MAX_FICHAS) break
  }
  return { fichas: out, modo }
}

/** As fichas do filme de origem (atalho de `fichasDoFilmeComModo`). [] = filme sem personagem (factual). */
export function fichasDoFilme(...fontes: Array<string | null | undefined>): string[] {
  return fichasDoFilmeComModo(...fontes).fichas
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
 *  · com personagem: o protagonista está no CENTRO — é sujeito de alguma frase, ou está no título ou na 1ª frase — e
 *    nenhum personagem NOVO (apresentado no episódio com ficha própria: "The little girl, named Mia") é sujeito mais vezes;
 *  · sem personagem (factual): divide pelo menos 2 palavras de assunto com a âncora (1 quando a âncora só tem 1-2).
 * Sem âncora e sem ficha não há com o que comparar: true (nada a vigiar).
 */
export function episodioFicaNoAssunto(
  episodio: { title?: string | null; script?: string | null },
  ref: { fichas: readonly string[]; assunto: string },
): boolean {
  const texto = `${episodio.title ?? ''}\n${episodio.script ?? ''}`
  if (!limpa(texto)) return false
  if (ref.fichas.length) {
    const titulo = limpa(episodio.title ?? '')
    const frases = frasesDoEpisodio(episodio.script ?? '')
    const primeira = frases[0] ?? ''
    let noCentro = false
    let sujeitoNosso = 0
    const nossas: string[] = []
    for (const f of ref.fichas) {
      const nome = nomeDaFicha(f)
      if (!nome) continue
      const papel = !/^\p{Lu}/u.test(nome)
      for (const forma of formasDoNome(nome)) {
        nossas.push(forma.toLowerCase())
        const s = vezesComoSujeito(frases, forma, papel)
        sujeitoNosso = Math.max(sujeitoNosso, s)
        if (s > 0 || citaNome(titulo, forma, papel) || citaNome(primeira, forma, papel)) noCentro = true
      }
    }
    if (!noCentro) return false
    // personagem novo no centro? (o escritor apresentou alguém com ficha própria e ele age mais que o nosso)
    for (const rival of fichasExplicitas(episodio.script)) {
      const nomeRival = nomeDaFicha(rival)
      const formas = formasDoNome(nomeRival)
      if (!formas.length || formas.some((r) => nossas.some((n) => n === r.toLowerCase() || n.includes(r.toLowerCase()) || r.toLowerCase().includes(n)))) continue
      const papelRival = !/^\p{Lu}/u.test(nomeRival)
      const sujeitoRival = Math.max(...formas.map((r) => vezesComoSujeito(frases, r, papelRival)))
      if (sujeitoRival > sujeitoNosso) return false
    }
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
}

/** A ideia que entra na caixa do Studio. Inglês na moldura; a história segue na língua do filme (o link leva ?language=). */
export function ideiaDoProximoEpisodio(e: EntradaDaIdeia): IdeiaDoEpisodio {
  const { fichas, modo } = fichasDoFilmeComModo(e.pedido, e.narracao, e.titulo)
  const assunto = assuntoDoFilme(e.narracao, e.pedido, e.titulo)
  // O número é o da SÉRIE (moldura do pedido), não o total de filmes da conta (o do escritor conta tudo o que a pessoa já fez).
  const n = typeof e.episodeNumber === 'number' && Number.isFinite(e.episodeNumber) && e.episodeNumber >= 2 ? Math.round(e.episodeNumber) : numeroDoProximo(e.pedido)
  const titulo = nomeDaSerie(e.titulo, e.pedido).replace(/["“”]/g, '').slice(0, 90)
  const temEpisodio = Boolean(e.episodio && limpa(`${e.episodio.title ?? ''} ${e.episodio.script ?? ''}`))
  const noAssunto = temEpisodio ? episodioFicaNoAssunto(e.episodio!, { fichas, assunto }) : false
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
  // KINEO-PROXIMO-EPISODIO-0111 (revisão) — "mesmos personagens" só quando o autor escreveu a ficha ou um ser AGE no texto.
  // Papel sem nome num filme sem sinal de história fica no meio-termo; filme factual mantém "Stay on the same subject".
  linhas.push(modo === 'autor' || modo === 'ser_que_age'
    ? 'Keep the same characters (same names, same species, same look) in the same world and tone. A new hook, new events and a fresh payoff; do not repeat what already happened.'
    : modo === 'papel' && fichas.length
      ? 'Stay on the same subject: if it is a story, keep the same characters in the same world; if it is factual, take the next angle. A new hook and a fresh payoff; do not repeat what episode 1 already said.'
      : 'Stay on the same subject and take the next angle of it. A new hook, new facts and a fresh payoff; do not repeat what episode 1 already said.')
  let ideia = linhas.join('\n')
  if (ideia.length > IDEIA_MAX_CHARS) ideia = ideia.slice(0, IDEIA_MAX_CHARS)
  return { ideia, fichas, assunto, usouEpisodio: temEpisodio && noAssunto, episodioFora: temEpisodio && !noAssunto, numero: n }
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
