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
export function analyzePromptTooLongMessage(max: number = ANALYZE_PROMPT_MAX_CHARS): string {
  return `Prompt is too long (${max.toLocaleString('en-US')} chars max).`
}

// ═══ KINEO-ROTEIRO-LONGO-NAO-E-ERRO-2026-09-08 ════════════════════════════
// O teto acima nasceu de uma regua de ROTEIRO, e a razao esta escrita em
// lib/gptHandoff.ts: "um 90s cabe em ~1.800 caracteres — 5.000 e folga, nao
// aperto". Isso e verdade quando o texto E o filme (script_mode='verbatim'):
// ali as palavras da pessoa viram narracao, e um texto de 13.000 caracteres
// nao e um Short, sao 16 minutos de fala.
//
// So que a MESMA regua era cobrada de quem escolheu "Let AI structure my
// text" (script_mode='ai'), e ali o texto NAO e o filme: e materia-prima que
// o modelo condensa em ~150-265 palavras. Colar um artigo de 11.000
// caracteres para o modelo resumir nao e um roteiro longo demais — e
// exatamente o uso que o modo existe para servir.
//
// O que a medicao mostrou (08/09, 5 dias, evento studio_prompt_over_limit_shown):
// 10 pessoas bateram no teto, 444 vezes. TRES nunca fizeram filme nenhum, e
// sao justamente as que mais brigaram: uma apagou o proprio texto 275 vezes
// em UM minuto contra um botao Generate travado; outra insistiu 89 vezes em
// 21 minutos. A mediana do texto no modo 'ai' era de 11.033 caracteres. A
// unica saida que a casa oferecia era o botao de CORTAR o texto da pessoa —
// e 1 das 10 apertou. Nove recusaram a mutilacao, que e a resposta sadia.
//
// Antes de subir o numero eu conferi se o teto era da URL, porque o texto
// viaja do /studio para o /generate na querystring: sondei a producao com
// 2.000, 6.000, 10.000, 14.000, 20.000 e 30.000 caracteres e TODAS as seis
// responderam 307 (o mesmo redirect de sempre), com um controle 404 ao lado
// para provar que a sonda discrimina. A URL nao e o teto.
//
// Por isso: 'verbatim' continua em 5.000, com a razao original INTACTA —
// as palavras sao o filme e o piso/teto de duracao continua mandando. 'ai'
// passa a 20.000, que cobre os dez casos medidos (o maior foi 20.191, um
// artigo inteiro vindo do chatgpt.com) e custa ~5 mil tokens de entrada no
// modelo, fracao de centavo. NADA no pipeline muda: isto e teto de ENTRADA,
// nao e como o filme e feito.
export const ANALYZE_PROMPT_MAX_CHARS_SOURCE = 20000

/** O teto que vale para ESTE modo. 'verbatim' = o texto e o filme (5.000);
 *  qualquer outro modo = o texto e materia-prima que o modelo reescreve
 *  (20.000). Fonte unica: quem cobra o teto e quem o MOSTRA leem daqui. */
export function analyzePromptMaxChars(scriptMode?: string | null): number {
  return scriptMode === 'verbatim' ? ANALYZE_PROMPT_MAX_CHARS : ANALYZE_PROMPT_MAX_CHARS_SOURCE
}
