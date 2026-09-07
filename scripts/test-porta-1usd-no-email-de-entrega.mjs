// ═══════════════════════════════════════════════════════════════════════════
// A PORTA DE $1 NO E-MAIL DE ENTREGA — va-r5 (07/09/2026)
// ═══════════════════════════════════════════════════════════════════════════
//
// POR QUE ESTE ARQUIVO EXISTE. O rodape do e-mail "seu filme esta pronto" e a
// maior superficie de dinheiro da casa (187 envios / 132 pessoas desde 02/09,
// ~13/dia) e o pedido que ele carregava — "Plans from $7/month" — tem ZERO
// chegadas em toda a sua historia. A porta de $1 entrou nele. O que este
// guardiao impede, nesta ordem de gravidade:
//
//  1. QUE A CASA ANUNCIE O QUE O COBRADOR RECUSA. `?trial=1` e negado para
//     quem tem `has_paid = true` e para tier != 'basic'. Um e-mail que promete
//     $1 a quem sera cobrado $15 e a "COPY QUE MENTE" da auditoria de 28/08.
//     (memoria `vitrine-oferece-o-que-o-cobrador-recusa`)
//  2. QUE O DESCONHECIDO VIRE `false`. `hasPaid` ausente = leitura de perfil
//     falhou = porta FECHADA. Aqui isto e mais que estilo: `isSubscriber` (o
//     predicado vizinho) nasce `false` quando a leitura falha, e usa-lo abriria
//     a porta exatamente no caso em que nao se sabe nada da pessoa.
//  3. QUE O NUMERO SEJA DIGITADO. Nenhum "$1"/"$15" no fonte — tudo sai de
//     `lib/lifecycle/trialEntryFee.ts`, que le a MESMA constante que a Stripe
//     cobra. (memoria `campo-validado-gravado-ecoado-nao-e-honrado`)
//  4. QUE O CARIMBO MINTA. `trialDoor` tem de concordar com o HTML: se o
//     evento disser `true` e a porta nao estiver la, a medicao mede fumaca.
//  5. QUE O E-MAIL PROMETA EXPORT LIMPO. A caixa da TELA pode ("Get this film
//     clean") porque tem o renderId e o /api/compose/unlock. O e-mail NAO tem
//     esse caminho. (CLAUDE.md: nunca prometer o que o produto nao executa)
//
// Roda a funcao REAL (transpileModule), como o guardiao irmao — contar texto
// nao prova condicao (memoria `guardiao-que-conta-texto-nao-prova-condicao`).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(root, 'node_modules/typescript'))

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }

// CRLF normalizado na LEITURA: ancora que atravessa duas linhas nunca casa no
// checkout Windows sem isto, e o falso vermelho treina gente a ignorar guardiao
// (memoria `guardiao-crlf-falso-vermelho`).
const read = (p) => readFileSync(path.join(root, p), 'utf8').split('\r\n').join('\n')

function loadTs(p, mocks = {}, srcOverride = null) {
  const src = srcOverride ?? read(p)
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: p }).outputText
  const m = { exports: {} }
  new Function('require', 'module', 'exports', out)((id) => { if (id in mocks) return mocks[id]; throw new Error(`${p}: unexpected import ${id}`) }, m, m.exports)
  return m.exports
}

const engine = loadTs('lib/credits/engineCost.ts')
const autopilot = loadTs('lib/autopilot/config.ts', { '@/lib/credits/engineCost': engine })
const pricing = loadTs('lib/checkoutPricing.ts', { '@/lib/credits/engineCost': engine, '@/lib/autopilot/config': autopilot })
const filmPlans = loadTs('lib/lifecycle/trialFilmPlans.ts', { '@/lib/checkoutPricing': pricing })
const series = loadTs('lib/seriesContinuation.ts')
const marketing = loadTs('lib/marketingPrice.ts', { '@/lib/checkoutPricing': pricing, '@/lib/credits/engineCost': engine })
const trialFee = loadTs('lib/lifecycle/trialEntryFee.ts', { '@/lib/checkoutPricing': pricing })
const FOOTER_MOCKS = {
  '@/lib/checkoutPricing': pricing,
  '@/lib/lifecycle/trialFilmPlans': filmPlans,
  '@/lib/seriesContinuation': series,
  '@/lib/marketingPrice': marketing,
  '@/lib/lifecycle/trialEntryFee': trialFee,
}
const { videoReadyFooter } = loadTs('lib/lifecycle/videoReadyFooter.ts', FOOTER_MOCKS)

