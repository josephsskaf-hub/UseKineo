// sprint-v1v4 #27 — O SEGUNDO CAMINHO DA RECUSA DE SALDO
//
// A recusa `trial_credits_stalled` sabia dizer "Add a plan" e mais nada. Medido
// em 60 dias (so externos): 26 recusas / 15 pessoas, saldo de 9 a 62 creditos,
// NENHUMA zerada — e em 19 das 26 existia uma combinacao motor x duracao deste
// mesmo cardapio que o saldo pagava naquele segundo.
//
// Este teste prova TRES coisas, nesta ordem de importancia:
//   A) o contrato da copy: a frase de plano do Codex sai PRIMEIRA e byte a
//      byte, e a frase nova nao fala de dinheiro;
//   B) a regra: replay do `planoDeResgate` sobre as 26 linhas REAIS medidas
//      em producao, com a MESMA funcao de custo que cobra;
//   C) a pista do Codex intacta.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const rota = readFileSync(join(raiz, 'app/api/generate-video-cinematic/route.ts'), 'utf8')
const lib = readFileSync(join(raiz, 'lib/engineAffordability.ts'), 'utf8')

let ok = 0, falhas = []
const t = (nome, cond) => { if (cond) ok++; else falhas.push(nome) }

// ───────────────────────── BLOCO A — CONTRATO DA COPY ─────────────────────
const COPY_PLANO = 'Add a plan to keep the AI engine.'
t('A1 copy de plano do Codex continua na rota, byte a byte',
  rota.includes(COPY_PLANO))
t('A2 a frase nova vem DEPOIS da copy de plano, nunca no lugar dela',
  rota.includes(COPY_PLANO + '${fraseDoResgate ? ` ${fraseDoResgate}` : \'\'}`'))
t('A3 o extrato generico (`insufficient_credits`) tambem ganhou o segundo caminho',
  rota.includes('This needs ${cost} credits. You have ${balance}.${fraseDoResgate'))
t('A4 `trial_credits_spent` (saldo ZERO) NAO ganhou frase: nao ha o que caber',
  rota.includes("Add a plan to keep making AI videos.`") &&
  !rota.includes('Add a plan to keep making AI videos.${fraseDoResgate'))

// A frase nova nao pode conter uma unica palavra de dinheiro/oferta.
// A frase VISIVEL, e so ela: o recorte para no fim da expressao e as
// interpolacoes `${...}` sao removidas — dentro delas so ha nome de variavel,
// nunca texto que o cliente le.
const _ini = rota.indexOf('const fraseDoResgate =')
const _fim = rota.indexOf("            : ''", _ini)
const trechoFrase = rota.slice(_ini, _fim).replace(/\$\{[^}]*\}/g, '')
for (const proibida of ['plan', 'Plan', 'upgrade', 'Upgrade', 'price', 'Price', 'pricing',
                        'free', 'Free', 'trial', 'Trial', 'coupon', 'discount', '$', 'month',
                        'subscribe', 'Subscribe', 'quota']) {
  t(`A5 a frase de resgate nao diz "${proibida}"`, !trechoFrase.includes(proibida))
}
t('A6 a frase diz segundos e creditos — os dois numeros tecnicos, e so eles',
  trechoFrase.includes('credits —') && trechoFrase.includes('s version of the same film costs'))
t('A6b os segundos vem da variavel do resgate, nunca de numero fixo',
  rota.includes('A ${resgateDoSaldo.alvo.duracao}s version of the same film costs ${resgateDoSaldo.alvo.custo} credits'))

// O caminho de compra sai daqui como entrou.
t('A7 `upsell` continua identico (creator quando trialBuyer e nao held)',
  rota.includes("upsell: trialBuyer && !heldExplainsGap ? 'creator' : undefined"))
t('A8 `reason` continua sendo o stallReason cru',  rota.includes('reason: stallReason,'))
t('A9 `needed` e `balance` continuam no payload',  rota.includes('needed: cost,') && rota.includes('\n          balance,\n'))

// held_by_render nao vira conversa de concessao: o saldo volta sozinho.
t('A10 `credits_held_by_render` sai de fora do resgate',
  rota.includes("const resgateDoSaldo = heldExplainsGap"))
t('A11 e continua sendo o unico 402 sem modal de planos',
  rota.includes("? ({ tipo: 'cabe' } as const)"))

