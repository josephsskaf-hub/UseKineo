// KINEO-ADS-PRODUTO-PRIMEIRO-0411 [fundador 04/11: "esse fluxo que quero melhorar... pode mudar o fluxo ainda hoje"; "/ads tem que ter só o que o cara vai trabalhar"]
// Guardião sem rede da tela do anúncio: produto primeiro, pessoa e cenário já marcados, opcionais fechados, um clique para plano + fotos, preço só no botão final.
// Executa o componente de verdade pelo mesmo suporte de hooks dos outros guardiões (ads-escolha-ui-2310) e reprova mutantes.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { runEscolhaUiProof } from './test-support/ads-escolha-ui-2310.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const UI = 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx', NOTA9 = 'lib/ads/v2Nota9.ts', PLAN = 'lib/ads/cena/escolhaPlan.ts', SAMPLE = 'lib/ads/cena/escolhaSampleServer.ts', SIDEBAR = 'components/Sidebar.tsx'
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(f, 'utf8'))
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }

const ID = '00000000-0000-4000-8000-000000000001'
const STILLS = [1, 2, 3, 4].map((n) => ({ id: `s${n}`, url: `https://offline.invalid/${n}.png` }))
const VAZIO = { foto: '', frase: '', oferta: '', beneficios: '', cta: '', language: 'en', formato: 'product', voice_mode: 'narrated', rota: '', presenter_id: 'sofia', category: '', scenario_id: '' }
const CHEIO = { ...VAZIO, foto: 'https://offline.invalid/p.jpg', frase: 'Glow cream', category: 'skincare', scenario_id: 'skincare_bathroom' }

