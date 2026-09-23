// DIRETOR-KINEO-20260923 — guardião do "Diretor Kineo" (sugestão opcional antes do Generate, desenho aprovado
// pelo fundador em 23/09). Prova: (1) literal sem consentimento volta BYTE A BYTE mesmo que o modelo devolva outro
// texto; (2) 35/60/90 honrados — 45 nunca aparece, 4:5 não vira 9:16; (3) a meta de palavras vem da régua por voz
// (lib/speechRate) e do piso do portão (MIN_COVERAGE), sem número redigitado; (4) orientação visual desligada até a
// etiqueta [visual:] existir no analyze-idea, e nunca no Kineo 1; (5) a rota conta o teto ANTES do modelo, não grava
// texto e não toca crédito; (6) o componente não arma o token do Generate, só chama a própria rota, descarta
// resposta atrasada e guarda o original para o Desfazer; (7) está montado no Studio; (8) mutantes.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src, req = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { if (n in req) return req[n]; throw new Error('import inesperado ' + n) })
  return m.exports
}

// A régua real, lida da fonte (o guardião não redigita 3,1/2,3/0,95).
const speechSrc = rd('lib/speechRate.ts')
const base = speechSrc.match(/SPEECH_RATE_BASE[^=]*=\s*\{\s*classic:\s*([\d.]+),\s*hollywood:\s*([\d.]+)\s*\}/)
const RATE = { classic: Number(base?.[1]), hollywood: Number(base?.[2]) }
const MIN_COVERAGE = Number(rd('lib/narrationFit.ts').match(/export const MIN_COVERAGE = ([\d.]+)/)?.[1])
const ASPECTS = ['9:16', '16:9', '1:1', '4:5']
checa('régua lida da fonte (classic/hollywood/MIN_COVERAGE)', RATE.classic > 0 && RATE.hollywood > 0 && MIN_COVERAGE > 0)
checa('ASPECTS do guardião = fonte lib/aspect', rd('lib/aspect.ts').includes("export const ASPECTS = ['9:16', '16:9', '1:1', '4:5'] as const"))
const family = (q) => (/^(cinematic_)?(hollywood|h3|omni|s25)$/.test(String(q).toLowerCase()) ? 'hollywood' : 'classic')
const deps = {
  '@/lib/speechRate': {
    SPEECH_RATE_BASE: RATE,
    speechFamilyForQuality: family,
    speechSecondsOfScript: (q, t) => ({ seconds: t.trim().split(/\s+/).filter(Boolean).length / RATE[family(q)] }),
  },
  '@/lib/narrationFit': { MIN_COVERAGE },
  '@/lib/aspect': { ASPECTS },
}
const SRC = rd('lib/diretor/suggest.ts')
function logica(src = SRC) { return roda(src, deps) }
function prova(L, tag = '') {
  const R = []
  const base = { text: 'My own words, exactly as I wrote them.', mode: 'verbatim', engine: 'seedance', duration: 60, language: 'en', aspect: '9:16', rewriteConsent: false }
  const modelo = JSON.stringify({ text: 'COMPLETELY DIFFERENT TEXT FROM THE MODEL', changes: ['longer'], visual: 'dusk light, stone walls' })
  const semConsent = L.parseDiretorOutput(modelo, base)
  R.push(['literal sem consentimento: nenhuma palavra muda (resposta nula ou texto idêntico)' + tag, semConsent === null || semConsent.text === base.text])
  const comConsent = L.parseDiretorOutput(modelo, { ...base, rewriteConsent: true })
  R.push(['literal COM consentimento: aceita a reescrita' + tag, comConsent?.text === 'COMPLETELY DIFFERENT TEXT FROM THE MODEL' && comConsent.textChanged === true])
  const ideia = L.parseDiretorOutput(modelo, { ...base, mode: 'ai' })
  R.push(['modo ideia: aceita a sugestão' + tag, ideia?.textChanged === true])
  R.push(['orientação visual descartada enquanto [visual:] não existe' + tag, ideia?.visual === null && comConsent?.visual === null])
  const v35 = L.validateDiretorRequest({ ...base, duration: 35 })
  R.push(['35 s aceito e mantido em 35' + tag, v35.ok === true && v35.input.duration === 35])
  const v45 = L.validateDiretorRequest({ ...base, duration: 45 })
  R.push(['45 s recusado (nunca substituído)' + tag, v45.ok === false && v45.error === 'duration_invalid'])
  const v45s = L.validateDiretorRequest({ ...base, duration: '35' })
  R.push(['"35" em string vira 35, não 45' + tag, v45s.ok === true && v45s.input.duration === 35])
  R.push(['4:5 mantido (não vira 9:16)' + tag, L.validateDiretorRequest({ ...base, aspect: '4:5' }).input?.aspect === '4:5'])
  R.push(['formato desconhecido cai no padrão 9:16' + tag, L.validateDiretorRequest({ ...base, aspect: '21:9' }).input?.aspect === '9:16'])
  R.push(['consentimento só com true literal' + tag, L.validateDiretorRequest({ ...base, rewriteConsent: 'yes' }).input?.rewriteConsent === false])
  return R
}
const L = logica()
for (const [n, c] of prova(L)) checa(n, c)