const APP = 'https://www.usekineo.com'
const base = { cost: 25, topic: 'The lake that turns animals to stone', durationSeconds: 62, appUrl: APP }
const fee = trialFee.trialEntryFeeLabel({ compact: true })
const monthly = trialFee.trialMonthlyAfterLabel({ compact: true })
const hasDoor = (r) => r.html.includes('trial=1')

console.log('\n── 1. O PORTAO: a porta so abre para quem o cobrador aceitaria')
const semSaldo = { ...base, isSubscriber: false, creditsRemaining: 0 }
ok(hasDoor(videoReadyFooter({ ...semSaldo, hasPaid: false })), 'hasPaid=false (nao pagou nunca) → porta ABERTA')
ok(!hasDoor(videoReadyFooter({ ...semSaldo, hasPaid: true })), 'hasPaid=true → porta FECHADA (o cobrador negaria: card_trial_denied)')
ok(!hasDoor(videoReadyFooter({ ...semSaldo, hasPaid: null })), 'hasPaid=null (leitura falhou) → porta FECHADA — desconhecido nao vira false')
ok(!hasDoor(videoReadyFooter({ ...semSaldo })), 'hasPaid AUSENTE → porta FECHADA (falha fechada por construcao)')
ok(
  !hasDoor(videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 155, hasPaid: false })),
  'assinante NUNCA ve a porta, nem com hasPaid=false — o pedido dele e o proximo filme, nao entrar',
)

console.log('\n── 2. O CONTROLE QUE PROVA QUE NADA MAIS MUDOU')
// Sem `hasPaid`, o rodape tem de sair BYTE A BYTE como saia antes desta rotacao.
// E o que permite subir isto sem reauditar os quatro ramos.
for (const [rotulo, input] of [
  ['assinante', { ...base, isSubscriber: true, creditsRemaining: 155 }],
  ['trial com saldo', { ...base, isSubscriber: false, creditsRemaining: 40 }],
  ['saldo desconhecido', { ...base, isSubscriber: false, creditsRemaining: null }],
  ['sem saldo', { ...base, isSubscriber: false, creditsRemaining: 0 }],
]) {
  const semCampo = videoReadyFooter(input)
  const comNull = videoReadyFooter({ ...input, hasPaid: null })
  ok(semCampo.html === comNull.html, `${rotulo}: sem hasPaid === com hasPaid null (o HTML de antes, intacto)`)
  ok(semCampo.trialDoor === false, `${rotulo}: sem hasPaid → trialDoor=false no carimbo`)
}

console.log('\n── 3. O CARIMBO NAO PODE MENTIR')
for (const [rotulo, input] of [
  ['sem saldo', { ...base, isSubscriber: false, creditsRemaining: 0, hasPaid: false }],
  ['trial com saldo', { ...base, isSubscriber: false, creditsRemaining: 40, hasPaid: false }],
  ['saldo desconhecido', { ...base, isSubscriber: false, creditsRemaining: null, hasPaid: false }],
  ['custo desconhecido', { ...base, cost: 0, isSubscriber: false, creditsRemaining: 0, hasPaid: false }],
  ['assinante', { ...base, isSubscriber: true, creditsRemaining: 9, hasPaid: false }],
  ['ja pagou', { ...base, isSubscriber: false, creditsRemaining: 0, hasPaid: true }],
]) {
  const r = videoReadyFooter(input)
  ok(r.trialDoor === hasDoor(r), `${rotulo}: trialDoor (${r.trialDoor}) concorda com o HTML`)
}

