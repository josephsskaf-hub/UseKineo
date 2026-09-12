// KINEO-IDEIA-COLADA-2026-09-12 — O TEMA DE 1 CLIQUE NÃO É O TEMA DA PESSOA.
//
// Fichas 7, 9 e 10 do diário dos 20 filmes (12/09): a pessoa clicou numa ideia
// pronta do Studio ("The wave in Alaska that was taller than the Empire State
// Building"), o título ficou na caixa, ela colou a história dela EMBAIXO — e o
// estruturador leu a primeira linha como tema e jogou o texto dela fora. Três
// filmes sobre o Alasca e a Ilha Sentinel para quem queria Lumi e Pipo, 15
// créditos, e o único checkout do dia nasceu de um filme errado.
//
// Puro: quando o texto começa por uma ideia da casa seguida de um texto
// próprio com corpo, a ideia sai e o texto da pessoa manda.
import { SURPRISE_IDEAS } from '@/lib/surpriseIdeas'

export const IDEA_PREFIX_MIN_REST_CHARS = 120

const norm = (s: string) => s.toLowerCase().replace(/[\s–—\-–—:;,.!?"“”'’]+/g, ' ').trim()

export interface PromptIntake {
  text: string
  strippedIdea: string | null
}

/**
 * Se o prompt começa com uma ideia pronta da casa (SURPRISE_IDEAS) e depois
 * dela vem um texto próprio de ≥120 caracteres, devolve só o texto próprio.
 * Caso contrário devolve o prompt intacto.
 */
export function stripIdeaPrefix(prompt: string, ideas: readonly string[] = SURPRISE_IDEAS): PromptIntake {
  const raw = String(prompt ?? '').trim()
  if (!raw) return { text: raw, strippedIdea: null }
  const head = norm(raw.slice(0, 200))
  for (const idea of ideas) {
    const n = norm(idea)
    if (!n || !head.startsWith(n)) continue
    // acha o fim da ideia no texto original (tolerante a pontuação e quebra de linha)
    const re = new RegExp('^\\s*' + idea.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+') + '\\s*[:\\-–—.!?]*\\s*', 'i')
    const m = raw.match(re)
    if (!m) continue
    const rest = raw.slice(m[0].length).trim()
    if (rest.length >= IDEA_PREFIX_MIN_REST_CHARS && norm(rest) !== n) return { text: rest, strippedIdea: idea }
    return { text: raw, strippedIdea: null }
  }
  return { text: raw, strippedIdea: null }
}
