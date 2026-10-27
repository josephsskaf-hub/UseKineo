// [TRAVA 8.2 — vai do fundador 27/10 "faz todos esses consertos de 1 a 6"] KINEO-PEDIDO-CERTO-2710
// KINEO-PEDIDO-CERTO-2710 — O TEMA GRAVADO NO FILME É O PEDIDO DAQUELE FILME, NUNCA UM EXEMPLO DA CASA.
// KINEO-PEDIDO-CERTO-2710
// KINEO-PEDIDO-CERTO-2710 — Caso real (27/10 ~17:50 UTC, a8a74417, chatgpt.com, Nigéria, filme grátis de 15 s): o roteiro colado
// KINEO-PEDIDO-CERTO-2710 — era UM parágrafo terminando em "vertical 9:16 format." A prévia limpa da caixa (cleanScriptPreview)
// KINEO-PEDIDO-CERTO-2710 — apagava a LINHA INTEIRA que cita 9:16 (pensada para linhas de especificação soltas) — num parágrafo
// KINEO-PEDIDO-CERTO-2710 — único isso é o roteiro inteiro. A caixa ficou vazia; o despacho seguiu certo (structuredScriptRef),
// KINEO-PEDIDO-CERTO-2710 — mas a fotografia do tema (dispatchedPromptRef = caixa) foi '' → claim do compose com topic null. Ao
// KINEO-PEDIDO-CERTO-2710 — voltar para a aba, o histórico recarregou e o pré-preenchimento de primeira visita (que só travava
// KINEO-PEDIDO-CERTO-2710 — quando disparava) viu a caixa vazia e escreveu "5 morning habits Jeff Bezos…" NO MEIO DO RENDER; o
// KINEO-PEDIDO-CERTO-2710 — polling mandou a caixa viva como ?topic= e o filme do Ethan Cole nasceu com título do Bezos, temporada
// KINEO-PEDIDO-CERTO-2710 — sobre Elon Musk. Este módulo é a régua pura que as telas e os servidores compartilham.

/** KINEO-PEDIDO-CERTO-2710 — palavras curtas e de ligação que não dizem o assunto (en/pt/es). */
const VAZIAS = new Set([ // KINEO-PEDIDO-CERTO-2710
  'about', 'after', 'again', 'also', 'before', 'being', 'from', 'have', 'here', 'into', 'just', 'like', 'make', 'made', 'more', 'most', // KINEO-PEDIDO-CERTO-2710
  'only', 'over', 'same', 'some', 'than', 'that', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'used', 'very', // KINEO-PEDIDO-CERTO-2710
  'what', 'when', 'where', 'which', 'while', 'with', 'without', 'would', 'your', 'yours', 'will', 'were', 'been', 'does', 'each', // KINEO-PEDIDO-CERTO-2710
  'every', 'ever', 'even', 'much', 'many', 'such', 'through', 'under', 'until', 'upon', 'video', 'short', 'shorts', 'story', 'film', // KINEO-PEDIDO-CERTO-2710
  'para', 'como', 'mais', 'pelo', 'pela', 'essa', 'esse', 'isso', 'esta', 'este', 'isto', 'quando', 'onde', 'porque', 'sobre', 'entre', // KINEO-PEDIDO-CERTO-2710
  'muito', 'cada', 'todo', 'toda', 'todos', 'todas', 'depois', 'antes', 'ainda', 'mesmo', 'vídeo', 'video', 'historia', 'história', // KINEO-PEDIDO-CERTO-2710
]) // KINEO-PEDIDO-CERTO-2710

/** KINEO-PEDIDO-CERTO-2710 — radicais (5 letras) das palavras de conteúdo: "volcano"/"volcanoes" casam. */
export function radicaisDeConteudo(texto: string | null | undefined): Set<string> { // KINEO-PEDIDO-CERTO-2710
  const out = new Set<string>() // KINEO-PEDIDO-CERTO-2710
  const palavras = String(texto ?? '').toLowerCase().replace(/\[[^\]]*\]/g, ' ').match(/[\p{L}\p{N}]+/gu) ?? [] // KINEO-PEDIDO-CERTO-2710
  for (const p of palavras) { // KINEO-PEDIDO-CERTO-2710
    if (p.length < 4 || VAZIAS.has(p) || /^\d+$/.test(p)) continue // KINEO-PEDIDO-CERTO-2710
    out.add(p.slice(0, 5)) // KINEO-PEDIDO-CERTO-2710
  } // KINEO-PEDIDO-CERTO-2710
  return out // KINEO-PEDIDO-CERTO-2710
} // KINEO-PEDIDO-CERTO-2710

/**
 * KINEO-PEDIDO-CERTO-2710 — o tema e a fala NÃO têm uma única palavra de conteúdo em comum. Só julga quando há matéria dos
 * KINEO-PEDIDO-CERTO-2710 — dois lados (tema com ≥3 radicais, fala com ≥8): "Volcanoes" contra uma fala sobre lava fica como
 * KINEO-PEDIDO-CERTO-2710 — está (fino demais para acusar); "5 morning habits Jeff Bezos…" contra a fala do Ethan Cole discorda.
 */
