// KINEO-FLUXO2-0411 [fundador 04/11 ~22h: "recomendações" — "a tarefa mais importante do dia"]
// Guardião sem rede do fluxo de quem compra. Executa a tela de verdade pelo suporte de hooks dos outros guardiões, as regras puras reais, e cada regra tem mutante.
import fs from 'node:fs'
import { runEscolhaUiProof } from './test-support/ads-escolha-ui-2310.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const UI = 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx'
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(f, 'utf8'))
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }

const ID = '00000000-0000-4000-8000-000000000001'
const STILLS = [1, 2, 3, 4].map((n) => ({ id: `s${n}`, url: `https://offline.invalid/${n}.png` }))
const VAZIO = { foto: '', frase: '', oferta: '', beneficios: '', cta: '', language: 'en', formato: 'product', voice_mode: 'narrated', rota: '', presenter_id: 'amara', category: '', scenario_id: '' }
const CHEIO = { ...VAZIO, foto: 'https://offline.invalid/p.jpg', frase: 'Glow cream', category: 'skincare', scenario_id: 'skincare_bathroom' }
const SALVO = (extra = {}) => ({ version: 'KINEO-ADS-ESCOLHA-2310', form: CHEIO, order_id: ID, stage: 'planned', stills: [], still_id: '', narration_used: 'Fala.', quality_notes: [{ message: 'nota interna' }], credits: 41, ...extra })

/** As provas de tela. Devolve o que está errado (vazia = passou); os mutantes rodam a mesma prova. */
async function provaDaTela(mutar = {}) {
  const erros = []
  const exige = (c, m) => { if (!c) erros.push(m) }
  await runEscolhaUiProof({ current: true, source: (text, file) => (mutar[file] ? mutar[file](lf(text)) : text), scenario: async ({ client, nodeText }) => {
    const textos = (u) => u.nodes().map(nodeText).join(' ')
    const kineo = (u, k) => u.nodes().find((n) => n.props?.['data-kineo'] === k)
    // ── A: pedido salvo → a linha do anúncio em andamento
    const novo = client({ lang: 'en', internalControls: false, form: VAZIO }); novo.render()
    exige(!kineo(novo, 'ads-em-andamento'), 'A sem pedido não há linha de andamento')
    let pediu = 0
    const volta = client({ lang: 'en', internalControls: false, form: VAZIO, saved: SALVO(), onAskStartOver: () => { pediu++ } }); volta.render(); await volta.settle()
    const linha = kineo(volta, 'ads-em-andamento')
    exige(!!linha && /This is your ad in progress/.test(nodeText(linha)) && /Continue this ad/.test(nodeText(linha)) && /Start a new ad/.test(nodeText(linha)), 'A a linha diz que é o anúncio dela, com as duas saídas')
    exige(!/Choices locked|View order/.test(textos(volta)), 'A sem "Choices locked · View order"')
    exige(volta.nodes().some((n) => n.props?.id === 'ace-passo-atual'), 'A o passo atual tem o alvo do Continuar')
    kineo(volta, 'ads-continuar')?.props.onClick(); volta.render()
    exige(volta.requests.length === 0 && volta.states[2] === ID, 'A Continuar não chama o servidor nem larga o pedido')
    kineo(volta, 'ads-novo-anuncio')?.props.onClick(); volta.render()
    exige(pediu === 1 && volta.states[2] === ID && volta.requests.length === 0, 'A Começar um novo pede a confirmação de sempre e não apaga nada antes dela')
    const es = client({ lang: 'es', internalControls: false, form: VAZIO, saved: SALVO() }); es.render(); await es.settle()
    exige(/Este es tu anuncio en curso/.test(nodeText(kineo(es, 'ads-em-andamento') ?? '')), 'A a linha nasce em espanhol')
    const pt = client({ lang: 'pt', internalControls: false, form: VAZIO, saved: SALVO() }); pt.render(); await pt.settle()
    exige(/Este é o seu anúncio em andamento/.test(nodeText(kineo(pt, 'ads-em-andamento') ?? '')), 'A a linha nasce em português')
    const link = client({ lang: 'en', internalControls: false, form: VAZIO, query: `?order=${ID}` }); link.render()
    exige(!!kineo(link, 'ads-em-andamento') && link.nodes().some((n) => n.props?.id === 'ace-passo-atual'), 'A pedido aberto por link também tem a linha e o alvo')
    await provasExtras({ client, nodeText, exige, textos, kineo })
  } })
  return erros
}
// As provas dos outros itens entram aqui.
async function provasExtras(h) { await provaB(h); await provaC(h); await provaE(h) }

