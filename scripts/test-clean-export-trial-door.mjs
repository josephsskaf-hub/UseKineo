// KINEO-1DOLAR-NA-CAIXA-DE-EXPORT-2026-09-07 — a porta de $1 na SEGUNDA caixa
// que pede dinheiro pelo mesmo filme. Sem rede, sem banco, sem credencial.
//
// POR QUE ESTE GUARDIAO EXISTE. A ordem do fundador das 16:40 nomeia a "caixa
// de export limpo" entre as superficies onde o trial pago passa a ser a
// primeira opcao — e ela era a unica das nomeadas que ainda so oferecia
// assinatura mensal cheia e o avulso. A coorte dela acabou de crescer: a
// rotacao #8 (`651f28f4`) pos marca d'agua no Seedance de conta gratis
// nao-pagante, ~236 pessoas/30d, e essa gente NAO esta em trial — ela nunca
// cruza a caixa comercial do slot, so esta.
//
// O QUE ELE TRAVA, e cada uma custou dinheiro nesta casa uma vez:
//   · a porta so aparece DENTRO de uma caixa que ja vende (lista fechada);
//   · a promessa "este filme limpo" so sai com o handoff na mao;
//   · a tela nunca digita preco (tudo vem das constantes partilhadas);
//   · os dois botoes que ja estavam na caixa continuam la (K1: quem quer o
//     gratis leva o gratis, e o plano nunca e escondido);
//   · a porta usa o MESMO hook de checkout da caixa — dois `pending`
//     independentes no mesmo cartao deixam disparar dois checkouts.
//
// Leitura com CRLF normalizado (memoria: guardiao-crlf-falso-vermelho) e todo
// mutante prova que foi escrito antes de exigir vermelho (memoria:
// mutacao-precisa-provar-que-aplicou).

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const MODULE_PATH = join(root, 'lib/growth/cleanFilmTrialDoor.ts')
const CLIENT_PATH = join(root, 'app/(dashboard)/generate/GenerateClient.tsx')
const CHECKOUT_ROUTE_PATH = join(root, 'app/api/stripe/checkout/route.ts')

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

let pass = 0
let fail = 0
const check = (label, condition) => {
  if (condition) { pass += 1 } else { fail += 1; console.error(`  ✗ ${label}`) }
}

