// ═══ KINEO1-VERBATIM-ESTICA-2026-09-22 — "Use my script as is" no Kineo 1 passa a valer para PROSA ═══
//
// Caso Emily (stefanoszantis06, 22/09 13:16Z, nota 75): a pessoa colou um roteiro de 215 palavras com "Use my script
// as is" (script_mode: 'verbatim'). O Kineo 1 só reconhecia verbatim com marcadores [Pexels: …]; prosa pura caía no
// modo IA, o escritor REESCREVEU a narração em 3ª pessoa e inventou uma cena ("Emily resided in a peaceful suburban
// neighborhood"). Medido (14 d): 10 filmes / 9 pessoas mandaram verbatim sem marcador ao Kineo 1 — todos reescritos.
// Decisão do fundador (22/09): "estica" — o roteiro manda na duração (até 90 s), nunca é reescrito.
//
// Este módulo é puro: divide a prosa em K blocos por FRASE, sem tocar em uma palavra, e dá a cada bloco uma busca
// de reserva (as buscas de verdade vêm do plano de B-roll alinhado por narração, como no modo IA).

const SENTENCE_END = /(?<=[.!?…]["”’)]?)\s+(?=\S)/u

/** Frases da prosa (quebra por pontuação final; parágrafos contam como fronteira). */
export function proseSentences(text: string): string[] {
  return (text ?? '')
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .flatMap((p) => p.replace(/\s+/g, ' ').trim().split(SENTENCE_END))
    .map((s) => s.trim())
    .filter(Boolean)
}

const wordsOf = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

/**
 * K blocos de tamanho parecido (em palavras), respeitando fronteiras de frase. Nunca reordena, nunca corta uma frase,
 * nunca muda uma palavra: `blocks.join(' ')` tem exatamente as palavras da prosa. Com menos frases que K, devolve
 * uma frase por bloco.
 */
export function splitProseIntoBlocks(text: string, k: number): string[] {
  const fs = proseSentences(text)
  if (fs.length === 0) return []
  const alvoBlocos = Math.max(1, Math.min(Math.floor(k), fs.length))
  const total = fs.reduce((a, s) => a + wordsOf(s), 0)
  const alvo = total / alvoBlocos
  const blocks: string[] = []
  let atual: string[] = []
  let acumulado = 0
  for (let i = 0; i < fs.length; i++) {
    const f = fs[i]
    const w = wordsOf(f)
    const restantesFrases = fs.length - i
    const restantesBlocos = alvoBlocos - blocks.length
    // Fecha o bloco quando passou do alvo — mas nunca deixa menos frases que blocos por abrir.
    const fecharAntes = atual.length > 0 && acumulado + w > alvo * 1.15 && restantesBlocos > 1 && restantesFrases >= restantesBlocos
    if (fecharAntes) {
      blocks.push(atual.join(' '))
      atual = []
      acumulado = 0
    }
    atual.push(f)
    acumulado += w
    const restantesBlocosAgora = alvoBlocos - blocks.length
    const restantesFrasesDepois = fs.length - i - 1
    if (restantesBlocosAgora > 1 && restantesFrasesDepois === restantesBlocosAgora - 1) {
      // Só sobrou exatamente uma frase por bloco restante: fecha agora.
      blocks.push(atual.join(' '))
      atual = []
      acumulado = 0
    }
  }
  if (atual.length > 0) blocks.push(atual.join(' '))
  return blocks
}

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'into', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'this', 'that', 'these', 'those', 'he', 'she', 'they', 'her', 'his', 'their', 'you', 'your', 'we', 'our', 'i', 'my', 'me', 'him', 'them', 'not', 'no', 'so', 'if', 'then', 'than', 'when', 'until', 'while', 'as', 'just', 'only', 'ever', 'never', 'exactly', 'whatever', 'something', 'someone', 'one', 'there', 'here', 'do', 'did', 'does', 'had', 'has', 'have', 'came', 'come', 'went', 'go', 'up', 'down', 'out', 'don', 't', 's', 'am', 'pm', 'de', 'da', 'do', 'que', 'um', 'uma', 'o', 'e', 'os', 'as', 'la', 'el', 'y', 'un', 'una', 'le', 'les', 'des', 'et'])

/** Busca de reserva para o bloco: as primeiras 4 palavras "de conteúdo" (sem nomes próprios de pessoa no meio da frase). */
export function fallbackStockQuery(block: string): string {
  const toks = block
    .replace(/[“”"’'.,!?…:;()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < toks.length && out.length < 4; i++) {
    const t = toks[i]
    const low = t.toLowerCase()
    if (low.length < 3 || STOP.has(low)) continue
    if (i > 0 && /^[A-Z][a-z]+$/.test(t)) continue // nome próprio no meio da frase (Emily) não é sujeito filmável
    if (/^\d+$/.test(low)) continue
    out.push(low)
  }
  return out.join(' ')
}
