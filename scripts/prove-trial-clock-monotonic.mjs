/**
 * ═══ KINEO-TRIAL-CLOCK-NONMONOTONIC-2026-08-10 ═══════════════════════════════
 *
 * Prova de COMPORTAMENTO da correção de `endedAt` em
 * app/api/cron/trial-lifecycle-emails/route.ts → dueKind().
 *
 * Roda offline (`npm run prove:trial-clock`), sem banco e sem rede: as 9 linhas
 * abaixo são as linhas REAIS 'downgraded' de produção em 10/08 13:2xZ, copiadas
 * do Supabase (projeto cqqukkvjjrguayiyjvhh) com os ids truncados em 8
 * caracteres, como nos docs de sprint. São 9 e não 10 porque a décima linha
 * rebaixada da história (`84c9ddee`) cai em `isTestEmail` e nunca receberia
 * e-mail — o "10 de 10" do comentário do route.ts e o "9" daqui falam da mesma
 * coorte, contada antes e depois do filtro de contas internas.
 *
 * `NOW` é o relógio REAL (`Date.now()`), sobrescritível por argv[1] em ISO para
 * reproduzir uma data. Congelar `NOW` faria a asserção de inércia continuar
 * verde meses depois de ela ter deixado de significar alguma coisa.
 *
 * O QUE ELE PROVA, e por que cada parte tem que existir:
 *
 *   1. INÉRCIA HOJE. Nas 9 linhas, no instante de agora, ANTES e DEPOIS decidem
 *      o MESMO kind. A correção não muda nenhum e-mail de hoje. (Sem esta
 *      asserção, "não tem regressão" seria opinião.)
 *   2. O DEFEITO EXISTE. O relógio ANTIGO tem que ANDAR PARA TRÁS em pelo menos
 *      uma linha quando o tempo avança. Se nenhuma andar, o script FALHA — um
 *      teste de inércia que nunca vê o ramo quebrado não prova nada além de si
 *      mesmo (lição de 07/08: "script de inércia também tem que falhar se o
 *      ramo nunca disparar").
 *   3. A CORREÇÃO É MONOTÔNICA. O relógio NOVO nunca decresce em nenhuma linha
 *      em nenhum instante amostrado.
 *   4. O CUSTO EM DIAS, POR KIND, simulando o cron. Ver o aviso na seção 4: a
 *      primeira versão desta seção era aritmética disfarçada e errou o número.
 *   5. A GUARDA DE STATUS ('expired' não confia em carimbo de ciclo anterior).
 *   6. SEGURANÇA DA JANELA DE DEPLOY. O relógio novo move `endedAt` para TRÁS,
 *      logo as janelas FECHADAS também andam para trás: existe um intervalo de
 *      calendário em que deployar faria uma conta perder um kind para sempre,
 *      em silêncio. A seção 6 falha se HOJE for esse dia.
 *   7. AS CONSTANTES não podem divergir do route.ts (lidas do arquivo).
 *
 * SAI COM EXIT 1 EM QUALQUER FALHA — é gate de pré-commit/pré-deploy, e está em
 * package.json como `prove:trial-clock` para poder ser rodado sem lembrar dele.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HOUR = 3600e3
const DAY = 24 * HOUR

// Constantes espelhadas de app/api/cron/trial-lifecycle-emails/route.ts.
// ⚠️ Cópia local de valores que têm fonte única. O gate contra a divergência é a
// seção 7, que LÊ o route.ts e compara — sem ela esta cópia mentiria em
// silêncio no dia em que alguém mexesse numa janela.
const DOWNGRADED_LOSS_TO = 48 * HOUR
const OFFER_D5_FROM = 5 * DAY
const OFFER_D10_FROM = 10 * DAY
const OFFER_D10_TO = 15 * DAY
const EXTENSION_MAX_AGE = 7 * DAY
// KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — o critério da extensão deixou de
// ser "usou POUCO crédito" e passou a ser "concluiu 3+ vídeos E ainda tem
// crédito utilizável". `EXTENSION_MAX_CREDITS_USED` não existe mais no
// route.ts; a seção 7 teria falhado (lerConst devolve null) — foi assim que
// este script avisou da troca, que é para isso que ele existe.
const EXTENSION_MIN_VIDEOS = 3
const EXTENSION_MIN_USABLE_CREDITS = 1
const TRIAL_CREDIT_CAP = 40

const ROUTE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'app/api/cron/trial-lifecycle-emails/route.ts',
)

const t = (s) => Date.parse(s)

/** As 9 linhas 'downgraded' reais. `used=40` em todas: morreram no TETO. */
const ROWS = [
  { id: '2762a44e', used: 40, ext: false, ends: '2026-08-11T18:43:05.190Z', down: '2026-08-08T20:55:27.205Z' },
  { id: 'e6acebb8', used: 40, ext: false, ends: '2026-08-16T02:11:22.970Z', down: '2026-08-09T02:55:24.225Z' },
  { id: '3b48cf8e', used: 40, ext: false, ends: '2026-08-12T01:38:53.808Z', down: '2026-08-09T02:55:24.225Z' },
  { id: 'ade5c987', used: 40, ext: false, ends: '2026-08-16T04:38:02.534Z', down: '2026-08-09T05:55:24.144Z' },
  { id: '6eb47386', used: 40, ext: false, ends: '2026-08-16T16:16:30.032Z', down: '2026-08-09T16:55:24.147Z' },
  { id: 'a345b3dc', used: 40, ext: false, ends: '2026-08-13T04:06:04.381Z', down: '2026-08-10T04:55:24.144Z' },
  { id: 'd61e5818', used: 40, ext: false, ends: '2026-08-13T05:41:38.024Z', down: '2026-08-10T05:55:24.290Z' },
  { id: 'c16336a8', used: 40, ext: false, ends: '2026-08-17T07:47:20.942Z', down: '2026-08-10T07:55:24.173Z' },
  { id: '3328afb2', used: 40, ext: false, ends: '2026-08-13T09:00:08.786Z', down: '2026-08-10T09:55:24.141Z' },
]