/** A prova de tela. Devolve a lista do que está errado (vazia = passou); mutantes rodam a mesma prova. */
async function provaDaTela(mutar = {}) {
  const erros = []
  const exige = (c, m) => { if (!c) erros.push(m) }
  await runEscolhaUiProof({ current: true, source: (text, file) => (mutar[file] ? mutar[file](text) : text), scenario: async ({ client, nodeText }) => {
    const textos = (u) => u.nodes().map(nodeText).join(' ')
    const botao = (u, r) => u.nodes().find((n) => n.type === 'button' && r.test(nodeText(n)))
    const kineo = (u, k) => u.nodes().find((n) => n.props?.['data-kineo'] === k)

    // ── A ordem: produto antes de tudo, sem o campo de URL da foto
    const u = client({ lang: 'en', internalControls: false, form: VAZIO, sampleAvailable: true }); u.render()
    const ordem = u.nodes().map((n) => n.props?.['data-kineo'] ?? (n.props?.name === 'ace-person' ? 'pessoa' : null)).filter(Boolean)
    exige(ordem.indexOf('ads-produto') >= 0 && ordem.indexOf('ads-produto') < ordem.indexOf('pessoa'), 'produto antes da pessoa')
    exige(ordem.indexOf('ads-escolha-link') > ordem.indexOf('ads-produto') && ordem.indexOf('ads-escolha-link') < ordem.indexOf('pessoa'), 'o link vem dentro do bloco do produto, antes da pessoa')
    exige(!/HTTPS URL|URL HTTPS/u.test(textos(u)), 'sem o campo de URL da foto')
    exige(!u.nodes().some((n) => n.type === 'input' && n.props.type === 'url' && 'value' in n.props && n.props.value === u.states[0].foto && n.props.placeholder === 'https://…'), 'nenhuma caixa edita form.foto')
    const painelMais = kineo(u, 'ads-mais-opcoes')
    exige(painelMais?.type === 'details' && !painelMais.props.open, 'mais opções fechado por padrão')
    const dentro = painelMais ? painelMais.props.children : null
    const rotulos = nodeText(dentro)
    for (const r of ['Offer (optional)', 'Call to action (optional)', 'Benefits', 'Format', 'Speech language']) exige(rotulos.includes(r), `${r} mora em mais opções`)
    const cartaoProduto = kineo(u, 'ads-produto')
    exige(!nodeText((cartaoProduto.props.children ?? []).filter?.((c) => c?.props?.className === 'ace-fields')).includes('Offer'), 'a oferta não está aberta no bloco do produto')

    // ── O topo: amostra x completa, sem número de crédito
    const escolha = kineo(u, 'ads-amostra-ou-completa')
    const txtEscolha = escolha ? nodeText(escolha) : ''
    exige(txtEscolha.includes('Free sample · 8 s') && txtEscolha.includes('Full version · 15 s'), 'os dois rótulos do controle')
    exige(!/\d+\s*(credits|créditos)/u.test(txtEscolha) && !/\b41\b/.test(txtEscolha), 'sem número de crédito no controle')
    exige(!/YOUR CHOICE|your choice|Choose the scene/u.test(textos(u)), 'o cartão de marca saiu do topo')

    // ── Padrões reais do catálogo; prévia nunca vazia
    const real = client({ lang: 'en', internalControls: false, form: null }); real.render()
    exige(real.states[0].presenter_id === 'sofia' && real.states[0].category === '' && real.states[0].scenario_id === '', 'estado inicial real: pessoa marcada, categoria e cenário esperando a categoria')
    exige(/Sofia/.test(nodeText(kineo(real, 'ads-pessoa-cena'))), 'estado inicial real: a linha mostra a pessoa')
    const entradaUgc = client({ lang: 'en', internalControls: false, form: null }); entradaUgc.render()
    exige(!!entradaUgc.states[0].language, 'estado inicial real: língua da interface')
    const novo = client({ lang: 'en', internalControls: false, form: VAZIO }); novo.render()
    exige(!!kineo(novo, 'ads-pessoa-cena') && /Sofia/.test(nodeText(kineo(novo, 'ads-pessoa-cena'))) && /Change/.test(nodeText(kineo(novo, 'ads-pessoa-cena'))), 'linha compacta: pessoa + Trocar')
    exige(!novo.nodes().some((n) => n.props?.className === 'ace-stage-empty'), 'a prévia não é caixa vazia')
    exige(novo.nodes().some((n) => n.type === 'img' && n.props.className === 'ace-stage-portrait'), 'a prévia mostra a pessoa escolhida')
    exige(/Illustrative preview/.test(textos(novo)), 'o rótulo honesto da prévia fica')
    // trocar a categoria leva ao primeiro cenário real dela
    const sel = kineo(novo, 'ads-categoria').props.children.find?.((c) => c?.type === 'select')
    sel.props.onChange({ target: { value: 'perfume' } }); novo.render()
    exige(novo.states[0].category === 'perfume' && novo.states[0].scenario_id === 'perfume_vanity', 'a categoria marca o primeiro cenário dela')
    exige(/Golden vanity/.test(nodeText(kineo(novo, 'ads-pessoa-cena'))), 'a linha mostra o cenário marcado')

    // ── Um clique: plano e fotos, na ordem; sem vídeo
    const c = client({ lang: 'en', internalControls: false, form: { ...CHEIO, voice_mode: 'talking' } }); c.render()
    exige(c.requests.length === 0, 'nada sai sem clique')
    exige(!botao(c, /Confirm choices/), 'não existe mais o botão de confirmar')
    c.responses.push([201, { order_id: ID, stage: 'planned', narration_used: 'Fala.', credits: 41 }], [200, { order_id: ID, stage: 'choose', stills: STILLS, photo_round: 1, max_photo_rounds: 2 }])
    await c.click('Prepare four'); await c.settle()
    exige(c.requests.length === 2 && c.requests[0].body.stage === 'plan' && c.requests[1].body.stage === 'stills' && c.requests[1].body.order_id === ID, 'um clique = plano e depois fotos, com o pedido certo')
    exige(c.requests[0].body.voice_mode === 'narrated', 'cliente: narração forçada')
    exige(c.states[1] === 'choose' && !c.requests.some((r) => r.body?.stage === 'render'), 'para na escolha da foto: o vídeo espera a escolha')
    exige(c.states[5] === 'Fala.' && textos(c).includes('Fala.'), 'a fala segue visível antes do vídeo')
    // o preço está no botão final, e continua sendo o de sempre
    exige(/Generate video with this photo · 41 credits/.test(nodeText(botao(c, /Generate video with this photo/) ?? '')), 'preço no botão final')
    c.nodes().find((n) => n.type === 'input' && n.props.name === 'ace-still' && n.props.value === 's2')?.props.onChange(); c.render()
    exige(!c.requests.some((r) => r.body?.stage === 'render'), 'escolher a foto não gera')

    // ── Segunda chamada recusada: sem perder o pedido, com o botão de sempre
    const r = client({ lang: 'en', internalControls: false, form: CHEIO }); r.render()
    r.responses.push([201, { order_id: ID, stage: 'planned', credits: 41 }], [429, { error: 'cena_photo_daily_limit' }])
    await r.click('Prepare four'); await r.settle()
    exige(r.states[1] === 'planned' && r.states[2] === ID && r.states[9].includes('six photo requests'), 'cota do dia: fica no pedido, com a frase de sempre')
    exige(!!botao(r, /Prepare four photos/) && r.requests.length === 2, 'o botão manual volta, e nada tentou de novo sozinho')
    // plano sem pedido não encadeia
    const s = client({ lang: 'en', internalControls: false, form: CHEIO }); s.render()
    s.responses.push([400, { error: 'escolha_scenario_category_mismatch' }])
    await s.click('Prepare four'); await s.settle()
    exige(s.requests.length === 1 && s.states[1] === 'edit' && s.states[9].includes('another category'), 'recusa do plano não pede fotos')

    // ── Pedido retomado: nada parte sozinho
    const saved = { version: 'KINEO-ADS-ESCOLHA-2310', form: CHEIO, order_id: ID, stage: 'planned', stills: [], still_id: '', narration_used: 'x', quality_notes: [], credits: 41 }
    const v = client({ lang: 'en', internalControls: false, form: VAZIO, saved }); v.render(); await v.settle()
    exige(v.states[1] === 'planned' && v.requests.length === 0 && !!botao(v, /Prepare four photos/), 'pedido salvo em planned não pede fotos sozinho')
    // ── Pedido aberto por link: a pessoa nunca é o padrão
    const l = client({ lang: 'en', internalControls: false, form: VAZIO, query: `?order=${ID}` }); l.render()
    exige(l.states[0].presenter_id === '', 'pedido por link não mostra a pessoa padrão')

    // ── Preço some do resto da edição
    exige(!/41 credits/.test(textos(novo)), 'a tela de edição não mostra número de crédito')
  } })
  return erros
}

