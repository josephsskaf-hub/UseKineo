// ═══ KINEO-EPISODIO2-NO-ASSUNTO-2026-10-13 — o episódio 2 continua o MESMO filme ═══
//
// O DEFEITO (medido em `events.next_episode_written`, 13/10): o "próximo
// episódio" que /api/next-episode escreve saía sobre OUTRO assunto.
//   · Milo, a caixinha de leite            → "The Last Pizza Slice"
//   · Mila no Rainbow Valley                → "The Whispering Forest"
//   · dinossauro que não para de dançar     → "The Great Jellyfish Migration"
//   · por que a janela do avião é redonda   → "The Secret of Honey's Longevity"
//   · Lumi e Pipo contam até dez (PT)       → "The Ocean's Mysterious Abyss"
// A CAUSA não era a fonte do texto (o EPISODE 1 chegava certo): era a ORDEM
// dada ao escritor. O `sistema` da rota mandava, com todas as letras, "a
// different story in the same subject area" e "Same curiosity, new subject",
// num "knowledge/curiosity channel" onde "no invented people" proíbe a
// própria personagem da história infantil. O modelo obedecia: trocava de
// assunto e virava documentário. O conserto de 22/09 (lib/episodeSubject.ts)
// cola o assunto anterior nas rotas de RENDER, não nesta.
//
// O QUE ESTE ARQUIVO FAZ (puro, zero imports — o guardião roda offline):
//   · `assuntoDoFilme` tira do filme de origem uma ÂNCORA curta de assunto
//     (quem/o quê), limpando o andaime de produção ("Create a 15–35 second
//     story…", "HOOK (0-2s):", "[Pexels: …]", "Duration: …"). Prefere a
//     NARRAÇÃO real do filme (`videos.script`), depois o texto que a rota já
//     usa como EPISODE 1.
//   · `formatoDoFilme` reconhece história com personagem (o caso que mais
//     derivava) para a linha FORMAT dizer "continue a ficção".
//     KINEO-PROXIMO-EPISODIO-0111-SEMANTICA: hoje ela só escreve a linha FORMAT
//     de 13/10 quando a leitura semântica NÃO veio (falha segura = o prompt de
//     antes). Nunca mais decide ficha nem personagem; com leitura, a linha
//     FORMAT segue a leitura (`comFichaDoFilme`).
//   · `blocoDeContinuidade` monta as duas linhas que entram no prompt do
//     usuário. Sem âncora utilizável devolve '' — e o prompt fica como antes.

/** Teto da âncora: o bastante para nome + situação, curto para não competir
 *  com o EPISODE 1 inteiro que já vai no prompt. */
export const MAX_ASSUNTO_CHARS = 280
/** Âncora menor que isto não diz de quem é o filme. */
const MIN_ASSUNTO_CHARS = 12

// "[Pexels: toyota supra mk4 closeup]" e afins: instrução de cena, não assunto.
const ETIQUETA = /\[[^\]]{0,160}\]/g
// Rótulo no começo da linha: "HOOK (0-2s):", "MICRO REWARD 1:", "Concept:".
const ROTULO =
  /^\s*(?:HOOK|MICRO\s*REWARD(?:\s*\d+)?|ESCALATION|RHYTHM|PAYOFF|TITLE|T[ÍI]TULO|CONCEPT|CONCEITO|CONCEPTO|TOPIC|TEMA|SCENE\s*\d+|CENA\s*\d+|ESCENA\s*\d+)\s*(?:\([^)]{0,20}\))?\s*[:\-–—]\s*/i
