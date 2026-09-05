// sprint-retencao #9 — 04/09/2026 — o aviso passa a dizer O QUE ELE DETECTOU.
//
// ─────────────────────────────────────────────────────────────────────────────
// O DEFEITO, COM VITIMA E RELOGIO
// ─────────────────────────────────────────────────────────────────────────────
// `nikitaamiran@gmail.com`, 04/09, vinda do ChatGPT:
//   21:38:45  `activation_instruction_notice_viewed`
//             reason=prompt_looks_like_instruction  → o produto DETECTOU que
//             o texto era instrucao e, corretamente, NAO deu auto-start.
//   21:39:02  `chatgpt_quickstart_selected` input_type=`finished_script`
//             → ela escolheu "I have the full script" → script_mode=verbatim.
//   21:41:15  falha.  21:42:44  falha de novo.  Foi embora.  0 filmes.
// O texto dela comecava com "Create a 35-second cinematic YouTube Short in
// English about what would happen if the Moon..." — isso e o PROMPT que ela
// mandou para o ChatGPT, nao a resposta dele. Ou seja: uma IDEIA, escrita em
// forma de ordem. Em verbatim o produto narra a ordem.
//
// E o que o aviso dizia para ela, 17 segundos antes da escolha?
//   "Your ChatGPT script is still here. Kineo will narrate the spoken lines..."
// O aviso AFIRMA que o texto e um roteiro. O gatilho dele diz o contrario.
// A copy estava calibrada para o OUTRO formato de colagem (a resposta do
// chatbot, com rotulos "Visual:", "Camera:", markdown), e para esse formato
// ela esta certa. Para uma ordem de uma linha ela empurra a pessoa exatamente
// para o modo que nao pode funcionar.
//
// ─────────────────────────────────────────────────────────────────────────────
// A DECISAO, E O QUE ELA DE PROPOSITO NAO FAZ
// ─────────────────────────────────────────────────────────────────────────────
// O aviso passa a distinguir as DUAS formas que o mesmo detector pega:
//   `command_to_chatbot` → a pessoa colou a PERGUNTA ("Create a 35-second...").
//   `labeled_script`     → a pessoa colou a RESPOSTA ("Absolutely. Below is a
//                          **complete content package", "STYLE:", markdown).
// So a copy muda. NAO trocamos o modo da pessoa, NAO bloqueamos o Generate,
// NAO escondemos nenhuma escolha — quem quiser mandar verbatim manda. Trocar o
// modo por conta propria seria decidir no lugar de quem colou, e o defeito
// original ja foi o produto decidindo errado com informacao incompleta.
// Reversivel: e uma string por ramo e o ramo novo cai no antigo.
//
// LIMITE HONESTO: 3 pessoas viram este aviso em toda a historia (ele e de
// 02/09) e 1 delas caiu na colisao acima. n=1 nao prova taxa nenhuma. O que
// sustenta a mudanca nao e estatistica, e coerencia: um aviso nao pode
// afirmar o contrario do que o seu proprio gatilho detectou.

export const INSTRUCTION_PASTE_NOTICE_VERSION = 'instruction_paste_notice_v2'

/** As duas formas de colagem que `looksLikeInstruction` pega. */
export type InstructionPasteShape = 'command_to_chatbot' | 'labeled_script'

// Verbo de ORDEM na primeira linha: quem escreve assim esta falando COM o
// modelo, nao entregando o que o modelo escreveu. Subconjunto deliberado do
// INSTRUCTION_START de lib/momentumTopic.ts — de la vieram tambem as aberturas
// de RESPOSTA ("absolutely", "below is", "sure"), que sao o outro ramo.
const COMMAND_START =
  /^(create|make|generate|write|produce|give me|i want|i need|can you|could you|please)\b/i

/**
 * Diz QUAL das duas colagens chegou. Só é consultada depois de
 * `looksLikeInstruction` devolver true — não é um segundo detector, é a
 * leitura fina do que o primeiro já pegou. Sem sinal de ordem, o padrão é
 * `labeled_script`: é a forma que a copy antiga já servia bem, e um empate
 * deve cair no comportamento que já estava no ar.
 */
export function classifyInstructionPaste(raw: string | null | undefined): InstructionPasteShape {
  if (typeof raw !== 'string') return 'labeled_script'
  const first = raw.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? ''
  return COMMAND_START.test(first) ? 'command_to_chatbot' : 'labeled_script'
}

const NOTICES: Record<InstructionPasteShape, { title: string; body: string }> = {
  // A pessoa colou a ORDEM. Dizer isso na cara, e dizer o que acontece se ela
  // mandar assim mesmo — sem proibir.
  command_to_chatbot: {
    title: 'That looks like your idea, not the script',
    body: 'This reads like the request you sent ChatGPT, so “I have the full script” would narrate the request itself. Switch to “I only have the idea” and Kineo writes the hook, scenes and payoff for you — or paste what ChatGPT wrote back and keep the script mode.',
  },
  // A pessoa colou a RESPOSTA, com rotulos de producao. Copy de 02/09, intacta.
  labeled_script: {
    title: 'Your ChatGPT script is still here',
    body: 'Kineo will narrate the spoken lines and keep recognized Visual, Camera and timing labels out of the voiceover. Review it, then press Generate when you\'re ready.',
  },
}

/**
 * Mantida como CONSTANTE para nao quebrar nenhum import existente: e o texto
 * do ramo `labeled_script`, que era o unico que existia ate aqui.
 */
export const INSTRUCTION_PASTE_NOTICE = NOTICES.labeled_script

export function instructionPasteNoticeFor(shape: InstructionPasteShape) {
  return NOTICES[shape] ?? NOTICES.labeled_script
}

export function shouldShowInstructionPasteNotice(reason: string | null | undefined): boolean {
  return reason === 'prompt_looks_like_instruction'
}

export function instructionPasteNoticeMetadata(shape?: InstructionPasteShape) {
  return {
    version: INSTRUCTION_PASTE_NOTICE_VERSION,
    reason: 'prompt_looks_like_instruction',
    surface: 'generate_idea',
    // Sem isto o evento nao distingue os dois ramos e a proxima sessao mede a
    // mesma coisa que eu medi hoje: um numero so, para dois defeitos.
    paste_shape: shape ?? 'labeled_script',
  } as const
}

export function instructionPromptLengthBand(length: number) {
  if (!Number.isFinite(length) || length < 0) return 'unknown'
  if (length < 300) return 'under_300'
  if (length < 700) return '300_699'
  if (length < 1000) return '700_999'
  if (length === 1000) return '1000'
  return 'over_1000'
}
