// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PRIMEIRO-FILME-GRATIS-2026-09-04 (sprint-assinaturas #13)
//
// O DEFEITO QUE ESTE TESTE TRANCA (medido no banco, 21 dias, contas externas):
// 88 pessoas bateram numa parede de pagamento (`trial_downgrade_modal_shown` /
// `upgrade_modal_opened` / `limit_purchase_fit_viewed`). 37 estavam SEM FILME
// naquele exato momento e 27 NUNCA receberam um filme da Kineo na vida. As 27
// sao todas `plan=free`, `has_paid=false`, `trial_status` preenchido — que e
// exatamente o predicado `isFreePlanFast` do servidor, para o qual o Kineo 1
// nao checa saldo nenhum (cota de 3 por 24h).
//
// A INVARIANTE: a oferta de "primeiro filme gratis" so pode aparecer quando o
// servidor REALMENTE entregaria de graca, e nunca pode aparecer para quem ja
// recebeu um filme ou para quem paga. Um `null` (nao sei) esconde a oferta.
//
// Le os arquivos REAIS. Nao ha mock: o valor deste teste e provar que o codigo
// em producao tem estas propriedades, nao que uma copia delas passa.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'

const raiz = path.resolve(process.argv[2] ?? '.')
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')

const CREDITS = ler('app/api/credits/route.ts')
const GEN = ler('app/(dashboard)/generate/GenerateClient.tsx')
const COMPOSE = ler('app/api/compose/route.ts')
const QUOTA = ler('lib/freeFastQuota.ts')
const ts = createRequire(path.join(raiz, 'package.json'))('typescript')
const ast = ts.createSourceFile('GenerateClient.tsx', GEN, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const nodes = []
function visit(node) { nodes.push(node); ts.forEachChild(node, visit) }
visit(ast)
const modalDeclaration = nodes.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'UpgradeModal')
const modalTypes = modalDeclaration.parameters[0].type.members
const modalCall = nodes.find(node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'UpgradeModal')
const attribute = name => modalCall.attributes.properties.find(node => ts.isJsxAttribute(node) && node.name.getText(ast) === name)?.initializer?.expression
const freeHandler = attribute('onFirstFilmFree')

let ok = 0
const falhas = []
function checa(nome, cond) {
  if (cond) { ok += 1; return }
  falhas.push(nome)
}

