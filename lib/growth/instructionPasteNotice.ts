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

/** As formas de colagem que `looksLikeInstruction` pega. */
export type InstructionPasteShape = 'command_to_chatbot' | 'labeled_script' | 'brief' | 'brief_two_voices'

// ═══ KINEO-BRIEF-NAO-E-FALA-2026-09-12 — a terceira forma: o BRIEFING ═══════
// 12/09, onu***/edu*** (mesma pessoa, 2 contas, 5 tentativas, 1 checkout):
// colou uma ficha de personagens ("Lumi: pequena criatura… Voz infantil
// feminina") + instruções ("Manter o mesmo design", "Crie um vídeo infantil")
// e apertou Generate. A voz leu a ficha por 62 s (25 dos 30cr). O produto
// não tem duas vozes nem personagem de design fixo fora do Seedance — e não
// dizia isso. Decisão do fundador (17:40, "faz o que você acha melhor"):
// aviso honesto na entrada, sem bloquear, sem trocar o modo da pessoa.
// O parser já trata brief como modo IA; aqui é só a copy do que vai acontecer.
// ═══ MIRROR: looksLikeBriefLite — lib/momentumTopic.ts ≡ lib/growth/instructionPasteNotice.ts ═══
// KINEO-BRIEF-NAO-E-FALA-2026-09-12 — cópia leve de looksLikeBrief (lib/scriptParser.ts)
// para arquivos que precisam ficar sem import (os guardiões os carregam crus).
// Mexeu num, mexe no outro: o guardião compara os dois blocos byte a byte.
const BRIEF_SHEET_HEAD = /^\p{Lu}[\p{L}'’-]{1,24}(?:\s\p{Lu}[\p{L}'’-]{1,24})?\s*[:：]\s*([^"“'‘].{11,})$/u
const BRIEF_SHEET_VOCAB = /\b(voz|voice|vozes|voices|design|criatura|creature|olhos|eyes|anteninhas|antenas|antennae|orelhas|ears|mochila|backpack|roupa|roupas|wearing|outfit|cabelo|hair|express[ãa]o|expression|personalidade|personality|cor|cores|color|colour|anos de idade|years old|altura|tall|sotaque|accent|timbre|tone of voice|apar[êe]ncia|appearance|tra[çc]os|features)\b/i
const BRIEF_SPEECH_LABEL = /^(voice\s?-?\s?over|voiceover|vo|narration|narrator|narrador|narradora|narra[çc][ãa]o|narraci[óo]n|dialogue|di[áa]logo|dialogo|fala|falas|speech|spoken(?:\s+text)?|line|lines|voz|voz em off|locu[çc][ãa]o|locutor|locutora|texto falado|seslendirme)\s*(?:\([^)]{0,60}\))?\s*[:：]/i
const BRIEF_INSTRUCTION_VERB = /^(crie|criar|fa[çc]a|fazer|gere|gerar|prepare|preparar|monte|montar|escreva|escrever|produza|produzir|quero|preciso|gostaria|create|make|generate|write|produce|prepare|build|give me|i want|i need|i'd like|please|crea|genera|prepara|escribe|produce|quiero|necesito|haz|hazla|haz[ıi]rla|olu[şs]tur|yap|yaz|üret)\b/i
const BRIEF_INSTRUCTION_VERB_ANYWHERE = /\b(haz[ıi]rla(?:y[ıi]n)?|olu[şs]tur(?:un)?|üret(?:in)?|kullan(?:[ıi]n)?|olsun|yap[ıi]n|yaz[ıi]n|ekle(?:yin)?)\b/i
const BRIEF_DELIVERABLE = /\b(v[íi]deos?|videos?|shorts?|reels?|clips?|clipes?|anima[çc][ãa]o|animation|animasyon|cenas?|scenes?|sahne|hist[óo]ria|historinha|story|cuento|roteiro|script|senaryo|narra[çc][ãa]o|narration|seslendirme|voz|voice|ses|legendas?|subtitles?|altyaz[ıi]|personagens?|characters?|karakter|formato|format|estilo|style|tom|tone|dura[çc][ãa]o|duration|segundos?|seconds?|saniye|stil|g[öo]rsel)\b/i
const BRIEF_STAGE_LABEL = /^(konu|g[öo]rsel(?:ler)?|kamera|m[üu]zik|altyaz[ıi](?:lar)?|objetivo|goal|regras?|rules?|instru[çc][õo]es|instructions|cen[áa]rio|escenario|ambiente|design|main character|personagem principal|vozes|voices|voice|visuals?|visual style|imagem|camera|c[âa]mera|lighting|music|m[úu]sica|style|estilo|tone|tom|character|characters|personagens|personajes|setting|format|formato|title|t[íi]tulo|theme|tema|duration|dura[çc][ãa]o)\s*[:：]/i
function briefUnwrap(line: string): string { return (line ?? '').replace(/^[\s>*_`~#•·\-–—]+/, '').trim() }
export function looksLikeBriefLite(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false
  const lines = raw.split(/\r?\n/).map(briefUnwrap).filter(Boolean)
  if (lines.some((u) => BRIEF_SPEECH_LABEL.test(u))) return false
  let ficha = 0, instrucao = 0, producao = 0
  for (const u of lines) {
    const m = !BRIEF_STAGE_LABEL.test(u) ? u.match(BRIEF_SHEET_HEAD) : null
    if (m && BRIEF_SHEET_VOCAB.test(m[1])) { ficha++; continue }
    if (u.length <= 400 && BRIEF_DELIVERABLE.test(u) && (BRIEF_INSTRUCTION_VERB.test(u) || BRIEF_INSTRUCTION_VERB_ANYWHERE.test(u))) { instrucao++; continue }
    if (BRIEF_STAGE_LABEL.test(u)) producao++
  }
  if (ficha >= 1 && ficha + instrucao + producao >= 2) return true
  return instrucao >= 2
}
// ═══ END MIRROR ═══

const TWO_VOICES_RE = /\b(duas vozes|two voices|dos voces|zwei stimmen|iki ses)\b/i
const VOICE_SPEC_RE = /\b(voz|voice|voces|vozes|voices|ses)\b[^\n]{0,40}\b(feminin[ao]|masculin[ao]|female|male|infantil|cartunesc[ao]|cartoon|child|kid)/gi
function briefWantsTwoVoices(raw: string): boolean {
  if (TWO_VOICES_RE.test(raw)) return true
  const specs = raw.match(VOICE_SPEC_RE) ?? []
  return specs.length >= 2
}

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
  if (looksLikeBriefLite(raw)) return briefWantsTwoVoices(raw) ? 'brief_two_voices' : 'brief'
  const first = raw.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? ''
  return COMMAND_START.test(first) ? 'command_to_chatbot' : 'labeled_script'
}

// ─────────────────────────────────────────────────────────────────────────────
// KINEO-PORTA-CHATGPT-2026-09-07 — o aviso ganha uma PORTA, so no ramo da ordem.
// ─────────────────────────────────────────────────────────────────────────────
// Medido no banco de producao ANTES de ligar (a casa ja perdeu 2 rotacoes
// ligando peca em superficie que mede zero): 21 pessoas em 3 dias colaram uma
// ORDEM de chatbot no Studio (`pasted_directives_detected`). Essa e a pessoa
// exata para quem /chatgpt existe — ela QUER que uma IA escreva o roteiro; so
// colou no lugar errado. Ate aqui o aviso dizia isso e parava.
// O CTA aponta para /chatgpt (prompt da casa + caixa que recebe o roteiro de
// volta). `utm_source=paste_notice` e a etiqueta desta porta na chegada; o
// clique tem evento proprio no GenerateClient, porque o UTM de sessao e
// first-touch e pode ja estar ocupado quando a pessoa clica daqui.
// SO `command_to_chatbot` ganha o link: quem colou a RESPOSTA do chatbot
// (`labeled_script`) ja tem o roteiro na mao — manda-la buscar um prompt seria
// empurra-la para tras. Este arquivo continua PURO (sem import): e carregado
// por componente de cliente, e o tsc nao ve a fronteira servidor/cliente.
export const INSTRUCTION_PASTE_CTA_HREF = '/chatgpt?utm_source=paste_notice'

const NOTICES: Record<InstructionPasteShape, { title: string; body: string; ctaHref?: string; ctaLabel?: string }> = {
  // A pessoa colou a ORDEM. Dizer isso na cara, e dizer o que acontece se ela
  // mandar assim mesmo — sem proibir.
  command_to_chatbot: {
    title: 'That looks like your idea, not the script',
    body: 'This reads like the request you sent ChatGPT, so “I have the full script” would narrate the request itself. Switch to “I only have the idea” and Kineo writes the hook, scenes and payoff for you — or paste what ChatGPT wrote back and keep the script mode.',
    ctaHref: INSTRUCTION_PASTE_CTA_HREF,
    ctaLabel: 'Want ChatGPT, Claude or Gemini to write the full script? Get the prompt that works →',
  },
  // A pessoa colou a RESPOSTA, com rotulos de producao. Copy de 02/09, intacta.
  // A pessoa colou um BRIEFING (ficha + instruções). Dizer o que a Kineo faz
  // com ele e o que ela NÃO faz — antes de gastar crédito.
  brief: {
    title: 'This reads as a brief, not a script',
    body: 'Character sheets and instructions are treated as a brief: Kineo writes the story from it and narrates it with one voice. Characters with a fixed look are only possible on Seedance 1.5 — pick it before you generate. Want the exact words spoken? Paste the narration itself.',
  },
  brief_two_voices: {
    title: 'One narrator voice only — for now',
    body: 'This brief asks for two character voices. Kineo narrates with a single voice today (the narrator tells the dialogue), and characters with a fixed look are only possible on Seedance 1.5. If that works for you, pick Seedance and generate; otherwise paste just the narration you want spoken.',
  },
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

// ─────────────────────────────────────────────────────────────────────────────
// KINEO-CARIMBO-CTA-2026-09-07 — o evento de IMPRESSAO passa a dizer se havia
// LINK na tela.
// ─────────────────────────────────────────────────────────────────────────────
// Medido no banco de producao ANTES de escrever isto: em 3 dias, OITO pessoas
// viram `activation_instruction_notice_viewed` com paste_shape=command_to_chatbot
// e ZERO clicaram no CTA (`instruction_notice_cta_clicked` nao tem uma linha em
// 14 dias). Lido de fora, "0 de 8" e um veredito de porta morta. Nao e: o CTA
// subiu por volta das 02:00 BRT de 07/09 e SETE dessas oito viram a tela quando
// nao havia link nenhum para clicar. O denominador honesto e 1, e 0 de 1 nao
// prova nada.
// Nenhum campo do evento separava as duas telas: `version` e o mesmo v2 nas
// duas (a copy do ramo nao mudou quando o link entrou) e `paste_shape` e de
// 05/09. Sem carimbo, a proxima sessao le 0/8, conclui "ninguem quer" e mata
// uma peca que quase ninguem viu.
// `cta_present` e o carimbo de deploy: `where metadata ? 'cta_present'` recorta
// exatamente quem recebeu o bundle com o link, sem depender de relogio nenhum.
// E ele NAO e hardcode — sai do proprio NOTICES pelo ramo classificado, entao
// mover o CTA de ramo (ou tira-lo) muda o carimbo junto, e o evento nunca passa
// a mentir sozinho.
export function instructionPasteNoticeMetadata(shape?: InstructionPasteShape) {
  const resolved: InstructionPasteShape = shape ?? 'labeled_script'
  return {
    version: INSTRUCTION_PASTE_NOTICE_VERSION,
    reason: 'prompt_looks_like_instruction',
    surface: 'generate_idea',
    // Sem isto o evento nao distingue os dois ramos e a proxima sessao mede a
    // mesma coisa que eu medi hoje: um numero so, para dois defeitos.
    paste_shape: resolved,
    cta_present: Boolean(instructionPasteNoticeFor(resolved).ctaHref),
  } as const
}

// ─────────────────────────────────────────────────────────────────────────────
// KINEO-ORDEM-NARRADA-2026-09-07 — a frase que o narrador vai dizer.
// ─────────────────────────────────────────────────────────────────────────────
// Medido no banco (14 dias, status=completed, contas com user_id): 7 pessoas
// colaram a ORDEM que mandaram ao ChatGPT ("Create a 30-second vertical
// YouTube Short in English. Topic: ...", "IMPORTANT: This is a completely
// visual story. NO narration, NO voiceover...") com "Use my script as is", e
// o produto NARROU a ordem em voz alta e cobrou credito por isso. So 3 das 7
// viram o aviso acima — e as 3 mandaram verbatim mesmo assim. A copy explica;
// nao convence. O que convence e ler a propria frase: por isso o aviso passa
// a mostrar, entre aspas, a PRIMEIRA linha do texto — e o que o filme vai
// abrir dizendo. Texto puro, cortado em VERBATIM_OPENING_MAX_CHARS.
// O classificador acima so reconhece 4 dos 8 casos (verbo de ordem na 1a
// linha); esta frase vale para todos, entao ela NAO depende dele.
export const VERBATIM_OPENING_MAX_CHARS = 120

/**
 * Primeira linha nao vazia do texto, aparada e cortada com reticencias. E o
 * que o narrador vai falar primeiro em "Use my script as is". Devolve '' se
 * nao ha texto. Nunca devolve HTML: e para ir dentro de aspas, como texto.
 */
export function verbatimOpeningLine(raw: string | null | undefined, max = VERBATIM_OPENING_MAX_CHARS): string {
  if (typeof raw !== 'string') return ''
  const first = raw.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? ''
  if (first.length <= max) return first
  return first.slice(0, Math.max(1, max - 1)).trimEnd() + '…'
}

export function instructionPromptLengthBand(length: number) {
  if (!Number.isFinite(length) || length < 0) return 'unknown'
  if (length < 300) return 'under_300'
  if (length < 700) return '300_699'
  if (length < 1000) return '700_999'
  if (length === 1000) return '1000'
  return 'over_1000'
}
