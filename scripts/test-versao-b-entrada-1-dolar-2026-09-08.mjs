// KINEO-VERSAO-B-ENTRADA-1-DOLAR-2026-09-08 — guardião da porta única.
// Ordem do fundador (08/09 01:20 BRT): "tirar os 25 créditos de todos; dar os
// 80 do Creator por $1; se usarem ou depois de 1 semana viram cliente a $15".
// Estilo da casa: readFileSync + contagem (nunca assert que mata a suíte), e a
// oferta é EXECUTADA (vm) para provar o interruptor, não só lida.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
function checa(nome, cond) { if (cond) ok++; else falhas.push(nome) }

// ── carregador mínimo: transpila .ts e resolve './x' e '@/lib/x'; stubs para o resto
function carregar(file, stubs = {}) {
  const cache = new Map()
  function load(f) {
    if (cache.has(f)) return cache.get(f)
    const exports = {}
    cache.set(f, exports)
    const dir = dirname(f)
    const require = (id) => {
      if (stubs[id]) return stubs[id]
      let alvo = null
      if (id.startsWith('@/')) alvo = id.slice(2)
      else if (id.startsWith('./') || id.startsWith('../')) alvo = join(dir, id).replace(/\\/g, '/')
      if (!alvo) throw new Error('dependencia inesperada ' + id)
      if (!alvo.endsWith('.ts')) alvo += '.ts'
      return load(alvo)
    }
    const src = ts.transpileModule(readFileSync(join(RAIZ, f), 'utf8'), { compilerOptions: { module: 1, target: 9 } }).outputText
    vm.runInNewContext(src, { exports, require, process: { env: {} }, console }, { filename: f })
    return exports
  }
  return load(file)
}

console.log('== 1. a política ==')
const pol = rd('lib/entryPolicy.ts')
const P = carregar('lib/entryPolicy.ts')
checa('CARD_ENTRY_ONLY é true (versão B ligada)', P.CARD_ENTRY_ONLY === true)
checa("status da porta é 'card_required'", P.CARD_ENTRY_TRIAL_STATUS === 'card_required')
checa('checkout da porta é o trial do Creator mensal', /tier=basic&billing=monthly&trial=1/.test(P.CARD_ENTRY_CHECKOUT_PATH))
const cp = rd('lib/checkoutPricing.ts')
checa('taxa de entrada no código é 100 centavos', /CARD_TRIAL_ENTRY_FEE_MINOR\s*=\s*100\b/.test(cp))
checa('trial de cartão dura 7 dias', /CARD_TRIAL_DAYS\s*=\s*7\b/.test(cp))
checa('trial de cartão concede 80', /CARD_TRIAL_GRANT_CREDITS\s*=\s*80\b/.test(cp))
checa('Creator mensal custa 2900 (planos V7 de 09/09)', /basic:\s*\{\s*usd:\s*2900\s*\}/.test(cp))
checa('copy da porta fala $1, 7 days, 80 credits e $29', ['$1', '7 days', '80 credits', '$29'].every((t) => P.CARD_ENTRY_COPY.sentence.includes(t) || P.CARD_ENTRY_COPY.headline.includes(t)))
checa('a política é pura (sem env, sem cliente de banco, sem import)', !/process\.env|@supabase|createClient|^import /m.test(pol))

