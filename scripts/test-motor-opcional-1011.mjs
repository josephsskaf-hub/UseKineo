// KINEO-MOTOR-OPCIONAL-1011 [fundador 10/11: "se a pessoa quiser escolher, ela tem que ter essa opção de escolher se ela quiser"]
// Guardião da escolha OPCIONAL de motor na aba Film (passo Details). Offline: módulos REAIS transpilados, hooks emulados
// (docs/studio-na-moldura-1011/runtime.cjs), sem rede, sem banco, sem chamada paga. Prova:
//   A. a lista é DERIVADA (portão de plano ∩ caixa do Studio ∩ oferta) — mexer na fonte muda a lista; = os cards do Studio antigo;
//   B. quem vê / quem gera = a régua do picker do Studio antigo, EXECUTANDO a expressão do próprio StudioClient em toda combinação de flags;
//   C. na tela: fechada por padrão, padrão = seedance sem nome, nenhuma leitura a mais até abrir; trancado não vira motor;
//   D. o número do botão acompanha motor × duração pela função que cobra; sem preço na lista;
//   E. o pedido = o do Studio (caixa do /studio?engine=X, mesma rota e mesmos campos) e os campos do generate() do Studio antigo.
// Mutantes no fim provam que o teste morde.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const R = require('../docs/studio-na-moldura-1011/runtime.cjs')
const { aba, React, read, visibleText } = R
const lf = s => s.replace(/\r\n/g, '\n')
let passed = 0
const ok = (cond, msg) => { assert(cond, msg); passed++ }
const SESSION = 'sb-abc-auth-token=x'
const PAID = { credits: 400, hasPaid: true, isStarter: false, isCreator: false, isStudio: true, entitlementsResolved: true, filmsDelivered: 3, trial: { phase: 'none' } }
const ME_PAGO = { credits: 400, internal: true, h3max: true, s25Liberado: true, hasPaid: true, plan: 'studio' }
const ME_SEM_25 = { credits: 40, internal: true, h3max: true, s25Liberado: false, hasPaid: false, plan: 'free' }
const IDEA = 'The ghost ship Mary Celeste'
const STUDIO = 'app/(dashboard)/studio/StudioClient.tsx'
const src = (o, p) => lf(o[p] ?? read(p))

