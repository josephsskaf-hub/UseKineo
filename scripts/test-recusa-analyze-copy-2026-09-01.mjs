// ═══ sprint-v1v4 #23 — KINEO-PRIMEIRA-PORTA-2026-09-01 ═════════════════════
// Prova, sem Next e sem banco, que a porta do /api/analyze-idea:
//   A) responde uma AÇÃO, nunca "try again", nunca promessa que o produto não
//      cumpre sozinho, e nunca o texto da pessoa;
//   B) está LIGADA na rota, nos quatro pontos, com os 400 preservados;
//   C) manda para o banco só CÓDIGO e NÚMERO.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, fail = 0
const t = (nome, cond) => { if (cond) { ok++ } else { fail++; console.error('  ✗ ' + nome) } }

// ── O módulo é TypeScript puro sem import: transpila por remoção de tipos ───
const libSrc = readFileSync(join(raiz, 'lib/analyzeRefusalCopy.ts'), 'utf8')
t('A0 · módulo não importa nada (puro)', !/^\s*import\s/m.test(libSrc))
const jsSrc = libSrc
  .replace(/^export type [\s\S]*?(?=\n\n)/m, '')
  .replace(/^export interface [\s\S]*?^}/gm, '')
  .replace(/: AnalyzeRefusalCode \| null/g, '')
  .replace(/\(code: AnalyzeRefusalCode\)/g, '(code)')
  .replace(/\(value: unknown\)/g, '(value)')
  .replace(/\(body: unknown\)/g, '(body)')
  .replace(/\): string \| null \{/g, ') {')
  .replace(/\): string \{/g, ') {')
  .replace(/\): number \{/g, ') {')
  .replace(/\): AnalyzeRefusalTelemetry \{/g, ') {')
  .replace(/^\s*code: AnalyzeRefusalCode,$/m, '  code,')
  .replace(/^\s*body: unknown,$/m, '  body,')
  .replace(/^\s*promptValue: unknown,$/m, '  promptValue,')
  .replace(/ as Record<string, unknown>/g, '')
  .replace(/export /g, '')
const mod = new Function(`${jsSrc}\nreturn { analyzeRefusalCopy, promptChars, bodyKeys, analyzeRefusalTelemetry }`)()
const { analyzeRefusalCopy, promptChars, bodyKeys, analyzeRefusalTelemetry } = mod

// ── Bloco A · a frase ──────────────────────────────────────────────────────
const COM_FRASE = ['body_malformed', 'prompt_missing', 'prompt_only_camera_tag']
const frases = COM_FRASE.map(c => analyzeRefusalCopy(c))