/** Relógio ANTIGO: prefere o prazo assim que ele passa. */
function endedAtAntes(row, now) {
  const ends = t(row.ends)
  const down = t(row.down)
  return ends > 0 && ends <= now ? ends : down > 0 && down <= now ? down : 0
}

/** Relógio NOVO: o PRIMEIRO carimbo real que já passou. */
function endedAtDepois(row, now, status = 'downgraded') {
  const ends = t(row.ends)
  const down = status === 'downgraded' ? t(row.down) : 0
  const byClock = ends > 0 && ends <= now ? ends : 0
  const byCap = down > 0 && down <= now ? down : 0
  if (byClock > 0 && byCap > 0) return Math.min(byClock, byCap)
  return byClock > 0 ? byClock : byCap
}

/** O ramo 'expired' | 'downgraded' de dueKind(), reduzido ao que o relógio decide. */
function kindFor(row, endedAt, now) {
  if (endedAt === 0) return 'SEM RELOGIO'
  const sinceEnd = now - endedAt
  // KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — regra nova, espelhada.
  // As 9 linhas desta fixture têm `used = 40`, ou seja capLeft = 0, e o gate de
  // crédito utilizável (≥1) as reprova SOZINHO, sem precisar da contagem de
  // vídeos que este script offline não tem. Sob a regra ANTIGA elas também
  // eram reprovadas (40 >= 10) — por motivo diferente, mesmo resultado. Logo o
  // ramo da extensão continua INERTE aqui e nenhuma conclusão das seções de
  // relógio muda por causa desta troca. A seção 9 prova essa inércia.
  const capLeft = Math.max(0, TRIAL_CREDIT_CAP - row.used)
  const usableAfterExtension = Math.min(capLeft, (row.balance ?? 0) + Math.max(0, TRIAL_CREDIT_CAP - row.used))
  const vids = row.vids ?? 0
  if (
    !row.ext &&
    vids >= EXTENSION_MIN_VIDEOS &&
    usableAfterExtension >= EXTENSION_MIN_USABLE_CREDITS &&
    sinceEnd < EXTENSION_MAX_AGE
  ) {
    return 'trial_extended'
  }
  if (sinceEnd < DOWNGRADED_LOSS_TO) return 'downgraded_loss'
  if (sinceEnd >= OFFER_D5_FROM && sinceEnd < OFFER_D10_FROM) return 'expired_offer_d5'
  if (sinceEnd >= OFFER_D10_FROM && sinceEnd < OFFER_D10_TO) return 'expired_lastcall_d10'
  return 'nada'
}