// ─── A. Lista derivada ─────────────────────────────────────────────────────────────────────────────────────────────
function derivadaChecks(o) {
  const m = aba(o).m('lib/create/motorOpcional'), launch = aba(o).m('lib/engineLaunch')
  const cand = m.motoresCandidatos()
  ok(cand.length >= 3 && cand.every(k => launch.engineOffered(k)) && !cand.some(k => launch.OFFER_RETIRED_ENGINE_KEYS.includes(k)), `A candidatos só da oferta (${cand})`)
  // Os cards do Studio antigo (a tabela ENGINES do StudioClient), menos o padrão e o Kineo 1 (fora da caixa desde 29/09).
  const studio = src(o, STUDIO), bloco = studio.slice(studio.indexOf('const ENGINES:'), studio.indexOf('// KINEO-CEO-HOUR-2026-08-17 (#3)'))
  const cards = [...bloco.matchAll(/^\s*\{ key: '([a-z0-9]+)'/gm)].map(x => x[1]).filter(k => k !== 'fast' && k !== 'seedance')
  ok(cards.length >= 3 && [...cards].sort().join() === [...cand].sort().join(), `A = os cards do Studio antigo (${cards} × ${cand})`)
  // Prova de derivação: aposentar um motor na FONTE tira o motor daqui; tirá-lo do portão de plano também.
  const ret = lf(read('lib/engineLaunch.ts')).replace("OFFER_RETIRED_ENGINE_KEYS: readonly string[] = ['omni', 'kling', 'veo']", "OFFER_RETIRED_ENGINE_KEYS: readonly string[] = ['omni', 'kling', 'veo', 'h3']")
  ok(ret.includes("'veo', 'h3']") && !aba({ ...o, 'lib/engineLaunch.ts': ret }).m('lib/create/motorOpcional').motoresCandidatos().includes('h3'), 'A aposentar na fonte (OFFER_RETIRED_ENGINE_KEYS) tira o motor da lista')
  const gate = lf(read('lib/enginePlanGate.ts')).replace("'kling', 'veo', 'hollywood', 'h3', 'h3max', 'omni', 's25',", "'kling', 'veo', 'hollywood', 'h3', 'omni', 's25',")
  ok(!aba({ ...o, 'lib/enginePlanGate.ts': gate }).m('lib/create/motorOpcional').motoresCandidatos().includes('h3max'), 'A a lista sai do portão de plano (STUDIO_ONLY_ENGINE_KEYS)')
  const caixa = lf(read('lib/growth/studioSimples.ts')).replace("hollywood: 'Kling 4.0', ", '')
  ok(!aba({ ...o, 'lib/growth/studioSimples.ts': caixa }).m('lib/create/motorOpcional').motoresCandidatos().includes('hollywood'), 'A só motor que a caixa do Studio aceita (motorDaCaixa)')
  ok(!/\[\s*'(h3|h3max|hollywood|s25)'\s*,/.test(src(o, 'lib/create/motorOpcional.ts')), 'A nenhuma lista de motores digitada no módulo')
  for (const k of cand) ok(m.qualidadeDoMotor(k) === `cinematic_${k}` && aba(o).m('lib/enginePlanGate').engineDisplayName(k) !== k, `A ${k}: quality e nome das fontes da casa`)
}

// ─── B. Mesma régua do picker do Studio antigo (a expressão DELE, executada) ───────────────────────────────────────
function reguaChecks(o) {
  const studio = src(o, STUDIO)
  const i = studio.indexOf('{ENGINES.filter((e) => '), j = studio.indexOf(').map((e) => { const pausa', i)
  ok(i > 0 && j > i, 'B o filtro do picker do Studio está lá')
  const pred = new Function('e', 'internal', 's25SomeNoPrimeiroFilme', 'h3maxOk', 'kineo1Shown', 'return ' + studio.slice(i + '{ENGINES.filter((e) => '.length, j))
  const tr = studio.match(/const trancado = (!pausa && e\.key === 's25' && s25Liberado !== true)/)
  const muro = studio.match(/const s25SomeNoPrimeiroFilme = (firstFilmHistoryEmpty && s25Liberado !== true)/)
  ok(tr && muro && studio.includes('useState<boolean>(H3MAX_PUBLIC)') && /d\?\.h3max === true\) setH3maxOk\(true\)/.test(studio), 'B trancado, muro do 1º filme e H3 Max: expressões do Studio')
  const trancado = new Function('pausa', 'e', 's25Liberado', 'return ' + tr[1])
  const muroFn = new Function('firstFilmHistoryEmpty', 's25Liberado', 'return ' + muro[1])
  const m = aba(o).m('lib/create/motorOpcional'), launch = aba(o).m('lib/engineLaunch')
  let combos = 0
  for (const internal of [false, true]) for (const h3max of [false, true]) for (const s25Liberado of [true, false, null]) for (const semFilme of [false, true]) {
    const lista = m.motoresOpcionais({ internal, h3max, s25Liberado, semFilme, plan: null })
    for (const key of m.motoresCandidatos()) {
      const e = { key }
      const ve = !!pred(e, internal, muroFn(semFilme, s25Liberado), launch.H3MAX_PUBLIC || h3max, true)
      const item = lista.find(x => x.key === key)
      ok(ve === !!item, `B ${key} internal=${internal} h3max=${h3max} s25=${s25Liberado} semFilme=${semFilme}: aparece igual ao Studio`)
      if (item) {
        const pausa = launch.enginePaused(key)
        ok((item.estado === 'pausado') === !!pausa, `B ${key}: pausa igual ao Studio`)
        ok((item.estado === 'trancado') === !!trancado(pausa, e, s25Liberado), `B ${key} s25=${s25Liberado}: trancado igual ao Studio`)
        if (item.estado === 'trancado') ok(item.href.startsWith('/pricing') && !m.motorGeravel(key, { internal, h3max, s25Liberado, semFilme, plan: null }), `B ${key}: trancado leva aos planos e não gera`)
      }
      combos++
    }
    ok(!lista.some(x => launch.OFFER_RETIRED_ENGINE_KEYS.includes(x.key)), 'B motor aposentado nunca aparece')
  }
  ok(combos >= 24 * 4, `B ${combos} combinações comparadas`)
  ok(m.motorGeravel('seedance', null) === true && m.motorGeravel('h3', null) === false && m.flagsDoCorpo(null, 3) === null, 'B sem flags: só o padrão (falha fechada)')
}

// ─── C/D/E. Na tela ────────────────────────────────────────────────────────────────────────────────────────────────
const NOW = 1_800_000_000_000 // o relógio fixo do runtime
const K4_AO_VIVO = { paidLive: true, promoLive: false, promoAvailable: false, publicOfferLive: true, reason: 'ok', checkedAt: new Date(NOW).toISOString(), validUntil: new Date(NOW + 10_000).toISOString() }
async function frame(o, me, credits = PAID, k4 = null) {
  const t = aba(o, { cookie: SESSION, credits, me, k4 })
  t.mount(React.createElement(t.m('components/create/StudioNaMoldura').default, { showRecreate: true, motor: 'seedance', campanha: 'create_film' }))
  await t.settle()
  return t
}
const abrir = async t => { t.one(p => p['data-create-engine'] === '', 'linha do motor').props.onToggle({ currentTarget: { open: true } }); await t.settle(); t.render(); return t.html() }
const button = html => html.match(/<button type="button" class="rc-generate"[^>]*>[\s\S]*?<\/button>/)[0]
const ENGINE_NAMES = /\b(kling|seedance|veo|minimax|h3|omni|sora|runway)\b/i
async function telaChecks(o) {
  const t = await frame(o, ME_PAGO)
  const html = t.html()
  ok(/<details class="ct-engine" data-create-engine="">/.test(html) && !/<details class="ct-engine"[^>]* open/.test(html), 'C linha do motor fechada por padrão')
  ok(/data-engine-chosen="seedance">Standard</.test(html) && !ENGINE_NAMES.test(visibleText(html.replace(/<header[\s\S]*?<\/header>/, ''))), 'C padrão = seedance, sem nome de motor na tela')
  ok(!t.log.fetches.some(f => f[0] === '/api/me/credits'), 'C nenhuma leitura de flags antes de abrir')
  t.type(p => p.id === 'sm-idea', IDEA, 'ideia'); t.click(p => p['data-testid'] === 'studio-simple-generate', 'Generate')
  ok(new URL(t.log.pushes[0], 'https://x').searchParams.get('engine') === 'seedance', 'C sem abrir, o pedido sai em seedance')
  // Aberta (conta paga com 2.5): lista = régua; sem preço na lista; o padrão segue marcado.
  const t2 = await frame(o, ME_PAGO)
  const h2 = await abrir(t2)
  const lista = [...h2.matchAll(/data-studio-engine="([a-z0-9]+)"/g)].map(x => x[1])
  const esperado = ['seedance', ...aba(o).m('lib/create/motorOpcional').motoresOpcionais({ internal: true, h3max: true, s25Liberado: true, semFilme: false, plan: 'studio' }).filter(x => x.estado === 'livre').map(x => x.key)]
  ok(t2.log.fetches.filter(f => f[0] === '/api/me/credits').length === 1 && lista.join() === esperado.join(), `C aberta: lê /api/me/credits uma vez e lista ${lista}`)
  const bloco = (h2.match(/<details class="ct-engine"[\s\S]*?<\/details>/) || [''])[0]
  ok(!/(✦|\bcredits?\b|\bcr\b|\$\s?\d)/i.test(visibleText(bloco)), 'D nenhum preço na lista de motores')
  // Conta sem 2.5: o 2.5 aparece trancado (link aos planos) e clicar nele não muda o motor.
  const t3 = await frame(o, ME_SEM_25)
  const h3 = await abrir(t3)
  ok(/<a class="ct-engine-opt ct-engine-locked" href="\/pricing\?intent_campaign=s25_paid_plans_studio#plans" data-studio-engine-locked="s25">/.test(h3) && !/data-studio-engine="s25"/.test(h3), 'C 2.5 trancado = link aos planos, sem botão de escolher')
  t3.render(); t3.type(p => p.id === 'sm-idea', IDEA, 'ideia')
  const caixa = t3.all(p => typeof p.onToggle === 'function')
  ok(caixa.length === 1, 'C uma linha de motor')
  // A moldura não expõe atalho: escolherMotor('s25') direto também é recusado (só o que a régua deixa livre).
  const grab = []
  const t4 = aba(o, { cookie: SESSION, credits: PAID, me: ME_SEM_25 })
  t4.mount(React.createElement(t4.m('components/studio/StudioSimples').default, { filmes: [], motor: 'seedance', campanha: 'create_film', moldura: c => { grab.push(c); return React.createElement('i') } }))
  await t4.settle(); grab.at(-1).abrirMotores(); await t4.settle(); grab.at(-1).escolherMotor('s25'); t4.render()
  ok(grab.at(-1).motor === 'seedance', 'C escolher um motor trancado não troca o motor do pedido')
  grab.at(-1).escolherMotor('veo'); t4.render()
  ok(grab.at(-1).motor === 'seedance', 'C motor aposentado não pode ser escolhido')
}

async function precoEPedidoChecks(o) {
  const m = aba(o).m('lib/create/motorOpcional'), cost = aba(o).m('lib/credits/engineCost')
  const livres = m.motoresOpcionais({ internal: true, h3max: true, s25Liberado: true, semFilme: false, plan: 'studio' }).filter(x => x.estado === 'livre').map(x => x.key)
  const studio = src(o, STUDIO)
  ok(/const q = new URLSearchParams\(\{ engine, prompt: finalPrompt, duration: String\(duration\), script_mode: scriptMode, autoanalyze: '1', studio: '1', intent_campaign: campaignRef\.current \}\)/.test(studio) && studio.includes("if (aspect !== '9:16') q.set('aspect', aspect)") && studio.includes("router.push(`/studio/create?${q.toString()}`)"), 'E o generate() do Studio antigo: /studio/create com engine, prompt, duration, script_mode, autoanalyze, studio, intent_campaign (+aspect fora do 9:16)')
  for (const k of ['seedance', ...livres]) for (const d of m.duracoesDoMotor(k)) for (const formato of ['9:16', '1:1']) {
    // Tela nova: abre a linha, escolhe o motor, a duração e o formato, escreve e gera.
    const t = await frame(o, ME_PAGO)
    await abrir(t)
    t.click(p => p['data-studio-engine'] === k, 'motor')
    t.click(p => p['data-studio-duration'] === d, 'duração')
    if (formato !== '9:16') t.click(p => p['data-studio-format'] === formato, 'formato')
    t.type(p => p.id === 'sm-idea', IDEA, 'ideia')
    const b = button(t.html()), n = cost.creditCostForDuration(m.qualidadeDoMotor(k), true, d)
    if (k === 'hollywood') ok(/>Generate<\/button>$/.test(b), `D Kling 4.0 ${d} s sem a leitura de disponibilidade: "Generate" sem número (nunca um palpite)`)
    else ok(b.includes(`Generate<span>✦ ${n}</span>`) && n === m.custoDoMotor(k, d), `D ${k} ${d} s: botão "✦ ${n}" = creditCostForDuration`)
    ok(new RegExp(`data-engine-chosen="${k}">`).test(t.html()), `C ${k}: o resumo mostra a escolha`)
    t.click(p => p['data-testid'] === 'studio-simple-generate', 'Generate')
    // Caixa do /studio?engine=k (o Studio simples), mesmas escolhas pela folha de ajustes dele.
    const s = aba(o, { cookie: SESSION, credits: PAID })
    s.mount(React.createElement(s.m('components/studio/StudioSimples').default, { filmes: [], motor: k, campanha: 'create_film', ideiaInicial: IDEA }))
    await s.settle()
    s.click(p => p['data-testid'] === 'studio-simple-settings', 'Settings')
    if (s.all(p => p.className === 'ksx-opt' && p.children?.[0] === d).length) s.click(p => p.className === 'ksx-opt' && p.children?.[0] === d, 'duração')
    if (formato !== '9:16') s.click(p => p.className === 'ksx-opt' && p.children === formato, 'formato')
    s.click(p => p['data-testid'] === 'studio-simple-generate', 'Generate')
    const q = new URL(t.log.pushes[0], 'https://x').searchParams
    const caixaTemDuracao = new URL(s.log.pushes[0], 'https://x').searchParams.get('duration') === String(d)
    ok(q.get('engine') === k && q.get('duration') === String(d) && (formato === '9:16' ? !q.has('aspect') : q.get('aspect') === formato) && [...q.keys()].sort().join() === [...new URL(s.log.pushes[0], 'https://x').searchParams.keys()].sort().join(), `E ${k} ${d} s ${formato}: mesmos campos do Studio`)
    if (caixaTemDuracao) ok(t.log.pushes[0] === s.log.pushes[0] && JSON.stringify([...t.log.storage].map(([a, v]) => [a, JSON.parse(v).engine])) === JSON.stringify([...s.log.storage].map(([a, v]) => [a, JSON.parse(v).engine])), `E ${k} ${d} s ${formato}: pedido idêntico ao /studio?engine=${k} (${t.log.pushes[0]})`)
  }
  // Kling 4.0 pago no ar (a MESMA leitura do Studio antigo): durações 15/60 da caixa e o número da tabela que o servidor cobra.
  if (livres.includes('hollywood')) {
    const k4 = aba(o).m('lib/kling4PaidPricing')
    for (const d of [15, 60]) {
      const t = await frame(o, ME_PAGO, PAID, K4_AO_VIVO)
      await abrir(t)
      t.click(p => p['data-studio-engine'] === 'hollywood', 'Kling 4.0')
      const durs = [...t.html().matchAll(/data-studio-duration="(\d+)"/g)].map(x => +x[1])
      ok(durs.join() === '15,60', `D Kling 4.0 ao vivo: só as durações que ele cobra (${durs})`)
      if (d !== 60) t.click(p => p['data-studio-duration'] === d, 'duração')
      t.type(p => p.id === 'sm-idea', IDEA, 'ideia')
      ok(button(t.html()).includes(`Generate<span>✦ ${k4.kling4PaidCredits(d)}</span>`) && t.html().includes('data-kling4-film-limits'), `D Kling 4.0 ao vivo ${d} s: "✦ ${k4.kling4PaidCredits(d)}" (kling4PaidCredits) + o aviso de limites do Studio`)
    }
    const promo = await frame(o, ME_PAGO, PAID, { ...K4_AO_VIVO, promoLive: true, promoAvailable: true })
    await abrir(promo); promo.click(p => p['data-studio-engine'] === 'hollywood', 'Kling 4.0'); promo.type(p => p.id === 'sm-idea', IDEA, 'ideia')
    ok(/>Generate<\/button>$/.test(button(promo.html())), 'D Kling 4.0 na promoção grátis: sem número (o passo seguinte confirma)')
  }
  // Quem não paga: sem número (a regra de sempre), em qualquer motor.
  const t = await frame(o, ME_PAGO, { ...PAID, hasPaid: false, isStudio: false })
  await abrir(t); t.click(p => p['data-studio-engine'] === livres[0], 'motor')
  ok(/<button type="button" class="rc-generate"[^>]*>Generate<\/button>/.test(t.html()), 'D quem não paga: "Generate" sem número também com motor escolhido (a regra de sempre)')
  // Advanced studio continua, discreto, para o que ainda não está aqui.
  ok(/<p class="ct-advanced"><a [^>]*data-kineo="studio-advanced"[^>]*>Advanced studio ↗<\/a><span> · logo, camera, star of the film<\/span><\/p>/.test(t.html()), 'Advanced studio: só o que falta (logo, câmera, estrela)')
}

async function all(o = {}) { derivadaChecks(o); reguaChecks(o); await telaChecks(o); await precoEPedidoChecks(o) }
await all()
const real = passed

const s = p => read(p)
const mutants = [
  ['linha do motor aberta por padrão', { 'components/create/StudioNaMoldura.tsx': s('components/create/StudioNaMoldura.tsx').replace('<details className="ct-engine" data-create-engine=""', '<details className="ct-engine" data-create-engine="" open') }],
  ['padrão deixa de ser seedance', { 'components/studio/StudioSimples.tsx': s('components/studio/StudioSimples.tsx').replace('const [escolhido, setEscolhido] = useState(motorDoLink)', "const [escolhido, setEscolhido] = useState('h3')") }],
  ['motor aposentado listado', { 'lib/create/motorOpcional.ts': s('lib/create/motorOpcional.ts').replace('.filter((k) => motorDaCaixa(k) === k && engineOffered(k))', ".filter((k) => k === 'veo' || (motorDaCaixa(k) === k && engineOffered(k)))") }],
  ['motor de plano maior gerável (2.5 sem trava)', { 'lib/create/motorOpcional.ts': s('lib/create/motorOpcional.ts').replace("if (key === 's25' && f.s25Liberado !== true) {", 'if (false) {') }],
  ['escolher trancado vira o motor', { 'components/studio/StudioSimples.tsx': s('components/studio/StudioSimples.tsx').replace('      if (!livre) return\n', '').replace('      if (!livre) return\r\n', '') }],
  ['custo do botão não acompanha o motor', { 'lib/create/filmNaMoldura.ts': s('lib/create/filmNaMoldura.ts').replace("return f.motor === MOTOR_PADRAO ? creditCostForDuration('cinematic_ai', true, f.duracao) : custoNoBotao(f.motor, f.duracao, f.kling4)", "return creditCostForDuration('cinematic_ai', true, f.duracao)") }],
  ['lista redigitada em vez de derivada', { 'lib/create/motorOpcional.ts': s('lib/create/motorOpcional.ts').replace('  return [...STUDIO_ONLY_ENGINE_KEYS]\n', "  return ['h3', 'h3max', 'hollywood', 's25'] || [...STUDIO_ONLY_ENGINE_KEYS]\n").replace('  return [...STUDIO_ONLY_ENGINE_KEYS]\r\n', "  return ['h3', 'h3max', 'hollywood', 's25'] || [...STUDIO_ONLY_ENGINE_KEYS]\r\n") }],
  ['muro do 1º filme esquecido', { 'lib/create/motorOpcional.ts': s('lib/create/motorOpcional.ts').replace('const s25SomeNoPrimeiroFilme = f.semFilme && f.s25Liberado !== true', 'const s25SomeNoPrimeiroFilme = false') }],
  ['lê as flags sem abrir', { 'components/studio/StudioSimples.tsx': s('components/studio/StudioSimples.tsx').replace('  const motor = moldura ? escolhido : motorDoLink', "  useEffect(() => { if (moldura) void fetch('/api/me/credits') }, [])\n  const motor = moldura ? escolhido : motorDoLink") }],
  ['preço dentro da lista', { 'components/create/StudioNaMoldura.tsx': s('components/create/StudioNaMoldura.tsx').replace('data-studio-engine={o.key} onClick={() => c.escolherMotor(o.key)}>{o.nome}</button>', 'data-studio-engine={o.key} onClick={() => c.escolherMotor(o.key)}>{o.nome} · 45 credits</button>') }],
  ['pedido com motor de fora', { 'components/studio/StudioSimples.tsx': s('components/studio/StudioSimples.tsx').replace('router.push(pedidoDoStudioSimples({ motor, texto: t,', "router.push(pedidoDoStudioSimples({ motor: 'seedance', texto: t,") }],
]
let bitten = 0
for (const [name, o] of mutants) {
  passed = 0
  if (Object.entries(o).some(([p, v]) => v === s(p))) throw new Error(`mutante não aplicou: ${name}`)
  let died = false
  try { await all(o) } catch (e) { died = true; if (process.env.VERBOSE) console.log(`  ${name} → ${String(e.message).split('\n')[0]}`) }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-motor-opcional-1011: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
