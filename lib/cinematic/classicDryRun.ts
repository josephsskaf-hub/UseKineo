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
export const COMPOSE_RESCALE_TOLERANCE = 0.15
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
}): ClassicDryRunReport {
  const wps = input.wordsPerSecond && input.wordsPerSecond > 0 ? input.wordsPerSecond : CLASSIC_WORDS_PER_SECOND
  const target = Math.max(0, Number(input.targetSeconds) || 0)
  const perClip = Math.max(1, Number(input.secondsPerClip) || 1)
  const scenes: ClassicDryRunScene[] = input.scenes.map((s, i) => {
    const words = wordsOf(s.voiceover)
    return {
      scene: i + 1,
      seconds: round1(perClip),
      words,
      speech_seconds: round1(words / wps),
      speech: String(s.voiceover ?? ''),
      prompt: String(s.prompt ?? '').slice(0, 400),
    }
  })
  const totalWords = scenes.reduce((a, s) => a + s.words, 0)
  const speechSeconds = round1(totalWords / wps)
  const expectedWords = Math.round(target * wps)
  const drift = expectedWords > 0 ? round1((totalWords / expectedWords - 1) * 100) / 100 : 0
  const rescaleRisk = expectedWords > 0 && Math.abs(totalWords / expectedWords - 1) > COMPOSE_RESCALE_TOLERANCE
  const footageSeconds = round1(scenes.length * perClip)

  const problems: string[] = []
  if (scenes.length === 0) problems.push('nenhuma cena planejada — o despacho sairia vazio')
  if (target > 0 && speechSeconds < target * DURATION_FLOOR) {
    problems.push(`narração de ${speechSeconds}s para um alvo de ${target}s (piso ${Math.round(target * DURATION_FLOOR)}s): o filme sairia curto ou o compose reescreveria o texto`)
  }
  if (rescaleRisk) {
    problems.push(
      `${totalWords} palavras contra ${expectedWords} esperadas (${drift > 0 ? '+' : ''}${Math.round(drift * 100)}%): fora de ±15%, o compose REESCREVE o corpo da narração` +
        (input.verbatim ? ' — e este roteiro é "Use my script as is"' : ''),
    )
  }
  if (!input.elasticFootage && scenes.length > 0 && footageSeconds < speechSeconds) {
    problems.push(`footage de ${footageSeconds}s para ${speechSeconds}s de fala: o compose repetiria cena para fechar o tempo`)
  }
  const mute = scenes.filter((s) => s.words === 0).map((s) => s.scene)
  if (mute.length) problems.push(`cena(s) sem fala: ${mute.join(', ')}`)

  const pass = problems.length === 0
  return {
    verdict: pass
      ? `PASS — ${scenes.length} cenas, ${totalWords} palavras ≈ ${speechSeconds}s de fala para ${target}s; dentro de ±15% do escalador, footage cobre a fala`
      : `FAIL — ${problems.join(' · ')}`,
    pass,
    problems,
    target_seconds: target,
    expected_words: expectedWords,
    total_words: totalWords,
    speech_seconds: speechSeconds,
    rescale_drift: drift,
    rescale_risk: rescaleRisk,
    footage_seconds: footageSeconds,
    scenes,
  }
}

/** Contas que podem rodar o validador de $0 (mesma lista do bloco hollywood da rota). */
export const DRY_RUN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
export function isDryRunAccount(email: string | null | undefined): boolean {
  return DRY_RUN_EMAILS.has(String(email ?? '').toLowerCase())
}
