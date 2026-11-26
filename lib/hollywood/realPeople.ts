// KINEO-QUALIDADE-TODOS-MOTORES-2910 — pure shared real-person policy; extracted without changing its rules.
// ── Anti-deepfake ────────────────────────────────────────────────────────────
// KINEO-HOLLYWOOD-2026-07-09 — contemporary celebrities / politicians /
// athletes. Used to (a) BLOCK user prompts that name a real person (HTTP 400
// in the route) and (b) sanitize GPT-generated prompts. Compound forms are
// used for surnames that double as common words ("gates", "curry", "brady")
// so a prompt about "the gates of Babylon" is never blocked.
export const CONTEMPORARY_FIGURE_RE = new RegExp(
  '\\b(?:' +
    [
      // tech / business
      'elon\\s+musk', 'musk', 'elon', 'zuckerberg', 'mark\\s+zuckerberg', 'bezos', 'jeff\\s+bezos',
      'bill\\s+gates', 'sam\\s+altman', 'jensen\\s+huang', 'tim\\s+cook', 'sundar\\s+pichai',
      'satya\\s+nadella', 'warren\\s+buffett', 'buffett', 'oprah', 'jack\\s+ma', 'bernard\\s+arnault',
      // politics / heads of state / royalty / religion
      'trump', 'donald\\s+trump', 'biden', 'joe\\s+biden', 'obama', 'barack\\s+obama', 'putin',
      'zelensky+', 'lula', 'bolsonaro', 'macron', 'merkel', 'netanyahu', 'kim\\s+jong[\\s-]?un',
      'xi\\s+jinping', 'narendra\\s+modi', 'trudeau', 'milei', 'maduro', 'kamala\\s+harris',
      'pope\\s+leo', 'pope\\s+francis', 'king\\s+charles', 'prince\\s+william', 'prince\\s+harry',
      'meghan\\s+markle', 'queen\\s+elizabeth', 'dalai\\s+lama', 'greta\\s+thunberg',
      // sports
      'messi', 'lionel\\s+messi', 'cristiano\\s+ronaldo', 'ronaldo', 'cr7', 'neymar', 'mbapp[eé]',
      'haaland', 'vinicius\\s+jr\\.?', 'vini\\s+jr\\.?', 'bellingham', 'lewandowski', 'mo\\s+salah',
      'lebron(?:\\s+james)?', 'steph(?:en)?\\s+curry', 'kevin\\s+durant', 'giannis', 'nikola\\s+jokic',
      'tom\\s+brady', 'patrick\\s+mahomes', 'serena\\s+williams', 'djokovic', 'rafael\\s+nadal',
      'roger\\s+federer', 'alcaraz', 'verstappen', 'lewis\\s+hamilton', 'tiger\\s+woods',
      'mike\\s+tyson', 'conor\\s+mcgregor', 'usain\\s+bolt',
      // music / entertainment / creators
      'taylor\\s+swift', 'beyonc[eé]', 'rihanna', 'drake', 'kanye(?:\\s+west)?', 'kendrick\\s+lamar',
      'billie\\s+eilish', 'ariana\\s+grande', 'justin\\s+bieber', 'bad\\s+bunny', 'dua\\s+lipa',
      'ed\\s+sheeran', 'adele', 'eminem', 'snoop\\s+dogg', 'cardi\\s+b', 'nicki\\s+minaj',
      'kardashian', 'kylie\\s+jenner', 'kendall\\s+jenner', 'shakira', 'selena\\s+gomez',
      'mr\\.?\\s?beast', 'pewdiepie', 'kai\\s+cenat', 'ishowspeed', 'logan\\s+paul', 'jake\\s+paul',
      'andrew\\s+tate', 'joe\\s+rogan', 'jordan\\s+peterson',
      // film / tv
      'tom\\s+cruise', 'leonardo\\s+dicaprio', 'dicaprio', 'brad\\s+pitt', 'angelina\\s+jolie',
      'johnny\\s+depp', 'keanu\\s+reeves', 'dwayne\\s+johnson', 'zendaya', 'timoth[eé]e\\s+chalamet',
      'margot\\s+robbie', 'scarlett\\s+johansson', 'robert\\s+downey(?:\\s+jr\\.?)?', 'will\\s+smith',
      'denzel\\s+washington', 'morgan\\s+freeman', 'emma\\s+watson', 'tom\\s+hanks',
    ].join('|') +
    ')\\b',
  'gi',
)

