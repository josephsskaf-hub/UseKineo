// scripts/test-recovery-clock-premise-2026-09-05.mjs
//
// sprint-assinaturas #8-checkpoint (05/09/2026)
//
// O QUE ESTE GUARDIÃO EXISTE PARA IMPEDIR
// ────────────────────────────────────────
// O e-mail de lead quente (`send-recovery`) toma DUAS decisões de copy que
// dependem de UM número que não é dele: quando a linha de `checkout_abandoned`
// nasce. Esse número é o `expires_at` da sessão Stripe, e mora em
// lib/growth/checkoutSessionWindow.ts (`RECURRING_CHECKOUT_WINDOW_HOURS`).
//
// Ele JÁ MUDOU DUAS VEZES sem que a copy fosse revista:
//   · 03/08 → 29/08: janela de ~2h  (o e-mail podia sair em ~4h do clique)
//   · 30/08 → hoje:  janela de ~24h (KINEO-CHECKOUT-24H-2026-08-30)
// E a #8 quase "corrigiu" o comentário de 24h para 2h usando a mediana de todo
// o histórico (1,98h) — que é a média de dois regimes que nunca coexistiram.
// A correção teria quebrado uma frase CORRETA.
//
// Este teste falha se a janela mudar de valor sem que o bloco de decisão de
// copy do send-recovery seja revisitado. VERMELHO aqui não é "conserte o
// teste": é "vá reler as duas decisões de copy e diga qual continua verdadeira".
//
// Roda sem rede e sem banco: lê os ARQUIVOS REAIS.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const rotaPath = join(raiz, 'app/api/cron/send-recovery/route.ts')
const janelaPath = join(raiz, 'lib/growth/checkoutSessionWindow.ts')
const rota = readFileSync(rotaPath, 'utf8')
const janela = readFileSync(janelaPath, 'utf8')