// validação de entrada
checa('texto vazio recusado', L.validateDiretorRequest({ text: '  ', mode: 'ai', engine: 'fast', duration: 60 }).ok === false)
checa('texto acima do teto recusado', L.validateDiretorRequest({ text: 'a'.repeat(L.DIRETOR_MAX_CHARS + 1), mode: 'ai', engine: 'fast', duration: 60 }).error === 'text_too_long')
checa('modo "clip" recusado na rota', L.validateDiretorRequest({ text: 'x', mode: 'clip', engine: 'fast', duration: 60 }).error === 'mode_invalid')
checa('motor com caractere estranho recusado', L.validateDiretorRequest({ text: 'x', mode: 'ai', engine: 'fast; drop', duration: 60 }).error === 'engine_invalid')

// régua
const r60 = L.diretorWordRange('seedance', 60)
checa(`régua clássica 60 s = ${Math.ceil(60 * RATE.classic * Math.max(MIN_COVERAGE, 0.97))}-${Math.ceil(60 * RATE.classic * 1.12)} palavras`, r60.min === Math.ceil(60 * RATE.classic * Math.max(MIN_COVERAGE, 0.97)) && r60.max === Math.ceil(60 * RATE.classic * 1.12))
checa('régua hollywood usa a voz própria (h3)', L.diretorWordRange('h3', 60).wordsPerSecond === RATE.hollywood)
checa('piso da régua >= piso do portão', r60.min >= Math.ceil(60 * RATE.classic * MIN_COVERAGE))
checa('suggest.ts não redigita a régua', !/\b(3\.1|2\.3|0\.95)\b/.test(SRC.replace(/\/\/.*$/gm, '')))
const fitCurto = L.diretorFit('one two three', 'seedance', 60)
checa('estimativa local: 3 palavras não cabem em 60 s', fitCurto.fits === false && fitCurto.coverage < MIN_COVERAGE)

