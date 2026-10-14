// KINEO-REGUA-35-60-90-1410 [TRAVA 8.2 — vai do fundador 14/10] — guardião da régua do roteiro de 35/60/90 s pedido SEM motor.
//
// Defeito (14/10): o 15 s sem motor já escrevia na régua do 15 s (KINEO-MOTOR-15S-1510), mas 35/60/90 s sem motor — o "Write
// the full script" do /generate, que não manda `engine` — seguia na régua histórica (2,3 pal/s × 0,95 = 81/132/197 palavras).
// A voz que fala esses filmes é a persona tts-1-hd da casa (2,30 a 2,81 pal/s) ou a voz própria do hollywood (2,3 × 0,85–1,1):
// 132 palavras a 60 s são 47 s na voz mais rápida — o portão de 95 % recusa o roteiro recém-escrito (o caso de 16/09: 60 s,
// Seedance, piso 132, 89 palavras entregues, "authored_still_short").
//
// Este guardião EXECUTA a rota real /api/generate-script offline (OpenAI, moderação, banco e eventos são dublês) e prova:
//   1. cada duração × família de motor recebe a sua régua (com motor: byte a byte a base; sem motor a 35/60/90: a voz real);
//   2. o piso sem motor a 35/60/90 cobre ≥ 95 % da duração em TODA voz real da casa, medido pelo PORTÃO de verdade
//      (lib/speechRate narrationFitAt — a função que a rota do cinematic e a do Kineo 1 usam para recusar);
//   3. o 15 s de 5980f218 fica intacto (toda língua, todo motor, resposta e prompt iguais à base);
//   4. passar do alvo continua permitido (roteiro longo volta inteiro, sem corte nem nova chamada);
//   5. desfeito o conserto (scripts/test-support/desfaz-regua-35-60-90-1410.mjs), a rota é a base byte a byte;
//   6. mutantes — cada um precisa ficar vermelho.
// BASE = o pai do 1º commit com a marca (nunca origin/main: depois de publicado, origin/main já contém o conserto).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const MARCA = 'KINEO-REGUA-35-60-90-1410'
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const git = (args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
const BASE_REF = (() => {
  try {
    const shas = git(['log', '--format=%H', `--grep=${MARCA}`, 'HEAD']).trim().split('\n').filter(Boolean)
    if (shas.length) return shas[shas.length - 1] + '^'
  } catch { /* sem commit ainda */ }
  return 'HEAD' // antes do commit: a árvore de trabalho contra o HEAD
})()
const { createOfflineLoader } = await import(pathToFileURL(path.join(ROOT, 'scripts/test-support/offline-ts-loader.mjs')).href)
const { semRegua35a90_1410, FORMA_REGUA_35_60_90_1410 } = await import(pathToFileURL(path.join(ROOT, 'scripts/test-support/desfaz-regua-35-60-90-1410.mjs')).href)
const { semMotor15s1510 } = await import(pathToFileURL(path.join(ROOT, 'scripts/test-support/desfaz-motor-15s-1510.mjs')).href)

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const show = (ref, rel) => { try { return git(['show', ref + ':' + rel]).replace(/\r\n/g, '\n') } catch { return '' } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const mut = (src, de, para) => { if (!src.includes(de)) throw new Error('mutante não aplicou: ' + de.slice(0, 80)); const out = src.split(de).join(para); if (out === src) throw new Error('mutante sem efeito'); return out }

const ROUTE_REL = 'app/api/generate-script/route.ts'
const HELPER_REL = 'lib/growth/reguaSemMotor.ts'
const ROUTE = read(ROUTE_REL)
const HELPER = read(HELPER_REL)
const ROUTE_BASE = show(BASE_REF, ROUTE_REL)

// ── as réguas reais, carregadas da lib (offline) ──────────────────────────────────────────────────────────────────────
const L = createOfflineLoader({})
const W = L('@/lib/scriptWriterRate')
const SR = L('@/lib/speechRate')
const NF = L('@/lib/narrationFit')
const P = L('@/lib/narration/personas')
const LANGS = ['en', 'pt', 'es', 'tr', 'de']
const DUR_LONGAS = [35, 60, 90]
const vozesClassicas = P.VOICE_PERSONAS.map((p) => ({ id: p.id, rate: SR.speechRateFor({ family: 'classic', voice: p.voice, personaSpeed: p.defaultSpeed }) }))
const vozesHollywood = [0.85, 0.9, 0.94, 1, 1.05, 1.1].map((v) => ({ id: 'hollywood×' + v, rate: SR.speechRateFor({ family: 'hollywood', speed: v }) }))
const rapida = W.fastestClassicPersonaRate('en').wordsPerSecond
const lenta = Math.min(...vozesClassicas.map((v) => v.rate.wordsPerSecond))

// ── a rota real, offline ─────────────────────────────────────────────────────────────────────────────────────────────
/** Roteiro completo (7 seções, payoff concreto) com exatamente `n` palavras faladas. */
function roteiro(n) {
  const secoes = ['HOOK', 'MICRO REWARD 1', 'MICRO REWARD 2', 'MICRO REWARD 3', 'ESCALATION', 'RHYTHM', 'PAYOFF']
  const fixo = 'The answer is the river salt.'.split(' ')
  const corpo = Math.max(0, n - fixo.length)
  const por = Math.floor(corpo / 6)
  const out = []
  let usadas = 0
  for (let i = 0; i < 6; i++) {
    const k = i === 5 ? corpo - usadas : por
    usadas += k
    out.push(`${secoes[i]}: [Pexels: ocean waves aerial] ${Array.from({ length: k }, (_, j) => 'word' + ((i * 97 + j) % 50)).join(' ')}`)
  }
  out.push(`PAYOFF: [Pexels: salt crystals macro] ${fixo.join(' ')}`)
  return out.join('\n\n')
}
const palavras = (t) => t.replace(/^\s*(HOOK|MICRO REWARD ?\d*|ESCALATION|RHYTHM|PAYOFF)\s*(\([^)]*\))?\s*:?/gim, ' ').replace(/\[[^\]]*\]/g, ' ').trim().split(/\s+/).filter(Boolean).length

