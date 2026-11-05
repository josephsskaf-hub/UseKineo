// KINEO-K4-FAIXA-TETO-0511 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião: o roteiro do filme grátis Kling 4 nasce
// na faixa de palavras, também quando o escritor condensa texto colado.
//
// Defeito medido (events, 26/10–05/11): 12 claims = 5 fits, 5 narration_over_kling4_15s, 1 timeout, 1 unmeasured. Os 5 "over" foram ao Seedance de reserva:
//   A) ideia: faixa 31–32 pedida, duas versões acima (38→37 es, 38→35 en) e o corte por frases sem o que tirar → 17,42 s e 17,09 s;
//   B) texto colado longo que o escritor reescreve: sem faixa (!colado.pasted), condensado para o teto do Seedance (41) → 17,86 s, 18,76 s e 16,58 s.
// Este guardião EXECUTA a rota real (offline: OpenAI, banco e eventos são dublês), com os textos REAIS (script_written.original_idea), e a compara com a base
// nos controles: colado curto palavra por palavra, pagante, motor que não é Seedance, 35/60 s e quem já fez filme ficam idênticos, byte a byte.
// Rodar: node scripts/test-k4-faixa-teto-0511.mjs   (sem rede, sem custo)
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const MARCA = 'KINEO-K4-FAIXA-TETO-0511'
const BASE_REF = (() => {
  try { const shas = git('log', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean); return shas.length ? shas[shas.length - 1] + '^' : 'origin/main' } catch { return 'origin/main' }
})()
const ROUTE = 'app/api/generate-script/route.ts'
const K4 = 'lib/kling4TrialScript.ts'
const BASE_ROUTE = lf(git('show', `${BASE_REF}:${ROUTE}`))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m) } else { fail++; console.log('  FALHA ' + m) } }

