// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO — KINEO-PAYPAL-IDEMPOTENCIA-2026-09-07
// ═══════════════════════════════════════════════════════════════════════════
// A frase que este arquivo existe para impedir: **o cliente paga e nunca
// recebe, sem erro em lugar nenhum.**
//
// A auditoria de 28/08 registrou o problema como "idempotência invertida
// (claim antes do grant, erro engolido)". Lendo o código inteiro em 07/09 são
// QUATRO defeitos que se compõem, e é por isso que consertar um só não
// resolveria:
//
//  1. A MARCA VINHA ANTES DA ENTREGA E NUNCA ERA DESFEITA. Se a concessão
//     falhasse, a marca ficava; a re-tentativa do PayPal batia em `23505`, lia
//     "já processado" e PULAVA a concessão. Para sempre.
//  2. A CONCESSÃO ENGOLIA O PRÓPRIO ERRO (`console.error` + `void`): quem
//     chamava não tinha como saber que o crédito não entrou.
//  3. O HANDLER DEVOLVIA 200 EM QUALQUER EXCEÇÃO, com o comentário "grants are
//     idempotent and PayPal hammer-retries 5xx" — as duas metades erradas. Os
//     grants eram idempotentes na direção que PERDE o pagamento, e o 200 dizia
//     ao PayPal para não tentar mais.
//  4. TABELA AUSENTE (`42P01`) VIRAVA "PODE CONCEDER". Sem a tabela de
//     idempotência, TODA re-tentativa concedia de novo — crédito em dobro, o
//     oposto exato do defeito 1.
//
// E há um quinto, que só aparece lendo os DOIS arquivos juntos: a rota de
// retorno e o webhook DIVIDEM as chaves de `paypal_events`. Consertar só o
// webhook deixaria o defeito vivo — uma falha na rota de retorno deixaria a
// marca e o webhook, que é o caminho de RESERVA para exatamente esse caso,
// chegaria depois e não concederia nada.
//
// As tabelas do PayPal estão VAZIAS hoje (nenhum cliente por esse trilho na
// história), então isto se conserta sem migrar nada e sem tocar em dinheiro
// que já entrou. É por isso que a hora de consertar é agora, e não no dia do
// primeiro cliente.
//
// Rodar: node scripts/test-paypal-idempotencia.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const falhas = []
let total = 0
const ok = (nome, cond, detalhe = '') => {
  total += 1
  if (cond) console.log(`  ✓ ${nome}`)
  else { console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`); falhas.push(nome) }
}
const ler = (...p) => readFileSync(path.join(raiz, ...p), 'utf8').replace(/\r\n/g, '\n')

const lib = ler('lib', 'paypal.ts')
const wh = ler('app', 'api', 'paypal', 'webhook', 'route.ts')
const ret = ler('app', 'api', 'paypal', 'return', 'route.ts')

// Recorta o corpo de uma função do arquivo real, para que as asserções falem da
// função certa e não de qualquer trecho parecido em outro lugar.
function corpo(fonte, assinatura, ate) {
  const i = fonte.indexOf(assinatura)
  if (i < 0) return ''
  const j = ate ? fonte.indexOf(ate, i) : -1
  return fonte.slice(i, j > i ? j : i + 3000)
}

// ── A. A MARCA PODE SER DEVOLVIDA ─────────────────────────────────────────
console.log('\nA. a marca de idempotência pode ser devolvida')
ok('existe uma função que LIBERA a marca',
  /export async function paypalReleaseEvent\(/.test(lib))
ok('e ela apaga a linha de verdade (não só loga)',
  /\.from\('paypal_events'\)\s*\.delete\(\)\s*\.eq\('id', id\)/.test(
    corpo(lib, 'export async function paypalReleaseEvent', '\n}')
      .replace(/\n\s*/g, ' ')
      .replace(/ \./g, '.'),
  ) || /from\('paypal_events'\).delete\(\).eq\('id', id\)/.test(
    corpo(lib, 'export async function paypalReleaseEvent', '\n}').replace(/\s+/g, ''),
  ))

// ── B. TABELA AUSENTE NÃO CONCEDE ─────────────────────────────────────────
// Este é o defeito 4, e ele é o mais perigoso dos quatro: crédito em dobro em
// TODA re-tentativa, sem nada no log.
console.log('\nB. sem o livro de idempotência, ninguém concede (falha FECHADA)')
const claim = corpo(lib, 'export async function paypalClaimEvent', '\n}\n')
ok('o corpo de `paypalClaimEvent` foi encontrado', claim.length > 100)
ok('duplicata continua devolvendo false (a concessão é pulada, e isso está certo)',
  /if \(error\.code === '23505'\) return false/.test(claim))
ok('erro DESCONHECIDO lança em vez de devolver `true`',
  /throw new PayPalRetryableError/.test(claim))
ok('e o ramo antigo `42P01 → return true` NÃO existe mais',
  !/42P01[\s\S]{0,200}return true/.test(claim))
ok('nenhum caminho de `paypalClaimEvent` devolve `true` sem ter gravado a marca',
  (claim.match(/return true/g) ?? []).length === 1 &&
    /if \(!error\) return true/.test(claim))

// ── C. A CONCESSÃO FALA QUANDO FALHA ──────────────────────────────────────
console.log('\nC. a concessão lança em vez de engolir o erro')
for (const fn of ['grantPackCredits', 'activateSubscription', 'renewSubscriptionCredits']) {
  const c = corpo(lib, `export async function ${fn}`, '\n}\n')
  ok(`${fn} lança quando a escrita falha`, /throw new PayPalRetryableError/.test(c), `${c.length} chars`)
  ok(`${fn} não mais só loga o erro de escrita`,
    !/if \(error\) console\.error/.test(c))
}
// A leitura do perfil também: `?? 0` sobre uma leitura que FALHOU reescreveria
// o saldo do cliente como `0 + credits`, apagando o que ele tinha.
ok('a LEITURA do perfil também falha alto (senão `?? 0` apaga o saldo do cliente)',
  (corpo(lib, 'export async function grantPackCredits', '\n}\n').match(/readError/g) ?? []).length >= 2)

// ── D. O WEBHOOK DEVOLVE AS MARCAS E PEDE RE-TENTATIVA ────────────────────
console.log('\nD. o webhook devolve as marcas e pede re-tentativa')
ok('toda marca tirada no pedido é registrada numa lista',
  /const marcasTiradas: string\[\] = \[\]/.test(wh) && /if \(primeiraVez\) marcasTiradas\.push\(chave\)/.test(wh))
ok('NENHUMA chamada crua a `paypalClaimEvent` sobrou no switch — todas passam pelo registro',
  (wh.match(/await paypalClaimEvent\(/g) ?? []).length === 1 &&
    /const primeiraVez = await paypalClaimEvent\(admin, chave, tipo\)/.test(wh))
ok('as 4 marcas do handler passam por `marcar`',
  (wh.match(/await marcar\(/g) ?? []).length >= 4,
  `${(wh.match(/await marcar\(/g) ?? []).length} chamadas`)
// A marca de evento é tirada ANTES do switch: se ela não for devolvida, ela
// sozinha congela o pagamento mesmo que a marca por-operação seja devolvida.
ok('a marca de EVENTO (`evt:`) também entra no registro',
  /marcar\(`evt:\$\{eventId\}`/.test(wh))
ok('o catch devolve TODAS as marcas',
  /for \(const chave of marcasTiradas\) \{\s*\n\s*await paypalReleaseEvent\(admin, chave\)/.test(wh))
ok('o catch devolve 500 — o único jeito de pedir re-tentativa',
  /status: 500/.test(corpo(wh, '} catch (err) {', '\n}\n')))
ok('e o 200-em-qualquer-exceção morreu',
  !/Return 200 anyway/.test(wh))
// O 500 só pode existir no ramo de erro: um 500 no caminho feliz faria o
// PayPal re-tentar um pagamento já concedido para sempre.
ok('o caminho de sucesso continua devolvendo 200',
  /return NextResponse\.json\(\{ received: true \}\)\s*\n\}/.test(wh))
ok('tipo de evento não tratado continua sendo 200 (não é erro)',
  /default:[\s\S]{0,200}break/.test(wh) && !/default:[\s\S]{0,200}status: 500/.test(wh))

// ── E. A ROTA DE RETORNO — O ARQUIVO IRMÃO ────────────────────────────────
// As duas rotas dividem as chaves. Consertar uma só deixa o defeito vivo.
console.log('\nE. a rota de retorno divide as chaves e recebeu a mesma cura')
ok('a rota de retorno também sabe liberar a marca',
  /paypalReleaseEvent/.test(ret))
ok('as concessões dela passam por um helper que libera em caso de falha',
  /async function concederOuLiberar\(/.test(ret) &&
    (ret.match(/await concederOuLiberar\(/g) ?? []).length === 2)
ok('o helper libera E re-lança (engolir aqui esconderia a falha do cliente)',
  /await paypalReleaseEvent\(admin, chave\)\s*\n\s*throw err/.test(
    corpo(ret, 'async function concederOuLiberar', '\n}\n')))
ok('não sobrou nenhuma concessão crua depois de um claim na rota de retorno',
  !/if \(await paypalClaimEvent\([\s\S]{0,120}\) \{/.test(ret))

console.log(
  `\n${total - falhas.length}/${total} verificações passaram.` +
    (falhas.length ? `\nFALHOU: ${falhas.join(' · ')}` : ''),
)
process.exit(falhas.length ? 1 : 0)
