// ═══ KINEO-ROTEIRO-COLADO-NAO-ENGORDA-2026-09-18 — roteiro colado pela pessoa nunca é engordado ═══
//
// MEDIDO (18/09, painel de coerência, notas 50/55): a pessoa colou um DIÁLOGO de ~30 palavras em hindi
// ("मोटू: 'चुटकी, भीम घर पर है क्या?'" …) e pediu 60 s. O escritor tinha um piso de ~150 palavras para 60 s e
// encheu o roteiro de enrolação ("cada parede conta sua própria história única e interessante…"). O juiz deu
// texto 60/70: a narração deixou de ser o que a pessoa escreveu. Fundador: "Vai … no não engordar roteiro colado".
//
// REGRA: se o texto JÁ É um roteiro (≥ PASTED_MIN_WORDS palavras, ou ≥ 2 linhas de diálogo "Nome: fala"), o
// escritor só ESTRUTURA — não inventa fato, não descreve cenário, não acrescenta frase. O alvo de palavras passa
// a ser a contagem da própria pessoa (piso = 90% dela), e a duração do filme segue as palavras, não o seletor.
// Ideia curta (1-2 linhas) continua ganhando o roteiro completo de sempre.

import { narrationTokens } from '@/lib/textLanguage' // KINEO-IDIOMAS-FORMATOS-2410
import { looksLikeBrief } from '@/lib/scriptParser' // KINEO-BRIEF-NAO-E-FALA-3010
export const PASTED_SCRIPT_MIN_WORDS = 45
export const PASTED_SCRIPT_VERSION = 'pasted_script_no_padding_v1'

const DIALOGUE_LINE = /^\s*[^\n:：]{1,40}[:：]\s*\S/

export interface PastedScriptDecision {
  pasted: boolean
  words: number
  dialogueLines: number
  reason: 'short_idea' | 'long_prose' | 'dialogue' | 'production_brief' | 'scene_description' // KINEO-BRIEF-NAO-E-FALA-3010 · KINEO-NARRADOR-DESCRICAO-0111
  version: typeof PASTED_SCRIPT_VERSION
}

export function countSpokenWords(text: string): number {
  return narrationTokens((text ?? '').replace(/\[[^\]]*\]/g, ' ')).filter((w) => /[\p{L}\p{N}]/u.test(w)).length // KINEO-IDIOMAS-FORMATOS-2410
}

export function detectPastedScript(text: string): PastedScriptDecision {
  const version = PASTED_SCRIPT_VERSION
  const t = (text ?? '').trim()
  const words = countSpokenWords(t)
  const dialogueLines = t.split(/\n+/).filter((l) => DIALOGUE_LINE.test(l)).length
  if (isProductionBrief(t)) return { pasted: false, words, dialogueLines, reason: 'production_brief', version } // KINEO-BRIEF-NAO-E-FALA-3010
  if (isSceneDescription(t)) return { pasted: false, words, dialogueLines, reason: 'scene_description', version } // KINEO-NARRADOR-DESCRICAO-0111 — descrição do que VER vira ideia do escritor, nunca roteiro colado
  if (dialogueLines >= 2) return { pasted: true, words, dialogueLines, reason: 'dialogue', version }
  if (words >= PASTED_SCRIPT_MIN_WORDS) return { pasted: true, words, dialogueLines, reason: 'long_prose', version }
  return { pasted: false, words, dialogueLines, reason: 'short_idea', version }
}

/** Piso de palavras quando o roteiro é colado: 90% do que a pessoa escreveu, nunca o piso da duração. */
export function pastedScriptMinWords(words: number): number {
  return Math.max(1, Math.floor(words * 0.9))
}

/** Instrução extra ao escritor: estruturar sem engordar. */
export const PASTED_SCRIPT_RULE =
  'THE USER PASTED THEIR OWN SCRIPT. Keep their sentences, facts and dialogue lines as written (translate nothing, invent nothing). ' +
  'Do NOT add facts, descriptions, filler, transitions or new lines. You may only split it into the sections, add the [Pexels: …] footage cues, ' +
  'and trim the section headers. The total spoken words must stay within 10% of the user’s own word count. ' +
  'If it is a dialogue, keep the speaker names as spoken labels ("Motu: …").'

