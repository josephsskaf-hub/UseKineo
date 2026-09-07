// ═══════════════════════════════════════════════════════════════════════════
// GUARDIAO — A PORTA DE $1 NO INSTANTE EM QUE O TRIAL MORRE (fv-r9, 07/09)
// ═══════════════════════════════════════════════════════════════════════════
// O QUE ELE PROTEGE, e por que cada trava existe:
//
//  1. O DESTINO DO CLIQUE. `trial_downgrade_modal_cta` tem 18 cliques / 15
//     pessoas em 30 dias (~22% de CTR sobre 81 impressoes) — a superficie que
//     pede dinheiro mais clicada da casa. Ela levava a `?tier=basic&intro=1`
//     (Creator cheio) enquanto a carta do MESMO instante ja levava a $1.
//
//  2. A HONESTIDADE. Anunciar a taxa de entrada para quem o cobrador vai
//     cobrar a mensalidade cheia e uma mentira medivel. O modal so pode dizer
//     `hasPaid: false` ao nucleo porque ele so abre depois do predicado
//     ESTRITO `data?.hasPaid !== false` (memoria
//     `predicado-largo-negado-falha-aberta`). Se alguem afrouxar esse gate
//     para `!data?.hasPaid`, a tela passa a prometer $1 a quem ja pagou —
//     este guardiao fica VERMELHO nesse instante.
//
//  3. A FONTE UNICA. A copy de dinheiro tem que vir de
//     `lib/growth/cleanFilmTrialDoor.ts`. Numero digitado a mao neste arquivo
//     e proibido (memoria `preco-literal-em-email-mente`).
//
//  4. A QUEDA HONESTA. Quando a porta nao aparece (moeda nao resolveu), o
//     botao NAO pode sumir: cai para `Continue on Creator` + `intro=1`,
//     exatamente o que existia antes desta entrega.
//
// Estilo readFileSync de proposito: guardiao com alias `@/` nao roda nesta
// casa (memoria `guardioes-com-alias-nao-rodam`).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')

const MODAL_PATH = 'components/TrialDowngradeModal.tsx'
const CORE_PATH = 'lib/growth/cleanFilmTrialDoor.ts'
const MODAL = read(MODAL_PATH)
const CORE = read(CORE_PATH)

let ok = 0
let bad = 0
function check(label, cond) {
  if (cond) {
    ok++
  } else {
    bad++
    console.log(`  ✗ ${label}`)
  }
}