// Linha que é só ficha técnica.
const FICHA = /^\s*(?:duration|dura[cç][aã]o|duraci[oó]n|aspect(?: ratio)?|format|formato|resolution|music|m[uú]sica|voice|voz|camera|c[aâ]mera|sequence|sequ[eê]ncia|trick|truque|style|estilo)\s*:/i
// Frase que só dá ORDEM de produção. Só cai quando não carrega o assunto
// ("Create a video ABOUT the Titanic" fica; "Create a 15–35 second story in a
// sweet, fairytale style" sai).
const ORDEM =
  /^(?:create|make|generate|write|produce|render|crie|cria|gere|gera|fa[cç]a|escreva|crea|genera|haz|escribe|every shot|each shot|do not|don't|never|keep|use|the story must|the video must|it must|must)\b/i
const ORDEM_COM_ASSUNTO = /\b(?:about|sobre|acerca de|named|called|chamad[oa]|llamad[oa])\b/i
// Andaime de continuação antigo: 'Topic: "X". This is the next episode…'.
const CONTINUACAO_ANTIGA = /^\s*(?:topic|tema)\s*:\s*"?([^"\n]+?)"?\s*\.\s+this is the next episode[\s\S]*$/i

function limparLinha(linha: string): string {
  return linha.replace(ETIQUETA, ' ').replace(ROTULO, '').replace(/\s+/g, ' ').trim()
}

function frasesDe(texto: string): string[] {
  const out: string[] = []
  for (const bruta of texto.split(/\n+/)) {
    if (FICHA.test(bruta)) continue
    const linha = limparLinha(bruta)
    if (!linha) continue
    for (const f of linha.split(/(?<=[.!?…])\s+/)) {
      const frase = f.trim()
      if (frase) out.push(frase)
    }
  }
  return out
}

function cortar(texto: string): string {
  if (texto.length <= MAX_ASSUNTO_CHARS) return texto
  const janela = texto.slice(0, MAX_ASSUNTO_CHARS)
  const fimFrase = Math.max(janela.lastIndexOf('. '), janela.lastIndexOf('! '), janela.lastIndexOf('? '))
  if (fimFrase >= MIN_ASSUNTO_CHARS * 3) return janela.slice(0, fimFrase + 1).trim()
  const fimPalavra = janela.lastIndexOf(' ')
  return (fimPalavra > MIN_ASSUNTO_CHARS ? janela.slice(0, fimPalavra) : janela).trim()
}

/** A âncora de assunto de UM texto (narração ou ordem). '' quando não há. */
function ancoraDe(texto: string | null | undefined): string {
  let t = (texto ?? '').replace(/\r\n/g, '\n')
  // Episódio que já nasceu de continuação carrega o bloco do anterior no topic.
  t = t.split('\n\nPREVIOUS EPISODE')[0]
  const antiga = CONTINUACAO_ANTIGA.exec(t)
  if (antiga) t = antiga[1]
  const frases = frasesDe(t)
  if (!frases.length) return ''
  const comAssunto = frases.filter((f) => !(ORDEM.test(f) && !ORDEM_COM_ASSUNTO.test(f)))
  // Se TUDO era ordem, a ordem é o que existe: melhor ela que nada.
  const escolhidas = comAssunto.length ? comAssunto : frases
  const ancora = cortar(escolhidas.join(' ').replace(/\s+/g, ' ').trim())
  return ancora.length >= MIN_ASSUNTO_CHARS ? ancora : ''
}

/**
 * A âncora de assunto do filme de origem. As fontes vêm em ordem de
 * preferência (a narração real primeiro); a primeira que render âncora vence.
 */
export function assuntoDoFilme(...fontes: Array<string | null | undefined>): string {
  for (const f of fontes) {
    const a = ancoraDe(f)
    if (a) return a
  }
  return ''
}

export type FormatoDoFilme = 'historia' | 'livre'

const SINAL_HISTORIA =
  /\b(?:once upon a time|fairy ?tale|fairytale|bedtime|short story|a story|kids'? story|children'?s story|fictional|fiction|protagonist|main character|characters?|cartoon|animated|anthropomorphic|fable|era uma vez|hist[oó]ria infantil|personage(?:m|ns)|conto de fadas|érase una vez|[eé]rase una vez|cuento|personaje|f[aá]bula)\b/i
