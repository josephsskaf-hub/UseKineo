// [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] KINEO-ROTEIRO-NO-TAMANHO-0111 — guardião do roteiro que
// nasce no tamanho do filme.
//
// Caso real (render 22104abd, 01/11 ~22:41 BRT, conta gapozweb — Rick, cliente anual): 60 s com ideia solta. Log da Vercel do
// /api/generate-script: 1ª versão 82 palavras, 2ª ("regenerating once") 89, piso 169 → script_written fits:false →
// duration_followed_script 60 → 35 s e 14 cr devolvidos. Causa: o prompt dá a cada bloco o tamanho de UMA frase e o piso só
// aparece como número total; a 2ª tentativa repetia as mesmas regras de bloco.
//
// Este guardião EXECUTA a rota real (offline: OpenAI, moderação, banco e eventos são dublês) com o pedido REAL do Rick
// (script_written.original_idea) e prova:
//   L  a lib pura: o orçamento por bloco soma o piso, a contagem por bloco, a escolha entre versões;
//   R1 o pedido do Rick: o prompt da 1ª chamada leva o LENGTH PLAN (≥ 169); a 1ª volta com as 89 palavras reais do filme;
//      a 2ª chamada leva a conta por bloco ("MICRO REWARD 1 n/m") e, voltando no tamanho, é ela que sai (fits:true,
//      length_retry {89 → N, retry}, still_short_after_retry:false);
//   R2 último recurso: 2ª também curta e MENOR → fica a 1ª (89), still_short_after_retry:true (é o que a rota do cinematic
//      encurta com estorno, como antes); 2ª com erro → fica a 1ª, retry_words null;
//   C1 controle: roteiro no tamanho certo na 1ª → UMA chamada só, sem length_retry;
//   C2 controle "as is": texto com marcadores volta INTACTO sem nenhuma chamada; script_mode verbatim não é ideia solta
//      (lib/meta95/ideiaNoEscritor — nunca reescrito); roteiro colado (prosa longa) não ganha plano de tamanho;
//   C3 controle: o filme curto (15 s) segue sem plano e com 700 tokens;
//   B  na base (antes deste conserto) o mesmo pedido saía com a 2ª menor (70) e sem plano — a prova do que mudou;
//   M  mutantes: sem o plano no prompt / sem o pedido de tamanho / sem a escolha → vermelho.
// Revisão (laço do revisor, 01/11) — os 4 defeitos do 1º conserto:
//   S/SR (2ª revisão) SEM teto por motor: engine 'fast' no escritor também é filme do cinematic/Seedance (o Rick: script_written
//      engine fast, voice fable → cinematic seedance). O plano vale para todos os motores — 169/186 a 60 s — e o piso
//      cobre o que o Seedance exige de TODAS as personas (storyteller/fable 150; a mais exigente 161); o caso do Rick a 60 s
//      sai no tamanho nos motores fast e seedance;
//   D/DR a versão que lê a descrição de cena nunca vence a que não lê (KINEO-NARRADOR-DESCRICAO-0111);
//   PR a 2ª chamada sai com o timeout encolhido ao que cabe nos 60 s, e não sai sem tempo (length_retry_skipped deadline);
//   RS o resgate da recusa vai sem o plano e com 700 tokens; curto depois dele = still_short_after_retry true + story_rescue.
// 4ª revisão (substitui a 3ª) — N90: a 90 s o plano fazia a fala passar de 90 s e a montagem (lib/compose.ts, clamp a 90)
//   cortava o final. O plano, a nova tentativa por tamanho e o piso só valem até 60 s; a 90 s a rota é provada IGUAL à base
//   (mesmas chamadas à OpenAI — prompt, tokens, timeout —, mesmo roteiro, mesmo script_written) em 5 cenários. A mudança da
//   3ª revisão na rota do Kineo 1 (generate-video-fast) saiu: o arquivo é provado igual à origin/main. 35 s coberto (T35).
// 5ª revisão — V60: a 60 s o plano mirava 205 (piso × 1,1) e o roteiro da IA vai verbatim; na voz mais lenta (dark-mystery /
//   luxury-narrator, 2,30 pal/s — os temas de mistério e luxo) 205 palavras = 89,1 s e qualquer estouro passava do clamp de
//   90 s da montagem. O plano agora soma o PISO (186 = 80,9 s; 169 = 73,5 s na voz mais lenta). V60 prova, na rota, com tema de
//   mistério e de luxo, em 30/35/60 s e nos motores fast/seedance/kling25/veo/h3, que o plano cabe na voz mais lenta com ≥ 10 %
//   de folga até 90 s; o mutante "folga de 10 % de volta" fica vermelho. T30: 30 s (hollywood) coberto.
// Rodar: node scripts/test-roteiro-no-tamanho-0111.mjs   (sem rede, sem custo)
import fs from 'node:fs'
import { lerSemLeva3, deltaLeva3Revisor0311Exato } from './test-support/desfaz-leva3-revisor-0311.mjs' // KINEO-LEVA3-REVISOR-0311 — [TRAVA 8.2 — fundador 03/11, Canal do Revisor]: a camada mais nova (legenda e fits do 15 s) sai primeiro, pelo recibo exato
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semAnoInventado0211 } from './test-support/desfaz-ano-inventado-0211.mjs' // KINEO-ANO-INVENTADO-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]: a camada mais nova (a data real + a regra do ano no system prompt) sai primeiro, pelo recibo exato, na comparação com a base

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(lerSemLeva3(path.join(ROOT, rel), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const MARCA = 'KINEO-ROTEIRO-NO-TAMANHO-0111'
const BASE_REF = (() => {
  try {
    const shas = git('log', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)
    return shas.length ? shas[shas.length - 1] + '^' : 'origin/main'
  } catch { return 'origin/main' }
})()
const ROUTE_REL = 'app/api/generate-script/route.ts'
const LIB_REL = 'lib/roteiroNoTamanho.ts'
let pass = 0
let fail = 0
const ok = (cond, nome) => { if (cond) { pass++; console.log('  ok  ' + nome) } else { fail++; console.log('  FAIL ' + nome) } }

// ── O pedido e o roteiro REAIS do Rick (events.script_written.original_idea e compose_submission_claim de 22104abd) ──────
const IDEIA_RICK = 'Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair who believes technology is out to get him, declares war on his new smart fridge — funny and absurd'
const ROTEIRO_RICK_89 = `HOOK (0-2s): [Pexels: gruff old man kitchen] Meet Roland Oznard... waging war against his rebellious smart fridge!

MICRO REWARD 1: [Pexels: smart fridge touchscreen] It all started when the fridge's touchscreen... ordered $200 worth of pickles to a random address.

MICRO REWARD 2: [Pexels: fridge playing music] Then, at midnight, it blared classical music... waking the entire neighborhood.

MICRO REWARD 3: [Pexels: man with toolbox] Roland tried to outsmart it with a toolbox... convinced it was plotting against him.

ESCALATION: [Pexels: fridge with flashing error codes] But the fridge fought back... flashing cryptic error codes that seemed sinister.

RHYTHM: [Pexels: man shouting at fridge] Beeping. Mocking. Rebellion.

PAYOFF: [Pexels: man triumphantly unplugging fridge] Roland finally discovered... the fridge was hacked by his tech-savvy neighbor as a prank. His paranoia wasn't unfounded. Follow for more absurd adventures!`
// A 2ª versão "no tamanho" (escrita à mão para o dublê): a MESMA história, cada bloco desenvolvido.
const ROTEIRO_RICK_LONGO = `HOOK (0-2s): [Pexels: gruff old man kitchen] Meet Roland Oznard... a man at war with his own refrigerator!

MICRO REWARD 1: [Pexels: smart fridge touchscreen] Roland never wanted a smart fridge. His daughter installed it while he was out buying batteries for a radio from 1974. The very first night, the glowing touchscreen woke up on its own... and ordered two hundred dollars of pickles to an address in Ohio. Roland does not even like pickles.

MICRO REWARD 2: [Pexels: fridge playing music] The next evening, at exactly midnight, the fridge started blasting Beethoven at full volume. The dog howled. The lights across the street flicked on one by one. Mrs. Kowalski from next door knocked in her bathrobe, asking why his kitchen was hosting an orchestra.

MICRO REWARD 3: [Pexels: man with toolbox] So Roland declared war. He dragged out his rusty toolbox, taped cardboard over the camera, and spoke to the fridge in a low, threatening voice. He was absolutely convinced it was listening, learning, and plotting against him from behind the yogurt.

ESCALATION: [Pexels: fridge with flashing error codes] Then the fridge fought back. It locked the freezer door, flashed red error codes, and displayed one message across the screen: hello, Roland.

RHYTHM: [Pexels: man shouting at fridge] Beeping. Mocking. Rebellion.

PAYOFF: [Pexels: man triumphantly unplugging fridge] At three in the morning, Roland finally pulled the plug... and found a sticky note on the back of the fridge. His tech-savvy teenage neighbor had hacked it as a prank, all week long. Roland was paranoid... but this time, he was right.
Follow for more absurd adventures!`
const ROTEIRO_RICK_70 = ROTEIRO_RICK_89.replace(' It all started when the fridge\'s touchscreen... ordered $200 worth of pickles to a random address.', ' The fridge ordered pickles.').replace(' Then, at midnight, it blared classical music... waking the entire neighborhood.', ' It played music.')

// ── L — a lib pura ──────────────────────────────────────────────────────────────────────────────────────────────────────
console.log('L — lib/roteiroNoTamanho.ts')
const offlineMocks = {}
const L = createOfflineLoader({ mocks: offlineMocks })('@/' + LIB_REL)
const p169 = L.planoDePalavras(169)
const soma = (p) => p.secoes.reduce((s, x) => s + x.palavras, 0)
ok(p169 && soma(p169) === 169 && p169.piso === 169 && !('alvo' in p169), `5ª revisão: o orçamento por bloco soma exatamente o piso (${p169 && soma(p169)} = 169), sem alvo acima dele`)
ok(typeof L.FOLGA_DO_PLANO === 'undefined' && L.planoDePalavras.length === 1, '5ª revisão: FOLGA_DO_PLANO e o parâmetro de teto saíram da lib')
ok(p169 && p169.secoes.map((s) => s.secao).join('|') === 'HOOK|MICRO REWARD 1|MICRO REWARD 2|MICRO REWARD 3|ESCALATION|RHYTHM|PAYOFF', 'os 7 blocos, na ordem do escritor')
ok(p169 && p169.secoes.find((s) => s.secao === 'HOOK').palavras <= 12 && p169.secoes.find((s) => s.secao === 'RHYTHM').palavras <= 6, 'HOOK e RHYTHM continuam curtos')
ok(p169 && p169.secoes.find((s) => s.secao === 'MICRO REWARD 1').palavras >= 30, `cada fato ganha 30+ palavras (MICRO REWARD 1 = ${p169?.secoes[1].palavras})`)
const p186 = L.planoDePalavras(186)
ok(p186 && p186.piso === 186 && soma(p186) === 186, `186 → plano 186 (${p186 && soma(p186)}) — não 205`)
ok(L.planoDePalavras(15) === null && L.planoDePalavras(NaN) === null, 'piso minúsculo ou inválido = sem plano')
const porSecao = L.palavrasPorSecao(ROTEIRO_RICK_89, 'en')
ok(porSecao.length === 7 && porSecao.reduce((s, x) => s + x.palavras, 0) === 89, `contagem por bloco do roteiro do Rick soma 89 (${porSecao.reduce((s, x) => s + x.palavras, 0)})`)
ok(L.escolherVersao({ piso: 169, primeira: { palavras: 89, problemas: 0 }, segunda: { palavras: 70, problemas: 0 } }) === 'primeira', 'as duas curtas, a 2ª menor → fica a 1ª')
ok(L.escolherVersao({ piso: 169, primeira: { palavras: 89, problemas: 0 }, segunda: { palavras: 190, problemas: 0 } }) === 'segunda', '2ª no tamanho → a 2ª')
ok(L.escolherVersao({ piso: 169, primeira: { palavras: 89, problemas: 1 }, segunda: { palavras: 80, problemas: 0 } }) === 'segunda', '2ª menor mas com a estrutura consertada → a 2ª (como antes)')
ok(L.tetoDeTokens(null, 700) === 700 && L.tetoDeTokens(p169, 700) === 1014 && L.tetoDeTokens(p186, 700) === 1116, `sem plano, 700 tokens; com plano, piso × 6 (169 → ${L.tetoDeTokens(p169, 700)}, 186 → ${L.tetoDeTokens(p186, 700)})`)
ok(L.tetoDeTokens(p186, 700) >= Math.ceil(186 * 1.2 * 4) + 150, 'tokens cobrem 20 % de estouro a 4 tokens/palavra (bengali, hindi, grego) + cabeçalhos e pistas — o PAYOFF não é cortado')

// ── S (2ª revisão) — sem teto por motor: o plano é o mesmo para 'fast' e 'seedance' e cobre o Seedance em toda persona ────
console.log('S — sem teto por motor: o piso do plano cobre o que o Seedance exige de cada persona')
const PERS = createOfflineLoader({})('@/lib/narration/personas.ts')
const SR = createOfflineLoader({})('@/lib/speechRate.ts')
const NF = createOfflineLoader({})('@/lib/narrationFit.ts')
ok(typeof L.tetoDoMotorDoEscritor === 'undefined', 'tetoDoMotorDoEscritor saiu da lib (engine fast no escritor não diz qual rota o filme toma)')
const taxaDa = (p) => SR.speechRateFor({ family: 'classic', language: 'en', voice: p.voice, personaSpeed: p.defaultSpeed }).wordsPerSecond
const exigidoPeloSeedance = (p, seg) => Math.ceil(seg * NF.minCoverageFor(seg) * taxaDa(p) - 1e-9)
const STORYTELLER = PERS.VOICE_PERSONAS.find((p) => p.id === 'storyteller')
ok(!!STORYTELLER && STORYTELLER.voice === 'fable', 'a persona do Rick: storyteller, voz fable')
const p90 = L.planoDePalavras(253)
ok(p90 && p90.piso === 253 && soma(p90) === 253, `lib pura: planoDePalavras(253) = ${p90?.piso} (a rota não o pede a 90 s — ver N90)`)
ok(L.ROTEIRO_NO_TAMANHO_ATE_SEGUNDOS === 60 && L.planoValeNoFilme(35) && L.planoValeNoFilme(60) && !L.planoValeNoFilme(61) && !L.planoValeNoFilme(90) && !L.planoValeNoFilme(NaN), 'planoValeNoFilme: 35 e 60 s sim; 61/90 s e inválido não (4ª revisão)')
ok(L.planoValeNoFilme(60, 'en') && !L.planoValeNoFilme(60, 'tr') && !L.planoValeNoFilme(60, 'de') && !L.planoValeNoFilme(35, 'pt') && !L.planoValeNoFilme(60, 'ru'), 'planoValeNoFilme: só em inglês; tr/de/pt/ru ficam na base (6ª revisão)')
ok(rd(ROUTE_REL).includes('planoValeNoFilme(alvoSegundos, language)'), 'a rota passa a língua para o portão do plano (6ª revisão)')
for (const seg of [60]) {
  const plano = p169
  const exig = PERS.VOICE_PERSONAS.map((p) => [p.id, exigidoPeloSeedance(p, seg)])
  const maior = exig.reduce((m, x) => (x[1] > m[1] ? x : m))
  ok(plano && exig.every(([, w]) => w <= plano.piso), `${seg} s: o piso ${plano?.piso} cobre o Seedance em TODAS as ${exig.length} personas (a mais exigente: ${maior[0]} ${maior[1]}; storyteller ${exigidoPeloSeedance(STORYTELLER, seg)})`)
}
ok(exigidoPeloSeedance(STORYTELLER, 90) === 225 && exigidoPeloSeedance(STORYTELLER, 60) === 150, 'storyteller (fable) exige 150 a 60 s e 225 a 90 s — o plano limitado da 1ª revisão (214) ficava abaixo')
ok(!/NEVER MORE THAN/.test(L.instrucaoDoPlano(p90, 90)) && !/never more than/.test(L.pedidoDeTamanho({ roteiro: ROTEIRO_RICK_89, palavras: 89, plano: p90, alvoSegundos: 90, language: 'en' })), 'nenhum "nunca mais que" no prompt nem no pedido de tamanho')

console.log('D (revisão) — a escolha respeita a descrição de cena e o prazo da rota')
ok(L.escolherVersao({ piso: 186, primeira: { palavras: 90, problemas: 0, leDescricao: true }, segunda: { palavras: 60, problemas: 0, leDescricao: false } }) === 'segunda', '1ª lê a descrição, 2ª não e é menor → a 2ª (KINEO-NARRADOR-DESCRICAO-0111 não reverte)')
ok(L.escolherVersao({ piso: 186, primeira: { palavras: 90, problemas: 0, leDescricao: false }, segunda: { palavras: 200, problemas: 0, leDescricao: true } }) === 'primeira', '2ª no tamanho mas lendo a descrição → a 1ª, que não lê')
ok(L.prazoDaNovaTentativa(0, 35000) === 35000 && L.prazoDaNovaTentativa(30000, 35000) === 27000 && L.prazoDaNovaTentativa(48000, 35000) === null, 'prazo da 2ª chamada: 35 s com tempo; 27 s depois de 30 s gastos; nenhuma depois de 48 s')

// ── A rota real, offline ────────────────────────────────────────────────────────────────────────────────────────────────
// O relógio que a rota vê (Date.now): o guardião adianta `atrasoDoRelogio` para simular uma 1ª chamada lenta.
let atrasoDoRelogio = 0
class RelogioDoGuardiao extends Date { static now() { return Date.now() + atrasoDoRelogio } }
async function postar({ routeSrc = null, libSrc = null, body, gpt }) {
  const chamadas = []
  const eventos = []
  const NextResponse = { json: (b, init) => ({ __res: true, body: b, status: init?.status ?? 200 }) }
  const load = createOfflineLoader({
    globals: { Date: RelogioDoGuardiao },
    mocks: {
      'next/server': { NextResponse, NextRequest: class {} },
      '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u-guardiao' } } }) }, from: () => { throw new Error('banco fora do guardião') } }) },
      '@/lib/openai': {
        OPENAI_SCRIPT_TIMEOUT_MS: 35000,
        openai: { chat: { completions: { create: async (req, opts) => {
          const n = chamadas.length + 1
          const system = req.messages.find((m) => m.role === 'system')?.content ?? ''
          const user = req.messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n---\n')
          chamadas.push({ n, system, user, max_tokens: req.max_tokens, timeout: opts?.timeout })
          const content = gpt({ n, system, user })
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
    source: (rel, src) => (rel === ROUTE_REL && routeSrc !== null ? routeSrc : rel === LIB_REL && libSrc !== null ? libSrc : src),
  })
  const route = load('@/' + ROUTE_REL)
  const res = await route.POST({ json: async () => body })
  return { status: res.status, body: res.body, chamadas, eventos, escrito: eventos.find((e) => e.name === 'script_written')?.metadata }
}
const falaDe = (t) => lf(t).replace(/^\s*(HOOK|MICRO REWARD ?\d*|ESCALATION|RHYTHM|PAYOFF)\s*(\([^)]*\))?\s*:?/gim, ' ').replace(/\[[^\]]*\]/g, ' ').trim().split(/\s+/).filter(Boolean).length
const PEDIDO_RICK = { topic: IDEIA_RICK, language: 'en', targetSeconds: 60, engine: 'fast' } // o corpo que o Studio mandou (engine=fast, log da Vercel)

