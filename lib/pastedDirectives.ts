// ═══════════════════════════════════════════════════════════════════════════
// KINEO-DIRETRIZES-COLADAS — sprint-retencao #9 — 04/09/2026
//
// O NÚMERO QUE DÓI (30 dias, contas externas, medido em SQL às 00:30 UTC):
//   · 46 pessoas cujo PRIMEIRO filme nasceu de um texto colado que começa por
//     ORDEM ("Create a 45-second vertical 9:16 Short about…", "STYLE: Bright,
//     colourful…", "### Scene 1 — 0–10 sec") fizeram um SEGUNDO filme em
//     8,7% dos casos (4 de 46; média de 1,11 filmes por pessoa).
//   · 714 pessoas cujo primeiro filme nasceu de um tema normal: 27,5%
//     (196 de 714; média 1,59).
//   3,2× de diferença no degrau 1→2, que é o degrau que prevê assinatura.
//   18 das 46 chegaram nos últimos 14 dias — não é coorte morta.
//
// POR QUE ISSO ACONTECE (lido nas amostras reais, não suposto): o texto que
// essas pessoas colam não é um tema — é o PEDIDO que elas deram ao ChatGPT, e
// ele vem cheio de exigências que o produto simplesmente IGNORA em silêncio:
//   "Create a 2–4 minute, 16:9 widescreen educational STEM documentary…"
//   "Create a 25-30 second vertical YouTube Short about…"
//   "Create a 35–45 second YouTube Short titled:"
//   "Create ALL visuals with AI. DO NOT use stock footage or real people."
// O produto tem TRÊS durações (35/60/90) e é 9:16. Quem pediu 2–4 minutos em
// 16:9 recebeu 35 segundos em 9:16, pagou por isso, e não voltou.
//
// O QUE ESTE MÓDULO FAZ, E O QUE ELE NÃO FAZ:
//   FAZ  · lê as diretrizes que a pessoa ESCREVEU e devolve, para cada uma, se
//          a casa atende ou não;
//   FAZ  · para DURAÇÃO, aponta o botão que honra o pedido — a régua da casa é
//          "passar do alvo é bom, ficar abaixo é defeito (história
//          interrompida)" (fundador, 02/09), então a escolha é sempre o MENOR
//          botão que cobre o que a pessoa pediu, nunca um botão abaixo.
//   NÃO FAZ · não toca em motor, prompt de cena, régua de palavras por segundo
//          nem em qualquer decisão de COMO o filme fica (trava de qualidade do
//          fundador, 03/09). Nada aqui entra no pipeline de render.
//   NÃO FAZ · não afirma nada sobre IDIOMA nem sobre "sem banco de imagens".
//          Os dois aparecem nas amostras, mas a cobertura real de voz por
//          idioma e a fonte de imagem por motor não foram medidas nesta
//          rodada — declarar "não damos conta" sem medir seria repetir o
//          defeito de copy que mente. Eles saem marcados como `unknown`, para
//          a telemetria, e NUNCA viram promessa nem recusa na tela.
//
// Módulo puro: sem rede, sem banco, sem React. Testado em
// scripts/test-diretrizes-coladas-2026-09-04.mjs com os textos REAIS do banco.
// ═══════════════════════════════════════════════════════════════════════════

/** Botões de duração que a tela de criação realmente oferece. */
export const DURACOES_SUPORTADAS = [35, 60, 90] as const

export type DirectiveKind = 'duration' | 'aspect' | 'language' | 'footage'
export type DirectiveSupport = 'honored' | 'unsupported' | 'unknown'

export type PastedDirective = {
  kind: DirectiveKind
  /** O trecho exato que a pessoa escreveu — nunca parafraseado. */
  raw: string
  support: DirectiveSupport
  /** Segundos pedidos (kind 'duration'); botão escolhido em `appliedSeconds`. */
  askedSeconds?: number
  appliedSeconds?: number
}

export type PastedDirectivesReading = {
  directives: PastedDirective[]
  /** Botão que a tela deveria acender para honrar o texto, ou null. */
  suggestedDuration: number | null
  /** Só o que a casa comprovadamente NÃO faz — base da frase honesta na tela. */
  unsupported: PastedDirective[]
  /** true quando o texto tem cara de ordem colada, não de tema. */
  looksPasted: boolean
}

// ── DURAÇÃO ────────────────────────────────────────────────────────────────
// Formas vistas no banco: "40-second", "45-second", "35–45 second",
// "25-30 second", "2–4 minute", "60 second", "30-second", "35-45 second".
// O travessão longo (– U+2013) aparece tanto quanto o hífen; "to" também.
const SEPARADOR_FAIXA = '(?:\\s*(?:-|–|—|to|até)\\s*)'
const NUM = '(\\d{1,3})'
const RE_DURACAO = new RegExp(
  `\\b${NUM}(?:${SEPARADOR_FAIXA}${NUM})?[\\s-]*(second|sec|seg|segundo|minute|min|minuto)s?\\b`,
  'gi',
)

