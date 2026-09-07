// KINEO-GPT-VERDADE-2026-09-07 — guardião: o veredito do handoff vem de QUEM COBRA.
//
// O DEFEITO: lib/gptHandoff.ts redigitou a régua (3,1/2,3 pal/s, piso 95%) e
// chamava de 'short' o roteiro de 140-165 palavras que o cobrador
// (lib/narrationFit.ts: 2,3 pal/s, cobertura 0,95, e autofitDown que DESCE o
// alvo) renderiza em 60s redondos. E abençoava como só 'short' um roteiro de
// 40 palavras que o Studio recusa depois do cadastro.
//
// Estilo da casa: readFileSync + regex, ZERO import com alias `@/` (72
// guardiões do repo morrem no resolvedor antes da 1ª verificação). A lib agora
// importa @/lib/narrationFit, então não dá para `await import()` nela daqui —
// a aritmética do cobrador é REFEITA a partir das constantes LIDAS do texto de
// lib/narrationFit.ts, e a lib é provada por leitura. Cada verificação imprime
// ok/FAIL; o processo sai != 0 se qualquer uma falhar.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const exists = (rel) => fs.existsSync(path.join(ROOT, rel))
let pass = 0
let fail = 0
const ok = (c, m) => {
  if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) }
}

const LIB = 'lib/gptHandoff.ts'
const COBRADOR = 'lib/narrationFit.ts'
const POST_ROUTE = 'app/api/gpt/handoff/route.ts'
const PAGE = 'app/go/[token]/page.tsx'
const NOT_FOUND = 'app/go/[token]/not-found.tsx'
const NOTICE = 'app/go/[token]/HandoffNotice.tsx'

const lib = read(LIB)
const cobrador = read(COBRADOR)
const postRoute = read(POST_ROUTE)
const page = read(PAGE)

/** `export const NAME = 1.23` lido do TEXTO. */
const numFrom = (src, name) => {
  const m = src.match(new RegExp(`export const ${name} = ([0-9.]+)`))
  return m ? Number(m[1]) : NaN
}

// ═══ (1) A lib consulta o cobrador ══════════════════════════════════════════
console.log('\n(1) lib/gptHandoff.ts importa o cobrador')
{
  const imp = lib.match(/^import \{([^}]*)\} from '@\/lib\/narrationFit'/m)
  const names = imp ? imp[1].split(',').map((s) => s.trim()).filter(Boolean) : []
  ok(Boolean(imp), "(1a) existe `import { … } from '@/lib/narrationFit'` na lib")
  ok(names.includes('narrationFit') && names.includes('autofitDown'), `(1b) importa narrationFit E autofitDown (achados: ${names.join(', ') || 'nenhum'})`)
  ok(names.includes('AUTOFIT_DOWN_FLOOR_SECONDS') && names.includes('AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD'), '(1c) importa os DOIS pisos da descida (clássico e hollywood)')
  ok(!/^\s*import\s/m.test(cobrador), '(1d) lib/narrationFit.ts é pura: zero import (a lib do handoff continua sem banco/rede)')
}