console.log('R1 — o pedido do Rick: 89 palavras na 1ª, a 2ª leva a conta por bloco e volta no tamanho')
ok(falaDe(ROTEIRO_RICK_89) === 89 && falaDe(ROTEIRO_RICK_LONGO) >= 186, `dublês: o roteiro real tem 89 palavras; o longo ${falaDe(ROTEIRO_RICK_LONGO)}`)
const r1 = await postar({ body: PEDIDO_RICK, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_LONGO) })
const plano1 = r1.chamadas[0]?.system.match(/THIS 60-SECOND FILM NEEDS (\d+) SPOKEN WORDS \(/)
ok(r1.status === 200 && r1.escrito?.min_words === 169, `200 e o piso da régua do Kineo 1 a 60 s = 169 (min_words ${r1.escrito?.min_words})`)
ok(!!plano1 && Number(plano1[1]) === 169 && /Aim right at this number/.test(r1.chamadas[0]?.system ?? ''), `a 1ª chamada leva o LENGTH PLAN no piso (${plano1?.[1]}), mirando nele`)
ok(/MICRO REWARD 1: about \d+ words/.test(r1.chamadas[0]?.system ?? '') && /OVERRIDE any "one sentence"/.test(r1.chamadas[0]?.system ?? ''), 'o plano dá palavras por bloco e vence o "uma frase" das regras gerais')
ok((r1.chamadas[0]?.max_tokens ?? 0) >= 700 && r1.chamadas[1]?.max_tokens === r1.chamadas[0]?.max_tokens, `tokens de saída nunca abaixo de 700 (${r1.chamadas[0]?.max_tokens})`)
ok(r1.chamadas.length === 2, `exatamente UMA nova tentativa (${r1.chamadas.length} chamadas)`)
ok(/LENGTH IS THE MAIN PROBLEM: your script has 89 spoken words/.test(r1.chamadas[1]?.user ?? ''), 'a 2ª chamada diz que o problema é o tamanho, com o número (89)')
ok(/MICRO REWARD 1 \d+\/\d+/.test(r1.chamadas[1]?.user ?? '') && /the SAME story/.test(r1.chamadas[1]?.user ?? ''), 'a 2ª chamada leva a conta por bloco e pede a MESMA história')
ok(r1.body?.script === ROTEIRO_RICK_LONGO && r1.escrito?.fits === true, 'sai a 2ª, no tamanho (fits:true) — o filme de 60 s não precisa mais encolher')
ok(r1.escrito?.length_retry?.first_words === 89 && r1.escrito?.length_retry?.kept === 'retry' && r1.escrito?.still_short_after_retry === false, `rastro: length_retry ${JSON.stringify(r1.escrito?.length_retry)}, still_short_after_retry false`)
ok(r1.escrito?.length_plan?.version === 'roteiro_no_tamanho_0111' && r1.escrito?.original_idea === IDEIA_RICK, 'rastro: length_plan com versão e a ideia original do Rick')
const r1s = await postar({ body: { ...PEDIDO_RICK, engine: 'seedance' }, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_LONGO) })
ok(r1s.escrito?.min_words >= 169 && /LENGTH PLAN/.test(r1s.chamadas[0]?.system ?? '') && r1s.chamadas.length === 2, `o mesmo no Seedance 1.5 (régua clássica, piso ${r1s.escrito?.min_words})`)
const r1h = await postar({ body: { ...PEDIDO_RICK, engine: 'h3' }, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_LONGO) })
ok(r1h.escrito?.family === 'hollywood' && r1h.escrito?.min_words < 169 && /LENGTH PLAN/.test(r1h.chamadas[0]?.system ?? ''), `hollywood na régua dela (2,3 pal/s, piso ${r1h.escrito?.min_words}) — uma régua por voz`)

