// KINEO-MIGRACAO-OPENAI-F1-1410 [TRAVA 8.2 — vai do fundador 14/10 migração OpenAI]
// Guardião do inventário de modelos da OpenAI durante a migração (docs/MIGRACAO-MODELOS-OPENAI-2026-10-14.md).
//
// O que ele garante:
//  1. Nenhuma string crua NOVA de modelo da OpenAI que vai morrer (gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini,
//     tts-1, tts-1-hd, gpt-4o-mini-tts, whisper-1) aparece em app/, lib/ ou components/ fora de lib/aiModels.ts.
//     A régua é a FOTO de 14/10 (arquivo → modelo → quantidade). Arquivo novo com string crua = vermelho;
//     arquivo da foto com MAIS ocorrências = vermelho. Menos ocorrências = verde com aviso (migrou: encolha a foto).
//  2. lib/aiModels.ts guarda EXATAMENTE as strings de hoje (fase 1 não troca modelo nenhum).
//  3. Toda troca "string crua → constante" marcada KINEO-MIGRACAO-OPENAI-F1-1410 aponta para uma constante
//     cujo valor é a mesma string que estava ali (a troca é byte-equivalente em comportamento).
//  4. Imprime a contagem regressiva para os 3 desligamentos.
//
// Conta-se a string ENTRE ASPAS ('x', "x" ou `x`, com ou sem prefixo openai/ e sufixo de data), em código
// ou comentário. Palavra solta em comentário (sem aspas) não conta: não é uso.
//
// Rodar: node scripts/test-modelos-openai-inventario-1410.mjs
// Foto nova (só depois de migrar e conferir): node scripts/test-modelos-openai-inventario-1410.mjs --foto
//
// Mutantes conferidos em disco em 14/10 (os dois deixam o guardião vermelho, rc=1):
//   M1  criar lib/__mutante_inventario.ts com  export const MUT = { model: 'gpt-4o-mini' }
//   M2  em lib/aiModels.ts, trocar  writer: 'gpt-4o',  por  writer: 'gpt-6-luna',
// As mesmas mutações também rodam em memória na seção 4 (autoteste), a cada execução.

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIRS = ['app', 'lib', 'components']
const REGISTRO = 'lib/aiModels.ts'
const MARCA = 'KINEO-MIGRACAO-OPENAI-F1-1410'