let ok = 0
const falhas = []
function check(nome, condicao, detalhe = '') {
  if (condicao) {
    ok++
  } else {
    falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ''}`)
  }
}

// ── 1. A FONTE DA VERDADE EXISTE E É LEGÍVEL ───────────────────────────────
const mJanela = janela.match(
  /export const RECURRING_CHECKOUT_WINDOW_HOURS\s*=\s*(\d+)/,
)
check(
  '1.1 checkoutSessionWindow.ts exporta RECURRING_CHECKOUT_WINDOW_HOURS',
  Boolean(mJanela),
  'a constante sumiu ou mudou de nome — a copy do send-recovery ficou órfã',
)
const horasJanela = mJanela ? Number(mJanela[1]) : null
check(
  '1.2 a janela é um número de horas plausível (1..24, teto da Stripe)',
  horasJanela !== null && horasJanela >= 1 && horasJanela <= 24,
  `valor lido: ${horasJanela}`,
)

// ── 2. O SEND-RECOVERY IMPORTA O NÚMERO EM VEZ DE DIGITAR ──────────────────
check(
  '2.1 send-recovery importa RECURRING_CHECKOUT_WINDOW_HOURS',
  /import\s*\{[^}]*RECURRING_CHECKOUT_WINDOW_HOURS[^}]*\}\s*from\s*'@\/lib\/growth\/checkoutSessionWindow'/.test(
    rota,
  ),
  'sem o import, uma mudança de janela não chega aqui e a copy mente em silêncio',
)
check(
  '2.2 o payload do cron reporta a janela da sessão',
  /checkout_session_expiry_hours:\s*RECURRING_CHECKOUT_WINDOW_HOURS/.test(rota),
  'sem isso, a mudança só é descobrível arqueologando expired_at semanas depois',
)
check(
  '2.3 o valor reportado é a CONSTANTE, nunca um literal',
  !/checkout_session_expiry_hours:\s*\d/.test(rota),
  'um literal aqui recria exatamente o defeito que este guardião cobre',
)

// ── 3. A DECISÃO DE COPY CONTINUA AMARRADA AO NÚMERO VIVO ──────────────────
// O bloco do relógio precisa (a) citar a constante pelo nome e (b) carregar o
// aviso de que a frase já foi mentira. Se alguém reescrever o bloco a partir de
// uma mediana histórica, as duas coisas somem juntas e este check acusa.
const blocoRelogio = rota.match(/·\s*O RELÓGIO:[\s\S]{0,700}?(?=\n\s*\/\/\s*·|\n\s*'-)/)
check(
  '3.1 o bloco "O RELÓGIO" da decisão de copy ainda existe',
  Boolean(blocoRelogio),
  'o bloco que este guardião protege foi removido ou renomeado',
)
const textoRelogio = blocoRelogio ? blocoRelogio[0] : ''
check(
  '3.2 o bloco cita RECURRING_CHECKOUT_WINDOW_HOURS como fonte',
  textoRelogio.includes('RECURRING_CHECKOUT_WINDOW_HOURS'),
  'a copy voltou a afirmar um número sem apontar de onde ele vem',
)
check(
  '3.3 o bloco avisa que a frase já foi mentira',
  /JÁ FOI MENTIRA/.test(textoRelogio),
  'sem o aviso, a próxima sessão reescreve a frase a partir da mediana e erra de novo',
)

// ── 4. O NÚMERO ESCRITO NA PROSA BATE COM O NÚMERO VIVO ────────────────────
// Este é o coração do guardião: a prosa do bloco do relógio diz "~24h". Se a
// janela virar 2h de novo, esta comparação fica VERMELHA e força a releitura.
const mProsa = textoRelogio.match(/EXPIRA\s*\(hoje\s*~(\d+)h/)
check(
  '4.1 a prosa do relógio declara um número de horas legível',
  Boolean(mProsa),
  'não consegui achar "EXPIRA (hoje ~Nh" — a prosa mudou de forma',
)
const horasProsa = mProsa ? Number(mProsa[1]) : null
check(
  '4.2 a prosa do send-recovery BATE com a janela real da Stripe',
  horasProsa !== null && horasJanela !== null && horasProsa === horasJanela,
  `prosa diz ~${horasProsa}h, lib/growth/checkoutSessionWindow.ts diz ${horasJanela}h. ` +
    'NÃO conserte editando o número: vá reler as duas decisões de copy ' +
    '(o relógio e a colisão com send-abandon-recovery) e decida quais ainda valem.',
)

// ── 5. A HISTÓRIA MEDIDA FICA GRAVADA NO ARQUIVO ───────────────────────────
// Sem ela, a próxima sessão refaz a mesma medição errada e chega à mesma
// conclusão errada.
check(
  '5.1 o bloco KINEO-RECOVERY-RELOGIO-MEDIDO-2026-09-05 está no arquivo',
  rota.includes('KINEO-RECOVERY-RELOGIO-MEDIDO-2026-09-05'),
)
check(
  '5.2 ele registra que o intervalo é BIMODAL',
  /BIMODAL/.test(rota),
  'é a única frase que impede a mediana de janela longa de convencer de novo',
)
check(
  '5.3 ele nomeia o commit que mudou a janela',
  rota.includes('KINEO-CHECKOUT-24H-2026-08-30'),
  'sem o nome do commit, o atraso volta a parecer defeito em vez de decisão',
)
check(
  '5.4 ele registra que o regime de ~2h morreu em 29/08',
  /29\/08/.test(rota),
)

// ── 6. A JANELA DE ELEGIBILIDADE DO JOB NÃO REGREDIU ───────────────────────
// Com expiry de 24h, uma janela de 48h dá só 2 execuções úteis — foi o defeito
// de inanição de 13/08. O conserto (7 dias) precisa continuar de pé.
const mElegib = rota.match(/const RECOVERY_WINDOW_HOURS\s*=\s*([\d\s*]+)/)
const horasElegib = mElegib ? Function(`"use strict";return (${mElegib[1]})`)() : null
check(
  '6.1 a janela de elegibilidade é de pelo menos 7 dias',
  horasElegib !== null && horasElegib >= 7 * 24,
  `valor lido: ${horasElegib}h — abaixo disso a inanição de 13/08 volta`,
)
check(
  '6.2 a janela de elegibilidade cobre a expiração da sessão com folga (>= 4x)',
  horasElegib !== null && horasJanela !== null && horasElegib >= horasJanela * 4,
  `elegibilidade ${horasElegib}h vs expiração ${horasJanela}h`,
)

// ── RESULTADO ──────────────────────────────────────────────────────────────
const total = ok + falhas.length
if (falhas.length > 0) {
  console.error(`\n❌ VERMELHO — ${falhas.length} de ${total} checks falharam:\n`)
  for (const f of falhas) console.error(`   · ${f}`)
  console.error(
    '\nLembrete: este guardião não pede que você edite um número para ele ficar\n' +
      'verde. Ele pede que você releia as decisões de copy que dependiam dele.\n',
  )
  process.exit(1)
}
console.log(`✅ VERDE — ${ok}/${total} checks (relógio do send-recovery amarrado à janela real da Stripe)`)
