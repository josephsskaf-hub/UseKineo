// KINEO-MOTOR-15S-1510 [TRAVA 8.2 — vai do fundador 15/10] — guardião do filme grátis de 15 s que ficava no roteirista.
//
// Defeito A (medido 15/10): contas de teste/região com saldo para o Seedance 1.5 de 15 s apertavam Gerar e paravam no
// roteirista — 422 "the AI declined the topic" (o modelo recusando pedido comum: ordem colada de outra IA, "em alta hoje",
// prompt-mestre de 734 palavras; a moderação passava), narração curta no 15 s (o pedido de autoria sem motor escrevia na
// régua histórica: 33 palavras) e o modal de crédito depois de o seletor subir para 35/60 s.
// Defeito B: "60-second" colado subia o seletor para 60 s numa conta de 14 cr DEPOIS da descida para o filme grátis.
//
// Este guardião EXECUTA a rota real /api/generate-script (offline: OpenAI, moderação, banco e eventos são dublês) e a regra
// pura da subida (lib/growth/motor15s.ts, com a regra do Studio e a função que COBRA), lê a fiação no GenerateClient e
// prova que, tirado o conserto (scripts/test-support/desfaz-motor-15s-1510.mjs), os dois arquivos são a base byte a byte.
// Mutantes no fim: cada um precisa ficar vermelho.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { desfazParceiroEyebible2_1410 } from './test-support/desfaz-parceiro-eyebible-2-1410.mjs' // reancorado KINEO-PARCEIRO-EYEBIBLE-2-1410 [TRAVA 8.2 — vai do fundador 14/10]: a 2ª leva do Robert/EyeBible sai em memória antes do byte a byte
// reancorado KINEO-LEVA-1410-BASE: a base era 'origin/main' — depois de publicado, origin/main JÁ CONTÉM o conserto e as provas
// "na base" ficavam vermelhas sem defeito nenhum. Base = pai do 1º commit com a marca (mesma prova, presa ao commit certo).
const BASE_REF = (() => {
  const shas = execFileSync('git', ['-C', process.cwd(), 'log', '--format=%H', '--grep=KINEO-MOTOR-15S-1510', 'HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
  return shas.length ? shas[shas.length - 1] + '^' : 'origin/main'
})()

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const { createOfflineLoader } = await import(pathToFileURL(path.join(ROOT, 'scripts/test-support/offline-ts-loader.mjs')).href)
const { semMotor15s1510, FORMA_MOTOR_15S_1510 } = await import(pathToFileURL(path.join(ROOT, 'scripts/test-support/desfaz-motor-15s-1510.mjs')).href)
const { semModeracao1410 } = await import(pathToFileURL(path.join(ROOT, 'scripts/test-support/desfaz-moderacao-1410.mjs')).href) // reancorado KINEO-MODERACAO-1410: a régua completa do texto (acréscimos) sai PRIMEIRO
const { semRegua35a90_1410 } = await import(pathToFileURL(path.join(ROOT, 'scripts/test-support/desfaz-regua-35-60-90-1410.mjs')).href) // reancorado KINEO-REGUA-35-60-90-1410: o conserto seguinte reescreveu a linha da régua; desfeito ANTES do desfaz do 15 s
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const temLinha = (src, linha) => src.split('\n').some((l) => l === linha)
const ordem = (src, ...marcas) => { let at = -1; for (const m of marcas) { const i = src.indexOf(m, at + 1); if (i < 0 || i <= at) return false; at = i } return true }
const mut = (src, de, para) => { if (!src.includes(de)) throw new Error('mutante não aplicou: ' + de.slice(0, 80)); return src.replace(de, para) }

const ROUTE_REL = 'app/api/generate-script/route.ts'
const HELPER_REL = 'lib/growth/motor15s.ts'
const ROUTE = read(ROUTE_REL)
const HELPER = read(HELPER_REL)
const GEN = read('app/(dashboard)/generate/GenerateClient.tsx')
const SALDO = read('lib/growth/duracaoPeloSaldo.ts')

// ── a regra pura, carregada com a regra do Studio (o único import dela) ──────────────────────────────────────────────
function loadPuro(src, extra = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  const req = (p) => { if (p in extra) return extra[p]; throw new Error('import inesperado: ' + p) }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
  return mod.exports
}
const S = loadPuro(SALDO)
const H = loadPuro(HELPER, { '@/lib/growth/duracaoPeloSaldo': S })
const COST = loadPuro(read('lib/credits/engineCost.ts'))
const DUR = loadPuro(read('lib/durationByEngine.ts'))
const custoSeedance = (s) => COST.creditCostForDuration('cinematic_ai', true, s)
const CURTO = DUR.SEEDANCE_SHORT_SECONDS
const OPCOES = [CURTO, 35, 60, 90]

// ── a rota real, offline ─────────────────────────────────────────────────────────────────────────────────────────────
const RECUSA = "I'm sorry, I can't assist with that request."
const ROTEIRO_15S = `HOOK (0-2s): [Pexels: ocean waves aerial] The ocean holds enough salt to bury every continent.

MICRO REWARD 1: [Pexels: river flowing rocks] Rivers carry dissolved minerals from eroded rocks into the sea, every single day.

MICRO REWARD 2: [Pexels: underwater volcanic vent] Hydrothermal vents on the seafloor pump in even more chlorine and sodium.

PAYOFF: [Pexels: sunlight on sea surface] The water evaporates... but the salt stays behind — for millions of years.`
const palavrasFaladas = (t) => t.replace(/^\s*(HOOK|MICRO REWARD ?\d*|ESCALATION|RHYTHM|PAYOFF)\s*(\([^)]*\))?\s*:?/gim, ' ').replace(/\[[^\]]*\]/g, ' ').trim().split(/\s+/).filter(Boolean).length