// ── Os textos reais ─────────────────────────────────────────────────────────────────────────────
const IDEIA_ES = 'Genera un vídeo viral de 40 segundos para YouTube Shorts. Una historia emocionante sobre un pequeño perro abandonado que salva a una niña. Estilo animación cinematográfica 3D familiar, personajes adorables, expresiones faciales detalladas, escenarios espectaculares y movimientos naturales. Gancho impactante al principio, historia emocionante y giro inesperado al final. Voz narrativa en español de España, subtítulos sincronizados, música emotiva y efectos de sonido. Formato vertical 9:16. Genera y monta todo automáticamente.' // 7e3283df
const ROTEIRO_ES_37 = 'HOOK (0-2s): [Pexels: rainy street] Un perro pequeño... cambia una vida.\n\nMICRO REWARD 1: [Pexels: small dog walking] En una noche lluviosa, un perro callejero busca refugio.\n\nMICRO REWARD 2: [Pexels: girl in park] Una niña perdida llora sola en el parque.\n\nPAYOFF: [Pexels: dog and girl happily reunited] El perro la encuentra, la guía a casa... y se convierte en su héroe.'
const APARA_ES_32 = 'HOOK (0-2s): [Pexels: rainy street] Un perro pequeño cambia vidas.\n\nMICRO REWARD 1: [Pexels: small dog walking] En la lluvia, un perro callejero busca refugio.\n\nMICRO REWARD 2: [Pexels: girl in park] Una niña llora sola en el parque.\n\nPAYOFF: [Pexels: dog and girl happily reunited] El perro la guía a casa y se convierte en su héroe.'
const IDEIA_EN = 'The disappearance nobody solved in 70 years' // 708e5a15
const ROTEIRO_EN_35 = 'HOOK: [Pexels: foggy forest] A plane vanished—unsolved for 70 years!\n\nMICRO REWARD 1: [Pexels: old archive flight documents] In 1950, Northwest Flight 2501 vanished over Lake Michigan.\n\nMICRO REWARD 2: [Pexels: search boats on water] Despite searches, no wreckage was ever found.\n\nPAYOFF: [Pexels: aerial view of Lake Michigan] The leading theory: turbulence caused a crash, leaving us with just the mystery.'
const APARA_EN_31 = 'HOOK: [Pexels: foggy forest] A plane vanished, unsolved for 70 years!\n\nMICRO REWARD 1: [Pexels: old archive flight documents] In 1950, Flight 2501 vanished over Lake Michigan.\n\nMICRO REWARD 2: [Pexels: search boats on water] Despite searches, no wreckage was found.\n\nPAYOFF: [Pexels: aerial view of Lake Michigan] The leading theory: turbulence caused a crash over the lake.'
const ONODA = 'Short: “El soldado que no se rindió durante 29 años”\n\nDuración: 45-50 s | Formato: 9:16, 1080x1920, 30 fps | Anécdota real: Hiroo Onoda\n\nTítulo\n\nSiguió en guerra 29 años después de que terminara 🪖\n\nGuion con tiempos\nTiempo    Voz en off (ritmo rápido, tono de misterio)    Imagen / edición    Texto en pantalla\n0-3 s    “La Segunda Guerra Mundial terminó en 1945... pero un soldado no se enteró.”    Zoom rápido a una selva oscura, sonido de impacto    “LA GUERRA TERMINÓ EN 1945” → corte seco → “ÉL NO LO SABÍA”\n3-10 s    “Se llamaba Hiroo Onoda, teniente japonés, y fue enviado a la isla filipina de Lubang con una orden: no rendirse jamás.”    Mapa animado con zoom a Lubang y foto de archivo en blanco y negro    Hiroo Onoda / Filipinas, 1944\n10-18 s    “Cuando la guerra acabó, avionetas lanzaron panfletos diciendo que había paz. Él pensó que era un truco enemigo.”    Papeles cayendo del cielo, efecto de vibración    “¿Paz? Imposible.”\n46-50 s    “Onoda se rindió tras 29 años. Moraleja: a veces la lealtad también puede ser una trampa. ¿Tú habrías creído que acabó?”    Fundido a negro con pregunta final    “¿Tú le hubieras creído? 👇”\nEdición\nGancho: empieza con la frase más impactante en menos de 3 s, sin intro ni logo.' // ee22bac0
const ROTEIRO_ONODA_31 = 'HOOK (0-2s): [Pexels: selva oscura] La Segunda Guerra Mundial terminó en 1945... pero un soldado no se enteró.\n\nMICRO REWARD 1: [Pexels: papeles cayendo cielo] Avionetas lanzaron panfletos de paz.\n\nPAYOFF: [Pexels: ceremonia rendición] En 1974, su comandante dio la orden oficial de rendirse... tras 29 años.'
const KIWIFY = 'Segue um roteiro pensado para um produto digital da Kiwify, sem afirmar resultados garantidos:\n\n🎬 CENA 1 (0–3s) – GANCHO\n\n🗣️ "Você também acha que emagrecer ou ganhar massa é muito mais complicado do que deveria?"\n\n🎬 CENA 2 (3–8s)\n\n🗣️ "A maioria das pessoas perde tempo seguindo dicas aleatórias da internet e acaba sem resultados."\n\n🎬 CENA 3 (8–18s)\n\n🗣️ "Foi por isso que encontrei um guia completo que reúne estratégias de alimentação, treino e organização da rotina para quem quer evoluir de forma mais eficiente."\n\n🎬 CENA 4 (18–25s)\n\n🗣️ "É um material 100% digital. Você recebe o acesso online e pode estudar no seu ritmo, direto pelo celular."\n\n🎬 CENA 5 (25–35s) – CTA\n\n🗣️ "Se você quer conhecer esse material e ver tudo o que ele oferece, clique no link ou no botão da Kiwify. Dá uma olhada e veja se faz sentido para o seu objetivo!"\n\nEsse formato costuma prender mais atenção nos primeiros segundos e evita promessas de emagrecimento ou hipertrofia garantidos, o que é importante para manter a divulgação responsável e em conformidade com as plataformas.' // 39ba7383
const ROTEIRO_KIWIFY_41 = 'HOOK (0-2s): [Pexels: gym workout struggle] Você também acha que emagrecer ou ganhar massa é complicado?\n\nMICRO REWARD 1: [Pexels: scrolling phone frustrated] A maioria perde tempo com dicas aleatórias da internet.\n\nMICRO REWARD 2: [Pexels: organized fitness planner] Encontrei um guia completo com estratégias de alimentação e treino.\n\nPAYOFF: [Pexels: mobile phone digital course] É 100% digital... estude no seu ritmo pelo celular com a Kiwify.'
const ROTEIRO_KIWIFY_30 = 'HOOK (0-2s): [Pexels: gym workout struggle] Você também acha que emagrecer ou ganhar massa é complicado?\n\nMICRO REWARD 1: [Pexels: scrolling phone frustrated] A maioria perde tempo com dicas da internet.\n\nPAYOFF: [Pexels: mobile phone digital course] É 100% digital... estude no seu ritmo pelo celular com a Kiwify.'
const PETROV = 'One man stopped World War 3 in 1983 by doing absolutely nothing — and he was punished for it. This is the story of Stanislav Petrov, the Soviet officer who, on 26 September 1983, ignored a false nuclear missile warning and refused to launch a retaliation, preventing a possible World War 3, yet was punished and kept quiet for years.' // 10e648b1
const ROTEIRO_PETROV_31 = 'HOOK: [Pexels: nuclear command center] One man stopped World War 3 by doing absolutely nothing.\n\nMICRO REWARD 1: [Pexels: tense control room] Stanislav Petrov ignored the alert, preventing a global catastrophe.\n\nPAYOFF: [Pexels: isolated man in shadows] Instead of being hailed, he was punished and then silenced for years.'
const CABE_32 = 'HOOK: [Pexels: mountain view] This mountain view hides a secret.\n\nMICRO REWARD 1: [Pexels: alpine lake] Beneath it sits a frozen lake.\n\nMICRO REWARD 2: [Pexels: ice core] Its ice is ten thousand years old.\n\nPAYOFF: [Pexels: scientist with ice] The ice holds air from the last ice age.'
const DIALOGO_CURTO = 'Motu: Chutki, is Bheem at home today?\nChutki: He went to the river with Raju.\nMotu: Then who will eat these ladoos?\nChutki: You will, Motu, as always.' // colado curto: cabe no teto normal do filme curto
const ROTEIRO_DIALOGO = 'HOOK: [Pexels: village] Motu: Chutki, is Bheem at home today?\n\nMICRO REWARD 1: [Pexels: river] Chutki: He went to the river with Raju.\n\nMICRO REWARD 2: [Pexels: sweets] Motu: Then who will eat these ladoos?\n\nPAYOFF: [Pexels: laughing kids] Chutki: You will, Motu, as always.'