frases.forEach((f, i) => {
  const c = COM_FRASE[i]
  t(`A1 ${c} · devolve frase`, typeof f === 'string' && f.length > 20)
  t(`A2 ${c} · sem "try again"`, !/try again/i.test(f))
  t(`A3 ${c} · sem "Please try"`, !/please try/i.test(f))
  t(`A4 ${c} · tem verbo de ação`, /(Reload|type|Type|Add|Click|press)/.test(f))
  t(`A5 ${c} · sem promessa de atendimento`, !/(our team|support|contact us|we will|we'll get back)/i.test(f))
  t(`A6 ${c} · sem promessa de dinheiro`, !/(discount|coupon|refund|free credits|we will credit)/i.test(f))
  t(`A7 ${c} · não menciona preço nem plano`, !/(upgrade|plan|\$|USD)/i.test(f))
  t(`A8 ${c} · termina em ponto`, /[.]$/.test(f.trim()))
})
t('A9 · as três frases são diferentes entre si', new Set(frases).size === 3)
t('A10 · prompt_too_long NÃO tem frase aqui (fonte única é analyzeLimits)',
  analyzeRefusalCopy('prompt_too_long') === null)
t('A11 · código desconhecido devolve null, nunca frase errada',
  analyzeRefusalCopy('inventado') === null)
t('A12 · prompt_missing avisa que repetir devolve o mesmo',
  /same message/i.test(analyzeRefusalCopy('prompt_missing')))
t('A13 · body_malformed tranquiliza sobre crédito',
  /no credits were used/i.test(analyzeRefusalCopy('body_malformed')))
t('A14 · nenhuma frase acusa a pessoa de ter deixado vazio ("is required")',
  frases.every(f => !/is required/i.test(f)))

// ── Bloco B · a telemetria não vaza o texto ────────────────────────────────
const SEGREDO = 'the sodder children vanished in 1945 and my email is a@b.com'
const tel = analyzeRefusalTelemetry('prompt_missing', { prompt: SEGREDO, duration: 60 }, SEGREDO)
const telStr = JSON.stringify(tel)
t('B1 · telemetria não contém o texto da pessoa', !telStr.includes('sodder'))
t('B2 · telemetria não contém e-mail', !telStr.includes('@b.com'))
t('B3 · conta os caracteres certos', tel.prompt_chars === SEGREDO.length)
t('B4 · lista as chaves, ordenadas', tel.body_keys === 'duration,prompt')
t('B5 · carimba o código', tel.refusal_code === 'prompt_missing')
t('B6 · marca determinística', tel.deterministic === true)
t('B7 · corpo {} vira "(empty)"', bodyKeys({}) === '(empty)')
t('B8 · corpo null vira "(none)"', bodyKeys(null) === '(none)')
t('B9 · corpo array vira "(none)"', bodyKeys(['a']) === '(none)')
t('B10 · corpo string vira "(none)"', bodyKeys('abc') === '(none)')
t('B11 · prompt não-string conta 0', promptChars(undefined) === 0 && promptChars(42) === 0)
t('B12 · prompt vazio conta 0', promptChars('') === 0)
t('B13 · body_keys tem teto de 120 chars',
  bodyKeys(Object.fromEntries(Array.from({ length: 60 }, (_, i) => ['k' + i, 1]))).length <= 120)
t('B14 · nada aqui lança com entrada podre', (() => {
  try { analyzeRefusalTelemetry('body_malformed', undefined, undefined); return true } catch { return false }
})())

// ── Bloco C · está LIGADA na rota ──────────────────────────────────────────
const rota = readFileSync(join(raiz, 'app/api/analyze-idea/route.ts'), 'utf8')
t('C1 · rota importa o módulo', /from '@\/lib\/analyzeRefusalCopy'/.test(rota))
t('C2 · rota importa analyzeRefusalCopy', /analyzeRefusalCopy,/.test(rota))
t('C3 · rota importa analyzeRefusalTelemetry', /analyzeRefusalTelemetry,/.test(rota))
t('C4 · a frase de desenvolvedor "Prompt is required." SUMIU',
  !rota.includes("'Prompt is required.'"))
t('C5 · a frase de desenvolvedor "Invalid request body." SUMIU da resposta',
  !/error: 'Invalid request body\.'/.test(rota))
t('C6 · as quatro portas carimbam código', ['body_malformed', 'prompt_missing', 'prompt_only_camera_tag', 'prompt_too_long']
  .every(c => rota.includes(`analyzeRefusalTelemetry('${c}'`)))
t('C7 · as três frases novas saem de analyzeRefusalCopy', ['body_malformed', 'prompt_missing', 'prompt_only_camera_tag']
  .every(c => rota.includes(`analyzeRefusalCopy('${c}')`)))
t('C8 · o teto continua com a frase da fonte única',
  rota.includes('analyzePromptTooLongMessage()'))
t('C9 · o teto continua lendo ANALYZE_PROMPT_MAX_CHARS',
  rota.includes('prompt.length > ANALYZE_PROMPT_MAX_CHARS'))
t('C10 · os quatro continuam 400 (nenhum virou 200 nem 500)',
  (rota.match(/recusarAnalise\(\s*\n?\s*400,/g) || []).length >= 4)
t('C11 · o 401 de não-logado continua de pé',
  rota.includes("recusarAnalise(401, { error: 'You must be signed in.' }"))
t('C12 · o 500 de config continua de pé',
  rota.includes("'AI service is not configured.'"))
t('C13 · o catch geral continua respondendo 500',
  /recusarAnalise\(\s*\n?\s*500,\s*\n?\s*\{ error: 'Analysis failed\. Please try again\.' \}/.test(rota))
t('C14 · a recusa continua sendo await (nunca void)',
  !/void recusarAnalise\(/.test(rota))
t('C15 · o degradado da OpenAI (200 com brief estático) NÃO virou recusa',
  rota.includes("reason: looksOpenAiQuotaDead(err)") && rota.includes('http_status: 200'))
t('C16 · nenhuma porta manda o prompt para o evento',
  !/prompt_text|raw_prompt|promptRaw:/.test(rota))
t('C17 · bodyCru guardado só depois do parse',
  rota.includes('bodyCru = body'))
t('C18 · o fast-path viral continua intacto', rota.includes('parseViralScriptSections(prompt)'))
t('C19 · o fast-path verbatim continua intacto', rota.includes('splitVerbatimScript'))
t('C20 · a tag [camera: …] continua sendo extraída',
  rota.includes("promptRaw.match(/\\[camera:"))

// ── Fecho ──────────────────────────────────────────────────────────────────
console.log(`\n${ok} verificações ok, ${fail} falha(s).`)
process.exit(fail ? 1 : 0)
