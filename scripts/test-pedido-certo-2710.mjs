// [TRAVA 8.2 — vai do fundador 27/10 "faz todos esses consertos de 1 a 6"] KINEO-PEDIDO-CERTO-2710 — guardião.
// KINEO-PEDIDO-CERTO-2710 — o tema gravado num filme é o pedido DAQUELE filme, nunca um exemplo da casa.
// Caso real (27/10 ~17:50 UTC, a8a74417, chatgpt.com, Nigéria, filme grátis de 15 s): roteiro de UM parágrafo terminando em
// "vertical 9:16 format." → a prévia limpa apagava a linha (= o roteiro inteiro) → caixa vazia → tema do despacho '' (claim do
// compose com topic null) → ao voltar para a aba o histórico recarregou e o pré-preenchimento de primeira visita escreveu
// "5 morning habits Jeff Bezos…" no meio do render → o polling mandou a caixa viva como ?topic= → videos.topic/title = Bezos e a
// temporada saiu sobre Elon Musk num filme de terror do Ethan Cole.
//   A. régua pura (lib/pedidoCerto.ts) com os TEXTOS REAIS do caso;
//   B. a tela: prévia delega à régua, fotografia do despacho = texto enviado, polling usa a fotografia, pré-preenchimento decide 1×;
//   C. os servidores: compose/status escolhe claim > pedido assinado > aba, conferidos contra a fala (persistCompletedVideo REAL
//      executado); e-mail/pacote usam o tema escolhido; a temporada confere contra a fala;
//   D. mutantes: cada conserto desfeito deixa a regra certa vermelha.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

function roda(src) {
  const exports = {}
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: () => { throw new Error('import inesperado') }, String, Set, Array, Number, Math, JSON }, { filename: 'pedidoCerto.ts' })
  return exports
}

// ── os textos REAIS do caso (cinematic_submission_claim.response.prompt e videos.script de 9b0fbcf3) ──
const PEDIDO = 'A 24-year-old man named Ethan Cole stands alone in his modern American house at midnight. He suddenly hears three slow knocks coming from his front door. He checks the time: 3:00 AM. He approaches the door cautiously and looks through the peephole, but nobody is there. As he turns away, his phone receives a message from an unknown number: "Don\'t open the door. I\'m standing behind you." Ethan slowly turns around, his face filled with fear. The hallway behind him is completely dark. Cinematic psychological horror, realistic acting, suspenseful atmosphere, dramatic lighting, eerie sound effects, photorealistic visuals, vertical 9:16 format.'
const FALA = 'Ethan Cole finds himself standing alone in his modern house at midnight, feeling deeply uneasy. He hears three slow, deliberate knocks and checks the peephole, but finds nobody there. A chilling message arrives on his phone: do not open the door, someone is standing behind him. He turns around slowly into the dark hallway.'
const BEZOS = '5 morning habits Jeff Bezos used before Amazon hit $1 trillion'

// A prévia ANTIGA (cópia literal do cleanScriptPreview de origin/main b5f25b397) — prova que o defeito era este.
function previaAntiga(text) {
  const HEADER_LABEL = /^\s*(HOOK|GANCHO|MICRO REWARD|MICRO RECOMPENSA|ESCALATION|ESCALADA|RHYTHM|RITMO|PAYOFF|PAGAMENTO|RECOMPENSA FINAL)\b\s*\d*\s*(\([^)]*\))?\s*[:\-–]?\s*/i
  return text.split('\n').map((line) => { let t = line.trim(); if (!t) return ''; t = t.replace(HEADER_LABEL, ''); t = t.replace(/\[[^\]]*\]/g, '').trim(); return t })
    .filter((t) => { if (!t) return false; if (/\b9\s*:\s*16\b|youtube\s+shorts?\s+format/i.test(t)) return false; if (/^\s*-\s+(Total|ZERO|Cut|Hold|One legend|Voice|Editing)/i.test(t)) return false; const n = t.replace(/[^a-zA-Z]/g, ''); if (n.length > 0 && n === n.toUpperCase() && n.length < 40) return false; return true })
    .join('\n\n')
}

const LIB = rd('lib/pedidoCerto.ts')

