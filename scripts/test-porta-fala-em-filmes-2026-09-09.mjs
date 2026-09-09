// KINEO-PORTA-1DOLAR-FALA-EM-FILMES-2026-09-09 — contrato da nota de capacidade
// da porta de $1. Sem rede, sem banco, sem credencial, sem escrita.
//
// POR QUE ESTE GUARDIAO EXISTE (medido em 08/09, contas externas, `events`):
// a coorte da versao B tem 8 pessoas e DUAS chegaram ao checkout — as duas ao
// PRECO CHEIO, nenhuma pela porta de $1. A jornada da primeira (`0da7e6b1`,
// 11:17 -> 11:18 UTC) mostra o modal de dinheiro aberto com `reason: 'credits'`,
// `upgrade_modal_trial_door_shown` na tela, e o clique saindo em
// `selection: 'starter'`. Ou seja: ela viu a porta de $1 e escolheu pagar $7.
//
// A explicacao esta na LINGUA de cada oferta, e o proprio codigo da casa ja
// tinha decidido qual vende. `planUnlockLine` (bloco K17 do GenerateClient)
// poe "o resultado antes da unidade interna" e escreve "2 AI films / month"
// nas linhas de plano. A porta de $1, 10px acima, dizia "80 credits now".
// Traduzido pela MESMA funcao: 3 filmes por $1 contra 2 filmes por $7.
//
// O QUE ESTE ARQUIVO PROVA, nesta ordem:
//   1. o modulo puro, compilado e AVALIADO (nunca importado com alias `@/` —
//      memoria: guardioes-com-alias-nao-rodam);
//   2. que a nota FALHA FECHADA — numero nao inteiro, nao positivo, ou maior
//      que os creditos concedidos nao viram promessa nenhuma;
//   3. que as duas telas DERIVAM o numero da fonte canonica em vez de digitar
//      (memoria: ausencia-da-forma-velha-nao-e-ausencia-do-valor);
//   4. que a copy antiga sobreviveu byte a byte — a nota SOMA, nao substitui;
//   5. que a impressao carrega o veredito, senao zero clique nao distingue
//      "ninguem quis" de "nunca apareceu" (memoria:
//      evento-de-impressao-nao-prova-o-conteudo).

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CORE_PATH = join(root, 'lib/growth/cleanFilmTrialDoor.ts')
const MODAL_PATH = join(root, 'components/UpgradeModalTrialDoor.tsx')
const BANNER_PATH = join(root, 'components/CardEntryBanner.tsx')
const CLIENT_PATH = join(root, 'app/(dashboard)/generate/GenerateClient.tsx')
const WEBHOOK_PATH = join(root, 'app/api/stripe/webhook/route.ts')
const MARKETING_PATH = join(root, 'lib/marketingPrice.ts')

