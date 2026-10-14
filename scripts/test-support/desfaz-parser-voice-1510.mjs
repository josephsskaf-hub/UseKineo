// KINEO-PARSER-VOICE-1510 — DESFAZ, em memória, o conserto do parser de roteiro (lib/scriptParser.ts) que parou de apagar
// a linha de fala rotulada com "voice"/"eyes"/"color"… ("PAYOFF: [Pexels: x] Her voice was gone."), para os guardiões que
// conferem lib/scriptParser.ts BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Toda linha que o conserto tocou carrega a marca KINEO-PARSER-VOICE-1510. Duas formas, e só elas:
//   · TROCA — a linha da base foi reescrita: a linha nova é reconhecida pelo PREFIXO exato e volta a ser a linha da base;
//   · ACRÉSCIMO — a linha não existia: reconhecida pelo prefixo exato e removida.
// Linha marcada que não casa com nenhum prefixo = lança (o guardião fica vermelho). Cada prefixo vale UMA vez por texto, e
// havendo QUALQUER linha marcada, TODAS as entradas têm de aparecer (conserto pela metade também lança).
// scripts/test-parser-voice-1510.mjs prova que, desfeito isto, o arquivo é EXATAMENTE a base (origin/main 5980f218).
export const MARCA_PARSER_VOICE_1510 = 'KINEO-PARSER-VOICE-1510'
export const ARQUIVO_PARSER_VOICE_1510 = 'lib/scriptParser.ts'

const TROCAS = [
  ['    if (roteiroDeCinema && ((isInstructionLine(linha) && !instructionOnlyByAmbiguousNoun(linha)) || isCharacterSheetLine(linha))) continue // KINEO-PARSER-VOICE-1510',
    '    if (roteiroDeCinema && (isInstructionLine(linha) || isCharacterSheetLine(linha))) continue'],
]

const ACRESCIMOS = [
  'const NARRATIVE_SENTENCE_CUE = /\\b(was|were|had|did|said|never|became|remained|gone|died|lost|vanished|disappeared)\\b/i // KINEO-PARSER-VOICE-1510',
  '  if (NARRATIVE_SENTENCE_CUE.test(resto)) return false // KINEO-PARSER-VOICE-1510',
  'const BEAT_LABEL_HEAD = /^(?:HOOK|GANCHO|INTRO|OUTRO|CTA|PAYOFF|PAGAMENTO|ESCALATION|ESCALADA|RHYTHM|RITMO|MICRO\\s+(?:REWARD|RECOMPENSA)(?:\\s*\\d+)?|BEAT(?:\\s*\\d+)?|SCENE(?:\\s*\\d+)?|CENA(?:\\s*\\d+)?|FACT(?:\\s*\\d+)?|FATO(?:\\s*\\d+)?|PART(?:\\s*\\d+)?|STEP(?:\\s*\\d+)?)\\s*(?:\\([^)]*\\))?\\s*[:：]/i // KINEO-PARSER-VOICE-1510',
  'const AMBIGUOUS_DELIVERABLE_NOUN = /\\b(voz|voice|ses|cenas?|scenes?|sahne)\\b/gi // KINEO-PARSER-VOICE-1510',
  '/** KINEO-PARSER-VOICE-1510 — a linha só é "instrução" porque fala de voz/cena',
  'function instructionOnlyByAmbiguousNoun(line: string): boolean { // KINEO-PARSER-VOICE-1510',
  '  const u = unwrapLabelHead(line) // KINEO-PARSER-VOICE-1510',
  '  if (!u || MIDLINE_STAGE_LABEL.test(u)) return false // KINEO-PARSER-VOICE-1510',
  "  return !DELIVERABLE_NOUN.test(u.replace(AMBIGUOUS_DELIVERABLE_NOUN, ' ')) // KINEO-PARSER-VOICE-1510",
  '} // KINEO-PARSER-VOICE-1510',
  '  if (BEAT_LABEL_HEAD.test(u)) return false // KINEO-PARSER-VOICE-1510',
]

/** Quantas entradas o conserto tem (trocas, acréscimos) — o guardião confere contra o diff real. */
export const FORMA_PARSER_VOICE_1510 = { trocas: TROCAS.length, acrescimos: ACRESCIMOS.length }

/** O texto de lib/scriptParser.ts de ANTES deste conserto. Preserva CRLF se o texto vier com CRLF. Idempotente: sem nada
 *  marcado, devolve o texto igual. */
export function semParserVoice1510(s) {
  const bruto = String(s)
  const crlf = bruto.includes('\r\n')
  const texto = crlf ? bruto.replace(/\r\n/g, '\n') : bruto
  const usadas = new Set()
  const out = []
  let marcadas = 0
  for (const l of texto.split('\n')) {
    if (!l.includes(MARCA_PARSER_VOICE_1510)) { out.push(l); continue }
    marcadas++
    const t = TROCAS.findIndex(([novo]) => l.startsWith(novo))
    if (t >= 0) {
      if (usadas.has('t' + t)) throw new Error('desfaz-parser-voice-1510: troca repetida: ' + l.slice(0, 120))
      usadas.add('t' + t)
      out.push(TROCAS[t][1])
      continue
    }
    const a = ACRESCIMOS.findIndex((p) => l.startsWith(p))
    if (a >= 0) {
      if (usadas.has('a' + a)) throw new Error('desfaz-parser-voice-1510: acréscimo repetido: ' + l.slice(0, 120))
      usadas.add('a' + a)
      continue
    }
    throw new Error('desfaz-parser-voice-1510: linha marcada inesperada: ' + l.slice(0, 120))
  }
  if (marcadas > 0 && usadas.size !== TROCAS.length + ACRESCIMOS.length) {
    throw new Error(`desfaz-parser-voice-1510: forma inesperada (${usadas.size} de ${TROCAS.length + ACRESCIMOS.length} entradas)`)
  }
  const t = out.join('\n')
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/** Forma (caminho, texto) dos guardiões byte a byte: só mexe em lib/scriptParser.ts; null/undefined passam direto. */
export function desfazParserVoice1510(p, s) {
  if (s == null || p !== ARQUIVO_PARSER_VOICE_1510) return s
  return semParserVoice1510(s)
}

/** Linha do diff que pertence a este conserto (para guardiões que leem o `git diff` e só aceitam acréscimos). */
export function linhaDoParserVoice1510(linha) {
  return String(linha ?? '').includes(MARCA_PARSER_VOICE_1510)
}