const failures = []
const check = (ok, msg) => {
  if (!ok) failures.push(msg)
}

// Instantes amostrados: agora, e 1 minuto depois de cada `trial_ends_at` do
// conjunto (que é exatamente onde o ternário antigo troca de perna), mais uma
// varredura de hora em hora até 20 dias para não depender de eu ter escolhido
// os instantes certos.
const NOW = process.argv[2] ? t(process.argv[2]) : Date.now()
// A varredura começa no MENOR carimbo do conjunto, não em NOW: rodando este
// script semanas depois, começar em NOW pularia justamente os instantes em que
// o relógio antigo troca de perna, e as seções 2/3 passariam por vacuidade.
const INICIO = Math.min(...ROWS.map((r) => t(r.down))) - HOUR
// ⚠️ O `+20d` tem que ser medido a partir do MAIOR entre o último prazo e NOW.
// Medido só a partir dos prazos, um NOW posterior a FIM deixava a seção 6 com um
// único instante candidato no futuro, e ela passava 100% pela perna do resgate
// ("já saiu no relógio antigo") — um gate de segurança que só sabe passar.
const FIM = Math.max(Math.max(...ROWS.map((r) => t(r.ends))) + 20 * DAY, NOW + 20 * DAY)
const instants = new Set([NOW])
for (const r of ROWS) instants.add(t(r.ends) + 60e3)
for (let ms = INICIO; ms <= FIM; ms += HOUR) instants.add(ms)
const TIMELINE = [...instants].sort((a, b) => a - b)

console.log(`═══ 1. IMPACTO DE DEPLOYAR AGORA (${new Date(NOW).toISOString().slice(0, 16)}Z) ═══`)
//
// ⚠️ ESTA SEÇÃO JÁ COMPAROU A COISA ERRADA. A versão anterior comparava
// `kindFor()` cru nos dois relógios e FALHAVA sempre que eles divergiam — em
// qualquer direção. Medido dia a dia: isso pintava 21 dias seguidos de vermelho
// (12/08 a 01/09) sem nada errado no código, e a maioria das divergências era
// `(nada) → expired_offer_d5`, ou seja, o relógio NOVO mandando um e-mail que o
// antigo não mandaria — BENEFÍCIO reportado como regressão. E ignorava o claim,
// que a seção 4 já modelava: dois kinds diferentes, ambos já reivindicados, não
// produzem e-mail nenhum e não são divergência de coisa alguma.
//
// A pergunta certa, e a única que justifica travar um deploy: deployar agora
// TIRA de alguém um e-mail que ele receberia? Só essa direção falha. O outro
// lado é impresso como ganho.
function enviadoEm(row, relogio, now) {
  const k = kindFor(row, relogio(row, now), now)
  if (k === 'nada' || k === 'SEM RELOGIO') return null
  // Claim permanente: se este kind já saiu num instante anterior, hoje não sai.
  const jaSaiu = TIMELINE.some((t0) => t0 < now && kindFor(row, relogio(row, t0), t0) === k)
  return jaSaiu ? null : k
}
const antigo = (row, now) => endedAtAntes(row, now)
const novo = (row, now) => endedAtDepois(row, now)
console.log('conta     morreu_em            prazo_nominal        ENVIARIA (antigo)   ENVIARIA (novo)')
let divergentes = 0
let ganhos = 0
for (const r of ROWS) {
  const ea = enviadoEm(r, antigo, NOW)
  const en = enviadoEm(r, novo, NOW)
  if (ea !== en) divergentes += 1
  if (ea === null && en !== null) ganhos += 1
  console.log(
    `${r.id}  ${r.down.slice(0, 16)}     ${r.ends.slice(0, 16)}     ${String(ea ?? '—').padEnd(20)}${en ?? '—'}`,
  )
  check(
    !(ea !== null && en === null),
    `[1] ${r.id}: deployar AGORA TIRA o e-mail '${ea}' desta conta`,
  )
}
console.log(
  `divergências: ${divergentes} (nenhuma delas remove e-mail) · e-mails que só o relógio NOVO manda: ${ganhos}`,
)