function findTsc(base) {
  let dir = base
  for (let depth = 0; depth < 8; depth++) {
    const candidate = join(dir, 'node_modules', 'typescript', 'bin', 'tsc')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('TypeScript compiler not found')
}

// O modulo REAL e compilado e avaliado. Nunca importado com alias `@/` — com
// alias ele morreria antes da 1a verificacao (memoria: guardioes-com-alias-nao-rodam).
function loadModule(source) {
  const temp = mkdtempSync(join(tmpdir(), 'kineo-exportdoor-'))
  const sourceDir = join(temp, 'src')
  const outDir = join(temp, 'out')
  mkdirSync(sourceDir, { recursive: true })
  writeFileSync(join(sourceDir, 'cleanFilmTrialDoor.ts'), source)
  execFileSync(process.execPath, [
    findTsc(root),
    join(sourceDir, 'cleanFilmTrialDoor.ts'),
    '--outDir', outDir,
    '--module', 'commonjs',
    '--target', 'es2020',
  ], { stdio: 'pipe' })
  return createRequire(import.meta.url)(join(outDir, 'cleanFilmTrialDoor.js'))
}

const BASE = {
  slotOwner: 'clean_export',
  hasPaid: false,
  entryFeeLabel: '$1.00',
  monthlyLabel: '$15.00',
  unlocksCurrentFilm: true,
  grantCredits: 80,
  trialDays: 7,
}

const moduleSource = read(MODULE_PATH)
const mod = loadModule(moduleSource)

console.log('── 1. a caixa de export limpo hospeda a porta ──')
check('a lista de hospedeiros tem exatamente as duas caixas que vendem',
  Array.isArray(mod.HOST_BOXES) && mod.HOST_BOXES.length === 2 &&
  mod.HOST_BOXES.includes('commercial_ask') && mod.HOST_BOXES.includes('clean_export'))
check('clean_export abre a porta', mod.decideCleanFilmTrialDoor(BASE).visible === true)
check('commercial_ask continua abrindo (a caixa da fv-r6 nao regrediu)',
  mod.decideCleanFilmTrialDoor({ ...BASE, slotOwner: 'commercial_ask' }).visible === true)
check('a ponte de saldo NAO hospeda a porta',
  mod.decideCleanFilmTrialDoor({ ...BASE, slotOwner: 'balance_bridge' }).visible === false)
check('superficie desconhecida NAO hospeda a porta',
  mod.decideCleanFilmTrialDoor({ ...BASE, slotOwner: 'qualquer_coisa' }).visible === false)
check('sem caixa nenhuma a porta some',
  mod.decideCleanFilmTrialDoor({ ...BASE, slotOwner: null }).visible === false)
check('o motivo do bloqueio continua auditavel',
  mod.decideCleanFilmTrialDoor({ ...BASE, slotOwner: null }).reason === 'not_slot_owner')

console.log('── 2. as tres travas de honestidade valem na caixa nova ──')
check('quem ja pagou nao ve a porta (o cobrador recusaria o trial)',
  mod.decideCleanFilmTrialDoor({ ...BASE, hasPaid: true }).visible === false)
check('sem moeda resolvida a porta some, nao chuta um dolar',
  mod.decideCleanFilmTrialDoor({ ...BASE, entryFeeLabel: null }).visible === false &&
  mod.decideCleanFilmTrialDoor({ ...BASE, monthlyLabel: null }).reason === 'price_unresolved')
check('com handoff, a porta promete ESTE filme',
  /this film clean/i.test(mod.decideCleanFilmTrialDoor(BASE).buttonLabel || ''))
check('sem handoff, a porta NAO promete o arquivo — cai no rotulo neutro',
  !/this film clean/i.test(
    mod.decideCleanFilmTrialDoor({ ...BASE, unlocksCurrentFilm: false }).buttonLabel || ''))
check('a nota de preco diz hoje, o dia 8 e o cancelamento',
  /1\.00 today/.test(mod.decideCleanFilmTrialDoor(BASE).priceNote || '') &&
  /15\.00\/month from day 8/.test(mod.decideCleanFilmTrialDoor(BASE).priceNote || '') &&
  /cancel anytime/.test(mod.decideCleanFilmTrialDoor(BASE).priceNote || ''))
check('a moeda nao-dolar atravessa sem literal',
  /R\$5,00 today/.test(mod.decideCleanFilmTrialDoor({
    ...BASE, entryFeeLabel: 'R$5,00', monthlyLabel: 'R$79,90',
  }).priceNote || ''))

console.log('── 3. a montagem na caixa, amarrada as VARIAVEIS que decidem ──')
const client = read(CLIENT_PATH)
const clientCode = stripComments(client)
check('a decisao da caixa nova existe',
  /const cleanExportTrialDoor = decideCleanFilmTrialDoor\(\{/.test(clientCode))
check('o hospedeiro vem da variavel que guarda a propria caixa',
  /slotOwner: showPostVideoExportChoice \? 'clean_export' : null/.test(clientCode))
check('hasPaid e a coluna do cobrador, nao um literal',
  /const cleanExportTrialDoor = decideCleanFilmTrialDoor\(\{[\s\S]{0,300}?\n\s*hasPaid,/.test(clientCode))
check('a promessa do arquivo esta amarrada ao handoff real',
  /unlocksCurrentFilm: Boolean\(lastFastRenderRef\.current\)/.test(clientCode))
check('creditos e dias vem das constantes partilhadas',
  /const cleanExportTrialDoor = decideCleanFilmTrialDoor\(\{[\s\S]{0,700}?grantCredits: CARD_TRIAL_GRANT_CREDITS/.test(clientCode) &&
  /const cleanExportTrialDoor = decideCleanFilmTrialDoor\(\{[\s\S]{0,800}?trialDays: CARD_TRIAL_DAYS/.test(clientCode))
check('o componente e montado com a decisao da caixa nova',
  /<CleanFilmTrialDoor\n\s*decision=\{cleanExportTrialDoor\}/.test(clientCode))
check('a montagem usa o hook de checkout DA CAIXA (um pending so)',
  /decision=\{cleanExportTrialDoor\}\n\s*pending=\{wmCheckout\.pending !== null\}/.test(clientCode))
check('a montagem esta dentro do bloco da caixa de export limpo',
  clientCode.indexOf('{showPostVideoExportChoice && (') >= 0 &&
  clientCode.indexOf('decision={cleanExportTrialDoor}') >
    clientCode.indexOf('{showPostVideoExportChoice && ('))

console.log('── 4. a porta lidera, mas NAO esconde nada (K1) ──')
const mountAt = clientCode.indexOf('decision={cleanExportTrialDoor}')
const starterAt = clientCode.indexOf('onClick={handleRemoveWatermark}')
check('o botao de plano continua na caixa', starterAt >= 0)
check('a porta vem ANTES do botao de plano', mountAt >= 0 && mountAt < starterAt)
check('o avulso continua na caixa', /onClick=\{handleBuyThisVideoOnly\}/.test(clientCode))
check('o download gratis continua prometido na caixa',
  /Free export stays available/.test(client))

console.log('── 5. o checkout que a porta abre e o que o cobrador aceita ──')
check('a URL e a mesma do trial pago que /pricing usa',
  /\/api\/stripe\/checkout\?tier=basic&billing=monthly&trial=1&return=wm/.test(clientCode))
check('o handoff do filme e gravado antes de sair da pagina',
  /const startCleanExportTrialCheckout = \([\s\S]{0,120}?\) => \{[\s\S]{0,600}?localStorage\.setItem\('kineo_wm_unlock'/.test(clientCode))
check('o clique so e contado quando o checkout REALMENTE abriu',
  /const started = wmCheckout\.launch\([\s\S]{0,300}?\n\s*if \(!started\) return\n[\s\S]{0,200}?post_video_trial_1usd_clicked/.test(clientCode))
check('a superficie e distinguivel no evento partilhado',
  /surface: 'post_video_clean_export'/.test(clientCode))
// Os DOIS caminhos da caixa (direto depois do download / modal antes dele) tem
// de ser separaveis: juntos, a taxa vira media de dois momentos diferentes.
check('os dois caminhos da caixa sao carimbados na impressao',
  /host: 'direct_after_download'/.test(clientCode) &&
  /host: 'modal_before_download'/.test(clientCode))
check('o carimbo tambem viaja no clique',
  /post_video_trial_1usd_clicked', \{ \.\.\.cleanExportTrialDoorTelemetry, host \}/.test(clientCode) &&
  /surface: 'post_video_clean_export',\n\s*host,/.test(clientCode))
check('cada montagem passa o proprio caminho ao handler',
  /onStart=\{\(\) => startCleanExportTrialCheckout\('direct_after_download'\)\}/.test(clientCode) &&
  /onStart=\{\(\) => startCleanExportTrialCheckout\('modal_before_download'\)\}/.test(clientCode))
check('o evento partilhado da caixa comercial nao foi renomeado',
  /surface: 'post_video_clean_film'/.test(clientCode))

// TRIPWIRE contra o cobrador: a rota de checkout e de outra pista e nao pode
// ser editada por aqui — mas se ela mudar o tier ou desligar o trial, esta tela
// passa a anunciar uma coisa e a Stripe a cobrar outra.
const route = read(CHECKOUT_ROUTE_PATH)
console.log('── 6. TRIPWIRE: a tela e o cobrador falam do mesmo produto ──')
check('o cobrador ainda aceita o parametro do trial', /trial/.test(route))
check('o tier do trial no cobrador continua sendo o que a porta abre',
  /TRIAL_TIER\s*=\s*'basic'/.test(route) || /tier=basic/.test(clientCode))

console.log('── 7. mutantes ──')
const mutants = [
  {
    label: 'abrir a lista de hospedeiros (porta em qualquer superficie)',
    from: 'if (!HOST_BOXES.includes(input.slotOwner as (typeof HOST_BOXES)[number])) {',
    to: 'if (false) {',
    breaks: (m) => m.decideCleanFilmTrialDoor({ ...BASE, slotOwner: 'balance_bridge' }).visible === true,
  },
  {
    label: 'deixar a porta prometer o arquivo sem handoff',
    from: 'const buttonLabel = input.unlocksCurrentFilm',
    to: 'const buttonLabel = true',
    breaks: (m) => /this film clean/i.test(
      m.decideCleanFilmTrialDoor({ ...BASE, unlocksCurrentFilm: false }).buttonLabel || ''),
  },
  {
    label: 'esquecer quem ja pagou',
    from: "if (input.hasPaid) return blocked('already_paid')",
    to: "if (false) return blocked('already_paid')",
    breaks: (m) => m.decideCleanFilmTrialDoor({ ...BASE, hasPaid: true }).visible === true,
  },
  {
    label: 'chutar preco sem moeda resolvida',
    from: "if (!input.entryFeeLabel || !input.monthlyLabel) return blocked('price_unresolved')",
    to: "if (false) return blocked('price_unresolved')",
    breaks: (m) => m.decideCleanFilmTrialDoor({ ...BASE, entryFeeLabel: null }).visible === true,
  },
]

for (const mutant of mutants) {
  const applied = moduleSource.replace(mutant.from, mutant.to)
  // Prova de que a mutacao foi ESCRITA. Mutante que nao aplica devolve verde e
  // se le como guardiao resistindo.
  check(`o alvo da mutacao existe: ${mutant.label}`, moduleSource.includes(mutant.from))
  check(`a mutacao foi aplicada: ${mutant.label}`, applied !== moduleSource)
  if (applied === moduleSource) continue
  let broke = false
  try { broke = mutant.breaks(loadModule(applied)) } catch { broke = true }
  check(`mutado, o contrato quebra: ${mutant.label}`, broke)
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} verificacoes passaram, ${fail} falharam`)
process.exit(fail === 0 ? 0 : 1)