console.log('R2 — último recurso: a 2ª também curta')
const r2 = await postar({ body: PEDIDO_RICK, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_70) })
ok(falaDe(ROTEIRO_RICK_70) < 89, `dublê: a 2ª tem ${falaDe(ROTEIRO_RICK_70)} palavras`)
ok(r2.body?.script === ROTEIRO_RICK_89 && r2.escrito?.words === 89, '2ª menor que a 1ª → fica a 1ª (89), não a menor')
ok(r2.escrito?.fits === false && r2.escrito?.still_short_after_retry === true && r2.escrito?.length_retry?.kept === 'first', 'rastro: still_short_after_retry true — a rota do cinematic segue com o encurtar+estorno de sempre')
const r2e = await postar({ body: PEDIDO_RICK, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : new Error('timeout')) })
ok(r2e.status === 200 && r2e.body?.script === ROTEIRO_RICK_89 && r2e.escrito?.length_retry?.retry_words === null && r2e.escrito?.still_short_after_retry === true, '2ª com erro → fica a 1ª, retry_words null, still_short_after_retry true')

console.log('C — controles')
const c1 = await postar({ body: PEDIDO_RICK, gpt: () => ROTEIRO_RICK_LONGO })
ok(c1.chamadas.length === 1 && c1.escrito?.fits === true && c1.escrito?.length_retry === null && c1.escrito?.still_short_after_retry === false, 'C1 roteiro no tamanho certo na 1ª → UMA chamada, sem length_retry')
const c2 = await postar({ body: { ...PEDIDO_RICK, topic: ROTEIRO_RICK_89 }, gpt: () => { throw new Error('não devia chamar') } })
ok(c2.chamadas.length === 0 && c2.body?.script === ROTEIRO_RICK_89 && c2.body?.alreadyStructured === true, 'C2 texto marcado ("as is") volta INTACTO, zero chamadas, mesmo curto para 60 s')
{
  const ideiaLib = createOfflineLoader({})('@/lib/meta95/ideiaNoEscritor.ts')
  ok(ideiaLib.ehIdeiaSolta({ prompt: IDEIA_RICK, scriptMode: 'verbatim' }) === false && ideiaLib.ehIdeiaSolta({ prompt: IDEIA_RICK, scriptMode: 'ai' }) === true, 'C2 script_mode verbatim nunca é ideia solta (não passa pelo escritor); ai é')
}
const PROSA_COLADA = Array.from({ length: 12 }, (_, i) => `Roland checked the fridge again on day ${i + 1}, muttering that the machine had finally learned his name and his habits.`).join(' ')
const c2b = await postar({ body: { ...PEDIDO_RICK, topic: PROSA_COLADA }, gpt: () => ROTEIRO_RICK_LONGO })
ok(c2b.body?.pastedScript === true && !/LENGTH PLAN/.test(c2b.chamadas[0]?.system ?? 'LENGTH PLAN') && c2b.chamadas[0]?.max_tokens === 700, 'C2 roteiro colado (prosa longa): sem plano de tamanho, 700 tokens — o texto da pessoa não ganha enchimento')
const c3 = await postar({ body: { topic: IDEIA_RICK, language: 'en', targetSeconds: 15, engine: 'cinematic_ai' }, gpt: () => ROTEIRO_RICK_89 })
ok(c3.chamadas.length >= 1 && c3.chamadas.every((c) => !/LENGTH PLAN/.test(c.system) && c.max_tokens === 700), 'C3 filme curto (15 s): sem plano, 700 tokens, como antes')