function provaA(L, rotulo, esperado) {
  const r = (n, c) => checa(`${rotulo} · ${n}`, esperado ? c : !c)
  // A1 — a prévia não some mais com o roteiro de um parágrafo que cita 9:16
  const previa = L.limparPreviaDoRoteiro(PEDIDO)
  r('A1 prévia do roteiro real NÃO é vazia e guarda a história', previa.includes('Ethan Cole') && previa.includes('peephole'))
  r('A1b o trecho de formato sai, a frase fica ("…photorealistic visuals.")', !/9\s*:\s*16/.test(previa) && /photorealistic visuals\.$/.test(previa))
  // A2 — linhas de especificação SOLTAS continuam saindo (o comportamento antigo que valia)
  r('A2 linha solta "YouTube Shorts format, 9:16" continua saindo', L.limparPreviaDoRoteiro('HOOK: [Pexels: door] He hears three knocks at midnight\nYouTube Shorts format, 9:16') === 'He hears three knocks at midnight')
  // A3 — nunca vazio para entrada com conteúdo
  r('A3 entrada só de marcas não vira vazio', L.limparPreviaDoRoteiro('[Scene 1: a dark hallway at night]').trim().length > 0 && L.limparPreviaDoRoteiro('') === '')
  // A4 — discordância tema × fala
  r('A4 "Bezos" discorda da fala do Ethan Cole (e do pedido)', L.temaDiscordaDaFala(BEZOS, FALA) === true && L.temaDiscordaDaFala(BEZOS, PEDIDO) === true)
  r('A4b o pedido real CONCORDA com a fala; tema fino ("Volcanoes") não é acusado', L.temaDiscordaDaFala(PEDIDO, FALA) === false && L.temaDiscordaDaFala('Volcanoes', FALA) === false)
  // A5 — a fotografia do despacho
  r('A5 caixa vazia + texto enviado → tema = prévia do enviado (não vazio)', L.temaDoDespacho('', PEDIDO).startsWith('A 24-year-old man named Ethan Cole'))
  r('A5b caixa com o exemplo da casa + enviado do Ethan → tema do Ethan', L.temaDoDespacho(BEZOS, PEDIDO).includes('Ethan Cole'))
  r('A5c caixa legível do mesmo assunto vence o enviado marcado', L.temaDoDespacho('Ethan Cole hears knocks at midnight', 'HOOK: [Pexels: door] Ethan Cole hears three knocks at midnight in his house alone, nobody at the peephole, a message arrives, he turns around') === 'Ethan Cole hears knocks at midnight')
  // A6 — compose/status: claim null + aba "Bezos" + fala real → tema da fala; claim bom vence
  const esc = L.escolherTemaDoFilme({ candidatos: [null, BEZOS], fala: FALA })
  r('A6 claim null + ?topic= Bezos + fala do Ethan → tema nasce da fala', esc.fonte === 'fala' && esc.tema.startsWith('Ethan Cole finds himself') && esc.descartados === 1)
  const esc2 = L.escolherTemaDoFilme({ candidatos: [PEDIDO, BEZOS], fala: FALA })
  r('A6b claim com o pedido real vence a aba', esc2.fonte === 'candidato' && esc2.indice === 0 && esc2.tema === PEDIDO)
  r('A6c sem fala: o 1º candidato de sempre (comportamento antigo)', L.escolherTemaDoFilme({ candidatos: ['', BEZOS], fala: '' }).tema === BEZOS)
  // A7 — a ordem real do compose/status: claim do compose (null no caso) → pedido assinado limpo → ?topic= da aba
  const esc3 = L.escolherTemaDoFilme({ candidatos: [null, L.limparPreviaDoRoteiro(PEDIDO), BEZOS], fala: FALA })
  r('A7 claim null + pedido assinado + aba Bezos → o pedido assinado (índice 1), nunca o Bezos', esc3.fonte === 'candidato' && esc3.indice === 1 && esc3.tema.startsWith('A 24-year-old man named Ethan Cole'))
}

console.log('== A. régua pura com os textos reais ==')
checa('A0 a prévia ANTIGA apagava o roteiro real inteiro (o defeito reproduzido)', previaAntiga(PEDIDO) === '')
provaA(roda(LIB), 'atual', true)

