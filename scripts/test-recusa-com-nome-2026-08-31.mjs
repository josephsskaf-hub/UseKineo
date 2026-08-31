// sprint-v1v4 #18 — KINEO-RECUSA-COM-NOME-2026-08-31
// Prova (A) a aritmética do rótulo, (B) a higiene do detalhe, (C) a ordem do
// `reason`, (D) que o log NÃO carrega texto de cliente e (E) — a lição do
// `sceneTruth` — que as DUAS rotas realmente CHAMAM a peça.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// A worktree nao tem node_modules propria: o compilador vem do repo principal.
// Usar o `transpileModule` do PROPRIO compilador do repo (e nao um strip de
// tipos na mao por regex) prova de quebra que o arquivo COMPILA — licao da #17.
const req = createRequire(import.meta.url)
const ts = req(process.env.KINEO_TS ?? 'typescript')
const src = fs.readFileSync(path.join(raiz, 'lib/stageRefusal.ts'), 'utf8')
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText
const mod = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
const { refusalReason, refusalStage, sanitizeRefusalDetail, buildRefusalEvent, REFUSAL_DETAIL_MAX } = mod

let ok = 0, bad = 0
const t = (nome, cond) => { if (cond) { ok++ } else { bad++; console.error('  ✗', nome) } }

// ── A. rótulo ──────────────────────────────────────────────────────────────
t('401 -> unauthenticated', refusalReason('analyze-idea', 401) === 'srv_analyze_idea_unauthenticated')
t('400 -> bad_input', refusalReason('analyze-idea', 400) === 'srv_analyze_idea_bad_input')
t('500 -> server_error', refusalReason('analyze-idea', 500) === 'srv_analyze_idea_server_error')
t('503 -> upstream (nunca server_error)', refusalReason('generate-script', 503) === 'srv_generate_script_upstream_unavailable')
t('502 -> server_error', refusalReason('generate-script', 502) === 'srv_generate_script_server_error')
t('429 -> rate_limited', refusalReason('generate-script', 429) === 'srv_generate_script_rate_limited')
t('402 -> payment_required', refusalReason('analyze-idea', 402) === 'srv_analyze_idea_payment_required')
t('403 -> refused', refusalReason('analyze-idea', 403) === 'srv_analyze_idea_refused')
t('200 -> unexpected', refusalReason('analyze-idea', 200) === 'srv_analyze_idea_unexpected')
t('hifen vira underscore', !refusalReason('generate-script', 500).includes('-'))
t('as duas rotas dao reason diferente',
  refusalReason('analyze-idea', 500) !== refusalReason('generate-script', 500))
t('stage analyze = analyzing', refusalStage('analyze-idea') === 'analyzing')
t('stage script = scripting', refusalStage('generate-script') === 'scripting')

// vocabulário: nunca inventar estágio novo (o join com o cliente morre)
const VOCAB = ['analyzing', 'scripting']
t('stage sempre do vocabulario do cliente',
  ['analyze-idea', 'generate-script'].every((r) => VOCAB.includes(refusalStage(r))))

// ── B. detalhe ─────────────────────────────────────────────────────────────
t('vazio -> null', sanitizeRefusalDetail('') === null)
t('so espaco -> null', sanitizeRefusalDetail('   \n\t ') === null)
t('nao-string -> null', sanitizeRefusalDetail(undefined) === null && sanitizeRefusalDetail(42) === null)
t('null -> null', sanitizeRefusalDetail(null) === null)
t('colapsa espaco', sanitizeRefusalDetail(' a \n\n b ') === 'a b')
const longo = 'x'.repeat(500)
t('corta no teto', sanitizeRefusalDetail(longo).length === REFUSAL_DETAIL_MAX)
t('corte marca reticencia', sanitizeRefusalDetail(longo).endsWith('…'))
t('curto passa inteiro', sanitizeRefusalDetail('Prompt is required.') === 'Prompt is required.')

// ── C. evento ──────────────────────────────────────────────────────────────
const ev = buildRefusalEvent({ route: 'analyze-idea', httpStatus: 400, detail: 'Prompt is required.' })
t('nome do evento e o que a contagem ja le', ev.name === 'generation_stage_error')
t('path da rota', ev.path === '/api/analyze-idea')
t('grava error_source=server', ev.metadata.error_source === 'server')
t('grava http_status', ev.metadata.http_status === 400)
t('grava stage', ev.metadata.stage === 'analyzing')
t('grava error', ev.metadata.error === 'Prompt is required.')
t('reason correto', ev.metadata.reason === 'srv_analyze_idea_bad_input')

