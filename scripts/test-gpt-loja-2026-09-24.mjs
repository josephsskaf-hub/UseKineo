// GPT-LOJA-2026-09-24 — guardião dos consertos feitos antes de publicar o GPT na loja do ChatGPT.
// Verificação adversarial de 24/09 (17 achados confirmados por 2 céticos cada). Este arquivo prende os que viraram código:
//  (1) a ação recusa na conversa o roteiro longo demais para o Kineo 1 e o Kling 3/H3 fora de en/pt/es;
//  (2) o idioma do roteiro chega ao Studio; (3) o link reaproveitado renova o prazo só se gravou;
//  (4) a página /go não mostra a oferta de US$1 desligada nem diz "requires a payment method" com o cadastro sem cartão;
//  (5) o texto do GPT (seção C) e o schema dizem 245-255 palavras para Kineo 1 a 90 s — números amarrados às vozes do código.
// Estilo da casa: readFileSync + regex para rotas; módulos puros por transpile + vm (com resolvedor de '@/'). `ok(cond, nome)`.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let passou = 0
const falhas = []
const ok = (cond, nome) => { if (cond) passou++; else falhas.push(nome) }

// carregador de módulos puros: '@/x' → <raiz>/x.ts, './x' relativo; import só de tipo some no transpile
const cache = {}
function carrega(rel) {
  const p = rel.endsWith('.ts') ? rel : rel + '.ts'
  if (cache[p]) return cache[p]
  const js = ts.transpileModule(rd(p), { compilerOptions: { module: 1, target: 9 } }).outputText
  const mod = { exports: {} }
  cache[p] = mod.exports
  const dir = p.split('/').slice(0, -1).join('/')
  const req = (spec) => {
    if (spec.startsWith('@/')) return carrega(spec.slice(2))
    if (spec.startsWith('./')) return carrega(`${dir}/${spec.slice(2)}`)
    if (spec.startsWith('../')) return carrega(join(dir, spec).replace(/\\/g, '/'))
    throw new Error('import não puro em ' + p + ': ' + spec)
  }
  vm.runInNewContext(js, { exports: mod.exports, module: mod, require: req, console, Number, String, RegExp, Object, Array, Math, Date, JSON, Map, Set, Error, process: { env: {} } })
  cache[p] = mod.exports
  return mod.exports
}

// ── 1. a trava da ação, EXECUTADA ───────────────────────────────────────────────────────────────
const G = carrega('lib/gptHandoffEngineGuard')
const SR = carrega('lib/speechRate')
const P = carrega('lib/narration/personas')
const DF = carrega('lib/durationFollowsScript')
const palavras = (tema, n) => { const b = tema.split(' '); return Array.from({ length: n }, (_, i) => b[i % b.length]).join(' ') }
const rotulado = (corpo) => { const w = corpo.split(' '); const q = Math.floor(w.length / 4); return `HOOK: ${w.slice(0, q).join(' ')}\nMICRO REWARD: ${w.slice(q, 2 * q).join(' ')}\nESCALATION: ${w.slice(2 * q, 3 * q).join(' ')}\nPAYOFF: ${w.slice(3 * q).join(' ')}` }
const DINHEIRO = 'billionaire money wealth stock market investing dollars bank finance richest fortune'
const HISTORIA = 'ancient history empire roman battle pharaoh medieval kingdom century emperor ruins'
const R = (tema, n, engineHint, language = 'en') => G.handoffEngineRefusal({ script: rotulado(palavras(tema, n)), engineHint, language })
ok(R(DINHEIRO, 255, 'fast') === null && R(DINHEIRO, 265, 'fast')?.reason === 'too_long_for_kineo1' && R(DINHEIRO, 265, 'fast')?.maxWords === 258,
  '1a. Kineo 1, voz de finanças (2,5 pal/s): 255 palavras passam, 265 são recusadas com teto de 258 palavras')
ok(R(HISTORIA, 270, 'fast') === null && R(HISTORIA, 290, 'fast')?.maxWords === 272,
  '1b. Kineo 1, voz de história (2,63 pal/s): 270 passam, 290 recusadas com teto de 272 (a régua é a da persona, não um número fixo)')
