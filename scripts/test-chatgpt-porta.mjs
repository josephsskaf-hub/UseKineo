// ═══ KINEO-PORTA-CHATGPT-2026-09-07 ═════════════════════════════════════════
// A pagina /chatgpt (prompt da casa → roteiro colado de volta → /go/<token> →
// Studio preenchido) subiu SEM porta em superficie nenhuma. Medido no banco
// de producao (7d, pessoas distintas) antes de ligar:
//   · video_ready_email_sent (e-mail de filme pronto) ........ 120
//   · pasted_directives_detected (ordem de chatbot no Studio) . 21 em 3 dias
//   · season_shown (faixa de temporada) ...................... 2  ← morta
// Duas portas, nesta ordem: (A) o aviso de "instrucao colada" no Studio, so no
// ramo `command_to_chatbot`; (B) um bloco no e-mail de filme pronto. Nenhuma
// na faixa de temporada.
//
// O PRINCIPIO que este guardiao protege: a porta esta amarrada a CONDICAO que
// decide (ramo `command_to_chatbot`, gate `showInstructionPasteNotice`, motivo
// `prompt_looks_like_instruction`), o link e /chatgpt com o utm da porta, o
// clique tem evento proprio, o e-mail monta o link pelo MESMO helper do link de
// historico (utm_source=lifecycle, o unico que emailReturnDoor reconhece), e
// o bloco do e-mail e incondicional. Um mutante que troque o href, remova o
// utm, mova o CTA para o outro ramo ou renomeie o evento fica VERMELHO aqui.
//
// ESTILO: `readFileSync` sobre os arquivos REAIS. Nunca `import` com alias `@/`
// — 72 testes de scripts/ morrem no import antes da primeira verificacao.
// Rode: node scripts/test-chatgpt-porta.mjs
import { readFileSync } from 'node:fs'
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
let ok = 0, fail = 0
const check = (n, c) => { c ? (ok++, console.log('  ok  ' + n)) : (fail++, console.log('  FAIL ' + n)) }

const regra = src('lib/growth/instructionPasteNotice.ts')
const tela = src('app/(dashboard)/generate/GenerateClient.tsx')
const carta = src('app/api/cron/send-video-ready/route.ts')

// Recorta um bloco `{ … }` a partir da assinatura, casando chaves de verdade.
function bloco(texto, assinatura, desde = 0) {
  const ini = texto.indexOf(assinatura, desde)
  if (ini < 0) return ''
  const abre = texto.indexOf('{', ini)
  let prof = 0
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '{') prof++
    else if (texto[i] === '}') { prof--; if (prof === 0) return texto.slice(ini, i + 1) }
  }
  return ''
}
// Recorta um bloco `( … )` a partir da assinatura, casando parenteses.
function parens(texto, assinatura, desde = 0) {
  const ini = texto.indexOf(assinatura, desde)
  if (ini < 0) return ''
  const abre = texto.indexOf('(', ini + assinatura.length - 1)
  let prof = 0
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '(') prof++
    else if (texto[i] === ')') { prof--; if (prof === 0) return texto.slice(ini, i + 1) }
  }
  return ''
}
// Recorta um template literal `const nome = \`…\`` (do primeiro ` ao proximo `
// nao escapado). Os templates deste e-mail nao aninham crases.
function template(texto, nome) {
  const ini = texto.indexOf(`const ${nome} = \``)
  if (ini < 0) return ''
  const abre = texto.indexOf('`', ini)
  const fecha = texto.indexOf('`', abre + 1)
  return fecha < 0 ? '' : texto.slice(abre + 1, fecha)
}
const conta = (texto, s) => texto.split(s).length - 1