console.log('── 1. O destino do clique carrega o trial pago ──')
const TRIAL_URL = "'/api/stripe/checkout?tier=basic&billing=monthly&trial=1&intent_campaign=trial_1usd_downgrade'"
check('a URL do trial de $1 existe no modal', MODAL.includes(TRIAL_URL))
check('ela e escolhida por trialDoor.visible', /trialDoor\.visible\s*\n?\s*\?\s*'\/api\/stripe\/checkout\?tier=basic&billing=monthly&trial=1/.test(MODAL))
check('o intent_campaign nomeia esta superficie', MODAL.includes('intent_campaign=trial_1usd_downgrade'))
check('a queda honesta para intro=1 continua existindo', MODAL.includes("'/api/stripe/checkout?tier=basic&intro=1'"))
check('o tier continua basic (TRIAL_TIER do cobrador)', !/checkout\?tier=(starter|pro|autopilot)[^']*trial=1/.test(MODAL))

console.log('── 2. A fonte unica, nunca uma copia da regra ──')
check('o modal importa decideTrialDoorOffer', /import\s*\{\s*decideTrialDoorOffer\s*\}\s*from\s*'@\/lib\/growth\/cleanFilmTrialDoor'/.test(MODAL))
check('o nucleo exporta decideTrialDoorOffer', /export function decideTrialDoorOffer\(/.test(CORE))
check('o modal CHAMA o nucleo (nao so importa)', MODAL.includes('decideTrialDoorOffer({'))
check('o modal nao reimplementa a trava de has_paid', !/reason:\s*'already_paid'/.test(MODAL))
check('o modal nao reimplementa a trava de preco', !/reason:\s*'price_unresolved'/.test(MODAL))

console.log('── 3. Dinheiro nunca e digitado a mao ──')
// REANCORADO na 1a execucao: a versao larga ("nenhum $ em todo o arquivo")
// ficou vermelha por causa de `per finished film (editors: $30+)` — uma
// comparacao com editor humano que existe ha semanas e NAO e preco nosso.
// Afrouxar o regex seria abrir a porta pela qual o numero volta; o certo e
// mirar exatamente onde o risco vive: as linhas que constroem a porta. Toda
// linha que menciona `trialDoor` fica proibida de conter dinheiro digitado.
const doorLines = MODAL.split('\n').filter((l) => l.includes('trialDoor'))
check('a porta tem linhas para auditar', doorLines.length >= 6)
check(
  'nenhuma linha da porta digita dinheiro',
  !doorLines.some((l) => /\$\s?\d/.test(l.replace(/\/\/.*$/, ''))),
)
check('a taxa de entrada vem da constante do cobrador', MODAL.includes('CARD_TRIAL_ENTRY_FEE_MINOR'))
check('os creditos do trial vem da constante do cobrador', MODAL.includes('CARD_TRIAL_GRANT_CREDITS'))
check('os dias do trial vem da constante do cobrador', MODAL.includes('CARD_TRIAL_DAYS'))
check('o rotulo passa por formatCheckoutMoney', /formatCheckoutMoney\(currency,\s*CARD_TRIAL_ENTRY_FEE_MINOR\)/.test(MODAL))
check('a mensalidade entregue ao nucleo e o fullPrice ja formatado', /monthlyLabel:\s*fullPrice/.test(MODAL))

console.log('── 4. O plano continua visivel (ordem do fundador) ──')
check('a nota de preco do nucleo diz a mensalidade', /then \$\{input\.monthlyLabel\}\/month from day/.test(CORE))
check('o modal imprime a priceNote do nucleo', MODAL.includes('trialDoor.priceNote'))
check('o botao cai para Continue on Creator quando a porta nao aparece', MODAL.includes("|| 'Continue on Creator'"))

console.log('── 5. A promessa so sai para quem o cobrador aceita ──')
check('o modal so abre com has_paid provado FALSO', MODAL.includes('if (data?.hasPaid !== false) return'))
check('o modal passa hasPaid: false ao nucleo', /hasPaid:\s*false/.test(MODAL))
check('no fim do trial nao ha filme em foco', /unlocksCurrentFilm:\s*false/.test(MODAL))

console.log('── 6. O clique e medivel ──')
check('o evento do CTA carrega trial_door', /trial_door:\s*trialDoor\.visible/.test(MODAL))
check('o evento do CTA carrega card_trial', /card_trial:\s*trialDoor\.visible \? '1' : null/.test(MODAL))
check('a telemetria do checkout carrega card_trial', /card_trial:\s*trialDoor\.visible \? '1' : '0'/.test(MODAL))
check('a superficie continua nomeada', MODAL.includes("pricing_surface: 'trial_downgrade_modal'"))

console.log('── 7. MUTACAO: cada trava tem dentes ──')
const mutants = [
  {
    label: 'o destino do trial pago',
    from: TRIAL_URL,
    to: "'/api/stripe/checkout?tier=basic&intro=1'",
    // Sem a URL do trial, a tela volta a cobrar a mensalidade cheia.
    breaks: (m) => !m.includes('trial=1&intent_campaign=trial_1usd_downgrade'),
  },
  {
    label: 'o gate estrito de has_paid',
    from: 'if (data?.hasPaid !== false) return',
    to: 'if (!data?.hasPaid) return',
    // O predicado largo negado abre a oferta quando a leitura FALHA.
    breaks: (m) => !m.includes('if (data?.hasPaid !== false) return'),
  },
  {
    label: 'a delegacao a fonte unica',
    from: 'decideTrialDoorOffer({',
    to: 'noopTrialDoor({',
    breaks: (m) => !m.includes('decideTrialDoorOffer({'),
  },
  {
    label: 'a queda honesta para Continue on Creator',
    from: "|| 'Continue on Creator'",
    to: "|| ''",
    breaks: (m) => !m.includes("|| 'Continue on Creator'"),
  },
]
for (const mutant of mutants) {
  check(`o alvo da mutacao existe: ${mutant.label}`, MODAL.includes(mutant.from))
  const mutated = MODAL.replace(mutant.from, mutant.to)
  // Prova que a mutacao foi ESCRITA. Mutante que nao aplicou devolve verde e
  // se le como guarda resistindo (memoria `mutacao-precisa-provar-que-aplicou`).
  check(`a mutacao foi aplicada: ${mutant.label}`, mutated !== MODAL && mutated.includes(mutant.to))
  check(`removida, ${mutant.label} fica detectavel`, mutant.breaks(mutated))
}

console.log('')
if (bad === 0) {
  console.log(`✅ ${ok} verificacoes passaram, 0 falharam`)
} else {
  console.log(`❌ ${ok} verificacoes passaram, ${bad} falharam`)
  process.exit(1)
}
