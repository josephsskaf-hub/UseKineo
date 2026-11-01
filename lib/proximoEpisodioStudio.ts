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
import { assuntoDoFilme, fichasExplicitas } from '@/lib/episodeContinuity'
import { elencoDeterministico, type FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { IDEIA_MAX_CHARS } from '@/lib/proximoEpisodioLink'

/** No máximo 2 personagens (o mesmo teto da folha). */
export const MAX_FICHAS = 2
/** Teto de cada ficha na ideia. */
export const FICHA_MAX_CHARS = 240
/** Teto do pedaço do episódio escrito (título + gancho + 1ª revelação) que entra na ideia. */
export const EPISODIO_NA_IDEIA_MAX_CHARS = 520

// As cores que a folha SORTEIA (lib/cinematic/folhaDePersonagem CORES) — só ficam se o roteiro as disse.
const CORES_SORTEADAS = ['bright green', 'sky blue', 'warm orange', 'soft purple', 'sunny yellow', 'teal']

const limpa = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim()

/** Ficha curta a partir do elenco da casa: nome + espécie/papel, sem aparência inventada. */
function fichaDoElenco(f: FichaDePersonagem, texto: string): string {
  if (f.origem === 'autor') return limpa(f.canonica)
  // sem nome ("the tiny discarded robot"): o papel JÁ é a ficha fiel do roteiro
  if (f.nome.toLowerCase().startsWith('the ')) return f.nome
  if (f.tipo === 'humano') return f.genero === 'woman' ? `${f.nome}, a woman` : f.genero === 'man' ? `${f.nome}, a man` : f.nome
  // bicho/criatura nomeado: o 1º trecho da canônica ("Dino, a small bright green dinosaur"), sem a cor sorteada
  let seg = limpa(f.canonica).split(/ — | with /)[0]
  const baixo = texto.toLowerCase()
  for (const cor of CORES_SORTEADAS) if (seg.includes(cor) && !baixo.includes(cor)) seg = seg.replace(`${cor} `, '').replace(cor, '')
  return limpa(seg.replace(/,\s*$/, ''))
}

/**
 * As fichas do filme de origem, em ordem de preferência das fontes (pedido do autor, narração, título).
 * Primeiro as escritas pelo autor (verbatim); só sem nenhuma, o elenco do roteiro. [] = filme sem personagem (factual).
 */
export function fichasDoFilme(...fontes: Array<string | null | undefined>): string[] {
  const validas = fontes.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
  const explicitas = fichasExplicitas(...validas)
  if (explicitas.length) return explicitas.slice(0, MAX_FICHAS).map((f) => f.slice(0, FICHA_MAX_CHARS))
  const texto = validas.join('\n')
  if (!texto) return []
  let elenco: FichaDePersonagem[] = []
  try { elenco = elencoDeterministico(texto) } catch { elenco = [] }
  const out: string[] = []
  for (const f of elenco) {
    const ficha = fichaDoElenco(f, texto).slice(0, FICHA_MAX_CHARS)
    if (ficha && !out.some((o) => o.toLowerCase() === ficha.toLowerCase())) out.push(ficha)
    if (out.length >= MAX_FICHAS) break
  }
  return out
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

/**
 * O episódio escrito ficou no assunto do filme de origem?
 *  · com personagem: o título ou a narração cita o nome de pelo menos uma ficha;
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
    const baixo = texto.toLowerCase()
    return ref.fichas.some((f) => {
      const nome = nomeDaFicha(f).toLowerCase()
      if (!nome) return false
      // nome composto: basta o primeiro nome ("Roland" do "Roland Pernicus Oznard")
      const primeiro = nome.split(' ')[0]
      return baixo.includes(nome) || (primeiro.length >= 3 && new RegExp(`(?<![\\p{L}])${primeiro.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu').test(texto))
    })
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
  const t = limpa(titulo ?? '')
  return MOLDURA_DA_SERIE.test(t) ? '' : t
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
  const fichas = fichasDoFilme(e.pedido, e.narracao, e.titulo)
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
  linhas.push(fichas.length
    ? 'Keep the same characters (same names, same species, same look) in the same world and tone. A new hook, new events and a fresh payoff; do not repeat what already happened.'
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
