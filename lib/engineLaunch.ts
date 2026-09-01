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

/** O 2.5 aparece para este e-mail? Publico depois do lancamento; antes, so a casa. */
export function s25Visible(email?: string | null): boolean {
  return S25_PUBLIC || isInternalEmail(email)
}

/** Copy de contagem: 'Eight' hoje, 'Nine' no lancamento. Uma verdade, N telas. */
export const VIDEO_ENGINE_COUNT_WORD = S25_PUBLIC ? 'Nine' : 'Eight'
export const VIDEO_ENGINE_COUNT_SENTENCE_START = S25_PUBLIC ? 'Nine' : 'Eight'
export const VIDEO_ENGINE_LIST_COPY = (S25_PUBLIC ? 'Seedance 2.5, ' : '') +
  'Omni Flash (Google\u2019s #1-ranked video model, Aug 2026), Veo 3.1, Kling 3, MiniMax H3, Kling 2.5, Seedance 1.5, Kineo 1 and Avatar'