// KINEO-BRIEF-NAO-E-FALA-3010 [TRAVA 8.2 — vai do fundador 30/10 "estão todos autorizados"] — revisor 29/10: o narrador LEU o
// pedido ("Animais fofinhos em 3D… música infantil animada toca enquanto as cores brilham"). O texto era um PEDIDO DE PRODUÇÃO
// copiado do ChatGPT ("Calma, calma, aqui está prontinho pra você copiar: Crie um vídeo infantil… 9:16…"): o preâmbulo do chat
// escondia o "Crie um vídeo" do looksLikeBrief, e as 76 palavras viravam "roteiro colado" (mantenha as frases da pessoa).
/** Preâmbulo de chatbot antes do pedido ("Calma, aqui está prontinho pra você copiar:", "Sure! Here's your prompt:"). */
const PREAMBULO_DE_CHAT = /^[^\n:]{0,140}?\b(?:aqui est[áa]|segue|prontinho|copiar|copie|here(?:['’]s| is| you go)|sure|certainly|of course|claro|aqu[ií] (?:tienes|est[áa])|listo|voil[àa])\b[^\n:]{0,80}:\s*/i
export function semPreambuloDeChat(text: string): string {
  const t = String(text ?? '').trim()
  const sem = t.replace(PREAMBULO_DE_CHAT, '').trim()
  return sem.length >= 20 ? sem : t
}
/** O texto é um pedido de produção ("Crie um vídeo… mostre… 9:16"), mesmo atrás de um preâmbulo de chatbot. */
export function isProductionBrief(text: string): boolean {
  const t = String(text ?? '').trim()
  if (!t) return false
  return looksLikeBrief(t) || looksLikeBrief(semPreambuloDeChat(t))
}
/** Instrução extra ao escritor quando o texto é pedido de produção: inventar a história que o pedido quer, nunca narrar o pedido. */
export const PRODUCTION_BRIEF_RULE =
  'THE USER WROTE A PRODUCTION REQUEST, NOT NARRATION. Invent ONE concrete story that fulfils it: named characters, a place, events in order and the ending it asks for. ' +
  'Never narrate the request itself: no format, duration, platform, aspect ratio, music, colours, animation style, quality, "the video/the story will…" or "with funny expressions" sentences. ' +
  'Every spoken line must be something that happens or is said inside the story, in the language the request asks for.'

// ═══ KINEO-NARRADOR-DESCRICAO-0111 [TRAVA 8.2 — vai do fundador 01/11] — DESCRIÇÃO DE IMAGEM NÃO É NARRAÇÃO ═══
// Revisor 31/10 (Kling 4 grátis, PRIMEIRO filme da pessoa, nota 5): ela digitou o que queria VER — "A child skillfully and
// enthusiastically crafts a colorful 3D car, surrounded by their vibrant creations. The table showcases an impressive 3D
// dinosaur and a charming house…". O escritor (regra FIDELITY: "texto que já conta história é mantido") leu aquilo como
// história pronta, devolveu as duas frases quase iguais + uma de enchimento, o narrador as leu palavra por palavra e a criança
// nunca apareceu. O KINEO-BRIEF-NAO-E-FALA-3010 só pega o pedido em forma de ORDEM ("Crie um vídeo… mostre…"); a descrição
// em 3ª pessoa no presente ("Uma criança monta…, cercada por…") passava por fora.
// REGRA: pontuação conservadora com sinais claros. Positivos — abertura de plano ("Close-up of…"), vocabulário de câmera/render
// (cinematic, 4k, lighting, depth of field, atmosphere…), verbos de composição de quadro (surrounded by, showcases, featuring,
// in the background, cercado por, rodeado de…), adjetivos de enfeite (vibrant, charming, colorido, encantador…) e lista de
// etiquetas separadas por vírgula. Negativos — ano/número de fato, passado narrativo, "você/imagine/?/!", 1ª pessoa, conectivos
// de história e comparação de fato. Só é descrição com nota ≥ 5 E pelo menos um sinal FORTE (câmera, composição ou abertura de
// plano): adjetivo bonito sozinho nunca transforma narração em descrição. Roteiro marcado (HOOK/PAYOFF), diálogo e texto longo
// (> 120 palavras) nunca são descrição. Vale só no modo IA (o escritor): "Use my script as is" continua lido como está.
export const DESCRICAO_DE_CENA_VERSAO = 'scene_description_0111' // KINEO-NARRADOR-DESCRICAO-0111
const DESCRICAO_MAX_PALAVRAS = 120 // KINEO-NARRADOR-DESCRICAO-0111
const DESCRICAO_NOTA_MINIMA = 5 // KINEO-NARRADOR-DESCRICAO-0111
/** Palavra inteira com fronteira Unicode (o \b do JS não enxerga "você", "ação", "año"). */
const palavra = (alts: string): RegExp => new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts})(?![\\p{L}\\p{N}])`, 'giu') // KINEO-NARRADOR-DESCRICAO-0111
/** Abertura de plano/imagem: "Close-up of…", "Wide shot of…", "A photo of…", "Plano aberto de…", "Primer plano de…". */
const ABERTURA_DE_PLANO = new RegExp('^(?:(?:an?|the)\\s+)?(?:(?:(?:extreme\\s+)?close[\\s-]?up|wide|medium|aerial|drone|overhead|tracking|establishing|cinematic|low[\\s-]angle|high[\\s-]angle|top[\\s-]down)\\s+)?(?:shot|view|photo(?:graph)?|image|picture|portrait|illustration|render(?:ing)?|painting|still|frame)\\s+(?:of|showing)\\s' + // KINEO-NARRADOR-DESCRICAO-0111
  '|^(?:extreme\\s+)?close[\\s-]?up\\b|^(?:aerial|top[\\s-]down) view\\b' +
  '|^(?:(?:um|uma|o|a)\\s+)?(?:close|plano (?:aberto|fechado|geral|médio|medio|detalhe)|vista a[ée]rea|foto(?:grafia)?|imagem|ilustra[çc][ãa]o|retrato)\\s+(?:de|do|da|mostrando)\\s' +
  '|^(?:(?:un|una|el|la)\\s+)?(?:primer plano|plano (?:general|medio|abierto|detalle)|toma a[ée]rea|vista a[ée]rea|foto(?:graf[íi]a)?|imagen|ilustraci[óo]n|retrato)\\s+(?:de|del|mostrando)\\s', 'iu')
/** Vocabulário de câmera/render/luz — ninguém narra "shallow depth of field" num documentário. */
const VOCAB_CAMERA = palavra('cinematic|close[\\s-]?up|wide[\\s-]angle|wide shot|aerial (?:view|shot)|drone shot|bokeh|depth of field|soft (?:light|lighting|focus)|golden hour|lighting|volumetric|backlit|warm (?:light|glow)|atmosphere|ambien(?:ce|t light)|aesthetic|hyper[\\s-]?realistic|photo[\\s-]?realistic|ultra[\\s-]?(?:detailed|realistic|hd)|highly detailed|intricate details?|octane render|unreal engine|3d render|digital art|concept art|artstation|[248]k|hdr' + // KINEO-NARRADOR-DESCRICAO-0111
  '|luz suave|luz quente|ilumina[çc][ãa]o|cinematogr[áa]fic[oa]|atmosfera|desfoque|profundidade de campo|hiper[\\s-]?realista|fotorrealista|iluminaci[óo]n|luz c[áa]lida|desenfoque|profundidad de campo')
/** Verbos/locuções que COMPÕEM o quadro (o que está onde), não contam acontecimento. */
const VOCAB_COMPOSICAO = palavra('surrounded by|showcas(?:es|ing)|featuring|depicting|adorned with|framed by|bathed in|illuminated by|lit by|set against|against a (?:backdrop|background)|in the (?:background|foreground)|filled with|dotted with|can be seen|is seen' + // KINEO-NARRADOR-DESCRICAO-0111
  '|cercad[oa]s? (?:por|de)|rodead[oa]s? (?:por|de)|ao fundo|em primeiro plano|banhad[oa]s? (?:em|de|por)|iluminad[oa]s? (?:por|pela|pelo)|exib(?:e|indo)|repleto de|al fondo|en primer plano|bañad[oa]s? (?:en|de|por)|exhib(?:e|iendo)')
/** Adjetivos/advérbios de enfeite típicos de prompt de imagem. */
const VOCAB_ENFEITE = palavra('vibrant|colou?rful|charming|impressive|stunning|beautiful|gorgeous|cozy|cosy|whimsical|magical|enchanting|lush|serene|breathtaking|adorable|cute|ornate|gleaming|sparkling|glowing|shimmering|picturesque|dreamy|ethereal|vivid|imaginative|playful|joyful|cheerful|skillfully|enthusiastically|delicately|gracefully|intricate|elegant|radiant' + // KINEO-NARRADOR-DESCRICAO-0111
  '|vibrantes?|colorid[oa]s?|encantador(?:a|es|as)?|impressionante|charmos[oa]s?|deslumbrante|aconchegante|m[áa]gic[oa]s?|lind[oa]s?|fof[oa]s?|sorridente|brilhantes?|reluzentes?|hermos[oa]s?|acogedor(?:a)?|preciosa?|feliz')
/** Ano ou número de fato ("1950", "44 passengers", "635 milhões") — "3D"/"4k"/"8k" não contam. */
const NUMERO_DE_FATO = palavra('1[0-9]{3}|20[0-9]{2}' + // KINEO-NARRADOR-DESCRICAO-0111
  '|\\d[\\d.,]*\\s*(?:%|percent|por cento|por ciento|million|billion|thousand|milh(?:ão|ões|oes)|bilh(?:ão|ões|oes)|mil|mill[oó]n(?:es)?|years?|anos?|a[ñn]os|days?|dias?|d[íi]as|km|kilometers?|quil[ôo]metros?|kil[óo]metros?|miles?|meters?|metros?|feet|people|pessoas|personas|passengers?|passageiros|pasajeros)' +
  '|(?:one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|billion|dois|tr[êe]s|cem|dos|tres|cien)\\s+(?:miles?|km|times|vezes|veces|years?|anos|a[ñn]os|percent|people|meters?|metros)')
/** Passado narrativo — descrição de imagem é presente; história e fato histórico vão no passado. */
const PASSADO_NARRATIVO = palavra('was|were|had|did|became|went|came|found|disappeared|vanished|died|discovered|happened|never|ago' + // KINEO-NARRADOR-DESCRICAO-0111
  '|foi|foram|era|eram|tinha|tinham|fez|desapareceu|morreu|descobriu|aconteceu|congelou|nunca|fue|fueron|ten[íi]a|hab[íi]a|desapareci[óo]|muri[óo]|descubri[óo]|ocurri[óo]|jam[áa]s')
/** Fala ao espectador: "você", "imagine", "did you know" (pergunta e exclamação contadas à parte). */
const FALA_AO_ESPECTADOR = palavra('you|your|imagine|did you know|voc[êe]s?|sabia que|t[úu]|usted|imagina|sab[íi]as que') // KINEO-NARRADOR-DESCRICAO-0111
const PRIMEIRA_PESSOA = palavra('i|we|my|our|me|us|eu|nós|meu|minha|nosso|nossa|yo|nosotros|nuestro|nuestra') // KINEO-NARRADOR-DESCRICAO-0111
const CONECTIVO_DE_HISTORIA = palavra('suddenly|then|until|one day|once upon a time|years later|because|but|after|before|when' + // KINEO-NARRADOR-DESCRICAO-0111
  '|de repente|ent[ãa]o|at[ée] que|um dia|era uma vez|anos depois|porque|mas|depois|antes|quando|entonces|hasta que|un d[íi]a|hab[íi]a una vez|a[ñn]os despu[ée]s|pero|despu[ée]s|cuando')
const COMPARACAO_DE_FATO = palavra('than|the (?:largest|biggest|smallest|oldest|deepest|longest|highest|fastest|most|only)|more than|times|do que|mais que|maior|menor|m[áa]s que|m[áa]s de|el m[áa]s|la m[áa]s|el [úu]nico|la [úu]nica') // KINEO-NARRADOR-DESCRICAO-0111
const conta = (re: RegExp, t: string): number => (t.match(re) ?? []).length // KINEO-NARRADOR-DESCRICAO-0111
/** O tema chega embrulhado pelo "Condense this whole story…:\n[…]" do escritor no servidor (lib/meta95/ideiaNoEscritor): avalia o miolo. */
export function semMolduraDoCondensar(text: string): string { // KINEO-NARRADOR-DESCRICAO-0111
  const m = /^Condense this whole story[^\n]*:\s*\n\[([\s\S]+)\]\s*$/.exec(String(text ?? '').trim())
  return m ? m[1].trim() : String(text ?? '').trim()
}
export interface NotaDaDescricao { descricao: boolean; nota: number; fortes: number; sinais: string[]; version: typeof DESCRICAO_DE_CENA_VERSAO } // KINEO-NARRADOR-DESCRICAO-0111
/** Pontua se o texto é uma DESCRIÇÃO do que deve ser VISTO (prompt de imagem), não uma narração. Pura, sem rede. */
export function notaDeDescricaoDeCena(text: string): NotaDaDescricao { // KINEO-NARRADOR-DESCRICAO-0111
  const version = DESCRICAO_DE_CENA_VERSAO
  const t = semMolduraDoCondensar(semPreambuloDeChat(String(text ?? ''))).trim()
  const nada = (sinal: string): NotaDaDescricao => ({ descricao: false, nota: 0, fortes: 0, sinais: [sinal], version })
  if (!t) return nada('vazio')
  const palavras = countSpokenWords(t)
  if (palavras < 6) return nada('curto_demais')
  if (palavras > DESCRICAO_MAX_PALAVRAS) return nada('longo_demais')
  if (/^\s*(?:HOOK|MICRO REWARD|ESCALATION|RHYTHM|PAYOFF)\b/im.test(t) || /\[\s*pexels\s*[:\-–]/i.test(t)) return nada('roteiro_marcado')
  if (t.split(/\n+/).filter((l) => DIALOGUE_LINE.test(l)).length >= 2) return nada('dialogo')
  const sinais: string[] = []
  let nota = 0
  let fortes = 0
  const somar = (nome: string, pontos: number, forte = false) => { if (!pontos) return; nota += pontos; if (forte && pontos > 0) fortes++; sinais.push(`${nome}${pontos > 0 ? '+' : ''}${pontos}`) }
  const primeiraFrase = (t.split(/(?<=[.!?])\s+|\n+/)[0] ?? '').trim()
  if (ABERTURA_DE_PLANO.test(primeiraFrase)) somar('abertura_de_plano', 3, true)
  else if (/^(?:an?|um|uma|un|una|two|three|several|dois|duas|tr[êe]s|dos|tres)\s+\p{L}/iu.test(primeiraFrase)) somar('abre_com_sujeito_indefinido', 1)
  somar('camera_render', Math.min(4, 2 * conta(VOCAB_CAMERA, t)), true)
  somar('composicao_do_quadro', Math.min(4, 2 * conta(VOCAB_COMPOSICAO, t)), true)
  somar('enfeite', Math.min(4, conta(VOCAB_ENFEITE, t)))
  // Etiquetas de prompt: ≥ 3 pedaços curtos (≤ 4 palavras) entre vírgulas ("neon lights, rain, 8k").
  const etiquetas = t.split(/[,;\n]/).map((p) => p.trim()).filter((p) => p && p.split(/\s+/).length <= 4).length
  if (etiquetas >= 3 && (t.match(/,/g) ?? []).length >= 3) somar('etiquetas_de_prompt', 2)
  somar('numero_de_fato', -Math.min(4, 3 * conta(NUMERO_DE_FATO, t)))
  somar('passado_narrativo', -Math.min(4, conta(PASSADO_NARRATIVO, t)))
  somar('fala_ao_espectador', -Math.min(4, 2 * (conta(FALA_AO_ESPECTADOR, t) + conta(/[?!¿¡]/g, t))))
  somar('primeira_pessoa', -Math.min(4, 2 * conta(PRIMEIRA_PESSOA, t)))
  somar('conectivo_de_historia', -Math.min(3, conta(CONECTIVO_DE_HISTORIA, t)))
  somar('comparacao_de_fato', -Math.min(2, conta(COMPARACAO_DE_FATO, t)))
  return { descricao: nota >= DESCRICAO_NOTA_MINIMA && fortes >= 1, nota, fortes, sinais, version }
}
/** O texto é a descrição de uma imagem/cena (o que a pessoa quer VER), não narração. */
export function isSceneDescription(text: string): boolean { // KINEO-NARRADOR-DESCRICAO-0111
  return notaDeDescricaoDeCena(text).descricao
}
/** Instrução extra ao escritor quando o texto é descrição de cena: história narrada SOBRE aquilo; a descrição vira a imagem. */
export const SCENE_DESCRIPTION_RULE = // KINEO-NARRADOR-DESCRICAO-0111
  'THE USER DESCRIBED A PICTURE — WHAT THE VIEWER SHOULD SEE — NOT NARRATION. Treat it as the IDEA and the VISUALS of the film, never as the spoken text. ' +
  'Write a real narrated story about that subject: give the main character a name, an age or a role, a goal or a small problem, events in order and a satisfying ending ' +
  '(for a child or a craft: what they are making, why it matters to them, the moment it works). ' +
  'NEVER read the description aloud: do not reuse its sentences or its decorative adjectives (vibrant, charming, impressive, colorful…), and never describe the picture ("the table showcases…", "surrounded by…"). ' +
  'The FIDELITY rule applies to the SUBJECT and the visual elements (same people, objects and setting), not to the wording. ' +
  'Every [Pexels: …] cue MUST show the described subject itself — the same person or character doing the described action with the described objects (e.g. "child building colorful toy car") — so the picture the user asked for is on screen in every beat.'
/** A pergunta ao escritor quando o texto é descrição de cena (o miolo, sem preâmbulo de chat nem a moldura do condensar). */
export function temaDaDescricao(text: string): string { // KINEO-NARRADOR-DESCRICAO-0111
  return 'This is a description of the picture the viewer should SEE (not narration). Write a narrated story about its subject and keep these visuals on screen:\n\n' + semMolduraDoCondensar(semPreambuloDeChat(String(text ?? '').trim()))
}
/**
 * O roteiro LEU a descrição em voz alta? Verdadeiro quando a narração (sem colchetes nem cabeçalhos) repete 6+ palavras
 * seguidas da descrição. Usado na regeneração de qualidade do /api/generate-script. [KINEO-NARRADOR-DESCRICAO-0111]
 */
export function leuADescricaoEmVozAlta(script: string, descricao: string): boolean { // KINEO-NARRADOR-DESCRICAO-0111
  const norm = (s: string): string[] => String(s ?? '').replace(/\[[^\]]*\]/g, ' ').replace(/^\s*(?:HOOK|MICRO REWARD(?:\s*\d)?|ESCALATION|RHYTHM|PAYOFF)\b[^:\n]*:/gim, ' ')
    .toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  const d = norm(semMolduraDoCondensar(semPreambuloDeChat(descricao)))
  const fala = ' ' + norm(script).join(' ') + ' '
  const N = 6
  for (let i = 0; i + N <= d.length; i++) if (fala.includes(' ' + d.slice(i, i + N).join(' ') + ' ')) return true
  return false
}
