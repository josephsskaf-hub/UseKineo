// KINEO-TRILHA-15S [TRAVA 8.2 — vai do fundador 16/10 "vai nos 2"] — DESFAZ, em memória, o conserto da trilha do Seedance de
// 15 s (e da estrada clássica inteira), para os guardiões que conferem a rota do cinematic ou o visualPromptPolicy BYTE A
// BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// O conserto, em duas linhas: (1) o plano de b-roll do Studio só é aplicado quando as cenas do filme SÃO os blocos dele, um
// por um (lib/cinematic/planoDeBroll.ts); senão é ignorado e o descritor #441 escreve cada imagem pela fala real do clipe;
// (2) no modo sem rosto o protagonista não é mais apagado: mantém o substantivo e ganha forma sem rosto (silhueta de costas,
// figura vista de trás ou mãos em close).
//
// Toda linha que o conserto tocou carrega a marca KINEO-TRILHA-15S. Três formas, e só elas:
//   · BLOCO — de "// KINEO-TRILHA-15S >>>" até "// <<< KINEO-TRILHA-15S" sai inteiro (toda linha dele leva a marca);
//   · TROCA — a linha da base foi reescrita: a linha nova é reconhecida INTEIRA (nunca por prefixo) e volta a ser a da base;
//   · ACRÉSCIMO — a linha não existia: reconhecida inteira e removida.
// Linha marcada que não casa = lança. Com alguma linha marcada, TODAS as entradas daquele arquivo têm de aparecer (conserto
// pela metade também lança). O guardião scripts/test-trilha-15s-1610.mjs prova que, desfeito isto, os dois arquivos são
// EXATAMENTE os do pai do 1º commit com a marca. lib/cinematic/planoDeBroll.ts é arquivo NOVO (não existe na base).
//
// ENCADEAMENTO: este é o conserto MAIS NOVO na rota do cinematic e no visualPromptPolicy. Quem já desfaz outros aplica este
// PRIMEIRO: semCenaNegacao1510(semTrilha15s1610(texto, p), p)
export const MARCA_TRILHA_15S_1610 = 'KINEO-TRILHA-15S'

const ROTA = 'app/api/generate-video-cinematic/route.ts'
const VPP = 'lib/cinematic/visualPromptPolicy.ts'
const INICIO_BLOCO = '// KINEO-TRILHA-15S >>>'
const FIM_BLOCO = '// <<< KINEO-TRILHA-15S'

const TROCAS = {
  [ROTA]: [
    ["    if (planoDeBrollAplicado) { // KINEO-TRILHA-15S — era: if (planScenes.length > 0) {",
      '    if (planScenes.length > 0) {'],
    ["    if (verbatim && !planoDeBrollAplicado && !hollywoodPath) { // KINEO-TRILHA-15S — era: planScenes.length === 0 (com plano fora de posição, o descritor era pulado)",
      '    if (verbatim && planScenes.length === 0 && !hollywoodPath) {'],
  ],
  [VPP]: [
    ["      .replace(/\\s+/g, ' ').replace(/^[\\s,.;:–-]+/, '').trim().split(ROSTO_PROTEGIDO).join('') // KINEO-TRILHA-15S — a marca das palavras mantidas sai aqui",
      "      .replace(/\\s+/g, ' ').replace(/^[\\s,.;:–-]+/, '').trim()"],
  ],
}
const ACRESCIMOS = {
  [ROTA]: [
    "import { decidirPlanoDeBroll } from '@/lib/cinematic/planoDeBroll' // [TRAVA 8.2 — vai do fundador 16/10 \"vai nos 2\"] KINEO-TRILHA-15S (linha própria)",
    "    const decisaoPlanoDeBroll = decidirPlanoDeBroll({ blocosDoPlano: planScenes.length, falasDasCenas: scenes.map((s) => s.voiceover), falasDosBlocos: parsedScript.segments.map((s) => s.voiceover), verbatim }) // KINEO-TRILHA-15S — o plano só vale se as cenas do filme SÃO os blocos dele, um por um (lib/cinematic/planoDeBroll.ts)",
    "    const planoDeBrollAplicado = hollywoodPath ? planScenes.length > 0 : decisaoPlanoDeBroll.aplicar // KINEO-TRILHA-15S — hollywood: como sempre (o planejador dele reescreve as cenas)",
    "    if (!hollywoodPath && planScenes.length > 0 && !planoDeBrollAplicado) { console.log(`[cinematic] KINEO-TRILHA-15S: plano de b-roll ignorado (${decisaoPlanoDeBroll.motivo}: ${planScenes.length} blocos no plano, ${scenes.length} cenas no filme) — cada imagem nasce da fala do próprio clipe`); void writeServerEvent({ name: 'broll_plan_descartado', userId: user.id, path: '/api/generate-video-cinematic', metadata: { generation_id: generationId, ...decisaoPlanoDeBroll, engine: typeof body.engine === 'string' ? body.engine : 'seedance', duration, verbatim, dry_run: body.dry_run === true } }) } // KINEO-TRILHA-15S",
    "        broll_plan: { aplicado: planoDeBrollAplicado, ...decisaoPlanoDeBroll }, // KINEO-TRILHA-15S — o ensaio mostra se o plano de b-roll do Studio foi usado ou ignorado, e por quê",
  ],
  [VPP]: [
    "      .replace(GRUPO_DE_PESSOAS_TEXTO_RE, pessoaSemRosto) // KINEO-TRILHA-15S — protagonista sem rosto, substantivo mantido",
  ],
}
const BLOCOS = { [ROTA]: 0, [VPP]: 1 }