// ─────────────────────────────────────────────────────────────────────────────
console.log('1 · lib/growth/instructionPasteNotice.ts — o CTA existe, aponta para /chatgpt, e so no ramo da ORDEM')
const HREF = '/chatgpt?utm_source=paste_notice'
check('o arquivo continua PURO (sem import): e carregado por componente de cliente',
  !/^\s*import\s/m.test(regra) && !/from ['"](next\/|node:|fs|crypto|path)/.test(regra))
check(`exporta INSTRUCTION_PASTE_CTA_HREF = '${HREF}'`,
  regra.includes(`export const INSTRUCTION_PASTE_CTA_HREF = '${HREF}'`))
check('o href e a rota /chatgpt (nao outra pagina) com utm_source=paste_notice',
  (() => { const u = new URL(HREF, 'https://www.usekineo.com'); return u.pathname === '/chatgpt' && u.searchParams.get('utm_source') === 'paste_notice' })())
const tipoNotices = regra.slice(regra.indexOf('const NOTICES: Record<InstructionPasteShape,'), regra.indexOf('> = {', regra.indexOf('const NOTICES')))
check('o tipo de NOTICES declara ctaHref e ctaLabel OPCIONAIS (o outro ramo nao os tem)',
  /ctaHref\?: string/.test(tipoNotices) && /ctaLabel\?: string/.test(tipoNotices))
const ramoOrdem = bloco(regra, 'command_to_chatbot: {')
const ramoResposta = bloco(regra, 'labeled_script: {')
check('ramo command_to_chatbot existe', ramoOrdem.length > 0)
check('ramo labeled_script existe', ramoResposta.length > 0)
check('command_to_chatbot: ctaHref e a constante INSTRUCTION_PASTE_CTA_HREF',
  /ctaHref:\s*INSTRUCTION_PASTE_CTA_HREF\b/.test(ramoOrdem))
check('command_to_chatbot: ctaLabel nomeia ChatGPT E oferece o prompt',
  /ctaLabel:\s*'[^']*ChatGPT[^']*prompt[^']*'/.test(ramoOrdem))
check('labeled_script: SEM ctaHref (quem colou a resposta ja tem o roteiro)',
  !/ctaHref/.test(ramoResposta) && !/ctaLabel/.test(ramoResposta))
check('ctaHref aparece UMA vez em NOTICES (nao vazou para o outro ramo nem para fora)',
  conta(bloco(regra, '> = {', regra.indexOf('const NOTICES:')), 'ctaHref:') === 1)
check('instructionPasteNoticeFor continua devolvendo NOTICES[shape] (o CTA viaja com o ramo)',
  /export function instructionPasteNoticeFor\(shape: InstructionPasteShape\) \{\s*return NOTICES\[shape\] \?\? NOTICES\.labeled_script/.test(regra))
check('shouldShowInstructionPasteNotice segue amarrado a prompt_looks_like_instruction',
  /export function shouldShowInstructionPasteNotice\([^)]*\): boolean \{\s*return reason === 'prompt_looks_like_instruction'/.test(regra))
check('a constante INSTRUCTION_PASTE_NOTICE (compat) continua sendo o ramo labeled_script, sem CTA',
  regra.includes('export const INSTRUCTION_PASTE_NOTICE = NOTICES.labeled_script'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('2 · GenerateClient.tsx — o CTA e renderizado DENTRO do aviso, gated pela condicao real, com evento no clique')
const EVENTO = 'instruction_notice_cta_clicked'
const GATE = '{showInstructionPasteNotice && prompt.trim() && ('
const aviso = parens(tela, GATE)
check('o bloco do aviso existe e continua gated por showInstructionPasteNotice && prompt.trim()', aviso.length > 0)
check('o gate NAO virou `true` nem perdeu o estado', tela.includes(GATE) && !tela.includes('{true && prompt.trim() && ('))
check('o aviso ainda le title e body do ramo classificado',
  aviso.includes('instructionPasteNoticeFor(classifyInstructionPaste(prompt)).title') &&
  aviso.includes('instructionPasteNoticeFor(classifyInstructionPaste(prompt)).body'))
check('o CTA so renderiza quando o ramo tem ctaHref (condicional, nao incondicional)',
  aviso.includes('instructionPasteNoticeFor(classifyInstructionPaste(prompt)).ctaHref && ('))
check('o <a> usa o ctaHref do ramo como href (nao um literal digitado na tela)',
  /href=\{instructionPasteNoticeFor\(classifyInstructionPaste\(prompt\)\)\.ctaHref\}/.test(aviso))
check('nenhum literal /chatgpt digitado na tela — a rota vem da regra',
  !aviso.includes("'/chatgpt") && !aviso.includes('"/chatgpt'))
check('o <a> mostra o ctaLabel do ramo',
  aviso.includes('instructionPasteNoticeFor(classifyInstructionPaste(prompt)).ctaLabel'))
check('abre em aba nova (a ideia colada fica no Studio) com rel seguro',
  aviso.includes('target="_blank"') && aviso.includes('rel="noopener noreferrer"'))
const clique = bloco(aviso, 'onClick={() =>')
check(`o clique emite trackEvent('${EVENTO}')`, clique.includes(`trackEvent('${EVENTO}'`))
check('o evento leva a metadata categorica do aviso (version/reason/surface/paste_shape)',
  clique.includes('...instructionPasteNoticeMetadata(classifyInstructionPaste(prompt))'))
check('o evento leva o href e a faixa de tamanho, nunca o texto do cliente',
  clique.includes('href: instructionPasteNoticeFor(classifyInstructionPaste(prompt)).ctaHref') &&
  clique.includes('prompt_length_band: instructionPromptLengthBand(prompt.length)') &&
  !/\bprompt,/.test(clique) && !/prompt:\s*prompt/.test(clique))
check('o evento so existe DENTRO do bloco do aviso (nao vazou para outro lugar da tela)',
  conta(tela, `'${EVENTO}'`) === 1 && conta(aviso, `'${EVENTO}'`) === 1)
check('trackEvent e o da casa (@/lib/analytics), ja importado',
  /import \{[^}]*\btrackEvent\b[^}]*\} from '@\/lib\/analytics'/.test(tela))
check('instructionPromptLengthBand e instructionPasteNoticeMetadata vem de @/lib/growth/instructionPasteNotice',
  /import \{[^}]*\binstructionPromptLengthBand\b[^}]*\} from '@\/lib\/growth\/instructionPasteNotice'/s.test(tela) &&
  /import \{[^}]*\binstructionPasteNoticeMetadata\b[^}]*\} from '@\/lib\/growth\/instructionPasteNotice'/s.test(tela))
