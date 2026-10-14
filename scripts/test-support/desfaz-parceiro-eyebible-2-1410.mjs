// KINEO-PARCEIRO-EYEBIBLE-2-1410 — DESFAZ, em memória, a 2ª leva do conserto do filme do parceiro Robert/EyeBible (14/10) para
// os guardiões que conferem estes arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa
// com test-).
//
// Toda linha que esta leva tocou carrega a marca KINEO-PARCEIRO-EYEBIBLE-2-1410. Duas formas, e só elas:
//   · TROCA — a linha da base foi reescrita: reconhecida pelo PREFIXO exato, volta a ser o texto da base;
//   · ACRÉSCIMO — a linha não existia: removida. Cada arquivo tem a CONTAGEM exata de acréscimos.
// Prefixo de troca repetido, troca faltando ou contagem de acréscimos diferente = lança (o guardião fica vermelho): conserto
// pela metade não passa. scripts/test-parceiro-eyebible-2-1410.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE o pai
// do commit do conserto (3476f1a8). lib/cinematic/elencoDaHistoria.ts e lib/cinematic/tomDaCena.ts são arquivos NOVOS.
export const MARCA_PARCEIRO_EYEBIBLE_2_1410 = 'KINEO-PARCEIRO-EYEBIBLE-2-1410'

const ARQUIVOS = {
  'lib/narration/niche-mapping.ts': {
    trocas: [
      ['    padraoDaPalavraChave(kw).test(lower) // KINEO-PARCEIRO-EYEBIBLE-2-1410',
        "    new RegExp('\\\\b' + kw.trim().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).test(lower)"],
    ],
    acrescimos: 20,
  },
  'lib/musicDirection.ts': { trocas: [], acrescimos: 6 },
  'lib/scriptParser.ts': { trocas: [], acrescimos: 11 },
  'lib/cinematic/sceneStyle.ts': { trocas: [], acrescimos: 26 },
  'lib/cinematic/visualPromptPolicy.ts': { trocas: [], acrescimos: 4 },
  'app/api/generate-video-cinematic/route.ts': {
    trocas: [
      ['    const styleSuffix = gStyle && (moodDaCena || gStyle.lighting || gStyle.cameraStyle) ?',
        "    const styleSuffix = gStyle && (gStyle.mood || gStyle.lighting || gStyle.cameraStyle) ? `, ${[gStyle.mood, gStyle.lighting, gStyle.cameraStyle].filter(Boolean).join(', ')}, consistent color grade across all scenes` : ''"],
    ],
    acrescimos: 5,
  },
  'app/api/compose/unlock/route.ts': {
    trocas: [
      ['    let duration = (SUPPORTED_DURATIONS as readonly number[]).includes(requestedDuration) // KINEO-PARCEIRO-EYEBIBLE-2-1410',
        '    const duration = (SUPPORTED_DURATIONS as readonly number[]).includes(requestedDuration)'],
    ],
    acrescimos: 14,
  },
  'app/(dashboard)/generate/GenerateClient.tsx': { trocas: [], acrescimos: 3 },
}

/** Arquivos que esta leva tocou (o guardião confere contra o diff real). */
export const ARQUIVOS_PARCEIRO_EYEBIBLE_2_1410 = Object.keys(ARQUIVOS)
/** Forma por arquivo: { trocas, acrescimos }. */
export const FORMA_PARCEIRO_EYEBIBLE_2_1410 = Object.fromEntries(
  Object.entries(ARQUIVOS).map(([k, v]) => [k, { trocas: v.trocas.length, acrescimos: v.acrescimos }]),
)

/** O texto do arquivo `p` de ANTES desta leva. Preserva CRLF. Idempotente: sem linha marcada, devolve igual. */
export function semParceiroEyebible2_1410(p, s) {
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
    if (!l.includes(MARCA_PARCEIRO_EYEBIBLE_2_1410)) { out.push(l); continue }
    marcadas++
    const t = spec.trocas.findIndex(([novo]) => l.startsWith(novo))
    if (t >= 0) {
      if (usadas.has(t)) throw new Error(`desfaz-parceiro-eyebible-2-1410: troca repetida em ${p}: ${l.slice(0, 120)}`)
      usadas.add(t)
      out.push(spec.trocas[t][1])
      continue
    }
    acrescimos++
  }
  if (marcadas > 0 && (usadas.size !== spec.trocas.length || acrescimos !== spec.acrescimos)) {
    throw new Error(`desfaz-parceiro-eyebible-2-1410: forma inesperada em ${p} (trocas ${usadas.size}/${spec.trocas.length}, acréscimos ${acrescimos}/${spec.acrescimos})`)
  }
  const t = out.join('\n')
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/** Forma (caminho, texto) dos guardiões byte a byte: só mexe nos arquivos desta leva; null/undefined passam direto. */
export function desfazParceiroEyebible2_1410(p, s) {
  if (s == null || !ARQUIVOS[p]) return s
  return semParceiroEyebible2_1410(p, s)
}

/** As linhas da BASE que esta leva trocou de propósito no arquivo `p` (para guardiões que leem o `git diff`). */
export function linhasTrocadasParceiroEyebible2_1410(p) {
  const spec = ARQUIVOS[p]
  return spec ? spec.trocas.flatMap(([, antes]) => antes.split('\n')) : []
}

/** Linha do diff que pertence a esta leva (para guardiões que leem o `git diff` e só aceitam acréscimos). */
export function linhaDoParceiroEyebible2_1410(linha) {
  return String(linha ?? '').includes(MARCA_PARCEIRO_EYEBIBLE_2_1410)
}
