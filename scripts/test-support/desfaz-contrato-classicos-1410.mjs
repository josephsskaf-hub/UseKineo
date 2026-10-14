// KINEO-CONTRATO-CLASSICOS-1410 [TRAVA 8.2 — vai do fundador 14/10] — DESFAZ, em memória, o conserto do Contrato de Cena no
// caminho clássico (Seedance 1.5, Kling 2.5, Veo 3.1, Sora) para os guardiões que conferem a rota do cinematic (ou o
// sceneTruth) BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// O conserto, em uma linha: o gate clássico passa a casar proibido/traição por PALAVRA INTEIRA (palavraInteira: true), loga
// o veredito como o hollywood já logava, e o claim/dry-run gravam a régua que o gate aplicou (contrato_modo). O hollywood
// não passa a flag: o comportamento dele é o de 27/08, byte a byte.
//
// Toda linha que o conserto tocou carrega a marca KINEO-CONTRATO-CLASSICOS-1410. Duas formas, e só elas:
//   · TROCA — a linha da base foi reescrita: a linha nova é reconhecida pelo PREFIXO exato e volta a ser a da base;
//   · ACRÉSCIMO — a linha não existia: reconhecida pelo prefixo exato e removida.
// Linha marcada que não casa com nenhum prefixo = lança. Cada prefixo vale UMA vez por texto. Com alguma linha marcada,
// TODOS os prefixos daquele arquivo têm de aparecer (conserto pela metade também lança). O guardião
// scripts/test-contrato-classicos-1410.mjs prova que, desfeito isto, os dois arquivos são EXATAMENTE os do pai do 1º commit
// com a marca.
//
// ENCADEAMENTO: este é o conserto MAIS NOVO na rota. Quem já desfaz outros (romance, reconexão…) aplica este PRIMEIRO:
//   desfazRomanceAdulto(p, semContratoClassicos1410(texto, p))
export const MARCA_CONTRATO_CLASSICOS_1410 = 'KINEO-CONTRATO-CLASSICOS-1410'

const ROTA = 'app/api/generate-video-cinematic/route.ts'
const LIB = 'lib/cinematic/sceneTruth.ts'

const TROCAS = {
  [ROTA]: [],
  [LIB]: [
    ['  const proibidosEncontrados = [...proibidos].filter((x) => x && contemTermo(p, x, contrato.palavraInteira === true))',
      '  const proibidosEncontrados = [...proibidos].filter((x) => x && p.includes(x))'],
    ['    ? (entradaAcaoDe(contrato.acaoObrigatoria)?.traem ?? []).filter((t) => contemTermo(p, normalizar(t), contrato.palavraInteira === true))',
      '    ? (entradaAcaoDe(contrato.acaoObrigatoria)?.traem ?? []).filter((t) => p.includes(normalizar(t)))'],
    ["      const re = contrato.palavraInteira ? regexPalavraInteira(ruim, 'gi') : new RegExp(",
      "      const re = new RegExp(ruim.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'gi')"],
  ],
}
const ACRESCIMOS = {
  [ROTA]: [
    '          palavraInteira: true, // KINEO-CONTRATO-CLASSICOS-1410',
    '          console.log(`[contrato-cena/classico] cena ${sceneIndex + 1} ${r.antes.veredicto}',
    '        contrato_modo: classicVisualMode, contrato_palavra_inteira: true, // KINEO-CONTRATO-CLASSICOS-1410',
    '      contrato_modo: classicVisualMode, contrato_palavra_inteira: true, // KINEO-CONTRATO-CLASSICOS-1410',
  ],
  [LIB]: [
    '  /** Proibido/traicao so casa PALAVRA INTEIRA',
    '  palavraInteira?: boolean // KINEO-CONTRATO-CLASSICOS-1410',
    '// KINEO-CONTRATO-CLASSICOS-1410 — palavra inteira (+ plural com s)',
    '// e mandava "container ships ed in a port" ao motor',
    'function regexPalavraInteira(termo: string, flags: string): RegExp { // KINEO-CONTRATO-CLASSICOS-1410',
    '  return new RegExp(`(?<![a-z0-9])${termo.replace(',
    '} // KINEO-CONTRATO-CLASSICOS-1410',
    'function contemTermo(textoNormalizado: string, termo: string, palavraInteira: boolean): boolean { // KINEO-CONTRATO-CLASSICOS-1410',
    "  return palavraInteira ? regexPalavraInteira(termo, '').test(textoNormalizado) : textoNormalizado.includes(termo)",
    '} // KINEO-CONTRATO-CLASSICOS-1410',
    '  palavraInteira?: boolean // KINEO-CONTRATO-CLASSICOS-1410',
    '    ...(args.palavraInteira ? { palavraInteira: true } : {}), // KINEO-CONTRATO-CLASSICOS-1410',
  ],
}

/** Quantas entradas o conserto tem por arquivo (trocas, acréscimos) — o guardião confere contra o diff real. */
export const FORMA_CONTRATO_CLASSICOS_1410 = {
  [ROTA]: { trocas: TROCAS[ROTA].length, acrescimos: ACRESCIMOS[ROTA].length },
  [LIB]: { trocas: TROCAS[LIB].length, acrescimos: ACRESCIMOS[LIB].length },
}

/**
 * O texto de `p` (caminho relativo à raiz, com '/') de ANTES deste conserto. Preserva CRLF se o texto vier em CRLF.
 * Idempotente: sem nada marcado, devolve o texto igual. Arquivo que o conserto não tocou: linha marcada nele = lança.
 * Acréscimos repetidos (o "} // marca" e o "palavraInteira?: boolean // marca" aparecem 2×) são consumidos na ordem.
 */
export function semContratoClassicos1410(s, p = ROTA) {
  if (s == null) return s
  const texto = String(s)
  const crlf = texto.includes('\r\n')
  const trocas = TROCAS[p] ?? []
  const acrescimos = ACRESCIMOS[p] ?? []
  const usadas = new Set()
  const out = []
  let marcadas = 0
  for (const l of (crlf ? texto.replace(/\r\n/g, '\n') : texto).split('\n')) {
    if (!l.includes(MARCA_CONTRATO_CLASSICOS_1410)) { out.push(l); continue }
    marcadas++
    const t = trocas.findIndex(([novo], i) => !usadas.has('t' + i) && l.startsWith(novo))
    if (t >= 0) { usadas.add('t' + t); out.push(trocas[t][1]); continue }
    const a = acrescimos.findIndex((pre, i) => !usadas.has('a' + i) && l.startsWith(pre))
    if (a >= 0) { usadas.add('a' + a); continue }
    throw new Error(`desfaz-contrato-classicos-1410: linha marcada inesperada em ${p}: ` + l.slice(0, 140))
  }
  if (marcadas > 0 && usadas.size !== trocas.length + acrescimos.length) {
    throw new Error(`desfaz-contrato-classicos-1410: forma inesperada em ${p} (${usadas.size} de ${trocas.length + acrescimos.length} entradas)`)
  }
  const t = out.join('\n')
  return crlf ? t.replace(/\n/g, '\r\n') : t
}