console.log('\n═══ 2/3. MONOTONICIDADE ao longo de 20 dias ═══')
let regressoesAntigas = 0
for (const r of ROWS) {
  let prevA = -1
  let prevD = -1
  let quebrouAqui = null
  for (const now of TIMELINE) {
    const sa = endedAtAntes(r, now) === 0 ? -1 : now - endedAtAntes(r, now)
    const sd = endedAtDepois(r, now) === 0 ? -1 : now - endedAtDepois(r, now)
    if (prevA >= 0 && sa >= 0 && sa < prevA && !quebrouAqui) {
      quebrouAqui = { now, de: prevA, para: sa }
      regressoesAntigas += 1
    }
    check(
      !(prevD >= 0 && sd >= 0 && sd < prevD),
      `[3] ${r.id}: relógio NOVO andou para trás em ${new Date(now).toISOString()}`,
    )
    prevA = sa
    prevD = sd
  }
  if (quebrouAqui) {
    const perdaH = ((quebrouAqui.de - quebrouAqui.para) / HOUR).toFixed(1)
    console.log(
      `${r.id}: ANTES retrocede em ${new Date(quebrouAqui.now).toISOString().slice(0, 16)} — perde ${perdaH}h de cadência`,
    )
  }
}
check(regressoesAntigas > 0, '[2] o relógio ANTIGO não retrocedeu em nenhuma linha — o defeito não foi exercitado')
console.log(`linhas em que o relógio ANTIGO retrocede: ${regressoesAntigas}/${ROWS.length}`)

console.log('\n═══ 4. CUSTO: primeiro instante em que cada kind SAI, por relógio ═══')
//
// ⚠️ ESTA SEÇÃO JÁ ESTEVE ERRADA. A primeira versão fazia `ends + 5d` contra
// `down + 5d` — aritmética sobre a tabela, sem chamar `endedAtAntes()` nem
// `kindFor()` uma única vez — e a única asserção (`atraso >= 0`) reduzia-se a
// `ends >= down`, propriedade da tabela hardcoded. Ela "provou" um atraso de
// 4,8d no D5 que NÃO EXISTE: nas 4 linhas em que `ends − down > 5d`, o relógio
// antigo ainda está na perna do `downAt` quando o D5 abre, e os dois disparam no
// mesmo instante. O perfil +3d/+7d é o do D10. A revisão adversarial pegou.
//
// Agora a seção SIMULA o cron: varredura horária, com claim PERMANENTE por kind
// (é o que `trial_emails_log` + PK(user_id,email_kind) fazem), e registra o
// PRIMEIRO instante em que cada kind sai por cada relógio.
function primeiroDisparoPorKind(row, relogio) {
  const vistos = new Map()
  for (const now of TIMELINE) {
    const k = kindFor(row, relogio(row, now), now)
    if (k !== 'nada' && k !== 'SEM RELOGIO' && !vistos.has(k)) vistos.set(k, now)
  }
  return vistos
}
const KINDS_INTERESSE = ['downgraded_loss', 'expired_offer_d5', 'expired_lastcall_d10']
const atrasos = Object.fromEntries(KINDS_INTERESSE.map((k) => [k, []]))
console.log('conta     kind                   ANTIGO            NOVO              atraso removido')
for (const r of ROWS) {
  const a = primeiroDisparoPorKind(r, endedAtAntes)
  const d = primeiroDisparoPorKind(r, (row, now) => endedAtDepois(row, now))
  for (const k of KINDS_INTERESSE) {
    const ta = a.get(k)
    const td = d.get(k)
    check(td !== undefined, `[4] ${r.id}: kind ${k} nunca sai com o relógio NOVO`)
    if (ta === undefined || td === undefined) continue
    const atraso = (ta - td) / DAY
    atrasos[k].push(atraso)
    console.log(
      `${r.id}  ${k.padEnd(22)} ${new Date(ta).toISOString().slice(0, 16)}  ${new Date(td).toISOString().slice(0, 16)}  ${atraso >= 0 ? '+' : ''}${atraso.toFixed(1)}d`,
    )
    check(atraso >= 0, `[4] ${r.id}/${k}: o relógio NOVO dispara DEPOIS do antigo — sinal invertido`)
  }
}
console.log('\nmédia do atraso removido, por kind:')
for (const k of KINDS_INTERESSE) {
  const v = atrasos[k]
  const media = v.reduce((s, x) => s + x, 0) / (v.length || 1)
  const max = v.length ? Math.max(...v) : 0
  console.log(`  ${k.padEnd(22)} n=${v.length}  média ${media.toFixed(1)}d  máx ${max.toFixed(1)}d`)
}
// O D5 e o D10 NÃO podem ter o mesmo perfil — se tiverem, a simulação
// degenerou de volta na aritmética que esta seção existe para não repetir.
const mediaD5 = atrasos.expired_offer_d5.reduce((s, x) => s + x, 0) / (atrasos.expired_offer_d5.length || 1)
const mediaD10 = atrasos.expired_lastcall_d10.reduce((s, x) => s + x, 0) / (atrasos.expired_lastcall_d10.length || 1)
check(
  mediaD10 > mediaD5 + 1,
  `[4] D5 (${mediaD5.toFixed(1)}d) e D10 (${mediaD10.toFixed(1)}d) com o mesmo perfil — a simulação degenerou em aritmética`,
)

