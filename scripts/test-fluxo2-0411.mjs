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
async function provasExtras() {}

const erros = await provaDaTela()
for (const e of erros) checa(e, false)
checa('A a tela de verdade passa nas provas', erros.length === 0)

const simples = ler('app/(dashboard)/ads/v2/AdsV2Simple.tsx'), cliente = ler('app/(dashboard)/ads/v2/AdsV2Client.tsx')
checa('A a sessão entrega a confirmação à tela', simples.includes('<AdsV2Escolha onAskStartOver={props.onAskStartOver}'))
checa('A o invólucro liga a sessão simples ao Start over de sempre', /<AdsV2SimpleSession[\s\S]{0,900}onAskStartOver=\{\(\) => setConfirmingReset\(true\)\}/.test(cliente))
checa('A o servidor não mudou: Start over segue sendo a remontagem da sessão', cliente.includes('setSession((s) => s + 1)') && cliente.includes('onClick={startOver}'))

const MUTANTES = [
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
