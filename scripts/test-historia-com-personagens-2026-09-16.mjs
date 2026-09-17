// KINEO-HISTORIA-COM-PERSONAGENS-2026-09-16 — guardião do "panda do Johny" (fundador 16/09: "vi o primeiro
// e tomei um susto porque tem um panda"). Prova: (a) o detector reconhece história com personagem nomeado
// ou papel de família e ignora fatos/lugares; (b) na rota do Kineo 1, história com personagem → still em
// toda cena, teto ampliado, e o stock NÃO entra nessas cenas; (c) o quadro tem a linha limpa (nota · motor ·
// escreveu · link · botão) e o botão "pedir feedback" chama a rota de admin que manda o e-mail com 👍/👎.
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
function load(file, env = {}) {
  const exports = {}
  const js = ts.transpileModule(rd(file), { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: () => ({}), process: { env }, console, Math, Date, Number, Set, Map, Array, JSON, AbortController, setTimeout, clearTimeout, fetch: undefined }, { filename: file })
  return exports
}

console.log('== (a) o detector ==')
const F = load('lib/fastAiScene.ts')
const johny = "Johny's cookie heist... has a twist!\n\nJohny's eyes peek over the table, locked on a giant cookie. His tiny fingers twitch in anticipation.\n\nPapa enters, noticing Johny's suspicious stance near the cookie jar. His eyebrows raise, sensing mischief in the air.\n\nA cookie crumb falls from Johny's mouth, revealing his secret snack."
checa('o texto REAL do panda (Johny ×3, Papa) é história com personagem', ['Johny', 'Papa'].includes(F.characterStoryName(johny)))
checa('papel de família sozinho basta ("Mom opens the door…")', F.characterStoryName('Mom opens the door and the dog runs into the garden.') === 'Mom')
checa('nome que se repete basta, mesmo abrindo frases ("Leo… Leo…")', F.characterStoryName('Leo works the night shift. Every night Leo collects socks. Mia finds out.') === 'Leo')
checa('fatos/ciência/lugar sem nome repetido NÃO disparam', F.characterStoryName('5 shocking facts about volcanoes. Lava can reach 1,200 degrees. The Ring of Fire has 450 volcanoes.') === null && F.characterStoryName('Why the sky is blue: sunlight scatters in the atmosphere.') === null)
checa('palavras de abertura genéricas (The, This, When…) nunca viram personagem', F.characterStoryName('The river boils. The locals avoid it. The steam rises. The legend lives.') === null)
checa('vazio → null; teto de stills da história = 8', F.characterStoryName('') === null && F.CHARACTER_STORY_MAX_STILLS === 8)

console.log('== (a2) KINEO1-VIDEO-NAO-FOTO-2026-09-17 — o texto em dobro não inventa personagem ==')
// Texto REAL do filme da menina com o coelho (life2026dil, 17/09 02:54Z): a rota passava prompt + falas, e o
// prompt já era o roteiro com as falas → "Faster" (de "Faster. Wilder. Boundless.") contou 2× e virou personagem.
const coelho = "Ever seen a little girl turn a rabbit into a superhero? In 2022, a study found that 75% of kids form strong bonds with their pets. Research shows that children who regularly play with animals display higher empathy. Even more astonishing, engaging with pets like rabbits can spark creativity. But here's the kicker: playing with a pet can transform a child's entire world view! Faster. Wilder. Boundless. So, what's the secret? Playing with a rabbit unleashes imagination. Follow for more amazing stories!"
checa('o filme do coelho NÃO é história com personagem (falas uma vez)', F.characterStoryName(coelho) === null)
checa('o mesmo texto em DOBRO (prompt + falas) continua null — frase repetida conta uma vez', F.characterStoryName(coelho + ' ' + coelho) === null)
const chris = "You won't believe how this bartender caught his thieves! In 2022, bartender Chris noticed a shocking 30% drop in stock. Hidden surveillance revealed management stealing thousands over six months. Chris realized the theft was more elaborate than he ever imagined. Alert. Calculated. Prepared. Chris was determined to end the deceit. So, Chris devised a clever trap and caught them red-handed!"
checa('o filme do bartender (Chris ×4 em falas distintas) SEGUE sendo história com personagem', F.characterStoryName(chris) === 'Chris')
checa('o panda do Johny em dobro continua história (dedupe não apaga repetição real)', ['Johny', 'Papa'].includes(F.characterStoryName(johny + ' ' + johny)) && F.characterStoryName('Leo works the night shift. Every night Leo collects socks. Leo works the night shift. Every night Leo collects socks.') === 'Leo')