console.log('\n═══ 5. GUARDA DO STATUS "expired" ═══')
// Linha 'expired' com carimbo de um ciclo ANTERIOR: o novo relógio tem que
// IGNORAR o carimbo, senão o min() adotaria a morte do ciclo passado.
// Datas REALIZÁVEIS: a extensão exige `sinceEnd < 7d`, então entre o carimbo do
// ciclo 1 e o prazo do ciclo 2 cabem no máximo ~10 dias. A versão anterior usava
// 19 dias — cenário impossível, que testava o código com um caso que a produção
// nunca produz.
const reciclada = { id: 'sintetica', used: 40, ext: true, ends: '2026-08-20T00:00:00.000Z', down: '2026-08-14T00:00:00.000Z' }
const agoraTardio = t('2026-08-21T00:00:00.000Z')
const comGuarda = endedAtDepois(reciclada, agoraTardio, 'expired')
const semGuarda = endedAtDepois(reciclada, agoraTardio, 'downgraded')
console.log(`'expired' → endedAt = ${new Date(comGuarda).toISOString().slice(0, 16)} (o prazo, correto)`)
console.log(`sem a guarda    → endedAt = ${new Date(semGuarda).toISOString().slice(0, 16)} (o ciclo passado, errado)`)
check(comGuarda === t(reciclada.ends), '[5] a guarda de status não segurou: linha expired usou carimbo velho')
check(semGuarda !== comGuarda, '[5] a guarda de status é inerte — o caso não exercita o ramo que ela protege')

console.log('\n═══ 6. SEGURANÇA DA JANELA DE DEPLOY ═══')
// O relógio novo anda para TRÁS, então as janelas FECHADAS também: o D10 novo
// fecha em `down+15d` enquanto o antigo só abriria em `ends+10d`. Para as linhas
// com desvio grande esses intervalos não se sobrepõem, e existe uma faixa de
// calendário em que deployar mataria o last-call em silêncio. Aqui é onde o
// script se recusa a dizer "pode deployar" nesse dia.
let paresAlcancaveis = 0
for (const r of ROWS) {
  for (const k of KINDS_INTERESSE) {
    const alcancavel = TIMELINE.some(
      (now) => now >= NOW && kindFor(r, endedAtDepois(r, now), now) === k,
    )
    if (alcancavel) paresAlcancaveis += 1
    const jaSaiuNoAntigo = TIMELINE.some(
      (now) => now < NOW && kindFor(r, endedAtAntes(r, now), now) === k,
    )
    check(
      alcancavel || jaSaiuNoAntigo,
      `[6] ${r.id}: deployar AGORA faria '${k}' nunca sair (janela nova já fechada, antiga ainda não abriu)`,
    )
  }
}
// Sem esta linha a seção 6 só sabe PASSAR: quando NOW já passou de todas as
// janelas, `jaSaiuNoAntigo` é verdadeiro em 100% dos pares e o gate de segurança
// morre em silêncio. Ele tem que declarar quando ficou vazio.
check(
  paresAlcancaveis > 0,
  `[6] gate vazio: nenhum dos ${ROWS.length * KINDS_INTERESSE.length} pares é alcançável a partir de ${new Date(NOW).toISOString().slice(0, 10)} — a coorte de prova envelheceu e a seção 6 não protege mais nada`,
)
console.log(
  `nenhum kind perdido por deployar em ${new Date(NOW).toISOString().slice(0, 10)} ✅  (pares ainda alcançáveis: ${paresAlcancaveis}/${ROWS.length * KINDS_INTERESSE.length})`,
)

