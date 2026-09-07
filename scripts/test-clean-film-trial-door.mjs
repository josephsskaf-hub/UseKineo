// KINEO-TRIAL-1DOLAR-NA-ENTREGA-2026-09-07 — contrato da porta de $1 na tela de
// filme pronto. Sem rede, sem banco, sem credencial, sem escrita.
//
// POR QUE ESTE GUARDIAO EXISTE: a caixa comercial foi vista por 241 pessoas em
// 60 dias e o ULTIMO clique no botao dela e de 22/08 — desde entao 35 pessoas,
// 37 impressoes, ZERO cliques. A porta de $1 entra na frente. O risco que ela
// cria e ANUNCIAR um preco que o cobrador nao vai praticar, e e exatamente
// isso que este arquivo prova que nao acontece.
//
// Tres coisas sao verificadas, nesta ordem:
//   1. o modulo puro, compilado e AVALIADO (nunca importado com alias `@/` —
//      memoria: guardioes-com-alias-nao-rodam);
//   2. a MONTAGEM na tela, amarrada as VARIAVEIS que decidem, nao ao texto
//      (memoria: guardiao-que-conta-texto-nao-prova-condicao);
//   3. o TRIPWIRE de deriva: os literais que a rota da Stripe cobra tem que
//      continuar iguais as constantes que a tela anuncia (memoria:
//      campo-validado-gravado-ecoado-nao-e-campo-honrado).
//
// E cada guarda e falsificada por MUTACAO, com prova de que a mutacao foi
// mesmo escrita (memoria: mutacao-precisa-provar-que-aplicou).

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const MODULE_PATH = join(root, 'lib/growth/cleanFilmTrialDoor.ts')
const CLIENT_PATH = join(root, 'app/(dashboard)/generate/GenerateClient.tsx')
const COMPONENT_PATH = join(root, 'components/CleanFilmTrialDoor.tsx')
const PRICING_PATH = join(root, 'lib/checkoutPricing.ts')
const CHECKOUT_ROUTE_PATH = join(root, 'app/api/stripe/checkout/route.ts')

// Comentario e prosa, nao promessa. O stripper tem de tirar TAMBEM os blocos
// /** */ — a primeira versao deste guardiao so tirava `//` e ficou vermelha por
// causa de uma frase explicativa. Falso vermelho e perigoso: e o que faz alguem
// afrouxar a trava em vez de ler o que ela diz.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

// TODA leitura passa por aqui. O `.gitattributes` entrega estes arquivos com
// CRLF no Windows, e qualquer ancora que atravesse duas linhas com `\n` deixa
// de casar — o guardiao fica vermelho sem que uma linha do produto mude. O
// guardiao irmao (test-post-delivery-slot) sangrou exatamente esse falso
// vermelho por um dia (memoria: guardiao-crlf-falso-vermelho).
function read(path) {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
}

let pass = 0
let fail = 0
function check(label, condition) {
  if (condition) {
    pass += 1
  } else {
    fail += 1
    console.error(`  ✗ ${label}`)
  }
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

function loadModule(source) {
  const temp = mkdtempSync(join(tmpdir(), 'kineo-trialdoor-'))
  const sourceDir = join(temp, 'src')
  const outDir = join(temp, 'out')
  mkdirSync(sourceDir, { recursive: true })
  writeFileSync(join(sourceDir, 'cleanFilmTrialDoor.ts'), source)
  execFileSync(process.execPath, [
    findTsc(root),
    join(sourceDir, 'cleanFilmTrialDoor.ts'),
    '--outDir', outDir,
    '--rootDir', sourceDir,
    '--module', 'commonjs',
    '--target', 'es2022',
    '--moduleResolution', 'node',
    '--strict',
    '--skipLibCheck',
  ], { stdio: 'pipe' })
  writeFileSync(join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))
  const requireFromTemp = createRequire(join(outDir, 'runner.cjs'))
  return requireFromTemp(join(outDir, 'cleanFilmTrialDoor.js'))
}

const ORIGINAL = read(MODULE_PATH)
const mod = loadModule(ORIGINAL)

// O caso base e o cliente REAL desta rotacao: trial ativo, filme entregue com
// marca d'agua, dolar resolvido, nunca pagou.
const BASE = {
  slotOwner: 'commercial_ask',
  hasPaid: false,
  entryFeeLabel: '$1.00',
  monthlyLabel: '$15.00',
  unlocksCurrentFilm: true,
  grantCredits: 80,
  trialDays: 7,
}