// ── E: a primeira prévia não mostra marca de ninguém
const COM_ROTULO = ['sofia', 'amara'] // os dois retratos com frasco e rótulo legível, conferidos a olho em 04/11
async function provaE({ client, nodeText, exige, kineo }) {
  const u = client({ lang: 'en', internalControls: false, form: null }); u.render()
  exige(!COM_ROTULO.includes(u.states[0].presenter_id), 'E a pessoa de fábrica não é um retrato com rótulo')
  const portrait = u.nodes().find((n) => n.type === 'img' && n.props.className === 'ace-stage-portrait')
  exige(!!portrait && !COM_ROTULO.some((p) => portrait.props.src.includes(p)), 'E a prévia de fábrica mostra um retrato sem rótulo')
  exige(/Jade/.test(nodeText(kineo(u, 'ads-pessoa-cena'))), 'E a linha nomeia a pessoa da prévia')
  const lista = u.nodes().filter((n) => n.props?.name === 'ace-person').map((n) => n.props.value)
  exige(lista[0] === 'sofia' && lista.includes('jade'), 'E o catálogo e a ordem da lista não mudaram')
  const escolheu = client({ lang: 'en', internalControls: false, form: null }); escolheu.render()
  escolheu.nodes().find((n) => n.props?.name === 'ace-person' && n.props.value === 'sofia').props.onChange(); escolheu.render()
  exige(escolheu.states[0].presenter_id === 'sofia' && escolheu.nodes().some((n) => n.type === 'img' && n.props.className === 'ace-stage-portrait' && n.props.src.includes('sofia')), 'E quem escolhe Sofia vê a Sofia')
}

// ── C: a tela fala a língua de quem compra
async function provaC({ client, exige, textos }) {
  const cliente = client({ lang: 'en', internalControls: false, form: VAZIO, saved: SALVO({ stage: 'choose', stills: STILLS, still_id: 's1' }) }); cliente.render(); await cliente.settle()
  const tudo = textos(cliente)
  exige(/Your voiceover/.test(tudo) && !/The narration that will be used/.test(tudo), 'C "Your voiceover" no lugar de "The narration that will be used"')
  exige(!/Review notes/.test(tudo) && !/nota interna/.test(tudo), 'C cliente não vê as notas de revisão')
  exige(!/\bstills?\b/i.test(tudo.replace(/Still needed/g, '')), 'C sem a palavra "still" para o cliente')
  exige(!/provider|visual direction|previous flow|another plan|new plan|Sequential shots/i.test(tudo), 'C sem jargão de bastidor')
  const pt = client({ lang: 'pt', internalControls: false, form: VAZIO, saved: SALVO() }); pt.render(); await pt.settle()
  exige(/Sua narração/.test(textos(pt)) && !/A fala que será usada/.test(textos(pt)), 'C "Sua narração" em português')
  const es = client({ lang: 'es', internalControls: false, form: VAZIO, saved: SALVO() }); es.render(); await es.settle()
  exige(/Tu narración/.test(textos(es)), 'C "Tu narración" em espanhol')
  const casa = client({ lang: 'en', internalControls: true, form: VAZIO, saved: SALVO() }); casa.render(); await casa.settle()
  exige(/Review notes/.test(textos(casa)) && /nota interna/.test(textos(casa)), 'C a casa continua vendo as notas de revisão')
}