// KINEO-HOLLYWOOD-2026-07-09 — duplicated from NAMED_FIGURE_RE in
// app/api/generate-video-cinematic/route.ts (era-lock, historical figures).
// Duplicated on purpose: lib code must not import from a route file. Keep in sync.
// ⚠️ KINEO-GATE-FALSE-POSITIVE-2026-08-20 — ESTA REGEX BLOQUEAVA FRASE COMUM.
//
// Descoberto pelo render do fundador (script do Edmund Fitzgerald, 06:00): o
// gate anti-deepfake recusou "The captain radioed a ship nearby". A heurística
// "título + Nome próprio" (`captain\s+[A-Z][\w'-]+`) foi escrita para pegar
// "Captain Scott" — mas a regex inteira carregava a flag `i`, e com `i` o
// `[A-Z]` aceita QUALQUER letra. Resultado: "captain radioed", "king cobra",
// "president announced", "general store" — tudo virava "pessoa real" e
// derrubava o render com estorno. Num canal de MISTÉRIO (naufrágios, guerras,
// expedições), título militar + verbo é frase de quase todo roteiro.
//
// O conserto separa as duas naturezas do padrão:
//   · a heurística título+Nome fica CASE-SENSITIVE (sem `i`): "Captain Scott"
//     continua barrado, "the captain radioed" passa — a maiúscula do nome
//     próprio é exatamente o sinal que a heurística sempre quis usar;
//   · a lista de nomes explícitos (hitler, napoleon...) mantém o `i`, porque
//     nome citado em minúscula continua sendo a mesma pessoa.
// Mesma dupla vive em NAMED_FIGURE_RE no route (duplicada de propósito — lib
// não importa de route). Corrigida lá também; manter em sincronia.
export const HISTORICAL_TITLE_NAME_RE =
  /\b(?:[Ee]mperor|[Gg]eneral|[Mm]arshal|[Kk]ing|[Qq]ueen|[Tt]sar|[Cc]zar|[Pp]resident|[Cc]ommander|[Cc]olonel|[Aa]dmiral|[Cc]aptain|[Dd]uke|[Ll]ord|[Ss]ir|[Kk]aiser|[Pp]haraoh)\s+[A-Z][\w'-]+/g

export const HISTORICAL_FIGURE_RE =
  /\b(?:napoleon(?:\s+bonaparte)?|bonaparte|wellington|hitler|stalin|churchill|caesar|cleopatra|genghis\s+khan|alexander\s+the\s+great|abraham\s+lincoln|george\s+washington|joan\s+of\s+arc)\b/gi

/** Stateless "does this text name a real person?" check (the /g regexes are
 * stateful under .test(), so we reset lastIndex before every use). */
export function mentionsRealPerson(text: string): boolean {
  const t = text ?? ''
  CONTEMPORARY_FIGURE_RE.lastIndex = 0
  if (CONTEMPORARY_FIGURE_RE.test(t)) return true
  HISTORICAL_FIGURE_RE.lastIndex = 0
  if (HISTORICAL_FIGURE_RE.test(t)) return true
  HISTORICAL_TITLE_NAME_RE.lastIndex = 0
  return HISTORICAL_TITLE_NAME_RE.test(t)
}

/** [TRAVA 8.2 — vai do fundador 29/09 'vai pra todas as 4'] KINEO-ESTRELA-DO-FILME-2026-09-29 — só a lista de figuras ATUAIS
 * (celebridades, políticos, atletas). A rota do filme recusa a "Estrela do filme" quando o texto nomeia uma delas. [KINEO-ESTRELA-DO-FILME-2026-09-29] */
export function mentionsContemporaryFigure(text: string): boolean { // KINEO-ESTRELA-DO-FILME-2026-09-29
  CONTEMPORARY_FIGURE_RE.lastIndex = 0 // KINEO-ESTRELA-DO-FILME-2026-09-29
  return CONTEMPORARY_FIGURE_RE.test(text ?? '') // KINEO-ESTRELA-DO-FILME-2026-09-29
} // KINEO-ESTRELA-DO-FILME-2026-09-29

/** Replace any real-person name with a generic fictional description. */
export function sanitizeRealPeople(text: string): string {
  CONTEMPORARY_FIGURE_RE.lastIndex = 0
  HISTORICAL_FIGURE_RE.lastIndex = 0
  HISTORICAL_TITLE_NAME_RE.lastIndex = 0
  return (text ?? '')
    .replace(CONTEMPORARY_FIGURE_RE, 'a fictional person (no real-world likeness)')
    .replace(HISTORICAL_FIGURE_RE, 'a fictional period-accurate figure')
    .replace(HISTORICAL_TITLE_NAME_RE, 'a fictional period-accurate figure')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// KINEO-FAMOSO-FORA-DO-TEXTO-2511 [CEO 25/11, parte (b) do famoso; volta da revisora 392f0a52, D2–D4] — o nome de uma figura ATUAL (só a lista
// CONTEMPORARY_FIGURE_RE; nunca a heurística título + Nome, que pega personagem inventado como "Captain Rosa") sai do TEXTO que vai ao motor do filme grátis:
// os planos do Kling 4 e o cabeçalho do Gemini. A narração não muda. Sem nome da lista, o texto volta IDÊNTICO (o filme de hoje, byte a byte).
// - Palavra solta só conta com maiúscula ("Musk", "Drake", "Trump"); em minúscula é palavra comum ("musk ox", "a drake", "trump card"). Nome composto
//   ("elon musk", "taylor swift") conta em qualquer caixa. Um título colado antes ("President Trump", "Mr. Bezos") sai junto.
// - [D2] a inicial e o nome do meio saem junto: "Donald J. Trump", "E. Musk", "Lionel Andrés Messi" (só quando nome + sobrenome é o composto da lista; "Yesterday
//   Musk" não leva o "Yesterday"). No composto com hífen sai só o nome: "Obama-era law" → "era law", "Musk-style rocket" → "style rocket".
// - [D3] personagem INVENTADO com nome de uma palavra da lista ("Adele, a young baker", "Lula, the old cat", "Drake the duck"): a palavra solta seguida de
//   aposto (", a/an/the …" ou " the …") fica, A MENOS que o filme (o contexto) cite a mesma pessoa pelo composto ("Elon Musk … Musk, the founder" troca).
//   Sobra: o famoso real chamado só pelo sobrenome e com aposto ("Messi, the footballer"), e o inventado de uma palavra sem aposto ("Giannis waves").
// - [D4] duas ou mais pessoas da lista no mesmo filme ganham rótulos distintos e na mesma ordem nos planos e no cabeçalho ("the first person", "the second
//   person"); `ordem` (os nomes das referências) vem primeiro, depois a ordem em que aparecem. Uma só = "a person".
export const FAMOSO_NO_MOTOR_2511 = 'a person'
const TITULO_COLADO_2511 = /(?:President|Vice\s+President|Prime\s+Minister|Senator|Governor|Chancellor|Mr|Mrs|Ms|Dr|Sir)\.?\s+$/u
const INICIAIS_ANTES_2511 = /(?:\p{Lu}\.\s*){1,2}$/u
const NOMES_ANTES_2511 = /((?:\p{Lu}[\p{L}'’-]+\s+){1,2})((?:\p{Lu}\.\s*){0,2})$/u
const APOSTO_DEPOIS_2511 = /^,?\s+(?:the|a|an)\s+\p{L}/iu
const ORDINAIS_2511 = ['the first person', 'the second person', 'the third person']
const aceitaNome2511 = (nome: string): boolean => /\s|\d/u.test(nome) || /^\p{Lu}/u.test(nome)
const chaveDoNome2511 = (nome: string): string => (nome.toLowerCase().match(/\p{L}[\p{L}\p{N}'’]*/gu) ?? []).pop() ?? nome.toLowerCase()
const reDaLista2511 = (): RegExp => new RegExp(CONTEMPORARY_FIGURE_RE.source, 'gi')
const ehCompostoDaLista2511 = (t: string): boolean => { const re = new RegExp('^(?:' + CONTEMPORARY_FIGURE_RE.source.replace(/^\\b/, '').replace(/\\b$/, '') + ')$', 'iu'); return re.test(t.trim()) && /\s/u.test(t.trim()) }
export function semFamosoNoTextoDoMotor2511(texto: string, opcoes: { contexto?: string; ordem?: ReadonlyArray<string | null | undefined> } = {}): string {
  const t = typeof texto === 'string' ? texto : ''
  const contexto = typeof opcoes.contexto === 'string' ? opcoes.contexto : t
  // os compostos citados no filme (D3): "Elon Musk" no contexto torna "Musk, the founder" a mesma pessoa
  const compostos = new Set([...contexto.matchAll(reDaLista2511())].map((m) => m[0]).filter((n) => /\s/u.test(n)).map(chaveDoNome2511))
  const valeNoTexto = (fonte: string, m: RegExpMatchArray): boolean => {
    const nome = m[0]
    if (!aceitaNome2511(nome)) return false
    if (!/\s|\d/u.test(nome) && APOSTO_DEPOIS_2511.test(fonte.slice((m.index ?? 0) + nome.length)) && !compostos.has(chaveDoNome2511(nome))) return false // D3
    return true
  }
  // D4: as pessoas distintas do filme, na ordem (as referências primeiro)
  const chaves: string[] = []
  for (const fonte of [...(opcoes.ordem ?? []).map((n) => String(n ?? '')), contexto]) for (const m of fonte.matchAll(reDaLista2511())) { if (!valeNoTexto(fonte, m)) continue; const k = chaveDoNome2511(m[0]); if (!chaves.includes(k)) chaves.push(k) }
  const rotulo = (k: string): string => (chaves.length <= 1 ? FAMOSO_NO_MOTOR_2511 : ORDINAIS_2511[chaves.indexOf(k)] ?? 'another person')
  let saida = '', desde = 0
  for (const m of t.matchAll(reDaLista2511())) {
    const nome = m[0], fim = (m.index ?? 0) + nome.length
    if ((m.index ?? 0) < desde || !valeNoTexto(t, m)) continue
    let ini = m.index ?? 0
    const titulo = TITULO_COLADO_2511.exec(t.slice(desde, ini))
    if (titulo) ini -= titulo[0].length
    else {
      const nomes = NOMES_ANTES_2511.exec(t.slice(desde, ini)) // D2: "Donald J. Trump", "Lionel Andrés Messi"
      const primeiro = nomes ? nomes[1].trim().split(/\s+/u)[0] : ''
      if (nomes && ehCompostoDaLista2511(primeiro + ' ' + nome)) ini -= nomes[0].length
      else { const iniciais = INICIAIS_ANTES_2511.exec(t.slice(desde, ini)); if (iniciais) ini -= iniciais[0].length } // D2: "E. Musk"
    }
    const hifen = /^-(?=\p{L})/u.exec(t.slice(fim)) // D2: "Obama-era" → "era"
    const comeca = /(?:[.!?]\s+|\n\s*)$/u.test(t.slice(0, ini)) // maiúscula só depois de fim de frase (o cabeçalho do Gemini lê "is a person")
    const r = rotulo(chaveDoNome2511(nome))
    saida += t.slice(desde, ini) + (hifen ? '' : comeca ? r.charAt(0).toUpperCase() + r.slice(1) : r)
    desde = fim + (hifen ? 1 : 0)
  }
  return desde === 0 ? t : saida + t.slice(desde)
}
