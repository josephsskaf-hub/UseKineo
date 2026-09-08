#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// GUARDIÃO — A PORTA DE $1 NO MODAL DE UPGRADE (07/09/2026)
//
// `upgrade_modal_opened` = 62 pessoas / 30 dias: a 4ª maior superfície de
// dinheiro da casa, e a única que abre porque a PESSOA apertou Generate sem
// saldo. Todas as saídas dela mandavam para a mensalidade cheia.
//
// O que este guardião não deixa quebrar:
//  1. a porta entra ACIMA das linhas de plano e elas continuam TODAS lá;
//  2. a caixa verde do primeiro filme grátis continua ANTES da porta paga;
//  3. o gate é `has_paid === false` provado pelo servidor, nunca `!isSubscriber`
//     nem o `hasPaid` que nasce `false` antes de a rota responder;
//  4. a regra de dinheiro vem da fonte única, sem literal de preço;
//  5. o botão de $1 nunca sai sem a nota do que acontece no dia 8.
//
// readFileSync + normalização de CRLF pelos motivos de sempre (memórias
// `guardioes-com-alias-nao-rodam` e `guardiao-crlf-falso-vermelho`).
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOOR = join(ROOT, 'components', 'UpgradeModalTrialDoor.tsx')
const CLIENT = join(ROOT, 'app', '(dashboard)', 'generate', 'GenerateClient.tsx')

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
let ok = 0
let bad = 0
const pass = (m) => { ok += 1; console.log(`  ✓ ${m}`) }
const fail = (m) => { bad += 1; console.log(`  ✗ ${m}`) }
const check = (c, m) => (c ? pass(m) : fail(m))

console.log('\n[1] A peça importa a fonte única e não escreve dinheiro')
const door = read(DOOR)
check(door.startsWith("'use client'"), 'é componente de cliente')
check(/import \{ decideTrialDoorOffer \} from '@\/lib\/growth\/cleanFilmTrialDoor'/.test(door), 'importa o núcleo compartilhado')
check(/formatCheckoutMoney\(currency, CARD_TRIAL_ENTRY_FEE_MINOR\)/.test(door), 'taxa de entrada derivada da constante')
check(/getTierPrice\('basic', currency, region\)/.test(door), 'mensalidade derivada da tabela de preço')
// A prosa do cabeçalho cita "$1" ao explicar a ordem do fundador; o que não
// pode existir é preço literal no CÓDIGO que a tela renderiza. Comentários
// fora antes de julgar.
const doorCode = door.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
check(!/[$€£]\s?\d/.test(doorCode), 'nenhum preço literal no código da peça')
check(/unlocksCurrentFilm: false/.test(door), 'não promete destravar um filme (não há filme em foco)')
check(/\{door\.priceNote\}/.test(door), 'a nota do dia 8 acompanha o botão')

console.log('\n[2] O gate estrito de has_paid')
const client = read(CLIENT)
check(/hasPaid: !notPaidProven/.test(door), 'a porta pergunta pelo predicado estrito')
check(
  /if \(typeof data\.hasPaid === 'boolean'\) \{ setHasPaid\(data\.hasPaid\); setNotPaidProven\(data\.hasPaid === false\) \}/.test(client),
  'a prova positiva é escrita no MESMO ponto em que hasPaid é lido',
)
check(!/setNotPaidProven\(data\.hasPaid !== true\)/.test(client), 'não usa o predicado negado')
check(!/notPaidProven=\{!isSubscriber\}/.test(client), 'não usa !isSubscriber como prova de não-pagamento')
// DOIS consumidores recebem a mesma prova: o modal (que a repassa para a peça
// nova) e a própria peça montada acima das linhas de plano. Contar é o que
// impede um mutante de "morrer" só porque o outro ponto ficou intacto.
check(
  (client.match(/notPaidProven=\{notPaidProven\}/g) ?? []).length === 2,
  'os DOIS consumidores recebem a prova do pai (modal e porta)',
)
check(
  /region=\{postVideoRegion\}\n          notPaidProven=\{notPaidProven\}/.test(client),
  'o UpgradeModal recebe a prova ao lado da moeda/região que já usava',
)
check(/notPaidProven = false,/.test(client), 'o padrão da prop é FECHADO (false)')

