#!/usr/bin/env node
// ═══ KINEO-PARCEIRO-EYEBIBLE-1410 [TRAVA 8.2 — vai do fundador 14/10 "consertar urgente"] ═══════════════════════════════════
//
// O filme do parceiro Robert/EyeBible (Seedance 1.5, 16:9, 60 s pedidos, "Use my script as is", render c9844e94, 14/10
// 14:08 UTC) saiu com cinco defeitos, todos medidos no claim assinado e nos eventos:
//   1. LEGENDA NO CANTO ESQUERDO em 16:9 — o texto do Creatomate nasce com x_alignment '0%'; a caixa de 16:9 tem 1613 px.
//   2. TRILHA ALEGRE sob guerra e morte — o roteiro não tinha palavra de luto/mistério; o tema caiu no detectNiche, que
//      leu "broken" como "broke" → nicho money → trilha hustle (hip-hop 808, "head-nodding groove").
//   3. A VOZ LEU "Young soldier… Captain…" — `YOUNG SOLDIER: “He’s still alive!”` passava inteiro para a narração.
//   4. FORMATO ERRADO — drama com falas de personagem caiu em documentary_faceless ("close-up… faces" contra "no foreground
//      human faces"), e as cenas foram cortadas por CONTAGEM de palavras no meio da frase ("…The captain" | "looks over").
//   5. IMAGEM ATRASADA EM RELAÇÃO À FALA — a rota desceu o filme para 35 s (fala de 47 s, duration_followed_script) e
//      cobrou 35 s; o compose recebeu 60 e o TIKTOK-61 esticou a linha do tempo para 61,5 s com ~40 s de voz.
//
// Este guardião EXECUTA os módulos reais (transpilados, sem rede, sem custo) e prova, além do comportamento, que desfeito o
// conserto (scripts/test-support/desfaz-parceiro-eyebible-1410.mjs) cada arquivo é EXATAMENTE o pai do commit do conserto.
// Rodar: node scripts/test-parceiro-eyebible-1410.mjs

import { readFileSync } from 'node:fs'
import { desfazAncoraLegenda1410 } from './test-support/desfaz-ancora-legenda-1410.mjs' // reancorado KINEO-ANCORA-LEGENDA-1410 [TRAVA 8.2 — vai do fundador 14/10]: Seedance com still em todas as cenas + legenda 9:16 centralizada saem em memória antes do byte a byte
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semParceiroEyebible1410, desfazParceiroEyebible1410, ARQUIVOS_PARCEIRO_EYEBIBLE_1410, FORMA_PARCEIRO_EYEBIBLE_1410, MARCA_PARCEIRO_EYEBIBLE_1410 } from './test-support/desfaz-parceiro-eyebible-1410.mjs'
import { desfazParceiroEyebible2_1410 } from './test-support/desfaz-parceiro-eyebible-2-1410.mjs' // reancorado KINEO-PARCEIRO-EYEBIBLE-2-1410 [TRAVA 8.2 — vai do fundador 14/10]: a 2ª leva do Robert/EyeBible sai em memória antes do byte a byte

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = '5ead67407740b5d6d48b8db2fe6bf2fed0db852c' // pai do primeiro commit marcado (origin/main de 14/10)
process.chdir(RAIZ)

let falhas = 0
let total = 0
function checa(nome, cond, detalhe = '') {
  total++
  if (cond) console.log(`  ok   ${nome}`)
  else { falhas++; console.log(`  FALHOU ${nome}${detalhe ? ' — ' + detalhe : ''}`) }
}
const secao = (t) => console.log(`\n── ${t}`)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const ler = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))

// O roteiro REAL do Robert (história de ficção, sem dado pessoal).
const ROBERT = [
  'Two soldiers hide behind a broken stone wall. Arrows strike the ground around them.', '',
  'Across the battlefield, their wounded friend lies beside a fallen shield.', '',
  'YOUNG SOLDIER: “He’s still alive!”', '',
  'The captain looks over the wall. Enemy soldiers are getting closer.', '',
  'CAPTAIN: “Help me carry him.”', '',
  'They run to their friend and lift him between them.', '',
  'WOUNDED SOLDIER: “I can’t walk.”', '',
  'CAPTAIN: “We’ve got you.”', '',
  'An arrow strikes the captain’s shield. They keep moving.', '',
  'Their men pull them behind the wall. All three fall to the ground, breathing hard.', '',
  'YOUNG SOLDIER: “That was a terrible plan.”', '',
  'The captain looks at their friend, safe beside them.', '',
  'CAPTAIN: “It worked.”',
].join('\n')