// ── A rota real, offline ─────────────────────────────────────────────────────────────────────
let atraso = 0
class Relogio extends Date { static now() { return Date.now() + atraso } }
const ehEscritor = (system) => system.includes('world-class viral YouTube Shorts scriptwriter')
async function postar({ routeSrc = null, k4Src = null, body, gpt, plan = 'free', hasPaid = false, films = 0, debits = 0, env = {} }) {
  atraso = 0
  const chamadas = [], eventos = []
  const NextResponse = { json: (b, init) => ({ body: b, status: init?.status ?? 200 }) }
  const consulta = (table) => {
    const q = { select: () => q, eq: () => q, neq: () => q, like: () => q, is: () => q,
      maybeSingle: async () => ({ data: table === 'profiles' ? { plan, has_paid: hasPaid } : null, error: null }),
      then: (ok_) => ok_({ count: table === 'videos' ? films : debits, error: null }) }
    return q
  }
  const load = createOfflineLoader({
    env,
    globals: { Date: Relogio },
    mocks: {
      'next/server': { NextResponse, NextRequest: class {} },
      '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u-guardiao' } } }) }, from: consulta }) },
      '@/lib/openai': {
        OPENAI_SCRIPT_TIMEOUT_MS: 35000,
        openai: { chat: { completions: { create: async (req, opts) => {
          const system = req.messages.find((m) => m.role === 'system')?.content ?? ''
          if (!ehEscritor(system)) return { choices: [{ message: { content: '{"hook_promises_answer":false,"ends_with_concrete_answer":true}' } }] } // o juiz do fim
          const n = chamadas.length + 1
          const ultimo = req.messages[req.messages.length - 1]?.content ?? ''
          chamadas.push({ n, system, ultimo, timeout: opts?.timeout })
          const content = gpt({ n, system, ultimo })
          if (content instanceof Error) throw content
          return { choices: [{ message: { content } }] }
        } } } },
      },
      '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } },
      '@/lib/openaiAlert': { looksOpenAiQuotaDead: () => false, looksOpenAiHanging: () => false, alertOpenAiExhausted: async () => {}, openAiAlertKind: () => 'x', ENGINE_CAPACITY_MESSAGE: 'capacity' },
      '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
      '@/lib/safety/topicModeration': { moderateTopic: async () => ({ ok: true }) },
      '@/lib/reverseTrial': { getEffectiveEntitlement: () => ({ maxDurationSeconds: null }), TRIAL_ENTITLEMENT_COLUMNS: 'plan' },
    },
    source: (rel, src) => (routeSrc !== null && rel === ROUTE ? routeSrc : k4Src !== null && rel === K4 ? k4Src : src),
  })
  const route = load('@/' + ROUTE)
  const res = await route.POST({ json: async () => body })
  return { status: res.status, script: res.body?.script, chamadas, escrito: eventos.find((e) => e.name === 'script_written')?.metadata }
}
const pedido = (topic, language = 'en', engine = 'cinematic_ai', targetSeconds = 15) => ({ topic, language, targetSeconds, engine })
const so = (mapa, ultimo) => (ctx) => mapa[ctx.n - 1] ?? ultimo