// CRLF: o `.gitattributes` entrega estes arquivos com \r\n no Windows e
// qualquer ancora de duas linhas para de casar (memoria:
// guardiao-crlf-falso-vermelho).
function read(path) {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

let pass = 0
let fail = 0
function check(label, condition) {
  if (condition) {
    pass += 1
  } else {
    fail += 1
    console.error(`  x ${label}`)
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

function loadCore(source) {
  const temp = mkdtempSync(join(tmpdir(), 'kineo-filmes-'))
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

const CORE = read(CORE_PATH)
const MODAL = read(MODAL_PATH)
const BANNER = read(BANNER_PATH)
const CLIENT = read(CLIENT_PATH)
const mod = loadCore(CORE)

// O caso real da rotacao: conta card_required, saldo zero, dolar resolvido,
// nunca pagou, e a caixa de dinheiro aberta sem filme em foco.
const BASE = {
  hasPaid: false,
  entryFeeLabel: '$1.00',
  monthlyLabel: '$15.00',
  grantCredits: 80,
  trialDays: 7,
  unlocksCurrentFilm: false,
}

console.log('\n-- 1. A nota diz o RESULTADO, e o resultado vem de quem chama --')
{
  const d = mod.decideTrialDoorOffer({ ...BASE, filmsNow: 3 })
  check('a porta continua visivel', d.visible === true)
  check('a nota existe quando o chamador sabe a conta', d.capacityNote !== null)
  check('a nota nomeia a quantidade de filmes', d.capacityNote.startsWith('3 AI films'))
  check('a nota nomeia a taxa de entrada FORMATADA', d.capacityNote.includes('$1.00'))
  check('a nota nao inventa periodicidade', !/month|week|day/i.test(d.capacityNote))
  check('a nota nao promete motor nem fila', !/priority|unlimited|engine/i.test(d.capacityNote))
}
{
  // O numero nao e do modulo: trocar a entrada troca a saida inteira. E o que
  // separa "derivado" de "digitado" (memoria: superficie-medida-por-copia-da-regra).
  const um = mod.decideTrialDoorOffer({ ...BASE, filmsNow: 1 })
  check('1 filme vira singular', um.capacityNote === '1 AI film for $1.00')
  const outro = mod.decideTrialDoorOffer({ ...BASE, filmsNow: 6, entryFeeLabel: 'R$ 5,00' })
  check('a nota acompanha a moeda de quem compra', outro.capacityNote === '6 AI films for R$ 5,00')
}

console.log('-- 2. Falha fechada: numero suspeito nao vira promessa --')
{
  const casos = [
    ['ausente', undefined],
    ['nulo', null],
    ['zero', 0],
    ['negativo', -2],
    ['fracionario', 2.5],
    ['NaN', Number.NaN],
    ['infinito', Number.POSITIVE_INFINITY],
    ['texto', '3'],
    ['acima dos creditos concedidos', 81],
  ]
  for (const [nome, valor] of casos) {
    const d = mod.decideTrialDoorOffer({ ...BASE, filmsNow: valor })
    check(`filmsNow ${nome} nao gera nota`, d.capacityNote === null)
    check(`filmsNow ${nome} nao derruba a porta`, d.visible === true && d.buttonLabel !== null)
  }
}

console.log('-- 3. A copy antiga sobreviveu byte a byte: a nota SOMA --')
{
  const sem = mod.decideTrialDoorOffer(BASE)
  const com = mod.decideTrialDoorOffer({ ...BASE, filmsNow: 3 })
  check('mesmo botao com e sem a nota', sem.buttonLabel === com.buttonLabel)
  check('mesma nota de preco com e sem a nota', sem.priceNote === com.priceNote)
  check('o botao continua o de sempre', com.buttonLabel === 'Try Creator 7 days for $1.00 →')
  check(
    'a nota de preco continua a de sempre',
    com.priceNote === '$1.00 today · 80 credits now · then $15.00/month from day 8 · cancel anytime',
  )
  // A porta do pos-video delega o miolo e NAO ganhou campo novo: quem depende
  // dela nao pode quebrar.
  const pos = mod.decideCleanFilmTrialDoor({ ...BASE, slotOwner: 'commercial_ask', unlocksCurrentFilm: true })
  check('a porta do pos-video continua respondendo', pos.visible === true && pos.buttonLabel !== null)
}

console.log('-- 4. As travas de honestidade continuam mandando na nota --')
{
  const pago = mod.decideTrialDoorOffer({ ...BASE, filmsNow: 3, hasPaid: true })
  check('quem ja pagou nao ve a porta', pago.visible === false && pago.reason === 'already_paid')
  check('nem a nota de capacidade', pago.capacityNote === null)
  const semPreco = mod.decideTrialDoorOffer({ ...BASE, filmsNow: 3, entryFeeLabel: null })
  check('sem moeda resolvida nao ha porta', semPreco.visible === false && semPreco.reason === 'price_unresolved')
  check('nem nota, porque ela carrega o preco', semPreco.capacityNote === null)
}

console.log('-- 5. As duas telas DERIVAM o numero; nenhuma digita --')
{
  const modalSemComentario = stripComments(MODAL)
  const bannerSemComentario = stripComments(BANNER)
  const clientSemComentario = stripComments(CLIENT)

  check(
    'o modal calcula com a mesma funcao e a mesma constante',
    /const filmsNow = videosForCredits\(CARD_TRIAL_GRANT_CREDITS, 'cinematic_ai'\)/.test(modalSemComentario),
  )
  check('o modal importa a conta canonica', /import \{ videosForCredits \} from '@\/lib\/marketingPrice'/.test(MODAL))
  // A tela que HOSPEDA a caixa nao ganhou linha nenhuma. A trava #47 do Codex
  // (scripts/test-next-door-bar.mjs) reprova qualquer linha NOVA no
  // GenerateClient que toque preco/upgrade/checkout — e ela esta certa: esta
  // conta pertence a peca, nao ao pai que a hospeda. A primeira versao desta
  // rotacao passava `filmsNow` por prop e acendeu essa trava em 3 linhas
  // (memoria: trava-de-caminho-vence-argumento-de-intencao).
  check('o pai continua sem saber da conta', !/filmsNow/.test(clientSemComentario))
  check(
    'a faixa calcula com a mesma funcao e a mesma constante',
    /filmsNow:\s*videosForCredits\(CARD_TRIAL_GRANT_CREDITS, 'cinematic_ai'\)/.test(bannerSemComentario),
  )
  check('a faixa importa a conta canonica', /import \{ videosForCredits \} from '@\/lib\/marketingPrice'/.test(BANNER))
  check(
    'o modal repassa filmsNow ao nucleo, nao a uma copia da regra',
    /decideTrialDoorOffer\(\{[\s\S]{0,600}?filmsNow,/.test(modalSemComentario),
  )
  // Nenhuma das duas telas pode conter o numero pronto: se o custo do motor ou
  // o grant do trial mudarem, a tela tem de mudar sozinha.
  for (const [nome, fonte] of [['modal', modalSemComentario], ['faixa', bannerSemComentario]]) {
    check(`${nome} nao crava a contagem de filmes`, !/\b[0-9]+ AI films?\b/.test(fonte))
    check(`${nome} nao crava a taxa de entrada`, !/\$1(\.00)?\b/.test(fonte))
    check(`${nome} nao crava o grant do trial`, !/\b80 credits\b/.test(fonte))
  }
}

console.log('-- 6. A nota e pintada a partir da DECISAO, nunca de um literal --')
{
  const modalSemComentario = stripComments(MODAL)
  const bannerSemComentario = stripComments(BANNER)
  check('o modal so pinta a caixa quando a decisao trouxe a nota', /\{door\.capacityNote \? \(/.test(modalSemComentario))
  check('a faixa idem', /\{door\.capacityNote \? \(/.test(bannerSemComentario))
  check('o modal marca a caixa para a sonda', /data-trial-door-capacity=\{door\.capacityNote\}/.test(modalSemComentario))
  check('a faixa marca a caixa para a sonda', /data-card-entry-capacity=\{door\.capacityNote\}/.test(bannerSemComentario))
  // A ordem e a entrega: o resultado ANTES do nome da oferta / da frase densa.
  const iModalNota = modalSemComentario.indexOf('data-trial-door-capacity')
  const iModalBotao = modalSemComentario.indexOf('door.buttonLabel.replace')
  check('no modal a capacidade vem antes do nome da oferta', iModalNota > 0 && iModalNota < iModalBotao)
  const iFaixaNota = bannerSemComentario.indexOf('data-card-entry-capacity')
  const iFaixaHeadline = bannerSemComentario.indexOf('CARD_ENTRY_COPY.headline')
  check('na faixa a capacidade vem antes da frase da politica', iFaixaNota > 0 && iFaixaNota < iFaixaHeadline)
  // E a frase antiga continua na tela: a nota soma, nao esconde o plano.
  check('a faixa mantem o headline da politica', bannerSemComentario.includes('CARD_ENTRY_COPY.headline'))
  check('o modal mantem a nota de preco completa', modalSemComentario.includes('door.priceNote'))
  check('o modal mantem o botao da porta', modalSemComentario.includes('door.buttonLabel'))
}

console.log('-- 7. A impressao carrega o veredito, senao zero clique nao se le --')
{
  const modalSemComentario = stripComments(MODAL)
  const bannerSemComentario = stripComments(BANNER)
  check(
    'o evento do modal diz se a nota estava na tela',
    /capacity_note_shown: door\.capacityNote !== null/.test(modalSemComentario),
  )
  check(
    'o evento do modal diz QUANTOS filmes foram anunciados',
    /films_now: typeof filmsNow === 'number' \? filmsNow : null/.test(modalSemComentario),
  )
  check(
    'o evento da faixa diz se a nota estava na tela',
    /capacity_note_shown: door\.capacityNote !== null/.test(bannerSemComentario),
  )
  // A nota entra na lista de dependencias das duas impressoes: sem isso, a
  // primeira renderizacao sem moeda congelaria o veredito.
  check('o efeito do modal depende da nota', /\}, \[currency, door\.capacityNote,/.test(modalSemComentario))
  check('o efeito da faixa depende da nota', /door\.capacityNote, region\]\)/.test(bannerSemComentario))
}

console.log('-- 8. Tripwire: o numero anunciado e o que o COBRADOR concede --')
{
  const webhook = read(WEBHOOK_PATH)
  const marketing = read(MARKETING_PATH)
  // O trial de cartao concede CARD_TRIAL_GRANT_CREDITS — a mesma constante que
  // as duas telas passam para a conta. Se alguem trocar por um literal, a
  // promessa de filmes deixa de ser sustentada pelo credito concedido.
  check(
    'o webhook concede a constante, nao um literal',
    /isCardTrial \? CARD_TRIAL_GRANT_CREDITS/.test(stripComments(webhook)),
  )
  check(
    'videosForCredits continua sendo divisao pelo custo de referencia',
    /return cost > 0 \? Math\.floor\(Math\.max\(0, credits\) \/ cost\) : 0/.test(marketing),
  )
  check(
    'as linhas de plano usam a MESMA funcao que a porta',
    /videosPerMonth\(tier, 'cinematic_ai'\)/.test(stripComments(CLIENT)),
  )
}

console.log(`\n${pass} verificacoes passaram, ${fail} falharam`)
process.exit(fail === 0 ? 0 : 1)
