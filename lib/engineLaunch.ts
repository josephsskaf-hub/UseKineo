// KINEO-S25-LAUNCH-2026-09-01 — UM interruptor para o Seedance 2.5.
//
// A auditoria do fundador (01/09: 'coloca ele em todos os lugares onde ele
// precisa estar') encontrou 14 superficies que listam motores. Antes, cada
// motor novo era colado a mao em cada uma — e sempre faltava uma (o Omni ate
// hoje NAO esta no seletor do /generate). Agora todas leem DAQUI:
//   S25_PUBLIC=false → so contas internas veem o 2.5 (periodo de canario);
//   S25_PUBLIC=true  → mega-menu, /studio, /generate, pricing, FAQ, schema
//                      e calculadora mostram o motor de uma vez.
// Regra da casa que isto protege: nunca mostrar botao que o publico nao
// pode apertar (o gate do servidor le o MESMO interruptor).
import { isInternalEmail } from '@/lib/internalAccounts'

export const S25_PUBLIC = false

// ═══ KINEO-MOTOR-EM-MANUTENCAO-2026-09-15 — decisão do fundador (15/09, noite): a oferta concentra em cinco
// motores (Kineo 1, Kling 2.5, Kling 3 aprovados; Seedance 1.5 e Veo 3.1 em prova). MiniMax H3, Omni Flash e
// Seedance 2.5 ficam PAUSADOS para novas gerações: o servidor recusa antes de qualquer débito, a interface
// mostra manutenção com alternativa, e as superfícies públicas param de vender o que não pode ser apertado.
// Nada é apagado: motores, custos, filmes, clipes e a recuperação das tentativas existentes continuam.
// ═══ KINEO-H3-DE-VOLTA-2026-09-22 — o MiniMax H3 volta ao ar (fundador: "Bora voltar o H3" / "já voltar ele para o site").
// Prova: 3 filmes de 35 s no dia, todos montados em 3-6 min, juiz 80 · 95 · (nº 3 abaixo em docs/PROPOSTA-MOTORES-
// VOLTA-2026-09-22.md §8). O que mudou para ele voltar: compose com motivo (compose_failed), cena presa vira recusa
// e ressubmete (lib/stuckScene), juiz lendo a cena 1 (índice 0-based), prefixo sem pessoa e sem telefone nas famílias
// sem negative_prompt. Omni e Seedance 2.5 seguem pausados — mesmo caminho, ainda sem os 3 filmes.
export type PausedEngineKey = 'omni' | 's25'
export interface EnginePause { since: string; label: string; alternative: { key: 'hollywood' | 'kling'; label: string }; message: string }
export const ENGINE_PAUSE: Record<PausedEngineKey, EnginePause> = {
  omni: { since: '2026-09-15', label: 'Omni Flash', alternative: { key: 'hollywood', label: 'Kling 3' }, message: 'Omni Flash is temporarily paused for maintenance while we fix its film quality. Nothing was charged. Kling 3 is the closest engine and is available right now.' },
  s25: { since: '2026-09-15', label: 'Seedance 2.5', alternative: { key: 'kling', label: 'Kling 2.5' }, message: 'Seedance 2.5 is temporarily paused for maintenance. Nothing was charged. Kling 2.5 is available right now.' },
}
export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey[] = ['omni', 's25'] // KINEO-H3-DE-VOLTA-2026-09-22
/** Pausa do motor pela chave da UI/rota ('h3' | 'omni' | 's25'); null quando o motor está ativo. */
export function enginePaused(engine: string | null | undefined): EnginePause | null {
  const k = typeof engine === 'string' ? engine.toLowerCase() : ''
  return (PAUSED_ENGINE_KEYS as readonly string[]).includes(k) ? ENGINE_PAUSE[k as PausedEngineKey] : null
}
/** Pausa pela quality do biller ('cinematic_h3' | 'cinematic_omni' | 'cinematic_s25'). */
export function qualityPaused(quality: string | null | undefined): EnginePause | null {
  const q = typeof quality === 'string' ? quality.toLowerCase() : ''
  return q === 'cinematic_omni' ? ENGINE_PAUSE.omni : q === 'cinematic_s25' ? ENGINE_PAUSE.s25 : null // KINEO-H3-DE-VOLTA-2026-09-22
}

/** O 2.5 aparece para este e-mail? Publico depois do lancamento; antes, so a casa. */
export function s25Visible(email?: string | null): boolean {
  return S25_PUBLIC || isInternalEmail(email)
}

/** Copy de contagem: 'Eight' hoje, 'Nine' no lancamento. Uma verdade, N telas. */
// KINEO-MOTOR-EM-MANUTENCAO-2026-09-15 — a contagem e a lista públicas só falam dos motores que o público pode
// apertar HOJE: Veo 3.1, Kling 3, Kling 2.5, Seedance 1.5, Kineo 1 e Avatar (H3/Omni/S25 pausados, S25 interno).
// KINEO-H3-DE-VOLTA-2026-09-22: sete — o MiniMax H3 voltou.
export const VIDEO_ENGINE_COUNT_WORD = 'Seven'
export const VIDEO_ENGINE_COUNT_SENTENCE_START = 'Seven'
export const VIDEO_ENGINE_LIST_COPY = 'Veo 3.1, Kling 3, Kling 2.5, MiniMax H3, Seedance 1.5, Kineo 1 and Avatar'
export const PAUSED_ENGINES_COPY = 'Omni Flash and Seedance 2.5 are temporarily paused for maintenance (since 15 September 2026); nothing is charged for a blocked attempt, and Kling 3 / Kling 2.5 cover the same jobs meanwhile.'