console.log('\n── 4. O QUE A PORTA DIZ — derivado, e sem promessa que o link nao cumpre')
const door = videoReadyFooter({ ...semSaldo, hasPaid: false })
ok(door.html.includes(fee), `a taxa aparece derivada de trialEntryFeeLabel (${fee})`)
ok(door.html.includes(`${monthly}/month`), `a mensalidade aparece derivada de getTierPrice (${monthly}/month)`)
ok(door.html.includes(`${pricing.CARD_TRIAL_GRANT_CREDITS} credits now`), 'diz quantos creditos entram no ato (constante da tabela)')
ok(door.html.includes(`from day ${pricing.CARD_TRIAL_DAYS + 1}`), 'diz de que dia em diante cobra a mensalidade')
ok(/cancel anytime/.test(door.html), 'diz que da para cancelar — o mesmo compromisso do /pricing')
ok(!/clean|watermark|export/i.test(door.html), 'NAO promete export limpo: o e-mail nao tem renderId nem caminho de unlock')
ok(!/priority|1080p|premium voice|unlimited/i.test(door.html), 'nao promete fila, resolucao nem voz que o produto nao entrega')

console.log('\n── 5. O LINK BATE COM O QUE O COBRADOR EXIGE')
const rota = read('app/api/stripe/checkout/route.ts')
const tierDoCobrador = rota.match(/const TRIAL_TIER = '([a-z_]+)' as const/)?.[1]
ok(!!tierDoCobrador, 'TRIAL_TIER foi lido da rota de checkout (nao presumido)')
// O `&` sai como `&amp;` porque o href passa por esc() — e assim que se escreve
// URL em atributo HTML. Por isso a asserção compara a forma ESCAPADA: comparar a
// crua daria vermelho num link correto.
ok(
  door.html.includes(`tier=${tierDoCobrador}&amp;billing=monthly&amp;trial=1`),
  `o link usa o tier que o cobrador exige (${tierDoCobrador}) — se a rota mudar de tier, este teste fica vermelho`,
)
ok(
  !/href="[^"]*&(?!amp;|rarr;|mdash;|middot;)/.test(door.html),
  'todo & do href sai escapado (&amp;) — cliente de e-mail que nao desescapa quebraria o trial=1',
)
ok(
  /if \(wantsTrial && \(profile as \{ has_paid\?: boolean \| null \} \| null\)\?\.has_paid === true\)/.test(rota),
  'TRIPWIRE: o cobrador recusa o trial por `has_paid === true` — se essa regra mudar, a trava desta porta precisa mudar junto',
)
ok(
  /searchParams\.get\('trial'\) === '1'/.test(rota),
  'TRIPWIRE: o parametro do trial ainda e `trial=1`',
)
ok(
  /const intentCampaign = \/\^\[A-Za-z0-9\._~-\]\{1,100\}\$\/\.test\(rawIntentCampaign\)/.test(rota),
  'a rota sanitiza `intent_campaign` com uma classe que aceita `_` — o nosso carimbo sobrevive a ela',
)
ok(
  door.html.includes('intent_campaign=video_ready_email_trial_1usd_v1'),
  'a porta carrega carimbo PROPRIO — sem ele a medicao nao separa esta chegada da do link de plano',
)
ok(
  !door.html.includes('intent_campaign=video_ready_email_plan_truth_v1&tier'),
  'o carimbo do plano (zero cliques na historia) nao foi reaproveitado para a porta',
)