const load = createOfflineLoader({ env: { OPENAI_API_KEY: 'offline' }, source: (p, s) => desfazAncoraLegenda1410(p, s) }) // reancorado KINEO-ANCORA-LEGENDA-1410 [TRAVA 8.2 — vai do fundador 14/10]: Seedance com still em todas as cenas + legenda 9:16 centralizada saem em memória antes do byte a byte
const parser = load('lib/scriptParser.ts')
const musica = load('lib/musicDirection.ts')
const formato = load('lib/cinematic/visualMode.ts')
const beats = load('lib/cinematic/verbatimBeats.ts')
const filme = load('lib/cinematic/duracaoDoFilme.ts')
const compose = load('lib/compose.ts')
// A versão de ANTES do conserto, pelo desfaz (mesma árvore, sem as linhas marcadas): o 9:16 tem de sair idêntico.
const composeAntes = createOfflineLoader({ env: { OPENAI_API_KEY: 'offline' }, source: (p, s) => desfazParceiroEyebible1410(p, desfazAncoraLegenda1410(p, s)) })('lib/compose.ts') /* KINEO-ANCORA-LEGENDA-1410 */

secao('1 · a fala do personagem é lida SEM o nome do papel (ponto 4)')
const narr = parser.parseUserScript(ROBERT).narration
for (const rotulo of ['YOUNG SOLDIER', 'CAPTAIN:', 'WOUNDED SOLDIER', 'CAPTAIN']) checa(`a voz não lê "${rotulo}"`, !narr.includes(rotulo), narr)
for (const fala of ['“He’s still alive!”', '“Help me carry him.”', '“I can’t walk.”', '“We’ve got you.”', '“That was a terrible plan.”', '“It worked.”']) checa(`a fala ${fala} continua na narração`, narr.includes(fala))
checa('a ação continua na narração, na ordem', /broken stone wall[\s\S]*He’s still alive[\s\S]*Help me carry him[\s\S]*I can’t walk[\s\S]*We’ve got you[\s\S]*terrible plan[\s\S]*It worked/.test(narr))
checa('99 palavras faladas (108 menos os 9 do rótulo)', narr.split(/\s+/).length === 99, String(narr.split(/\s+/).length))
checa('stripScriptMarkers é idempotente sobre a narração limpa (o compose passa de novo)', parser.stripScriptMarkers(narr) === narr)
const semAspas = parser.parseUserScript('CAPTAIN: Hold the line!\n\nThe enemy charges.\n\nYOUNG SOLDIER: We can’t hold them, sir!').narration
checa('fala SEM aspas com ato de fala (!) também perde o rótulo', semAspas === 'Hold the line! The enemy charges. We can’t hold them, sir!', semAspas)
const comMarcador = parser.parseUserScript('[Pexels: battlefield] The wall shakes.\nCAPTAIN: “Hold!”\n[Pexels: soldiers] SOLDIER: “Run!”')
checa('com marcador [Pexels], o trecho de cada cena também lê sem rótulo', comMarcador.segments.map((s) => s.voiceover).join(' | ') === 'The wall shakes. “Hold!” | “Run!”', comMarcador.segments.map((s) => s.voiceover).join(' | '))
const roteiroDeCinema = parser.parseUserScript('Visual: a stone wall at dusk.\nNarration: The siege had lasted nine days.\nVisual: the gate breaks.\nCAPTAIN: “Hold the line!”\nNarration: Nobody slept that night.').narration
checa('no roteiro de cinema (Narration:), a fala do personagem não cai fora', roteiroDeCinema === 'The siege had lasted nine days. “Hold the line!” Nobody slept that night.', roteiroDeCinema)

