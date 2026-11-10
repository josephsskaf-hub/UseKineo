// KINEO-CAIXA-PRESENTE-0511 — guardião sem rede da caixa de presente. Executa a regra real (lib/ui/caixaPresente0511.ts) sobre os corpos que as rotas de verdade montam
// (trialUiState, resolveAnnualOffer, buildKling4PromoAvailability) e monta o componente real com um pequeno motor de hooks: conta rede, ouvintes, relógios e renders antes e depois do clique.
// Cada mutante muda a fonte e precisa deixar ao menos uma verificação vermelha.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const raiz = process.cwd()
const require = createRequire(path.join(raiz, 'package.json'))
const ts = require('typescript')
const React = require('react')

const F = {
  regra: 'lib/ui/caixaPresente0511.ts',
  comp: 'components/CaixaDePresente0511.tsx',
  shell: 'app/(dashboard)/DashboardShell.tsx',
  topo: 'components/TopBar.tsx',
  afiliado: 'lib/affiliateCommission.ts',
  filme: 'lib/growth/filmeGratisNaCaixa.ts',
  rotaAnual: 'app/api/offers/annual-welcome/route.ts',
  traducao: 'lib/ui/refinementCopy.json', // KINEO-PRESENTE-CONECTOR-0911
}
const lf = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8').replace(/\r\n/g, '\n')
const SRC = Object.fromEntries(Object.values(F).map((rel) => [rel, lf(rel)]))

const T0 = Date.parse('2026-11-05T12:00:00.000Z')
const H = 3_600_000
const tique = () => new Promise((r) => setImmediate(r))

function nodes(arvore) {
  if (Array.isArray(arvore)) return arvore.flatMap(nodes)
  if (!arvore || typeof arvore !== 'object') return []
  return [arvore, ...nodes(arvore.props?.children)]
}

// O motor de hooks: o mínimo de React para rodar o componente real, com efeitos, sem navegador. `render()` para de vez se a tela não assenta.
function motor(tipo, props, ambiente) {
  const m = { slots: [], arvore: null, renders: 0, setsNoEfeito: 0, laco: false }
  let i = 0, sujo = false, emEfeito = false
  const pendentes = []
  const mudou = (a, b) => !a || !b || a.length !== b.length || a.some((v, k) => !Object.is(v, b[k]))
  const slot = (criar) => { const k = i++; if (!(k in m.slots)) m.slots[k] = criar(); return m.slots[k] }
  ambiente.hooks.useState = (inicial) => {
    const s = slot(() => ({ v: typeof inicial === 'function' ? inicial() : inicial }))
    return [s.v, (n) => { const nv = typeof n === 'function' ? n(s.v) : n; if (!Object.is(nv, s.v)) { s.v = nv; sujo = true; if (emEfeito) m.setsNoEfeito++ } }]
  }
  ambiente.hooks.useRef = (inicial) => slot(() => ({ current: inicial }))
  ambiente.hooks.useCallback = (fn, deps) => { const s = slot(() => ({ fn, deps })); if (mudou(s.deps, deps)) { s.fn = fn; s.deps = deps } return s.fn }
  ambiente.hooks.useEffect = (fn, deps) => {
    const s = slot(() => ({ deps: null, limpar: null }))
    if (mudou(s.deps, deps)) { s.deps = deps; pendentes.push(() => { s.limpar?.(); s.limpar = fn() ?? null }) }
  }
  m.render = () => {
    let voltas = 0
    do {
      if (++voltas > 25) { m.laco = true; return }
      sujo = false
      i = 0
      m.renders++
      m.arvore = tipo(props)
      for (const n of nodes(m.arvore)) if (n.ref && typeof n.ref === 'object') n.ref.current ??= ambiente.criarNo(n)
      emEfeito = true
      for (const e of pendentes.splice(0)) e()
      emEfeito = false
    } while (sujo)
  }
  return m
}

function carregarComponente(load, fonte, ambiente) {
  const saida = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const shim = (nome) => {
    if (nome === 'react') return ambiente.hooks
    if (nome === 'next/link') return { default: ambiente.Link, __esModule: true }
    if (nome === '@/components/InterfaceLanguage') return { UiLabel: ambiente.UiLabel, useUiCopy: () => (s) => s }
    if (nome === '@/lib/analytics') return { trackClosedEvent: ambiente.track } // KINEO-PRESENTE-CONECTOR-0911 — o evento do clique, contado
    if (nome.startsWith('@/lib/')) return load(nome)
    throw new Error('import inesperado: ' + nome)
  }
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', 'React', 'fetch', 'document', 'setInterval', 'clearInterval', saida)(shim, mod, mod.exports, React, ambiente.fetch, ambiente.document, ambiente.setInterval, ambiente.clearInterval)
  return mod.exports
}