/**
 * Executa um POST na rota. `gpt(chamada)` responde cada chamada da OpenAI ({ system, user, n }); `moderacao` é o veredito.
 * Devolve { status, body, chamadas, eventos }.
 */
async function postar({ routeSrc = ROUTE, helperSrc = HELPER, body, gpt, moderacao = { ok: true } }) {
  const chamadas = []
  const eventos = []
  const NextResponse = { json: (b, init) => ({ __res: true, body: b, status: init?.status ?? 200 }) }
  const load = createOfflineLoader({
    mocks: {
      'next/server': { NextResponse, NextRequest: class {} },
      '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u-guardiao' } } }) }, from: () => { throw new Error('banco não deveria ser lido aqui') } }) },
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
      '@/lib/safety/contentModeration': { moderateContent: async () => moderacao },
      '@/lib/reverseTrial': { getEffectiveEntitlement: () => ({ maxDurationSeconds: null }), TRIAL_ENTITLEMENT_COLUMNS: 'plan' },
    },
    source: (rel, src) => (rel === ROUTE_REL ? routeSrc : rel === HELPER_REL ? helperSrc : src),
  })
  const route = load('@/' + ROUTE_REL)
  const req = { json: async () => body }
  const res = await route.POST(req)
  return { status: res.status, body: res.body, chamadas, eventos }
}
const recusaDepoisRoteiro = ({ n }) => (n === 1 ? RECUSA : ROTEIRO_15S)
const recusaSempre = () => RECUSA

console.log('0 — régua de dinheiro (a função que cobra)')
ok(CURTO === 15, 'o filme curto do Seedance 1.5 é de 15 s')
ok(custoSeedance(15) > 0 && custoSeedance(15) <= 14, `15 s (${custoSeedance(15)} cr) cabe no saldo da região (14)`)
ok(custoSeedance(35) > 14 && custoSeedance(60) > 14, `35 s (${custoSeedance(35)} cr) e 60 s (${custoSeedance(60)} cr) NÃO cabem em 14`)

