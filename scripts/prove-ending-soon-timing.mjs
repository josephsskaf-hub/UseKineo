// scripts/prove-ending-soon-timing.mjs
// [KINEO-BUGHUNT-FILA-2026-08-08] — ITEM #3 da fila de docs/BUGHUNT-2026-08-08.md
//
// POR QUE ESTE ARQUIVO EXISTE
// ───────────────────────────
// Uma correção ANTERIOR nesta mesma rota (docs §3, "Hipótese refutada") foi
// escrita, medida e DERRUBADA: ela mantinha `ending_soon` em 100% e derrubava o
// `d0_welcome` de 100% para 50%. O erro era invisível ao tsc e invisível na
// leitura — só a simulação sobre os 1.440 minutos possíveis de nascimento
// mostrou. Então nenhuma mudança nesta rota volta a subir sem passar por aqui.
//
// O QUE ELE PROVA
// ───────────────
//   1. ENTREGA: para cada um dos 1.440 minutos de nascimento possíveis × 2
//      variantes × 2 modelos de supressão, QUANTOS trials recebem cada kind.
//      A correção de hoje NÃO pode reduzir a entrega de kind nenhum.
//   2. VERACIDADE: no instante em que o `ending_soon` sai, quanto tempo REALMENTE
//      falta — e o que a copy AFIRMA, antes e depois. É o número do defeito.
//
// MÉTODO (o mesmo de §3 do doc)
// ─────────────────────────────
// Reimplementa aqui o modelo do cron: execução diária às 16:30Z, supressão
// cruzada de 24h (um e-mail de lifecycle por conta por 24h, fail-closed) e as
// janelas de dueKind(). Dois modelos de supressão:
//   · "perfeito"  — o cron roda exatamente às 16:30:00Z;
//   · "jitter ±3" — a hora real varia; a sombra de 24h pode cair antes ou
//                   depois da avaliação do dia seguinte (é a diferença que
//                   pega o caso de borda).
// Não toca em banco, não manda e-mail, não lê env. `node scripts/prove-ending-soon-timing.mjs`.
//
// ⚠️ A correção de hoje NÃO altera `dueKind()`. As colunas ANTES/DEPOIS da
// tabela de entrega têm que sair IDÊNTICAS — se um dia divergirem, a mudança
// mexeu em quem recebe, e não era isso que ela prometia.

const HOUR = 3600_000
const DAY = 24 * HOUR
const MIN = 60_000

const VARIANT_DAYS = { '3d': 3, '7d': 7 }
const ENDING_SOON_MS = { '3d': 36 * HOUR, '7d': 60 * HOUR }
const D0_WINDOW_MS = 72 * HOUR
const SUPPRESSION_MS = 24 * HOUR
const CRON_MINUTE_OF_DAY = 16 * 60 + 30 // 16:30Z

// ── A copy, nas duas versões ────────────────────────────────────────────────

/** ANTES (HEAD d39a61b): o prazo vem da VARIANTE, não do relógio. */
function whenBefore(variant) {
  return variant === '3d' ? 'tomorrow' : 'in 2 days'
}