console.log('== (b) a rota do Kineo 1 ==')
const ft = rd('app/api/generate-video-fast/route.ts')
checa('a história é detectada uma vez, antes do laço, sobre AS FALAS (não prompt + falas: contava em dobro); o teto de stills sobe até o número de cenas (máx. 8)', ft.includes("const falas = scenes.map((sc) => sc.voiceover ?? '').join(' ').trim()") && ft.includes('const personagem = characterStoryName(falas || prompt)') && !ft.includes('characterStoryName(`${prompt} ') && ft.includes('if (personagem) aiStillsMax = Math.max(aiStillsMax, Math.min(scenes.length, CHARACTER_STORY_MAX_STILLS))') && ft.includes('let aiStillsMax = fastAiScenesMax()'))
checa('com personagem, TODA cena decide still (character_story) — e o VÍDEO de stock SEGUE entrando na cena (17/09: sem `continue`; 7 fotos e 0 clipe era slideshow)', ft.includes("? { ai: true, reason: 'character_story' as const, entity: null }") && ft.includes("clipSources.push('aiStill')\n              // KINEO-HISTORIA-COM-PERSONAGENS (16/09) excluía o stock") && !/if \(personagem\)\s*continue/.test(ft))
checa('o evento fast_ai_still leva o personagem (medição: quantos filmes de história por dia)', ft.includes('max: aiStillsMax, character: personagem, first_film: primeiroFilmeDaConta, log:'))
checa('sem personagem o caminho é o de antes (decideFastAiScene) — nada muda para fatos/ciência', ft.includes(': decideFastAiScene({ planSource: brollMeta?.source ?? null, relevanceScore: relevanceScore ?? null, voiceover: scene.voiceover ?? null, description: scene.description ?? null })'))

console.log('== (b2) primeiro filme da conta: still em toda cena — DESLIGADO em 17/09 (o pedido era vídeo melhor, não foto) ==')
checa('17/09: nasce DESLIGADO (fundador: "era VÍDEO que era para ser melhor"); só KINEO_FIRST_FILM_STILLS=on liga; teto 12 segue', F.FIRST_FILM_MAX_STILLS === 12 && F.FIRST_FILM_STILLS_ENABLED === false && load('lib/fastAiScene.ts', { KINEO_FIRST_FILM_STILLS: 'off' }).FIRST_FILM_STILLS_ENABLED === false && load('lib/fastAiScene.ts', { KINEO_FIRST_FILM_STILLS: 'on' }).FIRST_FILM_STILLS_ENABLED === true && load('lib/fastAiScene.ts', { KINEO_FIRST_FILM_STILLS: 'talvez' }).FIRST_FILM_STILLS_ENABLED === false)
checa('o sinal é o MESMO do hook (zero vídeos + conta gratuita) e nasce fechado', ft.includes('let primeiroFilmeDaConta = false') && ft.includes('primeiroFilmeDaConta = isFirstVideo && isFreeTier && FIRST_FILM_STILLS_ENABLED'))
checa('no primeiro filme toda cena decide still (first_film) com teto até 12; o stock continua como corte seguinte (sem continue); história com personagem tem precedência', ft.includes("? { ai: true, reason: 'first_film' as const, entity: null }") && ft.includes('if (primeiroFilmeDaConta) aiStillsMax = Math.max(aiStillsMax, Math.min(scenes.length, FIRST_FILM_MAX_STILLS))') && ft.indexOf("reason: 'character_story' as const") < ft.indexOf("reason: 'first_film' as const") && !ft.includes('if (primeiroFilmeDaConta) continue'))
checa('o evento fast_ai_still carrega first_film (medição: custo por primeiro filme)', ft.includes('first_film: primeiroFilmeDaConta'))

