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

/**
 * As linhas de continuidade que a rota cola logo depois do EPISODE 1.
 * '' quando o filme não tem assunto utilizável: aí o prompt fica como antes.
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
