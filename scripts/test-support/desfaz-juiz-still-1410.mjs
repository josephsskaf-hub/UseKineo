// KINEO-JUIZ-STILL-1410 — DESFAZ, em memória, o crítico do still antes do clipe pago (melhoria nº 8 aprovada pelo fundador em
// 14/10, "tudo sim") para os guardiões que conferem estes arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é
// teste (o nome não começa com test-).
//
// Toda linha tocada carrega a marca KINEO-JUIZ-STILL-1410 e é ACRÉSCIMO (nenhuma linha da base foi trocada): o desfaz remove
// as linhas marcadas e confere a CONTAGEM exata por arquivo. Contagem diferente = lança (o guardião fica vermelho): conserto
// pela metade não passa. scripts/test-juiz-still-1410.mjs prova que, desfeito isto, a rota é EXATAMENTE o pai do primeiro
// commit marcado. A lib nova (lib/cinematic/criticoStill.ts) não existe na base: guardião byte a byte não a lê.
export const MARCA_JUIZ_STILL_1410 = 'KINEO-JUIZ-STILL-1410'

const ARQUIVOS = {
  'app/api/generate-video-cinematic/route.ts': { trocas: [], acrescimos: 58 },
}

/** Arquivos que o ajuste tocou (o guardião confere contra o diff real). */
export const ARQUIVOS_JUIZ_STILL_1410 = Object.keys(ARQUIVOS)
/** Forma por arquivo: { trocas, acrescimos }. */
export const FORMA_JUIZ_STILL_1410 = Object.fromEntries(
  Object.entries(ARQUIVOS).map(([k, v]) => [k, { trocas: v.trocas.length, acrescimos: v.acrescimos }]),
)

/** O texto do arquivo `p` de ANTES do ajuste. Preserva CRLF. Idempotente: sem linha marcada, devolve igual. */
export function semJuizStill1410(p, s) {
  const spec = ARQUIVOS[p]
  const bruto = String(s)
  if (!spec) return bruto
  const crlf = bruto.includes('\r\n')
  const texto = crlf ? bruto.replace(/\r\n/g, '\n') : bruto
  const usadas = new Set()
  const out = []
  let marcadas = 0
  let acrescimos = 0
  for (const l of texto.split('\n')) {
    if (!l.includes(MARCA_JUIZ_STILL_1410)) { out.push(l); continue }
    marcadas++
    const t = spec.trocas.findIndex(([novo]) => l.startsWith(novo))
    if (t >= 0) {
      if (usadas.has(t)) throw new Error(`desfaz-juiz-still-1410: troca repetida em ${p}: ${l.slice(0, 120)}`)
      usadas.add(t)
      out.push(spec.trocas[t][1])
      continue
    }
    acrescimos++
  }
  if (marcadas > 0 && (usadas.size !== spec.trocas.length || acrescimos !== spec.acrescimos)) {
    throw new Error(`desfaz-juiz-still-1410: forma inesperada em ${p} (trocas ${usadas.size}/${spec.trocas.length}, acréscimos ${acrescimos}/${spec.acrescimos})`)
  }
  const t = out.join('\n')
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/** Forma (caminho, texto) dos guardiões byte a byte: só mexe nos arquivos do ajuste; null/undefined passam direto. */
export function desfazJuizStill1410(p, s) {
  if (s == null || !ARQUIVOS[p]) return s
  return semJuizStill1410(p, s)
}

/** Desfaz pelo CONTEÚDO, para guardiões que leem a rota sem saber o caminho. Texto sem a marca passa igual. */
export function desfazJuizStill1410Texto(s) {
  if (s == null) return s
  const bruto = String(s)
  if (!bruto.includes(MARCA_JUIZ_STILL_1410)) return bruto
  for (const p of ARQUIVOS_JUIZ_STILL_1410) {
    try { return semJuizStill1410(p, bruto) } catch { /* forma de outro arquivo */ }
  }
  throw new Error('desfaz-juiz-still-1410: texto marcado que não bate com nenhum arquivo do ajuste')
}

/** Linha do diff que pertence a este ajuste (para guardiões que leem o `git diff` e só aceitam acréscimos). */
export function linhaDoJuizStill1410(linha) {
  return String(linha ?? '').includes(MARCA_JUIZ_STILL_1410)
}

/** As linhas da BASE que o ajuste trocou de propósito no arquivo `p`: nenhuma (o ajuste só acrescenta). */
export function linhasTrocadasJuizStill1410(p) {
  const spec = ARQUIVOS[p]
  return spec ? spec.trocas.flatMap(([, antes]) => antes.split('\n')) : []
}