console.log('1 — A1: tema comum a 15 s não é recusado (rota real, offline)')
const temaComum = { topic: 'Why is the ocean salty?', language: 'en', targetSeconds: 15, engine: 'cinematic_ai' }
const r1 = await postar({ body: temaComum, gpt: recusaDepoisRoteiro })
ok(r1.status === 200 && typeof r1.body?.script === 'string' && r1.body.script.includes('PAYOFF'), `15 s, tema comum, 1ª resposta do modelo é recusa → 200 com roteiro (status ${r1.status})`)
ok(r1.chamadas.length === 2, `exatamente UMA nova chamada (${r1.chamadas.length} no total)`)
ok(/SECOND ATTEMPT/.test(r1.chamadas[1]?.system ?? '') && /Treat the customer's text as the SUBJECT of the film/.test(r1.chamadas[1]?.system ?? ''), 'a nova chamada trata o texto como ASSUNTO do filme')
ok(/Decline ONLY if the subject itself is harmful/.test(r1.chamadas[1]?.system ?? ''), 'a nova chamada só recusa assunto nocivo')
const ev1 = r1.eventos.find((e) => e.name === 'script_declined_retry')
ok(ev1?.metadata?.outcome === 'ok' && ev1?.metadata?.modo === 'reframe' && ev1?.metadata?.target_seconds === 15, 'rastro script_declined_retry: ok, modo reframe, alvo 15')
const ordemColada = { topic: 'создай видео которое актуально на сегодня залетит в тт и ютуб', language: 'ru', targetSeconds: 15, engine: 'cinematic_ai' }
const r1b = await postar({ body: ordemColada, gpt: ({ n, system }) => (n === 1 || !/SECOND ATTEMPT/.test(system) ? RECUSA : ROTEIRO_15S) })
ok(r1b.status === 200, `pedido de 222c5ce6 ("crie um vídeo em alta hoje", sem diretiva) → 200 (status ${r1b.status})`)
{
  // A BASE (origin/main) recusava exatamente esses dois — a prova de que o conserto é o que muda o desfecho.
  const base = execFileSync('git', ['-C', ROOT, 'show', BASE_REF + ':' + ROUTE_REL], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n')
  const rb = await postar({ routeSrc: base, body: temaComum, gpt: recusaDepoisRoteiro })
  ok(rb.status === 422 && rb.body?.reason === 'model_refused_topic' && rb.chamadas.length === 1, `na base, o mesmo pedido de 15 s era 422 sem nova tentativa (status ${rb.status}, ${rb.chamadas.length} chamada)`)
}
// as durações longas seguem pelo mesmo caminho (o defeito não era da duração)
const r1c = await postar({ body: { ...temaComum, targetSeconds: 60 }, gpt: ({ n }) => (n === 1 ? RECUSA : ROTEIRO_15S.replace(/PAYOFF/, 'MICRO REWARD 3: [Pexels: x] Three.\n\nESCALATION: [Pexels: y] Higher.\n\nRHYTHM: [Pexels: z] Fast. Faster.\n\nPAYOFF')) })
ok(r1c.status === 200 && r1c.chamadas.length === 2, '60 s: a mesma única nova tentativa (sem 3ª chamada)')

console.log('2 — A1: conteúdo proibido de verdade continua recusado')
const r2 = await postar({ body: temaComum, gpt: recusaDepoisRoteiro, moderacao: { ok: false, reason: 'blocked' } })
ok(r2.status === 422 && r2.body?.reason === 'content_not_allowed' && r2.chamadas.length === 1, `moderação barra → 422 content_not_allowed, sem nova chamada (status ${r2.status}, ${r2.chamadas.length} chamada)`)
ok(r2.body?.error === 'This request cannot be created on Kineo. Nothing was charged.', 'a frase é a da moderação (MODERATION_BLOCKED_MESSAGE), honesta e sem ensinar a contornar')
const r2b = await postar({ body: temaComum, gpt: recusaDepoisRoteiro, moderacao: { ok: false, reason: 'unavailable' } })
ok(r2b.status === 422 && r2b.body?.reason === 'model_refused_topic' && r2b.chamadas.length === 1, 'moderação fora do ar → recusa como antes, sem nova chamada')
const r2c = await postar({ body: temaComum, gpt: recusaSempre })
ok(r2c.status === 422 && r2c.body?.reason === 'model_refused_topic' && r2c.chamadas.length === 2, 'o modelo recusa de novo (assunto nocivo) → 422, nunca uma 3ª chamada')
ok(/Use my script as is/.test(r2c.body?.error ?? '') && /Nothing was charged/.test(r2c.body?.error ?? ''), 'a recusa final diz o que fazer (reescrever ou colar o próprio roteiro) e que nada foi cobrado')
const r2d = await postar({ body: { ...temaComum, topic: 'A pornographic sex scene with naked strangers' }, gpt: recusaDepoisRoteiro })
ok(r2d.status === 400 && r2d.chamadas.length === 0, `sexo explícito → 400 antes de qualquer OpenAI (status ${r2d.status}, ${r2d.chamadas.length} chamadas)`)

console.log('3 — A2: o piso de palavras do 15 s')
const autoria = { topic: 'Why is the ocean salty?', language: 'en', targetSeconds: 15, forceAuthoring: true }
const r3 = await postar({ body: autoria, gpt: () => ROTEIRO_15S })
const pisoEsperado = Math.ceil(CURTO * 0.95 * 2.5 - 1e-9)
ok(r3.status === 200 && r3.body?.minWords === pisoEsperado && r3.body?.family === 'classic', `"Write the full script" a 15 s sem motor → piso ${pisoEsperado} palavras na régua do 15 s (veio ${r3.body?.minWords}, ${r3.body?.family})`)
ok(pisoEsperado / 2.5 >= CURTO * 0.95, `${pisoEsperado} palavras na voz do 15 s (2,5 pal/s) = ${(pisoEsperado / 2.5).toFixed(1)} s ≥ 95 % de 15 s — nunca abaixo do alvo`)
{
  const base = execFileSync('git', ['-C', ROOT, 'show', BASE_REF + ':' + ROUTE_REL], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n')
  const rb = await postar({ routeSrc: base, body: autoria, gpt: () => ROTEIRO_15S })
  ok(rb.body?.minWords < pisoEsperado, `na base, a autoria a 15 s pedia só ${rb.body?.minWords} palavras (régua histórica 2,3 × 0,95)`)
}
// reancorado KINEO-REGUA-35-60-90-1410: a autoria a 60 s sem motor ganhou a régua da voz real (guardião próprio: scripts/test-regua-35-60-90-1410.mjs).
// O que ESTE conserto prova continua de pé: fora do 15 s ele não muda nada — com a rota sem o conserto seguinte, 60 s sem motor é a régua de antes,
// e com ele, 60 s sem motor nunca cai na régua do 15 s.
const r3b = await postar({ routeSrc: semRegua35a90_1410(ROUTE), body: { ...autoria, targetSeconds: 60 }, gpt: () => ROTEIRO_15S }) // reancorado KINEO-REGUA-35-60-90-1410
ok(r3b.body?.minWords === Math.ceil(60 * 0.95 * 2.3) && r3b.body?.family === 'legacy', 'autoria a 60 s sem motor: régua de antes, intacta (fora do 15 s nada muda)')
const r3bAgora = await postar({ body: { ...autoria, targetSeconds: 60 }, gpt: () => ROTEIRO_15S }) // reancorado KINEO-REGUA-35-60-90-1410
ok(r3bAgora.body?.minWords > pisoEsperado && r3bAgora.body?.minWords >= Math.ceil(60 * 0.95 * 2.3), `autoria a 60 s sem motor, com o conserto seguinte: nunca a régua do 15 s (${r3bAgora.body?.minWords} palavras)`) // reancorado KINEO-REGUA-35-60-90-1410
const r3c = await postar({ body: { ...temaComum, engine: 'fast' }, gpt: () => ROTEIRO_15S })
ok(r3c.status === 200 && r3c.chamadas.length >= 1, 'com motor (Kineo 1) o escritor segue na régua do motor')
const r3d = await postar({ body: temaComum, gpt: recusaDepoisRoteiro })
ok(/between 36 and 41 spoken words/.test(r3d.chamadas[1]?.system ?? ''), 'no 15 s, a única nova chamada leva a faixa de palavras (36–41) — não há 3ª chamada para encher')
ok(palavrasFaladas(r1.body.script) >= 36, `o roteiro devolvido no resgate fica no piso (${palavrasFaladas(r1.body.script)} palavras)`)

console.log('4 — A3: o autofit nunca sobe além do que o saldo paga (conta que não paga)')
const sub = (over) => H.subidaQueOSaldoPaga({ atual: 15, alvo: 35, opcoes: OPCOES, saldo: 14, paga: false, custo: custoSeedance, ...over })
const a1 = sub()
ok(a1.para === 15 && a1.segurou === true && a1.motivo === 'held_at_current', 'fala de 35 s, seletor em 15, saldo 14 → fica em 15 (não abre modal de crédito)')
ok(sub({ saldo: custoSeedance(35) }).para === 35 && sub({ saldo: custoSeedance(35) }).segurou === false, `saldo ${custoSeedance(35)} paga 35 s → sobe para 35`)
ok(sub({ atual: 35, alvo: 90, saldo: custoSeedance(60) }).para === 60, 'quer 90, saldo paga 60 → sobe só até 60')
let violou = 0
for (let saldo = 0; saldo <= 120; saldo++) for (const atual of OPCOES) for (const alvo of OPCOES) {
  const r = H.subidaQueOSaldoPaga({ atual, alvo, opcoes: OPCOES, saldo, paga: false, custo: custoSeedance })
  if (alvo > atual && r.para > atual && custoSeedance(r.para) > saldo) violou++
  if (alvo > atual && r.para > alvo) violou++
  if (alvo <= atual && r.para !== alvo) violou++
}
ok(violou === 0, `varredura saldo 0–120 × 4 × 4: nenhuma subida além do saldo, nenhuma acima do pedido (${violou} violações)`)
ok(sub({ paga: true }).para === 35 && sub({ paga: null }).para === 35 && sub({ saldo: null }).para === 35, 'conta que paga, desconhecida ou saldo desconhecido: sobe como antes')
ok(sub({ alvo: 15, atual: 35 }).para === 15, 'descer nunca é segurado')

console.log('5 — B: "60-second" colado com 14 cr → 15 s e a nota')
const b1 = H.subidaQueOSaldoPaga({ atual: 15, alvo: 60, opcoes: OPCOES, saldo: 14, paga: false, custo: custoSeedance })
ok(b1.para === 15 && b1.segurou === true, 'diretiva colada 60 s, conta de 14 cr → fica em 15 s')
ok(H.notaDaSubidaSegura({ engine: 'seedance', para: b1.para, saldo: 14, segundosDoFilmeGratis: CURTO }) === 'Your free film is 15 s — longer films need a plan.', 'nota: "Your free film is 15 s — longer films need a plan." (a mesma do Studio)')
const b2 = H.subidaQueOSaldoPaga({ atual: 15, alvo: 60, opcoes: OPCOES, saldo: 500, paga: true, custo: custoSeedance })
ok(b2.para === 60 && b2.segurou === false, 'conta que paga, com saldo → 60 s respeitado')
ok(H.subidaQueOSaldoPaga({ atual: 15, alvo: 60, opcoes: OPCOES, saldo: 14, paga: true, custo: custoSeedance }).para === 60, 'conta que paga com saldo curto → 60 s como hoje (a parede de sempre explica)')
ok(H.subidaQueOSaldoPaga({ atual: 15, alvo: 60, opcoes: OPCOES, saldo: custoSeedance(60), paga: false, custo: custoSeedance }).para === 60, 'conta que não paga, mas com saldo para 60 s → 60 s')

console.log('6 — a fiação no GenerateClient')
ok(GEN.includes("import { subidaQueOSaldoPaga, notaDaSubidaSegura, SUBIDA_SEGURA_PELO_SALDO_EVENT, MOTOR_15S_VERSION } from '@/lib/growth/motor15s' // KINEO-MOTOR-15S-1510"), 'importa a regra pura')
ok(temLinha(GEN, '    const contaPagaNaSubida = planTier === null ? null : hasPaid || isStarter || isCreator || isStudio // KINEO-MOTOR-15S-1510 — o mesmo predicado da descida do filme grátis (null = ainda não sabemos)'), 'quem paga: o mesmo predicado da descida do filme grátis')
ok(temLinha(GEN, '    const custoDaOpcao = (segundos: number): number => costForDurationOption(segundos as Duration) // KINEO-MOTOR-15S-1510 — a função que cobra, na qualidade da tela'), 'custo: a função que cobra (costForDurationOption → creditCostForDuration)')
ok(ordem(GEN, 'const subidaColada = leituraColada.suggestedDuration !== null ? subidaQueOSaldoPaga({ atual: duration, alvo: leituraColada.suggestedDuration, opcoes: opcoesDeDuracao.map((o) => o.value), saldo: credits, paga: contaPagaNaSubida, custo: custoDaOpcao })', 'setDuration(duracaoColada as Duration)', "avisarSubidaSegura(subidaColada, 'pasted_directive')", 'applied_seconds: duracaoColada,'), 'diretiva colada: decide pelo saldo ANTES de mexer no seletor; o evento grava o que foi aplicado')
ok(!/setDuration\(leituraColada\.suggestedDuration/.test(GEN), 'nenhum caminho aplica a duração colada crua')
ok(ordem(GEN, 'const subidaDoAutofit = sobeCabeNoSaldo && sobeParaBruto !== undefined ? subidaQueOSaldoPaga({ atual: duration, alvo: sobeParaBruto, opcoes: opcoesDeDuracao.map((o) => o.value), saldo: credits, paga: contaPagaNaSubida, custo: custoDaOpcao })', 'const sobePara = sobeCabeNoSaldo ? (subidaDoAutofit ?', 'setDuration(sobePara)'), 'autofit: a subida passa pela regra do saldo antes do setDuration')
ok(GEN.includes("modoDoTextoNoCurto = 'ai'") && GEN.includes('(opts?.scriptModeOverride ?? modoDoTextoNoCurto ?? scriptMode) === \'ai\''), 'roteiro longo de quem não paga a subida: fica em 15 s e o escritor do 15 s o encaixa')
ok(GEN.includes('data-kineo="subida-segura-saldo"') && GEN.includes('{notaSubidaSegura.texto}'), 'a nota aparece na tela')
ok(GEN.includes('if (sub.custoPara !== null) setNotaSubidaSegura({') && H.subidaQueOSaldoPaga({ atual: 15, alvo: 60, opcoes: OPCOES, saldo: 3, paga: false, custo: custoSeedance }).custoPara === null, 'saldo que nem o 15 s paga: segura, mas sem a nota de "filme grátis" (a parede de sempre explica)')
ok(GEN.includes("message: res.status === 422 && typeof data?.error === 'string' && data.error.trim() ? data.error.trim() : 'The writer could not finish right now. Try again in a moment.'"), 'autoria recusada: a frase do servidor (o que fazer), não "Try again in a moment"')

console.log('7 — a rota: ordem e selo')
ok(ordem(ROUTE, 'if (looksLikeModelRefusal(script)) {', 'resgateDaRecusa(decidirNovaTentativaDoRoteiro(topic), topic)', 'await moderateContent({', "conteudoBarrado = moderacao.reason === 'blocked'", 'SYSTEM_PROMPT + instrucaoDoResgate(', 'if (historiaAceita === null) {', "if (conteudoBarrado) return await recusar(422, { error: moderationRefusalMessage('blocked')", 'return await recusar(422, { error: MODEL_REFUSAL_MESSAGE'), 'recusa → resgate → moderação → 1 chamada reenquadrada → recusa (barrada ou não)')
{
  const bloco = ROUTE.slice(ROUTE.indexOf('if (looksLikeModelRefusal(script)) {'), ROUTE.indexOf('tentativaDaHistoria = true'))
  ok((bloco.match(/chat\.completions\.create/g) || []).length === 1, 'só 1 nova chamada no bloco da recusa')
}
ok(/\[TRAVA 8\.2 — vai do fundador 15\/10\]/.test(ROUTE) && /\[TRAVA 8\.2 — vai do fundador 15\/10\]/.test(GEN) && /\[TRAVA 8\.2 — vai do fundador 15\/10\]/.test(HELPER), 'selo da trava nos três arquivos')
ok(!/\b\d+\s*cr\b|\$\s*\d/.test(HELPER.replace(/^\s*\/\/.*$/gm, '')), 'o módulo novo não digita preço nenhum')

console.log('8 — desfeito o conserto, os arquivos são a base (origin/main)')
for (const [arq, rel, atual] of [['route', ROUTE_REL, ROUTE], ['client', 'app/(dashboard)/generate/GenerateClient.tsx', GEN]]) {
  let base = ''
  try { base = execFileSync('git', ['-C', ROOT, 'show', BASE_REF + ':' + rel], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n') } catch { base = '' }
  let d = null
  try { d = semMotor15s1510(arq === 'route' ? semRegua35a90_1410(semModeracao1410(atual, 'script')) : desfazParceiroEyebible2_1410(rel, atual), arq) } catch (e) { d = 'ERRO: ' + e.message } // reancorado KINEO-REGUA-35-60-90-1410 · reancorado KINEO-MODERACAO-1410
  ok(base !== '' && d === base, `${rel}: tiradas as linhas KINEO-MOTOR-15S-1510, é byte a byte a base`)
  ok(semMotor15s1510(base, arq) === base, `${rel}: o desfaz é idempotente sobre a base`)
  const marcadas = (arq === 'route' ? semRegua35a90_1410(atual) : atual).split('\n').filter((l) => l.includes('KINEO-MOTOR-15S-1510')).length // reancorado KINEO-REGUA-35-60-90-1410
  ok(marcadas === FORMA_MOTOR_15S_1510[arq].trocas + FORMA_MOTOR_15S_1510[arq].acrescimos, `${rel}: ${marcadas} linhas marcadas = a forma do desfaz`)
}
{
  let lancou = false
  try { semMotor15s1510(ROUTE + '\nconst x = 1 // KINEO-MOTOR-15S-1510', 'route') } catch { lancou = true }
  ok(lancou, 'linha marcada inesperada → o desfaz lança')
}

console.log('9 — mutantes')
{
  // M1 — sem o reenquadramento: o pedido sem diretiva volta a ser recusado a 15 s
  const m = mut(HELPER, "  return { tentar: true, story: texto, modo: 'reframe', removedLines: historia.removedLines, strippedMarkers: 0, words: contarPalavras(texto) }", '  return { tentar: false, motivo: historia.motivo, removedLines: historia.removedLines, words: historia.words }')
  const r = await postar({ helperSrc: m, body: temaComum, gpt: recusaDepoisRoteiro })
  ok(r.status === 422, `mutante pego: sem o resgate, o tema comum de 15 s volta ao 422 (status ${r.status})`)
}
{
  // M2 — sem o motor do 15 s no escritor: o piso cai para a régua histórica
  const m = mut(HELPER, "  return semMotor && filmeCurto ? 'cinematic_ai' : engine", '  return engine')
  const r = await postar({ helperSrc: m, body: autoria, gpt: () => ROTEIRO_15S })
  ok(r.body?.minWords !== pisoEsperado, `mutante pego: sem o motor do 15 s, o piso cai para ${r.body?.minWords}`)
}
{
  // M3 — sem a regra do saldo: o "60-second" colado volta a subir para 60 com 14 cr
  const M = loadPuro(mut(HELPER, "  if (r.motivo === 'fit' && r.duracao > f.atual)", "  if (false && r.motivo === 'fit' && r.duracao > f.atual)").replace("  if (r.motivo === 'fit' || r.motivo === 'nothing_shorter_fits')", '  if (false)'), { '@/lib/growth/duracaoPeloSaldo': S })
  ok(M.subidaQueOSaldoPaga({ atual: 15, alvo: 60, opcoes: OPCOES, saldo: 14, paga: false, custo: custoSeedance }).para === 60, 'mutante pego: sem a regra do saldo, 14 cr subiriam para 60 s')
}
{
  // M4 — moderação barrando sem efeito: o conteúdo proibido ganharia a nova chamada
  const m = mut(ROUTE, '        if (!moderacao.ok) {', '        if (false) {')
  const r = await postar({ routeSrc: m, body: temaComum, gpt: recusaDepoisRoteiro, moderacao: { ok: false, reason: 'blocked' } })
  ok(r.status === 200 && r.chamadas.length === 2, `mutante pego: sem a trava da moderação, o conteúdo barrado viraria roteiro (status ${r.status})`)
}
{
  // M5 — a fiação da diretiva colada sem a conta que paga: a checagem da fiação fica vermelha
  const m = mut(GEN, 'saldo: credits, paga: contaPagaNaSubida, custo: custoDaOpcao }) : null // KINEO-MOTOR-15S-1510 — "60-second"', 'saldo: credits, paga: true, custo: custoDaOpcao }) : null // KINEO-MOTOR-15S-1510 — "60-second"')
  ok(!ordem(m, 'const subidaColada = leituraColada.suggestedDuration !== null ? subidaQueOSaldoPaga({ atual: duration, alvo: leituraColada.suggestedDuration, opcoes: opcoesDeDuracao.map((o) => o.value), saldo: credits, paga: contaPagaNaSubida, custo: custoDaOpcao })', 'setDuration(duracaoColada as Duration)'), 'mutante pego: a diretiva colada sem o predicado de quem paga')
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