const erros = await provaDaTela()
for (const e of erros) checa(e, false)
checa('a tela de verdade passa em todas as provas', erros.length === 0)

// ── Visitante: botão alcançável sem foto, login antes de qualquer chamada
const fonte = ler(UI)
checa('visitante: o botão abre com texto ou link', fonte.includes('const canPlan = guest ? (!!linkUrl.trim() || !!form.frase.trim()) && !busy : https(form.foto)'))
checa('visitante: run pede login antes de tudo', fonte.indexOf('if (guest) return pedirLogin(action)') > 0 && fonte.indexOf('if (guest) return pedirLogin(action)') < fonte.indexOf("fetch('/api/ads/v2/cena'"))
checa('visitante: link e foto seguem pedindo login', fonte.includes("if (url) pedirLogin('link')") && fonte.includes("if (guest) return pedirLogin('photo')"))
checa('rascunho antigo não apaga a pessoa padrão', fonte.includes('presenter_id: resto.presenter_id || f.presenter_id'))

// ── Narração forçada para quem não é da casa
checa('narrated segue forçado para não-interno', fonte.includes("...(!internalControls || sampleMode ? { voice_mode: 'narrated' } : {})"))
checa('os controles internos seguem atrás da chave', fonte.includes('{internalControls && !sampleMode ? <div className="ace-fields"><label className="ace-field">{t(\'Como será a fala\''))

// ── Padrões existem no catálogo (executando o catálogo)
const carregar = createOfflineLoader()
const cat = carregar('lib/ads/cena/escolhaCatalog.ts')
checa('a pessoa padrão é a primeira do catálogo', fonte.includes('const PESSOA_PADRAO = CENA_ESCOLHA_PRESENTERS[0].id') && !!cat.escolhaPresenter(cat.CENA_ESCOLHA_PRESENTERS[0].id))
checa('toda categoria tem primeiro cenário real', fonte.includes('escolhaScenarios(category)[0]?.id') && Object.keys(cat.CENA_ESCOLHA_CATEGORY_LABELS).every((c) => cat.escolhaScenario(cat.escolhaScenarios(c)[0]?.id)?.category === c))