// ── B: a promoção do Kling 4 sai do formulário; a linha no botão final diz a verdade para quem ela vale
const lease = (reason, promoAvailable = reason === 'ok') => ({ paidLive: true, promoLive: true, promoAvailable, publicOfferLive: true, reason, checkedAt: new Date(Date.now() - 1000).toISOString(), validUntil: new Date(Date.now() + 10000).toISOString(), expiresAt: null, remainingToday: 3 })
const ESCOLHA = (extra = {}) => SALVO({ stage: 'choose', stills: STILLS, still_id: 's1', engine_used: 'kling4', ...extra })
async function provaB({ client, nodeText, exige, textos, kineo }) {
  const botao = (u) => u.nodes().find((n) => n.type === 'button' && /Generate video with this/.test(nodeText(n)))
  const tela = async (availability, saved = ESCOLHA(), extra = {}) => { const u = client({ lang: 'en', internalControls: false, form: VAZIO, saved, availability, ...extra }); u.render(); await u.settle(); return u }
  const linha = (u) => { const n = kineo(u, 'ads-kling4-linha'); return n ? nodeText(n) : null }
  const assinante = await tela(lease('ok'))
  exige(/Included in your Kling 4.0 promotion · 0 credits/.test(linha(assinante) ?? ''), 'B assinante com cota: a linha diz incluído')
  exige(/· 0 credits/.test(nodeText(botao(assinante) ?? '')), 'B assinante com cota: o botão diz 0 créditos')
  assinante.responses.push([202, { order_id: ID, status: 'generating', stage: 'chosen' }])
  await assinante.click('Generate video with this')
  exige(assinante.requests.at(-1)?.body?.kling4_expect_promo === true, 'B assinante com cota: o pedido confirma a promoção')
  const fora = await tela(lease('not_subscribed'))
  exige(linha(fora) === null && /· 41 credits/.test(nodeText(botao(fora) ?? '')), 'B quem não assina: sem linha, preço no botão')
  const semPlano = await tela(lease('plan_not_included'))
  exige(linha(semPlano) === null, 'B plano fora da promoção: sem linha')
  const usada = await tela(lease('daily_limit'))
  exige(/used up: this video uses 41 credits/.test(linha(usada) ?? '') && /· 41 credits/.test(nodeText(botao(usada) ?? '')), 'B cota do dia usada: a linha diz que usa créditos, com o número do botão')
  const proprio = await tela(lease('daily_limit'), ESCOLHA({ kling4_promo: { free: true, reason: 'ok' } }))
  exige(/Included/.test(linha(proprio) ?? '') && /· 0 credits/.test(nodeText(botao(proprio) ?? '')), 'B a reserva deste pedido manda: a 3ª do dia segue incluída')
  proprio.responses.push([202, { order_id: ID, status: 'generating', stage: 'chosen' }])
  await proprio.click('Generate video with this')
  exige(proprio.requests.at(-1)?.body?.kling4_expect_promo === true, 'B a reserva deste pedido vai no pedido')
  const negado = await tela(lease('ok'), ESCOLHA({ kling4_promo: { free: false, reason: 'daily_cap' } }))
  exige(/used up/.test(linha(negado) ?? '') && /· 41 credits/.test(nodeText(botao(negado) ?? '')), 'B pedido sem reserva grátis: a leitura geral não promete de novo')
  negado.responses.push([202, { order_id: ID, status: 'generating', stage: 'chosen' }])
  await negado.click('Generate video with this')
  exige(negado.requests.at(-1)?.body?.kling4_expect_promo === false, 'B pedido sem reserva grátis: não pede promoção')
  const recusa = await tela(lease('ok'))
  recusa.responses.push([409, { error: 'kling4_promo_unavailable', credits: 45, reason: 'daily_cap' }])
  await recusa.click('Generate video with this')
  exige(recusa.states[9].includes('it uses 45 credits') && recusa.states[9].includes('Nothing was charged'), 'B recusa da promoção diz o preço, sem cobrar')
  exige(/used up/.test(linha(recusa) ?? '') && /· 45 credits/.test(nodeText(botao(recusa) ?? '')) && recusa.requests.length === 1, 'B depois da recusa o botão e a linha mudam, e nada parte sozinho')
  const antigo = await tela(lease('ok'), ESCOLHA({ engine_used: undefined }))
  exige(linha(antigo) === null && /· 41 credits/.test(nodeText(botao(antigo) ?? '')), 'B rascunho sem motor gravado: a linha não contradiz o botão')
  const amostra = await tela(lease('ok'), ESCOLHA({ sample: true }))
  exige(linha(amostra) === null, 'B amostra grátis: sem linha')
  const form = client({ lang: 'en', internalControls: false, form: VAZIO, availability: lease('ok') }); form.render()
  exige(linha(form) === null && !/Kling 4\.0 free for 30 days/.test(textos(form)), 'B o formulário não fala da promoção')
  const pt = await tela(lease('ok'), ESCOLHA(), { lang: 'pt' })
  exige(/Incluído na sua promoção/.test(linha(pt) ?? ''), 'B a linha em português')
  const es = await tela(lease('daily_cap'), ESCOLHA(), { lang: 'es' })
  exige(/La cuota gratis de hoy/.test(linha(es) ?? ''), 'B a linha em espanhol')
}

