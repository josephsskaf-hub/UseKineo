// KINEO-PRIMEIRA-TELA-0511 — guardião sem rede da limpeza da primeira tela (regra "tela limpa" do fundador, 02/11).
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const ROOT = process.cwd()
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(path.join(ROOT, f), 'utf8'))
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }

const BANNER = 'components/ChatGptWelcomeBanner.tsx', STUDIO = 'app/(dashboard)/studio/StudioClient.tsx', BOTOES = 'lib/ui/homeCardBotoes0411.ts', FAIXA = 'components/home/EngineNewsBar.tsx', PLANO = 'lib/ui/faixaPlanoMaisAlto0511.ts'

function carrega(file, fonte = ler(file)) {
  const mod = { exports: {} }
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(js, { exports: mod.exports, module: mod, require: () => ({}) })
  return mod.exports
}

function prova(over = {}) {
  const e = []
  const exige = (c, m) => { if (!c) e.push(m) }
  const src = (f) => over[f] ?? ler(f)
  const banner = src(BANNER)
  exige(!/plans from|STARTER_MO|free credits|TRIAL_CREDITS_SHOWN/.test(banner), 'faixa do ChatGPT sem preço e sem prometer créditos')
  exige(banner.includes('<p className={styles.proof}>'), 'a faixa do ChatGPT mantém a linha de baixo')
  const st = src(STUDIO)
  exige(/const semOfertaAntesDoFilme = \(firstFilmHistoryEmpty \|\| !historicoLido\) && contaPaga !== true/.test(st), 'aviso do Kling 4 espera o histórico')
  exige(/\.finally\(\(\) => setHistoricoLido\(true\)\)/.test(st), 'o histórico sempre termina de ser lido')
  const b = carrega(BOTOES, src(BOTOES))
  for (const live of [true, false]) {
    exige(b.homeCardBotao('product_ads', 'en', live) === 'Make my ad', `card de produto: Make my ad (${live})`)
    exige(b.homeCardBotao('ugc_ads', 'en', live) === 'Make my UGC ad', `card de UGC: Make my UGC ad (${live})`)
  }
  exige(b.homeCardBotao('product_ads', 'pt', false) === 'Fazer meu anúncio', 'o botão segue a língua')
  const faixa = src(FAIXA)
  exige(/\[data-kling4-trial-notice="home"\]\{display:none !important\}/.test(faixa) && faixa.indexOf('[data-kling4-trial-notice="home"]') > faixa.indexOf('@media (max-width:640px)'), 'no celular, a frase aparece uma vez só, e só enquanto a faixa está aberta')
  exige(/if \(vivo && faixaSomeParaPlano\(d\?\.plan\)\) setHidden\(true\)/.test(faixa) && !/setItem\(DISMISS_KEY[^\n]*faixaSomeParaPlano/.test(faixa), 'plano mais alto esconde a faixa sem gravar como fechada')
  exige(/if \(!signedIn\) return/.test(faixa), 'visitante não faz leitura de plano')
  const p = carrega(PLANO, src(PLANO))
  for (const x of ['pro', 'studio', 'autopilot', 'autopilot_lite', 'business', ' PRO ']) exige(p.faixaSomeParaPlano(x) === true, `sem degrau: ${x}`)
  for (const x of ['free', 'starter', 'basic', 'creator', 'creator_trial', 'studio_trial', '', null, undefined, 7]) exige(p.faixaSomeParaPlano(x) === false, `a faixa fica: ${x}`)
  return e
}

console.log('1. o que está no ar')
{ const r = prova(); checa(`tudo confere (${r.join('; ') || 'ok'})`, r.length === 0) }

console.log('2. mutantes')
const MUTANTES = [
  ['preço de volta na faixa do ChatGPT', BANNER, (t) => t.replace('Narration, scenes, captions and music included.', 'plans from $9/mo'), /sem preço/],
  ['aviso do Kling 4 volta a piscar', STUDIO, (t) => t.replace('(firstFilmHistoryEmpty || !historicoLido) && contaPaga', 'firstFilmHistoryEmpty && contaPaga'), /espera o histórico/],
  ['leitura que falha prende o aviso', STUDIO, (t) => t.replace('.finally(() => setHistoricoLido(true))', ''), /termina de ser lido/],
  ['rótulo de plano volta no card', BOTOES, (t) => t.replace("return card === 'ugc_ads' ? t[1] : t[0]", "return _sampleLive === false ? 'Make a product ad' : (card === 'ugc_ads' ? t[1] : t[0])"), /Make my ad \(false\)/],
  ['frase repetida no celular', FAIXA, (t) => t.replace('[data-kling4-trial-notice="home"]{display:none !important}', ''), /uma vez só/],
  ['Studio volta a ver Upgrade', PLANO, (t) => t.replace("'pro', 'studio', ", ''), /sem degrau: pro/],
  ['Creator perde a faixa', PLANO, (t) => t.replace("new Set(['pro',", "new Set(['basic', 'creator', 'pro',"), /a faixa fica: basic/],
  ['visitante lê plano', FAIXA, (t) => t.replace('if (!signedIn) return', ''), /visitante/],
]
for (const [nome, arq, muta, esperado] of MUTANTES) {
  const original = ler(arq)
  const mutado = muta(original)
  const r = prova({ [arq]: mutado })
  checa(`mutante "${nome}" fica vermelho`, mutado !== original && r.some((m) => esperado.test(m)))
}
console.log(`\n${ok} ok, ${falhas} falha(s)`)
if (falhas) process.exit(1)