async function postar({ routeSrc = ROUTE, helperSrc = HELPER, body, gpt }) {
  const chamadas = []
  const eventos = []
  const NextResponse = { json: (b, init) => ({ __res: true, body: b, status: init?.status ?? 200 }) }
  const load = createOfflineLoader({
    mocks: {
      'next/server': { NextResponse, NextRequest: class {} },
      '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u-guardiao' } } }) }, from: () => { throw new Error('banco fora do ar no guardião') } }) },
      '@/lib/openai': {
        OPENAI_SCRIPT_TIMEOUT_MS: 35000,
        openai: { chat: { completions: { create: async (req) => {
          const n = chamadas.length + 1
          const system = req.messages.find((m) => m.role === 'system')?.content ?? ''
          const user = req.messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n---\n')
          chamadas.push({ n, system, user })
          return { choices: [{ message: { content: gpt({ n, system, user }) } }] }
        } } } },
      },
      '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } },
      '@/lib/openaiAlert': { looksOpenAiQuotaDead: () => false, looksOpenAiHanging: () => false, alertOpenAiExhausted: async () => {}, openAiAlertKind: () => 'x', ENGINE_CAPACITY_MESSAGE: 'capacity' },
      '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
      '@/lib/reverseTrial': { getEffectiveEntitlement: () => ({ maxDurationSeconds: null }), TRIAL_ENTITLEMENT_COLUMNS: 'plan' },
    },
    source: (rel, src) => (rel === ROUTE_REL ? routeSrc : rel === HELPER_REL ? helperSrc : src),
  })
  const route = load('@/' + ROUTE_REL)
  const res = await route.POST({ json: async () => body })
  return { status: res.status, body: res.body, chamadas, eventos }
}
/** O modelo devolve um roteiro do tamanho pedido no prompt ("Total script: N-M") — o piso exato, sem folga. */
const noPiso = ({ system }) => { const m = system.match(/Total script: (\d+)-(\d+) spoken words/); return roteiro(m ? Number(m[1]) : 50) }
const autoria = (alvo, extra = {}) => ({ topic: 'Why is the ocean salty?', language: 'en', targetSeconds: alvo, forceAuthoring: true, ...extra })