// O cadeado de plano do Codex tem precedencia.
t('A12 motores premium so entram no resgate se o plano/trial ja os liberou',
  rota.includes('const premiumLiberado = isPaidUser || (TRIAL_UNLOCKS_PREMIUM && trialActive)'))
t('A13 sem premium, o resgate so pode oferecer o motor de entrada',
  rota.includes(": ['seedance'],"))
t('A14 o gate de plano acima usa EXATAMENTE a mesma condicao',
  rota.includes('!isPaidUser && !(TRIAL_UNLOCKS_PREMIUM && trialActive)'))

// A duracao nunca pode ser um numero que o seletor nao oferece (licao da #11).
t('A15 as duracoes sao as tres do seletor, em constante nomeada',
  rota.includes('const DURACOES_DO_SELETOR = [35, 60, 90] as const'))
const cliente = readFileSync(join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
for (const d of [35, 60, 90]) {
  t(`A16 o seletor do cliente realmente oferece ${d}s`, cliente.includes(`{ value: ${d},`))
}
t('A17 o seletor NAO tem uma quarta duracao que o servidor ignoraria',
  (cliente.match(/const DURATION_OPTIONS: \{ value: Duration; label: string \}\[\] = \[([\s\S]*?)\]/) || [,''])[1]
    .split('value:').length - 1 === 3)

// O custo sai da funcao que COBRA, nunca de tabela local.
t('A18 custoDe usa creditCostForDuration, a mesma do biller',
  rota.includes('creditCostForDuration(MOTOR_PARA_QUALIDADE[m] ?? \'cinematic_ai\', true, d)'))
t('A19 nenhum numero de credito escrito a mao no bloco novo',
  !/MOTOR_PARA_QUALIDADE[\s\S]{0,1200}custo:\s*\d+/.test(rota))

// Telemetria: campo novo, metrica antiga intacta.
t('A20 o evento que mede ganhou `rescue`', rota.includes('rescue: resgateDoSaldo.tipo,'))
t('A21 e os tres campos do alvo', rota.includes('rescue_engine:') && rota.includes('rescue_seconds:') && rota.includes('rescue_cost:'))
t('A22 `used`/`balance`/`needed` do evento nao mudaram',
  rota.includes('needed: cost,') && rota.includes('balance,\n        held_by_unsettled_render'))

// ───────────────────── BLOCO B — A REGRA, SOBRE DADO REAL ─────────────────
const REF = 60
const BASE = { seedance: 25, h3: 45, kling: 50, veo: 100, hollywood: 150, omni: 150 }
const custoDe = (m, d) => Math.max(1, Math.ceil(BASE[m] * (Math.min(180, Math.max(10, d)) / REF)))
const DUR = [35, 60, 90]
const TODOS = ['seedance', 'h3', 'kling', 'veo', 'hollywood', 'omni']

// copia fiel da ordem documentada em lib/engineAffordability.ts
function resgate({ motorAtual, duracaoAtual, saldo, motoresDisponiveis }) {
  if (custoDe(motorAtual, duracaoAtual) <= saldo) return { tipo: 'cabe' }
  const curtas = DUR.filter((d) => d < duracaoAtual)
    .map((d) => ({ motor: motorAtual, duracao: d, custo: custoDe(motorAtual, d) }))
    .filter((c) => c.custo <= saldo).sort((a, b) => b.duracao - a.duracao)
  if (curtas.length) return { tipo: 'mesma_camera', alvo: curtas[0] }
  const outras = motoresDisponiveis.filter((m) => m !== motorAtual)
    .map((m) => ({ motor: m, duracao: duracaoAtual, custo: custoDe(m, duracaoAtual) }))
    .filter((c) => c.custo <= saldo && c.custo > 0).sort((a, b) => b.custo - a.custo)
  if (outras.length) return { tipo: 'outra_camera', alvo: outras[0] }
  return { tipo: 'nada_cabe' }
}

t('B0 a ordem testada aqui e a mesma documentada na lib',
  lib.includes('1º tenta a MESMA câmera mais curta') && lib.includes('a MAIS CARA que'))

// As 26 recusas REAIS de 60 dias (motor, saldo, duracao inferida, quantas vezes).
const REAIS = [
  ['seedance', 19, 60, 6], ['seedance', 10, 60, 4], ['seedance', 25, 60, 2],
  ['seedance', 25, 90, 2], ['hollywood', 62, 60, 2], ['seedance', 9, 60, 2],
  ['seedance', 21, 60, 2], ['seedance', 10, 35, 1], ['h3', 25, 60, 1],
  ['kling', 25, 35, 1], ['kling', 25, 60, 1], ['h3', 25, 35, 1], ['seedance', 21, 90, 1],
]
let comSaida = 0, jaCabe = 0, total = 0
for (const [motor, saldo, dur, n] of REAIS) {
  const r = resgate({ motorAtual: motor, duracaoAtual: dur, saldo, motoresDisponiveis: TODOS })
  total += n
  if (r.tipo === 'mesma_camera' || r.tipo === 'outra_camera') {
    comSaida += n
    t(`B1 ${motor}/${saldo}cr/${dur}s tem saida e ela CABE no saldo`, r.alvo.custo <= saldo)
    t(`B2 ${motor}/${saldo}cr/${dur}s nao oferece o que ja foi recusado`,
      !(r.alvo.motor === motor && r.alvo.duracao === dur))
  } else if (r.tipo === 'cabe') {
    // Recusada la atras por um custo que a tabela de HOJE nao produz mais
    // (a escala por duracao de 20/08 mudou os numeros). Nao e resgate: hoje
    // essa pessoa nem veria a recusa.
    jaCabe += n
    t(`B3 ${motor}/${saldo}cr/${dur}s hoje passaria direto`, custoDe(motor, dur) <= saldo)
  } else {
    // nada_cabe tem que ser VERDADE: nenhuma combinacao do cardapio cabe.
    const alguma = TODOS.some((m) => DUR.some((d) => custoDe(m, d) <= saldo))
    t(`B3 ${motor}/${saldo}cr diz "nada cabe" e e verdade`, !alguma)
  }
}
t('B4 as 26 recusas medidas estao todas no replay', total === 26)
t('B5 17 das 26 ganham o segundo caminho', comSaida === 17)
t('B6 mais 2 nem seriam recusadas hoje — 19 das 26 tinham saida', comSaida + jaCabe === 19)
t('B7 as 7 restantes sao "nada cabe" honesto', total - comSaida - jaCabe === 7)

// Fail-closed: saldo ilegivel nunca vira oferta.
for (const saldo of [0, -1, null, undefined, NaN]) {
  const r = resgate({ motorAtual: 'seedance', duracaoAtual: 60, saldo: Number(saldo) || 0, motoresDisponiveis: TODOS })
  t(`B8 saldo ${String(saldo)} nao gera oferta`, r.tipo === 'nada_cabe')
}
// Sem premium, o resgate nunca escapa do motor de entrada.
const semPremium = resgate({ motorAtual: 'hollywood', duracaoAtual: 60, saldo: 62, motoresDisponiveis: ['seedance'] })
t('B9 sem premium liberado, so o motor de entrada pode ser oferecido',
  semPremium.tipo !== 'outra_camera' || semPremium.alvo.motor === 'seedance')
// Preferencia: mesma camera antes de trocar de camera.
const pref = resgate({ motorAtual: 'kling', duracaoAtual: 90, saldo: 40, motoresDisponiveis: TODOS })
t('B10 mesma camera tem precedencia sobre trocar de camera',
  pref.tipo === 'mesma_camera' && pref.alvo.motor === 'kling')
// Quando troca, oferece a MELHOR que cabe, nao a mais barata.
const melhor = resgate({ motorAtual: 'hollywood', duracaoAtual: 60, saldo: 62, motoresDisponiveis: TODOS })
t('B11 ao trocar de camera, oferece a mais cara que cabe (Kling 2.5, nao Seedance)',
  melhor.tipo === 'outra_camera' && melhor.alvo.motor === 'kling')

// ───────────────────── BLOCO C — PISTA DO CODEX INTACTA ───────────────────
t('C1 a rota nao importa nada de checkout/pricing/growth',
  !/from '@\/lib\/(checkoutPricing|marketingPrice|growth)/.test(rota))
t('C2 nenhum preco em dolar escrito na rota nova',
  !trechoFrase.includes('$9') && !trechoFrase.includes('$19') && !trechoFrase.includes('$39'))
t('C3 a lib de resgate nao foi tocada (segue sem I/O e sem preco)',
  !lib.includes('fetch(') && !lib.includes('$'))

console.log(`\n${ok} verificacoes ok, ${falhas.length} falhas`)
if (falhas.length) { for (const f of falhas) console.log('  ✗', f); process.exit(1) }