console.log('\n── 1. A porta abre para quem o cobrador aceita ──')
{
  const d = mod.decideCleanFilmTrialDoor(BASE)
  check('visivel no caso base', d.visible === true)
  check('reason ok', d.reason === 'ok')
  check('o botao lidera com o filme na mao', /Get this film clean/.test(d.buttonLabel))
  check('o botao nomeia os 7 dias', /7 days/.test(d.buttonLabel))
  check('o botao nomeia a taxa de entrada', d.buttonLabel.includes('$1.00'))
  check('a nota diz o que sai hoje', d.priceNote.includes('$1.00 today'))
  check('a nota diz os creditos concedidos', d.priceNote.includes('80 credits now'))
  check('a nota diz a mensalidade do dia 8', /then \$15\.00\/month from day 8/.test(d.priceNote))
  check('a nota promete cancelamento', /cancel anytime/.test(d.priceNote))
  check('a nota NAO promete motor nem fila', !/priority|unlimited|engine/i.test(d.priceNote))
}

console.log('── 2. Trava 1: quem ja pagou nao ve $1 (o servidor cobraria cheio) ──')
{
  const d = mod.decideCleanFilmTrialDoor({ ...BASE, hasPaid: true })
  check('invisivel para has_paid', d.visible === false)
  check('reason already_paid', d.reason === 'already_paid')
  check('sem rotulo de botao', d.buttonLabel === null)
  check('sem nota de preco', d.priceNote === null)
}

console.log('── 3. Trava 2: a porta so existe dentro da caixa comercial ──')
{
  for (const owner of ['balance_bridge', 'repeat_episode', 'plan_fit', null]) {
    const d = mod.decideCleanFilmTrialDoor({ ...BASE, slotOwner: owner })
    check(`invisivel quando o slot e ${String(owner)}`, d.visible === false)
    check(`reason not_slot_owner para ${String(owner)}`, d.reason === 'not_slot_owner')
  }
}

console.log('── 4. Trava 3: sem moeda resolvida nao ha promessa honesta ──')
{
  const semEntrada = mod.decideCleanFilmTrialDoor({ ...BASE, entryFeeLabel: null })
  check('invisivel sem rotulo de entrada', semEntrada.visible === false)
  check('reason price_unresolved (entrada)', semEntrada.reason === 'price_unresolved')
  const semMensal = mod.decideCleanFilmTrialDoor({ ...BASE, monthlyLabel: null })
  check('invisivel sem rotulo mensal', semMensal.visible === false)
  check('reason price_unresolved (mensal)', semMensal.reason === 'price_unresolved')
  // Moeda nao-dolar: o rotulo entra pronto e o modulo NUNCA digita cifrao.
  const brl = mod.decideCleanFilmTrialDoor({ ...BASE, entryFeeLabel: 'R$ 1,00', monthlyLabel: 'R$ 15,00' })
  check('visivel em BRL', brl.visible === true)
  check('o botao usa o rotulo BRL recebido', brl.buttonLabel.includes('R$ 1,00'))
  check('a nota usa o rotulo BRL recebido', brl.priceNote.includes('R$ 15,00'))
  check('nenhum cifrao de dolar digitado no modulo', !/\$\d/.test(stripComments(ORIGINAL)))
}

console.log('── 5. O filme limpo muda a manchete, nao a promessa ──')
{
  const d = mod.decideCleanFilmTrialDoor({ ...BASE, unlocksCurrentFilm: false })
  check('visivel com filme ja limpo', d.visible === true)
  check('usa a frase literal do fundador', d.buttonLabel.startsWith('Try Creator 7 days for '))
  check('nao promete limpar um filme que ja esta limpo', !/clean/i.test(d.buttonLabel))
  check('a nota de preco continua identica', d.priceNote === mod.decideCleanFilmTrialDoor(BASE).priceNote)
}

console.log('── 6. Os numeros vem de fora; o modulo nao os inventa ──')
{
  const d = mod.decideCleanFilmTrialDoor({ ...BASE, grantCredits: 40, trialDays: 3 })
  check('creditos ecoam a entrada', d.priceNote.includes('40 credits now'))
  check('dias ecoam a entrada no botao', /3 days/.test(d.buttonLabel))
  check('o dia da cobranca deriva dos dias (3 → day 4)', /from day 4/.test(d.priceNote))
}