// ── Revisão: 60 s nos dois motores, 35 s, 90 s igual à base, descrição de cena, prazo da rota e resgate da recusa — na rota real ──
const maisFrases = (t, n) => t.replace('hello, Roland.', 'hello, Roland. ' + Array.from({ length: n }, (_, i) => `On night ${i + 2} it changed the password on the ice maker and hummed a little tune.`).join(' '))
const ROTEIRO_222 = (() => { let n = 0, t = ROTEIRO_RICK_LONGO; while (falaDe(t) < 220 && n < 20) t = maisFrases(ROTEIRO_RICK_LONGO, ++n); return t })()
const ROTEIRO_260 = (() => { let n = 0, t = ROTEIRO_RICK_LONGO; while (falaDe(t) < 260 && n < 30) t = maisFrases(ROTEIRO_RICK_LONGO, ++n); return t })()
const PEDIDO_K90 = { ...PEDIDO_RICK, targetSeconds: 90 }
const seedanceAceita = (p, palavras, seg) => palavras / taxaDa(p) >= seg * NF.minCoverageFor(seg) - 1e-9
console.log('SR — o Rick (storyteller/fable) a 60 s, motores fast e seedance, na rota')
for (const engine of ['fast', 'seedance']) {
  const s60 = await postar({ body: { ...PEDIDO_RICK, engine }, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_LONGO) })
  const pl = (s60.chamadas[0]?.system ?? '').match(/NEEDS (\d+) SPOKEN WORDS \(/)
  ok(!!pl && Number(pl[1]) === s60.escrito?.min_words && Number(pl[1]) >= 169 && s60.escrito?.length_plan?.floor_words === Number(pl[1]) && !/NEVER MORE THAN/.test(s60.chamadas[0]?.system ?? ''), `engine ${engine} a 60 s: a 1ª chamada leva o plano no piso (${pl?.[1]})`)
  ok(s60.chamadas.length === 2 && /LENGTH IS THE MAIN PROBLEM: your script has 89 spoken words/.test(s60.chamadas[1]?.user ?? ''), `engine ${engine} a 60 s: as 89 palavras pedem a nova tentativa por tamanho`)
  ok(s60.body?.script === ROTEIRO_RICK_LONGO && s60.escrito?.fits === true && s60.escrito?.length_retry?.kept === 'retry' && s60.escrito?.still_short_after_retry === false && s60.escrito?.length_plan?.version === 'roteiro_no_tamanho_0111', `engine ${engine} a 60 s: sai a 2ª (${falaDe(ROTEIRO_RICK_LONGO)} palavras, fits:true)`)
  ok(seedanceAceita(STORYTELLER, falaDe(s60.body?.script ?? ''), 60) && !seedanceAceita(STORYTELLER, 89, 60), `engine ${engine} a 60 s: 89 (o Seedance encurtava para 35 s) → ${falaDe(s60.body?.script ?? '')} palavras, aceitas na voz fable`)
  const fala60 = falaDe(s60.body?.script ?? '') / taxaDa(STORYTELLER)
  ok(fala60 < 90, `engine ${engine} a 60 s: ${fala60.toFixed(1)} s de fala na voz fable — abaixo do clamp de 90 s da montagem`)
}
{
  const PIOR_60 = (() => { let n = 0, t = ROTEIRO_RICK_LONGO; while (falaDe(t) < 230 && n < 30) t = maisFrases(ROTEIRO_RICK_LONGO, ++n); return t })()
  const p = await postar({ body: PEDIDO_RICK, gpt: () => PIOR_60 })
  ok(p.chamadas.length === 1 && p.body?.script === PIOR_60, `60 s, roteiro acima do piso (${falaDe(PIOR_60)} palavras): UMA chamada, o escritor não corta (como na base)`)
}

