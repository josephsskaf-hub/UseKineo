/** Review a failed video's topic in Studio. Never starts or resumes a paid job.
 * Preserve the previous composer's default: Fast, 35s, AI script mode. */
// KINEO-ENTRADA-SEEDANCE15-2026-09-29 (B9 do cético) — "tentar de novo" leva o MOTOR e a DURAÇÃO do filme original.
// Antes cravava Kineo 1 a 35 s: o trial cujo filme de 15 s falhou (crédito devolvido, 10 cr) caía num motor que a conta
// nova não tem, ou no Seedance a 35 s (15 cr), e não conseguia refazer. Sem o filme original (chamador antigo), o padrão
// de antes. O Studio ainda traduz ?engine=fast pela régua da entrada (lib/growth/entradaSeedance15.ts motorDaUrl).
// Módulo puro, sem import (scripts/test-five-improvements.mjs o executa cru).

/** quality_mode (cobrador) → chave do seletor do Studio. Espelho de ENGINE_QUALITY do StudioClient. */
export const STUDIO_ENGINE_FOR_QUALITY: Readonly<Record<string, string>> = {
  fast: 'fast',
  cinematic_ai: 'seedance',
  cinematic_kling: 'kling',
  cinematic_veo: 'veo',
  cinematic_hollywood: 'hollywood',
  cinematic_h3: 'h3',
  cinematic_omni: 'omni',
  cinematic_s25: 's25',
}

/**
 * O botão do seletor mais perto do filme original (a duração MEDIDA passa do alvo: "passar é bom"). 15 só no Seedance.
 * Sem duração conhecida (filme que falhou antes do MP4) devolve null: o link vai sem ?duration e o Studio escolhe a
 * maior duração que o saldo paga (lib/growth/entradaSeedance15.ts duracaoDeEntrada) — o trial de 10 cr cai no 15 s.
 */
export function retryDurationFor(engine: string, seconds: number | null | undefined): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null
  if (engine === 'seedance' && seconds <= 25) return '15'
  if (seconds <= 50) return '35'
  if (seconds <= 75) return '60'
  return '90'
}

export function reviewVideoRetryHref(
  topic: string | null | undefined,
  original?: { quality?: string | null; durationSeconds?: number | null } | null,
): string {
  const prompt = (topic ?? '').trim().slice(0,1000)
  if (!prompt) return '/studio'
  if (!original) return '/studio?' + new URLSearchParams({prompt,engine:'fast',duration:'35',script_mode:'ai'}).toString()
  const engine = (original.quality && STUDIO_ENGINE_FOR_QUALITY[original.quality]) || 'fast'
  const duration = retryDurationFor(engine, original.durationSeconds)
  return '/studio?' + new URLSearchParams({prompt,engine,...(duration ? {duration} : {}),script_mode:'ai'}).toString()
}