const BICHO_PERSONAGEM =
  /\b(?:a|an|the|um|uma|un|una)\s+(?:little|tiny|cute|fluffy|small|baby|sad|brave|pequen[oa]|fofinh[oa])\s+(?:[a-z]+\s+)?(?:dinosaur|bunny|rabbit|cat|dog|puppy|kitten|bear|dragon|monster|creature|girl|boy|robot|fox|pig|duck|unicorn|elephant|lion|mouse|owl|penguin|carton|dinossauro|coelho|gat[oa]|cachorr[oa]|menin[oa]|drag[aã]o|criatura)\b/i
// Nome próprio apresentado como personagem: "named Mila", "named MILO", "chamada Lumi".
const NOME_PERSONAGEM = /\b(?:named|called|chamad[oa]|llamad[oa])\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]+/u

/** História com personagem → 'historia'. O resto → 'livre' (o escritor lê o
 *  EPISODE 1 e segue o formato dele). Nunca chuta 'fatos': uma história de
 *  terror sem palavra-sinal não pode ser empurrada para documentário. */
export function formatoDoFilme(...fontes: Array<string | null | undefined>): FormatoDoFilme {
  const t = fontes.filter((f): f is string => typeof f === 'string').join('\n')
  if (SINAL_HISTORIA.test(t) || BICHO_PERSONAGEM.test(t) || NOME_PERSONAGEM.test(t)) return 'historia'
  return 'livre'
}

const LINHA_FORMATO: Record<FormatoDoFilme, string> = {
  historia:
    'FORMAT: a story with characters. Continue it as fiction: the SAME characters (same names) in the SAME world, and what happens to them next. Do not turn it into a documentary.',
  livre:
    'FORMAT: same as episode 1. If it is a story, continue the same characters in the same world; if it is factual, stay on the same theme with the next angle.',
}

// ═══ KINEO-PROXIMO-EPISODIO-0111 — a FICHA do personagem atravessa o episódio (vai do fundador 01/11 "vai tudo") ═══
//
// O DEFEITO QUE SOBROU DEPOIS DE 13/10 (medido em `events.next_episode_written`, 13/10 → 01/11): o assunto ficou, o
// PERSONAGEM não. O robô que conserta brinquedos virou coadjuvante de uma "little girl, named Mia" (nome inventado, em dois
// episódios); o urso de pelúcia ganhou o nome "Tofu". A ficha que o AUTOR escreveu não era dita ao escritor como regra.
//
// KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — as rodadas 1 e 2 deduziam a ficha por lista de palavras (aposto "Nome, a …",
// "a … named Nome", léxico de seres, de metáforas, de preposições) e as duas revisões adversariais acharam filmes reais
// virando personagem: "Hinterkaifeck, a secluded farm", "Thermopylae, a narrow pass", "Inflation, a silent thief",
// "Bitcoin, a teenager in Ohio" ("Thanks to Bitcoin, a teenager…"), e a mesma pessoa em duas fichas. Lista de palavras não
// fecha: cada conserto abria outro buraco. A decisão de arquitetura (01/11): a ficha sai de UMA leitura semântica curta do
// roteiro (lib/fichaDoEpisodio.ts, gpt-4o-mini, temperatura 0, com falha segura). Este arquivo continua PURO (zero imports,
// o guardião de 13/10 roda offline) e guarda só o que não é adivinhação:
//   · `fichasRotuladas` — a ficha que o autor ESCREVEU com rótulo ("Main character: …", "Also in the story: …"): tem
//     precedência e não chama o modelo (é também o rótulo que a ideia do botão escreve — o episódio 3 herda do 2);
//   · `comFichaDoFilme` — cola a ficha (do autor ou da leitura) no bloco de 13/10 e acerta a linha FORMAT pela leitura;
//     sem ficha (leitura falhou) o bloco fica byte a byte como era;
//   · `mesmoSer` — a mesma pessoa com variações de nome ("Benjamin Briggs" / "Briggs") é uma ficha só.