console.log('T35 — 35 s: o plano vale (régua clássica)')
{
  const PEDIDO_35 = { ...PEDIDO_RICK, targetSeconds: 35 }
  const t35 = await postar({ body: PEDIDO_35, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_LONGO) })
  const pl = (t35.chamadas[0]?.system ?? '').match(/THIS 35-SECOND FILM NEEDS (\d+) SPOKEN WORDS \(/)
  ok(t35.status === 200 && !!pl && Number(pl[1]) === t35.escrito?.min_words && t35.escrito?.length_plan?.floor_words === t35.escrito?.min_words, `35 s: plano ${pl?.[1]} no prompt e no rastro (min_words ${t35.escrito?.min_words})`)
  const curto35 = (t35.escrito?.min_words ?? 0) > 89
  ok(curto35 ? (t35.chamadas.length === 2 && /LENGTH IS THE MAIN PROBLEM/.test(t35.chamadas[1]?.user ?? '') && t35.body?.script === ROTEIRO_RICK_LONGO) : (t35.chamadas.length >= 1), `35 s: ${curto35 ? '89 palavras abaixo do piso → nova tentativa por tamanho, sai a 2ª' : '89 palavras já no piso'}`)
  const c35 = await postar({ body: PEDIDO_35, gpt: () => ROTEIRO_RICK_LONGO })
  ok(c35.chamadas.length === 1 && c35.escrito?.length_retry === null && c35.escrito?.fits === true, '35 s: roteiro no tamanho na 1ª → UMA chamada, sem length_retry')
}

