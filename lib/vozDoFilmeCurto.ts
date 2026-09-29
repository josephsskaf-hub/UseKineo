// ═══ KINEO-VOZ-15S-MESMA-DA-MONTAGEM-2026-09-29 [TRAVA 8.2 — "vai conserta" do fundador, 29/09] ═══
// O filme grátis de 15 s (Seedance 1.5, 'cinematic_ai') era RECUSADO pelo portão de narração da rota do cinematic
// (fala ≥ 95 % de 15 s = 14,25 s) medindo uma voz que a montagem nem sempre usa:
//   · o PORTÃO (app/api/generate-video-cinematic/route.ts, `classicPersona`) escolhia a persona sobre o PEDIDO INTEIRO
//     (rótulos + pistas [Pexels: …]) e, sem `vertical`, ainda assim por palavra-chave;
//   · a MONTAGEM (lib/compose.ts generateTTS, chamada pelo /api/compose com o `vertical` e o `speed` do corpo) escolhe
//     sobre a NARRAÇÃO limpa e, sem `vertical` (análise nula, resgate do cron), fala em onyx × 1,0.
// Executado (scripts/test-voz-15s-mesma-da-montagem-2026-09-29.mjs, código real): ciência/IA sem `vertical` — portão
// futuristic-ai 2,65 pal/s (36 palavras = 13,6 s, RECUSA) × montagem onyx 2,5 (14,4 s, cabe): recusa FALSA. E com
// `vertical` a montagem também fala em futuristic-ai (alloy × 1,04 = 2,65): 36 palavras dão 13,6 s — voz rápida demais
// para a faixa do escritor (36–41 palavras, lib/scriptWriterRate seedanceShortWriterWords, na régua da casa de 2,5).
// O conserto, só no 15 s do Seedance 1.5:
//   1. a voz sai da MESMA regra do compose (vozQueOComposeEscolhe — espelho de generateTTS, provado pelo guardião
//      executando os dois);
//   2. o passo dessa voz fica no máximo na régua da casa (2,5 pal/s, VERBATIM_EST_WORDS_PER_SECOND — a do escritor, da
//      guarda do filme curto e do plano 3x6): só a futuristic-ai muda (1,04 → 0,98, fator 0,98 ÷ 1,04); onyx 1,0 já é 2,5
//      e as demais personas do nível cinematic são mais lentas;
//   3. a rota grava no claim assinado (`narration_voice`) o `vertical` que escolheu a voz e o fator de velocidade; o
//      /api/compose, SÓ quando o campo existe, põe os dois no corpo ANTES de derivar `vertical` e `explicitSpeed` — o
//      mesmo padrão do `Object.assign(body, aligned)` das cenas assinadas. O generateTTS de sempre (sem uma linha mudada)
//      fala então exatamente a voz que o portão mediu, no navegador, na retomada e no resgate do cron. 35/60/90 e os
//      outros motores não gravam o campo: montagem byte a byte a de antes.
import { selectPersonaForScript } from '@/lib/narration/niche-mapping'
import type { OpenAIVoice } from '@/lib/narration/personas'
import { stripScriptMarkers } from '@/lib/scriptParser'
import { CLASSIC_VOICE_WORDS_PER_SECOND } from '@/lib/speechRate'
import { SEEDANCE_SHORT_SECONDS, VERBATIM_EST_WORDS_PER_SECOND, isSeedance15 } from '@/lib/durationByEngine'
import type { NarrationLanguage } from '@/lib/textLanguage'

/** A voz de uma narração clássica no nível da persona: voz do tts-1-hd e velocidade base (o `speed` do roteiro multiplica por cima). */
export interface VozDaNarracao { id: string; voice: OpenAIVoice; defaultSpeed: number }
/** A voz do filme de 15 s: a da persona com a velocidade já limitada, o `vertical` que a escolhe e o fator sobre a velocidade da persona. */
export interface VozDoFilmeCurto extends VozDaNarracao { vertical: string | null; speedFactor: number }

/** Id da voz de legado do compose (sem `vertical`: onyx × 1,0, sem persona). */
export const VOZ_LEGADO_ID = 'onyx-legacy'
/** Faixa de velocidade que o /api/compose aceita em `speed` (explicitSpeed) e o generateTTS manda à OpenAI. */
const VELOCIDADE_MIN = 0.7
const VELOCIDADE_MAX = 1.3

/** O `vertical` como o /api/compose o deriva do corpo: aparado e minúsculo; vazio/só espaços = ausente. */
export function verticalComoOCompose(vertical: unknown): string | undefined {
  return typeof vertical === 'string' && vertical.trim() ? vertical.trim().toLowerCase() : undefined
}