/** Teto de uma ficha (nome + descrição + aparência). */
export const MAX_FICHA_CHARS = 240

const limpa = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim()

/** Formato que a leitura (ou o rótulo do autor) decidiu. */
export type FormatoDaFicha = 'story' | 'factual'
/** A ficha que entra no prompt do escritor e na ideia do Studio. `fichas` só existe em história (vazia = sem personagem). */
export interface FichaAplicada {
  formato: FormatoDaFicha
  fichas: readonly string[]
  /** 'autor' = rótulo escrito pelo autor (sem modelo); 'modelo' = leitura semântica do roteiro. */
  origem: 'autor' | 'modelo'
}

function cortarFicha(f: string): string {
  const t = limpa(f).replace(/[,;:\s]+$/, '')
  if (t.length <= MAX_FICHA_CHARS) return t
  const janela = t.slice(0, MAX_FICHA_CHARS)
  return janela.slice(0, Math.max(0, janela.lastIndexOf(' '))).replace(/[,;:\s]+$/, '')
}

// "Main character: …" / "Protagonist: …" (e pt/es) = a ficha principal; "Also in the story: …" = o coadjuvante. É o rótulo
// que lib/cinematic/sceneStyle deriveExplicitCharacter reconhece e o que a ideia do botão escreve.
const ROTULO_PRINCIPAL_RE = /(?:^|\n|\.\s)\s*(?:main character|protagonist|personagem principal|protagonista)\s*:\s*([^\n]{3,260}?)(?=\.\s|\.$|\n|$)/giu
const ROTULO_COADJUVANTE_RE = /(?:^|\n|\.\s)\s*(?:also in the story|supporting character|tamb[eé]m na hist[oó]ria|personagem secund[aá]rio)\s*:\s*([^\n]{3,260}?)(?=\.\s|\.$|\n|$)/giu
/** Rótulo vazio de sentido ("none", "n/a", "-") não é ficha. */
const SEM_FICHA_RE = /^(?:none|n\/?a|nobody|no one|-+|nenhum|nenhuma|ninguém|ninguem|ninguno|ninguna)\.?$/i

/**
 * As fichas que o AUTOR escreveu com rótulo, verbatim (no máximo 2: a principal e um coadjuvante). Fontes em ordem de
 * preferência (o pedido, a narração…). [] quando não há rótulo — aí quem decide é a leitura semântica.
 */
export function fichasRotuladas(...fontes: Array<string | null | undefined>): string[] {
  let principal = ''
  let coadjuvante = ''
  for (const fonte of fontes) {
    if (typeof fonte !== 'string' || !fonte.trim()) continue
    const texto = fonte.replace(/\r\n/g, '\n').slice(0, 8000)
    if (!principal) {
      for (const m of texto.matchAll(ROTULO_PRINCIPAL_RE)) {
        const f = cortarFicha(m[1])
        if (f && !SEM_FICHA_RE.test(f)) { principal = f; break }
      }
    }
    if (!coadjuvante) {
      for (const m of texto.matchAll(ROTULO_COADJUVANTE_RE)) {
        const f = cortarFicha(m[1])
        if (f && !SEM_FICHA_RE.test(f)) { coadjuvante = f; break }
      }
    }
  }
  if (!principal) return []
  return coadjuvante && !mesmoSer(nomeDaFichaEscrita(coadjuvante), nomeDaFichaEscrita(principal)) ? [principal, coadjuvante] : [principal]
}

/** A ficha do autor (rótulo) já como FichaAplicada; null sem rótulo. */
export function fichaRotulada(...fontes: Array<string | null | undefined>): FichaAplicada | null {
  const fichas = fichasRotuladas(...fontes)
  return fichas.length ? { formato: 'story', fichas, origem: 'autor' } : null
}

/** O nome na ficha escrita: o que vem antes da 1ª vírgula ("Roland Pernicus Oznard, a gruff old man…" → "Roland Pernicus Oznard"). */
export function nomeDaFichaEscrita(ficha: string): string {
  return limpa(ficha).split(',')[0].trim()
}

