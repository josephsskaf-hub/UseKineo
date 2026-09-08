#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// GUARDIÃO — A PORTA DE $1 NO BANNER DO TRIAL (07/09/2026)
//
// O QUE ELE PROTEGE, e por que cada trava existe:
//
//  1. A caixa VERDE do primeiro filme (caminho GRÁTIS) continua intacta e
//     continua sendo a manchete. A porta paga nasce FORA e ABAIXO dela.
//  2. A porta só é montada para quem AINDA NÃO gastou crédito
//     (`firstDelivery.eligible`) — nunca incondicionalmente.
//  3. O gate de dinheiro é o predicado ESTRITO: a porta exige `has_paid`
//     provado `false` pelo servidor, não a ausência de `true`.
//  4. A regra de dinheiro mora numa fonte única (`decideTrialDoorOffer`).
//     Nenhuma das duas telas redigita preço nem escreve cifrão.
//  5. Quando a porta NÃO é visível, a queda é honesta: volta o rótulo e o
//     destino de sempre (`intro=1`), em vez de mandar todo mundo para `trial=1`.
//  6. O botão de $1 nunca sai sem a nota que diz o que acontece no dia 8.
//
// Estilo readFileSync de propósito: guardião que importa com alias `@/` morre
// no import antes da 1ª verificação (memória `guardioes-com-alias-nao-rodam`).
// Toda leitura normaliza CRLF: o checkout do Windows entrega `\r\n` e âncora
// de duas linhas nunca casaria (memória `guardiao-crlf-falso-vermelho`).
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOOR = join(ROOT, 'components', 'TrialFirstFilmPayDoor.tsx')
const BANNER = join(ROOT, 'components', 'TrialActiveBanner.tsx')
const CORE = join(ROOT, 'lib', 'growth', 'cleanFilmTrialDoor.ts')

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

let ok = 0
let bad = 0
const fail = (msg) => {
  bad += 1
  console.log(`  ✗ ${msg}`)
}
const pass = (msg) => {
  ok += 1
  console.log(`  ✓ ${msg}`)
}
const check = (cond, msg) => (cond ? pass(msg) : fail(msg))

// ── Bateria 1 — a peça nova existe e não reescreve a regra de dinheiro ──────
console.log('\n[1] A porta é peça própria e importa a fonte única')
const door = read(DOOR)
check(door.startsWith("'use client'"), 'a porta é componente de cliente')
check(
  /import \{ decideTrialDoorOffer \} from '@\/lib\/growth\/cleanFilmTrialDoor'/.test(door),
  'importa decideTrialDoorOffer da fonte única',
)
check(!/\bdecideCleanFilmTrialDoor\b/.test(door), 'não chama a função da caixa de export (slot alheio)')
check(
  /entryFeeLabel: currency !== null \? formatCheckoutMoney\(currency, CARD_TRIAL_ENTRY_FEE_MINOR\)/.test(door),
  'a taxa de entrada vem de formatCheckoutMoney + constante, nunca digitada',
)
check(
  /monthlyLabel: currency !== null \? formatCheckoutMoney\(currency, getTierPrice\('basic', currency, region\)\)/.test(door),
  'a mensalidade vem de getTierPrice, nunca digitada',
)
// Cifrão literal em tela de dinheiro é o defeito que a memória
// `preco-literal-em-email-mente` descreve: a moeda é resolvida por região.
check(!/[$€£]\s?\d/.test(door), 'nenhum preço literal na peça')
check(/unlocksCurrentFilm: false/.test(door), 'não promete "este filme limpo" (não há filme em foco)')

// ── Bateria 2 — o gate de dinheiro é o predicado ESTRITO ───────────────────
console.log('\n[2] O gate estrito de has_paid')
check(/hasPaid: !notPaidProven/.test(door), 'a porta pergunta pelo estrito, não pelo negado')
const banner = read(BANNER)
check(
  /setNotPaidProven\(data\.hasPaid === false\)/.test(banner),
  'o banner só prova "não pagou" com has_paid === false',
)
check(
  !/setNotPaidProven\(data\.hasPaid !== true\)/.test(banner),
  'o banner NÃO usa o predicado negado para provar não-pagamento',
)