// ═══ (2) As funções novas existem e são exportadas ══════════════════════════
console.log('\n(2) handoffOutcome / describeOutcome exportadas')
{
  ok(/^export function handoffOutcome\(script: string, durationSec: HandoffDuration, engine: HandoffEngine\): HandoffOutcome \{/m.test(lib), '(2a) export function handoffOutcome(script, durationSec, engine): HandoffOutcome')
  ok(/^export function describeOutcome\(o: HandoffOutcome\): string \{/m.test(lib), '(2b) export function describeOutcome(o): string')
  ok(/^export type HandoffOutcomeKind = 'at_target' \| 'shorter_film' \| 'too_short'/m.test(lib), "(2c) HandoffOutcomeKind = 'at_target' | 'shorter_film' | 'too_short'")
  const body = (lib.match(/export function handoffOutcome[\s\S]*?\n\}/) || [''])[0]
  ok(/const fit = narrationFit\(script, durationSec\)/.test(body) && /if \(fit\.ok\)/.test(body), '(2d) o veredito começa em narrationFit(script, durationSec) e `fit.ok` decide at_target')
  ok(/autofitDown\(script, durationSec, \{ floorSeconds: autofitFloorFor\(engine\) \}\)/.test(body) && /if \(descida\.applied\)/.test(body), '(2e) quando não enche, autofitDown(...) com o piso do motor, e `descida.applied` decide shorter_film')
  ok(/missingWords: fit\.missingWords/.test(body) && /kind: 'too_short'/.test(body), '(2f) too_short carrega fit.missingWords do cobrador (não uma conta local)')
  ok(/lost60sFloor: descida\.lost60sFloor/.test(body), '(2g) lost60sFloor vem da descida (TikTok Creator Rewards)')
  const floorFn = (lib.match(/export function autofitFloorFor[\s\S]*?\n\}/) || [''])[0]
  ok(/engineFamily\(engine\) === 'hollywood' \? AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD : AUTOFIT_DOWN_FLOOR_SECONDS/.test(floorFn), '(2h) piso hollywood para a família hollywood, piso clássico para o resto (mesma escolha da rota)')
  // Sem conta própria dentro do veredito: nenhuma das réguas por voz entra ali.
  ok(!/WORDS_PER_SECOND_CLASSIC|WORDS_PER_SECOND_HOLLYWOOD|FIT_SHORT_RATIO|wordsPerSecondFor|estimateHandoff/.test(body), '(2i) handoffOutcome NÃO usa a régua por voz nem estimateHandoff — zero conta redigitada')
}

