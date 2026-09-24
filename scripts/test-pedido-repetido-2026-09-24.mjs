// PEDIDO-REPETIDO-2026-09-24 — guardião (autorização nominal do fundador: "vai no pedido repetido").
// Caso blackmanager284: 6 repetições do mesmo pedido, 18 clipes de IA pagos, 6 filmes prontos para montar.
// Prova: (1) impressão digital estável e sensível a cada campo; (2) gêmeo achado na janela, erro de banco = sem gêmeo;
// (3) espera o resultado do gêmeo e devolve o MESMO filme (mesmo generationId), desiste no prazo; (4) resposta completa
// para o navegador; (5) a rota checa DEPOIS do teto de texto e ANTES de marcar a chegada, fora do dry-run, com falha
// aberta, e grava a impressão digital na chegada e no resultado; (6) mutantes.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const crypto = require('crypto')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { if (n === 'crypto') return crypto; throw new Error('import inesperado ' + n) })
  return m.exports
}
const SRC = rd('lib/fastDispatchDedupe.ts')

// banco simulado: devolve linhas por (name) conforme um roteiro; `falha` simula erro do PostgREST
function fakeDb(roteiro, { falha = false } = {}) {
  const chamadas = []
  return {
    chamadas,
    from() {
      const f = {}
      const q = {
        select() { return q }, eq(c, v) { f[c] = v; return q }, gte(c, v) { f[c + '>='] = v; return q }, order() { return q }, limit() { return q },
        then(res) { chamadas.push({ ...f }); if (falha) return res({ data: null, error: { message: 'boom' } }); return res({ data: roteiro(f, chamadas.length), error: null }) },
      }
      return q
    },
  }
}
const recRow = { session_id: 'gen-gemeo-1', created_at: '2026-09-24T03:33:27Z', metadata: { fingerprint: 'fp', payload: { clip_urls: ['https://a/1.mp4'], voiceover_script: 'fala', scene_captions: ['c'], duration: 35, speed: 1 }, verbatim: false, scenes: ['s1'], ai_scene_index: 0 } }

async function provas(L) {
  const R = []
  const base = { userId: 'u1', prompt: 'AI news in 60 seconds', duration: 60, language: 'en', aspect: '9:16', scriptMode: 'ai' }
  const fp = L.fastRequestFingerprint(base)
  R.push(['(1) mesma entrada → mesma impressão digital', fp === L.fastRequestFingerprint({ ...base }) && /^[0-9a-f]{32}$/.test(fp)])
  R.push(['(1) qualquer campo diferente → impressão diferente', ['userId', 'prompt', 'duration', 'language', 'aspect', 'scriptMode'].every((k) => L.fastRequestFingerprint({ ...base, [k]: k === 'duration' ? 35 : 'x' }) !== fp)])
  R.push(['(1) o texto não aparece na impressão', !fp.includes('AI')])
  const dbGemeo = fakeDb((f) => (f.name === 'generation_dispatch_received' ? [{ created_at: '2026-09-24T03:32:53Z' }] : []))
  R.push(['(2) gêmeo na janela → devolve quando ele chegou', (await L.findRecentTwin(dbGemeo, 'u1', 'fp', Date.parse('2026-09-24T03:33:09Z'))) === '2026-09-24T03:32:53Z'])
  R.push(['(2) procura pela pessoa, pelo nome e pela impressão, dentro de 3 min', dbGemeo.chamadas[0].user_id === 'u1' && dbGemeo.chamadas[0]['metadata->>fingerprint'] === 'fp' && dbGemeo.chamadas[0]['created_at>='] === '2026-09-24T03:30:09.000Z'])
  R.push(['(2) sem gêmeo → null', (await L.findRecentTwin(fakeDb(() => []), 'u1', 'fp')) === null])
  R.push(['(2) erro de banco → null (falha aberta)', (await L.findRecentTwin(fakeDb(() => [], { falha: true }), 'u1', 'fp')) === null])
  // espera: o resultado aparece na 3ª consulta
  let relogio = 0
  let consultasResultado = 0
  const dbTarde = fakeDb((f) => { if (f.name !== 'fast_compose_recoverable') return []; consultasResultado += 1; return consultasResultado >= 3 ? [recRow] : [] })
  const achado = await L.waitForTwinResult(dbTarde, 'u1', 'fp', '2026-09-24T03:32:53Z', { waitMs: 60000, stepMs: 2000, sleep: async (ms) => { relogio += ms }, now: () => relogio })
  R.push(['(3) espera o gêmeo terminar e devolve o resultado dele', achado?.session_id === 'gen-gemeo-1' && consultasResultado === 3 && relogio === 4000])
  relogio = 0
  const nunca = await L.waitForTwinResult(fakeDb(() => []), 'u1', 'fp', 'x', { waitMs: 10000, stepMs: 2000, sleep: async (ms) => { relogio += ms; if (relogio > 600000) throw new Error('espera sem prazo') }, now: () => relogio })
  R.push(['(3) sem resultado no prazo → null (segue o caminho normal)', nunca === null && relogio >= 10000 && relogio <= 12000])
  relogio = 0
  const dbRecusa = fakeDb((f) => (f.name === 'generation_stage_error' && f.path === '/api/generate-video-fast' ? [{ created_at: 'x' }] : []))
  const recusado = await L.waitForTwinResult(dbRecusa, 'u1', 'fp', 'x', { waitMs: 60000, stepMs: 2000, sleep: async (ms) => { relogio += ms; if (relogio > 600000) throw new Error('sem prazo') }, now: () => relogio })
  R.push(['(3) gêmeo recusado pelo servidor → para de esperar na hora (sem 60 s à toa)', recusado === null && relogio === 0])
  R.push(['(3) a recusa procurada é a do SERVIDOR (caminho da rota), não a do navegador', dbRecusa.chamadas.some((c) => c.name === 'generation_stage_error' && c.path === '/api/generate-video-fast' && !('metadata->>fingerprint' in c))])
  relogio = Date.parse('2026-09-24T03:35:00Z')
  const velho = await L.waitForTwinResult(fakeDb(() => []), 'u1', 'fp', '2026-09-24T03:32:00Z', { waitMs: 60000, stepMs: 2000, sleep: async (ms) => { relogio += ms; if (relogio > Date.parse('2026-09-24T04:00:00Z')) throw new Error('sem prazo') }, now: () => relogio })
  R.push(['(3) gêmeo mais velho que a vida máxima da função → não espera', velho === null && relogio === Date.parse('2026-09-24T03:35:00Z')])
  const resp = L.responseFromTwin(recRow, 'AI news in 60 seconds')
  R.push(['(4) mesmo filme: generationId do gêmeo, clipes, fala, legendas, duração', resp?.generationId === 'gen-gemeo-1' && resp.clip_urls.length === 1 && resp.voiceover_script === 'fala' && resp.scene_captions.length === 1 && resp.duration === 35 && resp.mode === 'fast'])
  R.push(['(4) leva modo literal, velocidade, cenas e marca a deduplicação', resp?.verbatim === false && resp.speed === 1 && resp.scenes[0] === 's1' && resp.ai_scene_index === 0 && resp.deduplicated === true])
  R.push(['(4) resultado incompleto não vira resposta', L.responseFromTwin({ session_id: 'g', metadata: { payload: { clip_urls: [] , voiceover_script: 'x' } } }, 'p') === null && L.responseFromTwin({ session_id: null, metadata: recRow.metadata }, 'p') === null])
  return R
}
for (const [n, c] of await provas(roda(SRC))) checa(n, c)