// A condicao que ARMA o aviso: so o motivo prompt_looks_like_instruction liga o estado.
const guarda = bloco(tela, 'if (looksLikeInstruction(explicitPrompt)) {')
check('setShowInstructionPasteNotice(true) so acontece sob shouldShowInstructionPasteNotice(\'prompt_looks_like_instruction\')',
  guarda.includes("if (shouldShowInstructionPasteNotice('prompt_looks_like_instruction')) {") &&
  bloco(guarda, "if (shouldShowInstructionPasteNotice('prompt_looks_like_instruction')) {").includes('setShowInstructionPasteNotice(true)') &&
  conta(tela, 'setShowInstructionPasteNotice(true)') === 1)

// ─────────────────────────────────────────────────────────────────────────────
console.log('3 · send-video-ready/route.ts — a porta no e-mail sai do MESMO montador de link, com o utm da casa, e e incondicional')
const CAMPANHA = 'video_ready_chatgpt'
const helper = bloco(carta, 'function lifecycleUrl(')
check('existe UM montador de link lifecycleUrl(path, campaign)', helper.length > 0)
// Executa o montador DE VERDADE (tipos removidos) e le a URL produzida.
let montada = null
try {
  const js = helper.replace(/\(path: string, campaign: string\): string/, '(path, campaign)')
  const fn = new Function('APP_URL', `${js}; return lifecycleUrl`)('https://www.usekineo.com')
  montada = new URL(fn('/chatgpt', CAMPANHA))
} catch { montada = null }
check('lifecycleUrl executa e produz URL valida', montada !== null)
check('…com pathname /chatgpt', montada?.pathname === '/chatgpt')
check('…com utm_source=lifecycle (o unico que emailReturnDoor reconhece como e-mail nosso)', montada?.searchParams.get('utm_source') === 'lifecycle')
check('…com utm_medium=email', montada?.searchParams.get('utm_medium') === 'email')
check(`…com utm_campaign=${CAMPANHA}`, montada?.searchParams.get('utm_campaign') === CAMPANHA)
check(`CHATGPT_DOOR_CAMPAIGN = '${CAMPANHA}'`, carta.includes(`const CHATGPT_DOOR_CAMPAIGN = '${CAMPANHA}'`))
check('o link de historico (o antigo) tambem passa pelo helper — nenhum segundo padrao de UTM digitado',
  /const url = lifecycleUrl\('\/history', `video_ready\$\{ctx\.sawIt \? '_seen' : ''\}`\)/.test(carta) &&
  conta(carta, 'utm_source=lifecycle&utm_medium=email&utm_campaign=') === 1)