// ═══ (3) A régua por voz CONTINUA (trava contra o conserto errado) ══════════
console.log('\n(3) as duas réguas por voz não foram unificadas')
{
  ok(/^export const WORDS_PER_SECOND_CLASSIC = 3\.1$/m.test(lib), '(3a) WORDS_PER_SECOND_CLASSIC = 3.1 continua na lib')
  ok(/^export const WORDS_PER_SECOND_HOLLYWOOD = 2\.3$/m.test(lib), '(3b) WORDS_PER_SECOND_HOLLYWOOD = 2.3 continua na lib')
  ok(/^export const FIT_SHORT_RATIO = 0\.95$/m.test(lib) && /^export const FIT_LONG_RATIO = 1\.6$/m.test(lib), '(3c) FIT_SHORT_RATIO/FIT_LONG_RATIO intactos')
  ok(/^export function estimateHandoff\(/m.test(lib) && /^export function describeFit\(/m.test(lib), '(3d) estimateHandoff e describeFit continuam exportadas (o orçamento de palavras é delas)')
  ok(/const min = Math\.round\(durationSec \* WORDS_PER_SECOND_CLASSIC\)/.test(lib), '(3e) pasteWordBudget continua derivando da régua clássica')
}

// ═══ (4) A rota recusa too_short na porta, amarrado à VARIÁVEL ══════════════
console.log('\n(4) POST /api/gpt/handoff')
{
  ok(/const outcome = handoffOutcome\(input\.script, input\.durationSec, input\.engineHint\)/.test(postRoute), '(4a) a rota calcula outcome = handoffOutcome(input.script, input.durationSec, input.engineHint)')
  ok(/if \(outcome\.kind === 'too_short'\) \{[\s\S]{0,400}?return json\(\{ error: describeOutcome\(outcome\), outcome \}, 400\)/.test(postRoute), "(4b) `if (outcome.kind === 'too_short')` → 400 com { error: describeOutcome(outcome), outcome } (um mutante `if (true)` reprova)")
  // O 400 vem ANTES da linha: entre o `if` e o insert não pode haver gravação.
  const idx400 = postRoute.indexOf("if (outcome.kind === 'too_short')")
  const idxInsert = postRoute.indexOf('await insertHandoff(')
  const idxHash = postRoute.indexOf('handoffPayloadHash(input, CHANNEL)')
  ok(idx400 > 0 && idxInsert > idx400 && idxHash > idx400, '(4c) a recusa acontece ANTES de handoffPayloadHash/insertHandoff — too_short não vira linha')
  ok(/outcome,\s*\n\s*outcomeMessage: describeOutcome\(outcome\),/.test(postRoute), '(4d) o 200 carrega outcome e outcomeMessage')
  for (const k of ['words: est.words', 'seconds: est.seconds', 'fit: est.fit', 'fitMessage: describeFit(est, input.durationSec)']) ok(postRoute.includes(k), `(4e) o 200 mantém ${k.split(':')[0]}`)
  ok(/outcome: outcome\.kind,/.test(postRoute) && /effective_seconds: outcome\.effectiveSeconds,/.test(postRoute), '(4f) gpt_handoff_created grava outcome/effective_seconds no metadata (sem coluna nova)')
  ok(!/supabase\/migrations\/.*verdade/.test(postRoute) && !fs.readdirSync(path.join(ROOT, 'supabase/migrations')).some((f) => /outcome/i.test(f)), '(4g) nenhuma migration de outcome: o veredito é recalculado na leitura')
}

// ═══ (4b) O contrato do GPT (public/gpt/openapi.json) conta a MESMA verdade ═
// "A regra vive em vários arquivos": a description do OpenAPI é INSTRUÇÃO que
// o GPT segue, não documentação. Até 07/09 ela mandava citar `fitMessage`
// quando `fit` era 'short' — exatamente a mentira que a página contava.
console.log('\n(4b) public/gpt/openapi.json')
{
  const schema = JSON.parse(read('public/gpt/openapi.json'))
  const op = schema.paths?.['/api/gpt/handoff']?.post
  const resSchema = schema.components?.schemas?.HandoffResponse ?? {}
  const res = resSchema.properties ?? {}
  const d200 = op?.responses?.['200']?.description ?? ''
  const d400 = op?.responses?.['400']?.description ?? ''
  ok(res.outcome?.type === 'object' && res.outcomeMessage?.type === 'string', '(4b-1) HandoffResponse documenta outcome (object) e outcomeMessage (string)')
  ok((resSchema.required ?? []).includes('outcome') && (resSchema.required ?? []).includes('outcomeMessage'), '(4b-2) outcome e outcomeMessage são required (o servidor sempre devolve os dois)')
  const kinds = res.outcome?.properties?.kind?.enum ?? []
  ok(kinds.includes('at_target') && kinds.includes('shorter_film') && !kinds.includes('too_short'), '(4b-3) outcome.kind no 200 = at_target | shorter_film (too_short nunca chega ao 200)')
  ok(/outcome\.kind/.test(d200) && /`outcomeMessage` verbatim/.test(d200) && /`shorter_film`/.test(d200), '(4b-4) a descrição do 200 manda decidir por outcome.kind e citar outcomeMessage verbatim')
  ok(!/if `fit` is `short`, quote `fitMessage`/.test(d200) && /never as a warning/.test(d200), '(4b-5) o 200 NÃO manda mais citar fitMessage como aviso de "short"')
  ok(!/likely to come out under target/.test(res.fit?.description ?? '') && /NOT the verdict/.test(res.fit?.description ?? ''), '(4b-6) a descrição de `fit` diz que ele NÃO é o veredito')
  ok(/too short to fill durationSec/.test(d400) && /`outcome\.missingWords`/.test(d400) && /no link is created/.test(d400), '(4b-7) o 400 explica a recusa por roteiro curto, cita outcome.missingWords e diz que não há link')
  const errOutcome = schema.components?.schemas?.ErrorResponse?.properties?.outcome
  ok(errOutcome?.type === 'object' && (errOutcome.properties?.kind?.enum ?? []).includes('too_short') && !(schema.components?.schemas?.ErrorResponse?.required ?? []).includes('outcome'), '(4b-8) ErrorResponse documenta outcome opcional com kind too_short')
}

// ═══ (5) /go: missing é notFound(), unavailable/expired continuam 200 ═══════
console.log('\n(5) app/go/[token]/page.tsx')
{
  ok(/import \{ notFound, redirect \} from 'next\/navigation'/.test(page), '(5a) importa notFound de next/navigation')
  ok(/if \(!isHandoffToken\(token\)\) notFound\(\)/.test(page), '(5b) token fora do padrão → notFound() (sem tocar o banco)')
  ok(/if \(found\.status === 'missing'\) notFound\(\)/.test(page), '(5c) linha inexistente → notFound()')
  ok(!/<Expired reason="missing"/.test(page), '(5d) a página NÃO renderiza mais <Expired reason="missing" /> (isso é do not-found.tsx)')
  ok(/if \(found\.status === 'unavailable'\) return <Expired reason="unavailable" \/>/.test(page), '(5e) banco fora → 200 "temporarily unavailable" (404 diria "sumiu para sempre")')
  ok(/if \(found\.expired\) return <Expired reason="expired" \/>/.test(page), '(5f) link vencido → 200 com o botão do Studio (link real de pessoa real)')
  const unavailableLine = (page.match(/^.*found\.status === 'unavailable'.*$/m) || [''])[0]
  ok(unavailableLine.length > 0 && !/notFound/.test(unavailableLine), '(5g) o ramo unavailable NÃO chama notFound')
  ok(/const fitLine = describeOutcome\(handoffOutcome\(row\.script, duration, engine\)\)/.test(page) && /\{fitLine\}/.test(page), '(5h) a frase da página = describeOutcome(handoffOutcome(row.script, duration, engine)), recalculada do roteiro')
  ok(!/describeFit/.test(page) && !/row\.fit,? *seconds/.test(page), '(5i) a página não usa mais describeFit nem o fit gravado para a frase')
  ok(/import \{ BUTTON, Expired, MUTED, SOFT, Shell, Wordmark \} from '\.\/HandoffNotice'/.test(page), '(5j) Shell/Wordmark/BUTTON/Expired vêm de ./HandoffNotice (sem duplicar estilo)')
  ok(!/^function Shell\(|^function Expired\(|^const BUTTON/m.test(page), '(5k) page.tsx não redefine Shell/Expired/BUTTON')
}

// ═══ (6) not-found.tsx existe e é a tela "missing" de sempre ════════════════
console.log('\n(6) app/go/[token]/not-found.tsx')
{
  ok(exists(NOT_FOUND), '(6a) o arquivo existe')
  const nf = exists(NOT_FOUND) ? read(NOT_FOUND) : ''
  const notice = exists(NOTICE) ? read(NOTICE) : ''
  ok(/import \{ Expired \} from '\.\/HandoffNotice'/.test(nf) && /return <Expired reason="missing" \/>/.test(nf), '(6b) renderiza <Expired reason="missing" /> do HandoffNotice')
  ok(/export default function/.test(nf) && !/'use client'/.test(nf), '(6c) é server component com export default')
  ok(/does not match any script/.test(notice) && /Open the Studio/.test(notice) && /\/studio\?utm_source=chatgpt_gpt&intent_campaign=kineo_gpt_store_expired/.test(notice), '(6d) o texto "does not match any script" e o botão "Open the Studio" (mesmo link) estão no visual compartilhado')
  ok(/export function Shell\(/.test(notice) && /export function Wordmark\(/.test(notice) && /export const BUTTON: React\.CSSProperties/.test(notice) && /export function Expired\(/.test(notice), '(6e) HandoffNotice exporta Shell, Wordmark, BUTTON, Expired')
  ok(/export const BLUE = '#2997ff'/.test(notice) && /export const MUTED = '#86868b'/.test(notice) && /export const SOFT = '#d2d2d7'/.test(notice), '(6f) mesmas cores de antes (sem CSS novo)')
}

// ═══ (7) unavailable continua 200 — provado de novo pelo texto inteiro ══════
console.log('\n(7) 200 preservado onde deve')
{
  // Toda ocorrência de notFound() na página está numa linha `missing` ou de padrão de token.
  // Só linhas de CÓDIGO: o comentário da página também cita notFound().
  const nfLines = page.split('\n').filter((l) => /notFound\(\)/.test(l) && !/^\s*\/\//.test(l))
  ok(nfLines.length === 2 && nfLines.every((l) => /isHandoffToken\(token\)|status === 'missing'/.test(l)), `(7a) notFound() aparece exatamente 2× e só nos ramos missing/token inválido (${nfLines.length} linhas)`)
  ok(/CONTINUAM 200/.test(page) && /transitória/.test(page), '(7b) o comentário explica por que unavailable/expired ficam 200')
}

// ═══ (8) Aritmética do cobrador, lida do texto ══════════════════════════════
console.log('\n(8) a conta do cobrador (constantes LIDAS de lib/narrationFit.ts)')
{
  const WPS = numFrom(cobrador, 'WORDS_PER_SECOND')
  const MIN = numFrom(cobrador, 'MIN_COVERAGE')
  const MIN_DOWN = numFrom(cobrador, 'MIN_AUTOFIT_DOWN_COVERAGE')
  const FLOOR = numFrom(cobrador, 'AUTOFIT_DOWN_FLOOR_SECONDS')
  const FLOOR_H = numFrom(cobrador, 'AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD')
  const STEP = numFrom(cobrador, 'AUTOFIT_DOWN_STEP_SECONDS')
  ok(WPS === 2.3 && MIN === 0.95, `(8a) lidos: WORDS_PER_SECOND=${WPS}, MIN_COVERAGE=${MIN}`)
  ok(MIN_DOWN === 0.6 && FLOOR === 20 && FLOOR_H === 30 && STEP === 5, `(8b) lidos: MIN_AUTOFIT_DOWN_COVERAGE=${MIN_DOWN}, pisos ${FLOOR}/${FLOOR_H}, degrau ${STEP}`)

  // A régua por voz, lida da lib — para mostrar a divergência que o conserto mata.
  const CLASSIC = numFrom(lib, 'WORDS_PER_SECOND_CLASSIC')
  const SHORT = numFrom(lib, 'FIT_SHORT_RATIO')
  const cobra = (words, target) => {
    const speech = words / WPS
    const okFit = speech / target >= MIN
    if (okFit) return { kind: 'at_target', effective: target }
    if (speech / target < MIN_DOWN) return { kind: 'too_short' }
    const cand = Math.floor(speech / STEP) * STEP
    if (cand < FLOOR) return { kind: 'too_short' }
    return cand / WPS >= 0 && cand / target < 1 && speech / cand >= MIN ? { kind: 'shorter_film', effective: cand } : { kind: 'too_short' }
  }
  const reguaAntiga = (words, target) => (words / CLASSIC < SHORT * target ? 'short' : 'ok')

  // 140 palavras / 2,3 = 60,9s ≥ 57 → enche 60s. A régua antiga (3,1) dizia 'short'.
  ok(140 / WPS >= MIN * 60, `(8c) 140 palavras enchem 60s no cobrador (${(140 / WPS).toFixed(1)}s ≥ ${MIN * 60})`)
  ok(cobra(140, 60).kind === 'at_target' && reguaAntiga(140, 60) === 'short', "(8d) 140 pal/60s: cobrador diz at_target; a régua por voz clássica dizia 'short' — a mentira que a página contava")
  ok(cobra(165, 60).kind === 'at_target' && reguaAntiga(165, 60) === 'short', "(8e) 165 pal/60s (teto da regra da casa): at_target no cobrador, 'short' na régua antiga")
  // 0,95·60·2,3 = 131,1 → a primeira contagem INTEIRA que enche é 132 (131/2,3 = 56,96 < 57).
  ok(Math.ceil(MIN * 60 * WPS) === 132 && 131 / WPS < MIN * 60 && 132 / WPS >= MIN * 60 && Math.ceil(SHORT * 60 * CLASSIC) === 177, `(8f) o piso real é ${Math.ceil(MIN * 60 * WPS)} palavras (131 ainda reprova); a régua antiga exigia ${Math.ceil(SHORT * 60 * CLASSIC)}`)
  // 40 palavras / 2,3 = 17,4s → cobertura 29% < 60% → recusa. A régua antiga só dizia 'short'.
  ok(cobra(40, 60).kind === 'too_short', '(8g) 40 pal/60s: too_short no cobrador (o Studio recusaria depois do cadastro)')
  // 100 palavras / 2,3 = 43,5s → cobertura 72% ≥ 60% → desce para 40s (floor de 43,5 no degrau de 5).
  const c100 = cobra(100, 60)
  ok(c100.kind === 'shorter_film' && c100.effective === 40, `(8h) 100 pal/60s: shorter_film de ${c100.effective}s (desce, não recusa; e perde o piso de 60s)`)
  // Piso hollywood: 60 palavras / 2,3 = 26s → candidato 25 < 30 → too_short no hollywood, shorter_film (25s) no clássico.
  const speech60 = 60 / WPS
  const cand60 = Math.floor(speech60 / STEP) * STEP
  ok(cand60 === 25 && cand60 >= FLOOR && cand60 < FLOOR_H, `(8i) 60 pal/35s: candidato ${cand60}s passa no piso clássico (${FLOOR}) e reprova no hollywood (${FLOOR_H}) — por isso o piso é por motor`)
}

// ═══ (9) As IRMÃS recusam too_short pelo MESMO veredito (KINEO-GPT-VERDADE, 2ª leva) ═
// O DEFEITO: o POST da Action recusava na porta, mas /make (GET de qualquer
// assistente) e /api/gpt/handoff/paste (a página /chatgpt) gravavam linha para
// roteiro too_short — a pessoa só descobria a recusa no Studio, depois de
// criar conta. Cada verificação amarra à VARIÁVEL que decide
// (`outcome.kind === 'too_short'`): um mutante `if (true)`/`if (false)` reprova.
const PASTE_ROUTE = 'app/api/gpt/handoff/paste/route.ts'
const MAKE_ROUTE = 'app/make/route.ts'
const LANDING_PAGE = 'app/chatgpt-to-youtube-shorts/page.tsx'
const PASTE_PANEL = 'app/chatgpt/ChatgptPastePanel.tsx'
const pasteRoute = read(PASTE_ROUTE)
const makeRoute = read(MAKE_ROUTE)
const landingPage = read(LANDING_PAGE)
const pastePanel = read(PASTE_PANEL)
const OUTCOME_CALL = /const outcome = handoffOutcome\(input\.script, input\.durationSec, input\.engineHint\)/
const TOO_SHORT_IF = "if (outcome.kind === 'too_short')"

console.log('\n(9) POST /api/gpt/handoff/paste (a página /chatgpt)')
{
  const imp = (pasteRoute.match(/^import \{([^}]*)\} from '@\/lib\/gptHandoff'/m) || ['', ''])[1]
  ok(/\bhandoffOutcome\b/.test(imp) && /\bdescribeOutcome\b/.test(imp), '(9a) importa handoffOutcome E describeOutcome de @/lib/gptHandoff (as MESMAS da Action — nada reimplementado)')
  ok(OUTCOME_CALL.test(pasteRoute), '(9b) a rota calcula outcome = handoffOutcome(input.script, input.durationSec, input.engineHint)')
  ok(/if \(outcome\.kind === 'too_short'\) \{[\s\S]{0,500}?return json\(\{ error: describeOutcome\(outcome\), outcome \}, 400\)/.test(pasteRoute), "(9c) `if (outcome.kind === 'too_short')` → 400 com { error: describeOutcome(outcome), outcome } — o MESMO formato da Action (mutante `if (true)` reprova)")
  const i400 = pasteRoute.indexOf(TOO_SHORT_IF)
  const iHash = pasteRoute.indexOf('handoffPayloadHash(input, CHANNEL)')
  const iFind = pasteRoute.indexOf('await findHandoffByPayloadHash(')
  const iInsert = pasteRoute.indexOf('await insertHandoff(')
  ok(i400 > 0 && iHash > i400 && iFind > i400 && iInsert > i400, '(9d) a recusa acontece ANTES de handoffPayloadHash/findHandoffByPayloadHash/insertHandoff — too_short não vira linha')
  ok(!/WORDS_PER_SECOND_CLASSIC|WORDS_PER_SECOND_HOLLYWOOD|FIT_SHORT_RATIO|narrationFit\(|autofitDown\(/.test(pasteRoute), '(9e) a rota NÃO redigita régua nenhuma (sem WORDS_PER_SECOND_*, FIT_*_RATIO, narrationFit, autofitDown)')
  const meta = (pasteRoute.match(/name: 'paste_handoff_created',[\s\S]*?metadata: \{([\s\S]*?)\n\s*\},\s*\n\s*\}\)/) || ['', ''])[1]
  ok(/\n\s*outcome: outcome\.kind,/.test(meta) && /\n\s*effective_seconds: outcome\.effectiveSeconds,/.test(meta), '(9f) paste_handoff_created grava outcome/effective_seconds no metadata (sem coluna nova)')
  ok(/message: describeFit\(est, input\.durationSec\),\s*\n[\s\S]{0,200}?outcome,\s*\n\s*outcomeMessage: describeOutcome\(outcome\),/.test(pasteRoute), '(9g) o 200 mantém `message` (régua) e ganha outcome + outcomeMessage (veredito)')
  ok(/setError\(\s*\n?\s*typeof data\?\.error === 'string'/.test(pastePanel) && /\{error\}/.test(pastePanel), '(9h) o painel mostra `error` do 400 como TEXTO — a frase de describeOutcome chega na caixa, com o roteiro ainda editável')
}

console.log('\n(10) GET /make (o link de qualquer assistente)')
{
  const imp = (makeRoute.match(/^import \{([^}]*)\} from '@\/lib\/gptHandoff'/m) || ['', ''])[1]
  ok(/\bhandoffOutcome\b/.test(imp), '(10a) importa handoffOutcome de @/lib/gptHandoff (o MESMO veredito da Action)')
  ok(OUTCOME_CALL.test(makeRoute), '(10b) a rota calcula outcome = handoffOutcome(input.script, input.durationSec, input.engineHint)')
  ok(/if \(outcome\.kind === 'too_short'\) \{[\s\S]{0,400}?return landing\(origin, 'script_too_short'\)/.test(makeRoute), "(10c) `if (outcome.kind === 'too_short')` → landing(origin, 'script_too_short') — 302 como todo erro desta rota (mutante `if (true)` reprova)")
  const iIf = makeRoute.indexOf(TOO_SHORT_IF)
  const iHash = makeRoute.indexOf('handoffPayloadHash(input, CHANNEL)')
  const iFind = makeRoute.indexOf('await findHandoffByPayloadHash(')
  const iInsert = makeRoute.indexOf('await insertHandoff(')
  ok(iIf > 0 && iHash > iIf && iFind > iIf && iInsert > iIf, '(10d) a recusa acontece ANTES de handoffPayloadHash/findHandoffByPayloadHash/insertHandoff — too_short não vira linha')
  const list = (makeRoute.match(/const HANDOFF_ERROR_SLUGS = \[([\s\S]*?)\] as const/) || ['', ''])[1]
  ok(/'script_too_short'/.test(list), "(10e) 'script_too_short' está na lista FECHADA HANDOFF_ERROR_SLUGS (slug inventado não compila)")
  ok(!/NextResponse\.json/.test(makeRoute), '(10f) a rota continua sem NextResponse.json — humano no navegador nunca recebe 400 cru')
  ok(!/describeOutcome/.test(makeRoute.replace(/^\s*\/\/.*$/gm, '')) && !/\$\{[^}]*outcome[^}]*\}/.test(makeRoute), '(10g) nem a frase por pedido nem o outcome viajam na URL (só o slug — a regra da rota: a frase NUNCA viaja)')
  const mapBlock = (landingPage.match(/const HANDOFF_ERROR_MESSAGES: Readonly<Record<string, string>> = \{\n([\s\S]*?)\n\}/) || ['', ''])[1]
  const line = (mapBlock.match(/^ {2}script_too_short: `([^`]*)`/m) || ['', ''])[1]
  ok(line.length > 0, '(10h) a página de pouso tem a frase do slug script_too_short (slug sem frase = tela muda)')
  ok(/too short/i.test(line) && /refuse/i.test(line) && /paste[^`]*below/i.test(line), '(10i) a frase diz que é curto, que o Studio recusaria, e aponta o caminho de colar de novo')
  ok(!/\b(5000|200|35|60|90)\b/.test(line), '(10j) a frase não digita número nenhum (o guardião visível proíbe; os números por pedido vivem em describeOutcome, que não viaja)')
  ok(!/WORDS_PER_SECOND_CLASSIC|WORDS_PER_SECOND_HOLLYWOOD|FIT_SHORT_RATIO|narrationFit\(|autofitDown\(/.test(makeRoute), '(10k) a rota NÃO redigita régua nenhuma')
  const meta = (makeRoute.match(/name: 'gpt_handoff_created',[\s\S]*?metadata: \{([\s\S]*?)\n\s*\},\s*\n\s*\}\)/) || ['', ''])[1]
  ok(/\n\s*outcome: outcome\.kind,/.test(meta) && /\n\s*effective_seconds: outcome\.effectiveSeconds,/.test(meta), '(10l) gpt_handoff_created (canal assistant_link) grava outcome/effective_seconds no metadata')
}

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