const HONORIFICO_RE = /^(?:dr|dra|mr|mrs|ms|mx|prof|profa|capt|captain|gen|general|lt|sgt|col|st|sr|sra|srta|sir|lady|lord|king|queen|prince|princess|dom|dona|don|doña|uncle|aunt|tio|tia|tío|tía)\.?$/i
function partesDoNome(nome: string): string[] {
  return limpa(nome).toLowerCase().normalize('NFC').split(/[\s.\-–—'’]+/u).map((p) => p.replace(/[^\p{L}\p{N}]/gu, '')).filter((p) => p.length >= 2 && !HONORIFICO_RE.test(p))
}
/**
 * Dois nomes são o MESMO ser? Um é o outro com partes a menos ("Benjamin Briggs" ⊇ "Briggs"; "Roland Pernicus Oznard" ⊇
 * "Roland Oznard"; "Captain Briggs" = "Briggs"). Nomes que só dividem um sobrenome ("Kali Smith" / "Kameron Smith") não.
 */
export function mesmoSer(a: string, b: string): boolean {
  const pa = partesDoNome(a)
  const pb = partesDoNome(b)
  if (!pa.length || !pb.length) return false
  const [menor, maior] = pa.length <= pb.length ? [pa, pb] : [pb, pa]
  return menor.every((p) => maior.includes(p))
}

/**
 * As linhas de continuidade que a rota cola logo depois do EPISODE 1 (a âncora de 13/10 + a linha FORMAT).
 * '' quando o filme não tem assunto utilizável: aí o prompt fica como antes. A ficha entra por `comFichaDoFilme`.
 */
export function blocoDeContinuidade(entrada: {
  /** Texto que a rota já usa como EPISODE 1 (narração do cliente ou topic). */
  anterior: string
  /** `videos.script` do filme de origem (a narração real), quando lida. */
  narracaoOrigem?: string | null
}): string {
  const assunto = assuntoDoFilme(entrada.narracaoOrigem, entrada.anterior)
  if (!assunto) return ''
  const formato = formatoDoFilme(entrada.anterior, entrada.narracaoOrigem)
  return `SUBJECT TO CONTINUE (stay on it): ${assunto}\n${LINHA_FORMATO[formato]}`
}

const CABECA_FICHA = 'MAIN CHARACTER (keep exactly the same name, species and look; never rename or replace them, never invent a new protagonist): '
/** As linhas da ficha ('' sem ficha). */
function linhasDaFicha(fichas: readonly string[]): string {
  if (!fichas.length) return ''
  return `\n${CABECA_FICHA}${fichas[0]}${fichas[1] ? `\nALSO IN THE STORY (same name and look): ${fichas[1]}` : ''}`
}

/**
 * KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — cola a ficha (do autor ou da leitura semântica) num bloco já pronto.
 *  · bloco vazio (filme sem assunto) fica vazio — o prompt de antes, byte a byte;
 *  · ficha null (a leitura falhou, demorou ou devolveu lixo) = NÃO MEXE: o bloco de 13/10 sai igual;
 *  · com leitura: a linha FORMAT segue a leitura ('story' → continue a ficção; 'factual' → a linha neutra de 13/10, que
 *    nunca empurra documentário para ficção nem o contrário) e, em história com personagem, entra MAIN CHARACTER.
 */
export function comFichaDoFilme(bloco: string, ficha: FichaAplicada | null | undefined): string {
  if (!bloco || !ficha || bloco.includes(CABECA_FICHA)) return bloco
  const linhaCerta = LINHA_FORMATO[ficha.formato === 'story' ? 'historia' : 'livre']
  const comFormato = bloco.replace(LINHA_FORMATO.historia, linhaCerta).replace(LINHA_FORMATO.livre, linhaCerta)
  return `${comFormato}${ficha.formato === 'story' ? linhasDaFicha(ficha.fichas.slice(0, 2)) : ''}`
}