check("chatgptUrl = lifecycleUrl('/chatgpt', CHATGPT_DOOR_CAMPAIGN)",
  carta.includes("const chatgptUrl = lifecycleUrl('/chatgpt', CHATGPT_DOOR_CAMPAIGN)"))
check('nenhum /chatgpt digitado fora do helper (sem link cru em template nenhum)',
  (() => {
    // Fora de comentarios, a UNICA ocorrencia de "/chatgpt" em codigo e o
    // argumento do lifecycleUrl — nem no html, nem no text, nem num literal solto.
    const semComentarios = carta.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    return conta(semComentarios, '/chatgpt') === 1 && conta(semComentarios, "lifecycleUrl('/chatgpt'") === 1
  })())
const html = template(carta, 'html')
const texto = template(carta, 'text')
const blocoHtml = template(carta, 'chatgptHtml')
const blocoTexto = template(carta, 'chatgptText')
check('o bloco HTML existe e carrega href="${chatgptUrl}"', blocoHtml.includes('href="${chatgptUrl}"'))
check('o bloco de texto existe e carrega ${chatgptUrl}', blocoTexto.includes('${chatgptUrl}'))
check('a copy nomeia ChatGPT, Claude e Gemini e pede o roteiro DE VOLTA (paste)',
  /ChatGPT/.test(blocoHtml) && /Claude/.test(blocoHtml) && /Gemini/.test(blocoHtml) && /paste/i.test(blocoHtml) &&
  /ChatGPT/.test(blocoTexto) && /Claude/.test(blocoTexto) && /Gemini/.test(blocoTexto) && /paste/i.test(blocoTexto))
check('o template html injeta ${chatgptHtml} (o bloco chega ao e-mail)', html.includes('${chatgptHtml}'))
check('o template text injeta ${chatgptText}', texto.includes('${chatgptText}'))
check('o bloco e INCONDICIONAL: chatgptHtml/chatgptText nao dependem de ctx.sawIt, pack ou shareHref',
  !/const chatgptHtml = (ctx|pk|shareHref|video)/.test(carta) && !/const chatgptText = (ctx|pk|shareHref|video)/.test(carta) &&
  /const chatgptHtml = `/.test(carta) && /const chatgptText = `/.test(carta))
check('nenhum preco digitado no bloco (fatos publicos so de lib/kineoFacts/checkoutPricing)',
  !/\$\s?\d/.test(blocoHtml) && !/\$\s?\d/.test(blocoTexto) && !/credit/i.test(blocoHtml))
check('o assunto NAO mudou (os tres ramos de subject de antes continuam)',
  carta.includes("'Your video is ready 🎬'") && carta.includes("'Your film is saved — MP4 inside'") &&
  carta.includes('is saved — MP4 inside`'))
check('nenhum envio, insert ou fetch novo nasceu com a porta (2 fetch: resend + freshFetch import; inserts como antes)',
  conta(carta, 'await fetch(') === 1 && conta(carta, ".from('events').insert(") === 2)
check('quem recebe e a cadencia nao mudaram (READY_EMAIL_GAP_MS, MIN/MAX_AGE, gate de lifecycle intactos)',
  carta.includes('const READY_EMAIL_GAP_MS = 6 * 60 * 60 * 1000') &&
  carta.includes('const MIN_AGE_MS = 30 * 60 * 1000') &&
  carta.includes('const MAX_AGE_MS = 24 * 60 * 60 * 1000') &&
  carta.includes("process.env.KINEO_LIFECYCLE_EMAILS_ENABLED === 'true'"))

// ─────────────────────────────────────────────────────────────────────────────
console.log('4 · a faixa de temporada NAO ganhou porta (2 pessoas/7d — superficie morta)')
const faixa = src('components/video/SeasonStrip.tsx')
check('SeasonStrip.tsx nao aponta para /chatgpt', !faixa.includes('/chatgpt'))

console.log(`\n${ok} ok / ${fail} falhas`)
process.exit(fail ? 1 : 0)