// ── Bateria 3 — a montagem é condicional e o caminho grátis fica intacto ────
console.log('\n[3] A montagem, e o caminho grátis que ela não pode empurrar')
check(
  /\{firstDelivery\.eligible && <TrialFirstFilmPayDoor /.test(banner),
  'a porta só monta quando o primeiro filme é elegível',
)
check(
  /Build my \{firstDelivery\.duration\}s Seedance episode →/.test(banner),
  'o botão GRÁTIS do primeiro filme continua na tela',
)
check(
  banner.indexOf('Build my {firstDelivery.duration}s Seedance episode →') <
    banner.indexOf('<TrialFirstFilmPayDoor '),
  'o botão grátis vem ANTES da porta paga — a manchete não muda',
)
check(
  /background: '#34d399'/.test(banner),
  'o botão grátis continua sólido (a porta paga é link, não concorre)',
)
check(/textDecoration: 'underline'/.test(door), 'a porta paga tem peso visual de link')
check(/min-h-11/.test(door), 'o alvo de toque da porta respeita os 44px desta casa')

// ── Bateria 4 — a queda honesta do CTA de assinatura ───────────────────────
console.log('\n[4] O CTA de assinatura: porta quando dá, preço de sempre quando não dá')
check(
  /subscriptionDoor\.visible\s*\n?\s*\? `\/api\/stripe\/checkout\?tier=basic&billing=monthly&trial=1&intent_campaign=\$\{TRIAL_ACTIVE_BANNER_DOOR_VERSION\}`/.test(
    banner,
  ),
  'o destino do CTA segue a decisão da porta',
)
check(
  /: '\/api\/stripe\/checkout\?tier=basic&intro=1'/.test(banner),
  'a queda mantém o destino histórico (intro=1)',
)
check(
  /\(subscriptionDoor\.visible && subscriptionDoor\.buttonLabel\) \|\|/.test(banner),
  'o rótulo do CTA vem da mesma decisão que pintou o destino',
)
check(
  /Keep Creator after the trial — \$\{priceLabel\}/.test(banner),
  'a queda mantém o rótulo honesto de mês cheio',
)
check(
  /!firstDelivery\.eligible && subscriptionDoor\.visible && subscriptionDoor\.priceNote/.test(banner),
  'a nota de preço acompanha o botão de $1 no CTA',
)
check(/\{door\.priceNote\}/.test(door), 'a nota de preço acompanha o botão de $1 na porta nova')

// ── Bateria 5 — medição: sem os dois números, zero clique não diz nada ─────
console.log('\n[5] A medição que separa "ninguém quis" de "nunca apareceu"')
check(/trial_first_film_pay_door_shown/.test(door), 'existe evento de impressão')
check(/trial_first_film_pay_door_clicked/.test(door), 'existe evento de clique')
check(/visible: door\.visible/.test(door) && /reason: door\.reason/.test(door), 'a impressão carrega veredito e motivo')
check(/trial_door_reason: subscriptionDoor\.reason/.test(banner), 'o CTA antigo passou a carimbar o motivo da porta')
check(
  /const TRIAL_ACTIVE_BANNER_DOOR_VERSION = 'trial_1usd_active_banner'/.test(banner) &&
    /TRIAL_FIRST_FILM_PAY_DOOR_VERSION = 'trial_1usd_first_film'/.test(door),
  'as duas coortes têm carimbos DIFERENTES',
)

// ── Bateria 6 — o núcleo continua sendo o dono das travas ──────────────────
console.log('\n[6] O núcleo compartilhado segue intacto')
const core = read(CORE)
check(/export function decideTrialDoorOffer/.test(core), 'decideTrialDoorOffer continua exportada')
check(/if \(input\.hasPaid\)/.test(core), 'a trava de quem já pagou continua no núcleo')
check(
  /if \(!input\.entryFeeLabel \|\| !input\.monthlyLabel\)/.test(core),
  'a trava de preço não resolvido continua no núcleo',
)

// ── MUTANTES ───────────────────────────────────────────────────────────────
// Cada mutante PROVA que foi escrito antes de julgar o resultado: um mutante
// que não aplicou devolve verde e se lê como guardião resistindo
// (memória `mutacao-precisa-provar-que-aplicou`).
console.log('\n[M] Mutantes — cada um tem de deixar alguma trava vermelha')
const MUTANTS = [
  {
    nome: 'a porta deixa de exigir a prova de has_paid',
    arquivo: DOOR,
    de: 'hasPaid: !notPaidProven',
    para: 'hasPaid: false',
    trava: (d) => /hasPaid: !notPaidProven/.test(d),
  },
  {
    nome: 'a porta passa a montar para todo mundo',
    arquivo: BANNER,
    de: '{firstDelivery.eligible && <TrialFirstFilmPayDoor ',
    para: '{true && <TrialFirstFilmPayDoor ',
    trava: (b) => /\{firstDelivery\.eligible && <TrialFirstFilmPayDoor /.test(b),
  },
  {
    nome: 'o banner volta ao predicado negado',
    arquivo: BANNER,
    de: 'setNotPaidProven(data.hasPaid === false)',
    para: 'setNotPaidProven(data.hasPaid !== true)',
    trava: (b) => /setNotPaidProven\(data\.hasPaid === false\)/.test(b) && !/data\.hasPaid !== true/.test(b),
  },
  {
    nome: 'o CTA manda todo mundo para trial=1, sem queda honesta',
    arquivo: BANNER,
    de: ": '/api/stripe/checkout?tier=basic&intro=1',",
    para: ": `/api/stripe/checkout?tier=basic&billing=monthly&trial=1&intent_campaign=${TRIAL_ACTIVE_BANNER_DOOR_VERSION}`,",
    trava: (b) => /: '\/api\/stripe\/checkout\?tier=basic&intro=1'/.test(b),
  },
  {
    nome: 'o botão de $1 perde a nota que diz o preço do dia 8',
    arquivo: DOOR,
    de: '{door.priceNote}',
    para: '{null}',
    trava: (d) => /\{door\.priceNote\}/.test(d),
  },
  {
    nome: 'a porta paga vira botão sólido e disputa com o filme grátis',
    arquivo: DOOR,
    de: "textDecoration: 'underline',",
    para: "textDecoration: 'none',",
    trava: (d) => /textDecoration: 'underline'/.test(d),
  },
]

for (const m of MUTANTS) {
  const original = readFileSync(m.arquivo, 'utf8')
  const normalizado = original.replace(/\r\n/g, '\n')
  if (!normalizado.includes(m.de)) {
    fail(`mutante NÃO ANCOROU: ${m.nome} (âncora ausente — a trava mudou de forma)`)
    continue
  }
  const mutado = normalizado.replace(m.de, m.para)
  if (mutado === normalizado) {
    fail(`mutante NÃO ALTEROU o arquivo: ${m.nome}`)
    continue
  }
  writeFileSync(m.arquivo, mutado, 'utf8')
  try {
    const relido = read(m.arquivo)
    if (relido === normalizado) {
      fail(`mutante NÃO FOI ESCRITO em disco: ${m.nome}`)
      continue
    }
    if (m.trava(relido)) fail(`mutante SOBREVIVEU: ${m.nome}`)
    else pass(`mutante morto: ${m.nome}`)
  } finally {
    writeFileSync(m.arquivo, original, 'utf8')
  }
}

// Restauração conferida: um guardião que deixa mutante em disco é pior que
// nenhum guardião.
console.log('\n[R] Restauração')
check(/hasPaid: !notPaidProven/.test(read(DOOR)), 'a porta voltou ao original')
check(/setNotPaidProven\(data\.hasPaid === false\)/.test(read(BANNER)), 'o banner voltou ao original')

console.log(`\n${ok} ok / ${bad} falhas`)
process.exit(bad === 0 ? 0 : 1)