// ── A — ideia: o escritor passou do teto nas duas versões ───────────────────────────────────────
console.log('A — o escritor acima do teto da faixa ganha UMA apara')
for (const [nome, ideia, lang, acima, apara, palavrasDepois] of [['7e3283df es', IDEIA_ES, 'es', ROTEIRO_ES_37, APARA_ES_32, 32], ['708e5a15 en', IDEIA_EN, 'en', ROTEIRO_EN_35, APARA_EN_31, 31]]) {
  const r = await postar({ body: pedido(ideia, lang), gpt: so([acima, acima, apara]) })
  ok(r.status === 200 && r.chamadas.length === 3, `${nome}: 1ª + nova tentativa + apara = ${r.chamadas.length} chamadas`)
  ok(r.script === apara && r.escrito?.short_film_words === palavrasDepois, `${nome}: sai a apara, ${r.escrito?.short_film_words} palavras (faixa ${r.escrito?.kling4_writer_band?.min}-${r.escrito?.kling4_writer_band?.max})`)
  ok(r.escrito?.kling4_trim?.adopted === true, `${nome}: rastro kling4_trim ${JSON.stringify(r.escrito?.kling4_trim)}`)
  ok(/it must lose \d+ words/.test(r.chamadas[2]?.ultimo ?? '') && /Word budget per section: HOOK/.test(r.chamadas[2]?.ultimo ?? '') && /PAYOFF: \d+ words now/.test(r.chamadas[2]?.ultimo ?? ''), `${nome}: o pedido leva o orçamento por seção`)
  const base = await postar({ routeSrc: BASE_ROUTE, body: pedido(ideia, lang), gpt: so([acima, acima, apara]) })
  ok(base.chamadas.length === 2 && base.script === lf(acima).trim() && base.escrito?.short_film_cut === 'none', `${nome}, na base: ${base.chamadas.length} chamadas, sai acima do teto com corte "none" (o defeito)`)
}