console.log('V60 (5ª revisão) — o plano cabe nos 90 s da montagem na voz MAIS LENTA, com tema de mistério e de luxo')
const NM = createOfflineLoader({})('@/lib/narration/niche-mapping.ts')
const TAXAS = PERS.VOICE_PERSONAS.map((p) => [p.id, taxaDa(p)])
const [LENTA_ID, LENTA] = TAXAS.reduce((m, x) => (x[1] < m[1] ? x : m))
ok(Math.abs(LENTA - 2.3) < 1e-9 && ['dark-mystery', 'luxury-narrator'].includes(LENTA_ID), `voz mais lenta do catálogo clássico: ${LENTA_ID} ${LENTA.toFixed(2)} pal/s`)
const TEMA_MISTERIO = 'The Dyatlov Pass mystery'
const TEMA_LUXO = 'The billionaire yacht with a submarine garage and a helipad'
ok(NM.selectPersonaForScript(TEMA_MISTERIO, undefined, 'premium')?.id === 'dark-mystery' && NM.selectPersonaForScript(TEMA_LUXO, undefined, 'cinematic')?.id === 'luxury-narrator', `os temas pegam as vozes lentas nos planos pagos (${NM.selectPersonaForScript(TEMA_MISTERIO, undefined, 'premium')?.id} / ${NM.selectPersonaForScript(TEMA_LUXO, undefined, 'cinematic')?.id})`)
const FOLGA_MINIMA = 1.1 // o modelo precisa passar 10 %+ do plano para a fala chegar a 90 s
const pisosVistos = []
for (const tema of [TEMA_MISTERIO, TEMA_LUXO]) {
  for (const engine of ['fast', 'seedance', 'kling25', 'veo', 'h3']) {
    for (const seg of [30, 35, 60]) {
      const v = await postar({ body: { topic: tema, language: 'en', targetSeconds: seg, engine }, gpt: () => ROTEIRO_RICK_LONGO })
      const pl = (v.chamadas[0]?.system ?? '').match(new RegExp(`THIS ${seg}-SECOND FILM NEEDS (\\d+) SPOKEN WORDS \\(`))
      if (!pl) { ok(false, `${engine} ${seg} s: plano no prompt`); continue }
      const piso = Number(pl[1])
      const fala = piso / LENTA
      pisosVistos.push([engine, seg, piso])
      ok(piso === v.escrito?.min_words && fala * FOLGA_MINIMA < 90 && v.chamadas[0]?.max_tokens === Math.max(700, piso * 6), `${tema.slice(4, 18)} · ${engine} ${seg} s: plano ${piso} = ${fala.toFixed(1)} s na voz mais lenta; para chegar a 90 s precisaria de ${Math.ceil(90 * LENTA)} (+${Math.round((90 * LENTA / piso - 1) * 100)} %)`)
    }
  }
}
{
  const s60 = pisosVistos.find(([e, s]) => e === 'seedance' && s === 60)?.[2]
  ok(s60 === 186 && 186 * 1.1 / LENTA > 88.9, `Seedance 60 s: plano 186 (era 205 = ${(205 / LENTA).toFixed(1)} s na voz mais lenta, 2 palavras do corte)`)
  const libFolga = rd(LIB_REL).replace('const piso = Math.ceil(pisoDaRegua)', 'const piso = Math.round(pisoDaRegua * 1.1)')
  const m = libFolga !== rd(LIB_REL) ? await postar({ libSrc: libFolga, body: { topic: TEMA_MISTERIO, language: 'en', targetSeconds: 60, engine: 'seedance' }, gpt: () => ROTEIRO_RICK_LONGO }) : null
  const pm = Number((m?.chamadas[0]?.system ?? '').match(/NEEDS (\d+) SPOKEN WORDS \(/)?.[1])
  ok(!!m && pm === 205 && (pm / LENTA) * FOLGA_MINIMA >= 90, `mutante "folga de 10 % de volta": plano ${pm} = ${(pm / LENTA).toFixed(1)} s → reprovado pelo V60`)
}
ok(/rastroDoFinal\.retry_adotado = fica === 'segunda'/.test(rd(ROUTE_REL)), 'rastro do final: retry_adotado = a 2ª ficou de fato (antes: true mesmo quando a 1ª ficava)')

console.log('T30 — 30 s (hollywood): o plano vale e cabe')
{
  const t30 = await postar({ body: { ...PEDIDO_RICK, targetSeconds: 30, engine: 'h3' }, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_70 : ROTEIRO_RICK_89) })
  const pl = (t30.chamadas[0]?.system ?? '').match(/THIS 30-SECOND FILM NEEDS (\d+) SPOKEN WORDS \(/)
  ok(t30.status === 200 && !!pl && Number(pl[1]) === t30.escrito?.min_words && t30.escrito?.family === 'hollywood' && t30.escrito?.length_plan?.floor_words === Number(pl[1]), `30 s h3: plano ${pl?.[1]} no prompt e no rastro (régua hollywood)`)
  const curto = falaDe(ROTEIRO_RICK_70) < (t30.escrito?.min_words ?? 0)
  ok(curto ? t30.chamadas.length === 2 && /LENGTH IS THE MAIN PROBLEM/.test(t30.chamadas[1]?.user ?? '') : t30.chamadas.length >= 1, `30 s h3: ${falaDe(ROTEIRO_RICK_70)} palavras ${curto ? 'abaixo do piso → nova tentativa por tamanho' : 'no piso'}`)
}

console.log('N90 — 90 s: o plano não se aplica; a rota é IGUAL à base (chamadas, roteiro, script_written)')
{
  let baseRota = null
  try { baseRota = lf(git('show', `${BASE_REF}:${ROUTE_REL}`)) } catch { baseRota = null }
  ok(!!baseRota && !baseRota.includes(MARCA), `base legível e sem a marca (${BASE_REF})`)
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  const cenarios = [
    ['Rick 89 → 2ª menor (70)', ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_70), 0],
    ['Rick 89 → 2ª longa (260)', ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_260), 0],
    ['222 → 260', ({ n }) => (n === 1 ? ROTEIRO_222 : ROTEIRO_260), 0],
    ['2ª com erro', ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : new Error('timeout')), 0],
    ['1ª lenta (50 s)', ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_70), 50000],
    ['no tamanho na 1ª', () => ROTEIRO_260, 0],
  ]
  for (const engine of ['fast', 'seedance']) {
    for (const [nome, gpt, atraso] of cenarios) {
      const rodar = async (routeSrc) => {
        try { return await postar({ routeSrc, body: { ...PEDIDO_K90, engine }, gpt: (a) => { if (a.n === 1) atrasoDoRelogio += atraso; return gpt(a) } }) } finally { atrasoDoRelogio = 0 }
      }
      const novo = await rodar(null)
      const velho = baseRota ? await rodar(baseRota) : null
      const novoSemAno = await rodar(lf(semAnoInventado0211(lerSemLeva3(path.join(ROOT, ROUTE_REL), 'utf8'), ROUTE_REL))) // KINEO-ANO-INVENTADO-0211 — a base não tem a data real no prompt
      const semPlano = novo.chamadas.every((c) => !/LENGTH PLAN/.test(c.system) && !/LENGTH IS THE MAIN PROBLEM/.test(c.user) && c.max_tokens === 700) && !('length_plan' in (novo.escrito ?? {})) && !('length_retry' in (novo.escrito ?? {}))
      ok(semPlano, `${engine} 90 s · ${nome}: sem plano, sem pedido de tamanho, 700 tokens, sem length_plan no rastro`)
      ok(!!velho && igual(novoSemAno.chamadas, velho.chamadas) && igual(novo.body, velho.body) && igual(Object.fromEntries(Object.entries(novo.escrito ?? {}).filter(([k]) => k !== 'min_words_long')) /* KINEO-LEVA3-REVISOR-0311: campo novo só de rastro */, velho.escrito) && novo.status === velho.status, `${engine} 90 s · ${nome}: igual à base (${novo.chamadas.length} chamadas, timeouts ${novo.chamadas.map((c) => c.timeout).join('/')}, roteiro de ${falaDe(novo.body?.script ?? '')} palavras)`)
    }
  }
}