secao('2 · a ficha de personagem (Lumi/Max, 12/09) continua fora da voz')
const fichaMista = parser.parseUserScript('Lumi: a small robot with big eyes and a blue antenna, childlike voice.\nMax: a brave puppy with floppy ears, deep warm voice.\nLumi and Max find a lost star in the forest.').narration
checa('ficha "Lumi: …" e "Max: …" saem, a história fica', fichaMista === 'Lumi and Max find a lost star in the forest.', fichaMista)
const fichaCaixaAlta = parser.parseUserScript('LUMI: a small robot with big eyes, childlike voice\nMAX: a brave puppy with floppy ears, deep voice\nLUMI: “Look, a falling star!”\nMAX: “Let’s follow it!”\nThey run into the forest.').narration
checa('ficha em CAIXA ALTA sai mesmo num roteiro com diálogo; as falas ficam sem rótulo', fichaCaixaAlta === '“Look, a falling star!” “Let’s follow it!” They run into the forest.', fichaCaixaAlta)
const fichaPt = parser.parseUserScript('Lumi: pequena criatura azul com olhos grandes. Voz infantil feminina, doce e curiosa.\nLumi encontra uma estrela caída no jardim.').narration
checa('ficha em português sai', fichaPt === 'Lumi encontra uma estrela caída no jardim.', fichaPt)
checa('fala em caixa mista com vocabulário de ficha ("Look at his eyes!") nunca é apagada', parser.parseUserScript('The medic kneels.\nCaptain: Look at his eyes!\nHe is breathing.').narration.includes('Look at his eyes!'))
const citacao = parser.parseUserScript('Einstein: “Imagination is more important than knowledge.”\nHe said it in 1929.').narration
checa('citação atribuída em caixa mista ("Einstein: “…”") fica igual — a atribuição é conteúdo', citacao.startsWith('Einstein: “Imagination'), citacao)
const lista = parser.parseUserScript('TIP 1: Drink water before coffee.\nTIP 2: Sleep before midnight.').narration
checa('listicle "TIP 1:" não perde a numeração', lista === 'TIP 1: Drink water before coffee. TIP 2: Sleep before midnight.', lista)
checa('rótulo de beat (HOOK:) continua sendo tirado como sempre', parser.parseUserScript('HOOK: The wall fell.\nPAYOFF: Nobody came back.').narration === 'The wall fell. Nobody came back.')

secao('3 · a trilha segue o tom do roteiro (ponto 2)')
const dRobert = musica.resolveMusicDirection({ script: narr, rawScript: `${narr}\n${ROBERT}` })
checa('o roteiro de guerra do Robert dá trilha de CONFLITO (grave), não hustle', dRobert.emotion === 'conflict' && dRobert.mood === 'suspense', JSON.stringify(dRobert))
const pConflito = musica.musicEmotionPrompt(dRobert)
checa('o prompt do Lyria proíbe ritmo alegre e batida de hip-hop', /Somber/.test(pConflito) && /No upbeat rhythm/.test(pConflito) && /no hip-hop beat/.test(pConflito) && /no cheerful melody/.test(pConflito))
checa('roteiro de horror em português também é grave', musica.resolveMusicDirection({ script: 'O pesadelo começou na trincheira. O inimigo avançou e o terror tomou conta.' }).emotion === 'conflict')
checa('roteiro em espanhol de batalla también', musica.resolveMusicDirection({ script: 'La batalla duró tres días. Los soldados heridos esperaban.' }).emotion === 'conflict')
checa('morte continua sendo luto (grief vence conflito)', musica.resolveMusicDirection({ script: 'The soldier died on the battlefield and the army mourned.' }).emotion === 'grief')
const feliz = musica.resolveMusicDirection({ script: 'Happy birthday! The kids laugh and celebrate with cake and joy.' })
checa('roteiro feliz continua alegre (celebration)', feliz.emotion === 'celebration', JSON.stringify(feliz))
const dinheiro = musica.resolveMusicDirection({ script: 'Passive income builds wealth while you sleep. Here is how to grow your salary.' })
checa('roteiro de dinheiro continua com trilha hustle (upbeat permitido)', dinheiro.mood === 'hustle' && dinheiro.emotion === 'neutral', JSON.stringify(dinheiro))
checa('um sinal solto ("sugar is your enemy") não vira trilha de guerra', musica.resolveMusicDirection({ script: 'Sugar is your enemy. Cut it for a week and feel the difference.' }).emotion !== 'conflict')
checa('a direção explícita do autor ("Music: upbeat"... "mood: epic") continua vencendo', musica.resolveMusicDirection({ script: narr, rawScript: `mood: epic\n${ROBERT}` }).mood === 'epic')

secao('4 · drama com falas de personagem não cai no documentário sem rosto (ponto 3a)')
const dFormato = formato.decidirFormato(ROBERT, false)
checa('o roteiro do Robert vira character_story', dFormato.modo === 'character_story', JSON.stringify(dFormato))
checa('conta as 6 falas', formato.falasDePersonagem(ROBERT) === 6)
checa('documentário sem fala continua faceless', formato.decidirFormato('The Great Wall stretches 21,000 km. It took centuries to build.', false).modo === 'documentary_faceless')
checa('a tag [faceless] continua vencendo', formato.decidirFormato(`[faceless]\n${ROBERT}`, true).modo === 'documentary_faceless')
checa('HOOK:/PAYOFF: não contam como fala de personagem', formato.falasDePersonagem('HOOK: “Stop scrolling!”\nPAYOFF: “That is why!”') === 0)

