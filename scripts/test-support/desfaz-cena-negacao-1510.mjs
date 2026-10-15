// KINEO-CENA-NEGACAO-1510 [TRAVA 8.2 — vai do fundador 15/10 "vai, vamos fazer isso rápido"] — DESFAZ, em memória, o conserto
// da negação no Contrato de Cena, para os guardiões que conferem a rota do cinematic (ou o sceneTruth) BYTE A BYTE contra
// uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// O conserto, em uma linha: a fala "no wreckage" deixa de virar exigência de "wreck" no prompt (lib/cinematic/sceneTruth.ts
// detecta a negação ao extrair sujeito/ação) e o claim grava contrato_cena[].negados nos dois caminhos (hollywood e clássico).
//
// Toda linha que o conserto tocou carrega a marca KINEO-CENA-NEGACAO-1510. Três formas, e só elas:
//   · BLOCO — de "// KINEO-CENA-NEGACAO-1510 >>>" até "// <<< KINEO-CENA-NEGACAO-1510" (mais a linha em branco que o
//     antecede) sai inteiro;
//   · TROCA — a linha da base foi reescrita: a linha nova é reconhecida INTEIRA (nunca por prefixo) e volta a ser a da base;
//   · ACRÉSCIMO — a linha não existia: reconhecida inteira e removida.
// Linha marcada que não casa = lança. Com alguma linha marcada, TODAS as entradas daquele arquivo têm de aparecer
// (conserto pela metade também lança). O guardião scripts/test-cena-negacao-1510.mjs prova que, desfeito isto, os dois
// arquivos são EXATAMENTE os do pai do 1º commit com a marca.
//
// ENCADEAMENTO: este é o conserto MAIS NOVO no sceneTruth e na rota do cinematic. Quem já desfaz outros aplica este PRIMEIRO:
//   semContratoClassicos1410(semCenaNegacao1510(texto, p), p)
export const MARCA_CENA_NEGACAO_1510 = 'KINEO-CENA-NEGACAO-1510'

const ROTA = 'app/api/generate-video-cinematic/route.ts'
const LIB = 'lib/cinematic/sceneTruth.ts'
const INICIO_BLOCO = '// KINEO-CENA-NEGACAO-1510 >>>'
const FIM_BLOCO = '// <<< KINEO-CENA-NEGACAO-1510'

const TROCAS = {
  [ROTA]: [
    ["            if (severidadeDe(r.antes.veredicto) !== 'ok' || (contrato.negados?.length ?? 0) > 0) { // KINEO-CENA-NEGACAO-1510 — cena com objeto negado também vai ao claim",
      "            if (severidadeDe(r.antes.veredicto) !== 'ok') {"],
    ["        if (severidadeDe(r.antes.veredicto) !== 'ok' || (contrato.negados?.length ?? 0) > 0) { // KINEO-CENA-NEGACAO-1510 — cena com objeto negado também vai ao claim",
      "        if (severidadeDe(r.antes.veredicto) !== 'ok') {"],
  ],
  [LIB]: [
    ['    if (termo && termoAfirmadoNaFala(fala, e.termos)) achados.push(e.termos[0]) // KINEO-CENA-NEGACAO-1510',
      '    if (termo) achados.push(e.termos[0])'],
    ['    if (termo && termoAfirmadoNaFala(fala, a.termos)) return a.termos[0] // KINEO-CENA-NEGACAO-1510',
      '    if (termo) return a.termos[0]'],
  ],
}
const ACRESCIMOS = {
  [ROTA]: [
    '        negados?: string[] // KINEO-CENA-NEGACAO-1510',
    '                ...(contrato.negados?.length ? { negados: contrato.negados } : {}), // KINEO-CENA-NEGACAO-1510',
    '      negados?: string[] // KINEO-CENA-NEGACAO-1510',
    '            ...(contrato.negados?.length ? { negados: contrato.negados } : {}), // KINEO-CENA-NEGACAO-1510',
  ],
  [LIB]: [
    '  /** Palavras do lexico que a fala NEGA ("no wreckage") — descartadas da exigencia visual. Ausente = nenhuma. */ // KINEO-CENA-NEGACAO-1510',
    '  negados?: string[] // KINEO-CENA-NEGACAO-1510',
    '    ...(extrairNegados(args.falaFinal).length > 0 ? { negados: extrairNegados(args.falaFinal) } : {}), // KINEO-CENA-NEGACAO-1510',
  ],
}
const BLOCOS = { [ROTA]: 0, [LIB]: 1 }

/** Quantas entradas o conserto tem por arquivo — o guardião confere contra o diff real. */
export const FORMA_CENA_NEGACAO_1510 = {
  [ROTA]: { trocas: TROCAS[ROTA].length, acrescimos: ACRESCIMOS[ROTA].length, blocos: BLOCOS[ROTA] },
  [LIB]: { trocas: TROCAS[LIB].length, acrescimos: ACRESCIMOS[LIB].length, blocos: BLOCOS[LIB] },
}

/**
 * O texto de `p` (caminho relativo à raiz, com '/') de ANTES deste conserto. Preserva CRLF se o texto vier em CRLF.
 * Idempotente: sem nada marcado, devolve o texto igual. Arquivo que o conserto não tocou: linha marcada nele = lança.
 */
export function semCenaNegacao1510(s, p = ROTA) {
  if (s == null) return s
  const texto = String(s)
  const crlf = texto.includes('\r\n')
  const trocas = TROCAS[p] ?? []
  const acrescimos = ACRESCIMOS[p] ?? []
  const blocosEsperados = BLOCOS[p] ?? 0
  const usadas = new Set()
  const out = []
  let marcadas = 0
  let blocos = 0
  let dentroDoBloco = false
  for (const l of (crlf ? texto.replace(/\r\n/g, '\n') : texto).split('\n')) {
    if (dentroDoBloco) {
      if (l === FIM_BLOCO) dentroDoBloco = false
      continue
    }
    if (!l.includes(MARCA_CENA_NEGACAO_1510)) { out.push(l); continue }
    marcadas++
    if (l.startsWith(INICIO_BLOCO)) {
      if (out.length === 0 || out[out.length - 1] !== '') throw new Error(`desfaz-cena-negacao-1510: bloco sem linha em branco antes em ${p}`)
      out.pop()
      blocos++
      dentroDoBloco = true
      continue
    }
    const t = trocas.findIndex(([novo], i) => !usadas.has('t' + i) && l === novo)
    if (t >= 0) { usadas.add('t' + t); out.push(trocas[t][1]); continue }
    const a = acrescimos.findIndex((linha, i) => !usadas.has('a' + i) && l === linha)
    if (a >= 0) { usadas.add('a' + a); continue }
    throw new Error(`desfaz-cena-negacao-1510: linha marcada inesperada em ${p}: ` + l.slice(0, 140))
  }
  if (dentroDoBloco) throw new Error(`desfaz-cena-negacao-1510: bloco sem fim em ${p}`)
  if (marcadas > 0 && (usadas.size !== trocas.length + acrescimos.length || blocos !== blocosEsperados)) {
    throw new Error(`desfaz-cena-negacao-1510: forma inesperada em ${p} (${usadas.size} de ${trocas.length + acrescimos.length} entradas, ${blocos} de ${blocosEsperados} blocos)`)
  }
  const t = out.join('\n')
  return crlf ? t.replace(/\n/g, '\r\n') : t
}
