// KINEO-FERRAMENTAS-ORFAS-2026-08-14 — a porta que carrega o trabalho da pessoa.
//
// POR QUE ESTE ARQUIVO EXISTE.
// A medição da sprint das 11h de 14/08 é a mais limpa que esta casa já produziu
// sobre aquisição orgânica: toda página de SEO acima de 10 sessões converte 0%
// (8 páginas, 316 sessões, ZERO cliques), e as duas únicas que convertem —
// /free-script-generator (67%) e /free-ai-shorts-generator (41%) — são
// FERRAMENTAS. A variável não é "ter CTA". É a página deixar a pessoa FAZER
// alguma coisa e a porta seguinte carregar o que ela acabou de fazer. Ela não
// clica num anúncio; ela continua uma coisa que já começou.
//
// A casa já tem TRÊS ferramentas construídas (shorts-money-calculator,
// niche-picker, viral-score — 1.459 linhas) e nenhuma delas usava esse padrão.
//
// CORREÇÃO DE FATO SOBRE O DOCUMENTO DAS 11H (Regra Zero — verificar antes de
// construir): o doc afirma "zero saídas para o produto". Não é isso. As três
// TÊM saída. O que elas têm é uma saída com quatro defeitos, e é preciso nomear
// os quatro porque cada um mata de um jeito diferente:
//   1. `<a href>` cru em vez de <Link> → recarga completa do App Router.
//   2. URL ABSOLUTA para o próprio domínio (https://www.usekineo.com/...) →
//      além da recarga, um salto de origem desnecessário no meio do funil.
//   3. Destino = OUTRA PÁGINA DE SEO (/free-ai-shorts-generator), não o produto.
//      É o "circuito fechado" que a sprint das 10h achou em
//      /how-much-do-youtube-shorts-pay: interlinking que devolve a pessoa para
//      o labirinto em vez de para a porta.
//   4. Sem `organic_cta_clicked` → invisível para o placar. Duas delas nem
//      existiam nas tabelas de conversão porque não emitiam o evento que as
//      tabelas contam. (viral-score é a exceção parcial: emite o evento e
//      carrega a ideia, mas por `?prompt=` solto, sem auto-análise.)
//
// O defeito nº 3 é o caro. O nº 4 é o que impediu de descobrir o nº 3.
//
// O QUE ESTA FUNÇÃO FAZ.
// Devolve a MESMA forma de href que a melhor página da casa usa hoje
// (`activationHref` em FreeScriptClient.tsx): /signup com um `redirect` interno
// para /generate já carregando o resultado da pessoa. O `redirect` é lido por
// `activationRedirectFromSearch` no /signup e passa por `normalizeInternalRedirect`,
// então só caminhos same-origin sobrevivem — a validação é de lá, não daqui.
//
// DELIBERADAMENTE FORA: `create_intent=fast`. Esse parâmetro AUTO-DISPARA um
// render depois do auth, e render gasta crédito. Uma pessoa que acabou de sair
// de uma calculadora não pediu para queimar crédito; ela pediu para ver a
// ferramenta. `autoanalyze` apenas ANALISA (não debita) e é o que o
// /free-script-generator usa. Não subir de degrau sem dado.
//
// Não duplico `activationHref` do FreeScriptClient de propósito: aquela página é
// a que converte 67% e refatorá-la para provar um ponto seria trocar receita
// medida por elegância. Ela fica intocada; esta função nasce para as três órfãs.

const PROMPT_MAX = 600

export type ToolActivationOptions = {
  /** O que a pessoa acabou de produzir na ferramenta. Vira o prompt do /generate. */
  prompt?: string
  /** utm_campaign — o mesmo rótulo usado no `source` do organic_cta_clicked. */
  campaign: string
  /** Analisar sozinho ao chegar. NUNCA dispara render (isso é create_intent). */
  autoanalyze?: boolean
}

/**
 * /signup?…&redirect=/generate?prompt=<trabalho da pessoa>&autoanalyze=1
 *
 * Sem prompt, degrada para a porta simples (signup → /generate), que continua
 * sendo melhor que mandar para outra página de SEO.
 */
export function toolActivationHref({
  prompt,
  campaign,
  autoanalyze = true,
}: ToolActivationOptions): string {
  const signup = new URLSearchParams({
    utm_source: 'seo',
    utm_medium: 'organic',
    utm_campaign: campaign,
  })

  const clean = (prompt ?? '').replace(/\s+/g, ' ').trim().slice(0, PROMPT_MAX)
  if (clean) {
    const generate = new URLSearchParams({ prompt: clean })
    if (autoanalyze) generate.set('autoanalyze', '1')
    signup.set('redirect', `/generate?${generate.toString()}`)
  }

  return `/signup?${signup.toString()}`
}