console.log('── 7. MUTACAO: cada guarda tem dentes ──')
{
  const mutants = [
    {
      label: 'a trava de has_paid',
      from: 'if (input.hasPaid) return blocked(\'already_paid\')',
      to: 'if (false) return blocked(\'already_paid\')',
      breaks: (m) => m.decideCleanFilmTrialDoor({ ...BASE, hasPaid: true }).visible === true,
    },
    {
      label: 'a trava do dono do slot',
      from: "if (input.slotOwner !== 'commercial_ask') return blocked('not_slot_owner')",
      to: "if (false) return blocked('not_slot_owner')",
      breaks: (m) => m.decideCleanFilmTrialDoor({ ...BASE, slotOwner: 'balance_bridge' }).visible === true,
    },
    {
      label: 'a trava de preco nao resolvido',
      from: "if (!input.entryFeeLabel || !input.monthlyLabel) return blocked('price_unresolved')",
      to: "if (false) return blocked('price_unresolved')",
      breaks: (m) => m.decideCleanFilmTrialDoor({ ...BASE, entryFeeLabel: null }).visible === true,
    },
  ]
  for (const mutant of mutants) {
    check(`o alvo da mutacao existe: ${mutant.label}`, ORIGINAL.includes(mutant.from))
    const mutated = ORIGINAL.replace(mutant.from, mutant.to)
    // Prova que a mutacao foi ESCRITA. Sem isto, um mutante que nao aplicou
    // devolve verde e se le como guarda resistindo.
    check(`a mutacao foi aplicada: ${mutant.label}`, mutated !== ORIGINAL && mutated.includes(mutant.to))
    let broke = false
    try {
      broke = mutant.breaks(loadModule(mutated))
    } catch {
      broke = true
    }
    check(`removida, ${mutant.label} deixa a porta mentir`, broke)
  }
}