export function temaDiscordaDaFala(tema: string | null | undefined, fala: string | null | undefined): boolean { // KINEO-PEDIDO-CERTO-2710
  const a = radicaisDeConteudo(tema) // KINEO-PEDIDO-CERTO-2710
  const b = radicaisDeConteudo(fala) // KINEO-PEDIDO-CERTO-2710
  if (a.size < 3 || b.size < 8) return false // KINEO-PEDIDO-CERTO-2710
  for (const r of a) if (b.has(r)) return false // KINEO-PEDIDO-CERTO-2710
  return true // KINEO-PEDIDO-CERTO-2710
} // KINEO-PEDIDO-CERTO-2710

const ROTULO_DE_SECAO = /^\s*(HOOK|GANCHO|MICRO REWARD|MICRO RECOMPENSA|ESCALATION|ESCALADA|RHYTHM|RITMO|PAYOFF|PAGAMENTO|RECOMPENSA FINAL)\b\s*\d*\s*(\([^)]*\))?\s*[:\-–]?\s*/i // KINEO-PEDIDO-CERTO-2710
const ESPEC_DE_FORMATO = /(?:,\s*|\s+)?(?:in\s+)?(?:a\s+)?(?:vertical\s+)?\b9\s*:\s*16\b(?:\s+(?:vertical|format|aspect(?:\s+ratio)?|video|frame))*|youtube\s+shorts?\s+format/gi // KINEO-PEDIDO-CERTO-2710

/**
 * KINEO-PEDIDO-CERTO-2710 — a prévia limpa do roteiro (a caixa do /studio/create), antes cleanScriptPreview dentro do
 * KINEO-PEDIDO-CERTO-2710 — GenerateClient. Mesmas regras de sempre, com duas diferenças: (1) uma linha que CITA 9:16 só é
 * KINEO-PEDIDO-CERTO-2710 — descartada quando é especificação solta (sem frase de verdade depois de tirar o 9:16); numa frase
 * KINEO-PEDIDO-CERTO-2710 — real, sai só o trecho do formato; (2) NUNCA devolve vazio para um texto que tinha conteúdo — o pior
 * KINEO-PEDIDO-CERTO-2710 — caso volta ao texto sem colchetes/rótulos ou ao próprio texto. Só exibição: o que vai ao servidor
 * KINEO-PEDIDO-CERTO-2710 — continua sendo o roteiro marcado de structuredScriptRef.
 */
export function limparPreviaDoRoteiro(text: string): string { // KINEO-PEDIDO-CERTO-2710
  const limpo = String(text ?? '') // KINEO-PEDIDO-CERTO-2710
    .split('\n') // KINEO-PEDIDO-CERTO-2710
    .map((line) => { // KINEO-PEDIDO-CERTO-2710
      let t = line.trim() // KINEO-PEDIDO-CERTO-2710
      if (!t) return '' // KINEO-PEDIDO-CERTO-2710
      t = t.replace(ROTULO_DE_SECAO, '') // KINEO-PEDIDO-CERTO-2710
      t = t.replace(/\[[^\]]*\]/g, '').trim() // KINEO-PEDIDO-CERTO-2710
      return t // KINEO-PEDIDO-CERTO-2710
    }) // KINEO-PEDIDO-CERTO-2710
    .map((t) => { // KINEO-PEDIDO-CERTO-2710
      if (!t) return '' // KINEO-PEDIDO-CERTO-2710
      if (!/\b9\s*:\s*16\b|youtube\s+shorts?\s+format/i.test(t)) return t // KINEO-PEDIDO-CERTO-2710
      const semFormato = t.replace(ESPEC_DE_FORMATO, '').replace(/\s+([.,;!?])/g, '$1').replace(/[,;:\s]+([.!?])?$/, '$1').trim() // KINEO-PEDIDO-CERTO-2710
      const palavras = semFormato.match(/[\p{L}]{2,}/gu) ?? [] // KINEO-PEDIDO-CERTO-2710
      return palavras.length >= 6 ? semFormato : '' // KINEO-PEDIDO-CERTO-2710 — linha de especificação solta: sai inteira, como sempre
    }) // KINEO-PEDIDO-CERTO-2710
    .filter((t) => { // KINEO-PEDIDO-CERTO-2710
      if (!t) return false // KINEO-PEDIDO-CERTO-2710
      if (/^\s*-\s+(Total|ZERO|Cut|Hold|One legend|Voice|Editing)/i.test(t)) return false // KINEO-PEDIDO-CERTO-2710
      const noSpecial = t.replace(/[^a-zA-Z]/g, '') // KINEO-PEDIDO-CERTO-2710
      if (noSpecial.length > 0 && noSpecial === noSpecial.toUpperCase() && noSpecial.length < 40) return false // KINEO-PEDIDO-CERTO-2710
      return true // KINEO-PEDIDO-CERTO-2710
    }) // KINEO-PEDIDO-CERTO-2710
    .join('\n\n') // KINEO-PEDIDO-CERTO-2710
  if (limpo.trim()) return limpo // KINEO-PEDIDO-CERTO-2710
  const semMarcas = String(text ?? '').replace(/\[[^\]]*\]/g, ' ').split('\n').map((l) => l.replace(ROTULO_DE_SECAO, '').trim()).filter(Boolean).join('\n\n').trim() // KINEO-PEDIDO-CERTO-2710
  return semMarcas || String(text ?? '').trim() // KINEO-PEDIDO-CERTO-2710 — vazio só quando a entrada era vazia
} // KINEO-PEDIDO-CERTO-2710