// ── PROPORÇÃO ──────────────────────────────────────────────────────────────
// A casa entrega 9:16. Só marcamos o que é EXPLICITAMENTE horizontal — quem
// escreve "vertical 9:16" está pedindo exatamente o que já damos.
const RE_HORIZONTAL = /\b(16\s*[:x]\s*9|widescreen|landscape\s+(?:format|video|orientation)|horizontal\s+(?:format|video|orientation))\b/i
const RE_VERTICAL = /\b(9\s*[:x]\s*16|vertical|portrait)\b/i

// ── IDIOMA e FONTE DE IMAGEM (só telemetria, nunca promessa) ───────────────
const RE_IDIOMA = /\b(?:in|em|narration\s+in|entirely\s+in|only\s+in)\s+(arabic|hindi|spanish|french|german|portuguese|italian|japanese|korean|chinese|russian|turkish|urdu|bengali|indonesian|vietnamese|thai|polish|dutch)\b/i
const RE_SEM_BANCO = /\b(no\s+stock\s+footage|do\s*not\s+use\s+stock|all\s+visuals?\s+with\s+ai|only\s+ai[- ]generated)\b/i

// ── "isto é ordem colada, não tema" ────────────────────────────────────────
// Mesma família de sinais do `looksLikeInstruction` de lib/momentumTopic.ts,
// que já está em produção desde 02/09 — aqui a leitura é da PRIMEIRA linha,
// e a semente da PRÓPRIA casa ("Create the next episode in the same Short
// series about …") é excluída de propósito: ela é ordem, mas é ordem NOSSA, e
// o caminho da série já a trata. Sem essa exclusão, 43 filmes legítimos da
// porta de continuação entrariam na coorte e sujariam toda medição.
const RE_SEMENTE_DA_CASA = /^create the next episode in the same short series\b/i
const RE_COMECO_DE_ORDEM = /^(?:create|make|generate|write|produce|give me|i want|i need|please|absolutely|sure|certainly|of course|below is|okay|ok|crie|criar|fa[çc]a|gere|prepare|monte|escreva|produza|quero|preciso|crea|genera|prepara|escribe|quiero|necesito|haz)\b/i // PEDIDO-FIEL-2610
const RE_ROTULO = /^[A-Z][A-Z /&-]{2,}:/
const RE_MARKDOWN = /(\*\*|^#{1,6}\s|^---)/

function primeiraLinha(texto: string): string {
  return texto.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? ''
}

/** O menor botão que COBRE o pedido. Abaixo do pedido nunca — história cortada. */
// KINEO-SEEDANCE-15S-2026-09-29 — `duracoes` opcional: o /generate passa os botões do motor escolhido (o Seedance tem 15 s
// quando o interruptor deixa). Sem o argumento, a lista global de sempre (35/60/90).
export function menorBotaoQueCobre(segundos: number, duracoes: readonly number[] = DURACOES_SUPORTADAS): number | null {
  for (const d of [...duracoes].sort((a, b) => a - b)) if (d >= segundos) return d
  return null
}

function segundosDe(valor: number, unidade: string): number {
  return /^(minute|min|minuto)/i.test(unidade) ? valor * 60 : valor
}

/** PEDIDO-FIEL-2610: mm:ss is duration only next to a film/duration request.
 * A story's clock time ("at 3:00") and aspect ratio ("9:16") are not duration. */
function primeiraDuracaoPedida(texto: string): { raw: string; seconds: number; index: number } | null {
  RE_DURACAO.lastIndex = 0
  const unit = RE_DURACAO.exec(texto)
  let first = unit ? {
    raw: unit[0].trim(),
    seconds: segundosDe(unit[2] ? Math.max(Number(unit[1]), Number(unit[2])) : Number(unit[1]), unit[3]),
    index: unit.index,
  } : null
  const clock = /(?<!\d)(\d{1,3}):([0-5]\d)(?!\d)/g
  for (let m = clock.exec(texto); m; m = clock.exec(texto)) {
    const before = texto.slice(Math.max(0, m.index - 80), m.index)
    const after = texto.slice(m.index + m[0].length, m.index + m[0].length + 80)
    const explicit = /\b(?:dura[çc][ãa]o|duraci[oó]n|duration|length)\s*(?:(?::|=|de|of)\s*)?$/i.test(before)
      || /^\s*(?:(?:de|of)\s+)?(?:dura[çc][ãa]o|duraci[oó]n|duration)\b/i.test(after)
    const film = /\b(?:v[íi]deo|filme|film|movie|short|reel|clip)\s+(?:(?:de|com|of|lasting|tenha|dure|lasts)\s*)?$/i.test(before)
      || /^\s*(?:-\s*)?(?:v[íi]deo|filme|film|movie|short|reel|clip)\b/i.test(after)
    if (!explicit && (!film || m[0] === '9:16')) continue
    const seconds = Number(m[1]) * 60 + Number(m[2])
    if (seconds > 0 && (!first || m.index < first.index)) first = { raw: m[0], seconds, index: m.index }
  }
  return first
}

/**
 * Lê as diretrizes que a pessoa escreveu no texto colado.
 * Puro: mesma entrada, mesma saída, sem efeito nenhum.
 */
export function readPastedDirectives(raw: string | null | undefined, duracoes: readonly number[] = DURACOES_SUPORTADAS): PastedDirectivesReading {
  const vazio: PastedDirectivesReading = {
    directives: [], suggestedDuration: null, unsupported: [], looksPasted: false,
  }
  if (typeof raw !== 'string') return vazio
  const texto = raw.trim()
  if (!texto) return vazio

  const primeira = primeiraLinha(texto)
  const semente = RE_SEMENTE_DA_CASA.test(primeira)
  const looksPasted = !semente && (
    RE_COMECO_DE_ORDEM.test(primeira) || RE_ROTULO.test(primeira) || RE_MARKDOWN.test(primeira)
  )

  const directives: PastedDirective[] = []

  // ── duração ──────────────────────────────────────────────────────────────
  // A semente da casa carrega o texto do episódio anterior e pode conter um
  // número de segundos que NÃO é pedido da pessoa. Fora dela, o primeiro
  // número de duração do texto é a intenção declarada.
  if (!semente) {
    const duration = primeiraDuracaoPedida(texto)
    if (duration) {
      // Ranges use their upper bound; clock notation needs explicit film context.
      const pedido = duration.seconds
      if (pedido > 0) {
        const botao = menorBotaoQueCobre(pedido, duracoes)
        directives.push({
          kind: 'duration',
          raw: duration.raw,
          support: botao === null ? 'unsupported' : 'honored',
          askedSeconds: pedido,
          ...(botao === null ? {} : { appliedSeconds: botao }),
        })
      }
    }
  }

  // ── proporção ────────────────────────────────────────────────────────────
  const horizontal = texto.match(RE_HORIZONTAL)
  if (horizontal && !RE_VERTICAL.test(texto)) {
    directives.push({ kind: 'aspect', raw: horizontal[0].trim(), support: 'unsupported' })
  }

  // ── idioma e fonte de imagem: detectados, nunca julgados ─────────────────
  const idioma = texto.match(RE_IDIOMA)
  if (idioma) directives.push({ kind: 'language', raw: idioma[0].trim(), support: 'unknown' })
  const semBanco = texto.match(RE_SEM_BANCO)
  if (semBanco) directives.push({ kind: 'footage', raw: semBanco[0].trim(), support: 'unknown' })

  const duracao = directives.find((d) => d.kind === 'duration')
  return {
    directives,
    suggestedDuration: duracao?.appliedSeconds ?? null,
    unsupported: directives.filter((d) => d.support === 'unsupported'),
    looksPasted,
  }
}

/**
 * A frase honesta para a tela. Devolve null quando não há NADA comprovado a
 * dizer — silêncio é melhor que aviso genérico, e `unknown` nunca vira recusa.
 */
export function fraseDoQueNaoDamosConta(leitura: PastedDirectivesReading, language = 'en'): string | null {
  const locale = language.toLowerCase().split(/[-_]/)[0] // PEDIDO-FIEL-2610 — caller chooses the interface language.
  const partes = leitura.unsupported.map((d) => {
    if (d.kind === 'duration') {
      const pedido = d.askedSeconds ?? 0
      if (locale === 'pt') return `${pedido >= 120 ? `${Math.round(pedido / 60)} minutos` : `${pedido} segundos`} (a maior duração aqui é 90 segundos)`
      if (locale === 'es') return `${pedido >= 120 ? `${Math.round(pedido / 60)} minutos` : `${pedido} segundos`} (la duración máxima aquí es de 90 segundos)`
      const label = pedido >= 120 ? `${Math.round(pedido / 60)} minutes` : `${pedido} seconds`
      return `${label} (the longest film here is 90 seconds)`
    }
    if (locale === 'pt') return `${d.raw} (revise o formato selecionado antes de continuar)`
    if (locale === 'es') return `${d.raw} (revisa el formato seleccionado antes de continuar)`
    return `${d.raw} (every film here is vertical 9:16)`
  })
  if (!partes.length) return null
  if (locale === 'pt') return `Seu texto pede ${partes.join(' e ')}.`
  if (locale === 'es') return `Tu texto pide ${partes.join(' y ')}.`
  return `Your text asks for ${partes.join(' and ')}.`
}
