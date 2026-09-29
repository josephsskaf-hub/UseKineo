// ═══ KINEO-REGUA-DO-ESCRITOR-2026-09-17 — o roteiro nasce na régua da voz que vai falar ═══════════════
//
// Medido em 17/09: "narração curta" era a maior perda do Kineo 1 — 90 recusas em 7 dias, 38 pessoas, 10
// nunca fizeram filme. A causa não era a pessoa: /api/generate-script dimensionava TODO roteiro a 2,3 pal/s
// (régua dos motores hollywood, WORDS_PER_SECOND) e a 60 s, enquanto o portão do Kineo 1 mede na voz da
// persona (fable ×1,1 ≈ 2,8 pal/s). Um roteiro de 60 s nascido no piso de lá (132 palavras) dá 47 s aqui:
// cobertura 0,78 < 0,95 → recusado por construção, antes de a pessoa escrever uma palavra. CLAUDE.md:
// "UMA RÉGUA POR VOZ, NUNCA UMA SÓ". Agora o chamador diz o motor (`engine`) e a duração, e o alvo de
// palavras sai da MESMA função de régua do portão (lib/speechRate). Com motor conhecido, o piso é a
// duração inteira (cobertura 1,0): 5% de folga sobre o portão. Sem `engine` (chamadores antigos), tudo
// como antes (2,3 pal/s, cobertura 0,95).
import { MIN_COVERAGE, WORDS_PER_SECOND } from '@/lib/narrationFit'
import { speechFamilyForQuality, speechRateFor, SPEECH_RATE_BASE } from '@/lib/speechRate'
import { selectPersonaForScript } from '@/lib/narration/niche-mapping'
import { VOICE_PERSONAS } from '@/lib/narration/personas'
import { SEEDANCE_SHORT_SECONDS, SEEDANCE_SHORT_CLIP_STEPS, VERBATIM_EST_WORDS_PER_SECOND, seedanceShortSpeechCapacity } from '@/lib/durationByEngine' // [TRAVA 8.2 — "vai" do 3x6] KINEO-SEEDANCE-15S-3X6-2026-09-29
import { KLING25_CLIP_LOSS_SECONDS } from '@/lib/cinematic/klingShots' // o que o compose tira de cada clipe (0,1 + 0,06)

// AUDITORIA 17/09 (noite): as personas do Kineo 1 vão de 2,25 (onyx × 0,90) a 2,81 pal/s (fable × 1,10), e o
// escritor escolhe a persona pelo TEMA CRU enquanto o portão escolhe pelo ROTEIRO PRONTO — podem divergir. Com
// folga de 5%, persona lenta aqui e rápida lá ainda recusaria. Por isso o escritor dimensiona pela persona
// MAIS RÁPIDA do catálogo: sempre há palavras suficientes para a voz mais veloz; com voz lenta o filme sai até
// ~20% mais longo que o alvo — "passar do alvo é bom; ficar abaixo é defeito" (fundador 02/09).
export function fastestClassicPersonaRate(language: string): { wordsPerSecond: number; voice: string | null } {
  let best = { wordsPerSecond: 0, voice: null as string | null }
  for (const p of VOICE_PERSONAS) {
    const r = speechRateFor({ family: 'classic', language, voice: p.voice, personaSpeed: p.defaultSpeed }).wordsPerSecond
    if (r > best.wordsPerSecond) best = { wordsPerSecond: r, voice: p.voice }
  }
  if (best.wordsPerSecond <= 0) return { wordsPerSecond: speechRateFor({ family: 'classic', language }).wordsPerSecond, voice: null }
  return best
}