/**
 * A voz que o /api/compose escolhe hoje (lib/compose.ts generateTTS, ramo OpenAI, e resolveTtsVoiceIdentity):
 * com `vertical`, a persona de selectPersonaForScript sobre a narração sem marcadores; sem ele, onyx × 1,0.
 * Espelho puro — o guardião executa os dois e compara.
 */
export function vozQueOComposeEscolhe(args: { narration: string; vertical?: string | null; tier: 'free' | 'premium' | 'cinematic'; language: NarrationLanguage }): VozDaNarracao {
  const vertical = verticalComoOCompose(args.vertical)
  if (vertical) {
    try {
      const p = selectPersonaForScript(stripScriptMarkers(args.narration ?? ''), vertical, args.tier, args.language)
      return { id: p.id, voice: p.voice, defaultSpeed: p.defaultSpeed }
    } catch { /* o compose cai no legado (resolveTtsVoiceIdentity) */ }
  }
  return { id: VOZ_LEGADO_ID, voice: 'onyx', defaultSpeed: 1 }
}

/**
 * A voz do filme de 15 s do Seedance 1.5 (null em qualquer outro pedido): a do compose, com a velocidade base limitada
 * para a voz não passar da régua da casa (2,5 pal/s). Arredonda para BAIXO (0,98, não 0,9804): o passo real nunca fica
 * acima da régua que o escritor e o portão usam.
 */
export function vozDoFilmeCurto(args: { engine: unknown; seconds: number; narration: string; vertical?: string | null; language: NarrationLanguage }): VozDoFilmeCurto | null {
  if (args.seconds !== SEEDANCE_SHORT_SECONDS || !isSeedance15(typeof args.engine === 'string' ? args.engine : null)) return null
  const vertical = verticalComoOCompose(args.vertical) ?? null
  const base = vozQueOComposeEscolhe({ narration: args.narration, vertical, tier: 'cinematic', language: args.language })
  const passo = CLASSIC_VOICE_WORDS_PER_SECOND[base.voice]
  const teto = passo > 0 ? VERBATIM_EST_WORDS_PER_SECOND / passo : Infinity
  if (base.defaultSpeed <= teto + 1e-9) return { ...base, vertical, speedFactor: 1 }
  const limitada = Math.floor(teto * 100 + 1e-9) / 100
  return { ...base, defaultSpeed: limitada, vertical, speedFactor: limitada / base.defaultSpeed }
}

/** O campo que a rota grava no claim assinado: `narration_voice` (vertical + fator operam; voz/velocidade/persona são o rastro). */
export function campoDaVozAssinada(voz: VozDoFilmeCurto): { vertical: string | null; speed_factor: number; voice: OpenAIVoice; speed: number; persona_id: string } {
  return { vertical: voz.vertical, speed_factor: voz.speedFactor, voice: voz.voice, speed: voz.defaultSpeed, persona_id: voz.id }
}

/**
 * O que o /api/compose põe no corpo a partir do claim assinado: o `vertical` que escolheu a voz (undefined = legado onyx)
 * e o `speed` = velocidade do roteiro assinada (`response.speed`, ou 1) × fator — undefined quando não há nada a mudar
 * (fator 1 e roteiro sem `speed:`). Sem o campo (35/60/90, outros motores, claim de antes deste deploy) ou inválido: null
 * — o corpo segue o do cliente, byte a byte.
 */
export function vozAssinadaDoClaim(response: Record<string, unknown> | null | undefined): { vertical: string | undefined; speed: number | undefined } | null {
  const r = response && typeof response === 'object' ? (response as Record<string, unknown>) : null
  const campo = r?.narration_voice
  if (!campo || typeof campo !== 'object' || Array.isArray(campo)) return null
  const { vertical, speed_factor: fator } = campo as Record<string, unknown>
  if (vertical !== null && (typeof vertical !== 'string' || vertical.length > 64)) return null
  if (typeof fator !== 'number' || !Number.isFinite(fator) || fator <= 0 || fator > 1) return null
  const doRoteiro = typeof r?.speed === 'number' && Number.isFinite(r.speed) && r.speed > 0 ? r.speed : null
  const speed = fator === 1 && doRoteiro === null ? undefined : Math.max(VELOCIDADE_MIN, Math.min(VELOCIDADE_MAX, (doRoteiro ?? 1) * fator))
  return { vertical: verticalComoOCompose(vertical), speed }
}
