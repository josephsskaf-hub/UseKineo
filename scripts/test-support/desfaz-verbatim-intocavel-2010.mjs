// [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] KINEO-VERBATIM-INTOCAVEL-2010 — desfaz, em memória, a entrega
// que fez roteiroCabeNoFilmeCurto (lib/growth/entradaSeedance15.ts) contar a FALA (parseUserScript(...).narration) em vez do
// texto cru. Camada mais nova da cadeia:
//   · lib/growth/entradaSeedance15.ts: o import novo some, o bloco de comentário some e a linha de contagem volta a ser a crua;
//   · as reâncoras nos guardiões alheios (só acréscimos de linha com a marca): saem as linhas marcadas, na contagem da tabela.
// Par que não casa / contagem errada = null (semVerbatimIntocavel2010) ou erro (semVerbatimIntocavel2010NaCadeia) — nunca
// "desfaz" em silêncio.
export const MARCA_VERBATIM_INTOCAVEL_2010 = 'KINEO-VERBATIM-INTOCAVEL-2010'
export const ARQUIVOS_VERBATIM_INTOCAVEL_2010 = ['lib/growth/entradaSeedance15.ts']
/** Guardiões/desfaz alheios reancorados por esta entrega → quantas linhas marcadas cada um ganhou (só acréscimos). */
export const ACRESCIMOS_REANCORA_VERBATIM_INTOCAVEL_2010 = {
  'scripts/test-mcp-studio-2010.mjs': 3,
  'scripts/test-meta95-personagem-2010.mjs': 2,
  'scripts/test-support/desfaz-avatar-preso-2010.mjs': 2,
  'scripts/test-avatar-preso-2010.mjs': 1,
}
/** Reâncoras que REESCREVEM uma linha (D3 do guardião do avatar preso): [sufixo marcado, trecho novo, trecho da base], e quantas. */
const TAG_D3_AVATAR = ' // reancorado KINEO-VERBATIM-INTOCAVEL-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]: as reâncoras do conserto do verbatim (camada de depois) saem antes da contagem'
export const TROCAS_REANCORA_VERBATIM_INTOCAVEL_2010 = {
  'scripts/test-avatar-preso-2010.mjs': { sufixo: TAG_D3_AVATAR, nova: 'semVerbatimIntocavel2010NaCadeia(rd(rel), rel).split(', base: 'rd(rel).split(', quantas: 2 },
}
export const REANCORAS_VERBATIM_INTOCAVEL_2010 = Object.keys(ACRESCIMOS_REANCORA_VERBATIM_INTOCAVEL_2010)

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

const rel = (p) => String(p ?? '').replace(/\\/g, '/')

/** As reâncoras: tira as linhas marcadas (preserva CRLF). Contagem errada = null. */
function semReancoras(texto, p) {
  const r = rel(p)
  const esperadas = ACRESCIMOS_REANCORA_VERBATIM_INTOCAVEL_2010[r]
  if (esperadas === undefined || typeof texto !== 'string' || !texto.includes(MARCA_VERBATIM_INTOCAVEL_2010)) return texto
  const crlf = texto.includes('\r\n')
  const linhas = texto.replace(/\r\n/g, '\n').split('\n')
  const troca = TROCAS_REANCORA_VERBATIM_INTOCAVEL_2010[r]
  const fora = []
  let tiradas = 0, trocadas = 0
  for (const l of linhas) {
    if (!l.includes(MARCA_VERBATIM_INTOCAVEL_2010)) { fora.push(l); continue }
    if (troca && l.endsWith(troca.sufixo) && l.split(troca.nova).length === 2) { fora.push(l.slice(0, -troca.sufixo.length).replace(troca.nova, troca.base)); trocadas++; continue }
    tiradas++
  }
  if (tiradas !== esperadas || trocadas !== (troca?.quantas ?? 0)) return null
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** A fonte sem esta entrega (null = algum par não casou: texto intocado ou mudado por outra mão). Ordem (arquivo, texto). */
export function semVerbatimIntocavel2010(caminho, src) {
  if (typeof src !== 'string') return src
  const p = rel(caminho)
  if (REANCORAS_VERBATIM_INTOCAVEL_2010.some((a) => p.endsWith(a))) {
    const r = semReancoras(src, REANCORAS_VERBATIM_INTOCAVEL_2010.find((a) => p.endsWith(a)))
    return typeof r === 'string' ? r.replace(/\r\n/g, '\n') : r
  }
  if (!ARQUIVOS_VERBATIM_INTOCAVEL_2010.some((a) => p.endsWith(a))) return src
  const s = src.replace(/\r\n/g, '\n')
  if (!s.includes(MARCA_VERBATIM_INTOCAVEL_2010)) return s // já é a fonte de antes
  if (s.split(IMPORT_NOVO).length !== 2 || s.split(BLOCO_NOVO).length !== 2) return null
  return s.replace(IMPORT_NOVO, '').replace(BLOCO_NOVO, LINHA_VELHA)
}

/** Para a cadeia dos guardiões (ordem (texto, arquivo), como os outros desfaz): só as reâncoras em scripts/, CRLF preservado;
 *  contagem errada = erro. lib/growth/entradaSeedance15.ts passa igual (o guardião desta entrega o desfaz direto). */
export function semVerbatimIntocavel2010NaCadeia(texto, p) {
  if (!rel(p).startsWith('scripts/')) return texto
  const r = semReancoras(texto, p)
  if (r === null) throw new Error(`desfaz-verbatim-intocavel-2010: ${rel(p)} com contagem de linhas marcadas diferente de ${ACRESCIMOS_REANCORA_VERBATIM_INTOCAVEL_2010[rel(p)]}`)
  return r
}