const erros = await provaDaTela()
for (const e of erros) checa(e, false)
checa('A a tela de verdade passa nas provas', erros.length === 0)

const simples = ler('app/(dashboard)/ads/v2/AdsV2Simple.tsx'), cliente = ler('app/(dashboard)/ads/v2/AdsV2Client.tsx')
checa('A a sessão entrega a confirmação à tela', simples.includes('<AdsV2Escolha onAskStartOver={props.onAskStartOver}'))
checa('A o invólucro liga a sessão simples ao Start over de sempre', /<AdsV2SimpleSession[\s\S]{0,900}onAskStartOver=\{\(\) => setConfirmingReset\(true\)\}/.test(cliente))
checa('A o servidor não mudou: Start over segue sendo a remontagem da sessão', cliente.includes('setSession((s) => s + 1)') && cliente.includes('onClick={startOver}'))

// ── B: a regra pura e a fiação
const P = createOfflineLoader()('lib/kling4PaidPresentation.ts')
for (const [reason, esperado] of [['ok', 'included'], ['daily_limit', 'used_up'], ['daily_cap', 'used_up'], ['unavailable', 'unconfirmed'], ['subscription_unverified', 'unconfirmed'], ['not_subscribed', null], ['plan_not_included', null], ['expired', null], ['promo_off', null]]) {
  checa(`B kling4AdLine com ${reason} = ${esperado}`, P.kling4AdLine(lease(reason), null) === esperado)
}
checa('B leitura vencida ou ausente não promete nada', P.kling4AdLine({ ...lease('ok'), validUntil: new Date(Date.now() - 1).toISOString() }, null) === null && P.kling4AdLine(null, null) === null)
checa('B o que o pedido gravou vence a leitura geral', P.kling4AdLine(lease('daily_limit'), { free: true, reason: 'ok' }) === 'included' && P.kling4AdLine(lease('ok'), { free: false, reason: 'not_subscribed' }) === null)
const fonteUI = ler(UI)
checa('B o cartão saiu da tela', !fonteUI.includes('Kling4PaidNotice surface') && !fonteUI.includes('import Kling4PaidNotice'))
checa('B a linha mora no bloco do botão final', fonteUI.indexOf('data-kineo="ads-kling4-linha"') > fonteUI.indexOf("void run('render')"))
checa('B o servidor entrega a decisão do pedido', ler('lib/ads/cena/escolhaStills.ts').includes('kling4_promo: { free: promoDoPedido.free') && ler('lib/ads/cena/internalEscolha.ts').includes('stored.kling4Promo = { free: promo.isFree, reason: promo.reason }'))

// ── C: a tabela de recusas, nas três línguas
const R = createOfflineLoader()('lib/ads/eligibilityPure.ts')
for (const lang of ['en', 'pt', 'es']) {
  const frases = ['cena_photo_daily_limit', 'cena_photo_round_limit', 'cena_stills_busy', 'cena_still_choice_required', 'cena_choice_locked', 'cena_choice_plan_required', 'order_not_found', 'not_editable', 'escolha_spoken_core_exceeds_15s', 'plan_failed'].map((c) => R.adsV2RefusalFor(c, lang)?.message ?? '')
  checa(`C recusas em ${lang}: todas com frase`, frases.every(Boolean))
  checa(`C recusas em ${lang}: sem "still", fluxo nem plano interno`, !frases.some((f) => /\bstills?\b|\bflujo\b|\bfluxo\b|previous flow|outro plano|plano novo|another plan|new plan|otro plan\b|plan nuevo/i.test(f)))
}

