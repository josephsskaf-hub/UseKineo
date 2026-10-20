// [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] KINEO-VERBATIM-INTOCAVEL-2010 — desfaz, em memória, a entrega
// que fez roteiroCabeNoFilmeCurto (lib/growth/entradaSeedance15.ts) contar a FALA (parseUserScript(...).narration) em vez do
// texto cru. Camada mais nova da cadeia: devolve a fonte byte a byte como era antes desta entrega (o import novo some, o
// bloco de comentário some e a linha de contagem volta a ser a crua). Par que não casa = texto intocado → o guardião fica
// vermelho (nunca "desfaz" em silêncio).
export const MARCA_VERBATIM_INTOCAVEL_2010 = 'KINEO-VERBATIM-INTOCAVEL-2010'
export const ARQUIVOS_VERBATIM_INTOCAVEL_2010 = ['lib/growth/entradaSeedance15.ts']

const IMPORT_NOVO = `import { parseUserScript } from '@/lib/scriptParser' // [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] KINEO-VERBATIM-INTOCAVEL-2010 — a régua da FALA da guarda (lib/scriptParser também é pura, zero import)\n`
const BLOCO_NOVO = [
  `  // [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] KINEO-VERBATIM-INTOCAVEL-2010 — conta a FALA, como a guarda do cinematic`,
  `  // (parseUserScript(prompt).narration, palavras por espaço). Antes contava o texto CRU: rótulos (HOOK (0-2s):, MICRO REWARD 2:,`,
  `  // PAYOFF:) e pistas [Pexels: ...] viravam "palavras". Teste de 20/10 (Dino/Ravan/moto, Seedance 15 s, "Use my script as is"):`,
  `  // 41/44/41 palavras faladas (cabem: a guarda aceita até 56) mediam 57/62/62 cruas → "não cabe" → o /generate trocava o`,
  `  // verbatim por modo IA (scriptModeOverride 'ai') e o escritor ACRESCENTAVA ou TROCAVA um bloco de fala (Dino: + "What was that?").`,
  `  // O teaser em modo IA continua só para o roteiro que a guarda recusaria de verdade.`,
  `  const palavras = parseUserScript(String(texto ?? '')).narration.split(/\\s+/).filter(Boolean).length`,
].join('\n') + '\n'
const LINHA_VELHA = `  const palavras = String(texto ?? '').split(/\\s+/).filter(Boolean).length\n`

/** A fonte sem esta entrega (null = algum par não casou: texto intocado ou mudado por outra mão). */
export function semVerbatimIntocavel2010(caminho, src) {
  if (typeof src !== 'string') return src
  const p = String(caminho).replace(/\\/g, '/')
  if (!ARQUIVOS_VERBATIM_INTOCAVEL_2010.some((a) => p.endsWith(a))) return src
  const s = src.replace(/\r\n/g, '\n')
  if (!s.includes(MARCA_VERBATIM_INTOCAVEL_2010)) return s // já é a fonte de antes
  if (s.split(IMPORT_NOVO).length !== 2 || s.split(BLOCO_NOVO).length !== 2) return null
  return s.replace(IMPORT_NOVO, '').replace(BLOCO_NOVO, LINHA_VELHA)
}
