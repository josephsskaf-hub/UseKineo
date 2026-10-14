// KINEO-PARCEIRO-EYEBIBLE-1410 — DESFAZ, em memória, o conserto do filme do parceiro Robert/EyeBible (14/10) para os guardiões
// que conferem estes arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Toda linha que o conserto tocou carrega a marca KINEO-PARCEIRO-EYEBIBLE-1410. Duas formas, e só elas:
//   · TROCA — a linha da base foi reescrita: reconhecida pelo PREFIXO exato, volta a ser o texto da base (às vezes 3 linhas);
//   · ACRÉSCIMO — a linha não existia: removida. Cada arquivo tem a CONTAGEM exata de acréscimos.
// Prefixo de troca repetido, troca faltando ou contagem de acréscimos diferente = lança (o guardião fica vermelho): conserto
// pela metade não passa. scripts/test-parceiro-eyebible-1410.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE o pai
// do commit do conserto. lib/cinematic/duracaoDoFilme.ts é arquivo NOVO: não existe na base, não há o que desfazer.
export const MARCA_PARCEIRO_EYEBIBLE_1410 = 'KINEO-PARCEIRO-EYEBIBLE-1410'

const ARQUIVOS = {
  'app/api/compose/route.ts': {
    trocas: [
      ['        duration: duracaoDoFilmeAssinada({ pedida: duration, quality, claimResponse: cinematicBirthClaim?.response }), // KINEO-PARCEIRO-EYEBIBLE-1410',
        '        duration,'],
    ],
    acrescimos: 1,
  },
  'lib/aspect.ts': { trocas: [], acrescimos: 5 },
  'lib/compose.ts': { trocas: [], acrescimos: 1 },
  'lib/cinematic/visualMode.ts': { trocas: [], acrescimos: 14 },
  'lib/cinematic/verbatimBeats.ts': {
    trocas: [
      ['  const cortes = cortesNaFrase(words, beatCount, baseSize, extra) // KINEO-PARCEIRO-EYEBIBLE-1410', '  let offset = 0'],
      ['    const voiceover = words.slice(cortes[index], cortes[index + 1]).join(\' \') // KINEO-PARCEIRO-EYEBIBLE-1410',
        '    const size = baseSize + (index < extra ? 1 : 0)\n    const voiceover = words.slice(offset, offset + size).join(\' \')\n    offset += size'],
    ],
    acrescimos: 27,
  },
  'lib/musicDirection.ts': {
    trocas: [
      ["export type MusicEmotion = 'grief' | 'celebration' | 'tension' | 'calm' | 'neutral' | 'conflict' // KINEO-PARCEIRO-EYEBIBLE-1410",
        "export type MusicEmotion = 'grief' | 'celebration' | 'tension' | 'calm' | 'neutral'"],
      ["  const scores = (['grief', 'celebration', 'tension', 'calm', 'conflict'] as const) // KINEO-PARCEIRO-EYEBIBLE-1410",
        "  const scores = (['grief', 'celebration', 'tension', 'calm'] as const)"],
      ['  return semConflito.filter(x => x.score > 0).sort((a, b) => b.score - a.score)[0]?.emotion ?? null // KINEO-PARCEIRO-EYEBIBLE-1410',
        '  return scores.filter(x => x.score > 0).sort((a, b) => b.score - a.score)[0]?.emotion ?? null'],
      ["    mood: mood ?? ({ grief: 'emotional', celebration: 'emotional', tension: 'suspense', calm: 'nature', neutral: 'suspense', conflict: 'suspense' } as const)[emotion], // KINEO-PARCEIRO-EYEBIBLE-1410",
        "    mood: mood ?? ({ grief: 'emotional', celebration: 'emotional', tension: 'suspense', calm: 'nature', neutral: 'suspense' } as const)[emotion],"],
    ],
    acrescimos: 5,
  },
  'lib/scriptParser.ts': {
    trocas: [
      ['function cleanNarration(raw: string, lenient = false, roteiroDeCinema = true, cenaDeDialogo = contaFalasDePersonagem(raw) >= 2): string { // KINEO-PARCEIRO-EYEBIBLE-1410',
        'function cleanNarration(raw: string, lenient = false, roteiroDeCinema = true): string {'],
      ['    const voiceover = cleanNarration(text.slice(end, followEnd), false, true, contaFalasDePersonagem(text) >= 2) // KINEO-PARCEIRO-EYEBIBLE-1410',
        '    const voiceover = cleanNarration(text.slice(end, followEnd))'],
    ],
    acrescimos: 36,
  },
}

/** Arquivos que o conserto tocou (o guardião confere contra o diff real). */
export const ARQUIVOS_PARCEIRO_EYEBIBLE_1410 = Object.keys(ARQUIVOS)
/** Forma por arquivo: { trocas, acrescimos }. */
export const FORMA_PARCEIRO_EYEBIBLE_1410 = Object.fromEntries(
  Object.entries(ARQUIVOS).map(([k, v]) => [k, { trocas: v.trocas.length, acrescimos: v.acrescimos }]),
)

/** O texto do arquivo `p` de ANTES do conserto. Preserva CRLF. Idempotente: sem linha marcada, devolve igual. */
export function semParceiroEyebible1410(p, s) {
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
    if (!l.includes(MARCA_PARCEIRO_EYEBIBLE_1410)) { out.push(l); continue }
    marcadas++
    const t = spec.trocas.findIndex(([novo]) => l.startsWith(novo))
    if (t >= 0) {
      if (usadas.has(t)) throw new Error(`desfaz-parceiro-eyebible-1410: troca repetida em ${p}: ${l.slice(0, 120)}`)
      usadas.add(t)
      out.push(spec.trocas[t][1])
      continue
    }
    acrescimos++
  }
  if (marcadas > 0 && (usadas.size !== spec.trocas.length || acrescimos !== spec.acrescimos)) {
    throw new Error(`desfaz-parceiro-eyebible-1410: forma inesperada em ${p} (trocas ${usadas.size}/${spec.trocas.length}, acréscimos ${acrescimos}/${spec.acrescimos})`)
  }
  const t = out.join('\n')
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/** Forma (caminho, texto) dos guardiões byte a byte: só mexe nos arquivos do conserto; null/undefined passam direto. */
export function desfazParceiroEyebible1410(p, s) {
  if (s == null || !ARQUIVOS[p]) return s
  return semParceiroEyebible1410(p, s)
}

/** As linhas da BASE que o conserto trocou de propósito no arquivo `p` (para guardiões que leem o `git diff` e só aceitam
 *  acréscimos): no /api/compose, só `        duration,` (vira a duração assinada). */
export function linhasTrocadasParceiroEyebible1410(p) {
  const spec = ARQUIVOS[p]
  return spec ? spec.trocas.flatMap(([, antes]) => antes.split('\n')) : []
}

/** Linha do diff que pertence a este conserto (para guardiões que leem o `git diff` e só aceitam acréscimos). */
export function linhaDoParceiroEyebible1410(linha) {
  return String(linha ?? '').includes(MARCA_PARCEIRO_EYEBIBLE_1410)
}
