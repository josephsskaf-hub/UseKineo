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
import { speechFamilyForQuality, speechRateFor } from '@/lib/speechRate'
import { selectPersonaForScript } from '@/lib/narration/niche-mapping'
import { VOICE_PERSONAS } from '@/lib/narration/personas'

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

/** Palavras faladas mínimas para cobrir `coverage` de um vídeo de N segundos à régua dada. */
export function minWordsFor(seconds: number, wordsPerSecond: number = WORDS_PER_SECOND, coverage: number = MIN_COVERAGE): number {
  return Math.ceil(seconds * coverage * wordsPerSecond)
}

/** Teto sugerido: dá folga ao modelo sem convidar a um roteiro de outro tamanho. */
export function maxWordsFor(seconds: number, wordsPerSecond: number = WORDS_PER_SECOND, coverage: number = MIN_COVERAGE): number {
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
