// KINEO-DRYRUN-CLASSICO-2026-09-12 — O VALIDADOR DE $0 CHEGA AOS CLÁSSICOS.
//
// Até 11/09 `dry_run: true` só parava a família Kling 3/H3/Omni. No caminho
// clássico (Seedance 1.5, Kling 2.5, Veo) e no Kineo 1 o flag entrava no
// evento e o pedido seguia para o POST pago — não havia como testar um roteiro
// nesses motores sem gastar. Ordem do fundador (12/09): "pente fino em todos
// os motores, faz um dry-run pra ver se tudo vai dar certo".
//
// Esta é a parte PURA: recebe as cenas planejadas (fala + prompt visual) e
// devolve o relatório cena a cena e o veredito, com a régua CLÁSSICA
// (tts-1-hd ≈ 3,1 pal/s — CLAUDE.md "uma régua por voz") e o risco real que o
// vigia mediu em 11/09: o compose REESCREVE o corpo da narração quando ela
// foge ±15% de 3,1 × segundos (scaleVoiceoverScript). Sem I/O.

export const CLASSIC_WORDS_PER_SECOND = 3.1
/** Tolerância do escalador do compose (lib/compose scaleVoiceoverScript): fora disto o corpo é reescrito. */
export const COMPOSE_RESCALE_TOLERANCE = 0.25 // R17 (15/09): o escalador só condensa além de +25 % (lib/compose)
export const COMPOSE_RESCALE_FLOOR = 0.08 // KINEO-VOZ-NAO-ARRASTA-2026-09-15: abaixo de 92 % o compose expande
/** Piso de duração (contrato C2): filme abaixo de 95% do alvo é história interrompida. */
export const DURATION_FLOOR = 0.95

export interface ClassicDryRunSceneInput {
  voiceover?: string | null
  prompt?: string | null
}

export interface ClassicDryRunScene {
  scene: number
  seconds: number
  words: number
  speech_seconds: number
  speech: string
  prompt: string
  /** KINEO-KLING25-PLANOS-5S-2026-09-28 — só com `sceneSeconds`: o que o compose mostra do plano (segundos − perda). */
  useful_seconds?: number
  /** KINEO-KLING25-PLANOS-5S-2026-09-28 — só com `sceneFitWordsPerSecond`: a fala da cena, nesse passo, cabe no útil. */
  fits_plan?: boolean
}

export interface ClassicDryRunReport {
  verdict: string
  pass: boolean
  problems: string[]
  target_seconds: number
  expected_words: number
  total_words: number
  speech_seconds: number
  /** words / (3,1 × alvo) − 1. Fora de ±0,15 o compose reescreve o corpo. */
  rescale_drift: number
  rescale_risk: boolean
  footage_seconds: number
  /** KINEO-KLING25-PLANOS-5S-2026-09-28 — só com `sceneSeconds`: a imagem que o compose realmente usa (Σ segundos − perda). */
  footage_useful_seconds?: number
  /** KINEO-KLING25-PLANOS-5S-2026-09-28 — só com `sceneSeconds`: avisos que não reprovam (modo IA: o compose reescala a fala). */
  notes?: string[]
  scenes: ClassicDryRunScene[]
}

const wordsOf = (t?: string | null) => String(t ?? '').trim().split(/\s+/).filter(Boolean).length
const round1 = (n: number) => Math.round(n * 10) / 10