// escopo / chave
checa('Kineo 1 é só texto', L.DIRETOR_TEXT_ONLY_ENGINES.includes('fast'))
checa('[visual:] desligado por padrão', L.DIRETOR_VISUAL_TAG_LIVE === false)
checa('literal sem consentimento: sem escopo (rota responde nothing_to_suggest)', (() => { const s = L.diretorScope({ mode: 'verbatim', engine: 'seedance', rewriteConsent: false }); return !s.mayRewriteText && !s.mayAddVisual })())
const k = { text: 'a', mode: 'ai', engine: 'fast', duration: 60, language: 'en', aspect: '9:16' }
const k0 = L.diretorInputKey(k)
checa('chave muda com texto/motor/duração/idioma/formato/consentimento', ['text', 'engine', 'duration', 'language', 'aspect'].every((f) => L.diretorInputKey({ ...k, [f]: f === 'duration' ? 35 : 'z' }) !== k0) && L.diretorInputKey({ ...k, rewriteConsent: true }) !== k0)
const msgs = L.buildDiretorMessages({ ...k, mode: 'verbatim', rewriteConsent: false }, 'English')
checa('prompt literal sem consentimento manda texto vazio', msgs.system.includes('set "text" to an empty string'))
checa('prompt proíbe inventar fatos', msgs.system.includes('Never invent facts'))
checa('JSON do modelo quebrado = sem sugestão (original intacto)', L.parseDiretorOutput('not json', { ...k, rewriteConsent: false }) === null)

// Com [visual:] ligado (simulação): Kineo 1 continua sem visual; Seedance recebe; literal sem consentimento mantém as palavras.
const LV = logica(SRC.replace('export const DIRETOR_VISUAL_TAG_LIVE = false', 'export const DIRETOR_VISUAL_TAG_LIVE = true'))
const mv = JSON.stringify({ text: 'OTHER', changes: [], visual: 'dusk [light]\nstone' })
const baseV = { text: 'Mine.', mode: 'verbatim', engine: 'seedance', duration: 60, language: 'en', aspect: '9:16', rewriteConsent: false }
checa('simulação [visual:] aplicou', LV.DIRETOR_VISUAL_TAG_LIVE === true)
checa('[visual:] ligado: literal sem consentimento mantém as palavras e ganha só a direção', (() => { const o = LV.parseDiretorOutput(mv, baseV); return o?.text === 'Mine.' && o.visual === 'dusk light stone' })())
checa('[visual:] ligado: Kineo 1 nunca recebe direção visual', LV.parseDiretorOutput(mv, { ...baseV, engine: 'fast' }) === null)

// Rota
const ROUTE = rd('app/api/diretor/suggest/route.ts')
const iCap = ROUTE.indexOf('>= DIRETOR_DAILY_CAP')
const iModel = ROUTE.indexOf('openai.chat.completions.create')
checa('rota: teto diário contado ANTES da chamada ao modelo', iCap > 0 && iModel > iCap)
checa('rota: teto é 429 daily_limit', ROUTE.includes("{ error: 'daily_limit' }, { status: 429 }"))
checa('rota: exige login', ROUTE.includes("{ error: 'sign_in_required' }, { status: 401 }"))
checa('rota: escopo vazio não chama o modelo', ROUTE.indexOf("'nothing_to_suggest'") > 0 && ROUTE.indexOf("'nothing_to_suggest'") < iModel)
const meta = ROUTE.slice(ROUTE.indexOf('metadata: {'), ROUTE.indexOf('},', ROUTE.indexOf('metadata: {')))
checa('rota: telemetria sem texto privado', meta.length > 20 && !/\btext\s*:|input\.text\b(?!\.length)|suggestion\.text\b(?!\.length)/.test(meta))
checa('rota: não toca crédito, débito, render nem token do Generate', !/video_credits|debit|consume_credits|refund|kineo:studio:go|generate-video|analyze-idea|creatomate/i.test(ROUTE.replace(/\/\/.*$/gm, '')))
checa('rota: modelo barato com timeout', ROUTE.includes("model: 'gpt-4o-mini'") && ROUTE.includes('timeout: 20000'))