console.log('A — a apara que não serve não entra: fica a versão anterior, nunca filme truncado nem 422')
const semRevelacao = ROTEIRO_EN_35.replace(/PAYOFF:.*$/s, 'PAYOFF: [Pexels: lake] What really happened?')
const semPayoff = ROTEIRO_EN_35.replace(/\n\nPAYOFF:.*$/s, '')
const semBloco = ROTEIRO_EN_35.replace(/\n\nMICRO REWARD 2:[^\n]*/, '')
const fraseCortada = APARA_EN_31.replace('turbulence caused a crash over the lake.', 'turbulence caused a crash over the')
const abaixoDoPiso = 'HOOK: [Pexels: fog] A plane vanished.\n\nMICRO REWARD 1: [Pexels: docs] Flight 2501, 1950.\n\nMICRO REWARD 2: [Pexels: boats] No wreckage.\n\nPAYOFF: [Pexels: lake] Turbulence caused the crash.'
for (const [nome, apara] of [['erro da chamada', new Error('timeout')], ['resposta vazia', ''], ['abaixo do piso', abaixoDoPiso], ['fim em pergunta', semRevelacao], ['sem PAYOFF', semPayoff], ['perdeu uma seção', semBloco], ['frase cortada', fraseCortada], ['não melhorou', ROTEIRO_EN_35], ['recusa do modelo', "I'm sorry, but I can't assist with that request."]]) {
  const r = await postar({ body: pedido(IDEIA_EN), gpt: so([ROTEIRO_EN_35, ROTEIRO_EN_35, apara]) })
  ok(r.status === 200 && r.script === lf(ROTEIRO_EN_35).trim() && r.escrito?.kling4_trim?.adopted === false && r.chamadas.length === 3, `${nome}: fica a anterior (35 palavras), 200, adopted false`)
}
{
  const r = await postar({ body: pedido(IDEIA_EN), gpt: ({ n }) => { if (n === 2) atraso = 55_000; return ROTEIRO_EN_35 } })
  ok(r.status === 200 && r.chamadas.length === 2 && r.escrito?.kling4_trim?.skipped_deadline === true, 'sem tempo no maxDuration de 60 s: não chama a apara, e o rastro diz')
  const c = await postar({ body: pedido(IDEIA_EN), gpt: ({ n }) => { if (n === 2) atraso = 30_000; return n === 3 ? APARA_EN_31 : ROTEIRO_EN_35 } })
  ok(c.chamadas[2]?.timeout > 26_000 && c.chamadas[2]?.timeout <= 27_000, `com 30 s gastos o prazo da apara encolhe (${c.chamadas[2]?.timeout} ms)`)
}