console.log('F — a rota do Kineo 1 (generate-video-fast) é a da origin/main: a mudança da 3ª revisão saiu')
{
  const FAST_REL = 'app/api/generate-video-fast/route.ts'
  let fastMain = null
  try { fastMain = lf(git('show', `origin/main:${FAST_REL}`)) } catch { fastMain = null }
  const fastAqui = rd(FAST_REL)
  ok(!!fastMain && fastAqui === fastMain, 'generate-video-fast/route.ts idêntica à origin/main')
  ok(!fastAqui.includes('roteiroIaForaDoTamanho') && !fastAqui.includes(MARCA), 'sem roteiroIaForaDoTamanho nem a marca desta entrega na rota fast')
}

console.log('DR — descrição de cena: a versão que lê a descrição nunca vence a que não lê')
const CRIANCA = 'A child skillfully and enthusiastically crafts a colorful 3D car, surrounded by their vibrant creations. The table showcases an impressive 3D dinosaur and a charming house, inspiring further imaginative creativity.'
const DESC_RESTO = `MICRO REWARD 2: [Pexels: child gluing toy car wheels] He tries tape, then glue, then his grandma's old buttons for wheels.
MICRO REWARD 3: [Pexels: toy dinosaur on shelf] The dinosaur he built last week watches from the shelf like a strict judge.
ESCALATION: [Pexels: child worried at table] The school race is tomorrow morning, and the little car still wobbles.
RHYTHM: [Pexels: child gluing] Glue. Wait. Hope.
PAYOFF: [Pexels: child racing toy car on table] The button wheels hold, and his car races past the dinosaur to win the class race.`
const DESC_LE = `HOOK: [Pexels: child building toy car] A child skillfully and enthusiastically crafts a colorful 3D car, surrounded by their vibrant creations.
MICRO REWARD 1: [Pexels: child building toy car] Leo is seven, and his car keeps falling apart on the kitchen table every single morning before school.
${DESC_RESTO}`
const DESC_NAO = `HOOK: [Pexels: child building toy car] Leo is seven, and his car keeps falling apart.
MICRO REWARD 1: [Pexels: child building toy car] Every morning, a wheel rolls away.
${DESC_RESTO}`
const dr = await postar({ body: { topic: CRIANCA, language: 'en', targetSeconds: 60, engine: 'seedance' }, gpt: ({ n }) => (n === 1 ? DESC_LE : DESC_NAO) })
ok(dr.body?.pastedReason === 'scene_description' && falaDe(DESC_NAO) < falaDe(DESC_LE) && falaDe(DESC_LE) < (dr.escrito?.min_words ?? 0), `dublês: descrição detectada; 1ª lê e tem ${falaDe(DESC_LE)}, 2ª não lê e tem ${falaDe(DESC_NAO)} (piso ${dr.escrito?.min_words})`)
ok(dr.body?.script === DESC_NAO && dr.escrito?.scene_description_read_aloud === false, 'as duas curtas, a 2ª menor mas sem ler a descrição → fica a 2ª (no 1º conserto ficava a 1ª, que lia)')

console.log('PR — prazo da rota: a 2ª chamada só sai se couber nos 60 s')
try {
  atrasoDoRelogio = 0
  const pr0 = await postar({ body: PEDIDO_RICK, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_LONGO) })
  ok(pr0.chamadas[1]?.timeout <= 35000 && pr0.chamadas[1]?.timeout > 30000, `com tempo: a 2ª chamada com o timeout de sempre (${pr0.chamadas[1]?.timeout} ms)`)
  const pr30 = await postar({ body: PEDIDO_RICK, gpt: ({ n }) => { if (n === 1) atrasoDoRelogio += 30000; return n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_LONGO } })
  ok(pr30.chamadas.length === 2 && pr30.chamadas[1]?.timeout <= 27000 && pr30.chamadas[1]?.timeout >= 26000, `1ª lenta (30 s): a 2ª sai com o que sobra (${pr30.chamadas[1]?.timeout} ms ≤ 27 s) — 30 + 27 + 3 ≤ 60`)
  atrasoDoRelogio = 0
  const pr50 = await postar({ body: PEDIDO_RICK, gpt: ({ n }) => { if (n === 1) atrasoDoRelogio += 50000; return ROTEIRO_RICK_89 } })
  ok(pr50.status === 200 && pr50.chamadas.length === 1 && pr50.body?.script === ROTEIRO_RICK_89, '1ª lentíssima (50 s): sem 2ª chamada, a 1ª sai (antes: 50 + 35 s estourava os 60 s e a rota morria)')
  ok(pr50.escrito?.length_retry === null && pr50.escrito?.length_retry_skipped === 'deadline' && pr50.escrito?.still_short_after_retry === true, `rastro: length_retry_skipped "${pr50.escrito?.length_retry_skipped}", still_short_after_retry true`)
} finally { atrasoDoRelogio = 0 }