console.log('\n═══ 7. CONSTANTES vs route.ts ═══')
const src = readFileSync(ROUTE, 'utf8')
// Descarta comentários ANTES de casar qualquer coisa: um exemplo dentro de um
// bloco /* */ ou de um `//` no fim da linha vira "fonte" e o gate mente. O
// `//` trailing não era removido na primeira versão — provado com
// `const DAY_MS = ... // const OFFER_D5_FROM_MS = 99 * DAY_MS`, que lia 99.
const SRC_LIMPO = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const lerConst = (nome) => {
  // Âncora de fim de expressão: sem ela, `5 * DAY_MS + 12 * HOUR_MS` seria lido
  // como `5 * DAY_MS` e o gate diria "ok" numa divergência real.
  const m = SRC_LIMPO.match(new RegExp(`const\\s+${nome}\\s*=\\s*(\\d+)\\s*\\*\\s*(HOUR_MS|DAY_MS)\\s*$`, 'm'))
  if (m) return Number(m[1]) * (m[2] === 'DAY_MS' ? DAY : HOUR)
  const p = SRC_LIMPO.match(new RegExp(`const\\s+${nome}\\s*=\\s*(\\d+)\\s*$`, 'm'))
  return p ? Number(p[1]) : null
}
const ESPELHO = [
  ['DOWNGRADED_LOSS_TO_MS', DOWNGRADED_LOSS_TO],
  ['OFFER_D5_FROM_MS', OFFER_D5_FROM],
  ['OFFER_D10_FROM_MS', OFFER_D10_FROM],
  ['OFFER_D10_TO_MS', OFFER_D10_TO],
  ['EXTENSION_MAX_AGE_MS', EXTENSION_MAX_AGE],
  ['EXTENSION_MIN_VIDEOS', EXTENSION_MIN_VIDEOS],
  ['EXTENSION_MIN_USABLE_CREDITS', EXTENSION_MIN_USABLE_CREDITS],
]
for (const [nome, local] of ESPELHO) {
  const real = lerConst(nome)
  check(real !== null, `[7] não achei ${nome} em route.ts — o gate de constantes cegou`)
  check(real === local, `[7] ${nome}: route.ts=${real} mas este script usa ${local}`)
  console.log(`  ${nome.padEnd(28)} route.ts=${real}  script=${local}  ${real === local ? 'ok' : 'DIVERGE'}`)
}
// O gate só vale se souber falhar: se a regex parasse de casar, tudo viraria
// null e as duas asserções acima já pegariam. Provado por construção acima.

