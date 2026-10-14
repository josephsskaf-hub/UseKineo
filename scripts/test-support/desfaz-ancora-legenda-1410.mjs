// KINEO-ANCORA-LEGENDA-1410 — DESFAZ, em memória, os dois ajustes aprovados pelo fundador em 14/10 ("1 sim, 3 sim") para os
// guardiões que conferem estes arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa
// com test-).
//   1. Seedance 1.5 ancora TODAS as cenas (o teto de 6 stills FLUX caiu; orçamento de stills 60 s como Kling/Veo);
//   3. legenda centralizada também em 9:16 (x_alignment '50%'), e no render legado (/api/render).
//
// Toda linha tocada carrega a marca KINEO-ANCORA-LEGENDA-1410. Duas formas, e só elas:
//   · TROCA — a linha da base foi reescrita: reconhecida pelo PREFIXO exato, volta a ser o texto da base;
//   · ACRÉSCIMO — a linha não existia: removida. Cada arquivo tem a CONTAGEM exata de acréscimos.
// Prefixo de troca repetido, troca faltando ou contagem de acréscimos diferente = lança (o guardião fica vermelho): conserto
// pela metade não passa. scripts/test-ancora-legenda-1410.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE o pai do
// primeiro commit marcado.
export const MARCA_ANCORA_LEGENDA_1410 = 'KINEO-ANCORA-LEGENDA-1410'

const ARQUIVOS = {
  'app/api/generate-video-cinematic/route.ts': {
    trocas: [
      ['      const STILL_BUDGET_MS = 60_000 // leave the rest of the route budget for scene submits — KINEO-ANCORA-LEGENDA-1410',
        "      const STILL_BUDGET_MS = anchorEngine === 'kling' || anchorEngine === 'veo' ? 60_000 : 30_000 // leave the rest of the route budget for scene submits"],
      ['      const MAX_ANCHORED_SCENES = scenes.length // KINEO-ANCORA-LEGENDA-1410',
        "      const MAX_ANCHORED_SCENES = anchorEngine === 'kling' || anchorEngine === 'veo' ? scenes.length : 6"],
    ],
    acrescimos: 7,
  },
  'lib/aspect.ts': { trocas: [], acrescimos: 1 },
  'app/api/render/route.ts': { trocas: [], acrescimos: 1 },
}

/** Arquivos que o ajuste tocou (o guardião confere contra o diff real). */
export const ARQUIVOS_ANCORA_LEGENDA_1410 = Object.keys(ARQUIVOS)
/** Forma por arquivo: { trocas, acrescimos }. */
export const FORMA_ANCORA_LEGENDA_1410 = Object.fromEntries(
  Object.entries(ARQUIVOS).map(([k, v]) => [k, { trocas: v.trocas.length, acrescimos: v.acrescimos }]),
)

/** O texto do arquivo `p` de ANTES do ajuste. Preserva CRLF. Idempotente: sem linha marcada, devolve igual. */
export function semAncoraLegenda1410(p, s) {
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
    if (!l.includes(MARCA_ANCORA_LEGENDA_1410)) { out.push(l); continue }
    marcadas++
    const t = spec.trocas.findIndex(([novo]) => l.startsWith(novo))
    if (t >= 0) {
      if (usadas.has(t)) throw new Error(`desfaz-ancora-legenda-1410: troca repetida em ${p}: ${l.slice(0, 120)}`)
      usadas.add(t)
      out.push(spec.trocas[t][1])
      continue
    }
    acrescimos++
  }
  if (marcadas > 0 && (usadas.size !== spec.trocas.length || acrescimos !== spec.acrescimos)) {
    throw new Error(`desfaz-ancora-legenda-1410: forma inesperada em ${p} (trocas ${usadas.size}/${spec.trocas.length}, acréscimos ${acrescimos}/${spec.acrescimos})`)
  }
  const t = out.join('\n')
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/** Forma (caminho, texto) dos guardiões byte a byte: só mexe nos arquivos do ajuste; null/undefined passam direto. */
export function desfazAncoraLegenda1410(p, s) {
  if (s == null || !ARQUIVOS[p]) return s
  return semAncoraLegenda1410(p, s)
}

/** Desfaz pelo CONTEÚDO, para guardiões que leem a rota sem saber o caminho (ler(...) de um só arquivo): tenta cada arquivo
 *  do ajuste cuja forma bate. Texto sem a marca passa igual. */
export function desfazAncoraLegenda1410Texto(s) {
  if (s == null) return s
  const bruto = String(s)
  if (!bruto.includes(MARCA_ANCORA_LEGENDA_1410)) return bruto
  for (const p of ARQUIVOS_ANCORA_LEGENDA_1410) {
    try { return semAncoraLegenda1410(p, bruto) } catch { /* forma de outro arquivo */ }
  }
  throw new Error('desfaz-ancora-legenda-1410: texto marcado que não bate com nenhum arquivo do ajuste')
}

/** Linha do diff que pertence a este ajuste (para guardiões que leem o `git diff` e só aceitam acréscimos). */
export function linhaDaAncoraLegenda1410(linha) {
  return String(linha ?? '').includes(MARCA_ANCORA_LEGENDA_1410)
}

/** As linhas da BASE que o ajuste trocou de propósito no arquivo `p` (para guardiões que leem o `git diff` e só aceitam
 *  acréscimos): na rota do cinematic, as duas linhas do teto (STILL_BUDGET_MS e MAX_ANCHORED_SCENES). */
export function linhasTrocadasAncoraLegenda1410(p) {
  const spec = ARQUIVOS[p]
  return spec ? spec.trocas.flatMap(([, antes]) => antes.split('\n')) : []
}
