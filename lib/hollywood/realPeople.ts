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

// KINEO-FAMOSO-FORA-DO-TEXTO-2511 [CEO 25/11, parte (b) do famoso] — o nome de uma figura ATUAL (só a lista CONTEMPORARY_FIGURE_RE; nunca a heurística
// título + Nome, que pega personagem inventado como "Captain Rosa") sai do TEXTO que vai ao motor do filme grátis: os planos do Kling 4 e o cabeçalho do
// Gemini. A narração não muda. Palavra solta só conta com maiúscula ("Musk", "Drake", "Trump"); em minúscula é palavra comum ("musk ox", "a drake", "trump
// card"). Nome composto ("elon musk", "taylor swift") conta em qualquer caixa. Um título colado antes ("President Trump", "Mr. Bezos") sai junto.
// Sem nome da lista, o texto volta IDÊNTICO (o filme de hoje, byte a byte).
export const FAMOSO_NO_MOTOR_2511 = 'a person'
const TITULO_COLADO_2511 = /(?:President|Vice\s+President|Prime\s+Minister|Senator|Governor|Chancellor|Mr|Mrs|Ms|Dr|Sir)\.?\s+$/u
export function semFamosoNoTextoDoMotor2511(texto: string): string {
  const t = typeof texto === 'string' ? texto : ''
  const re = new RegExp(CONTEMPORARY_FIGURE_RE.source, 'gi')
  let saida = '', desde = 0
  for (const m of t.matchAll(re)) {
    const nome = m[0]
    if (!/\s|\d/u.test(nome) && !/^\p{Lu}/u.test(nome)) continue // palavra solta em minúscula = palavra comum
    let ini = m.index ?? 0
    const titulo = TITULO_COLADO_2511.exec(t.slice(desde, ini))
    if (titulo) ini -= titulo[0].length
    const antes = t.slice(0, ini)
    const comeca = /(?:[.!?]\s+|\n\s*)$/u.test(antes) // maiúscula só depois de fim de frase (o cabeçalho do Gemini lê "is a person")
    saida += t.slice(desde, ini) + (comeca ? 'A person' : FAMOSO_NO_MOTOR_2511)
    desde = (m.index ?? 0) + nome.length
  }
  return desde === 0 ? t : saida + t.slice(desde)
}