// ── A categoria não nasce marcada ENQUANTO o servidor recusar (a armadilha da amostra presa por 5 min)
const regraPlano = "if (classified.category !== 'other' && classified.category !== category) throw new Error('escolha_scenario_category_mismatch')"
checa('categoria vazia de fábrica', /useState<Form>\(\{[^}]*category: '', scenario_id: ''/.test(fonte))
const regraDoServidorSegue = ler(PLAN).includes(regraPlano) && ler(SAMPLE).includes('AMOSTRA_SEMENTE_PARADA_MS = 5 * 60_000')
checa('a regra do servidor que obriga isso segue igual (se mudar, esta trava pode cair)', regraDoServidorSegue)
checa('mutante: categoria "other" de fábrica fica vermelho', !/useState<Form>\(\{[^}]*category: '', scenario_id: ''/.test(fonte.replace("presenter_id: PESSOA_PADRAO, category: '', scenario_id: ''", "presenter_id: PESSOA_PADRAO, category: 'other', scenario_id: 'other_table'")))

// ── UGC honesto, nas três línguas
const n9 = carregar(NOTA9)
const FALSO = /talk|fala[nr]?\b|falando|fala dele|habla|hablando/iu
for (const lang of ['en', 'pt', 'es']) {
  const c = n9.ADS_NOTA9_COPY[lang]
  checa(`${lang}: o subtítulo UGC não diz que a pessoa fala`, !FALSO.test(c.subUgc))
  checa(`${lang}: "holds" não diz que a pessoa fala`, !FALSO.test(c.holds))
  checa(`${lang}: o subtítulo UGC diz que tem narração`, /voiceover|narração|voz en off/u.test(c.subUgc))
}

// ── Barra lateral
const lateral = ler(SIDEBAR)
checa('barra lateral: o aviso do crédito leva a cláusula de país', lateral.includes('free credits${GRANT_COUNTRY_CLAUSE}`}'))
const fp = carregar('lib/freeFilmPolicy.ts')
checa('a régua que torna a cláusula necessária segue valendo', fp.FREE_FILM_POLICY === 'pais_rico' && fp.filmeGratisPermitido('US') === true && fp.filmeGratisPermitido('IN') === false)

// ── Mutantes da prova de tela
const MUTANTES = [
  ['pessoa de volta antes do produto', (t) => t.replace('<section className="ace-card" data-kineo="ads-produto">', '<fieldset><input name="ace-person" /></fieldset><section className="ace-card" data-kineo="ads-produto">'), /produto antes da pessoa/],
  ['URL da foto de volta', (t) => t.replace('<label className="ace-field ace-full" data-kineo="ads-categoria">', `<label className="ace-field ace-full">{t('Ou URL HTTPS da foto', 'Or the photo HTTPS URL')}<input /></label><label className="ace-field ace-full" data-kineo="ads-categoria">`), /URL da foto/],
  ['mais opções aberto', (t) => t.replace('data-kineo="ads-mais-opcoes" open={!!bfCampaign}', 'data-kineo="ads-mais-opcoes" open'), /fechado por padrão/],
  ['crédito de volta no controle', (t) => t.replace("t('Versão completa · 15 s', 'Full version · 15 s')", "t(`Versão completa · 15 s · ${COMPLETE_CREDITS} créditos`, `Full version · 15 s · ${COMPLETE_CREDITS} credits`)"), /crédito no controle/],
  ['cartão de marca de volta', (t) => t.replace('<section className="ace-top" data-kineo="ads-topo">', `<section className="ace-top" data-kineo="ads-topo"><span>{t('Studio Ads · você escolhe', 'Studio Ads · your choice')}</span>`), /cartão de marca/],
  ['pessoa sem padrão', (t) => t.replace('rota: \'\', presenter_id: PESSOA_PADRAO, category', 'rota: \'\', presenter_id: \'\', category').replace('person ? <img className="ace-stage-portrait"', 'false ? <img className="ace-stage-portrait"'), /prévia/],
  ['preço fora do botão final', (t) => t.replace("{` · ${renderCredits} ${t('créditos', 'credits')}`}", ''), /preço no botão final/],
  ['encadeamento desligado', (t) => t.replace('if (uuid(data.order_id)) setFotosEmSeguida(true)', ''), /um clique = plano/],
  ['encadeia também quando o pedido volta salvo', (t) => t.replace('useState(false) // KINEO-ADS-PRODUTO-PRIMEIRO-0411 — o plano', 'useState(true) // KINEO-ADS-PRODUTO-PRIMEIRO-0411 — o plano'), /não pede fotos sozinho/],
  ['encadeia para o vídeo', (t) => t.replace("setFotosEmSeguida(false); void run('stills')", "setFotosEmSeguida(false); void run('render')"), /um clique = plano|para na escolha/],
  ['narração não forçada', (t) => t.replace("...(!internalControls || sampleMode ? { voice_mode: 'narrated' } : {}), ", ''), /narração forçada/],
  ['pedido por link com a pessoa padrão', (t) => t.replace("if (!restored) setForm(f => ({ ...f, presenter_id: '' }))", ''), /pedido por link/],
  ['categoria sem marcar o primeiro cenário', (t) => t.replace('scenario_id: cenaPadrao(e.target.value)', "scenario_id: ''"), /primeiro cenário/],
]
for (const [nome, muta, esperado] of MUTANTES) {
  const original = fonte
  const mudou = muta(fs.readFileSync(UI, 'utf8').replace(/\r\n/g, '\n')) !== original
  let resultado = []
  try { resultado = await provaDaTela({ [UI]: (t) => muta(t.replace(/\r\n/g, '\n')) }) } catch (e) { resultado = ['estourou: ' + e.message] }
  if (process.env.VER_MUTANTES) console.log('    ', nome, '=>', JSON.stringify(resultado).slice(0, 300))
  checa(`mutante "${nome}" fica vermelho`, mudou && resultado.some((m) => esperado.test(m)))
}

console.log(`\n${ok} ok, ${falhas} falha(s)`)
if (falhas) process.exit(1)
