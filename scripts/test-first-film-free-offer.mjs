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

const raiz = path.resolve(process.argv[2] ?? '.')
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')

const CREDITS = ler('app/api/credits/route.ts')
const GEN = ler('app/(dashboard)/generate/GenerateClient.tsx')
const COMPOSE = ler('app/api/compose/route.ts')
const QUOTA = ler('lib/freeFastQuota.ts')

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
checa('modal: tipo declarado', /firstFilmFree\?: boolean\r?\n\s*onFirstFilmFree\?: \(\) => void/.test(GEN))
checa('call site: passa o predicado', /firstFilmFree=\{firstFilmFreeAvailable\}/.test(GEN))
checa(
  'modal: so pinta com a oferta E o handler (nunca botao morto)',
  /\{firstFilmFree && onFirstFilmFree && \(/.test(GEN),
)
checa('modal: o botao existe e chama o handler', /onClick=\{onFirstFilmFree\}/.test(GEN))

// ── 5. O CLIQUE NAO GERA NADA E NAO MUDA PRECO ──────────────────────────────
const mHandler = GEN.match(/onFirstFilmFree=\{\(\) => \{([\s\S]{0,700}?)\}\}/)
checa('call site: handler existe', !!mHandler)
const handler = mHandler ? mHandler[1] : ''
checa('handler: fecha a caixa', /setShowUpgradeModal\(false\)/.test(handler))
checa('handler: seleciona o motor gratuito', /setMode\('fast'\)/.test(handler))
checa(
  'handler: NAO dispara geracao (trava de qualidade do fundador de 03/09)',
  !/handleGenerate|handleAnalyze|generateVideo|submitToFal/.test(handler),
)
checa('handler: NAO manda para checkout nem pricing', !/checkout|pricing|stripe/i.test(handler))

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
checa('nao-regressao: o purchaseFit do #31 continua', /\{purchaseFit && \(/.test(GEN))
checa('nao-regressao: o gatilho upgrade_modal_opened continua', /trackEvent\('upgrade_modal_opened'/.test(GEN))
checa('nao-regressao: outOfCredits ainda libera o Fast', /if \(mode === 'fast'\) return false/.test(GEN))

// ── 8. A OFERTA NAO PODE MENTIR ─────────────────────────────────────────────
const mBloco = GEN.match(/\{firstFilmFree && onFirstFilmFree && \(([\s\S]{0,2600}?)\n\s*\)\}/)
checa('copy: bloco encontrado', !!mBloco)
const bloco = mBloco ? mBloco[1] : ''
checa('copy: diz 0 creditos (que e o que o servidor cobra)', /costs 0 credits/.test(bloco))
checa('copy: nao esconde a marca d agua', /watermark/i.test(bloco))
checa('copy: declara o teto real de 3 por dia', /3 films a day/.test(bloco))
checa('copy: nao promete preco nem desconto', !/\$|% off|discount|save /i.test(bloco))

// ── resultado ───────────────────────────────────────────────────────────────
const total = ok + falhas.length
if (falhas.length) {
  console.error(`FALHOU ${falhas.length}/${total}`)
  for (const f of falhas) console.error('  x ' + f)
  process.exit(1)
}
console.log(`OK ${ok}/${total} verificacoes — oferta de primeiro filme gratis`)