// ═══ KINEO-SEEDANCE-15S-3X6-2026-09-29 [TRAVA 8.2 — "vai" do 3x6] — o roteiro do filme de 15 s mira ~40 palavras ═══
// Fundador, 29/09: "3x6 gostei dessa opção bora fazer". O filme de 15 s no Seedance 1.5 são 3 clipes de 6 s
// (lib/durationByEngine seedanceShortClipSeconds). Até aqui o escritor dimensionava o 15 s na régua GENÉRICA do clássico
// (3,1 pal/s, a do tts-1-hd sem voz conhecida): 47-56 palavras = 18,8-22,4 s na voz real — o canário de 29/09 04:34 UTC
// (45 palavras) saiu com 17,8 s, e 56 palavras pedem 8 s por clipe. Agora, SÓ no 15 s com a régua genérica do clássico
// (é o que writerRateFor devolve para o Seedance — 'cinematic_ai'; o Kineo 1 anda na persona mais rápida, o hollywood e
// o legado em 2,3, e nenhum deles passa por aqui), a faixa sai de duas contas:
//   · PISO (até a KINEO-ROTEIRO-15S-FRASE-INTEIRA abaixo, que o trocou pela régua da casa): o filme de 15 s nunca sai abaixo do piso C2 (95 %) nem na voz MAIS RÁPIDA do catálogo (a mesma que o Kineo 1
//     usa, fastestClassicPersonaRate: fable 2,55 × 1,10 = 2,81 pal/s) → ⌈15 × 0,95 × 2,81⌉ = ⌈40,04⌉ = 41 palavras (com 40,
//     essa persona fala 14,2 s e o ensaio de $0 reprova por 0,05 s — medido no guardião);
//   · TETO: o roteiro cabe inteiro nos 3 clipes do passo mais barato (6 s) na régua real da casa (2,5 pal/s = a da guarda
//     do filme curto; média do catálogo de personas; canário 45 pal ÷ 17,8 s = 2,53) COM a folga que o planejador de
//     clipes exige (lib/durationByEngine seedanceShortSpeechCapacity: fala × 1,04 + o décimo do compose) →
//     ⌊(3 × (6 − 0,16) − 0,1) ÷ 1,04 × 2,5⌋ = ⌊41,9⌋ = 41 palavras. Revisão adversarial (29/09): o teto antigo, 43 (sem
//     folga), deixava 0,32 s de margem — a voz 2 % mais lenta já devolvia o clipe 0 no fim do filme.
// ═══ KINEO-ROTEIRO-15S-FRASE-INTEIRA-2026-09-29 — o piso desce: a faixa deixa de ser 41–41 ═══
// Defeito no ar (29/09 ~06:55 UTC, filme grátis de 15 s em português): com piso = teto = 41, o corte do escritor não
// tinha frase inteira para tirar sem cair abaixo do piso e aparava PALAVRAS ("…do metrô em São.", "…perfeito para.").
// Agora o piso sai da MESMA régua do teto (a da casa, 2,5 pal/s — a da guarda do filme curto e do planejador 3x6), com o
// piso C2 do contrato (95 % do alvo):
//   · PISO: ⌈15 × 0,95 × 2,5⌉ = ⌈35,625⌉ = 36 palavras = 14,4 s a 2,5 pal/s;
//   · TETO (inalterado): ⌊(3 × (6 − 0,16) − 0,1) ÷ 1,04 × 2,5⌋ = ⌊41,9⌋ = 41 palavras = 16,4 s.
// Faixa 36–41 = 14,4–16,4 s de fala na régua da casa: o plano 3x6 escolhe o clipe pela fala real (lib/durationByEngine
// seedanceShortClipSeconds), e o corte do escritor ganha 5 palavras de espaço para tirar FRASES inteiras. O piso antigo
// (⌈15 × 0,95 × 2,81⌉ = 41, na persona mais rápida) fica exposto em `fastestFloor` para o rastro: abaixo dele, as vozes
// acima de 2,5 pal/s (storyteller 2,63, futuristic-ai 2,65, energetic-facts 2,81) podem ficar abaixo do C2 no portão de
// narração do cinematic (pendência registrada no commit; aquele portão é da rota do cinematic, sob a trava 8.2).
/** Faixa de palavras do roteiro do filme de 15 s no Seedance 1.5 (piso C2 na régua da casa; teto que cabe em 3 × 6 s com folga). */
export function seedanceShortWriterWords(language: string = 'en'): { min: number; max: number; wordsPerSecond: number; fastestFloor: number } {
  const rapida = fastestClassicPersonaRate(language).wordsPerSecond
  const fastestFloor = Math.ceil(SEEDANCE_SHORT_SECONDS * MIN_COVERAGE * rapida - 1e-9)
  const cabe = seedanceShortSpeechCapacity(SEEDANCE_SHORT_CLIP_STEPS[0], KLING25_CLIP_LOSS_SECONDS)
  const max = Math.floor(cabe * VERBATIM_EST_WORDS_PER_SECOND + 1e-9)
  const min = Math.min(max, Math.ceil(SEEDANCE_SHORT_SECONDS * MIN_COVERAGE * VERBATIM_EST_WORDS_PER_SECOND - 1e-9))
  return { min, max, wordsPerSecond: VERBATIM_EST_WORDS_PER_SECOND, fastestFloor }
}
/** O pedido é o 15 s do Seedance: a duração curta na régua genérica do clássico (writerRateFor de 'cinematic_ai'). */
function isSeedanceShortWriter(seconds: number, wordsPerSecond: number, coverage: number): boolean {
  return typeof SEEDANCE_SHORT_SECONDS === 'number' && seconds === SEEDANCE_SHORT_SECONDS && wordsPerSecond === SPEECH_RATE_BASE?.classic && coverage === 1
}