// ── B — texto colado que o escritor reescreve ──────────────────────────────────────────────────
console.log('B — colado longo entra na faixa; o texto da pessoa é a história')
for (const [nome, texto, lang, roteiro, min, max] of [['ee22bac0 Onoda es', ONODA, 'es', ROTEIRO_ONODA_31, 31, 32], ['39ba7383 Kiwify pt', KIWIFY, 'pt', ROTEIRO_KIWIFY_30, 30, 31], ['10e648b1 Petrov en', PETROV, 'en', ROTEIRO_PETROV_31, 31, 32]]) {
  const r = await postar({ body: pedido(texto, lang), gpt: so([roteiro]) })
  ok(r.status === 200 && r.escrito?.kling4_writer_band?.min === min && r.escrito?.kling4_writer_band?.max === max, `${nome}: faixa ${min}-${max} no rastro`)
  ok(r.escrito?.kling4_pasted_condensed === true, `${nome}: kling4_pasted_condensed`)
  ok(r.chamadas[0]?.system.includes(`${min}-${max} spoken words`) && /THE USER'S TEXT IS LONGER THAN THIS FILM/.test(r.chamadas[0]?.system ?? '') && r.chamadas[0]?.system.includes('THE USER PASTED THEIR OWN SCRIPT'), `${nome}: o prompt manda condensar na faixa, sem inventar`)
  ok(r.chamadas.length === 1 && r.script === roteiro, `${nome}: na faixa na 1ª → uma chamada só (a base sempre gastava 2, "curto" contra o piso de 90 % do colado)`)
  const base = await postar({ routeSrc: BASE_ROUTE, body: pedido(texto, lang), gpt: so([roteiro]) })
  ok(base.escrito?.kling4_writer_band === undefined && base.escrito?.short_film_ceiling === 41, `${nome}, na base: sem faixa, teto ${base.escrito?.short_film_ceiling} (o defeito)`)
}
{
  const r = await postar({ body: pedido(KIWIFY, 'pt'), gpt: so([ROTEIRO_KIWIFY_41]) })
  ok(r.chamadas.length === 1 && r.escrito?.short_film_words <= 31 && r.escrito?.short_film_cut === 'sentences', `o colado real que o escritor devolveu com 41 (39ba7383): o corte por frases já cai na faixa (${r.escrito?.short_film_words}), sem nova chamada`)
  ok(/PAYOFF/.test(r.script ?? '') && /Kiwify\.$/.test(lf(r.script ?? '').trim()), 'o final da pessoa (a Kiwify) segue no fim')
  const curto = 'HOOK: [Pexels: x] One man stopped World War 3.\n\nPAYOFF: [Pexels: y] He was punished.'
  const c = await postar({ body: pedido(PETROV), gpt: so([curto, ROTEIRO_PETROV_31]) })
  ok(c.chamadas.length === 2 && /needs at least 31/.test(c.chamadas[1]?.ultimo ?? '') && !/keep every sentence they wrote/.test(c.chamadas[1]?.ultimo ?? '') && c.script === ROTEIRO_PETROV_31, 'colado condensado abaixo do piso: a nova tentativa cobra o piso da faixa, não "mantenha todas as frases"')
}

// ── C — controles: idênticos à base, byte a byte ───────────────────────────────────────────────
console.log('C — controles idênticos à base (prompt, chamadas, roteiro, rastro)')
const igualABase = async (nome, args) => {
  const [a, b] = [await postar(args), await postar({ ...args, routeSrc: BASE_ROUTE })]
  const dif = []
  if (a.status !== b.status) dif.push('status')
  if (a.script !== b.script) dif.push('script')
  if (a.chamadas.length !== b.chamadas.length) dif.push(`chamadas ${b.chamadas.length}→${a.chamadas.length}`)
  a.chamadas.forEach((c, i) => { if (c.system !== b.chamadas[i]?.system) dif.push(`system ${i}`); if (c.ultimo !== b.chamadas[i]?.ultimo) dif.push(`pedido ${i}`) })
  if (JSON.stringify(a.escrito) !== JSON.stringify(b.escrito)) dif.push('script_written')
  ok(dif.length === 0, `${nome}${dif.length ? ' — DIFERE: ' + dif.join(', ') : ''}`)
}
const LONGO = ROTEIRO_EN_35
await igualABase('roteiro que cabe (32, en) no grátis: sem apara', { body: pedido('About a mountain view'), gpt: so([CABE_32]) })
await igualABase('colado curto (diálogo que cabe no teto normal): palavra por palavra, sem faixa', { body: pedido(DIALOGO_CURTO), gpt: so([ROTEIRO_DIALOGO]) })
{
  const r = await postar({ body: pedido(DIALOGO_CURTO), gpt: so([ROTEIRO_DIALOGO]) })
  ok(r.script === ROTEIRO_DIALOGO && r.escrito?.kling4_writer_band === undefined && !/KLING 4 SINGLE-SHOT/.test(r.chamadas[0]?.system ?? ''), 'colado curto: o texto da pessoa sai intacto e o prompt nem cita o Kling 4')
}
await igualABase('pagante (plano pro), colado longo no Seedance', { body: pedido(PETROV), plan: 'pro', hasPaid: true, gpt: so([ROTEIRO_PETROV_31]) })
await igualABase('pagante (plano pro), ideia acima da faixa', { body: pedido(IDEIA_EN), plan: 'pro', hasPaid: true, gpt: so([LONGO]) })
await igualABase('grátis que já fez filme, colado longo', { body: pedido(PETROV), films: 1, gpt: so([ROTEIRO_PETROV_31]) })
await igualABase('grátis com débito anterior, ideia acima da faixa', { body: pedido(IDEIA_EN), debits: 1, gpt: so([LONGO]) })
for (const lang of ['en', 'pt', 'es']) {
  for (const [motor, engine] of [['Kineo 1', 'fast'], ['Veo', 'cinematic_veo'], ['Kling 2.5', 'cinematic_kling'], ['Kling 3 / Kling 4 pago desligado', 'hollywood'], ['H3', 'h3'], ['Omni', 'omni'], ['Seedance 2.5', 's25']]) {
    await igualABase(`${motor} 15 s, ${lang}, colado longo`, { body: pedido(PETROV, lang, engine), gpt: so([ROTEIRO_PETROV_31]) })
    await igualABase(`${motor} 15 s, ${lang}, ideia longa demais`, { body: pedido(IDEIA_EN, lang, engine), gpt: so([LONGO]) })
  }
}
for (const seg of [35, 60]) await igualABase(`Seedance 1.5 grátis a ${seg} s, colado longo`, { body: pedido(PETROV, 'en', 'cinematic_ai', seg), gpt: so([ROTEIRO_PETROV_31]) })
await igualABase('Kling 4 pago ligado (engine hollywood, 15 s), ideia acima do teto: já tem teto duro', { body: pedido(IDEIA_EN, 'en', 'hollywood'), plan: 'pro', hasPaid: true, env: { KLING4_PAID_LIVE: 'true' }, gpt: so([LONGO]) })
await igualABase('Kling 4 pago ligado, colado longo: segue fora da faixa', { body: pedido(PETROV, 'en', 'hollywood'), plan: 'pro', hasPaid: true, env: { KLING4_PAID_LIVE: 'true' }, gpt: so([ROTEIRO_PETROV_31]) })
{
  const r = await postar({ body: pedido(IDEIA_EN, 'en', 'hollywood'), plan: 'pro', hasPaid: true, env: { KLING4_PAID_LIVE: 'true' }, gpt: so([LONGO]) })
  ok(r.escrito?.kling4_writer_band?.max === 31 && r.escrito?.kling4_trim === undefined && r.chamadas.length <= 2, `Kling 4 pago: faixa ${r.escrito?.kling4_writer_band?.min}-${r.escrito?.kling4_writer_band?.max}, teto duro no corte, sem apara`)
}

// ── M — mutantes: o guardião precisa ficar vermelho ────────────────────────────────────────────
console.log('M — mutantes')
const K4_ATUAL = lf(fs.readFileSync(K4, 'utf8'))
const mutante = (de, para) => { if (K4_ATUAL.split(de).length !== 2) throw Error('mutante sem âncora: ' + de); return K4_ATUAL.replace(de, para) }
{
  const m = mutante('return colado.pasted && colado.words > tetoDoFilmeCurto', 'return colado.pasted')
  const r = await postar({ k4Src: m, body: pedido(DIALOGO_CURTO), gpt: so([ROTEIRO_DIALOGO]) })
  ok(r.escrito?.kling4_writer_band !== undefined, 'sem o limite do teto normal, o colado curto entraria na faixa (o controle pegaria)')
  const m2 = mutante('a.depois < a.antes && a.pisoDepois >= a.faixa.min', 'a.depois < a.antes')
  const r2 = await postar({ k4Src: m2, body: pedido(IDEIA_EN), gpt: so([ROTEIRO_EN_35, ROTEIRO_EN_35, abaixoDoPiso]) })
  ok(r2.script === abaixoDoPiso, 'sem o piso na adoção, a apara curta demais entraria (o caso "abaixo do piso" pegaria)')
}

// ── U — não existe outro escritor do filme de 15 s que passe por aqui ───────────────────────────
console.log('U — superfícies fora do escritor')
const usa = git('grep', '-l', 'pedidoDeAparaDoKling4', '--', 'app', 'lib', 'components').trim().split('\n').sort()
ok(usa.length === 2 && usa[0] === ROUTE && usa[1] === K4, `a apara só existe no escritor e na lib dela (${usa.join(', ')})`)
const gsSrc = lf(fs.readFileSync(ROUTE, 'utf8'))
ok(gsSrc.includes('if (faixaK4Pago) tetoDuroFilmeCurto = faixaK4Pago.max'), 'Kling 4 pago: o teto duro segue no teto da faixa')
ok(gsSrc.includes('const faixaK4Pago = filmeCurto && !colado.pasted ? faixaDoKling4PagoParaOPedido('), 'Kling 4 pago: o colado segue fora')
ok(gsSrc.includes('if (faixaK4 && !faixaK4Pago && longoParaOFilmeCurto(script))'), 'a apara só no grátis')
ok(!/tetoDuroFilmeCurto\s*=\s*faixaK4\.max/.test(gsSrc), 'no grátis o teto duro do corte não muda: acima da faixa continua aceito (reserva), nunca abaixo do piso nem 422')
let ads = ''; try { ads = git('grep', '-l', 'api/generate-script', '--', 'lib/ads', 'app/api/ads', 'app/api/clips').trim() } catch { /* git grep sem resultado = saída 1 */ }
ok(ads === '', 'Clipe/anúncio não passam pelo /api/generate-script')

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