console.log('── 8. A tela monta a porta e passa as variaveis que decidem ──')
{
  const client = read(CLIENT_PATH)
  check('a tela importa a decisao', /import\s*\{\s*decideCleanFilmTrialDoor\s*\}\s*from\s*'@\/lib\/growth\/cleanFilmTrialDoor'/.test(client))
  check('a tela importa o componente', /import\s+CleanFilmTrialDoor\s+from\s+'@\/components\/CleanFilmTrialDoor'/.test(client))
  check('o componente e montado', /<CleanFilmTrialDoor\b/.test(client))
  // As quatro amarras que impedem a porta de divergir do cobrador.
  check('slotOwner vem do dono real do slot', /slotOwner:\s*postDeliverySlotOwner/.test(client))
  check('hasPaid e a coluna do cobrador, nao um literal', /\n\s*hasPaid,/.test(client))
  check('a taxa de entrada sai de formatCheckoutMoney', /formatCheckoutMoney\(postVideoCurrency,\s*CARD_TRIAL_ENTRY_FEE_MINOR\)/.test(client))
  check('a mensalidade sai de getTierPrice basic', /formatCheckoutMoney\(postVideoCurrency,\s*getTierPrice\('basic',\s*postVideoCurrency,\s*postVideoRegion\)\)/.test(client))
  check('os creditos vem da constante partilhada', /grantCredits:\s*CARD_TRIAL_GRANT_CREDITS/.test(client))
  check('os dias vem da constante partilhada', /trialDays:\s*CARD_TRIAL_DAYS/.test(client))
  check('nenhum preco digitado a mao na porta', !/Try Creator 7 days for \$1/.test(client))

  // O checkout: tier certo, trial ligado, e o resgate do filme limpo.
  check('a porta chama o checkout com tier=basic e trial=1', /tier=basic&billing=monthly&trial=1/.test(client))
  check('a porta pede return=wm quando o filme esta marcado', /trial=1\$\{trialPrimaryUnlocksCurrentFilm \? '&return=wm' : ''\}/.test(client))
  check('a porta NAO empilha intro=1 sobre o trial', !/trial=1&intro=1/.test(client) && !/intro=1&billing=monthly&trial=1/.test(client))
  check('a porta faz o handoff do filme antes de navegar', /if \(!prepareTrialCleanCheckout\('monthly'\)\) return\n\s*\/\/ A URL e a MESMA|prepareTrialCleanCheckout\('monthly'\)/.test(client))
  check('a porta emite o evento que o fundador le', /trackEvent\('pricing_trial_1usd_clicked'/.test(client))
  check('o evento separa a superficie', /surface:\s*'post_video_clean_film'/.test(client))

  // O botao de plano continua vivo e visivel — ordem do fundador.
  check('o botao de plano continua montado', /Continue creating on \$\{ladderPrimaryPlanLabel\}/.test(client))
  check('o botao de plano so perde o preenchimento quando a porta aparece', /background:\s*cleanFilmTrialDoor\.visible\n?\s*\?\s*'transparent'/.test(client))
  check('o botao de plano nao e escondido por display/hidden', !/cleanFilmTrialDoor\.visible\s*&&\s*null/.test(client))
}

console.log('── 9. O componente pinta o que a decisao mandou ──')
{
  const comp = read(COMPONENT_PATH)
  check('nao renderiza quando invisivel', /if \(!decision\.visible \|\| !decision\.buttonLabel\) return null/.test(comp))
  check('o rotulo do botao vem da decisao', /\{pending \? 'Opening checkout…' : decision\.buttonLabel\}/.test(comp))
  check('a nota de preco vem da decisao', /\{decision\.priceNote\}/.test(comp))
  check('emite a impressao', /trackEvent\('post_video_trial_1usd_shown'/.test(comp))
  check('respeita o pending do checkout partilhado', /disabled=\{pending\}/.test(comp))
  check('nenhum preco digitado a mao no componente', !/\$\d/.test(stripComments(comp)))
}

console.log('── 10. TRIPWIRE: a tela e o cobrador tem que dizer o mesmo numero ──')
{
  const pricing = read(PRICING_PATH)
  const route = read(CHECKOUT_ROUTE_PATH)

  const sharedFee = /export const CARD_TRIAL_ENTRY_FEE_MINOR = (\d+)/.exec(pricing)
  const sharedDays = /export const CARD_TRIAL_DAYS = (\d+)/.exec(pricing)
  const sharedCredits = /export const CARD_TRIAL_GRANT_CREDITS = (\d+)/.exec(pricing)
  check('a constante da taxa existe', Boolean(sharedFee))
  check('a constante dos dias existe', Boolean(sharedDays))
  check('a constante dos creditos existe', Boolean(sharedCredits))

  // Os literais que a rota REALMENTE cobra. Se alguem mudar um deles sem mexer
  // na tabela partilhada, a vitrine passa a anunciar um preco que nao existe —
  // e este guardiao fica vermelho antes de o cliente descobrir.
  const routeFee = /const TRIAL_ENTRY_FEE_CENTS = (\d+)/.exec(route)
  const routeDays = /const TRIAL_DAYS = (\d+)/.exec(route)
  check('a rota ainda declara a taxa de entrada', Boolean(routeFee))
  check('a rota ainda declara os dias de trial', Boolean(routeDays))
  check(
    `taxa anunciada (${sharedFee?.[1]}) == taxa cobrada (${routeFee?.[1]})`,
    Boolean(sharedFee && routeFee) && sharedFee[1] === routeFee[1],
  )
  check(
    `dias anunciados (${sharedDays?.[1]}) == dias cobrados (${routeDays?.[1]})`,
    Boolean(sharedDays && routeDays) && sharedDays[1] === routeDays[1],
  )
  check('a rota concede os creditos da tabela partilhada', /CARD_TRIAL_GRANT_CREDITS/.test(read(join(root, 'app/api/stripe/webhook/route.ts'))))

  // O tier do trial e `basic` no servidor. A porta anuncia Creator: se o
  // servidor trocar de tier, a tela passa a prometer o plano errado.
  check('o tier do trial no servidor continua basic', /const TRIAL_TIER = 'basic'/.test(route))
  check('o trial esta LIGADO no servidor', /const CARD_TRIAL_ENABLED = true/.test(route))
  check('o servidor recusa trial para quem ja pagou', /wantsTrial && \(profile as \{ has_paid\?: boolean \| null \} \| null\)\?\.has_paid === true/.test(route))
  check('o servidor so aceita trial no tier do trial', /tier === TRIAL_TIER/.test(route))
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} verificacoes passaram, ${fail} falharam\n`)
process.exit(fail === 0 ? 0 : 1)