checa('E o retrato da pessoa de fábrica existe', fs.existsSync('public/ads/presenters/jade.webp'))

// ── F: o que é falso sobre "pessoa falando" e a cláusula de país
const FALSO = /talking about (it|the product)|talks about the product|lip-synced voice|(?<!voiceover )tells why to buy\.|says the voice-over/i
const carregar = createOfflineLoader()
for (const f of ['lib/growth/businessPitch.ts']) {
  const pitch = carregar(f)
  const texto = JSON.stringify(pitch.BUSINESS_PITCH ?? pitch)
  checa('F o resumo de vendas do Business fala em narração, não em fala', !FALSO.test(texto))
}
for (const f of ['lib/kineoFacts.ts', 'lib/growth/businessPitch.ts', 'lib/comparisons.ts', 'lib/seo/paginasUgc2010.ts', 'app/agencies/page.tsx', 'app/ads/page.tsx', 'app/claude-connector/ShowcaseGrid.tsx', 'lib/growth/paginasUgc2010Content.ts']) {
  checa(`F ${f} sem a promessa de pessoa falando`, !FALSO.test(ler(f).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')))
}
checa('F páginas em português sem voz sincronizada', !/voz sincronizada/.test(ler('lib/growth/paginasUgc2010Content.ts')))
const linha = carregar('lib/ui/homeCardLinha0411.ts'), copia = JSON.parse(ler('lib/ui/refinementCopy.json'))
checa('F o card UGC diz narração', /voiceover/.test(linha.homeCardLinha('ugc_ads')) && !FALSO.test(linha.homeCardLinha('ugc_ads')))
checa('F os outros cards seguem iguais', linha.homeCardLinha('films') === carregar('lib/ui/homeThreeCards.ts').HOME_CARD_COPY.films.line && linha.homeCardLinha('product_ads') === carregar('lib/ui/homeThreeCards.ts').HOME_CARD_COPY.product_ads.line)
checa('F a frase do card existe nas 16 línguas', Object.keys(copia).length === 16 && Object.values(copia).every((t) => typeof t[linha.HOME_CARD_LINHA_UGC] === 'string' && t[linha.HOME_CARD_LINHA_UGC].length > 10))
checa('F o card usa a frase nova', ler('components/home/HomeThreeCards.tsx').includes('{copy(homeCardLinha(card))}'))
const modal = ler('components/AuthModal.tsx')
checa('F login: o crédito grátis leva a cláusula de país, como a barra lateral', modal.includes('credits${GRANT_COUNTRY_CLAUSE}`}') && ler('components/Sidebar.tsx').includes('free credits${GRANT_COUNTRY_CLAUSE}`}'))
checa('F a régua que torna a cláusula necessária segue valendo', carregar('lib/freeFilmPolicy.ts').filmeGratisPermitido('IN') === false)
checa('F o motivo segue valendo: o público recebe narração', ler(UI).includes("...(!internalControls || sampleMode ? { voice_mode: 'narrated' } : {})") && ler('lib/ads/cena/internalEscolha.ts').includes("...(!internal || sampleMode ? { voice_mode: 'narrated' } : {})"))
const mutF = (src) => FALSO.test(src)
checa('F mutante: a frase velha de volta seria percebida', mutF("extras.push('an optional AI person holding the product and talking about it')") && mutF('An AI person holds your product and tells why to buy.'))

const MUTANTES = [
  ['E Sofia de volta como fábrica', (t) => t.replace("const PESSOA_PADRAO = 'jade'", 'const PESSOA_PADRAO = CENA_ESCOLHA_PRESENTERS[0].id'), /retrato com rótulo|retrato sem rótulo/],
  ['E Amara como fábrica', (t) => t.replace("const PESSOA_PADRAO = 'jade'", "const PESSOA_PADRAO = 'amara'"), /retrato com rótulo/],
  ['C notas de revisão para o cliente', (t) => t.replace('{internalControls && notes.length ?', '{notes.length ?'), /notas de revisão/],
  ['C título técnico de volta', (t) => t.replace("t3('Sua narração', 'Your voiceover', 'Tu narración')", "'The narration that will be used'"), /Your voiceover/],
  ['C still de volta', (t) => t.replace("t('Gerar vídeo com esta foto', 'Generate video with this photo')", "t('Gerar vídeo com esta foto', 'Generate video with this still')"), /palavra "still"/],
  ['C plano interno de volta', (t) => t.replace("t3('Começar outro anúncio', 'Start another ad', 'Empezar otro anuncio')", "'Start another plan'"), /jargão/],
  ['B cartão de volta no formulário', (t) => t.replace('{bfCampaign && !orderId ? <section', '{!orderId ? <p>Kling 4.0 free for 30 days</p> : null}{bfCampaign && !orderId ? <section'), /não fala da promoção/],
  ['B linha para todo mundo', (t) => t.replace("const linhaKling4 = linhaBruta === 'included' && !promoZero ? null : linhaBruta", "const linhaKling4 = 'included' as 'included' | 'used_up' | 'unconfirmed' | null"), /quem não assina|amostra grátis|formulário/],
  ['B a leitura geral vence o pedido', (t) => t.replace('const promoZero = orderPromo ? orderPromo.free : ', 'const promoZero = '), /reserva deste pedido|não promete de novo/],
  ['B promessa vai fixa do que a leitura diz', (t) => t.replace("route === 'kling4' && promoZero, kling4_expected_engine", "route === 'kling4' && kling4PromoZeroCredits(kling4Availability, 15), kling4_expected_engine"), /reserva deste pedido|não pede promoção/],
  ['B recusa volta a ser erro genérico', (t) => t.replace("if (code === 'kling4_promo_unavailable') return", "if (code === 'kling4_promo_unavailable_off') return"), /diz o preço/],
  ['B recusa não muda o botão', (t) => t.replace("else if (data.error === 'kling4_promo_unavailable') setOrderPromo", "else if (data.error === 'off') setOrderPromo"), /botão e a linha mudam/],
  ['B linha contradiz o botão', (t) => t.replace("const linhaKling4 = linhaBruta === 'included' && !promoZero ? null : linhaBruta", 'const linhaKling4 = linhaBruta'), /não contradiz o botão/],
  ['B a tela esquece o motor ao recarregar', (t) => t.replace('setOrderEngine(saved.engine_used as Form', 'void (saved.engine_used as Form'), /assinante com cota/],
  ['B a tela esquece o pedido ao recarregar', (t) => t.replace("setOrderPromo(typeof saved.kling4_promo?.free === 'boolean'", "setOrderPromo(typeof saved.kling4_promo?.free === 'number'"), /reserva deste pedido/],
  ['A linha some', (t) => t.replace('{orderId ? <div className="ace-andamento"', '{false ? <div className="ace-andamento"'), /duas saídas/],
  ['A travado de volta', (t) => t.replace("t3('Este é o seu anúncio em andamento', 'This is your ad in progress', 'Este es tu anuncio en curso')", "'Choices locked'"), /Choices locked|duas saídas/],
  ['A novo anúncio apaga sem confirmar', (t) => t.replace('if (onAskStartOver) onAskStartOver(); else reset()', 'reset()'), /confirmação de sempre/],
  ['A continuar chama o servidor', (t) => t.replace('onClick={irAoPassoAtual}', "onClick={() => void run('stills')}"), /não chama o servidor/],
  ['A sem alvo do continuar', (t) => t.replaceAll('id="ace-passo-atual" tabIndex={-1}', ''), /alvo/],
]
const original = ler(UI)
for (const [nome, muta, esperado] of MUTANTES) {
  const mudou = muta(original) !== original
  let r = []
  try { r = await provaDaTela({ [UI]: muta }) } catch (e) { r = ['estourou: ' + e.message] }
  if (process.env.VER_MUTANTES) console.log('    ', nome, '=>', JSON.stringify(r).slice(0, 300))
  checa(`mutante "${nome}" fica vermelho`, mudou && r.some((m) => esperado.test(m)))
}

console.log(`\n${ok} ok, ${falhas} falha(s)`)
if (falhas) process.exit(1)