// ── B. a tela ──
const GC = rd('app/(dashboard)/generate/GenerateClient.tsx')
function provaB(gc, rotulo, esperado) {
  const r = (n, c) => checa(`${rotulo} · ${n}`, esperado ? c : !c)
  r('B1 cleanScriptPreview delega à régua (sem regra própria de 9:16)', /function cleanScriptPreview\(text: string\): string \{[^\n]*\n\s+return limparPreviaDoRoteiro\(text\)/.test(gc) && !/if \(\/\\b9\\s\*:\\s\*16\\b/.test(gc))
  const iTrim = gc.indexOf('let trimmed = (structuredScriptRef.current ?? prompt).trim()')
  const iFoto = gc.indexOf('dispatchedPromptRef.current = temaDoDespacho(prompt, trimmed)')
  const iFetch = gc.indexOf("fetch('/api/generate-video-cinematic'", iTrim)
  r('B2 a fotografia do despacho é o texto ENVIADO, depois da validação e antes do POST pago', iTrim > 0 && iFoto > iTrim && iFoto < iFetch && iFoto - iTrim < 800)
  r('B3 o polling manda a FOTOGRAFIA como ?topic=, nunca a caixa viva', gc.includes("const temaDoPolling = (dispatchedPromptRef.current ?? prompt).trim()") && gc.includes("params.set('topic', temaDoPolling.slice(0, 500))") && !gc.includes("if (prompt.trim()) params.set('topic'"))
  const m = gc.match(/if \(firstRunPrefilledRef\.current\) return\n([\s\S]{0,1600}?)const ex = \(NICHE_EXAMPLES/)
  const corpo = m ? m[1] : ''
  r('B4 o pré-preenchimento decide UMA vez (trava antes de qualquer saída que não seja "carregando")', corpo.indexOf('firstRunPrefilledRef.current = true') > 0 && corpo.indexOf('firstRunPrefilledRef.current = true') < corpo.indexOf('if (recentVideos.length > 0) return'))
  r('B5 nunca no meio de análise/render nem com pedido na URL/roteiro/despacho', corpo.includes("if (phase !== 'idle') return") && corpo.includes('initialPrompt.trim() || structuredScriptRef.current || dispatchedPromptRef.current !== null'))
}
console.log('== B. a tela ==')
provaB(GC, 'atual', true)

// ── C. os servidores ──
const ST = rd('app/api/compose/status/[renderId]/route.ts')
const TE = rd('lib/temporadaServer.ts')

// C-exec: a função REAL que cria a linha de `videos` (persistCompletedVideo), recortada da rota e executada com um banco falso.
function persistReal(st, lib) {
  const ini = st.indexOf('async function persistCompletedVideo(')
  const fim = st.indexOf('\nasync function findCompletedVideoId', ini)
  if (ini < 0 || fim < 0) return null
  const js = ts.transpileModule('export ' + st.slice(ini, fim), { compilerOptions: { module: 1, target: 9 } }).outputText
  const exports = {}
  const L = roda(lib)
  const linhas = []
  const admin = { from: () => ({ insert: (row) => { linhas.push(row); return { select: () => ({ maybeSingle: async () => ({ data: { id: 'v1' }, error: null }) }) } } }) }
  vm.runInNewContext(js, { exports, require: () => { throw new Error('import inesperado') }, createAdminClient: () => admin, safeUrlHost: () => 'host', escolherTemaDoFilme: L.escolherTemaDoFilme, limparPreviaDoRoteiro: L.limparPreviaDoRoteiro, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://x', SUPABASE_SERVICE_ROLE_KEY: 'k' } }, console: { log() {}, warn() {}, error() {} }, JSON, String, Number, Math, Promise, Array, Object })
  return { fn: exports.persistCompletedVideo, linhas }
}
async function provaCExec(st, lib, rotulo, esperado) {
  const r = (n, c) => checa(`${rotulo} · ${n}`, esperado ? c : !c)
  const P = persistReal(st, lib)
  if (!P || typeof P.fn !== 'function') { r('C0 persistCompletedVideo recortável e executável', false); return }
  // o caso real: claim do compose com topic null, pedido assinado do Ethan, ?topic= da aba = Bezos, fala real do Ethan
  const res = await P.fn({ userId: 'a8a74417-fd89-4420-851e-fcb3064b54d6', renderId: '5f5c4b61-0842-494c-a281-537ac174e7b7', videoUrl: 'https://x/v.mp4', snapshotUrl: null, quality: 'cinematic_ai', duration: 17, topic: BEZOS, creditsUsed: 9, narration: FALA, temasCandidatos: () => [null, PEDIDO, BEZOS] })
  const row = P.linhas[0] ?? {}
  r('C-exec1 a linha de videos do caso real nasce com o tema do PEDIDO (não o Bezos)', typeof row.topic === 'string' && row.topic.includes('Ethan Cole') && !/Bezos/.test(row.topic))
  r('C-exec2 o título idem, e o tema escolhido volta para a rota (e-mail/pacote)', typeof row.title === 'string' && row.title.includes('Ethan Cole') && typeof res.topic === 'string' && res.topic === row.topic)
  // sem pedido assinado nem claim (Kineo 1 antigo): a aba "Bezos" contra a fala do Ethan → o tema nasce da fala
  const P2 = persistReal(st, lib)
  await P2.fn({ userId: 'u', renderId: 'r', videoUrl: 'https://x/v.mp4', snapshotUrl: null, quality: 'fast', duration: 17, topic: BEZOS, creditsUsed: 0, narration: FALA, temasCandidatos: () => ['', '', BEZOS] })
  r('C-exec3 só a aba (Bezos) contra a fala do Ethan → tema da fala', (P2.linhas[0]?.topic ?? '').startsWith('Ethan Cole finds himself'))
  // sem fala e sem candidatos: o de sempre (nada piora)
  const P3 = persistReal(st, lib)
  await P3.fn({ userId: 'u', renderId: 'r', videoUrl: 'https://x/v.mp4', snapshotUrl: null, quality: 'fast', duration: 17, topic: 'Volcanoes of Iceland', creditsUsed: 0 })
  r('C-exec4 sem fala nem candidatos: grava o topic de sempre', P3.linhas[0]?.topic === 'Volcanoes of Iceland')
}
function provaC(st, te, rotulo, esperado) {
  const r = (n, c) => checa(`${rotulo} · ${n}`, esperado ? c : !c)
  const iCand = st.indexOf('temasCandidatos: () => [')
  const corpoCand = st.slice(iCand, iCand + 600)
  r('C1 a rota passa os candidatos na ordem claim do compose → pedido assinado limpo → ?topic=', iCand > st.indexOf('const result = await persistCompletedVideo({') && corpoCand.indexOf('topicFromClaim,') > 0 && corpoCand.indexOf('limparPreviaDoRoteiro(prepaidCinematicClaim.response.prompt)') > corpoCand.indexOf('topicFromClaim,') && corpoCand.indexOf('topic,') > corpoCand.indexOf('limparPreviaDoRoteiro(prepaidCinematicClaim.response.prompt)'))
  r('C2 o tema escolhido volta para topicFinal (e-mail, pacote, push)', st.includes('if (result.topic) topicFinal = result.topic'))
  r('C3 a leitura da fala traz o tema do claim de carona', st.includes("if (!topicFromClaim && typeof nMd.topic === 'string') topicFromClaim = nMd.topic.slice(0, 1000)"))
  r('C4 o e-mail de vídeo pronto usa o tema conferido', st.includes("const safeTopic = (topicFinal || 'your topic')") && !st.includes("const safeTopic = (topic || 'your topic')"))
  r('C5 a temporada nasce do tema conferido contra a fala (lê videos.script se não veio)', te.includes('const semente = normalizeSeriesSeed(temaDoFilme)') && te.includes(".select('script').eq('id', videoId)") && te.includes('prepararTemporada(parsed, tituloDaSerie)'))
}
console.log('== C. os servidores ==')
await provaCExec(ST, LIB, 'atual', true)
provaC(ST, TE, 'atual', true)

// ── D. mutantes ──
console.log('== D. mutantes: cada conserto desfeito fica vermelho ==')
{
  // M1 — a prévia volta a apagar a linha que cita 9:16
  const m1 = LIB.replace('return palavras.length >= 6 ? semFormato : \'\'', "return ''")
  checa('M1 aplicado', m1 !== LIB)
  const L1 = roda(m1)
  checa('M1 → A1b vermelho (a frase com 9:16 some da prévia)', !/photorealistic visuals\./.test(L1.limparPreviaDoRoteiro(PEDIDO)))
  // M2 — sem a rede "nunca vazio"
  const m2 = LIB.replace('if (limpo.trim()) return limpo // KINEO-PEDIDO-CERTO-2710', 'return limpo // KINEO-PEDIDO-CERTO-2710')
  checa('M2 aplicado', m2 !== LIB)
  checa('M2 → A3 vermelho (só marcas vira vazio)', roda(m2).limparPreviaDoRoteiro('[Scene 1: a dark hallway at night]') === '')
  // M3 — discordância desligada: o Bezos volta a ser aceito
  const m3 = LIB.replace('for (const r of a) if (b.has(r)) return false // KINEO-PEDIDO-CERTO-2710\n  return true', 'for (const r of a) if (b.has(r)) return false // KINEO-PEDIDO-CERTO-2710\n  return false')
  checa('M3 aplicado', m3 !== LIB)
  checa('M3 → A6 vermelho (Bezos vira o tema do filme do Ethan)', roda(m3).escolherTemaDoFilme({ candidatos: [null, BEZOS], fala: FALA }).tema === BEZOS)
  // M4..M7 — a tela desfeita
  const conta = (fn) => { const f0 = falhas.length; fn(); const novas = falhas.splice(f0); return novas.length }
  const gm4 = GC.replace('    dispatchedPromptRef.current = temaDoDespacho(prompt, trimmed) // KINEO-PEDIDO-CERTO-2710\n', '')
  checa('M4 aplicado (fotografia volta a ser só a caixa)', gm4 !== GC)
  checa('M4 → B2 vermelho', conta(() => provaB(gm4, 'M4', true)) >= 1)
  const gm5 = GC.replace("const temaDoPolling = (dispatchedPromptRef.current ?? prompt).trim()", 'const temaDoPolling = prompt.trim()')
  checa('M5 aplicado (polling volta à caixa viva)', gm5 !== GC)
  checa('M5 → B3 vermelho', conta(() => provaB(gm5, 'M5', true)) >= 1)
  const gm6 = GC.replace('    firstRunPrefilledRef.current = true // KINEO-PEDIDO-CERTO-2710\n    if (recentVideos.length > 0) return         // returning user\n', '    if (recentVideos.length > 0) return         // returning user\n').replace("    if (phase !== 'idle') return // KINEO-PEDIDO-CERTO-2710 — exemplo só na caixa ociosa, nunca no meio de análise/render\n", "    if (phase !== 'idle') return // KINEO-PEDIDO-CERTO-2710 — exemplo só na caixa ociosa, nunca no meio de análise/render\n    firstRunPrefilledRef.current = true\n")
  checa('M6 aplicado (trava só quando escreve — o defeito do foco)', gm6 !== GC)
  checa('M6 → B4 vermelho', conta(() => provaB(gm6, 'M6', true)) >= 1)
  const gm7 = GC.replace(/  function cleanScriptPreview\(text: string\): string \{ \/\/ KINEO-PEDIDO-CERTO-2710\n    return limparPreviaDoRoteiro\(text\) \/\/ KINEO-PEDIDO-CERTO-2710\n/, "  function cleanScriptPreview(text: string): string {\n    return text.split('\\n').filter((t) => !/\\b9\\s*:\\s*16\\b/.test(t)).join('\\n\\n')\n")
  checa('M7 aplicado (prévia com regra própria de novo)', gm7 !== GC)
  checa('M7 → B1 vermelho', conta(() => provaB(gm7, 'M7', true)) >= 1)
  // M8..M11 — os servidores desfeitos
  const conta2 = async (fn) => { const f0 = falhas.length; await fn(); const novas = falhas.splice(f0); return novas.length }
  const sm8 = ST.replace('  const temaDoFilme = (temaEscolhido.tema || args.topic).slice(0, 1000) // KINEO-PEDIDO-CERTO-2710', '  const temaDoFilme = args.topic // KINEO-PEDIDO-CERTO-2710')
  checa('M8 aplicado (a linha de videos volta a gravar o ?topic= cru)', sm8 !== ST)
  checa('M8 → C-exec1 vermelho (o filme do Ethan nasce "Bezos")', (await conta2(() => provaCExec(sm8, LIB, 'M8', true))) >= 1)
  const sm9 = ST.replace('          if (result.topic) topicFinal = result.topic // KINEO-PEDIDO-CERTO-2710', '')
  checa('M9 aplicado (o tema escolhido não volta para e-mail/pacote)', sm9 !== ST)
  checa('M9 → C2 vermelho', conta(() => provaC(sm9, TE, 'M9', true)) >= 1)
  const tm10 = TE.replace('const semente = normalizeSeriesSeed(temaDoFilme)', "const semente = normalizeSeriesSeed((typeof filme.topic === 'string' && filme.topic) || '')")
  checa('M10 aplicado (temporada volta ao topic cru)', tm10 !== TE)
  checa('M10 → C5 vermelho', conta(() => provaC(ST, tm10, 'M10', true)) >= 1)
  const sm11 = ST.replace("const safeTopic = (topicFinal || 'your topic')", "const safeTopic = (topic || 'your topic')")
  checa('M11 aplicado (e-mail volta ao ?topic= cru)', sm11 !== ST)
  checa('M11 → C4 vermelho', conta(() => provaC(sm11, TE, 'M11', true)) >= 1)
}

console.log(`${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