ok(R(DINHEIRO, 290, 'seedance') === null && R(DINHEIRO, 290, 'kling') === null,
  '1c. motores clássicos de IA não passam pela trava do Kineo 1')
ok(R(HISTORIA, 150, 'hollywood', 'hi')?.reason === 'language_not_supported_by_engine' && R(HISTORIA, 150, 'h3', 'pt') === null && R(HISTORIA, 150, 'hollywood', 'pt-BR') === null && R(HISTORIA, 150, 'fast', 'hi') === null,
  '1d. Kling 3/H3: hindi recusado, pt e pt-BR passam; Kineo 1 em hindi não é afetado')
const alemao = G.handoffEngineRefusal({ script: rotulado('Die Geschichte der alten Stadt ist lang und die Menschen haben dort viele Jahre gelebt und gearbeitet und das ist wirklich so und wir sind hier'), engineHint: 'hollywood', language: 'en' })
ok(alemao?.reason === 'language_not_supported_by_engine' && alemao.language === 'de', '1e. roteiro em alemão marcado como "en" é detectado como o Studio detecta e recusado no Kling 3')
ok(/Trim it to at most \d+ spoken words/.test(G.describeEngineRefusal({ reason: 'too_long_for_kineo1', speechSeconds: 116, maxSeconds: 90, maxWords: 258, words: 290, wordsPerSecond: 2.5 })) && /engineHint "seedance"/.test(G.describeEngineRefusal({ reason: 'language_not_supported_by_engine', language: 'hi', engine: 'hollywood' })),
  '1f. a frase de recusa dá o número de palavras e a saída ("seedance"), para o GPT consertar em um turno')