export function classicDryRunReport(input: {
  scenes: ClassicDryRunSceneInput[]
  targetSeconds: number
  secondsPerClip: number
  verbatim: boolean
  wordsPerSecond?: number
  /** Kineo 1: o footage (Pixabay) é cortado à medida da fala — não há teto de clipe. */
  elasticFootage?: boolean
  /**
   * KINEO-KLING25-PLANOS-5S-2026-09-28 — segundos de CADA plano (Kling 2.5: 5 ou 10), os mesmos que vão no payload da fal.
   * Ausente, com tamanho diferente do de `scenes` ou com valor inválido = `secondsPerClip` para todas, como sempre.
   */
  sceneSeconds?: ReadonlyArray<number>
  /**
   * KINEO-KLING25-PLANOS-5S-2026-09-28 (revisão adversarial) — o que o compose tira de cada plano (Kling 2.5: 0,16 s =
   * trim 0,1 + overlap 0,06). A cobertura passa a ser medida pelo ÚTIL, não pelo bruto (40 s brutos = 38,72 s úteis).
   */
  clipLossSeconds?: number
  /**
   * KINEO-KLING25-PLANOS-5S-2026-09-28 (revisão adversarial) — passo de planejamento (Kling 2.5: min(voz, 2,3)). Cada cena
   * cuja fala, nesse passo, passa do útil do plano é apontada: a imagem dela correria na frente da voz.
   */
  sceneFitWordsPerSecond?: number
  /** true (verbatim: o plano é desenhado para caber) = a cena que não cabe REPROVA; false (modo IA) = só avisa em `notes`. */
  sceneFitStrict?: boolean
}): ClassicDryRunReport {
  const wps = input.wordsPerSecond && input.wordsPerSecond > 0 ? input.wordsPerSecond : CLASSIC_WORDS_PER_SECOND
  const target = Math.max(0, Number(input.targetSeconds) || 0)
  const perClip = Math.max(1, Number(input.secondsPerClip) || 1)
  const perScene = Array.isArray(input.sceneSeconds) && input.sceneSeconds.length === input.scenes.length && input.sceneSeconds.every((x) => Number.isFinite(x) && x > 0)
    ? input.sceneSeconds
    : null
  const loss = perScene && typeof input.clipLossSeconds === 'number' && Number.isFinite(input.clipLossSeconds) && input.clipLossSeconds > 0 ? input.clipLossSeconds : 0
  const fitWps = perScene && typeof input.sceneFitWordsPerSecond === 'number' && Number.isFinite(input.sceneFitWordsPerSecond) && input.sceneFitWordsPerSecond > 0 ? input.sceneFitWordsPerSecond : 0
  const scenes: ClassicDryRunScene[] = input.scenes.map((s, i) => {
    const words = wordsOf(s.voiceover)
    const base: ClassicDryRunScene = {
      scene: i + 1,
      seconds: round1(perScene ? perScene[i] : perClip),
      words,
      speech_seconds: round1(words / wps),
      speech: String(s.voiceover ?? ''),
      prompt: String(s.prompt ?? '').slice(0, 400),
    }
    if (!perScene) return base
    const useful = Math.round(Math.max(0, perScene[i] - loss) * 100) / 100
    return { ...base, useful_seconds: useful, ...(fitWps > 0 ? { fits_plan: words / fitWps <= useful + 1e-6 } : {}) }
  })
  const totalWords = scenes.reduce((a, s) => a + s.words, 0)
  const speechSeconds = round1(totalWords / wps)
  const expectedWords = Math.round(target * wps)
  const drift = expectedWords > 0 ? round1((totalWords / expectedWords - 1) * 100) / 100 : 0
  // KINEO-VOZ-NAO-ARRASTA-2026-09-15 — o escalador expande abaixo de 92 % (lib/compose) e condensa acima de 115 %: o ensaio avisa nos dois limiares reais.
  const rescaleRisk = expectedWords > 0 && (totalWords / expectedWords - 1 > COMPOSE_RESCALE_TOLERANCE || 1 - totalWords / expectedWords > COMPOSE_RESCALE_FLOOR)
  const footageSeconds = round1(scenes.length * perClip)
  // KINEO-KLING25-PLANOS-5S-2026-09-28 — com segundos por plano (Kling 2.5) a imagem é a soma dos planos; sem eles, a de sempre.
  const footageTotal = perScene ? round1(perScene.reduce((a, b) => a + b, 0)) : footageSeconds
  // Revisão adversarial (28/09): a cobertura se mede pelo que o compose MOSTRA (Σ segundos − perda por plano).
  const footageUseful = perScene ? round1(perScene.reduce((a, b) => a + Math.max(0, b - loss), 0)) : footageSeconds

  const problems: string[] = []
  if (scenes.length === 0) problems.push('nenhuma cena planejada — o despacho sairia vazio')
  if (target > 0 && speechSeconds < target * DURATION_FLOOR) {
    problems.push(`narração de ${speechSeconds}s para um alvo de ${target}s (piso ${Math.round(target * DURATION_FLOOR)}s): o filme sairia curto ou o compose reescreveria o texto`)
  }
  if (rescaleRisk) {
    problems.push(
      `${totalWords} palavras contra ${expectedWords} esperadas (${drift > 0 ? '+' : ''}${Math.round(drift * 100)}%): fora de −8%/+25% (escalador desde 15/09: expande abaixo de 92%, condensa acima de 125%), o compose REESCREVE o corpo da narração` +
        (input.verbatim ? ' — e este roteiro é "Use my script as is"' : ''),
    )
  }
  if (!input.elasticFootage && scenes.length > 0 && footageUseful < speechSeconds) {
    problems.push(`footage de ${footageUseful}s${perScene && loss > 0 ? ` úteis (${footageTotal}s brutos)` : ''} para ${speechSeconds}s de fala: o compose repetiria cena para fechar o tempo`)
  }
  // KINEO-KLING25-PLANOS-5S-2026-09-28 (revisão adversarial) — "o ensaio de $0 deve reprovar cena com fala maior que os
  // segundos do plano menos 0,16": cada cena, no passo de planejamento, tem de caber no útil do próprio plano.
  const notes: string[] = []
  const naoCabem = scenes.filter((s) => s.fits_plan === false)
  if (naoCabem.length) {
    const txt = `cena(s) com fala maior que o plano (passo ${fitWps} pal/s): ${naoCabem.map((s) => `${s.scene} (${round1(s.words / fitWps)}s de fala em ${s.useful_seconds}s úteis)`).join(', ')} — a imagem correria na frente da voz`
    if (input.sceneFitStrict) problems.push(txt)
    else notes.push(txt + ' (modo IA: o compose reescala a fala; aviso, não reprova)')
  }
  const mute = scenes.filter((s) => s.words === 0).map((s) => s.scene)
  if (mute.length) problems.push(`cena(s) sem fala: ${mute.join(', ')}`)

  const pass = problems.length === 0
  return {
    verdict: pass
      ? `PASS — ${scenes.length} cenas, ${totalWords} palavras ≈ ${speechSeconds}s de fala para ${target}s; dentro da faixa do escalador (−8%/+25%), footage cobre a fala`
      : `FAIL — ${problems.join(' · ')}`,
    pass,
    problems,
    target_seconds: target,
    expected_words: expectedWords,
    total_words: totalWords,
    speech_seconds: speechSeconds,
    rescale_drift: drift,
    rescale_risk: rescaleRisk,
    footage_seconds: footageTotal,
    ...(perScene ? { footage_useful_seconds: footageUseful, notes } : {}),
    scenes,
  }
}

/** Contas que podem rodar o validador de $0 (mesma lista do bloco hollywood da rota). */
export const DRY_RUN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
export function isDryRunAccount(email: string | null | undefined): boolean {
  return DRY_RUN_EMAILS.has(String(email ?? '').toLowerCase())
}
