// KINEO-PAREDE-V1-2026-09-23 — GUARDIÃO: a parede dos 10 créditos mostra o filme
// da pessoa, Starter primeiro, roteiro guardado, render só no clique.
//
// O DADO (23/09): quem chega do ChatGPT com roteiro pronto escolhe Seedance
// (15-25 cr), bate na parede dos 10 créditos do trial antes do 1º filme e,
// quando paga, paga ali em minutos (5 dos 7 últimos pagantes: 0 filmes, 0-6
// min). A parede (`upgrade_modal_opened reason=trial_spent`, 57 de 83 em 30 d)
// marcava o Creator como "recommended" — que fecha 1/21 desde 09/09 (Starter
// 3/13) — e a caixa de recarga dizia que "packs são recurso do Creator/Studio".
//
// Lê os ARQUIVOS REAIS (readFileSync + regex; import com alias '@/' não roda
// fora do bundler) e amarra cada verificação à VARIÁVEL QUE DECIDE, não à
// contagem de texto. A seção [B] transpila lib/growth/wallV1.ts e exercita as
// funções de verdade.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0
let fail = 0
const falhas = []
function check(nome, cond) {
  if (cond) { ok++ } else { fail++; falhas.push(nome) }
}
const norm = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
const semComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*\/\//.test(l))
  .join('\n')

const GC_PATH = 'app/(dashboard)/generate/GenerateClient.tsx'
const GC = norm(GC_PATH)
const GC_CODIGO = semComentarios(GC)
const NOTE = norm('components/TopupUnavailableNote.tsx')
const NOTE_CODIGO = semComentarios(NOTE)
const DFY = norm('components/DfyOfferCard.tsx')
const WALL = norm('lib/growth/wallV1.ts')
const SUCCESS = norm('app/checkout/success/page.tsx')
const SUCCESS_CODIGO = semComentarios(SUCCESS)