// ── 1. O SERVIDOR PUBLICA O NUMERO CERTO ────────────────────────────────────
checa('credits: declara filmsDelivered', /let filmsDelivered: number \| null = null/.test(CREDITS))
checa('credits: conta a tabela videos', /\.from\('videos'\)/.test(CREDITS))
checa('credits: usa head-count exato (nao baixa linhas)', /count: 'exact', head: true/.test(CREDITS))
checa('credits: filtra pelo dono', /\.eq\('user_id', user\.id\)/.test(CREDITS))
checa(
  'credits: conta SO filme entregue (status completed)',
  /filmsDelivered[\s\S]{0,700}?\.eq\('status', 'completed'\)/.test(CREDITS),
)
checa('credits: devolve filmsDelivered na resposta', /^\s{6}filmsDelivered,\s*$/m.test(CREDITS))
// fail-hidden: erro de leitura nao pode virar zero
checa(
  'credits: erro de leitura deixa null (fail-hidden), nunca 0',
  /if \(!filmsErr && typeof count === 'number'\) filmsDelivered = count/.test(CREDITS) &&
    /catch \{ \/\* fail-hidden: segue null \*\/ \}/.test(CREDITS),
)
// NAO pode reusar firstVideoAt: ele e gateado por flag e conta render quebrado
checa(
  'credits: firstVideoAt continua gateado por OFFER_290_ENABLED (por isso o campo novo)',
  /if \(OFFER_290_ENABLED\) \{[\s\S]{0,400}?firstVideoAt = /.test(CREDITS),
)
checa(
  'credits: a contagem nova NAO esta dentro do if da flag',
  !/if \(OFFER_290_ENABLED\) \{[\s\S]{0,900}?let filmsDelivered/.test(CREDITS),
)

// ── 2. O CLIENTE LE SEM INVENTAR ────────────────────────────────────────────
checa('cliente: estado filmsDelivered existe', /const \[filmsDelivered, setFilmsDelivered\] = useState<number \| null>\(null\)/.test(GEN))
checa(
  'cliente: campo ausente/invalido vira null, nunca 0',
  /setFilmsDelivered\(typeof data\.filmsDelivered === 'number' \? data\.filmsDelivered : null\)/.test(GEN),
)

// ── 3. O PREDICADO E ESPELHO DO SERVIDOR ────────────────────────────────────
const mPred = GEN.match(/const firstFilmFreeAvailable =\r?\n([\s\S]{0,320}?)\r?\n\r?\n/)
checa('cliente: firstFilmFreeAvailable existe', !!mPred)
const pred = mPred ? mPred[1] : ''
checa('predicado: exige filmsDelivered === 0 (null nao conta)', /filmsDelivered === 0/.test(pred))
checa('predicado: NAO usa !filmsDelivered (null viraria elegivel)', !/!filmsDelivered\b/.test(pred))
checa('predicado: exclui plano pago', /!isStarter && !isCreator && !isStudio/.test(pred))
checa('predicado: exclui quem ja pagou', /!hasPaid/.test(pred))
checa('predicado: exclui trial ativo (no trial o Fast CUSTA credito)', /trialActive !== true/.test(pred))
// espelho do servidor: as tres condicoes do isFreePlanFast
checa(
  'servidor: isFreePlanFast continua sendo isFreePlan && !hasPaid && !ent.isTrial',
  /isFreePlanFast = isFreePlan && !hasPaid && !ent\.isTrial/.test(COMPOSE),
)
// A PROVA QUE IMPORTA: dentro do ramo gratuito nao existe UMA comparacao de
// saldo. Se alguem um dia enfiar um `creditBalance < ...` ai dentro, a copy
// "costs 0 credits" vira mentira e este teste cai antes do deploy.
const iFree = COMPOSE.indexOf('if (isFreePlanFast) {')
const iQuota = COMPOSE.indexOf('reserveFreeFastPreviewSlot()', iFree)
const ramoGratuito = iFree >= 0 && iQuota > iFree ? COMPOSE.slice(iFree, iQuota) : ''
checa('servidor: o ramo gratuito do Fast existe e termina na reserva de cota', ramoGratuito.length > 0)
checa(
  'servidor: no ramo isFreePlanFast o Fast NAO compara saldo nenhum',
  ramoGratuito.length > 0 && !/creditBalance\s*[<>]/.test(ramoGratuito),
)
checa(
  'servidor: no ramo isFreePlanFast o Fast NAO devolve 402',
  ramoGratuito.length > 0 && !/status: 402/.test(ramoGratuito),
)
checa(
  'servidor: a cobranca do Fast vive no ELSE (conta paga/trial), nao no gratuito',
  /\} else \{[\s\S]{0,600}?creditCostForDuration\('fast', true, duration\)[\s\S]{0,300}?creditBalance < requiredCredits/.test(COMPOSE),
)
checa('cota gratuita: o teto que a copy promete existe e vale 3', /FREE_FAST_PREVIEW_LIMIT = 3/.test(QUOTA))
checa('cota gratuita: a janela que a copy promete e de 24h', /FREE_FAST_WINDOW_MS = 24 \* 60 \* 60 \* 1000/.test(QUOTA))

// ── 4. A CAIXA RECEBE E MOSTRA ──────────────────────────────────────────────
checa('modal: prop firstFilmFree na assinatura', /firstFilmFree = false,\r?\n\s*onFirstFilmFree,/.test(GEN))
checa('modal: tipos declarados no componente real', modalTypes.some(property => property.name?.getText(ast) === 'firstFilmFree' && property.type?.kind === ts.SyntaxKind.BooleanKeyword) && modalTypes.some(property => property.name?.getText(ast) === 'onFirstFilmFree' && ts.isFunctionTypeNode(property.type)))
checa('call site: passa o predicado e fecha na porta de cartao', attribute('firstFilmFree')?.getText(ast) === '!CARD_ENTRY_ONLY && firstFilmFreeAvailable')
checa(
  'modal: so pinta com a oferta E o handler (nunca botao morto)',
  /\{firstFilmFree && onFirstFilmFree && \(/.test(GEN),
)
checa('modal: o botao existe e chama o handler', /onClick=\{onFirstFilmFree\}/.test(GEN))

// ── 5. O CLIQUE NAO GERA NADA E NAO MUDA PRECO ──────────────────────────────
// The callback now serves both legacy-free and included-trial films. Parse its
// entire real body, rather than cutting off the close/selection after 700 chars.
checa('call site: handler existe', !!freeHandler && ts.isArrowFunction(freeHandler))
const handler = freeHandler?.body.getText(ast) ?? ''
checa('handler: fecha a caixa', /setShowUpgradeModal\(false\)/.test(handler))
checa('handler: seleciona o motor gratuito', /setMode\('fast'\)/.test(handler))
checa(
  'handler: NAO dispara geracao (trava de qualidade do fundador de 03/09)',
  !/handleGenerate|handleAnalyze|generateVideo|submitToFal/.test(handler),
)
checa('handler: NAO manda para checkout nem pricing', !/checkout|pricing|stripe/i.test(handler))
function runHandler({ trialActive = false, kineo1Shown = true, fits = true, scriptMode = 'ai', mutation = source => source } = {}) {
  const state = { closed: false, mode: null, aiEngine: null, duration: null, scriptMode }
  const module = { exports: {} }
  const compiled = ts.transpileModule('module.exports = ' + mutation(freeHandler.getText(ast)), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(compiled, { module, trialActive, kineo1Shown, scriptMode,
    credits: 10, upgradeReason: 'credits', prompt: 'A reviewed topic', language: 'en', SEEDANCE_SHORT_SECONDS: 15,
    trackEvent() {}, setShowUpgradeModal: value => { state.closed = value === false },
    setMode: value => { state.mode = value }, setAiEngine: value => { state.aiEngine = value },
    setDuration: value => { state.duration = value }, setScriptMode: value => { state.scriptMode = value },
    roteiroCabeNoFilmeCurto: () => fits,
  })
  module.exports()
  return state
}
const legacyClick = runHandler()
checa('clique real gratuito fecha e seleciona Fast sem gerar', legacyClick.closed && legacyClick.mode === 'fast')
const trialClick = runHandler({ trialActive: true, kineo1Shown: false, fits: false, scriptMode: 'verbatim' })
checa('clique real incluido respeita Seedance15 e revisa roteiro comprido', trialClick.closed && trialClick.mode === 'cinematic_ai' && trialClick.aiEngine === 'seedance' && trialClick.duration === 15 && trialClick.scriptMode === 'ai')
checa('mutante: remover a selecao gratuita reprova', runHandler({ mutation: source => source.replace("setMode('fast')", "setMode('cinematic_veo')") }).mode !== 'fast')

// ── 6. A MEDICAO SAI JUNTO ──────────────────────────────────────────────────
checa('placar: impressao real da oferta', /trackEvent\('first_film_free_offer_shown'/.test(GEN))
checa('placar: clique da oferta', /trackEvent\('first_film_free_offer_clicked'/.test(GEN))
checa(
  'placar: a impressao dispara DENTRO do modal (a caixa vista, nao a intencao)',
  /const topupCheckout = useCheckoutLaunch\('generate_upgrade_modal_topup'\)[\s\S]{0,900}?first_film_free_offer_shown/.test(GEN),
)
checa(
  'placar: a impressao respeita a mesma guarda da pintura',
  /if \(!firstFilmFree \|\| !onFirstFilmFree\) return/.test(GEN),
)

// ── 7. NAO-REGRESSAO: o que ja estava na caixa continua ─────────────────────
checa('nao-regressao: as linhas de plano continuam', /PLAN_LIST\.map\(\(plan\) => \{/.test(GEN))
// KINEO-PAREDE-V1-2026-09-23 — a caixa do purchaseFit virou
// `{purchaseFit && !wallV1Eligible && (` (some só quando a parede v1 pinta o
// mesmo gap). A âncora aceita as duas grafias e continua exigindo a caixa.
checa('nao-regressao: o purchaseFit do #31 continua', /\{purchaseFit && (?:!wallV1Eligible && )?\(\r?\n/.test(GEN))
checa('nao-regressao: o gatilho upgrade_modal_opened continua', /trackEvent\('upgrade_modal_opened'/.test(GEN))
checa('nao-regressao: outOfCredits ainda libera o Fast', /if \(mode === 'fast'\) return false/.test(GEN))

// ── 8. A OFERTA NAO PODE MENTIR ─────────────────────────────────────────────
const mBloco = GEN.match(/\{firstFilmFree && onFirstFilmFree && \(([\s\S]{0,2600}?)\n\s*\)\}/)
checa('copy: bloco encontrado', !!mBloco)
const bloco = mBloco ? mBloco[1] : ''
checa('copy: diz 0 creditos (que e o que o servidor cobra)', /costs 0 credits/.test(bloco))
checa('copy: nao esconde a marca d agua', /watermark/i.test(bloco))
// The 04/09 offer stated the then-current quota. The approved 29/09 revision
// removed that promise; current eligibility derives from OFFER.limit and hides
// the old engine when unavailable. Freeze the historical proof without putting
// an obsolete quota promise back in today's product.
// KINEO-LEVA-REBASE-2610: reachable ead6 and original f486 have the identical
// immutable fixture blob 7edd08b1b660b4b7ec6f1a7cdd486f91daa74502.
const originalOffer = execFileSync('git', ['show', 'ead6c6a04bd729c59d418d76b0842d23c104cfa8:app/(dashboard)/generate/GenerateClient.tsx'], { cwd: raiz, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
checa('fixture04/09 declara o teto historico de3 por dia', /3 films a day/.test(originalOffer))
checa('copy atual nao promete a cota retirada', !/3 films a day/.test(bloco))
checa('oferta atual depende da cota e do motor realmente disponiveis', /freeFilmAvailable &&/.test(pred) && /kineo1Shown/.test(pred) && GEN.includes('const freeFilmAvailable = OFFER.limit > 0'))
checa('copy: nao promete preco nem desconto', !/\$|% off|discount|save /i.test(bloco))

// ── resultado ───────────────────────────────────────────────────────────────
const total = ok + falhas.length
if (falhas.length) {
  console.error(`FALHOU ${falhas.length}/${total}`)
  for (const f of falhas) console.error('  x ' + f)
  process.exit(1)
}
console.log(`OK ${ok}/${total} verificacoes — oferta de primeiro filme gratis`)
