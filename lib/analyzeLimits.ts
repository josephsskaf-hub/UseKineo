// ═══ KINEO-RECUSA-NAO-E-TENTE-DE-NOVO-2026-08-31 ═══════════════════════════
// Fonte unica do teto de caracteres da ideia. Ate hoje o numero 5000 vivia
// escrito a mao em TRES lugares que ninguem sincronizava: o maxLength do
// textarea, o teste de comprimento do /api/analyze-idea e nenhuma
// mensagem de erro (a pessoa nunca via o numero). Tres copias do mesmo numero
// e a receita conhecida de divergencia: basta alguem subir o teto do servidor
// para o textarea continuar barrando, ou baixar o do servidor para o cliente
// deixar passar um texto que ja nasce recusado.
//
// Aqui o numero e um so, e as tres pontas leem daqui.
export const ANALYZE_PROMPT_MAX_CHARS = 5000

// Frase do servidor no 400 de comprimento. Fica junto do numero porque a
// mensagem CITA o numero — separar os dois e como o teto ficasse certo e a
// frase mentisse. O cliente mostra esta frase literalmente num 4xx.
export function analyzePromptTooLongMessage(): string {
  return `Prompt is too long (${ANALYZE_PROMPT_MAX_CHARS.toLocaleString('en-US')} chars max).`
}