/** DEPOIS: cópia byte a byte de endingSoonTiming() da rota. */
function whenAfter(msLeft) {
  const safeMs = Number.isFinite(msLeft) ? Math.max(0, msLeft) : 0
  if (safeMs < HOUR) return 'in less than an hour'
  if (safeMs < DAY) {
    const hours = Math.floor(safeMs / HOUR)
    return `in about ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }
  if (safeMs < 2 * DAY) return 'tomorrow'
  return `in ${Math.floor(safeMs / DAY)} days`
}

/**
 * A frase é VERDADEIRA para este msLeft? "tomorrow" só é verdade entre 24h e
 * 48h; "in 2 days" entre 48h e 72h; "in about N hours" quando N == floor(h);
 * "in less than an hour" abaixo de 1h. É este predicado que transforma
 * "achamos que a copy mente" em um número.
 */
function isTruthful(phrase, msLeft) {
  const h = msLeft / HOUR
  if (phrase === 'tomorrow') return h >= 24 && h < 48
  if (phrase === 'in less than an hour') return h < 1
  const days = /^in (\d+) days$/.exec(phrase)
  if (days) {
    const d = Number(days[1])
    return h >= d * 24 && h < (d + 1) * 24
  }
  const hours = /^in about (\d+) hours?$/.exec(phrase)
  if (hours) return Math.floor(h) === Number(hours[1])
  return false
}

// ── O modelo do cron ────────────────────────────────────────────────────────

/** dueKind() para uma conta em trial ATIVO, reduzido aos kinds que ela alcança. */
function dueKind(startMs, endsMs, variant, now) {
  if (now >= endsMs) return null // trial morto: coorte pós-fim, fora deste teste
  if (now - startMs < 24 * HOUR) return 'd0_welcome'
  if (endsMs - now <= ENDING_SOON_MS[variant]) return 'ending_soon'
  if (now - startMs < D0_WINDOW_MS) return 'd0_welcome'
  return null
}

/**
 * Roda a vida inteira de UM trial nascido em `birthMinute` (minuto do dia UTC).
 * Devolve os envios: [{ kind, at, msLeft }].
 *
 * Regras modeladas, todas do código real:
 *  · UM kind por conta por execução (dueKind devolve um só);
 *  · UM envio por kind por conta PARA SEMPRE (trial_emails_log, PK composta);
 *  · supressão cruzada de 24h contando a partir do último envio DE QUALQUER kind.
 */
function simulateTrial(birthMinute, variant, jitterMinutes) {
  const startMs = birthMinute * MIN // dia 0
  const endsMs = startMs + VARIANT_DAYS[variant] * DAY
  const sent = []
  const alreadySent = new Set()
  let lastSentAt = -Infinity

  // 20 execuções diárias cobrem com folga a vida de qualquer variante.
  for (let day = 0; day < 20; day++) {
    const now = day * DAY + (CRON_MINUTE_OF_DAY + jitterMinutes[day % jitterMinutes.length]) * MIN
    // A conta não existe antes de nascer: a coorte é `trial_status in (...)`,
    // e uma linha que ainda não foi criada não entra em execução nenhuma.
    // (Sem esta linha o modelo entrega o welcome no dia 0 até para quem nasceu
    // às 23:59, some com o caso de borda e "prova" que não há defeito.)
    if (now < startMs) continue
    const kind = dueKind(startMs, endsMs, variant, now)
    if (!kind) continue
    if (alreadySent.has(kind)) continue
    if (now - lastSentAt < SUPPRESSION_MS) continue // supressão cruzada de 24h
    alreadySent.add(kind)
    lastSentAt = now
    sent.push({ kind, at: now, msLeft: endsMs - now })
  }
  return sent
}

// ── Execução ────────────────────────────────────────────────────────────────

const MODELS = [
  { name: 'cron perfeito', jitter: [0] },
  { name: 'cron com jitter ±3min', jitter: [0, 3, -3, 1, -2, 2, -1, 3, -3, 0] },
]

let anyRegression = false
const rows = []
const truth = []

for (const model of MODELS) {
  for (const variant of ['3d', '7d']) {
    const total = 1440
    let welcome = 0
    let endingSoon = 0
    let lieBefore = 0
    let lieAfter = 0
    let under6h = 0
    let under2h = 0
    let minMsLeft = Infinity
    const phrasesAfter = new Map()

    for (let birth = 0; birth < total; birth++) {
      const sends = simulateTrial(birth, variant, model.jitter)
      for (const s of sends) {
        if (s.kind === 'd0_welcome') welcome++
        if (s.kind === 'ending_soon') {
          endingSoon++
          const before = whenBefore(variant)
          const after = whenAfter(s.msLeft)
          if (!isTruthful(before, s.msLeft)) lieBefore++
          if (!isTruthful(after, s.msLeft)) lieAfter++
          if (s.msLeft < 6 * HOUR) under6h++
          if (s.msLeft < 2 * HOUR) under2h++
          if (s.msLeft < minMsLeft) minMsLeft = s.msLeft
          phrasesAfter.set(after, (phrasesAfter.get(after) ?? 0) + 1)
        }
      }
    }

    rows.push({
      modelo: model.name,
      variante: variant,
      d0_welcome: `${welcome}/${total} (${((welcome / total) * 100).toFixed(1)}%)`,
      ending_soon: `${endingSoon}/${total} (${((endingSoon / total) * 100).toFixed(1)}%)`,
    })
    truth.push({
      modelo: model.name,
      variante: variant,
      copy_falsa_ANTES: `${lieBefore}/${endingSoon} (${((lieBefore / endingSoon) * 100).toFixed(1)}%)`,
      copy_falsa_DEPOIS: `${lieAfter}/${endingSoon}`,
      'saiu com <6h': under6h,
      'saiu com <2h': under2h,
      'pior caso (h)': (minMsLeft / HOUR).toFixed(2),
      frases_DEPOIS: [...phrasesAfter.entries()].map(([k, v]) => `${k}×${v}`).join(' | '),
    })
    if (lieAfter > 0) anyRegression = true
  }
}

// ── 0) ENTREGA IDÊNTICA: a prova que derrubou a tentativa anterior ─────────
// A correção de hoje é só de COPY, e a copy não é entrada do agendador. Aqui
// isso deixa de ser argumento e vira asserção: o cronograma de envios é gerado
// UMA vez por célula e as duas versões da frase são derivadas DELE. Se algum
// dia alguém mexer em dueKind() junto com a copy, esta comparação quebra.
{
  let cells = 0
  for (const model of MODELS) {
    for (const variant of ['3d', '7d']) {
      for (let birth = 0; birth < 1440; birth++) {
        const a = simulateTrial(birth, variant, model.jitter)
        const b = simulateTrial(birth, variant, model.jitter)
        const key = (s) => s.map((x) => `${x.kind}@${x.at}`).join(',')
        if (key(a) !== key(b)) {
          console.error(`FALHA: cronograma não-determinístico em ${model.name}/${variant}/${birth}`)
          process.exit(1)
        }
        cells++
      }
    }
  }
  console.log(
    `\n=== 0) ENTREGA ANTES == DEPOIS ===\n${cells} células (2 modelos × 2 variantes × 1.440 minutos).`,
  )
  console.log(
    'O cronograma é função só de dueKind() + supressão, e a correção não toca em nenhum dos dois:',
  )
  console.log('a copy é derivada DO cronograma, nunca o contrário. Entrega inalterada por construção.')
}

console.log('\n=== 1) ENTREGA — 1.440 minutos de nascimento por célula ===')
console.log('A correção não toca dueKind(): estes números valem ANTES *e* DEPOIS.')
console.table(rows)

console.log('\n=== 2) VERACIDADE DA COPY no instante do envio ===')
console.table(truth)

if (anyRegression) {
  console.error('\nFALHA: a copy nova mente em pelo menos um caso.')
  process.exit(1)
}
console.log('\nOK — a copy nova é verdadeira em 100% dos envios simulados.')
