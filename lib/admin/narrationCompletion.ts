// KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — completar roteiro não é falha de render, inclusive no histórico do live.
export function isNarrationCompletionEvent(event: { name: string; metadata?: Record<string, unknown> | null }): boolean {
  if (event.name === 'script_completion_offered' || event.name === 'script_authoring_auto_started') return true
  if (event.name !== 'video_generation_failed' && event.name !== 'generate_failed' && event.name !== 'generation_stage_error') return false
  const m = event.metadata ?? {}
  if (m.narrationTooShort === true || m.reason === 'narration_too_short' || m.cause === 'narration_short') return true
  // Linhas antigas de video_generation_failed só carregam error: frase do servidor ou causa sintetizada pelo cliente.
  const error = typeof m.error === 'string' ? m.error : ''
  return /seconds of narration|\bnarration_too_short\b/i.test(error)
}