secao('5 · as cenas são cortadas no fim da frase (ponto 3b)')
const cenas = beats.resolveVerbatimSegments(parser.parseUserScript(ROBERT), 7).map((s) => s.voiceover)
checa('7 cenas, como antes', cenas.length === 7)
checa('nenhuma palavra muda nem some', cenas.join(' ') === narr)
checa('toda cena termina em fim de frase', cenas.every((c) => /[.!?…]["”»’']*$/.test(c)), cenas.join(' | '))
checa('"The captain looks over the wall" nasce numa cena só (antes: "…The captain" | "looks over")', cenas.some((c) => c.includes('The captain looks over the wall.')))
const semPont = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen'
checa('texto sem pontuação sai igual ao de antes (cortes equilibrados)', JSON.stringify(beats.resolveVerbatimSegments({ segments: [], narration: semPont }, 3).map((s) => s.voiceover)) === JSON.stringify(['one two three four five', 'six seven eight nine ten', 'eleven twelve thirteen fourteen']))

secao('6 · o filme montado tem a duração assinada (ponto 3c)')
const claimRobert = { verbatim: true, duration: 35 }
checa('verbatim clássico descido para 35 s → monta 35 s', filme.duracaoDoFilmeAssinada({ pedida: 60, quality: 'cinematic_ai', claimResponse: claimRobert }) === 35)
checa('sem verbatim → a pedida (como sempre)', filme.duracaoDoFilmeAssinada({ pedida: 60, quality: 'cinematic_ai', claimResponse: { verbatim: false, duration: 35 } }) === 60)
checa('hollywood → a pedida', filme.duracaoDoFilmeAssinada({ pedida: 60, quality: 'cinematic_hollywood', claimResponse: claimRobert }) === 60)
checa('assinada MAIOR que a pedida → a pedida (nunca sobe aqui)', filme.duracaoDoFilmeAssinada({ pedida: 60, quality: 'cinematic_ai', claimResponse: { verbatim: true, duration: 90 } }) === 60)
checa('sem claim → a pedida', filme.duracaoDoFilmeAssinada({ pedida: 60, quality: 'cinematic_ai', claimResponse: null }) === 60)
const linhaDoTempo = (d) => compose.buildCreatomateSource({ clipUrls: ['https://a/1.mp4', 'https://a/2.mp4', 'https://a/3.mp4'], voiceoverUrl: 'https://a/v.mp3', voiceoverScript: narr, duration: d, aspect: '16:9', quality: 'cinematic_ai', realAudioDuration: 40, whisperWords: null, musicUrl: null })
const fim = (src) => Math.max(...JSON.parse(JSON.stringify(src)).elements.filter((e) => e.type === 'video').map((e) => Number(e.time) + Number(e.duration)))
checa('com a duração assinada, a imagem acaba com a voz (~40 s), sem o rabo mudo de 61,5 s', fim(linhaDoTempo(filme.duracaoDoFilmeAssinada({ pedida: 60, quality: 'cinematic_ai', claimResponse: claimRobert }))) < 45, String(fim(linhaDoTempo(35))))
checa('o defeito de antes reproduz: com 60 a linha do tempo estica para 61,5 s', fim(linhaDoTempo(60)) >= 61, String(fim(linhaDoTempo(60))))
const rota = ler('app/api/compose/route.ts')
checa('o compose monta com a duração assinada (fiação na rota)', rota.includes('        duration: duracaoDoFilmeAssinada({ pedida: duration, quality, claimResponse: cinematicBirthClaim?.response }), // KINEO-PARCEIRO-EYEBIBLE-1410'))
checa('a conferência de custo do nascimento NÃO mudou (segue com a duração pedida)', rota.includes('cinematicBirthClaim.creditCost !== creditCostForDuration(trustedQuality, true, duration)'))

secao('7 · legenda centralizada em 16:9, 1:1 e 4:5; 9:16 byte a byte igual (ponto 1)')
const fonte = (mod, aspect) => mod.buildCreatomateSource({ clipUrls: ['https://a/1.mp4', 'https://a/2.mp4'], voiceoverUrl: 'https://a/v.mp3', voiceoverScript: 'Hold the line now. We go home.', duration: 35, aspect, quality: 'cinematic_ai', realAudioDuration: 30, whisperWords: null, musicUrl: null })
const legendas = (src) => JSON.parse(JSON.stringify(src)).elements.filter((e) => e.type === 'text' && e.track === 5)
for (const a of ['16:9', '1:1', '4:5']) {
  const ls = legendas(fonte(compose, a))
  checa(`${a}: toda legenda com x_alignment 50%`, ls.length > 0 && ls.every((e) => e.x === '50%' && e.x_alignment === '50%'))
  checa(`${a}: antes do conserto não havia (o defeito reproduz)`, legendas(fonte(composeAntes, a)).every((e) => !('x_alignment' in e)))
}
for (const a of [undefined, '9:16']) {
  checa(`9:16 (${a ?? 'sem aspect'}): a fonte inteira do Creatomate é idêntica à de antes`, JSON.stringify(fonte(compose, a)) === JSON.stringify(fonte(composeAntes, a)))
  checa(`9:16 (${a ?? 'sem aspect'}): legenda sem x_alignment`, legendas(fonte(compose, a)).every((e) => !('x_alignment' in e)))
}

secao('8 · desfeito o conserto, cada arquivo é EXATAMENTE o pai do commit')
for (const p of ARQUIVOS_PARCEIRO_EYEBIBLE_1410) {
  const atual = ler(p)
  const base = lf(execFileSync('git', ['show', `${BASE}:${p}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
  let desfeito = null
  try { desfeito = semParceiroEyebible1410(p, desfazParceiroEyebible2_1410(p, desfazAncoraLegenda1410(p, atual))) /* KINEO-ANCORA-LEGENDA-1410 */ } catch (e) { desfeito = `ERRO ${e.message}` }
  checa(`${p}: desfeito = base ${BASE.slice(0, 8)}`, desfeito === base, typeof desfeito === 'string' && desfeito.startsWith('ERRO') ? desfeito : '')
  const marcadas = atual.split('\n').filter((l) => l.includes(MARCA_PARCEIRO_EYEBIBLE_1410)).length
  const f = FORMA_PARCEIRO_EYEBIBLE_1410[p]
  checa(`${p}: ${f.trocas} troca(s) + ${f.acrescimos} acréscimo(s) marcados`, marcadas === f.trocas + f.acrescimos, String(marcadas))
}
checa('o desfaz é idempotente (sem linha marcada, devolve igual)', semParceiroEyebible1410('lib/aspect.ts', 'x\ny') === 'x\ny')
checa('o desfaz recusa conserto pela metade', (() => { try { semParceiroEyebible1410('lib/aspect.ts', `a // ${MARCA_PARCEIRO_EYEBIBLE_1410}`); return false } catch { return true } })())
// A trava mede os COMMITS do conserto (não-merge, com a marca no assunto) — nunca a árvore contra a base: depois de um merge da main
// a árvore traz o trabalho dos outros, e a trava ficaria vermelha (ou verde) por motivo alheio.
let tocados = []
try {
  const shas = execFileSync('git', ['log', '--no-merges', '--format=%H', `--grep=${MARCA_PARCEIRO_EYEBIBLE_1410}`, `${BASE}..HEAD`], { encoding: 'utf8' }).split('\n').filter(Boolean)
  checa('existe ao menos um commit do conserto depois da base', shas.length > 0 || execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0)
  tocados = [...new Set(shas.flatMap((h) => execFileSync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', h], { encoding: 'utf8' }).split('\n').filter(Boolean)))]
  tocados.push(...execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' }).split('\n').filter(Boolean)) // + o que ainda não foi commitado
} catch { /* sem git: a seção acima já cobre */ }
const permitidos = new Set([...ARQUIVOS_PARCEIRO_EYEBIBLE_1410, 'lib/cinematic/duracaoDoFilme.ts', 'scripts/test-parceiro-eyebible-1410.mjs', 'scripts/test-support/desfaz-parceiro-eyebible-1410.mjs'])
const fora = tocados.filter((p) => !permitidos.has(p) && !p.startsWith('scripts/'))
checa('o conserto não toca generate-video-cinematic, generate-script, ads, preços nem motores', !tocados.some((p) => p === 'app/api/generate-video-cinematic/route.ts' || p.startsWith('app/api/generate-script') || p.startsWith('lib/ads/') || p === 'lib/engineWall.ts' || p === 'lib/homeVideoCuration.ts'), tocados.join(', '))
checa('fora de scripts/, só os arquivos declarados', fora.length === 0, fora.join(', '))

console.log(`\n${total - falhas}/${total} verificações — ${falhas ? 'VERMELHO' : 'VERDE'}`)
process.exit(falhas ? 1 : 0)