// ── 2. a trava ESPELHA a rota do Kineo 1 (se a rota mudar a medição, este vermelho manda resincronizar) ──
const fastRoute = rd('app/api/generate-video-fast/route.ts')
const guardSrc = rd('lib/gptHandoffEngineGuard.ts')
ok(/selectPersonaForScript\(prompt, undefined, 'free', narrationLanguage\.language\)/.test(fastRoute) && /selectPersonaForScript\(input\.script, undefined, 'free'/.test(guardSrc),
  "2a. persona: rota e trava chamam selectPersonaForScript(roteiro, undefined, 'free', idioma)")
ok(/speechRateFor\(\{ family: 'classic', speed: parsedScript\.speed, language: narrationLanguage\.language, voice: fastPersona\?\.voice, personaSpeed: fastPersona\?\.defaultSpeed \}\)/.test(fastRoute) && /speechRateFor\(\{ family: 'classic', speed: parsed\.speed, language, voice: persona\?\.voice, personaSpeed: persona\?\.defaultSpeed \}\)/.test(guardSrc),
  '2b. ritmo: rota e trava chamam speechRateFor com a mesma família, velocidade e voz da persona')
ok(/const falaPropria = verbatim \? parsedScript\.segments\.map\(\(seg\) => seg\.voiceover \?\? ''\)\.join\(' '\) : \(parsedScript\.narration && parsedScript\.narration\.trim\(\)\.length > 0 \? parsedScript\.narration : prompt\)/.test(fastRoute) && /parsed\.narration && parsed\.narration\.trim\(\)\.length > 0 \? parsed\.narration : input\.script/.test(guardSrc),
  '2c. a fala contada é a mesma: segmentos marcados, senão a narração, senão o texto')
ok(/decideDurationFollowsScriptUp\(/.test(fastRoute) && /DURATION_FOLLOWS_SCRIPT_CEILING_SECONDS \* DURATION_FOLLOWS_SCRIPT_CEILING_TOLERANCE/.test(guardSrc) && DF.DURATION_FOLLOWS_SCRIPT_CEILING_SECONDS === 90,
  '2d. o teto é o mesmo do decideDurationFollowsScriptUp (90 s × tolerância), lido da fonte, não digitado')

// ── 3. a rota da ação usa a trava antes de gravar, e o reaproveitamento renova o prazo ────────────
const post = rd('app/api/gpt/handoff/route.ts')
const iGuard = post.indexOf('const engineRefusal = handoffEngineRefusal({ script: input.script, engineHint: input.engineHint, language: input.language })')
ok(iGuard > post.indexOf("if (outcome.kind === 'too_short')") && iGuard < post.indexOf('await insertHandoff(') && iGuard < post.indexOf('findHandoffByPayloadHash(payloadHash)'),
  '3a. a trava roda depois do too_short e ANTES de achar/gravar a linha (recusa não vira link)')
ok(/return json\(\{ error: describeEngineRefusal\(engineRefusal\), refusal: engineRefusal \}, 400\)/.test(post) && /name: 'gpt_handoff_refused'/.test(post),
  '3b. recusa = 400 com a frase e o motivo, e evento gpt_handoff_refused para medir')
ok(/const engineRefusal = handoffEngineRefusal\([^\n]*\)\n\s*if \(engineRefusal\) \{\n\s*await writeServerEvent\(\{ name: 'gpt_handoff_refused'[^\n]*\n\s*return json\(\{ error: describeEngineRefusal\(engineRefusal\)/.test(post),
  '3d. a recusa depende SÓ do resultado da trava (if (engineRefusal) → evento → 400), sem condição extra')
ok((post.match(/if \(await refreshHandoffExpiry\(token, fresh(?:Again)?\)\) expiresAt = fresh(?:Again)?/g) || []).length === 2 && /\.update\(\{ expires_at: expiresAt \}\)\.eq\('token', token\)/.test(rd('lib/gptHandoffStore.ts')),
  '3c. link reaproveitado (nos dois ramos) ganha 7 dias novos, e o prazo só muda na resposta se a gravação deu certo')

// ── 4. idioma chega ao Studio ─────────────────────────────────────────────────────────────────
const lib = rd('lib/gptHandoff.ts')
const dest = (lib.match(/export function buildStudioDestination[\s\S]*?\n\}\n/) || [''])[0]
ok(/language\?: string \| null\n  aspect: string\n\}\): string \{/.test(dest) && /const lang = narrationLanguage\(String\(row\.language \?\? ''\)\.slice\(0, 2\)\.toLowerCase\(\)\)\n  if \(lang && lang !== 'en'\) q\.set\('language', lang\)/.test(dest),
  '4a. buildStudioDestination manda ?language= (menos en, que é o padrão do Studio: link em inglês fica byte a byte igual)')
ok(/searchParams\.get\('language'\)/.test(rd('app/(dashboard)/generate/GenerateClient.tsx')), '4b. o Studio lê ?language= (senão o parâmetro não serve a ninguém)')

// ── 5. página /go: nada de oferta desligada nem cartão para quem chega sem conta ────────────────
const page = rd('app/go/[token]/page.tsx')
ok(/\} else \{\n\s*\/\/ Public explanation[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*creatorTrialEligible = CARD_TRIAL_LIVE\n/.test(page) && !/creatorTrialEligible = true/.test(page),
  '5a. visitante sem conta só vê a oferta de US$1 se ela estiver LIGADA (CARD_TRIAL_LIVE)')
ok(/: CARD_ENTRY_ONLY\n\s*\? 'Create your account to open this script in Studio\. The Creator trial requires a payment method\.'\n\s*: `Sign up free \(\$\{TRIAL_GRANT_CREDITS_COPY\} credits, no card\) to open this script in Studio\.`\}/.test(page),
  '5b. o texto do botão diz "sem cartão" com o número do trial lido da fonte; a frase do cartão só existe no regime de cartão')
const pricing = rd('lib/checkoutPricing.ts')
ok(/export const CARD_TRIAL_LIVE = false/.test(pricing) && /export const CARD_ENTRY_ONLY = false/.test(rd('lib/entryPolicy.ts')), '5c. regime vigente: oferta de US$1 desligada e cadastro sem cartão (se mudar, 5a/5b seguem certos sozinhos)')

// ── 6. o texto do GPT e o schema: 245-255 no Kineo 1 a 90 s, amarrado às vozes grátis do código ───
const md = rd('docs/GPT-KINEO-VIDEO-MAKER.md')
const secC = md.slice(md.indexOf('## C.'), md.indexOf('\n## D.'))
const instr = (secC.match(/```(?:text)?\n([\s\S]*?)\n```/) || [])[1] || ''
ok(instr.length > 1000 && [...instr].length <= 8000, `6a. instruções da seção C cabem no editor do GPT (${[...instr].length} de 8000 caracteres)`)
const faixa = instr.match(/- 90s: 270-290 words \("fast": (\d+)-(\d+), never more\)/)
const oa = JSON.parse(rd('public/gpt/openapi.json'))
const scriptDesc = JSON.stringify(oa)
const faixaOa = scriptDesc.match(/except `fast` \(Kineo 1\) at 90s: (\d+)-(\d+) words, never more/)
ok(Boolean(faixa && faixaOa) && faixa[1] === faixaOa[1] && faixa[2] === faixaOa[2] && oa.info.version === '1.3.2', `6b. seção C e openapi (v${oa.info.version}) dizem a MESMA faixa do Kineo 1 a 90 s (${faixa?.slice(1).join('-')})`)
if (faixa) {
  const lo = Number(faixa[1]), hi = Number(faixa[2])
  const teto = DF.DURATION_FOLLOWS_SCRIPT_CEILING_SECONDS * DF.DURATION_FOLLOWS_SCRIPT_CEILING_TOLERANCE
  const gratis = P.VOICE_PERSONAS.filter((p) => p.tier === 'free')
  const ritmos = gratis.map((p) => ({ id: p.id, wps: SR.speechRateFor({ family: 'classic', voice: p.voice, personaSpeed: p.defaultSpeed }).wordsPerSecond }))
  const estoura = ritmos.filter((r) => hi / r.wps > teto)
  const curta = ritmos.filter((r) => lo / r.wps < 90 * 0.95)
  ok(ritmos.length >= 2 && estoura.length === 0, `6c. o teto da faixa (${hi}) cabe em ${teto} s em TODA voz grátis do Kineo 1 (${ritmos.map((r) => r.id + ' ' + r.wps).join(', ')})${estoura.length ? ' — ESTOURA em ' + estoura.map((r) => r.id).join(',') : ''}`)
  ok(curta.length === 0, `6d. o piso da faixa (${lo}) enche 95% de 90 s em toda voz grátis${curta.length ? ' — CURTO em ' + curta.map((r) => r.id).join(',') : ''}`)
}
ok(/- "hollywood" \(Kling 3\) or "h3" \(MiniMax H3\): only if named and the script is English, Spanish or Portuguese \(else "seedance"\)\./.test(instr) && /`hollywood` and `h3` narrate only English, Spanish or Portuguese/.test(scriptDesc),
  '6e. seção C e schema dizem que Kling 3/H3 narram só en/es/pt e mandam o resto para seedance')
const HL = carrega('lib/textLanguage').HOLLYWOOD_LANGUAGES
ok(JSON.stringify([...HL].sort()) === JSON.stringify(['en', 'es', 'pt']), `6f. a lista de idiomas do texto é a do código (HOLLYWOOD_LANGUAGES = ${[...HL]})`)
ok(/A new account's first film is free on Kineo 1 \(10-credit trial, no card; watermarked\)/.test(instr) && /Credits are per 60s \(35s x35\/60, 90s x1\.5, rounded up\)/.test(instr) && /Yearly \(Starter, Creator, Studio\) = ten months\./.test(instr) && /money-back: 7 days after the first charge only/.test(instr),
  '6g. os 4 acertos de texto: conta nova, 35/60, anual sem Autopilot, reembolso só na 1ª cobrança')
const arquivoColar = 'C:/kineo/docs/GPT-INSTRUCOES-V3-COLAR-2026-09-24.txt'
if (existsSync(arquivoColar)) ok(readFileSync(arquivoColar, 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '') === instr, '6h. o arquivo de colar do fundador é idêntico à seção C')

console.log(`test-gpt-loja-2026-09-24: ${passou} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  FAIL ' + f)
process.exit(falhas.length ? 1 : 0)
