// ═══ KINEO-PAINEL-QUE-NAO-MENTE-2026-09-03 ════════════════════════════════
// O painel de erros da Vercel mostrava ~206 "falhas" em 24h. 148 delas — SETE
// DE CADA DEZ — eram uma única linha que nem erro é:
//
//   (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not
//   standardized and prone to errors that have security implications.
//
// O aviso não vem do nosso código: `url.parse` não aparece em nenhum arquivo
// nosso (só em documentação). Vem de dependência — o Node imprime em stderr, e
// a Vercel classifica tudo que sai em stderr como erro. Resultado: o ruído
// enterra o sinal.
//
// O CUSTO REAL DISSO, medido em 03/09: com 70% do painel tomado por um aviso
// inofensivo, o alerta de verdade passou batido — 34 pessoas com filme pronto e
// não entregue desde 21/08, e o e-mail da Vercel de 01/09 avisando 503 em 100%
// das chamadas de uma rota. Painel que grita o tempo todo é painel que ninguém
// lê, exatamente como o CI que mandou 30 e-mails sem rodar nada.
//
// `process.noDeprecation` silencia SÓ avisos de depreciação. Erro de verdade,
// exceção, stack trace e qualquer console.error nosso continuam aparecendo.
// Não esconde defeito: esconde barulho que não é defeito.
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.noDeprecation = true
  }
}