console.log('\n═══ 8. O ARQUIVO AINDA CONTÉM A CORREÇÃO? ═══')
//
// ⚠️ ESTA SEÇÃO EXISTE PORQUE O SCRIPT PASSAVA SEM ELA COM A CORREÇÃO
// REVERTIDA. A segunda passada da revisão adversarial reverteu `endedAt` no
// route.ts para o ternário antigo, rodou este script e leu "TODAS AS ASSERÇÕES
// PASSARAM". O motivo é estrutural e vale para todo script de prova offline: as
// seções 1-7 exercitam uma CÓPIA À MÃO da lógica (`endedAtDepois`), e a seção 7
// só amarrava SEIS CONSTANTES ao arquivo — o que dava a APARÊNCIA de
// acoplamento sem o acoplamento. Um gate que não detecta a reversão daquilo que
// ele guarda não é gate.
//
// A amarração possível sem executar o TypeScript é sintática. É frágil de
// propósito: refatorar o trecho quebra este teste, e quebrar aqui obriga quem
// refatorou a reconfirmar a monotonicidade — que é exatamente o comportamento
// desejado.
const EXIGIDOS = [
  ["Math.min(endedByClock, endedByStamp)", 'o menor entre os dois carimbos'],
  ["status === 'downgraded' ? parseTime(row.trial_downgraded_at) : 0", 'a guarda de status no carimbo'],
  // KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — mesmo raciocínio da amarração
  // acima, aplicado ao critério da extensão: constante certa no lugar certo não
  // prova que a REGRA usa a constante. Um `EXTENSION_MIN_VIDEOS = 3` declarado
  // e não lido passaria a seção 7 inteira.
  ['videosMade >= EXTENSION_MIN_VIDEOS', 'a extensão condicionada a 3+ vídeos'],
  ['usableAfterExtension >= EXTENSION_MIN_USABLE_CREDITS', 'a extensão condicionada a crédito utilizável'],
]
for (const [trecho, oque] of EXIGIDOS) {
  const tem = SRC_LIMPO.includes(trecho)
  console.log(`  ${tem ? 'ok    ' : 'FALTA '} ${oque}`)
  check(tem, `[8] route.ts não contém mais ${oque} (\`${trecho}\`) — a correção foi revertida ou refatorada`)
}
// E o ternário antigo não pode ter voltado. Normalizado em espaço para não
// depender da formatação do Prettier.
const semEspaco = SRC_LIMPO.replace(/\s+/g, '')
const ANTIGO = 'endsMs>0&&endsMs<=now?endsMs:downAt>0&&downAt<=now?downAt:0'
console.log(`  ${semEspaco.includes(ANTIGO) ? 'VOLTOU' : 'ok    '} ternário não-monotônico ausente`)
check(!semEspaco.includes(ANTIGO), '[8] o ternário não-monotônico VOLTOU ao route.ts')

// KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — o critério invertido não pode
// voltar. Ele mediu 0 vídeos e 0 conversões em 25 envios; se reaparecer num
// merge, este script tem de gritar em vez de deixar passar em silêncio.
const CRITERIO_INVERTIDO = 'used<EXTENSION_MAX_CREDITS_USED'
console.log(`  ${semEspaco.includes(CRITERIO_INVERTIDO) ? 'VOLTOU' : 'ok    '} critério "usou pouco crédito" ausente`)
check(
  !semEspaco.includes(CRITERIO_INVERTIDO),
  '[8] o critério invertido da extensão (used < EXTENSION_MAX_CREDITS_USED) VOLTOU ao route.ts',
)

console.log('\n═══ 9. A TROCA DO CRITÉRIO NÃO MEXEU EM NENHUMA CONCLUSÃO DE RELÓGIO ═══')
//
// A fixture morreu 100% no TETO (`used = 40` nas 9). Sob a regra ANTIGA a
// extensão as reprovava por 40 >= 10; sob a NOVA, por capLeft = 0 < 1. Se o
// ramo ficasse ATIVO em alguma linha, as seções 1-6 estariam medindo o relógio
// de um kind diferente do que mediam antes, e a comparação seria inválida.
// Provado, não assumido:
let extensoesNaFixture = 0
for (const row of ROWS) {
  for (const h of [0, 1, 2, 3, 5, 7, 10, 14, 21]) {
    const now = t(row.down) + h * DAY
    if (kindFor(row, endedAtDepois(row, now), now) === 'trial_extended') extensoesNaFixture++
  }
}
console.log(`  extensões disparadas na fixture (9 linhas × 9 instantes): ${extensoesNaFixture}`)
check(
  extensoesNaFixture === 0,
  `[9] o ramo da extensão deixou de ser inerte nesta fixture (${extensoesNaFixture} disparos) — as seções de relógio precisam ser reavaliadas`,
)

console.log('')
if (failures.length > 0) {
  for (const f of failures) console.error('FALHA ' + f)
  console.error(`\n${failures.length} FALHA(S)`)
  process.exit(1)
}
console.log('TODAS AS ASSERÇÕES PASSARAM')