// a regra 1: `reason` DEPOIS do spread — extra hostil não pode sobrescrever
const hostil = buildRefusalEvent({
  route: 'generate-script',
  httpStatus: 500,
  detail: 'boom',
  extra: { reason: 'mentira', stage: 'mentira', http_status: 999, error: 'mentira', error_source: 'cliente' },
})
t('extra NAO sobrescreve reason', hostil.metadata.reason === 'srv_generate_script_server_error')
t('extra NAO sobrescreve stage', hostil.metadata.stage === 'scripting')
t('extra NAO sobrescreve http_status', hostil.metadata.http_status === 500)
t('extra NAO sobrescreve error', hostil.metadata.error === 'boom')
t('extra NAO sobrescreve error_source', hostil.metadata.error_source === 'server')
// (a posicao da chave e herdada do extra em JS; o que importa — e o que a
// colisao de 08/08 quebrou — e o VALOR, provado acima. Com extra limpo, a
// chave tambem cai por ultimo.)
t('com extra limpo, reason e a ULTIMA chave',
  Object.keys(buildRefusalEvent({ route: 'analyze-idea', httpStatus: 400, detail: 'x', extra: { a: 1 } }).metadata).pop() === 'reason')

// sem detalhe -> a chave nem existe (null > string vazia)
const semDetalhe = buildRefusalEvent({ route: 'analyze-idea', httpStatus: 401 })
t('sem detalhe, chave error ausente', !('error' in semDetalhe.metadata))
t('sem detalhe ainda tem reason', semDetalhe.metadata.reason === 'srv_analyze_idea_unauthenticated')
const detalheVazio = buildRefusalEvent({ route: 'analyze-idea', httpStatus: 400, detail: '   ' })
t('detalhe branco nao vira string vazia', !('error' in detalheVazio.metadata))

// extra util sobrevive
const comExtra = buildRefusalEvent({ route: 'analyze-idea', httpStatus: 400, detail: 'x', extra: { prompt_chars: 9000 } })
t('extra util sobrevive', comExtra.metadata.prompt_chars === 9000)

// ── D. a lib nao conhece dinheiro, nem plano, nem texto de cliente ─────────
const PROIBIDO = [/\$\s?\d/, /\bprice\b/i, /\bplan\b/i, /\bupgrade\b/i, /\bcheckout\b/i, /\bcoupon\b/i, /\bStarter\b/, /\bCreator\b/]
for (const re of PROIBIDO) t('lib sem ' + re, !re.test(src))
t('lib sem import (pura)', !/^\s*import\s/m.test(src))
t('lib sem I/O', !/fetch\(|supabase|createClient/i.test(src))

// ── E. LIGADA? (a licao do sceneTruth: biblioteca morta nao conserta nada) ──
const gs = fs.readFileSync(path.join(raiz, 'app/api/generate-script/route.ts'), 'utf8')
const ai = fs.readFileSync(path.join(raiz, 'app/api/analyze-idea/route.ts'), 'utf8')
for (const [nome, txt, fn] of [['generate-script', gs, 'recusar'], ['analyze-idea', ai, 'recusarAnalise']]) {
  t(nome + ' importa buildRefusalEvent', txt.includes("from '@/lib/stageRefusal'"))
  t(nome + ' chama buildRefusalEvent', txt.includes('buildRefusalEvent({'))
  t(nome + ' AWAITA a escrita', /await writeServerEvent\(\{/.test(txt))
  t(nome + ' nao usa void na escrita da recusa',
    !new RegExp('void writeServerEvent\\([^)]*' + fn).test(txt))
  t(nome + ' usa o helper em >=4 saidas', (txt.match(new RegExp('await ' + fn + '\\(', 'g')) || []).length >= 4)
}
// nenhuma saida de erro ficou com o NextResponse cru na rota curta
const crus = [...gs.matchAll(/return NextResponse\.json\([^;]*?status:\s*(\d{3})/gs)]
  .map((m) => Number(m[1])).filter((c) => c >= 400)
t('generate-script: nenhum erro sem rastro (menos os 503 de quota que ja gravam)',
  crus.every((c) => c === 503))
const crusAi = [...ai.matchAll(/return NextResponse\.json\([^;]*?status:\s*(\d{3})/gs)]
  .map((m) => Number(m[1])).filter((c) => c >= 400)
t('analyze-idea: nenhuma saida de erro sem rastro, ' + JSON.stringify(crusAi), crusAi.length === 0)

console.log(`\n${ok} ok, ${bad} falhas`)
process.exit(bad ? 1 : 0)