console.log('== (c) o quadro limpo e o botão ==')
const pg = rd('app/admin/coerencia/page.tsx')
checa('linha limpa: nota · motor · quem · "escreveu" (primeira linha) · ▶ abrir o filme · botão; o resto dobrado em "detalhes"', pg.includes('data-kineo="linha-coerencia"') && pg.includes("{c?.request_pt ? 'pediu' : 'escreveu'}</span>") && pg.includes('data-kineo="abrir-filme"') && pg.includes('<PedirFeedback videoId={r.video_id} askedAt={r.feedback_asked_at} email={r.email} />') && pg.includes('<summary style={{ color: \'#6b7280\', fontSize: 11, fontWeight: 800, cursor: \'pointer\' }}>detalhes'))
checa('navegação: chips de janela, motor, "só nota < 75 / fora / parciais / sem feedback pedido", + casa', pg.includes('data-kineo="filtros"') && pg.includes("['baixo', 'nota < 75']") && pg.includes("['semfeedback', 'sem feedback pedido']") && pg.includes("if (so === 'baixo') return !!r.coherence && r.coherence.score < 75"))
const btn = rd('app/admin/coerencia/PedirFeedback.tsx')
checa('botão: POST /api/admin/film-feedback-ask com video_id; estados pedir → enviando → enviado ✓ / já pedido / falhou', btn.includes("fetch('/api/admin/film-feedback-ask', { method: 'POST'") && btn.includes("body: JSON.stringify({ video_id: videoId })") && btn.includes("'e-mail enviado ✓'") && btn.includes("'já pedido'") && btn.includes('data-kineo="pedir-feedback"'))
const rt = rd('app/api/admin/film-feedback-ask/route.ts')
checa('rota de admin: gate isAdminEmail; e-mail assinado pelo fundador com os DOIS links 👍/👎 assinados; 1 por filme por 7 dias; evento film_feedback_asked com session_id = video_id; nunca dá crédito', rt.includes('isAdminEmail(user.email') && rt.includes("feedbackHref(videoId, 'up', APP_URL, 'founder_ask')") && rt.includes("feedbackHref(videoId, 'down', APP_URL, 'founder_ask')") && rt.includes('const ASK_WINDOW_DAYS = 7') && rt.includes('return NextResponse.json({ ok: true, already: true') && rt.includes('name: FILM_FEEDBACK_ASKED_EVENT') && rt.includes('session_id: videoId') && rt.includes('metadata: { asked: true') && !rt.includes('video_credits'))
checa('e-mail: pergunta única, oferta de 10 créditos por feedback escrito (decisão do fundador), reply-to profissional (joseph@usekineo.com) e rodapé de descadastro', rt.includes('${FILM_FEEDBACK_CREDITS} credits') && load('lib/filmFeedback.ts').FOUNDER_REPLY_TO === 'joseph@usekineo.com' &&  rt.includes('did the film match what you asked for?') && rt.includes('reply_to: FOUNDER_REPLY_TO') && rt.includes('unsubscribeHeaders(userId)') && rt.includes('emailFooterHtml(userId)'))
const la = rd('lib/admin/fastCoherence.ts')
checa('leitor: o pedido já feito viaja na linha (feedback_asked_at) para o botão nascer como "já pedido"', la.includes("if (f.metadata?.asked === true) { askedByVideo.set(f.session_id, f.created_at); continue }") && la.includes('feedback_asked_at: askedByVideo.get(v.id) ?? null'))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
