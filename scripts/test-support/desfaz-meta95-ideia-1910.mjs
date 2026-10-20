// [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] KINEO-META95-IDEIA-1910 — DESFAZ, em memória, a alavanca A2 da
// meta 95 (ideia solta → escritor marcado do /api/generate-script → fala verbatim) nos arquivos que guardiões conferem BYTE
// A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// A entrega só ACRESCENTA linhas, e toda linha nova carrega a marca KINEO-META95-IDEIA-1910:
//   · na rota do cinematic (app/api/generate-video-cinematic/route.ts): os 2 imports (linhas próprias), a chamada ao escritor
//     e a troca do pedido (logo antes do parseUserScript), e a guarda de meta-texto do caminho antigo (generateScenes,
//     verbatim=false), logo antes do L2B — fora das fatias do construtor que outros guardiões executam isoladas;
//   · em scripts/test-trilha-15s-1610.mjs (protegido pelo guardião do filme rápido): a reâncora que tira os commits desta
//     entrega da conta do selo da trilha;
//   · nos desfaz das camadas anteriores: desfaz-meta95-assunto-1910.mjs chama este PRIMEIRO (encadeamento) e
//     desfaz-filme-rapido-1710.mjs aceita a marca em linhaDoFilmeRapido1710 ("linha de depois da base");
//   · em scripts/test-meta95-assunto-1910.mjs (lia o disco cru): o import e a TROCA do `disco`, que passa por este desfaz.
// Desfaz: cada linha marcada é reconhecida pelo PREFIXO exato do seu arquivo e sai inteira; linha marcada fora dos prefixos,
// prefixo repetido ou conserto pela metade = lança (o guardião fica vermelho). Sem a marca, ou outro arquivo, devolve o texto
// igual (idempotente). Preserva CRLF.
// ENCADEAMENTO: é a camada MAIS NOVA da rota do cinematic. semFilmeRapido1710 (desfaz-filme-rapido-1710.mjs) chama esta
// PRIMEIRO, e linhaDoFilmeRapido1710 aceita a marca desta como "linha de depois da base": todo guardião que já desfazia o
// filme rápido volta à base de sempre sem ser editado.
// scripts/test-meta95-ideia-1910.mjs prova que, desfeito isto, a rota é EXATAMENTE o pai do 1º commit com a marca.
export const MARCA_META95_IDEIA_1910 = 'KINEO-META95-IDEIA-1910'
import { semKitBf1910 } from './desfaz-kit-bf-1910.mjs' // KINEO-KIT-BF-1910 — o Kit Black Friday veio depois: sai PRIMEIRO também na cadeia da meta 95 (texto sem a marca dele passa igual)
export const ROTA_META95_IDEIA_1910 = 'app/api/generate-video-cinematic/route.ts'

export const ACRESCIMOS_META95_IDEIA_1910 = {
  [ROTA_META95_IDEIA_1910]: [
    "import { escreverIdeiaNoServidor, cenasSemMetaTexto, CENA_META_TEXTO_EVENTO } from '@/lib/meta95/ideiaNoEscritor' // KINEO-META95-IDEIA-1910",
    "import { POST as escritorMarcadoDoGenerateScript } from '@/app/api/generate-script/route' // KINEO-META95-IDEIA-1910",
    '    const ideiaNoEscritor = await escreverIdeiaNoServidor({ prompt, scriptMode: body.script_mode, ',
    '    if (ideiaNoEscritor.usar) prompt = ideiaNoEscritor.prompt // KINEO-META95-IDEIA-1910',
    '    if (!verbatim) { const metaDasCenas = cenasSemMetaTexto(scenes, shortCaptionFromVoiceover); if (metaDasCenas.removidas.length) void writeServerEvent({ name: CENA_META_TEXTO_EVENTO, ',
  ],
  'scripts/test-trilha-15s-1610.mjs': [
    "  assuntos.splice(0, assuntos.length, ...assuntos.filter((s) => !s.includes('KINEO-META95-IDEIA-1910'))) // reancorado KINEO-META95-IDEIA-1910",
  ],
  'scripts/test-support/desfaz-filme-rapido-1710.mjs': [
    "import { MARCA_META95_IDEIA_1910 } from './desfaz-meta95-ideia-1910.mjs' // KINEO-META95-IDEIA-1910",
    "  if (typeof l === 'string' && l.includes(MARCA_META95_IDEIA_1910)) return true // KINEO-META95-IDEIA-1910",
  ],
  'scripts/test-support/desfaz-meta95-assunto-1910.mjs': [
    "import { semMeta95Ideia1910 } from './desfaz-meta95-ideia-1910.mjs' // KINEO-META95-IDEIA-1910",
    '  texto = semMeta95Ideia1910(texto, p) // KINEO-META95-IDEIA-1910',
  ],
  'scripts/test-meta95-assunto-1910.mjs': [
    "import { semMeta95Ideia1910 } from './test-support/desfaz-meta95-ideia-1910.mjs' // reancorado KINEO-META95-IDEIA-1910",
    "const disco = (p) => lf(semMeta95Ideia1910(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-META95-IDEIA-1910",
  ],
}
/** TROCA (a linha da base foi reescrita; só no guardião do assunto, que lia o disco cru): prefixo marcado → a linha da base volta no lugar. */
export const TROCAS_META95_IDEIA_1910 = {
  'scripts/test-meta95-assunto-1910.mjs': {
    "const disco = (p) => lf(semMeta95Ideia1910(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-META95-IDEIA-1910": "const disco = (p) => lf(readFileSync(join(ROOT, p), 'utf8'))",
  },
}
/** Compatibilidade: os prefixos da rota. */
export const PREFIXOS_META95_IDEIA_1910 = ACRESCIMOS_META95_IDEIA_1910[ROTA_META95_IDEIA_1910]

/** O texto de `rel` sem a alavanca A2 da meta 95 (padrão: a rota do cinematic). */
export function semMeta95Ideia1910(texto, rel = ROTA_META95_IDEIA_1910) {
  texto = semKitBf1910(texto, rel) // KINEO-KIT-BF-1910 — a camada mais nova sai primeiro
  const prefixos = ACRESCIMOS_META95_IDEIA_1910[rel]
  if (typeof texto !== 'string' || !prefixos || !texto.includes(MARCA_META95_IDEIA_1910)) return texto
  const crlf = texto.includes('\r\n')
  const usados = new Set()
  const fora = []
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_META95_IDEIA_1910)) { fora.push(linha); continue }
    const i = prefixos.findIndex((p) => linha.startsWith(p))
    if (i < 0) throw new Error('desfaz-meta95-ideia-1910: linha com a marca fora dos prefixos conhecidos: ' + linha.slice(0, 120))
    if (usados.has(i)) throw new Error('desfaz-meta95-ideia-1910: prefixo repetido: ' + prefixos[i].slice(0, 80))
    usados.add(i)
    const daBase = (TROCAS_META95_IDEIA_1910[rel] ?? {})[prefixos[i]]
    if (typeof daBase === 'string') fora.push(daBase)
  }
  if (usados.size !== prefixos.length) throw new Error(`desfaz-meta95-ideia-1910: conserto pela metade em ${rel} (${usados.size} de ${prefixos.length} linhas)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazMeta95Ideia1910(rel, texto) {
  return semMeta95Ideia1910(texto, rel)
}