console.log('0 — a voz real de cada estrada (da lib, não do documento)')
ok(rapida === Math.max(...vozesClassicas.map((v) => v.rate.wordsPerSecond)) && rapida > 2.7 && rapida < 3.1, `persona tts-1-hd mais rápida = ${rapida} pal/s (o 3,1 do documento é a base SEM voz; nenhuma persona fala a 3,1)`)
ok(lenta >= 2.2 && lenta < 2.4, `persona mais lenta = ${lenta} pal/s`)
ok(vozesHollywood.every((v) => v.rate.wordsPerSecond <= rapida), `voz própria (hollywood, 2,3 × 0,85–1,1): ${vozesHollywood.map((v) => v.rate.wordsPerSecond).join('/')} — todas ≤ a persona mais rápida`)

console.log('1 — sem motor a 35/60/90 s: o piso na voz real (rota real, offline)')
const pisos = {}
for (const lang of LANGS) {
  for (const alvo of DUR_LONGAS) {
    const r = await postar({ body: autoria(alvo, { language: lang }), gpt: noPiso })
    const esperado = Math.ceil(alvo * NF.MIN_COVERAGE * W.fastestClassicPersonaRate(lang).wordsPerSecond)
    if (lang === 'en') pisos[alvo] = r.body?.minWords
    ok(r.status === 200 && r.body?.minWords === esperado && r.body?.family === 'classic' && r.body?.wordsPerSecond === W.fastestClassicPersonaRate(lang).wordsPerSecond,
      `${lang} ${alvo} s sem motor → piso ${r.body?.minWords} palavras (esperado ${esperado}), régua ${r.body?.wordsPerSecond} pal/s, ${r.body?.family}`)
  }
}
ok(pisos[35] === 94 && pisos[60] === 161 && pisos[90] === 241, `en: 35/60/90 s = ${pisos[35]}/${pisos[60]}/${pisos[90]} palavras (antes 81/132/197)`)
{
  // O PORTÃO de verdade (narrationFitAt na régua da voz) aprova o piso em TODA voz real da casa
  let reprovou = []
  for (const alvo of DUR_LONGAS) {
    const texto = Array.from({ length: pisos[alvo] }, (_, i) => 'w' + i).join(' ')
    for (const v of [...vozesClassicas, ...vozesHollywood]) {
      const fit = SR.narrationFitAt(texto, alvo, v.rate)
      if (!fit.ok || fit.coverage < 0.95) reprovou.push(`${alvo}s ${v.id} ${(fit.coverage * 100).toFixed(1)}%`)
    }
  }
  ok(reprovou.length === 0, `o piso de 35/60/90 s passa no portão de 95 % em todas as ${vozesClassicas.length} personas clássicas e ${vozesHollywood.length} velocidades da voz própria${reprovou.length ? ' — ' + reprovou.join('; ') : ''}`)
  const antes = Math.ceil(60 * 0.95 * 2.3)
  const fitAntes = SR.narrationFitAt(Array.from({ length: antes }, (_, i) => 'w' + i).join(' '), 60, vozesClassicas.find((v) => v.rate.wordsPerSecond === rapida).rate)
  ok(!fitAntes.ok, `na base, ${antes} palavras a 60 s eram ${(fitAntes.coverage * 100).toFixed(0)} % na persona mais rápida — o portão recusava o roteiro que a casa acabara de escrever`)
}
{
  const r = await postar({ body: autoria(60), gpt: noPiso })
  const rb = await postar({ routeSrc: ROUTE_BASE, body: autoria(60), gpt: noPiso })
  ok(rb.body?.minWords === Math.ceil(60 * 0.95 * 2.3) && rb.body?.family === 'legacy', `na base, 60 s sem motor pedia ${rb.body?.minWords} palavras (histórica, ${rb.body?.family})`)
  ok(/Total script: 161-193 spoken words/.test(r.chamadas[0]?.system ?? '') && /rate of 2\.81 words per second, 161 words is about/.test(r.chamadas[0]?.system ?? ''), 'o prompt do escritor fala a régua nova (161–193 palavras a 2,81 pal/s)')
  const nb = await postar({ body: { topic: 'Why is the ocean salty?', language: 'en', targetSeconds: 60 }, gpt: noPiso })
  ok(nb.status === 200 && nb.body?.minWords === 161 && nb.eventos.some((e) => e.name === 'script_written' && e.metadata?.engine === null && e.metadata?.min_words === 161 && e.metadata?.family === 'classic'), 'sem forceAuthoring também (script_written grava engine null, piso 161, classic)')
  const curto = await postar({ body: autoria(60), gpt: ({ n }) => roteiro(n === 1 ? 132 : 170) })
  ok(curto.chamadas.length === 2 && /needs at least 161/.test(curto.chamadas[1]?.user ?? '') && curto.body?.stillShort === false, 'roteiro de 132 palavras a 60 s (o piso velho) agora é curto: UMA nova chamada pedindo 161, e a 2ª (170) sai pronta')
  const aindaCurto = await postar({ body: autoria(60), gpt: () => roteiro(140) })
  ok(aindaCurto.body?.stillShort === true && aindaCurto.body?.outcome === 'authored_still_short', 'abaixo do piso depois da nova chamada: a autoria diz "ainda curto" (não apresenta como pronto)')
}