/** Quantas entradas o conserto tem por arquivo — o guardião confere contra o diff real. */
export const FORMA_TRILHA_15S_1610 = {
  [ROTA]: { trocas: TROCAS[ROTA].length, acrescimos: ACRESCIMOS[ROTA].length, blocos: BLOCOS[ROTA] },
  [VPP]: { trocas: TROCAS[VPP].length, acrescimos: ACRESCIMOS[VPP].length, blocos: BLOCOS[VPP] },
}

/** A linha é do conserto? (toda linha nova ou trocada leva a marca — inclusive as do bloco). */
export function linhaDaTrilha15s1610(l) {
  return String(l).includes(MARCA_TRILHA_15S_1610)
}

/** As linhas da BASE que o conserto trocou de propósito em `p` (para os guardiões que contam linha removida no diff). */
export function linhasTrocadasTrilha15s1610(p) {
  return (TROCAS[p] ?? []).map(([, base]) => base)
}

/**
 * O texto de `p` (caminho relativo à raiz, com '/') de ANTES deste conserto. Preserva CRLF se o texto vier em CRLF.
 * Idempotente: sem nada marcado, devolve o texto igual. Arquivo que o conserto não tocou: linha marcada nele = lança.
 */
export function semTrilha15s1610(s, p = ROTA) {
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
    if (!l.includes(MARCA_TRILHA_15S_1610)) { out.push(l); continue }
    marcadas++
    if (l.startsWith(INICIO_BLOCO)) {
      blocos++
      dentroDoBloco = true
      continue
    }
    const t = trocas.findIndex(([novo], i) => !usadas.has('t' + i) && l === novo)
    if (t >= 0) { usadas.add('t' + t); out.push(trocas[t][1]); continue }
    const a = acrescimos.findIndex((linha, i) => !usadas.has('a' + i) && l === linha)
    if (a >= 0) { usadas.add('a' + a); continue }
    throw new Error(`desfaz-trilha-15s-1610: linha marcada inesperada em ${p}: ` + l.slice(0, 140))
  }
  if (dentroDoBloco) throw new Error(`desfaz-trilha-15s-1610: bloco sem fim em ${p}`)
  if (marcadas > 0 && (usadas.size !== trocas.length + acrescimos.length || blocos !== blocosEsperados)) {
    throw new Error(`desfaz-trilha-15s-1610: forma inesperada em ${p} (${usadas.size} de ${trocas.length + acrescimos.length} entradas, ${blocos} de ${blocosEsperados} blocos)`)
  }
  const t = out.join('\n')
  return crlf ? t.replace(/\n/g, '\r\n') : t
}