// Componente
const C = rd('components/DiretorKineo.tsx')
const Cc = C.replace(/\/\/.*$/gm, '')
checa('componente: não arma o token do Generate nem mexe em storage', !/kineo:studio:go|sessionStorage|localStorage/.test(Cc))
checa('componente: um único fetch, para a própria rota', (Cc.match(/fetch\(/g) || []).length === 1 && Cc.includes("fetch('/api/diretor/suggest'"))
checa('componente: não navega', !/router\.|useRouter|location\.href|window\.location/.test(Cc))
checa('componente: consentimento começa desmarcado', Cc.includes('const [consent, setConsent] = useState(false)'))
checa('componente: resposta atrasada é descartada pela chave', Cc.includes('if (liveKey.current !== sentKey) {') && Cc.includes('DIRETOR_CLIENT_EVENTS.stale'))
checa('componente: sugestão exibida vira "desatualizada" quando a chave muda', Cc.includes("requestKey !== key"))
checa('componente: Desfazer devolve o original guardado', Cc.includes('onApply(original.current)') && Cc.includes('original.current = text'))
checa('componente: Manter original não chama onApply', /function keep\(\) \{[^}]*\}/.test(Cc) && !/function keep\(\) \{[^}]*onApply/.test(Cc))
checa('componente: botão literal travado sem consentimento', Cc.includes('(literal && !scope.mayRewriteText)'))
checa('componente: some no modo clip e com texto vazio', Cc.includes("if (mode === 'clip' || !text.trim()) return null"))
const tracks = Cc.split('trackEvent(').slice(1).map((s) => s.slice(0, s.indexOf(')')))
checa('componente: nenhum evento de cliente leva o texto', tracks.length >= 6 && tracks.every((t) => !/\btext\s*[:,}]|draft|original\.current|suggestion\.text\b/.test(t.replace(/text_changed/g, ''))) && !/const meta = \{[^}]*\btext\b/.test(Cc))
checa('componente: sem crédito na cópia ("Nothing is generated or charged")', Cc.includes('Nothing is generated or charged'))

// Montagem no Studio
const S = rd('app/(dashboard)/studio/StudioClient.tsx')
const iMount = S.indexOf('<DiretorKineo ')
checa('Studio: Diretor montado antes da revisão/Generate', iMount > 0 && iMount < S.indexOf('<div className="cost studio-generation-review"'))
checa('Studio: montagem liga texto, modo, motor, duração, idioma, formato e setPrompt', /<DiretorKineo text=\{prompt\} mode=\{scriptMode\} engine=\{engine\} engineName=\{eng\.name\} duration=\{duration\} language=\{language\} aspect=\{aspect\} onApply=\{setPrompt\} \/>/.test(S))
checa('Studio: montado uma única vez', S.split('<DiretorKineo ').length === 2)

// Mutantes — cada um precisa APLICAR (texto inserido presente) e derrubar pelo menos uma prova.
function mutante(nome, de, para, provaFn) {
  const n = SRC.split(de).length - 1
  if (n !== 1) { checa(`mutante "${nome}" aplicou`, false); return }
  const src = SRC.replace(de, para)
  checa(`mutante "${nome}" aplicou`, src.includes(para))
  let cai = false
  try { cai = provaFn(logica(src)).some(([, c]) => !c) } catch { cai = true }
  checa(`mutante "${nome}" é pego`, cai)
}
mutante('literal sempre reescreve', "mayRewriteText: input.mode === 'ai' || input.rewriteConsent === true", 'mayRewriteText: true', (M) => prova(M, ' [m]'))
mutante('duração fora da lista vira 45', "if (!isDiretorDuration(b.duration)) return { ok: false, error: 'duration_invalid' }", 'if (!isDiretorDuration(b.duration)) b.duration = 45', (M) => prova(M, ' [m]'))
mutante('parse ignora o escopo', 'const text = scope.mayRewriteText && proposed', 'const text = proposed', (M) => prova(M, ' [m]'))
mutante('formato só 16:9/1:1', "(ASPECTS as readonly string[]).includes(String(b.aspect))", "(b.aspect === '16:9' || b.aspect === '1:1')", (M) => prova(M, ' [m]'))

console.log(`test-diretor-kineo-2026-09-23: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