// (5) ligação na rota (trava 8.2, autorizada)
const FAST = rd('app/api/generate-video-fast/route.ts')
const iTeto = FAST.indexOf("return NextResponse.json({ error: 'Prompt is too long (5000 chars max).' }, { status: 400 })")
const iDedupe = FAST.indexOf('const pedidoDigital = fastRequestFingerprint(')
const iChegada = FAST.indexOf("name: 'generation_dispatch_received'")
checa('(5) checagem depois do teto de texto e antes de marcar a chegada', iTeto > 0 && iDedupe > iTeto && iChegada > iDedupe)
checa('(5) dry-run fica fora, e falha aberta com try/catch', FAST.includes('if (body.dry_run !== true && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {') && FAST.includes("console.warn('[generate-fast] PEDIDO-REPETIDO: checagem falhou, segue normal:'"))
checa('(5) só devolve quando a resposta do gêmeo está completa', FAST.includes('if (resposta) return NextResponse.json(resposta)'))
checa('(5) a chegada grava a impressão digital (só o hash)', FAST.slice(iChegada, iChegada + 600).includes('fingerprint: pedidoDigital'))
const iRec = FAST.indexOf('name: RECOVERABLE_EVENT,')
const blocoRec = FAST.slice(iRec, iRec + 900)
checa('(5) o resultado grava impressão, modo literal, velocidade e cenas para o gêmeo', ['fingerprint: pedidoDigital', 'verbatim: ownScript', 'speed: ownScript ? (parsedScript.speed ?? 1) : parsedScript.speed', 'scenes: scenes.map((sc) => sc.description).slice(0, 24)'].every((t) => blocoRec.includes(t)))
checa('(5) cada deduplicação é medida', FAST.includes('name: FAST_DEDUPE_EVENT') && FAST.includes('found: Boolean(resposta), waited_ms: Date.now() - esperaInicio'))

// (6) mutantes
async function mutante(nome, de, para) {
  if (SRC.split(de).length !== 2) { checa(`mutante "${nome}" aplicou`, false); return }
  const m = SRC.replace(de, para)
  checa(`mutante "${nome}" aplicou`, m.includes(para))
  let cai = false
  try { cai = (await provas(roda(m))).some(([, c]) => !c) } catch { cai = true }
  checa(`mutante "${nome}" é pego`, cai)
}
await mutante('impressão ignora a duração', "String(r.duration ?? ''), ", '')
await mutante('espera sem prazo', '    if (now() >= fim) return null\n', '    if (now() >= fim + 1e12) return null\n')
await mutante('ignora a recusa do gêmeo', '      if (recusa.length > 0) return null\n', '')
await mutante('espera gêmeo morto', 'Math.min(now() + waitMs, nascimento + FAST_TWIN_MAX_AGE_MS)', 'now() + waitMs')
await mutante('devolve outro generationId', '    generationId: row.session_id,', "    generationId: 'novo',")
await mutante('erro de banco vira gêmeo', "  if (error || !Array.isArray(data)) return []", "  if (error) return [{ created_at: 'x' }]\n  if (!Array.isArray(data)) return []")

console.log(`test-pedido-repetido-2026-09-24: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