console.log('\n[3] A ordem da tela: grátis primeiro, porta depois, planos inteiros')
const iFree = client.indexOf('{firstFilmFree && onFirstFilmFree && (')
const iDoor = client.indexOf('<UpgradeModalTrialDoor ')
const iPlans = client.indexOf('{PLAN_LIST.map((plan) => {')
check(iFree > 0 && iDoor > 0 && iPlans > 0, 'as três âncoras existem na tela')
check(iFree < iDoor, 'a caixa do primeiro filme GRÁTIS vem antes da porta paga')
check(iDoor < iPlans, 'a porta paga vem antes das linhas de plano')
check(/PLAN_LIST\.map\(\(plan\) => \{/.test(client), 'as linhas de plano continuam lá — nada foi escondido')

console.log('\n[4] A medição')
check(/upgrade_modal_trial_door_shown/.test(door), 'evento de impressão')
check(/upgrade_modal_trial_door_clicked/.test(door), 'evento de clique')
check(/visible: door\.visible/.test(door) && /door_reason: door\.reason/.test(door), 'a impressão carrega veredito e motivo')
check(
  /UPGRADE_MODAL_TRIAL_DOOR_VERSION = 'trial_1usd_upgrade_modal'/.test(door),
  'carimbo próprio, separado das outras portas',
)

console.log('\n[M] Mutantes')
const MUTANTS = [
  {
    nome: 'a porta deixa de exigir a prova de has_paid',
    arquivo: DOOR,
    de: 'hasPaid: !notPaidProven',
    para: 'hasPaid: false',
    trava: (t) => /hasPaid: !notPaidProven/.test(t),
  },
  {
    nome: 'o pai passa a jurar que ninguém pagou (no modal)',
    arquivo: CLIENT,
    de: 'region={postVideoRegion}\n          notPaidProven={notPaidProven}',
    para: 'region={postVideoRegion}\n          notPaidProven={true}',
    trava: (t) => (t.match(/notPaidProven=\{notPaidProven\}/g) ?? []).length === 2,
  },
  {
    nome: 'a prova positiva vira predicado negado',
    arquivo: CLIENT,
    de: "setNotPaidProven(data.hasPaid === false)",
    para: "setNotPaidProven(data.hasPaid !== true)",
    trava: (t) => /setNotPaidProven\(data\.hasPaid === false\)/.test(t) && !/data\.hasPaid !== true/.test(t),
  },
  {
    nome: 'o botão de $1 perde a nota do dia 8',
    arquivo: DOOR,
    de: '{door.priceNote}',
    para: '{null}',
    trava: (t) => /\{door\.priceNote\}/.test(t),
  },
  {
    nome: 'a prop nasce ABERTA em vez de fechada',
    arquivo: CLIENT,
    de: 'notPaidProven = false,',
    para: 'notPaidProven = true,',
    trava: (t) => /notPaidProven = false,/.test(t),
  },
]

for (const m of MUTANTS) {
  const original = readFileSync(m.arquivo, 'utf8')
  const normalizado = original.replace(/\r\n/g, '\n')
  if (!normalizado.includes(m.de)) { fail(`mutante NÃO ANCOROU: ${m.nome}`); continue }
  const mutado = normalizado.replace(m.de, m.para)
  if (mutado === normalizado) { fail(`mutante NÃO ALTEROU: ${m.nome}`); continue }
  writeFileSync(m.arquivo, mutado, 'utf8')
  try {
    const relido = read(m.arquivo)
    if (relido === normalizado) { fail(`mutante NÃO FOI ESCRITO: ${m.nome}`); continue }
    if (m.trava(relido)) fail(`mutante SOBREVIVEU: ${m.nome}`)
    else pass(`mutante morto: ${m.nome}`)
  } finally {
    writeFileSync(m.arquivo, original, 'utf8')
  }
}

console.log('\n[R] Restauração')
check(/hasPaid: !notPaidProven/.test(read(DOOR)), 'a porta voltou ao original')
check(/notPaidProven=\{notPaidProven\}/.test(read(CLIENT)), 'a tela voltou ao original')

console.log(`\n${ok} ok / ${bad} falhas`)
process.exit(bad === 0 ? 0 : 1)