console.log('2 — com motor: cada família na sua régua, byte a byte a base')
const MOTORES = ['cinematic_ai', 'seedance', 'cinematic_kling', 'cinematic_veo', 'fast', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_h3max', 'cinematic_s25']
{
  const difs = []
  for (const engine of MOTORES) {
    for (const alvo of [15, ...DUR_LONGAS]) {
      for (const lang of ['en', 'tr']) {
        const body = { ...autoria(alvo, { language: lang }), engine }
        const a = await postar({ routeSrc: ROUTE_BASE, body, gpt: noPiso })
        const b = await postar({ body, gpt: noPiso })
        if (JSON.stringify(a.body) !== JSON.stringify(b.body) || a.chamadas.map((c) => c.system).join('|') !== b.chamadas.map((c) => c.system).join('|')) difs.push(`${engine} ${alvo}s ${lang}`)
      }
    }
  }
  ok(difs.length === 0, `${MOTORES.length} motores × 15/35/60/90 × en/tr: resposta e prompt idênticos à base${difs.length ? ' — ' + difs.slice(0, 5).join('; ') : ''}`)
  const fam = async (engine) => (await postar({ body: { ...autoria(60), engine }, gpt: noPiso })).body
  const s = await fam('cinematic_ai'), k1 = await fam('fast'), h = await fam('cinematic_hollywood')
  ok(s.family === 'classic' && s.wordsPerSecond === 3.1 && k1.family === 'classic' && k1.wordsPerSecond === rapida && h.family === 'hollywood' && h.wordsPerSecond === 2.3,
    `60 s: Seedance ${s.wordsPerSecond} (${s.minWords}) · Kineo 1 ${k1.wordsPerSecond} (${k1.minWords}) · hollywood ${h.wordsPerSecond} (${h.minWords}) — réguas separadas, nenhuma unificada`)
}

console.log('3 — o 15 s de 5980f218 intacto')
{
  const difs = []
  for (const lang of ['en', 'pt', 'es', 'tr', 'de', 'ru']) {
    for (const extra of [{}, { forceAuthoring: false }]) {
      const body = { ...autoria(15, { language: lang }), ...extra }
      const a = await postar({ routeSrc: ROUTE_BASE, body, gpt: noPiso })
      const b = await postar({ body, gpt: noPiso })
      if (JSON.stringify(a.body) !== JSON.stringify(b.body) || a.chamadas.map((c) => c.system).join('|') !== b.chamadas.map((c) => c.system).join('|')) difs.push(lang)
    }
  }
  ok(difs.length === 0, `15 s sem motor (6 línguas, com e sem forceAuthoring): resposta e prompt idênticos à base${difs.length ? ' — ' + difs.join(', ') : ''}`)
  const r = await postar({ body: autoria(15), gpt: noPiso })
  ok(r.body?.minWords === 36 && r.body?.wordsPerSecond === 3.1, `15 s sem motor segue na régua do 15 s (piso ${r.body?.minWords}, como em 5980f218)`)
}

console.log('4 — passar do alvo continua permitido')
for (const alvo of DUR_LONGAS) {
  const longo = roteiro(Math.round(pisos[alvo] * 1.6))
  const r = await postar({ body: autoria(alvo), gpt: () => longo })
  ok(r.status === 200 && r.body?.script === longo && r.chamadas.length === 1 && r.body?.stillShort === false, `${alvo} s: roteiro com ${palavras(longo)} palavras (+60 %) volta inteiro, sem corte e sem nova chamada`)
}
{
  const longo = roteiro(260)
  const r = await postar({ body: { topic: 'Why is the ocean salty?', language: 'en', targetSeconds: 60 }, gpt: () => longo })
  ok(r.body?.script === longo && r.body?.words === palavras(longo), 'sem forceAuthoring: 260 palavras a 60 s voltam inteiras (o filme passa do alvo; ficar abaixo é o defeito)')
}

console.log('5 — desfeito o conserto, a rota é a base')
{
  let d = null
  try { d = semRegua35a90_1410(ROUTE) } catch (e) { d = 'ERRO: ' + e.message }
  ok(ROUTE_BASE !== '' && d === ROUTE_BASE, `${ROUTE_REL}: tiradas as linhas ${MARCA}, é byte a byte a base (${BASE_REF})`)
  ok(semRegua35a90_1410(ROUTE_BASE) === ROUTE_BASE, 'o desfaz é idempotente sobre a base')
  const marcadas = ROUTE.split('\n').filter((l) => l.includes(MARCA)).length
  ok(marcadas === FORMA_REGUA_35_60_90_1410.trocas + FORMA_REGUA_35_60_90_1410.acrescimos, `${marcadas} linhas marcadas = a forma do desfaz`)
  let base15 = ''
  try { const shas = git(['log', '--format=%H', '--grep=KINEO-MOTOR-15S-1510', 'HEAD']).trim().split('\n').filter(Boolean); base15 = shas.length ? show(shas[shas.length - 1] + '^', ROUTE_REL) : '' } catch { base15 = '' }
  let d2 = null
  try { d2 = semMotor15s1510(semRegua35a90_1410(ROUTE), 'route') } catch (e) { d2 = 'ERRO: ' + e.message }
  ok(base15 !== '' && d2 === base15, 'encadeado com o desfaz do 15 s, a rota volta à base de antes dos dois consertos')
  let lancou = false
  try { semRegua35a90_1410(ROUTE + '\nconst x = 1 // ' + MARCA) } catch { lancou = true }
  ok(lancou, 'linha marcada inesperada → o desfaz lança')
  let lancou2 = false
  try { semRegua35a90_1410(ROUTE.split('\n').filter((l) => !(l.includes(MARCA) && l.startsWith('import'))).join('\n')) } catch { lancou2 = true }
  ok(lancou2, 'conserto pela metade (sem o import) → o desfaz lança')
  ok(/\[TRAVA 8\.2 — vai do fundador 14\/10\]/.test(ROUTE) && /\[TRAVA 8\.2 — vai do fundador 14\/10\]/.test(HELPER), 'selo da trava na rota e no módulo')
  ok(!/\b\d+\s*cr\b|\$\s*\d/.test(HELPER.replace(/^\s*\/\/.*$/gm, '')), 'o módulo novo não digita preço nenhum')
}

console.log('6 — mutantes (todos VERMELHOS)')
const vermelho = (cond, m) => ok(cond, 'mutante pego: ' + m)
{
  // M1 — sem a régua nova: 60 s sem motor volta à histórica
  const m = mut(HELPER, '  if (!semMotor || filmeCurto) return null', '  return null')
  const r = await postar({ helperSrc: m, body: autoria(60), gpt: noPiso })
  vermelho(r.body?.minWords !== 161, `sem a régua nova, o piso de 60 s cai para ${r.body?.minWords}`)
}
{
  // M2 — a régua de UMA voz (a da persona padrão, onyx 2,5) no lugar da mais rápida: o piso não cobre 95 % na voz mais rápida
  const m = mut(HELPER, '  const rapida = fastestClassicPersonaRate(language)', "  const rapida = { wordsPerSecond: 2.5, voice: 'onyx' }")
  const r = await postar({ helperSrc: m, body: autoria(60), gpt: noPiso })
  const fit = SR.narrationFitAt(Array.from({ length: r.body?.minWords ?? 0 }, (_, i) => 'w' + i).join(' '), 60, vozesClassicas.find((v) => v.rate.wordsPerSecond === rapida).rate)
  vermelho(!fit.ok, `régua de uma voz só (2,5): ${r.body?.minWords} palavras = ${(fit.coverage * 100).toFixed(1)} % na persona mais rápida — o portão recusaria`)
}
{
  // M3 — a régua nova também no 15 s: o 15 s deixa de ser o de 5980f218
  const m = mut(HELPER, '  if (!semMotor || filmeCurto) return null', '  if (!semMotor) return null')
  const a = await postar({ routeSrc: ROUTE_BASE, body: autoria(15), gpt: noPiso })
  const b = await postar({ helperSrc: m, body: autoria(15), gpt: noPiso })
  vermelho(JSON.stringify(a.body) !== JSON.stringify(b.body), `régua nova vazando para o 15 s: piso ${a.body?.minWords} → ${b.body?.minWords}`)
}
{
  // M4 — a régua nova também COM motor: Seedance/hollywood perdem a régua própria (uma régua para tudo)
  const m = mut(HELPER, '  if (!semMotor || filmeCurto) return null', '  if (filmeCurto) return null')
  const h = await postar({ helperSrc: m, body: { ...autoria(60), engine: 'cinematic_hollywood' }, gpt: noPiso })
  vermelho(h.body?.family !== 'hollywood', `régua nova com motor: o hollywood a 60 s vira ${h.body?.family} ${h.body?.wordsPerSecond} pal/s`)
}
{
  // M5 — corte no alvo (o filme longo amputado): a rota trata 35/60/90 como filme curto e corta por frase
  const m = mut(ROUTE, '    const filmeCurto = isShortFilmTarget(alvoSegundos)', '    const filmeCurto = true')
  const longo = roteiro(Math.round(pisos[60] * 1.6))
  const r = await postar({ routeSrc: m, body: autoria(60), gpt: () => longo })
  vermelho(r.body?.script !== longo, `com corte no alvo, o roteiro de ${palavras(longo)} palavras volta com ${palavras(r.body?.script ?? '')}`)
}
{
  // M6 — a rota sem a linha nova (só a do 15 s): 35/60/90 sem motor voltam à histórica
  const m = semRegua35a90_1410(ROUTE)
  const r = await postar({ routeSrc: m, body: autoria(35), gpt: noPiso })
  vermelho(r.body?.minWords === Math.ceil(35 * 0.95 * 2.3), `rota sem a linha nova: 35 s pede ${r.body?.minWords} palavras de novo`)
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