console.log('== 2. a oferta executada ==')
const engineCostStub = { creditCostForDuration: () => 15 }
const F = carregar('lib/freeTierOffer.ts', { './credits/engineCost': engineCostStub })
const offOn = F.buildFreeTierOffer(true)
const offOff = F.buildFreeTierOffer(false)
checa('flag ON devolve a oferta da porta (cardEntry)', offOn.cardEntry === true)
checa('flag OFF também (o interruptor vence a env)', offOff.cardEntry === true)
checa('zero Fast grátis (limit 0)', offOn.limit === 0)
checa('reverseTrial true para os call sites ft() caírem no ramo ON', offOn.reverseTrial === true)
checa('copy curta vira chip da porta', F.swapFreeTierCopy(offOn, '3 free videos / 24h', 'Free trial — 25 credits') === offOn.copy.chip)
checa('copy longa vira sentença da porta', F.swapFreeTierCopy(offOn, 'Create, download and share up to 3 watermarked Fast videos every 24h, no card.', 'x'.repeat(80)) === offOn.copy.sentence)
checa('nenhuma copy da porta fala em free credits', !Object.values(offOn.copy).some((s) => /free credits|no card|25 credits/i.test(s)))
checa('402 do compose vende a porta', /\$1/.test(offOn.copy.limitHitError))
// mutante: com o interruptor desligado (stub de ./entryPolicy), a oferta antiga volta intacta
const mut = carregar('lib/freeTierOffer.ts', { './credits/engineCost': engineCostStub, './entryPolicy': { CARD_ENTRY_COPY: P.CARD_ENTRY_COPY, CARD_ENTRY_ONLY: false } })
checa('interruptor desligado → versão A volta (limit 1, sem cardEntry)', mut.buildFreeTierOffer(true).limit === 1 && mut.buildFreeTierOffer(true).cardEntry === false)
checa('interruptor desligado → OFF legado intacto (3/24h)', mut.buildFreeTierOffer(false).limit === 3)

console.log('== 3. o grant morreu ==')
const rt = rd('lib/reverseTrial.ts')
const iBranch = rt.indexOf('if (CARD_ENTRY_ONLY) {')
const iGrant = rt.indexOf('const variant = trialVariantFor(args.userId)')
checa('ramo da porta existe em maybeActivateReverseTrial', iBranch > 0)
checa('ramo vem ANTES do grant (nunca concede 25)', iBranch > 0 && iGrant > iBranch)
checa('carimba card_required de forma idempotente', /update\(\{ trial_status: CARD_ENTRY_TRIAL_STATUS \}\)[\s\S]{0,120}\.is\('trial_status', null\)/.test(rt))
checa("devolve reason 'card_entry_only'", /reason: 'card_entry_only'/.test(rt))
checa('emite o evento da porta', /name: CARD_ENTRY_REQUIRED_EVENT/.test(rt))
checa('card_required fica FORA dos status abertos (e-mails de trial calados)', /TRIAL_OPEN_STATUSES = \['active', 'expired'\] as const/.test(rt))

console.log('== 4. quem obedece ==')
const wh = rd('app/api/stripe/webhook/route.ts')
checa('webhook converte card_required quando o $1 é pago', /\.in\('trial_status', \['active', 'expired', CARD_ENTRY_TRIAL_STATUS\]\)/.test(wh))
const lay = rd('app/(dashboard)/layout.tsx')
checa('layout lê trial_status e has_paid', /select\('is_pro, email, trial_status, has_paid(, [a-z_, ]+)?'\)/.test(lay))
checa('layout monta o CardEntryBanner', /<CardEntryBanner/.test(lay))
const ban = rd('components/CardEntryBanner.tsx')
checa('banner só aparece sem pagamento: card_required, ou sem carimbo com saldo 0', /!hasPaid && \(status === CARD_ENTRY_TRIAL_STATUS \|\| semCarimboMasSemCredito\)/.test(ban))
checa('banner decide preço pela fonte única', /decideTrialDoorOffer\(/.test(ban))
checa('banner lança o checkout da porta', /checkout\.launch\('basic', CARD_ENTRY_CHECKOUT_PATH/.test(ban))
const comp = rd('app/api/compose/route.ts')
checa('compose recusa Fast grátis acima do limite (0)', /reservedOrCompleted > FREE_OFFER\.limit/.test(comp) && /const FREE_OFFER = getFreeTierOffer\(\)/.test(comp))
const home = rd('app/KineoLanding.tsx')
checa('home não diz mais "Start free"', !/<UiLabel>Start free<\/UiLabel>|: 'Start free'\}/.test(home))
checa('home usa o CTA da porta', (home.match(/CARD_ENTRY_COPY\.ctaShort/g) || []).length >= 4)
const facts = rd('lib/kineoFacts.ts')
checa('/api/facts diz que cartão é obrigatório', /creditCardRequired: CARD_ENTRY_ONLY,/.test(facts))
const llms = rd('app/llms.txt/route.ts')
checa('llms.txt deixa de anunciar free tier sem cartão', /CARD_ENTRY_ONLY \? '## What a new account gets \(\$1 trial/.test(llms) && !/^- No credit card required\.$/m.test(llms))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — versão B: a única entrada é o trial de $1')