console.log('RS — resgate da recusa: sem plano, 700 tokens, rastro honesto')
const RECUSA = "I'm sorry, but I can't assist with that request."
const rs = await postar({ body: PEDIDO_RICK, gpt: ({ n }) => (n === 1 ? RECUSA : ROTEIRO_RICK_89) })
ok(rs.status === 200 && rs.chamadas.length === 2 && /LENGTH PLAN/.test(rs.chamadas[0]?.system ?? '') && !/LENGTH PLAN/.test(rs.chamadas[1]?.system ?? 'LENGTH PLAN') && rs.chamadas[1]?.max_tokens === 700, 'o resgate (2ª chamada) vai sem o plano e com os 700 tokens de sempre — nada de roteiro longo cortado no meio')
ok(rs.body?.script === ROTEIRO_RICK_89 && rs.escrito?.still_short_after_retry === true && rs.escrito?.length_retry_skipped === 'story_rescue', `rastro: curto depois do resgate → still_short_after_retry true, length_retry_skipped "${rs.escrito?.length_retry_skipped}" (antes: false)`)

console.log(`B — a base (${BASE_REF})`)
let base = null
try { base = lf(git('show', `${BASE_REF}:${ROUTE_REL}`)) } catch { base = null }
if (base && !base.includes(MARCA)) {
  const b = await postar({ routeSrc: base, body: PEDIDO_RICK, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_70) })
  ok(b.body?.script === ROTEIRO_RICK_70 && !/LENGTH PLAN/.test(b.chamadas[0]?.system ?? '') && !/LENGTH IS THE MAIN PROBLEM/.test(b.chamadas[1]?.user ?? ''), 'na base: sem plano, sem conta por bloco, e a 2ª MENOR substituía a 1ª (70 < 89)')
} else ok(false, 'base legível e sem a marca')

console.log('M — mutantes (cada um precisa ficar vermelho)')
const rota = rd(ROUTE_REL)
const mutantes = [
  ['sem o plano no prompt', rota.replace('SYSTEM_PROMPT + (planoDoTamanho ? `\\n\\n${instrucaoDoPlano(planoDoTamanho, alvoSegundos)}` : \'\')', 'SYSTEM_PROMPT'), async (src) => /LENGTH PLAN/.test((await postar({ routeSrc: src, body: PEDIDO_RICK, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_LONGO) })).chamadas[0]?.system ?? '')],
  ['plano a 90 s (sem o portão dos 60 s)', rota.replace('const noTamanho = planoValeNoFilme(alvoSegundos, language)', 'const noTamanho = true'), async (src) => !/LENGTH PLAN/.test((await postar({ routeSrc: src, body: PEDIDO_K90, gpt: ({ n }) => (n === 1 ? ROTEIRO_222 : ROTEIRO_260) })).chamadas[0]?.system ?? '')],
  ['escolha entre versões a 90 s', rota.replace("const fica = !noTamanho ? 'segunda' : escolherVersao(", 'const fica = escolherVersao('), async (src) => (await postar({ routeSrc: src, body: PEDIDO_K90, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_70) })).body?.script === ROTEIRO_RICK_70],
  ['prazo encolhido a 90 s', rota.replace('noTamanho ? prazoDaNovaTentativa(Date.now() - inicioDaRota, OPENAI_SCRIPT_TIMEOUT_MS) : OPENAI_SCRIPT_TIMEOUT_MS', 'prazoDaNovaTentativa(Date.now() - inicioDaRota, OPENAI_SCRIPT_TIMEOUT_MS)'), async (src) => {
    try { return (await postar({ routeSrc: src, body: PEDIDO_K90, gpt: ({ n }) => { if (n === 1) atrasoDoRelogio += 30000; return n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_70 } })).chamadas[1]?.timeout === 35000 } finally { atrasoDoRelogio = 0 }
  }],
  ['sem a descrição na escolha', rota.replace(', leDescricao: leuADescricao(script) }', ' }').replace(', leDescricao: leuADescricao(retryScript) }', ' }'), async (src) => (await postar({ routeSrc: src, body: { topic: CRIANCA, language: 'en', targetSeconds: 60, engine: 'seedance' }, gpt: ({ n }) => (n === 1 ? DESC_LE : DESC_NAO) })).body?.script === DESC_NAO],
  ['sem o prazo da 2ª chamada', rota.replace('noTamanho ? prazoDaNovaTentativa(Date.now() - inicioDaRota, OPENAI_SCRIPT_TIMEOUT_MS) : OPENAI_SCRIPT_TIMEOUT_MS', 'OPENAI_SCRIPT_TIMEOUT_MS'), async (src) => {
    try { return (await postar({ routeSrc: src, body: PEDIDO_RICK, gpt: ({ n }) => { if (n === 1) atrasoDoRelogio += 50000; return ROTEIRO_RICK_89 } })).chamadas.length === 1 } finally { atrasoDoRelogio = 0 }
  }],
  ['resgate com o plano', rota.replace('SYSTEM_PROMPT + instrucaoDoResgate(', 'PROMPT_DO_ROTEIRO + instrucaoDoResgate('), async (src) => !/LENGTH PLAN/.test((await postar({ routeSrc: src, body: PEDIDO_RICK, gpt: ({ n }) => (n === 1 ? RECUSA : ROTEIRO_RICK_89) })).chamadas[1]?.system ?? 'LENGTH PLAN')],
  ['sem o pedido de tamanho na 2ª', rota.replace('${pedidoDoTamanho} Respond with ONLY the script.', ' Respond with ONLY the script.'), async (src) => /LENGTH IS THE MAIN PROBLEM/.test((await postar({ routeSrc: src, body: PEDIDO_RICK, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_LONGO) })).chamadas[1]?.user ?? '')],
  ['sem a escolha entre versões', rota.replace("if (fica === 'segunda') script = retryScript", 'script = retryScript'), async (src) => (await postar({ routeSrc: src, body: PEDIDO_RICK, gpt: ({ n }) => (n === 1 ? ROTEIRO_RICK_89 : ROTEIRO_RICK_70) })).body?.script === ROTEIRO_RICK_89],
]
for (const [nome, src, prova] of mutantes) {
  const aplicou = src !== rota
  const verde = aplicou ? await prova(src) : true
  ok(aplicou && !verde, `mutante "${nome}" aplicado e reprovado`)
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} verdes, ${fail} vermelhas`)
process.exit(fail === 0 ? 0 : 1)