const MODELOS = ['gpt-4o-mini-tts', 'gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'tts-1-hd', 'tts-1', 'whisper-1']
// alternância do mais longo para o mais curto: 'gpt-4o-mini' nunca é contado como 'gpt-4o'
const RE_LITERAL = /(['"`])(?:openai\/)?(gpt-4o-mini-tts|gpt-4o-mini|gpt-4o|gpt-4\.1-mini|gpt-4\.1|tts-1-hd|tts-1|whisper-1)(?:-\d{4}-\d{2}-\d{2})?\1/g

// FOTO de 14/10/2026 (origin/main 9b347413 + as 13 trocas desta fase). Arquivo → modelo → quantidade.
const FOTO = {
  'app/api/ad-script/route.ts': { 'gpt-4o': 1 },
  'app/api/admin/llm-fallback-probe/route.ts': { 'gpt-4o': 2, 'gpt-4o-mini': 2 },
  'app/api/ads/auto-brief/route.ts': { 'gpt-4o-mini': 1 },
  'app/api/ads/render/route.ts': { 'tts-1-hd': 1 },
  'app/api/ads/script/route.ts': { 'gpt-4o': 1, 'gpt-4o-mini': 1 },
  'app/api/ads/voice/route.ts': { 'tts-1-hd': 1 },
  'app/api/analyze-idea/route.ts': { 'gpt-4o-mini': 4 },
  'app/api/apply-suggestion/route.ts': { 'gpt-4o-mini': 1 },
  'app/api/demo-script/route.ts': { 'gpt-4o-mini': 1 },
  'app/api/diretor/suggest/route.ts': { 'gpt-4o-mini': 1 },
  'app/api/expand-script/route.ts': { 'gpt-4o': 1 },
  'app/api/generate-avatar/route.ts': { 'tts-1-hd': 1 },
  'app/api/generate-script/route.ts': { 'gpt-4o': 3 },
  'app/api/generate-video-cinematic/route.ts': { 'gpt-4o-mini': 1 },
  'app/api/next-episode/route.ts': { 'gpt-4o-mini': 1 },
  'app/api/render/route.ts': { 'tts-1': 1 },
  'app/api/retry-hollywood-scene/route.ts': { 'gpt-4o-mini': 1 },
  'lib/ads/producao.ts': { 'gpt-4o-mini': 1 },
  'lib/ads/v2Brief.ts': { 'gpt-4o-mini': 1 },
  'lib/ads/v2Research.ts': { 'gpt-4.1-mini': 1 },
  'lib/broll/broll-engine.ts': { 'gpt-4o-mini': 1 },
  'lib/characters.ts': { 'gpt-4o-mini': 1 },
  'lib/cinematic/speechImageAlign.ts': { 'gpt-4o-mini': 1 },
  'lib/compose.ts': { 'gpt-4o-mini': 2, 'tts-1-hd': 2, 'whisper-1': 2 },
  'lib/fastCoherence.ts': { 'gpt-4o-mini': 1 },
  'lib/geo/citationMonitor.ts': { 'gpt-4.1-mini': 1 },
  'lib/hollywood/hostVoice.ts': { 'tts-1-hd': 1 },
  'lib/hollywood/juizStill.ts': { 'gpt-4o-mini': 1 },
  'lib/hollywood/router.ts': { 'gpt-4o': 1 },
  'lib/kineo1/sceneQueries.ts': { 'gpt-4o-mini': 1 },
  'lib/llmFallback.ts': { 'gpt-4o': 1, 'gpt-4o-mini': 1 },
  'lib/narration/elevenlabs.ts': { 'tts-1-hd': 1 },
  'lib/pixabay.ts': { 'gpt-4o-mini': 1 },
  'lib/publishPackServer.ts': { 'gpt-4o-mini': 1 },
  'lib/runway.ts': { 'gpt-4o': 3, 'gpt-4o-mini': 1 },
  'lib/spaces/spaces.ts': { 'gpt-4.1-mini': 1 },
  'lib/temporadaServer.ts': { 'gpt-4o-mini': 2 },
}

// Valores de lib/aiModels.ts na fase 1: as strings de 14/10, nem um caractere a mais.
const REGISTRO_ESPERADO = {
  'AI_TEXT_MODELS.writer': 'gpt-4o',
  'AI_TEXT_MODELS.planner': 'gpt-4o',
  'AI_TEXT_MODELS.scenePlannerLight': 'gpt-4o-mini',
  'AI_TEXT_MODELS.analyzer': 'gpt-4o-mini',
  'AI_TEXT_MODELS.vision': 'gpt-4o-mini',
  'AI_TEXT_MODELS.ads': 'gpt-4o-mini',
  'AI_TEXT_MODELS.adsRetry': 'gpt-4o',
  'AI_TEXT_MODELS.research': 'gpt-4.1-mini',
  'AI_TEXT_MODELS.utility': 'gpt-4o-mini',
  'AI_SPEECH_MODELS.tts': 'tts-1-hd',
  'AI_SPEECH_MODELS.ttsLegacy': 'tts-1',
  AI_TRANSCRIPTION_MODEL: 'whisper-1',
  AI_MODERATION_MODEL: 'omni-moderation-latest',
  AI_EMBEDDING_MODEL: 'text-embedding-3-small',
  AI_IMAGE_MODEL: 'gpt-image-2',
}

const DESLIGA = [
  ['voz: tts-1, tts-1-hd, gpt-4o-mini-tts', '2027-01-06'],
  ['texto: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini', '2027-01-14'],
  ['legendas: whisper-1', '2027-02-26'],
]

let falhas = 0
const checa = (nome, ok, detalhe = '') => {
  if (ok) console.log(`  ok  ${nome}`)
  else { falhas++; console.log(`  XX  ${nome}${detalhe ? `\n      ${detalhe}` : ''}`) }
}
const lf = (s) => s.split('\r\n').join('\n')
const ler = (rel) => lf(readFileSync(join(RAIZ, rel), 'utf8'))

// ── varredura ────────────────────────────────────────────────────────────────
function listar(dir, acc = []) {
  for (const e of readdirSync(join(RAIZ, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`
    if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) listar(rel, acc) }
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)) acc.push(rel)
  }
  return acc
}
export function contar(texto) {
  const c = {}
  for (const m of texto.matchAll(RE_LITERAL)) c[m[2]] = (c[m[2]] ?? 0) + 1
  return c
}
export function comparar(achado, foto) {
  const novos = []
  const encolheu = []
  for (const [arq, porModelo] of Object.entries(achado)) {
    for (const [mod, n] of Object.entries(porModelo)) {
      const permitido = foto[arq]?.[mod] ?? 0
      if (n > permitido) novos.push(`${arq}: ${mod} ×${n} (foto permite ${permitido})`)
    }
  }
  for (const [arq, porModelo] of Object.entries(foto)) {
    for (const [mod, n] of Object.entries(porModelo)) {
      const agora = achado[arq]?.[mod] ?? 0
      if (agora < n) encolheu.push(`${arq}: ${mod} ${n} → ${agora}`)
    }
  }
  return { novos, encolheu }
}
// valor de uma constante do registro: 'AI_TEXT_MODELS.writer' ou 'AI_TRANSCRIPTION_MODEL'
export function valorNoRegistro(reg, chave) {
  const [obj, campo] = chave.split('.')
  if (!campo) {
    const m = reg.match(new RegExp(`export const ${obj} = '([^']+)' as const`))
    return m ? m[1] : null
  }
  const ini = reg.indexOf(`export const ${obj} = {`)
  if (ini < 0) return null
  const fim = reg.indexOf('} as const', ini)
  const bloco = reg.slice(ini, fim)
  const m = bloco.match(new RegExp(`\\n\\s*${campo}: '([^']+)',`))
  return m ? m[1] : null
}

const arquivos = DIRS.flatMap((d) => listar(d)).sort()
const achado = {}
for (const arq of arquivos) {
  if (arq === REGISTRO) continue
  const c = contar(ler(arq))
  if (Object.keys(c).length) achado[arq] = c
}

if (process.argv.includes('--foto')) {
  console.log(JSON.stringify(achado, null, 2))
  process.exit(0)
}

console.log(`Inventário de modelos OpenAI — ${arquivos.length} arquivos em ${DIRS.join(', ')} (${MARCA})`)

// 0. o próprio guardião enxerga o que precisa (guardião parado não prova nada)
checa(`varreu mais de 500 arquivos (${arquivos.length})`, arquivos.length > 500)
checa(`acha os 2 whisper-1 de lib/compose.ts (${achado['lib/compose.ts']?.['whisper-1'] ?? 0})`, achado['lib/compose.ts']?.['whisper-1'] === 2)
checa(`acha o planejador hollywood em gpt-4o (${achado['lib/hollywood/router.ts']?.['gpt-4o'] ?? 0})`, achado['lib/hollywood/router.ts']?.['gpt-4o'] === 1)
checa(`'gpt-4o-mini' não é contado como 'gpt-4o' (analyze-idea: ${JSON.stringify(achado['app/api/analyze-idea/route.ts'])})`, JSON.stringify(achado['app/api/analyze-idea/route.ts']) === '{"gpt-4o-mini":4}')

// 1. nada novo fora do registro
const { novos, encolheu } = comparar(achado, FOTO)
checa(`nenhuma string crua NOVA de modelo fora de ${REGISTRO}`, novos.length === 0,
  `use uma constante de ${REGISTRO} em vez de: ${novos.join(' | ')}`)
if (encolheu.length) console.log(`  ..  migrou (encolha a FOTO deste guardião): ${encolheu.join(' | ')}`)
const total = Object.values(achado).reduce((s, c) => s + Object.values(c).reduce((a, b) => a + b, 0), 0)
const totalFoto = Object.values(FOTO).reduce((s, c) => s + Object.values(c).reduce((a, b) => a + b, 0), 0)
console.log(`  ..  strings cruas hoje: ${total} em ${Object.keys(achado).length} arquivos (foto: ${totalFoto})`)

// 2. o registro guarda as strings de hoje
const reg = ler(REGISTRO)
for (const [chave, esperado] of Object.entries(REGISTRO_ESPERADO)) {
  const v = valorNoRegistro(reg, chave)
  checa(`${REGISTRO}: ${chave} = '${esperado}'`, v === esperado, `achou ${JSON.stringify(v)}: a fase 1 não troca modelo`)
}
for (const [mod, data] of [['tts-1', '2027-01-06'], ['tts-1-hd', '2027-01-06'], ['gpt-4o-mini-tts', '2027-01-06'], ['gpt-4o', '2027-01-14'], ['gpt-4o-mini', '2027-01-14'], ['gpt-4.1', '2027-01-14'], ['gpt-4.1-mini', '2027-01-14'], ['whisper-1', '2027-02-26']]) {
  checa(`${REGISTRO}: OPENAI_SHUTDOWN_DATES['${mod}'] = ${data}`, reg.includes(`'${mod}': '${data}',`))
}

// 3. cada troca marcada aponta para a mesma string que estava ali
const trocas = []
for (const arq of arquivos) {
  if (arq === REGISTRO) continue
  const t = ler(arq)
  if (!t.includes(MARCA)) continue
  for (const linha of t.split('\n')) {
    const m = linha.match(/model: (AI_[A-Z_]+(?:\.[A-Za-z]+)?), \/\/ KINEO-MIGRACAO-OPENAI-F1-1410 = ([\w.-]+)\s*$/)
    if (m) trocas.push({ arq, chave: m[1], era: m[2], importa: t.includes(`from '@/lib/aiModels'`) })
  }
}
checa(`13 trocas marcadas nesta fase (${trocas.length})`, trocas.length === 13, trocas.map((x) => x.arq).join(', '))
for (const x of trocas) {
  const v = valorNoRegistro(reg, x.chave)
  checa(`troca em ${x.arq}: ${x.chave} = '${x.era}' (era a string crua) e importa de @/lib/aiModels`, v === x.era && x.importa, `registro diz ${JSON.stringify(v)}`)
}

// 4. autoteste em memória: as duas mutações que o guardião precisa pegar
{
  const fotoMut = { ...FOTO }
  const m1 = comparar({ ...achado, 'lib/__mutante.ts': contar("const r = await openai.chat.completions.create({ model: 'gpt-4o-mini' })") }, fotoMut)
  checa('autoteste: arquivo novo com string crua fica vermelho', m1.novos.some((x) => x.startsWith('lib/__mutante.ts: gpt-4o-mini')))
  const m2 = comparar({ ...achado, 'app/api/analyze-idea/route.ts': contar(ler('app/api/analyze-idea/route.ts') + "\nmodel: 'gpt-4o-mini',") }, fotoMut)
  checa('autoteste: ocorrência a mais em arquivo da foto fica vermelha', m2.novos.some((x) => x.startsWith('app/api/analyze-idea/route.ts: gpt-4o-mini')))
  const regFake = ["export const AI_TEXT_MODELS = {", "  writer: 'gpt-4o',", '} as const', "export const AI_TRANSCRIPTION_MODEL = 'whisper-1' as const", ''].join('\n')
  const regMut = regFake.replace("writer: 'gpt-4o',", "writer: 'gpt-6-luna',")
  checa('autoteste: o leitor do registro enxerga a troca de valor (gpt-4o → gpt-6-luna)', valorNoRegistro(regFake, 'AI_TEXT_MODELS.writer') === 'gpt-4o' && valorNoRegistro(regMut, 'AI_TEXT_MODELS.writer') === 'gpt-6-luna' && valorNoRegistro(regFake, 'AI_TRANSCRIPTION_MODEL') === 'whisper-1')
  checa("autoteste: \"openai/gpt-4o\" e 'gpt-4o-2024-11-20' contam; palavra solta não", JSON.stringify(contar(`a "openai/gpt-4o" b 'gpt-4o-2024-11-20' c gpt-4o d`)) === '{"gpt-4o":2}')
}

// 5. contagem regressiva
const hoje = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
console.log('\nContagem regressiva (dias corridos a partir de hoje, UTC):')
for (const [o, data] of DESLIGA) {
  const dias = Math.round((new Date(data + 'T00:00:00Z') - hoje) / 86400000)
  const [a, m, d] = data.split('-')
  console.log(`  ${String(dias).padStart(4)} dias até ${d}/${m}/${a} — ${o}${dias <= 30 ? '  ⚠ MENOS DE 30 DIAS' : ''}`)
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO VERDE')
process.exit(falhas ? 1 : 0)