console.log('\n── 6. A ORDEM DENTRO DO E-MAIL')
const comSaldo = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: 40, hasPaid: false })
ok(hasDoor(comSaldo), 'quem tem saldo tambem ve a porta')
ok(
  comSaldo.html.indexOf('Episode 2:') < comSaldo.html.indexOf('trial=1'),
  'com saldo: o episodio 2 vem ANTES da porta (e a peca que melhor preve pagamento)',
)
ok(
  comSaldo.html.indexOf('trial=1') < comSaldo.html.indexOf('/pricing?'),
  'com saldo: a porta de $1 vem antes do plano cheio — o degrau mais barato primeiro',
)
ok(
  door.html.indexOf('trial=1') < door.html.indexOf('/pricing?'),
  'sem saldo: a porta vem antes do plano (unico ramo em que dinheiro e o unico pedido)',
)
ok(door.html.includes('/pricing?'), 'o plano CONTINUA visivel — ordem do fundador: nunca esconder o plano')
ok(comSaldo.html.includes('/pricing?'), 'o plano continua visivel tambem no ramo com saldo')

console.log('\n── 7. NENHUM NUMERO DE DINHEIRO DIGITADO NO FONTE')
const fonte = read('lib/lifecycle/videoReadyFooter.ts')
// Recorta so o corpo da porta: os comentarios do arquivo citam "$7/month" ao
// contar a historia, e proibir texto em comentario seria proibir a explicacao.
const corpoDaPorta = fonte.slice(fonte.indexOf('function trialDoorHtml'), fonte.indexOf('export function videoReadyFooter'))
ok(corpoDaPorta.length > 200, 'o corpo da porta foi recortado (a ancora existe)')
ok(!/\$\s?\d/.test(corpoDaPorta.replace(/\$\{[^}]*\}/g, '')), 'nenhum valor em dinheiro digitado dentro de trialDoorHtml')
ok(/trialEntryFeeLabel\(/.test(corpoDaPorta) && /trialMonthlyAfterLabel\(/.test(corpoDaPorta), 'os dois rotulos vem das funcoes derivadas')
ok(/CARD_TRIAL_DAYS/.test(corpoDaPorta) && /CARD_TRIAL_GRANT_CREDITS/.test(corpoDaPorta), 'dias e creditos vem das constantes da tabela de preco')

console.log('\n── 8. OS TRES REMETENTES PASSAM `hasPaid` (contrato sem chamador serve zero)')
// memoria `contrato-de-servidor-sem-chamador`: peca publicada com 0 chamadas.
const status = read('app/api/compose/status/[renderId]/route.ts')
ok(/hasPaid: readyEmailHasPaid,/.test(status), 'rota de status (o e-mail de maior vazao) passa hasPaid')
ok(/readyEmailHasPaid = typeof hasPaidCol === 'boolean' \? hasPaidCol : null/.test(status), 'rota de status: coluna nao-booleana vira null, nunca false')
ok(/trial_door: readyFooter\.trialDoor,/.test(status), 'rota de status carimba trial_door no evento')
const stranded = read('app/api/cron/finish-stranded-renders/route.ts')
ok(/hasPaid: typeof prof\?\.has_paid === 'boolean' \? prof\.has_paid : null,/.test(stranded), 'cron dos stranded passa hasPaid (os ~7% que so recebem e-mail)')
ok((stranded.match(/trial_door: footer\.trialDoor/g) ?? []).length === 2, 'cron dos stranded carimba trial_door nos DOIS envios')
const cron = read('app/api/cron/send-video-ready/route.ts')
ok(/trial_door: footer\.trialDoor,/.test(cron), 'cron send-video-ready carimba trial_door')
const lib = read('lib/lifecycle/videoReadyFooter.ts')
ok(/hasPaid: typeof prof\?\.has_paid === 'boolean' \? prof\.has_paid : null,/.test(lib), 'videoReadyFooterFromRows propaga hasPaid da linha de perfil')

console.log('\n── 9. MUTANTES (cada um conferido como ESCRITO antes de rodar)')
// memoria `mutacao-precisa-provar-que-aplicou`: mutante que nao foi aplicado
// devolve verde e se le como guardiao resistindo.
const mutantes = [
  {
    nome: 'trocar a trava por !isSubscriber (o predicado LARGO)',
    de: "if (hasPaid !== false) return null",
    para: "if (hasPaid === true) return null",
    prova: (f) => hasDoor(f({ ...semSaldo })) === false,
  },
  {
    nome: 'digitar o preco da taxa a mao',
    de: "const fee = trialEntryFeeLabel({ compact: true })",
    para: "const fee = '$1'",
    prova: () => {
      const src = read('lib/lifecycle/videoReadyFooter.ts').replace(
        'const fee = trialEntryFeeLabel({ compact: true })', "const fee = '$1'")
      const corpo = src.slice(src.indexOf('function trialDoorHtml'), src.indexOf('export function videoReadyFooter'))
      return !/\$\s?\d/.test(corpo.replace(/\$\{[^}]*\}/g, ''))
    },
  },
  {
    nome: 'abrir a porta para assinante',
    de: "      // Quem ja paga nunca ve a porta de entrada: o cobrador recusaria (`has_paid`)\n      // e o pedido dele nao e entrar, e o proximo filme.\n      trialDoor: false,",
    para: "      trialDoor: trialDoorHtml(appUrl, input.hasPaid, 'x', false) !== null,",
    prova: (f) => f({ ...base, isSubscriber: true, creditsRemaining: 155, hasPaid: false }).trialDoor === false,
  },
  {
    nome: 'carimbar trialDoor=true sem por a porta no HTML',
    de: "      html: `<p style=\"color:#94a3b8;font-size:13px;margin:24px 0 0\">${left} &mdash; enough for the next episode. People who make a second video are the ones who keep going.</p>${ep2}${door ?? ''}${plan}`,\n      trialDoor: door !== null,",
    para: "      html: `<p style=\"color:#94a3b8;font-size:13px;margin:24px 0 0\">${left} &mdash; enough for the next episode. People who make a second video are the ones who keep going.</p>${ep2}${plan}`,\n      trialDoor: door !== null,",
    prova: (f) => {
      const r = f({ ...base, isSubscriber: false, creditsRemaining: 40, hasPaid: false })
      return r.trialDoor === hasDoor(r)
    },
  },
  {
    nome: 'apagar o plano do ramo sem saldo (esconder o plano)',
    de: "  if (films) return { kind: 'plan_films', html: `${door ?? ''}${films}`, trialDoor: door !== null }",
    para: "  if (films) return { kind: 'plan_films', html: `${door ?? ''}`, trialDoor: door !== null }",
    prova: (f) => f({ ...semSaldo, hasPaid: false }).html.includes('/pricing?'),
  },
  {
    nome: 'prometer export limpo no e-mail',
    de: "`Try Creator for ${fee} &mdash; ${CARD_TRIAL_DAYS} days &rarr;</a></p>`",
    para: "`Get this film clean &mdash; ${CARD_TRIAL_DAYS} days for ${fee} &rarr;</a></p>`",
    prova: (f) => !/clean|watermark|export/i.test(f({ ...semSaldo, hasPaid: false }).html),
  },
]

const original = read('lib/lifecycle/videoReadyFooter.ts')
for (const mut of mutantes) {
  if (!original.includes(mut.de)) { n++; fail++; console.log('FAIL', n, `mutante NAO ANCOROU: ${mut.nome}`); continue }
  const mutado = original.replace(mut.de, mut.para)
  if (mutado === original) { n++; fail++; console.log('FAIL', n, `mutante NAO ALTEROU NADA: ${mut.nome}`); continue }
  let sobreviveu
  try {
    const mod = loadTs('lib/lifecycle/videoReadyFooter.ts', FOOTER_MOCKS, mutado)
    sobreviveu = mut.prova(mod.videoReadyFooter)
  } catch {
    sobreviveu = false // mutante que nem compila esta morto do mesmo jeito
  }
  ok(!sobreviveu, `mutante MORRE: ${mut.nome}`)
}

console.log(`\n${n - fail}/${n} ok`)
if (fail) process.exit(1)