// ── (1) os eventos existem e o bloco está amarrado à condição ───────────────
check('(1a) wall_v1_shown existe no GenerateClient', /trackEvent\('wall_v1_shown'/.test(GC))
check('(1b) wall_v1_clicked existe no GenerateClient', /trackEvent\('wall_v1_clicked'/.test(GC))
const iCond = GC_CODIGO.indexOf('const wallV1Eligible =')
const condicao = iCond > -1 ? GC_CODIGO.slice(iCond, GC_CODIGO.indexOf('const wallV1StarterFilms', iCond)) : ''
check('(1c) a condição da parede foi recortada', condicao.length > 80 && condicao.length < 700)
check('(1d) a condição exige requiredCredits > balance (o gap real, não uma cópia)',
  /purchaseFit\.requiredCredits\s*>\s*purchaseFit\.balance/.test(condicao))
check('(1e) a condição exige os TRÊS booleanos de plano negados, na mesma expressão',
  /!wallV1\.isStarter\s*&&\s*!wallV1\.isCreator\s*&&\s*!wallV1\.isStudio/.test(condicao))
check('(1f) a condição passa pela lista de razões de crédito (isWallV1Reason)', /isWallV1Reason\(reason\)/.test(condicao))
check('(1g) o JSX da parede é governado por wallV1Eligible', /\{wallV1Eligible && wallV1 && purchaseFit && \(/.test(GC))
check('(1h) a impressão dispara UMA vez por abertura (ref, não render)',
  /const wallV1ShownRef = useRef\(false\)/.test(GC) && /if \(!wallV1Eligible \|\| !wallV1 \|\| !purchaseFit \|\| wallV1ShownRef\.current\) return/.test(GC))
check('(1i) o pai passa os três booleanos da tela, não uma cópia', /isStarter,\n\s+isCreator,\n\s+isStudio,\n\s+onCheckout: \(tier\) =>/.test(GC))

// ── (2) dentro do bloco, Starter antes de Creator/Studio, sem selo ──────────
const iBloco = GC.indexOf('data-kineo="parede-v1"')
const bloco = iBloco > -1 ? GC.slice(iBloco, GC.indexOf('{WALL_V1_SAVED_LINE}', iBloco)) : ''
check('(2a) o bloco da parede foi recortado', bloco.length > 500 && bloco.length < 6000)
const iStarter = bloco.indexOf('data-kineo="parede-v1-starter"')
const iCreator = bloco.indexOf('data-kineo="parede-v1-creator"')
const iStudio = bloco.indexOf('data-kineo="parede-v1-studio"')
check('(2b) Starter aparece ANTES de Creator e de Studio', iStarter > -1 && iCreator > -1 && iStudio > -1 && iStarter < iCreator && iCreator < iStudio)
check('(2c) o Starter aciona onCheckout(\'starter\') e os outros basic/pro',
  /parede-v1-starter"[\s\S]*?onCheckout\('starter'\)/.test(bloco) && /parede-v1-creator"[\s\S]*?onCheckout\('basic'\)/.test(bloco) && /parede-v1-studio"[\s\S]*?onCheckout\('pro'\)/.test(bloco))
check('(2d) nenhum selo recommended/MOST POPULAR dentro do bloco', !/MOST POPULAR|recommended|FINISHES THIS VIDEO/i.test(bloco))
check('(2e) o preço do Starter vem de formatCheckoutMoney/getTierPrice, nunca literal',
  /formatCheckoutMoney\(currency, getTierPrice\('starter', currency, region\)\)/.test(bloco) && !/\$\d/.test(bloco))
check('(2f) a frase "+ N more like it" usa filmsCoveredByTier(\'starter\', …)',
  /filmsCoveredByTier\('starter', purchaseFit\.requiredCredits\)/.test(GC) && /wallV1FilmsLine\(wallV1StarterFilms\)/.test(bloco))
check('(2g) o título são as palavras do prompt (wallV1Title) e o gap nomeia o motor (wallV1GapLine)',
  /wallV1Title\(wallV1\.prompt\)/.test(bloco) && /wallV1GapLine\(\{ engineLabel: wallV1\.engineLabel/.test(bloco))
check('(2h) a linha do roteiro guardado está no bloco', GC.includes('{WALL_V1_SAVED_LINE}') && /Your script is saved for 45 minutes; after paying, 1 click\./.test(WALL))

// ── (3) intent_campaign=wall_v1 em todo href do bloco ───────────────────────
check('(3a) WALL_V1_INTENT_CAMPAIGN é \'wall_v1\'', /export const WALL_V1_INTENT_CAMPAIGN = 'wall_v1'/.test(WALL))
check('(3b) wallV1CheckoutHref carrega intent_campaign=wall_v1',
  /return `\/api\/stripe\/checkout\?tier=\$\{tier\}\$\{intro\}&intent_campaign=\$\{WALL_V1_INTENT_CAMPAIGN\}`/.test(WALL))
const iOnCheckout = GC_CODIGO.indexOf('onCheckout: (tier) => {')
const onCheckout = iOnCheckout > -1 ? GC_CODIGO.slice(iOnCheckout, GC_CODIGO.indexOf('setUpgradeLoading(true)', iOnCheckout)) : ''
check('(3c) o clique da parede lança wallV1CheckoutHref(tier), não withIntentCampaign',
  /upgradeModalCheckout\.launch\(\s*`wall_v1_\$\{tier\}`,\s*wallV1CheckoutHref\(tier\)/.test(onCheckout) && !/withIntentCampaign\(/.test(onCheckout))
check('(3d) o rascunho é gravado ANTES de lançar o checkout',
  onCheckout.indexOf('saveStudioDraftNow()') > -1 && onCheckout.indexOf('saveStudioDraftNow()') < onCheckout.indexOf('upgradeModalCheckout.launch('))
check('(3e) o clique mede tier e required_credits', /wall_v1_clicked', \{\n\s+tier,\n\s+required_credits: selectedCost,/.test(GC))

// ── (4) o resume aceita wall_v1 e NÃO dispara sozinho ───────────────────────
const iResume = GC_CODIGO.indexOf("searchParams?.get('resume') !== 'wall_v1'")
const ramoWall = iResume > -1 ? GC_CODIGO.slice(iResume, GC_CODIGO.indexOf('Push #033', iResume) > -1 ? GC_CODIGO.indexOf('Push #033', iResume) : GC_CODIGO.indexOf('}, [])', iResume) + 6) : ''
check('(4a) o resume aceita wall_v1', iResume > -1)
check('(4b) o ramo wall_v1 foi recortado', ramoWall.length > 300 && ramoWall.length < 3000)
check('(4c) o ramo wall_v1 NÃO contém card_entry_resume_autostart', !/card_entry_resume_autostart/.test(ramoWall))
check('(4d) o ramo wall_v1 NÃO chama handleGenerateGuarded nem arma resumeArmedRef',
  !/handleGenerateGuarded\(/.test(ramoWall) && !/resumeArmedRef/.test(ramoWall))
check('(4e) o ramo wall_v1 restaura os cinco campos como o card_entry',
  /setPrompt\(draft\.prompt\)/.test(ramoWall) && /if \(draft\.quality\) setQuality/.test(ramoWall) && /if \(draft\.duration\) setDuration/.test(ramoWall) && /if \(draft\.mode\) setMode\(draft\.mode\)/.test(ramoWall) && /if \(draft\.engine\) setAiEngine\(draft\.engine\)/.test(ramoWall))
check('(4f) restaurado e ausente têm eventos próprios', /wall_v1_resume_restored/.test(ramoWall) && /wall_v1_resume_missing/.test(ramoWall))
check('(4g) o card_entry original continua intacto (a outra pista o trava)',
  /searchParams\?\.get\('resume'\) !== 'card_entry'\) return/.test(GC) && /resumeArmedRef\.current = draft\.fresh/.test(GC))

// ── (5) handleBuyCreditsOnly volta para o Studio ────────────────────────────
const iBuy = GC_CODIGO.indexOf('function handleBuyCreditsOnly()')
const buy = iBuy > -1 ? GC_CODIGO.slice(iBuy, GC_CODIGO.indexOf('async function handleYouTubeUpload', iBuy)) : ''
check('(5a) handleBuyCreditsOnly passa por withStudioReturn e mantém o literal do pack',
  /withStudioReturn\(withIntentCampaign\('\/api\/stripe\/checkout\?pack=starter'\)\)/.test(buy))
check('(5b) withStudioReturn escreve return=studio e buy_credits_studio_v1 só sem campanha prévia',
  /return=studio/.test(WALL) && /BUY_CREDITS_STUDIO_INTENT_CAMPAIGN = 'buy_credits_studio_v1'/.test(WALL) && /\/\[\?&\]intent_campaign=\/\.test\(withReturn\)/.test(WALL))
check('(5c) o rascunho é gravado antes do pacote sair', buy.indexOf('saveStudioDraftNow()') > -1 && buy.indexOf('saveStudioDraftNow()') < buy.indexOf('wmCheckout.launch('))

// ── (6) a caixa de recarga fala positivo e sem cifrão ───────────────────────
check('(6a) TopupUnavailableNote não diz mais "Creator and Studio feature"', !/Creator and Studio feature/.test(NOTE_CODIGO))
check('(6b) TopupUnavailableNote sem cifrão', !/\$\d/.test(NOTE))
check('(6c) a copy nova aponta para o plano de cima e para o desbloqueio da recarga',
  /Pick the plan above that covers this film\. One-time top-ups unlock once you are on a plan\./.test(NOTE) && /covers this film and \$\{films - 1\} more like it this month\. One-time top-ups unlock once you are on a plan\./.test(NOTE))
check('(6d) TIER_CREDITS, filmsCoveredByTier, guarda do divisor e evento continuam',
  /TIER_CREDITS\[tier\]/.test(NOTE) && /export function filmsCoveredByTier/.test(NOTE) && /if \(cost < 1\) return 1/.test(NOTE) && /topup_unavailable_note_shown/.test(NOTE))

// ── (7) DfyOfferCard ────────────────────────────────────────────────────────
check('(7a) DfyOfferCard importa isDfyCandidate, isDfyOfferLive e dfyPaymentLink do módulo puro',
  /import \{[\s\S]*?dfyPaymentLink,[\s\S]*?isDfyCandidate,[\s\S]*?isDfyOfferLive,[\s\S]*?\} from '@\/lib\/growth\/dfyOffer'/.test(DFY))
check('(7b) o cartão só existe com isDfyOfferLive() && isDfyCandidate(prompt)',
  /const live = isDfyOfferLive\(\)/.test(DFY) && /const candidate = live && isDfyCandidate\(prompt\)/.test(DFY) && /if \(!candidate \|\| !href\) return null/.test(DFY))
check('(7c) dfy_card_shown e dfy_card_clicked', /trackEvent\('dfy_card_shown'/.test(DFY) && /trackEvent\('dfy_card_clicked'/.test(DFY))
check('(7d) a impressão é uma vez por MONTAGEM (ref booleana, não por tecla)', /shownRef\.current\) return/.test(DFY) && /shownRef\.current = true/.test(DFY) && !/promptHash/.test(DFY))
check('(7e) o link abre em nova aba com rel seguro', /target="_blank"/.test(DFY) && /rel="noopener noreferrer"/.test(DFY))
check('(7f) o GenerateClient importa e monta o cartão antes do Generate',
  /import DfyOfferCard from '@\/components\/DfyOfferCard'/.test(GC) && /<DfyOfferCard\n\s+prompt=\{prompt\}/.test(GC) && /source="studio_analysis"/.test(GC))
const iDfyMount = GC.indexOf('<DfyOfferCard')
const iGenBtn = GC.indexOf('ref={optionsGenerateBtnRef}')
check('(7g) o cartão vem ANTES do botão Generate da fase options e só com prompt >= 20',
  iDfyMount > -1 && iGenBtn > -1 && iDfyMount < iGenBtn && /prompt\.trim\(\)\.length >= 20 && \(\n\s+<DfyOfferCard/.test(GC))
check('(7h) com DFY_PAYMENT_LINK_URL vazio o cartão está desligado', /export const DFY_PAYMENT_LINK_URL = ''/.test(norm('lib/growth/dfyOffer.ts')))

// ── (8) /checkout/success oferece resume=wall_v1 ────────────────────────────
check('(8a) WALL_V1_RESUME_PATH é /studio/create?resume=wall_v1', /export const WALL_V1_RESUME_PATH = '\/studio\/create\?resume=wall_v1'/.test(WALL))
check('(8b) checkoutSuccessResumeHref leva intent_campaign=checkout_success_resume_v1',
  /CHECKOUT_SUCCESS_RESUME_INTENT_CAMPAIGN = 'checkout_success_resume_v1'/.test(WALL) && /return `\$\{WALL_V1_RESUME_PATH\}&intent_campaign=\$\{CHECKOUT_SUCCESS_RESUME_INTENT_CAMPAIGN\}`/.test(WALL))
check('(8c) a tela de sucesso lê o rascunho com o leitor do módulo (readCardEntryDraft)',
  /readCardEntryDraft\(sessionStorage\.getItem\(CARD_ENTRY_DRAFT_KEY\), Date\.now\(\)\)/.test(SUCCESS_CODIGO))
check('(8d) só rascunho FRESCO com texto arma o CTA', /if \(draft && draft\.fresh && draft\.prompt\)/.test(SUCCESS_CODIGO))
check('(8e) o CTA principal vira "Back to your script →" e o destino é o resume da parede',
  /\{freshDraft \? 'Back to your script →' : 'Go to Generate Video'\}/.test(SUCCESS) && /if \(freshDraft\) destination = checkoutSuccessResumeHref\(\)/.test(SUCCESS_CODIGO))
check('(8f) checkout_success_resume_offered com engine/mode/duration, uma vez',
  /checkout_success_resume_offered', \{\n\s+version: WALL_V1_VERSION,\n\s+engine: freshDraft\.engine,\n\s+mode: freshDraft\.mode,\n\s+duration: freshDraft\.duration,/.test(SUCCESS) && /resumeOfferedEventSent\.current = true/.test(SUCCESS))
check('(8g) o caminho antigo card_entry segue no arquivo (trava da outra pista) e sem create_intent na volta',
  /destination = '\/studio\/create\?resume=card_entry'/.test(SUCCESS) && !/resume=wall_v1[^'`]*create_intent/.test(WALL))
check('(8h) checkoutSuccessFirstFilmCopy() continua intacto para quem não tem rascunho', /checkoutSuccessFirstFilmCopy\(\)/.test(SUCCESS))

// ── (9) a volta do PACOTE espera o crédito cair (KINEO-PAREDE-V1-CREDITO) ──
// Revisão de 23/09: ?return=studio pula o /checkout/success; um fetch só na
// montagem + webhook atrasado = nova parede com saldo velho logo após pagar.
const iPoll = GC_CODIGO.indexOf("const [wallV1PackSyncing, setWallV1PackSyncing] = useState(false)")
const ramoPoll = iPoll > -1 ? GC_CODIGO.slice(iPoll, GC_CODIGO.indexOf('}, [])', iPoll) + 6) : ''
check('(9a) o efeito de espera existe e só roda com resume=wall_v1 + pack + session_id',
  ramoPoll.length > 500 && /searchParams\?\.get\('resume'\) !== 'wall_v1'\) return/.test(ramoPoll) && /if \(!pack \|\| !paidSessionId\) return/.test(ramoPoll))
check('(9b) a régua vem do sessionStorage pela chave do módulo e o bloqueio só liga com régua conhecida',
  /readWallV1PackBaseline\(sessionStorage\.getItem\(WALL_V1_PACK_BALANCE_KEY\)\)/.test(ramoPoll) && /const baselineKnown = baseline !== null/.test(ramoPoll) && /setWallV1PackSyncing\(baselineKnown\)/.test(ramoPoll))
check('(9c) repolla /api/credits sem cache e decide por wallV1PackCredited(regua, current)',
  /fetch\('\/api\/credits', \{ cache: 'no-store' \}\)/.test(ramoPoll) && /if \(wallV1PackCredited\(regua, current\)\) \{ finish\('credited', current, regua\); return \}/.test(ramoPoll))
check('(9d) o laço é limitado pelas constantes do módulo (2 s / 30 s)',
  /Date\.now\(\) - startedAt >= WALL_V1_PACK_POLL_MAX_MS/.test(ramoPoll) && /setTimeout\(resolve, WALL_V1_PACK_POLL_MS\)/.test(ramoPoll))
check('(9e) o desfecho libera o botão, apaga a régua, avisa creditsChanged e mede waited_ms',
  /setWallV1PackSyncing\(false\)/.test(ramoPoll) && /sessionStorage\.removeItem\(WALL_V1_PACK_BALANCE_KEY\)/.test(ramoPoll) && /new Event\('creditsChanged'\)/.test(ramoPoll) && /'wall_v1_pack_credited' : 'wall_v1_pack_credit_timeout'/.test(ramoPoll) && /waited_ms: Date\.now\(\) - startedAt/.test(ramoPoll))
check('(9f) a espera NUNCA dispara render', !/handleGenerateGuarded\(|handleGenerate\(|resumeArmedRef/.test(ramoPoll))
check('(9g) handleBuyCreditsOnly grava a régua (saldo de agora) antes de sair para o Stripe',
  /sessionStorage\.setItem\(WALL_V1_PACK_BALANCE_KEY, String\(credits\)\)/.test(buy) && buy.indexOf('WALL_V1_PACK_BALANCE_KEY') < buy.indexOf('wmCheckout.launch('))
const iGuard = GC_CODIGO.indexOf('function handleGenerateGuarded() {')
const guard = iGuard > -1 ? GC_CODIGO.slice(iGuard, GC_CODIGO.indexOf('handleGenerate()', iGuard)) : ''
check('(9h) handleGenerateGuarded trava enquanto o pacote não caiu — ANTES de outOfCredits()',
  guard.indexOf('if (wallV1PackSyncing) {') > -1 && guard.indexOf('if (wallV1PackSyncing) {') < guard.indexOf('if (outOfCredits()) {') && /wall_v1_pack_wait_clicked/.test(guard))
check('(9i) o botão Generate da fase options e a barra fixa ficam ocupados enquanto espera',
  /disabled=\{isProcessingPhase\(phase\) \|\| wallV1PackSyncing\}/.test(GC) && /busy=\{isProcessingPhase\(phase\) \|\| wallV1PackSyncing\}/.test(GC) && /'⏳ Adding your credits…'/.test(GC))
check('(9j) a tela diz por que espera (data-kineo="parede-v1-credito")', /data-kineo="parede-v1-credito"/.test(GC) && /Payment received — adding your credits to this account/.test(GC))

// ── [B] COMPORTAMENTO: lib/growth/wallV1.ts transpilado e exercitado ────────
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
function loadTs(rel, deps = {}) {
  const output = ts.transpileModule(norm(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { if (id in deps) return deps[id]; throw new Error(`unexpected import: ${id}`) },
    module,
    module.exports,
  )
  return module.exports
}
const engineLabel = loadTs('lib/engineLabel.ts')
const wall = loadTs('lib/growth/wallV1.ts', { '@/lib/engineLabel': engineLabel })

check('[B1] wallV1Title: 6 primeiras palavras entre aspas, com reticências',
  wall.wallV1Title('The hidden country between Russia and China almost no one visits') === '“The hidden country between Russia and…”')
check('[B2] wallV1Title: prompt vazio vira your script', wall.wallV1Title('') === 'your script' && wall.wallV1Title(null) === 'your script')
check('[B3] wallV1EngineLabel: seedance = Seedance 1.5, fast = Kineo 1, hollywood = Kling 3',
  wall.wallV1EngineLabel('cinematic_ai', 'seedance') === 'Seedance 1.5' && wall.wallV1EngineLabel('fast', 'seedance') === 'Kineo 1' && wall.wallV1EngineLabel('cinematic_ai', 'hollywood') === 'Kling 3')
check('[B4] wallV1GapLine: o exemplo do pedido',
  wall.wallV1GapLine({ engineLabel: 'Seedance 1.5', requiredCredits: 15, balance: 10, reason: 'trial_spent' }) === 'This film on Seedance 1.5 = 15 credits. Your trial has 10.')
check('[B5] wallV1GapLine: fora do trial diz You have', /You have 3\.$/.test(wall.wallV1GapLine({ engineLabel: 'Kling 3', requiredCredits: 150, balance: 3, reason: 'credits' })))
check('[B6] wallV1FilmsLine: 4 filmes = this film + 3 more', wall.wallV1FilmsLine(4) === '= this film + 3 more like it this month' && wall.wallV1FilmsLine(1) === '= this film, this month')
check('[B7] wallV1CheckoutHref: starter/basic com intro, pro sem, todos wall_v1',
  wall.wallV1CheckoutHref('starter') === '/api/stripe/checkout?tier=starter&intro=1&intent_campaign=wall_v1' && wall.wallV1CheckoutHref('pro') === '/api/stripe/checkout?tier=pro&intent_campaign=wall_v1')
check('[B8] withStudioReturn: sem campanha ganha a própria; com campanha, só o return',
  wall.withStudioReturn('/api/stripe/checkout?pack=starter') === '/api/stripe/checkout?pack=starter&return=studio&intent_campaign=buy_credits_studio_v1'
  && wall.withStudioReturn('/api/stripe/checkout?pack=starter&intent_campaign=yt_x') === '/api/stripe/checkout?pack=starter&intent_campaign=yt_x&return=studio')
check('[B9] withStudioReturn não duplica return=', wall.withStudioReturn('/api/stripe/checkout?pack=starter&return=wm') === '/api/stripe/checkout?pack=starter&return=wm&intent_campaign=buy_credits_studio_v1')
check('[B10] isWallV1Reason: as 4 razões de crédito sim, gate de plano não',
  ['trial_spent', 'credits', 'trial_ended', 'trial_stalled'].every(wall.isWallV1Reason) && !['studio', 'creator', 'footage', null].some(wall.isWallV1Reason))
check('[B11] checkoutSuccessResumeHref', wall.checkoutSuccessResumeHref() === '/studio/create?resume=wall_v1&intent_campaign=checkout_success_resume_v1')
check('[B12] readWallV1PackBaseline: inteiro ≥ 0; lixo, vazio, negativo e ausente viram null',
  wall.readWallV1PackBaseline('10') === 10 && wall.readWallV1PackBaseline(' 0 ') === 0 && wall.readWallV1PackBaseline('7.9') === 7
  && wall.readWallV1PackBaseline('abc') === null && wall.readWallV1PackBaseline('') === null && wall.readWallV1PackBaseline('-3') === null && wall.readWallV1PackBaseline(null) === null && wall.readWallV1PackBaseline(undefined) === null)
check('[B13] wallV1PackCredited: só saldo ACIMA da régua conta; igual, abaixo ou nulo não',
  wall.wallV1PackCredited(0, 10) === true && wall.wallV1PackCredited(10, 10) === false && wall.wallV1PackCredited(10, 3) === false
  && wall.wallV1PackCredited(null, 10) === false && wall.wallV1PackCredited(10, null) === false)
check('[B14] as constantes da espera: chave, 2 s, 30 s',
  wall.WALL_V1_PACK_BALANCE_KEY === 'kineo_wall_v1_pack_balance' && wall.WALL_V1_PACK_POLL_MS === 2000 && wall.WALL_V1_PACK_POLL_MAX_MS === 30000)

console.log(`\n${ok} verificacoes OK, ${fail} falharam`)
if (fail) { console.error('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