/** Palavras faladas mínimas para cobrir `coverage` de um vídeo de N segundos à régua dada. */
export function minWordsFor(seconds: number, wordsPerSecond: number = WORDS_PER_SECOND, coverage: number = MIN_COVERAGE): number {
  if (isSeedanceShortWriter(seconds, wordsPerSecond, coverage)) return seedanceShortWriterWords().min // KINEO-SEEDANCE-15S-3X6-2026-09-29
  return Math.ceil(seconds * coverage * wordsPerSecond)
}

/** Teto sugerido: dá folga ao modelo sem convidar a um roteiro de outro tamanho. */
export function maxWordsFor(seconds: number, wordsPerSecond: number = WORDS_PER_SECOND, coverage: number = MIN_COVERAGE): number {
  if (isSeedanceShortWriter(seconds, wordsPerSecond, coverage)) return seedanceShortWriterWords().max // KINEO-SEEDANCE-15S-3X6-2026-09-29
  return Math.round(minWordsFor(seconds, wordsPerSecond, coverage) * 1.2)
}

export interface WriterRate {
  wordsPerSecond: number
  family: 'classic' | 'hollywood' | 'legacy'
  voice: string | null
  coverage: number
}

/** Régua do escritor para um motor: a mesma do portão do Kineo 1 (persona) e da família clássica/hollywood. */
export function writerRateFor(engine: unknown, topic: string, language: string): WriterRate {
  const q = typeof engine === 'string' ? engine.trim().toLowerCase() : ''
  if (!q) return { wordsPerSecond: WORDS_PER_SECOND, family: 'legacy', voice: null, coverage: MIN_COVERAGE }
  const family = speechFamilyForQuality(q)
  if (family === 'classic') {
    if (q === 'fast') {
      // Kineo 1: a régua é a da persona MAIS RÁPIDA do catálogo (auditoria acima); a persona provável do tema
      // vai só no rastro, para medir quantas vezes escritor e portão discordariam.
      let provavel: { voice?: string } | null = null
      try { provavel = selectPersonaForScript(topic, undefined, 'free', language as Parameters<typeof selectPersonaForScript>[3]) } catch { provavel = null }
      const fastest = fastestClassicPersonaRate(language)
      return { wordsPerSecond: fastest.wordsPerSecond, family, voice: provavel?.voice ?? fastest.voice, coverage: 1 }
    }
    const rate = speechRateFor({ family: 'classic', language })
    return { wordsPerSecond: rate.wordsPerSecond, family, voice: null, coverage: 1 }
  }
  return { wordsPerSecond: speechRateFor({ family: 'hollywood', language }).wordsPerSecond, family, voice: null, coverage: 1 }
}