async function problemas(mut = {}) {
  const p = []
  const checa = (nome, c) => { if (!c) p.push(nome) }
  const fonte = (rel) => mut[rel] ?? SRC[rel]
  const load = createOfflineLoader({
    env: { KINEO_REVERSE_TRIAL_ENABLED: 'true' },
    globals: { setTimeout, clearTimeout, AbortController, Date },
    source: (rel, t) => mut[rel] ?? t,
    mocks: { '@/lib/serverEvents': { writeServerEvent: async () => {} } },
  })
  const R = load(F.regra)
  const { trialUiState } = load('lib/reverseTrial.ts')
  const O = load('lib/billing/annualWelcomeOffer.ts')
  const K = load('lib/kling4Promo.ts')
  const { ANNUAL_WELCOME_DISCOUNT_PERCENT } = load('lib/checkoutPricing.ts')
  const { AFFILIATE_COMMISSION_PCT } = load(F.afiliado)
  const { LINHA_DO_FILME_GRATIS } = load(F.filme)
  const { KLING4_PAID_COPY } = load('lib/kling4PaidPresentation.ts')

  // ─── Os corpos que as rotas de verdade devolvem ──────────────────────────────────────────────────────────────────────────────
  const corpoCredits = (perfil, extra = {}) => ({
    credits: perfil.video_credits, entitlementsResolved: true, hasPaid: perfil.has_paid === true, isStarter: false, isCreator: false, isStudio: false,
    filmsDelivered: 0, plan: perfil.plan ?? 'free', trial: trialUiState(perfil, T0), ...extra,
  })
  const emTeste = { trial_status: 'active', trial_ends_at: new Date(T0 + 48 * H).toISOString(), trial_credits_used: 0, trial_credits_granted: 25, plan: 'free', has_paid: false, video_credits: 25 }
  const creditsTeste = corpoCredits(emTeste)
  const corpoAnual = (o) => {
    const oferta = O.resolveAnnualOffer({ tier: 'basic', isAnnual: true, signedIn: true, accountCreatedAt: o.criada, hasPaid: o.hasPaid ?? false, bfOpen: o.bf === true, bfEndsAtMs: T0 + 240 * H, nowMs: T0 })
    return { nowMs: T0, offer: oferta?.kind ?? null, endsAtMs: oferta?.endsAtMs ?? null }
  }
  const criadaHa = (ms) => new Date(T0 - ms).toISOString()
  const assinatura = (over = {}) => ({ userId: 'u', provider: 'stripe', subscriptionId: 's', plan: 'basic', status: 'active', startedAt: criadaHa(24 * H), paidThrough: new Date(T0 + 240 * H).toISOString(), verifiedAt: new Date(T0).toISOString(), ...over })
  const politica = { paidLive: true, promoLive: true, launchAt: '2026-10-29T00:00:00.000Z' }
  const corpoKling = (over = {}) => K.buildKling4PromoAvailability({ policy: politica, now: T0, subscription: assinatura(), budgetAvailable: true, usedToday: 0, ...over })
  const so = (leituras, agora = T0) => R.linhasDaCaixa({ ...R.CAIXA_SEM_LEITURA, ...leituras }, agora)
  const ids = (linhas) => linhas.map((l) => l.id).join(',')
  // KINEO-MENSAL-3H-0911 — a mesma resposta ganhou monthlyOffer/monthlyEndsAtMs (os 30% do 1º mês, mesmo relógio); os três campos do anual seguem iguais.
  checa('a rota do anual segue devolvendo nowMs, offer e endsAtMs', SRC[F.rotaAnual].includes('nowMs, offer: offer?.kind ?? null, endsAtMs: offer?.endsAtMs ?? null,\n'))

  // ─── Afiliado: sempre, com a constante ───────────────────────────────────────────────────────────────────────────────────────
  const soAfiliado = so({})
  checa('todas as leituras falharam: ficam o conector e o afiliado', ids(soAfiliado) === 'claude,chatgpt,afiliado')
  checa('afiliado: Earn com a taxa da constante, para /affiliate', soAfiliado.at(-1)?.titulo === `Earn ${AFFILIATE_COMMISSION_PCT}` && soAfiliado.at(-1)?.href === '/affiliate')
  checa('afiliado: a mesma taxa do menu', lf('components/Sidebar.tsx').includes(`label="Earn ${AFFILIATE_COMMISSION_PCT}"`))

  // ─── Filme grátis ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const comFilme = so({ credits: creditsTeste })
  // KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"] — a linha abre a aba Film da tela nova pela entrada única
  // (createEntryHref('film', '/studio')); com CREATE_ENTRY_RELEASE 'off' volta a ser /studio.
  const entradaFilme = load('lib/create/entry.ts').createEntryHref('film', '/studio', true) /* a linha só existe com a leitura da conta: logado */
  checa('teste ativo sem gasto e sem filme: filme grátis, para a aba Film (antes /studio)', entradaFilme === '/create/film?intent_campaign=studio_simple' && comFilme[0]?.id === 'filme' && comFilme[0]?.titulo === LINHA_DO_FILME_GRATIS && comFilme[0]?.href === entradaFilme)
  const regiao = { trial_status: 'region_paid_only', trial_ends_at: null, trial_credits_used: 0, trial_credits_granted: 0, plan: 'free', has_paid: false, video_credits: 25 }
  checa('region_paid_only com saldo, sem pagar e sem filme nunca vê filme grátis', !ids(so({ credits: corpoCredits(regiao) })).includes('filme'))
  for (const [nome, corpo] of Object.entries({
    'a pedido, sem pedir': corpoCredits({ ...regiao, trial_status: 'on_request' }),
    'bloqueada': corpoCredits({ ...regiao, trial_status: 'blocked' }),
    'teste vencido': corpoCredits({ ...emTeste, trial_ends_at: criadaHa(H) }),
    'já recebeu filme': { ...creditsTeste, filmsDelivered: 1 },
    'contagem de filmes desconhecida': { ...creditsTeste, filmsDelivered: null },
    'já pagou': { ...creditsTeste, hasPaid: true },
    'saldo que não cobre': { ...creditsTeste, credits: 1 },
    'corpo de erro': { error: 'x', credits_read_failed: true },
  })) checa(`sem filme grátis: ${nome}`, !ids(so({ credits: corpo })).includes('filme'))

  // ─── Anual a 50%: só com a janela aberta ─────────────────────────────────────────────────────────────────────────────────────
  const com = (anual, credits = creditsTeste, agora = T0) => so({ credits, annual: anual }, agora).find((l) => l.id === 'anual')
  const aberta = com(corpoAnual({ criada: criadaHa(H) }))
  checa('anual: janela aberta mostra o percentual que cobra, para /pricing', aberta?.titulo === `Your ${ANNUAL_WELCOME_DISCOUNT_PERCENT}% annual offer` && aberta?.href.startsWith('/pricing'))
  checa('anual: 2:59:59 ainda abre', Boolean(com(corpoAnual({ criada: criadaHa(3 * H - 1000) }))))
  checa('anual: 3:00:00 fecha', !com(corpoAnual({ criada: criadaHa(3 * H) })))
  checa('anual: quem pagou não vê', !com(corpoAnual({ criada: criadaHa(H), hasPaid: true })))
  checa('anual: a Black Friday não acende a linha das 3 h', !com(corpoAnual({ criada: criadaHa(H), bf: true })) && !com({ nowMs: T0, offer: 'black_friday_2026', endsAtMs: T0 + H }))
  checa('anual: prazo já vencido no corpo não aparece', !com({ nowMs: T0, offer: 'welcome_3h', endsAtMs: T0 }) && !com({ nowMs: T0, offer: 'welcome_3h', endsAtMs: T0 - 1000 }))
  checa('anual: prazo maior que a janela é dado errado', !com({ nowMs: T0, offer: 'welcome_3h', endsAtMs: T0 + 5 * H }))
  checa('anual: corpo incompleto não aparece', !com({ offer: 'welcome_3h' }) && !com({ nowMs: T0, offer: 'welcome_3h', endsAtMs: null }))
  checa('anual: sem a leitura da conta, some', !com(corpoAnual({ criada: criadaHa(H) }), null) && !com(corpoAnual({ criada: criadaHa(H) }), { ...creditsTeste, entitlementsResolved: false }))
  checa('anual: conta que pagou pela leitura de créditos, some', !com(corpoAnual({ criada: criadaHa(H) }), { ...creditsTeste, hasPaid: true }))
  const agoraLocal = T0 + 137 * 1000 // o relógio do visitante, adiantado
  checa('anual: o prazo vem do servidor, não do relógio do visitante', com(corpoAnual({ criada: criadaHa(H) }), creditsTeste, agoraLocal)?.venceEmMs === agoraLocal + 2 * H)
  checa('anual: dentro do prazo a linha fica', R.linhasAindaValidas([aberta], aberta.venceEmMs - 1).length === 1)
  checa('anual: vencida com a caixa aberta, a linha sai', R.linhasAindaValidas([aberta, soAfiliado.at(-1)], aberta.venceEmMs).map((l) => l.id).join() === 'afiliado')

  // ─── Kling 4: só a promoção confirmada para esta conta ───────────────────────────────────────────────────────────────────────
  const temKling = (corpo, agora = T0) => ids(so({ kling4: corpo }, agora)).includes('kling4')
  checa('Kling 4: assinante confirmado vê o texto da promoção', so({ kling4: corpoKling() }).find((l) => l.id === 'kling4')?.titulo === KLING4_PAID_COPY.included)
  const semAssinatura = corpoKling({ subscription: null })
  checa('Kling 4: oferta pública no ar não acende a linha de quem não assina', semAssinatura.publicOfferLive === true && !temKling(semAssinatura))
  checa('Kling 4: Starter fora da promoção não vê', !temKling(corpoKling({ subscription: assinatura({ plan: 'starter' }) })))
  checa('Kling 4: cota do dia usada some', !temKling(corpoKling({ usedToday: 3 })))
  checa('Kling 4: verba do dia acabou some', !temKling(corpoKling({ budgetAvailable: false })))
  checa('Kling 4: assinatura que não confirmou some', !temKling(corpoKling({ subscription: null, subscriptionUnavailable: true })))
  checa('Kling 4: promoção desligada some', !temKling(corpoKling({ policy: { ...politica, promoLive: false } })))
  checa('Kling 4: leitura vencida some', !temKling(corpoKling(), T0 + 60_000))
  checa('Kling 4: corpo de erro some', !temKling({ error: 'x' }))

  // ─── As leituras ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const urls = []
  const buscaOk = (corpos) => async (url) => { urls.push(url); const c = corpos[url]; if (c === undefined) throw new Error('rede'); return { ok: c !== 500, json: async () => { if (c === 'não é json') throw new Error('json'); return c } } }
  const lidas = await R.lerCaixa(buscaOk({ [R.CAIXA_CREDITS_API]: creditsTeste, [O.ANNUAL_WELCOME_API]: corpoAnual({ criada: criadaHa(H) }), [R.CAIXA_KLING4_API]: corpoKling() }))
  checa('leitura: as 3 rotas que já existem, cada uma uma vez', urls.slice().sort().join() === ['/api/credits', '/api/kling4-paid/availability', '/api/offers/annual-welcome'].join())
  checa('leitura: o Kling 4 com relógio torto do servidor ainda confirma', ids(R.linhasDaCaixa(lidas, Date.now())).includes('kling4'))
  const ruim = await R.lerCaixa(buscaOk({ [R.CAIXA_CREDITS_API]: 500, [O.ANNUAL_WELCOME_API]: 'não é json' }))
  checa('leitura: 500, corpo ruim e rede caída viram null e nunca rejeitam', ruim.credits === null && ruim.annual === null && ids(R.linhasDaCaixa(ruim, T0)) === 'claude,chatgpt,afiliado')

  // ─── O componente: inerte até o clique ───────────────────────────────────────────────────────────────────────────────────────
  const montar = (corpos) => {
    const a = {
      hooks: {}, chamadas: [], eventos: [], ouvintes: { pointerdown: new Set(), keydown: new Set() }, relogios: [], focos: [],
      Link: ({ children }) => children, UiLabel: ({ children }) => children,
    }
    a.track = (nome, meta) => { a.eventos.push({ nome, meta }); return Promise.resolve('stored') }
    a.fetch = async (url) => { a.chamadas.push(url); const c = corpos[url]; if (c === undefined) throw new Error('rede'); return { ok: true, json: async () => c } }
    a.document = {
      addEventListener: (n, f) => a.ouvintes[n]?.add(f),
      removeEventListener: (n, f) => a.ouvintes[n]?.delete(f),
    }
    a.setInterval = (f) => { a.relogios.push(f); return a.relogios.length }
    a.clearInterval = () => {}
    a.criarNo = (el) => ({ nome: el.type, focus() { a.focos.push(el.props.role ?? el.type) }, contains: (alvo) => alvo === 'dentro' && el.props.role === 'dialog' || alvo === 'botao' && el.type === 'button' })
    const Comp = carregarComponente(load, fonte(F.comp), a)
    a.m = motor(Comp.default, {}, a)
    a.Relogio = Comp.default
    a.botao = () => nodes(a.m.arvore).find((n) => n.type === 'button')
    a.painel = () => nodes(a.m.arvore).find((n) => n.props?.role === 'dialog')
    a.links = () => nodes(a.m.arvore).filter((n) => n.props?.href)
    a.solta = (nome, ev) => { for (const f of [...a.ouvintes[nome]]) f(ev) }
    return a
  }
  const corposCheios = { [R.CAIXA_CREDITS_API]: creditsTeste, [O.ANNUAL_WELCOME_API]: { nowMs: Date.now(), offer: 'welcome_3h', endsAtMs: Date.now() + H }, [R.CAIXA_KLING4_API]: { ...corpoKling(), checkedAt: new Date(Date.now()).toISOString(), validUntil: new Date(Date.now() + 15_000).toISOString() } }

  const a = montar(corposCheios)
  a.m.render()
  for (let n = 0; n < 5; n++) a.m.render() // a tela de cima desenhando de novo
  checa('montado: nenhuma chamada de rede antes do clique', a.chamadas.length === 0 && a.eventos.length === 0)
  checa('montado: nenhum estado mexido em efeito', a.m.setsNoEfeito === 0)
  checa('montado: um render por pedido, sem laço', a.m.laco === false && a.m.renders === 6)
  checa('montado: nada escutando e nenhum relógio', a.ouvintes.pointerdown.size === 0 && a.ouvintes.keydown.size === 0 && a.relogios.length === 0)
  checa('montado: painel fechado, só o botão', !a.painel() && a.links().length === 0 && a.botao()?.props['aria-expanded'] === false)
  const botao0 = a.botao()
  checa('botão: nome para leitor de tela, abre painel', botao0?.props.type === 'button' && botao0?.props['aria-haspopup'] === 'dialog' && typeof botao0?.props['aria-label'] === 'string' && botao0.props['aria-label'].length > 0)

  botao0.props.onClick()
  a.m.render()
  checa('clique: abre o painel na hora, com o conector, o afiliado e o aviso de leitura', Boolean(a.painel()) && a.links().length === 3 && nodes(a.m.arvore).some((n) => n.props?.role === 'status'))
  checa('clique: lê as 3 rotas, e abrir não manda evento', a.chamadas.length === 3 && a.eventos.length === 0)
  checa('clique: o foco vai para o painel', a.focos.includes('dialog'))
  checa('clique: Esc e clique fora passam a escutar', a.ouvintes.keydown.size === 1 && a.ouvintes.pointerdown.size === 1)
  for (let n = 0; n < 5; n++) await tique()
  a.m.render()
  const hrefs = a.links().map((l) => l.props.href)
  checa('leitura pronta: as linhas confirmadas, na ordem', hrefs.join() === entradaFilme + ',/pricing?billing=annual,/studio?engine=hollywood,/kineo-in-claude?utm_source=gift_box,/kineo-in-claude?tab=chatgpt&utm_source=gift_box,/affiliate')
  checa('leitura pronta: sem aviso de leitura', !nodes(a.m.arvore).some((n) => n.props?.role === 'status'))
  checa('leitura pronta: sem laço de render', a.m.laco === false && a.chamadas.length === 3)

  // O relógio do anual: conta e, vencido, tira a linha da caixa aberta.
  const v = montar({ ...corposCheios, [O.ANNUAL_WELCOME_API]: { nowMs: 1000, offer: 'welcome_3h', endsAtMs: 1030 } })
  v.m.render()
  v.botao().props.onClick()
  v.m.render()
  for (let n = 0; n < 5; n++) await tique()
  v.m.render()
  const noRelogio = nodes(v.m.arvore).find((n) => typeof n.props?.venceEmMs === 'number')
  checa('anual: o relógio está na linha', Boolean(noRelogio) && v.links().some((l) => l.props.href.startsWith('/pricing')))
  await new Promise((res) => setTimeout(res, 40))
  noRelogio?.props.aoVencer()
  v.m.render()
  checa('anual: o relógio venceu com a caixa aberta, a linha sai e as outras ficam', v.links().length > 0 && !v.links().some((l) => l.props.href.startsWith('/pricing')))
  if (noRelogio) {
    let venceu = 0
    const futuro = motor(noRelogio.type, { venceEmMs: Date.now() + H - 5000, aoVencer: () => { venceu++ } }, v)
    futuro.render()
    v.relogios.at(-1)?.()
    futuro.render()
    checa('relógio: dentro do prazo, conta e não avisa', venceu === 0 && futuro.laco === false && futuro.setsNoEfeito === 0 && [futuro.arvore.props.children].flat().join('').startsWith('Ends in 0:59:'))
    const vencido = motor(noRelogio.type, { venceEmMs: Date.now() - 1, aoVencer: () => { venceu++ } }, v)
    vencido.render()
    v.relogios.at(-1)?.()
    checa('relógio: passou do prazo, avisa uma vez', venceu === 1)
  }

  // Esc, clique fora, foco de volta, reabrir sem guardar nada.
  const e = montar(corposCheios)
  e.m.render()
  e.botao().props.onClick()
  e.m.render()
  for (let n = 0; n < 5; n++) await tique()
  e.m.render()
  e.solta('keydown', { key: 'a' })
  e.m.render()
  checa('outra tecla não fecha', Boolean(e.painel()))
  e.solta('keydown', { key: 'Escape' })
  e.m.render()
  checa('Esc fecha', !e.painel())
  checa('Esc devolve o foco ao botão', e.focos.at(-1) === 'button')
  checa('fechada: para de escutar', e.ouvintes.keydown.size === 0 && e.ouvintes.pointerdown.size === 0)
  e.botao().props.onClick()
  e.m.render()
  checa('reabrir lê de novo, nada guardado', e.chamadas.length === 6)
  e.solta('pointerdown', { target: 'dentro' })
  e.m.render()
  checa('clique dentro não fecha', Boolean(e.painel()))
  e.solta('pointerdown', { target: 'botao' })
  e.m.render()
  checa('clique no próprio botão fica com o botão', Boolean(e.painel()))
  e.solta('pointerdown', { target: 'fora' })
  e.m.render()
  checa('clique fora fecha', !e.painel())
  for (let n = 0; n < 5; n++) await tique()
  e.m.render()
  checa('resposta atrasada de caixa fechada não reabre nem desenha', !e.painel() && e.m.laco === false)
  e.botao().props.onClick()
  e.m.render()
  for (let n = 0; n < 5; n++) await tique()
  e.m.render()
  const link = e.links().at(-1)
  link?.props.onClick?.()
  e.m.render()
  checa('escolher uma linha fecha a caixa', !e.painel())
  // KINEO-PRESENTE-CONECTOR-0911 — cada clique conta a linha certa, uma vez.
  checa('clique numa linha: um evento, com a linha', e.eventos.length === 1 && e.eventos[0].nome === R.CAIXA_CLIQUE_EVENTO && e.eventos[0].meta?.entry === 'afiliado' && e.eventos[0].meta?.visitor === false)
  e.botao().props.onClick()
  e.m.render()
  for (let n = 0; n < 5; n++) await tique()
  e.m.render()
  e.links().find((l) => l.props['data-kineo'] === 'caixa-presente-chatgpt')?.props.onClick?.()
  checa('clique no ChatGPT: o evento diz chatgpt', e.eventos.length === 2 && e.eventos[1].meta?.entry === 'chatgpt')

  // Conta de país sem grátis, na tela de verdade, e leitura que falha, na tela de verdade.
  const r = montar({ [R.CAIXA_CREDITS_API]: corpoCredits(regiao), [O.ANNUAL_WELCOME_API]: { nowMs: T0, offer: null, endsAtMs: null }, [R.CAIXA_KLING4_API]: semAssinatura })
  r.m.render()
  r.botao().props.onClick()
  r.m.render()
  for (let n = 0; n < 5; n++) await tique()
  r.m.render()
  checa('tela: region_paid_only vê só o conector e o afiliado', r.links().map((l) => l.props.href).join() === '/kineo-in-claude?utm_source=gift_box,/kineo-in-claude?tab=chatgpt&utm_source=gift_box,/affiliate')
  const f = montar({})
  f.m.render()
  f.botao().props.onClick()
  f.m.render()
  for (let n = 0; n < 5; n++) await tique()
  f.m.render()
  checa('tela: tudo falhou, o conector e o afiliado ficam e o aviso de leitura sai', f.links().map((l) => l.props.href).join() === '/kineo-in-claude?utm_source=gift_box,/kineo-in-claude?tab=chatgpt&utm_source=gift_box,/affiliate' && !nodes(f.m.arvore).some((n) => n.props?.role === 'status'))

  // ─── A costura e o que não pode existir ──────────────────────────────────────────────────────────────────────────────────────
  const semComentario = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '')
  checa('shell: só para quem está logado', fonte(F.shell).includes('presente={isLoggedIn ? <CaixaDePresente0511 /> : null'))
  checa('barra de cima: o presente vem antes do chip de créditos', /\{presente\}\s*(?:\{\/\*[\s\S]*?\*\/\}\s*)*<CreditsBadge/.test(fonte(F.topo)))
  checa('marcado no código', ['regra', 'comp', 'shell', 'topo'].every((k) => fonte(F[k]).includes('KINEO-CAIXA-PRESENTE-0511')))
  const compCodigo = semComentario(fonte(F.comp))
  checa('sem bolinha, sem animação, sem guardar no navegador', !/animate-|\bpulse\b|ping|badge|localStorage|sessionStorage|trackEvent/i.test(compCodigo))
  const regraCodigo = semComentario(fonte(F.regra))
  checa('nenhum percentual digitado na regra', !/\d+\s*%/.test(regraCodigo))
  checa('nenhum percentual digitado no componente', !/\d+\s*%/.test(compCodigo))
  checa('a régua do filme é a do Studio', regraCodigo.includes('filmeGratisNaCaixa(l.credits)'))

  // ─── KINEO-PRESENTE-CONECTOR-0911: Kineo dentro do Claude e do ChatGPT ───────────────────────────────────────────────────────
  const { GENERATE_IN_CLAUDE_PATH } = load('lib/generateInClaude.ts')
  const conector = (linhas) => linhas.filter((l) => l.id === 'claude' || l.id === 'chatgpt')
  const claude = soAfiliado.find((l) => l.id === 'claude')
  const chatgpt = soAfiliado.find((l) => l.id === 'chatgpt')
  const destino = (l) => { const u = new URL(l?.href ?? 'x:', 'https://www.usekineo.com'); return { path: u.pathname, tab: u.searchParams.get('tab'), utm: u.searchParams.get('utm_source') } }
  checa('conector: a linha do Claude abre /kineo-in-claude na aba do Claude', GENERATE_IN_CLAUDE_PATH === '/kineo-in-claude' && destino(claude).path === GENERATE_IN_CLAUDE_PATH && destino(claude).tab === null && destino(claude).utm === 'gift_box')
  checa('conector: a linha do ChatGPT abre /kineo-in-claude?tab=chatgpt', destino(chatgpt).path === GENERATE_IN_CLAUDE_PATH && destino(chatgpt).tab === 'chatgpt' && destino(chatgpt).utm === 'gift_box')
  checa('conector: os textos combinados', claude?.titulo === 'Kineo inside Claude' && chatgpt?.titulo === 'Kineo inside ChatGPT' && claude?.acao === 'Use now' && chatgpt?.acao === 'Use now' && /Claude/.test(claude?.detalhe ?? '') && /ChatGPT/.test(chatgpt?.detalhe ?? ''))
  const textoConector = conector(soAfiliado).flatMap((l) => [l.titulo, l.detalhe ?? '', l.acao ?? '']).join(' ')
  checa('conector: sem preço, número ou percentual', !/[$€£%]|\d/.test(textoConector))
  checa('conector: nada de grátis, ilimitado, desconto ou presente de crédito', !/\b(free|unlimited|discount|off|bonus|gift|trial)\b/i.test(textoConector))
  checa('conector: nenhum nome de motor', !/kling|seedance|veo|minimax|hailuo|omni|sora|runway|pixverse|\bwan\b|luma|\bh3\b|kineo 1|nano banana|lyria/i.test(textoConector))
  checa('conector: diz que o filme gasta os créditos da conta', conector(soAfiliado).every((l) => /with your credits/.test(l.detalhe ?? '')))
  checa('conector: sem relógio e sem modal de cadastro', conector(soAfiliado).every((l) => l.venceEmMs === undefined && l.modal === undefined))
  for (const [nome, leituras] of Object.entries({ 'conta em teste': { credits: creditsTeste }, 'conta que pagou': { credits: { ...creditsTeste, hasPaid: true } }, 'país sem grátis': { credits: corpoCredits(regiao) }, 'tudo cheio': lidas })) {
    checa(`conector: ${nome} vê as duas linhas, antes do afiliado`, ids(R.linhasDaCaixa({ ...R.CAIXA_SEM_LEITURA, ...leituras }, T0)).endsWith('claude,chatgpt,afiliado'))
  }
  checa('conector: o visitante também vê (a página é pública)', ids(R.linhasDoVisitante(false)) === 'claude,chatgpt,afiliado' && ids(R.linhasDoVisitante(true)) === 'filme,claude,chatgpt,afiliado')
  const dic = JSON.parse(fonte(F.traducao))
  for (const lingua of ['es', 'pt', 'fr', 'de']) {
    const faltam = conector(soAfiliado).flatMap((l) => [l.titulo, l.detalhe, l.acao]).filter((s) => typeof dic[lingua]?.[s] !== 'string' || !dic[lingua][s].trim())
    checa(`conector: traduzido em ${lingua}`, faltam.length === 0)
    const traducoes = conector(soAfiliado).flatMap((l) => [dic[lingua]?.[l.titulo], dic[lingua]?.[l.detalhe]]).join(' ')
    checa(`conector: ${lingua} mantém Claude e ChatGPT por extenso e sem número`, /Claude/.test(traducoes) && /ChatGPT/.test(traducoes) && !/[$€£%]|\d/.test(traducoes))
  }
  checa('conector: o componente desenha o botão da linha', fonte(F.comp).includes('<UiLabel>{linha.acao}</UiLabel>'))
  return p
}