/**
 * KINEO-PEDIDO-CERTO-2710 — a fotografia do tema no instante do despacho (o cliente). `caixa` = o que a tela mostra;
 * KINEO-PEDIDO-CERTO-2710 — `enviado` = o texto que vai de fato ao servidor (structuredScriptRef ?? caixa). A caixa vence
 * KINEO-PEDIDO-CERTO-2710 — quando existe e fala do mesmo assunto (é a versão legível, sem marcadores); vazia ou de outro
 * KINEO-PEDIDO-CERTO-2710 — assunto, o tema passa a ser a prévia limpa do que foi enviado.
 */
export function temaDoDespacho(caixa: string | null | undefined, enviado: string | null | undefined): string { // KINEO-PEDIDO-CERTO-2710
  const c = String(caixa ?? '').trim() // KINEO-PEDIDO-CERTO-2710
  const e = String(enviado ?? '').trim() // KINEO-PEDIDO-CERTO-2710
  if (c && (!e || !temaDiscordaDaFala(c, e))) return c // KINEO-PEDIDO-CERTO-2710
  return e ? limparPreviaDoRoteiro(e) : c // KINEO-PEDIDO-CERTO-2710
} // KINEO-PEDIDO-CERTO-2710

/** KINEO-PEDIDO-CERTO-2710 — um tema curto tirado da própria fala (1ª e, se couber, 2ª frase; ≤ 300 caracteres). */
export function temaDaFala(fala: string | null | undefined): string { // KINEO-PEDIDO-CERTO-2710
  const plano = limparPreviaDoRoteiro(String(fala ?? '')).replace(/\s+/g, ' ').trim() // KINEO-PEDIDO-CERTO-2710
  if (!plano) return '' // KINEO-PEDIDO-CERTO-2710
  const frases = plano.match(/[^.!?]+[.!?]+["”']?|[^.!?]+$/g) ?? [plano] // KINEO-PEDIDO-CERTO-2710
  let out = frases[0].trim() // KINEO-PEDIDO-CERTO-2710
  if (frases[1] && (out + ' ' + frases[1].trim()).length <= 300) out = out + ' ' + frases[1].trim() // KINEO-PEDIDO-CERTO-2710
  return out.slice(0, 300).trim() // KINEO-PEDIDO-CERTO-2710
} // KINEO-PEDIDO-CERTO-2710

export type FonteDoTema = 'candidato' | 'fala' | 'vazio' // KINEO-PEDIDO-CERTO-2710

/**
 * KINEO-PEDIDO-CERTO-2710 — o tema que se grava/usa para um filme (servidores: compose/status, temporada, próximo episódio).
 * KINEO-PEDIDO-CERTO-2710 — `candidatos` em ordem de autoridade (ex.: claim assinado, depois parâmetro da aba). Vence o 1º não
 * KINEO-PEDIDO-CERTO-2710 — vazio que não discorda da fala real do filme; se todos discordam (ou não há nenhum) e há fala, o
 * KINEO-PEDIDO-CERTO-2710 — tema nasce da fala. Sem fala, fica o 1º candidato não vazio (comportamento de antes).
 */
export function escolherTemaDoFilme(args: { candidatos: Array<string | null | undefined>; fala?: string | null }): { tema: string; fonte: FonteDoTema; indice: number | null; descartados: number } { // KINEO-PEDIDO-CERTO-2710
  const fala = String(args.fala ?? '').trim() // KINEO-PEDIDO-CERTO-2710
  let descartados = 0 // KINEO-PEDIDO-CERTO-2710
  for (let i = 0; i < args.candidatos.length; i++) { // KINEO-PEDIDO-CERTO-2710
    const c = String(args.candidatos[i] ?? '').trim() // KINEO-PEDIDO-CERTO-2710
    if (!c) continue // KINEO-PEDIDO-CERTO-2710
    if (fala && temaDiscordaDaFala(c, fala)) { descartados++; continue } // KINEO-PEDIDO-CERTO-2710
    return { tema: c, fonte: 'candidato', indice: i, descartados } // KINEO-PEDIDO-CERTO-2710
  } // KINEO-PEDIDO-CERTO-2710
  const daFala = temaDaFala(fala) // KINEO-PEDIDO-CERTO-2710
  if (daFala) return { tema: daFala, fonte: 'fala', indice: null, descartados } // KINEO-PEDIDO-CERTO-2710
  return { tema: '', fonte: 'vazio', indice: null, descartados } // KINEO-PEDIDO-CERTO-2710
} // KINEO-PEDIDO-CERTO-2710
