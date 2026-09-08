// KINEO-QUEM-E-GENTE-2026-09-07 (fv-r10) — contrato do carimbo de origem no
// sink publico de eventos. Sem rede, sem banco, sem credencial.
//
// POR QUE ESTE GUARDIAO EXISTE: em 07/09 a casa passou 3h15 sem um clique no
// CTA da landing, sem um cadastro e sem um render, com `landing_session_started`
// ACIMA da media das mesmas horas dos 3 dias anteriores — e NAO deu para decidir
// entre "madrugada magra com trafego de robo" e "defeito no funil", porque o
// evento nao gravava nada que distinguisse pessoa de varredor. O carimbo existe
// para essa pergunta nunca mais ficar sem resposta.
//
// O QUE ELE TRAVA (e cada item e uma forma conhecida de estragar isto):
//   · IP CRU nunca gravado — so o hash, e pela MESMA funcao que o handoff usa;
//   · USER-AGENT completo nunca gravado — so o booleano;
//   · as duas chaves sao ESCRITAS PELO SERVIDOR DEPOIS do metadata do cliente,
//     senao o proprio robo escreve a etiqueta que diz que ele nao e robo;
//   · o sink NUNCA pode passar a barrar nada: analytics nao interrompe funil.
//
// Leitura com CRLF normalizado (memoria: guardiao-crlf-falso-vermelho) e todo
// mutante prova que foi escrito (memoria: mutacao-precisa-provar-que-aplicou).

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROUTE_PATH = join(root, 'app/api/events/route.ts')
const HELPER_PATH = join(root, 'lib/gptHandoffStore.ts')

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

let pass = 0
let fail = 0
const check = (label, cond) => {
  if (cond) { pass += 1 } else { fail += 1; console.error(`  ✗ ${label}`) }
}

const routeSrc = read(ROUTE_PATH)
const helperSrc = read(HELPER_PATH)

function contract(src) {
  const code = stripComments(src)
  const out = []
  const t = (name, cond) => out.push([name, Boolean(cond)])

  // 1. Reuso da fonte unica — nao uma segunda copia da regra.
  t('importa as tres funcoes da fonte que ja existe',
    /import \{ clientIp, hashIp, isLikelyBot \} from '@\/lib\/gptHandoffStore'/.test(code))
  t('nao redigita hash nem regex de robo dentro da rota',
    !/createHash\(/.test(code) && !/bot\|crawler\|spider/.test(code))

  // 2. As duas chaves sao carimbadas.
  t('carimba ip_hash a partir do IP da requisicao',
    /ip_hash: hashIp\(clientIp\(req\.headers\)\)/.test(code))
  t('carimba is_bot a partir do user-agent da requisicao',
    /is_bot: isLikelyBot\(req\.headers\.get\('user-agent'\)\)/.test(code))

  // 3. PRECEDENCIA: o servidor escreve DEPOIS do cliente. Esta e a trava que
  //    impede o proprio robo de se etiquetar como gente.
  const spread = code.indexOf('...metadata,')
  const ipAt = code.indexOf('ip_hash: hashIp(')
  const botAt = code.indexOf('is_bot: isLikelyBot(')
  t('o metadata do cliente entra ANTES do carimbo do servidor',
    spread >= 0 && ipAt > spread && botAt > spread)
  t('a linha gravada usa o objeto carimbado, nao o metadata cru',
    /row\.metadata = stampedMetadata/.test(code) &&
    !/if \(Object\.keys\(metadata\)\.length > 0\) row\.metadata = metadata/.test(code))

  // 4. PRIVACIDADE: nem IP cru, nem UA inteiro.
  t('o IP cru nunca vai para a linha',
    !/ip:\s*clientIp\(/.test(code) && !/raw_ip/.test(code))
  t('o user-agent inteiro nunca vai para a linha',
    !/user_agent:/.test(code) && !/ua:\s*req\.headers\.get\('user-agent'\)/.test(code))

  // 5. O sink continua sendo analytics: nao barra, nao muda status.
  t('o carimbo nao introduziu bloqueio por robo',
    !/if \(isLikelyBot/.test(code) && !/is_bot.*return NextResponse\.json\(\{ ok: false/.test(code))
  t('a trava de nomes so-servidor continua de pe',
    /if \(SERVER_ONLY_EVENTS\.has\(name\)\)/.test(code))
  t('o guarda de ambiente nao-producao continua de pe',
    /VERCEL_ENV === 'preview'/.test(code))

  return out
}

console.log('── contrato do carimbo de origem ──')
for (const [name, ok] of contract(routeSrc)) check(name, ok)

console.log('── a fonte unica cumpre o que a rota espera dela ──')
check('hashIp nunca devolve o IP cru',
  /createHash\('sha256'\)\.update\(`\$\{salt\}\|\$\{ip\}`\)/.test(helperSrc))
check('hashIp devolve null sem IP', /if \(!ip\) return null/.test(helperSrc))
check('isLikelyBot trata ausencia de UA como robo', /if \(!ua\) return true/.test(helperSrc))
check('clientIp descarta loopback',
  /ip === '127\.0\.0\.1' \|\| ip === '::1'/.test(helperSrc))

console.log('── mutantes ──')
const mutants = [
  ['carimbar ANTES do metadata do cliente (o robo se etiqueta)',
    (s) => s.replace(
      "      ...metadata,\n      ip_hash: hashIp(clientIp(req.headers)),\n      is_bot: isLikelyBot(req.headers.get('user-agent')),",
      "      ip_hash: hashIp(clientIp(req.headers)),\n      is_bot: isLikelyBot(req.headers.get('user-agent')),\n      ...metadata,")],
  ['gravar o IP cru ao lado do hash',
    (s) => s.replace('      ip_hash: hashIp(clientIp(req.headers)),',
      '      ip_hash: hashIp(clientIp(req.headers)),\n      raw_ip: clientIp(req.headers),')],
  ['gravar o user-agent inteiro',
    (s) => s.replace("      is_bot: isLikelyBot(req.headers.get('user-agent')),",
      "      is_bot: isLikelyBot(req.headers.get('user-agent')),\n      user_agent: req.headers.get('user-agent'),")],
  ['voltar a gravar o metadata cru',
    (s) => s.replace('    row.metadata = stampedMetadata',
      '    if (Object.keys(metadata).length > 0) row.metadata = metadata')],
  ['transformar o carimbo em bloqueio (analytics barrando funil)',
    (s) => s.replace('    const row: Record<string, unknown> = {',
      "    if (isLikelyBot(req.headers.get('user-agent'))) return NextResponse.json({ ok: true })\n    const row: Record<string, unknown> = {")],
]

for (const [label, mutate] of mutants) {
  const mutated = mutate(routeSrc)
  if (mutated === routeSrc) {
    fail += 1
    console.error(`  ✗ mutante NAO FOI ESCRITO (ancora nao casou): ${label}`)
    continue
  }
  const broke = contract(mutated).some(([, ok]) => !ok)
  check(`mutado, o contrato quebra: ${label}`, broke)
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} verificacoes passaram, ${fail} falharam`)
process.exit(fail === 0 ? 0 : 1)