// ─── Mutantes ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const troca = (rel, de, para) => { if (!SRC[rel].includes(de)) throw new Error(`mutante não encaixa em ${rel}: ${de}`); return { [rel]: SRC[rel].replace(de, para) } }
const MUTANTES = {
  'país sem grátis vê filme grátis (saldo + 0 filmes bastam)': troca(F.regra, 'if (filmeGratisNaCaixa(l.credits))', "if (objeto(l.credits)?.filmsDelivered === 0)"),
  'janela vencida mostra 50%': troca(F.regra, 'if (faltaMs <= 0 || faltaMs > ANNUAL_WELCOME_WINDOW_MS + FOLGA_DE_RELOGIO_MS) return null', ''),
  'janela vence com a caixa aberta e a linha fica': troca(F.regra, 'agoraMs < linha.venceEmMs', 'true'),
  'rede antes do clique': troca(F.comp, '  useEffect(() => () => pedidoRef.current?.abort(), [])', '  useEffect(() => { void lerCaixa(fetch) }, [])\n  useEffect(() => () => pedidoRef.current?.abort(), [])'),
  'laço de render: estado mexido em efeito sem dependência': troca(F.comp, '  useEffect(() => () => pedidoRef.current?.abort(), [])', '  useEffect(() => { setLinhas([]) })\n  useEffect(() => () => pedidoRef.current?.abort(), [])'),
  'abre sozinho': troca(F.comp, 'const [aberta, setAberta] = useState(false)', 'const [aberta, setAberta] = useState(true)'),
  'Kling 4 para qualquer um com a oferta pública no ar': troca(F.regra, 'kling4PromoZeroCredits(l.kling4, KLING4_SEGUNDOS_DA_LEITURA, agoraMs)', '(objeto(l.kling4)?.publicOfferLive === true)'),
  'Black Friday acende a linha das 3 h': troca(F.regra, "a.offer === 'welcome_3h' ? faltaDaJanela", 'a.offer ? faltaDaJanela'), // KINEO-MENSAL-3H-0911 — a régua mudou de forma, o mutante é o mesmo
  'anual sem a leitura da conta': troca(F.regra, 'if (!c || c.entitlementsResolved !== true || c.hasPaid !== false) return null', ''),
  'afiliado some quando a leitura falha': troca(F.regra, "linhas.push({ id: 'afiliado',", "if (l.credits) linhas.push({ id: 'afiliado',"),
  'comissão digitada à mão': { ...troca(F.regra, '`Earn ${AFFILIATE_COMMISSION_PCT}`', "'Earn 30%'"), ...troca(F.afiliado, 'AFFILIATE_COMMISSION_RATE = 0.3', 'AFFILIATE_COMMISSION_RATE = 0.25') },
  'leitura ignora 500 e usa o corpo': troca(F.regra, 'return resposta.ok ? await resposta.json() : null', 'return await resposta.json()'),
  'relógio torto do servidor esconde o Kling 4': troca(F.regra, '.then((corpo) => rebaseKling4Lease(corpo, Date.now()))', ''),
  'o relógio vence e a caixa não tira a linha': troca(F.comp, 'aoVencer={tirarVencidas}', 'aoVencer={() => {}}'),
  'o relógio não avisa quando vence': troca(F.comp, 'if (t >= venceEmMs) {', 'if (false) {'),
  'Esc não fecha': troca(F.comp, "if (evento.key === 'Escape') fechar(true)", ''),
  'clique fora não fecha': troca(F.comp, "      fechar(false)\n    }\n    const tecla", "    }\n    const tecla"),
  'Esc não devolve o foco': troca(F.comp, "if (evento.key === 'Escape') fechar(true)", "if (evento.key === 'Escape') fechar(false)"),
  'caixa aberta guarda a leitura antiga': troca(F.comp, 'void lerCaixa(fetch, pedido.signal).then', "if (linhas.length > 1) return\n    void lerCaixa(fetch, pedido.signal).then"),
  'resposta atrasada ignora o fechamento': troca(F.comp, 'if (pedidoRef.current !== pedido) return', 'setAberta(true)'),
  'visitante sem login vê a caixa': troca(F.shell, 'presente={isLoggedIn ? <CaixaDePresente0511 /> : null', 'presente={true ? <CaixaDePresente0511 /> : null'),
  'bolinha piscando': troca(F.comp, 'className="appearance-icon"', 'className="appearance-icon animate-pulse"'),
  'linha do filme sem a régua do Studio': troca(F.filme, "if (d.filmsDelivered !== 0) return false", ''),
  // KINEO-PRESENTE-CONECTOR-0911
  'conector some da caixa': troca(F.regra, '  linhas.push(...LINHAS_DO_CONECTOR) // KINEO-PRESENTE-CONECTOR-0911\n', ''),
  'conector só para quem tem leitura da conta': troca(F.regra, '  linhas.push(...LINHAS_DO_CONECTOR)', '  if (objeto(l.credits)) linhas.push(...LINHAS_DO_CONECTOR)'),
  'ChatGPT abre a aba do Claude': troca(F.regra, '?tab=chatgpt&utm_source=', '?utm_source='),
  'conector sem o carimbo gift_box': troca(F.regra, "export const CAIXA_UTM = 'gift_box'", "export const CAIXA_UTM = 'claude'"),
  'conector promete grátis': troca(F.regra, "detalhe: 'Ask Claude for a film. Kineo makes it in your account, with your credits.'", "detalhe: 'Ask Claude for a free film, made in your Kineo account.'"),
  'conector com preço': troca(F.regra, "titulo: 'Kineo inside ChatGPT'", "titulo: 'Kineo inside ChatGPT · from 5 credits'"),
  'conector com nome de motor': troca(F.regra, "titulo: 'Kineo inside Claude'", "titulo: 'Kineo inside Claude (Seedance)'"),
  'conector sem o botão Use now': troca(F.comp, '<UiLabel>{linha.acao}</UiLabel> ', ''),
  'clique sem evento': troca(F.comp, '                    void trackClosedEvent(CAIXA_CLIQUE_EVENTO, { entry: linha.id, visitor: visitante })', '                    void 0'),
  'evento com a linha errada': troca(F.comp, '{ entry: linha.id, visitor: visitante }', "{ entry: 'gift_box', visitor: visitante }"),
  'evento ao abrir a caixa': troca(F.comp, '    setAberta(true)\n    setLendo(true)', "    void trackClosedEvent(CAIXA_CLIQUE_EVENTO, { entry: 'open' })\n    setAberta(true)\n    setLendo(true)"),
  'tradução em português some': troca(F.traducao, '"Kineo inside Claude": "Kineo dentro do Claude",', '"Kineo inside Claude (old)": "Kineo dentro do Claude",'),
}

let falhou = false
const base = await problemas()
if (base.length) { falhou = true; console.log('FALHA na fonte real:'); for (const n of base) console.log('  ' + n) } else console.log('ok  a fonte real passa em tudo')
for (const [nome, mut] of Object.entries(MUTANTES)) {
  let vermelhas
  try { vermelhas = await problemas(mut) } catch (err) { vermelhas = ['estourou: ' + String(err?.message ?? err).slice(0, 120)] }
  if (vermelhas.length === 0) { falhou = true; console.log(`FALHA mutante passou: ${nome}`) } else console.log(`ok  mutante vermelho (${vermelhas.length}): ${nome} → ${vermelhas[0]}`)
}
if (falhou) process.exit(1)
console.log(`\nok  ${Object.keys(MUTANTES).length} mutantes vermelhos, fonte real verde`)
