// KINEO-PROMPT-PROPRIO-2026-09-16 — guardião: a caixa de ideia colada com a NOSSA tela é recusada antes de custar
// (caso globaloutreach33: 1.018 caracteres do Studio viraram um filme de 5 créditos sobre a nossa interface), e o
// painel "Tudo que esta pessoa fez" mostra o que a pessoa escreveu, o que foi narrado e o filme — para o fundador
// dar nota de coerência.
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
const roda = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console }); return exp }

console.log('== (a) o detector ==')
const G = roda(rd('lib/promptGuard.ts'))
const colado = 'Studio\n\nEnglish\n\n10 credits\n\nStudio\n\nYour idea first. Review the settings, then generate.\n\n1Your idea\n\n🎲 Surprise me\n\n📊 Facts\n\n🕵️ Mystery\n\n📖 True Story\n\n📝 My Script\n\nWhat’s your video about? One idea in — a finished film out: voiced, scored and captioned.\n\n✨ Let AI structure it\n\n📝 Use my script as is\n\n🎬 Just this clip (no narration)\n\na single line is enough — or paste a full script\n\n2\n\nEngine\n\n⚡\n\nKineo 1\n\n1080p ▾\n\n3\n\nFormat\n\n35s\n\n60s ⭐\n\n90s 📈\n\n16:9 · Widescreen\n\n1:1 · Square\n\n4:5 · Feed tall'
checa('o texto REAL colado (caso 16/09) é reconhecido como a nossa tela', G.looksLikeOurOwnUi(colado) === true && G.frasesDaNossaTela(colado).length >= 8)
checa('uma ideia normal não dispara ("5 morning habits Jeff Bezos…")', G.looksLikeOurOwnUi('5 morning habits Jeff Bezos used before Amazon hit $1 trillion') === false)
checa('um roteiro longo com uma frase parecida não dispara (1 frase < 3)', G.looksLikeOurOwnUi('A true story about a lighthouse keeper. Surprise me with the ending. The keeper walks along the pier every night at midnight, and the light flickers over the dark ocean.') === false)
checa('texto curto nunca dispara', G.looksLikeOurOwnUi('Surprise me. True story. My script.') === false)
checa('mensagem diz o que fazer e que nada foi cobrado; razão nomeada', /nothing was charged/.test(G.PROMPT_PROPRIO_MESSAGE) && G.PROMPT_PROPRIO_REASON === 'prompt_is_our_ui')

console.log('== (b) as duas portas recusam antes de custar ==')
const an = rd('app/api/analyze-idea/route.ts')
checa('analyze-idea recusa com 400 e razão prompt_is_our_ui logo depois de limpar a tag de câmera', an.includes("import { looksLikeOurOwnUi, PROMPT_PROPRIO_MESSAGE, PROMPT_PROPRIO_REASON } from '@/lib/promptGuard'") && an.includes('if (looksLikeOurOwnUi(prompt)) {') && an.indexOf('if (looksLikeOurOwnUi(prompt)) {') > an.indexOf("analyzeRefusalCopy('prompt_only_camera_tag')"))
const ft = rd('app/api/generate-video-fast/route.ts')
checa('generate-video-fast recusa ANTES de classificar/planejar/cobrar', ft.includes("import { looksLikeOurOwnUi, PROMPT_PROPRIO_MESSAGE, PROMPT_PROPRIO_REASON } from '@/lib/promptGuard'") && ft.includes("recordFastFailure('generating', PROMPT_PROPRIO_REASON, 400, user.id)") && ft.indexOf('if (looksLikeOurOwnUi(prompt)) {') < ft.indexOf("name: 'generation_dispatch_received'"))

console.log('== (c) painel do fundador: escreveu / narrou / filme ==')
const api = rd('app/api/admin/person-media/route.ts')
checa('API devolve o prompt INTEIRO (topic_full) e a narração da montagem (compose_submission_claim)', api.includes('topic_full:') && api.includes("'compose_submission_claim'") && api.includes('narration:'))
checa('API sinaliza prompt que é a nossa tela (prompt_is_ui)', api.includes('prompt_is_ui: looksLikeOurOwnUi('))
const pc = rd('app/admin/people/PeopleClient.tsx')
checa('painel: vídeo tocável inline, "O que escreveu" e "O que foi narrado" abertos por clique, alerta de tela colada', pc.includes('<video') && pc.includes('O que escreveu') && pc.includes('O que foi narrado') && pc.includes('texto da nossa própria tela'))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
