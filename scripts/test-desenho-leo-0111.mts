// KINEO-DESENHO-LEO-0111 — guardião dos 3 defeitos do desenho infantil apontados pelo revisor de 31/10 (os dois eram o PRIMEIRO vídeo do
// cliente): (1) o cliente escolheu o Leo e um ESQUILO fez o papel principal do começo ao fim; (2) a luva listrada colorida virou luva
// vermelha e o parque de outono virou neve; (3) as duas amostras grátis contaram a MESMA história (luva perdida).
// Roda as funções REAIS na ordem da rota (app/api/generate-video-cinematic): elenco do roteiro → elenco do desenho → política da cena →
// buildClassicVisualPrompt → comPersonagemInfantil → ajustarPromptsDoElenco → prepararQualidadeDoFilme → travarDesenhoInfantil.
// Rodar: npx tsx scripts/test-desenho-leo-0111.mts
import fs from 'node:fs'
import { elencoDoRoteiro, ajustarPromptsDoElenco, CLAUSULA_SEM_GENTE, CLAUSULA_FICHA } from '../lib/cinematic/personagemAjuste'
import { fichaDoProtagonista, elencoSecundario, type FichaDePersonagem } from '../lib/cinematic/folhaDePersonagem'
import { buildClassicVisualPrompt } from '../lib/cinematic/visualPromptPolicy'
import { prepararQualidadeDoFilme } from '../lib/cinematic/filmQuality'
import {
  KIDS_STYLE_ANCHOR, KIDS_CHARACTERS, comPersonagemInfantil, kidsCharacter, elencoDoDesenho, ancoraDaHistoria, travarDesenhoInfantil,
  prefixoDoProtagonista, fraseDaAncora, KIDS_CHARACTER_TIPO,
} from '../lib/kidsCartoon/kidsCartoon'
import { KIDS_SERIES_BEATS, kidsBeatFor, kidsIdeaForRun, kidsSampleBeatFor, kidsSampleIdea, kidsSampleOrdinalFallback } from '../lib/kidsVenda/kidsVenda'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

// ── a história da luva (a do render fc0761fa: "found the owner, a grateful squirrel") e os planos com a deriva do descritor ──
const leo = kidsCharacter('leo')!
const falas = [
  'Leo was playing in the autumn park when he found a striped colorful mitten under a big orange tree.',
  'Whose mitten is this? Leo wondered. He asked the ducks by the pond, but they just quacked.',
  'Leo looked high and low, under the benches and behind the slide.',
  'At last Leo found the owner, a grateful squirrel, shivering with one cold paw.',
  'The squirrel smiled and said thank you. Helping others feels warm inside. Have you ever helped someone?',
]
const historia = falas.join(' ')
const visuais = [ // o descritor ancora cada cena no sujeito LITERAL da fala: o esquilo vira sujeito e a luva/estação derivam
  'A little boy in an autumn park picks up a striped colorful mitten under an orange tree, slow push-in',
  'Tracking shot of the boy holding the mitten near a pond with ducks',
  'Wide shot of a park with empty benches and a slide, leaves drifting',
  'A grateful squirrel on a branch with one bare paw reaches for a red mitten, macro',
  'Close-up of the smiling squirrel wearing the mitten in the snow, low angle',
]
const style = { ...KIDS_STYLE_ANCHOR }

console.log('(1) o esquilo não toma o lugar do Leo')
const doRoteiro = elencoDoRoteiro(historia)
ok(doRoteiro[0] && /squirrel/i.test(doRoteiro[0].canonica) && doRoteiro[0].nome === 'Leo', `(1) causa documentada: o elenco da casa lê "Leo" como esquilo (${doRoteiro[0]?.canonica ?? '-'})`)
const elenco = elencoDoDesenho(leo, doRoteiro) as FichaDePersonagem[]
ok(elenco.filter((f) => f.protagonista).length === 1 && elenco[0].protagonista && elenco[0].canonica === leo.sheet && elenco[0].origem === 'autor', '(1) o elenco do desenho: o Leo escolhido é o ÚNICO protagonista, com a ficha canônica (origem autor)')
ok(!elenco.some((f) => /squirrel/i.test(f.canonica) && f.protagonista), '(1) o esquilo nunca é protagonista')
ok(!elenco.some((f) => f.nome === 'Leo' && /squirrel/i.test(f.canonica)), '(1) a ficha "Leo, a squirrel…" saiu do elenco')
ok(fichaDoProtagonista(elenco) === leo.sheet, '(1) a política da cena recebe a ficha do Leo (fichaDoProtagonista)')
ok(KIDS_CHARACTER_TIPO.leo.tipo === 'humano' && KIDS_CHARACTER_TIPO.dino.tipo === 'criatura' && KIDS_CHARACTERS.every((c) => KIDS_CHARACTER_TIPO[c.id]), '(1) todo personagem fixo tem tipo (Leo humano mesmo com esquilo na história)')
const comMenino = elencoDoDesenho(leo, [{ nome: 'the little boy', nucleo: 'boy', tipo: 'humano', canonica: 'the little boy, a boy about nine years old with short dark hair', origem: 'deterministica', protagonista: true, genero: 'man' }, { nome: 'the grateful squirrel', nucleo: 'squirrel', tipo: 'animal', canonica: 'the grateful squirrel, a squirrel', origem: 'deterministica', protagonista: false, genero: null }])
ok(comMenino.length === 2 && comMenino[1].nome === 'the grateful squirrel' && !comMenino[1].protagonista, '(1) "the little boy" (o próprio Leo) sai; o esquilo fica como coadjuvante')
ok(JSON.stringify(elencoDoDesenho(leo, elenco)) === JSON.stringify(elenco), '(1) elencoDoDesenho é idempotente')

// a rota, na ordem dela
const policy = { mode: 'character_story' as const, style, character: fichaDoProtagonista(elenco), aspect: '9:16' as const, elenco: elencoSecundario(elenco) }
let prompts = visuais.map((v, i) => buildClassicVisualPrompt(v, { ...policy, opening: i === 0 }))
prompts = prompts.map((p) => comPersonagemInfantil(p, leo.sheet))
const ajuste = ajustarPromptsDoElenco({ prompts, visuals: visuais, falas, elenco })
prompts = ajuste.prompts
const q = prepararQualidadeDoFilme({ prompts, falas, contextoOriginal: historia, contextoFiltro: historia, modo: 'character_story', tagFaceless: false, kidsCartoon: true, style, elenco, preservarElenco: false, aplicarContrato: false })
ok(!q.prompts.some((p) => /Leo, a squirrel/i.test(p)), '(1) nenhuma cena descreve o Leo como esquilo depois do elenco/época da casa')
const ancora = ancoraDaHistoria(`${historia} ${visuais[0]}`)
const finais = q.prompts.map((p) => travarDesenhoInfantil(p, { personagem: leo, ancora, historia: `${historia} ${visuais[0]}` }))
const prefixo = prefixoDoProtagonista(leo)
finais.forEach((p, i) => ok(p.includes(leo.sheet), `(1) cena ${i + 1}: a ficha do Leo está no prompt`))
finais.forEach((p, i) => { const iP = p.indexOf(prefixo); const iS = p.search(/squirrel/i); ok(iP >= 0 && iP < 400 && (iS < 0 || iP < iS), `(1) cena ${i + 1}: o Leo vem NA FRENTE como protagonista${iS >= 0 ? ' (antes do esquilo)' : ''}`) })
ok(finais.every((p) => p.startsWith(`Film visual medium: ${style.lookPhrase}. ${prefixo}`)), '(1) a trava de estilo continua a 1ª coisa; o protagonista logo depois')
ok(finais.every((p) => !p.includes(CLAUSULA_SEM_GENTE.trim())), '(1) nenhuma cena fica com "No people…" (que apagava o Leo das cenas do esquilo)')
ok(finais.every((p) => !p.includes(CLAUSULA_FICHA(leo.sheet).trim())), '(1) a ficha não fica repetida no rabo (vai uma vez, na frente)')
ok(finais.every((p) => p.split(leo.sheet).length === 2), '(1) a ficha do Leo aparece exatamente uma vez por cena')
ok(finais[3].includes('secondary, smaller and beside Leo, never replacing Leo') && /squirrel/i.test(finais[3]), '(1) a cena do esquilo: o esquilo fica, como coadjuvante ao lado do Leo')
ok(JSON.stringify(finais.map((p) => travarDesenhoInfantil(p, { personagem: leo, ancora, historia }))) === JSON.stringify(finais), '(1) travarDesenhoInfantil é idempotente')
ok(finais.every((p) => p.length <= 2500), `(1) prompts cabem no teto de 2.500 da casa (maior: ${Math.max(...finais.map((p) => p.length))})`)

console.log('(2) objeto e cenário fixos')
ok(ancora.objeto === 'striped colorful mitten' && ancora.cenario === 'autumn park' && ancora.estacao === 'autumn', `(2) âncora da história: "${ancora.objeto}" · "${ancora.cenario}" · ${ancora.estacao}`)
const frase = fraseDaAncora(ancora)!
finais.forEach((p, i) => ok(p.includes(frase) && p.includes('the same striped colorful mitten') && p.includes('the same autumn park setting'), `(2) cena ${i + 1}: objeto + cenário da história repetidos`))
ok(!finais.some((p) => /\bred mitten\b/i.test(p.split(leo.sheet).join(''))), '(2) a "red mitten" do descritor virou a luva listrada colorida')
ok(finais[3].includes('striped colorful mitten, macro') || /striped colorful mitten/.test(finais[3].replace(frase, '')), '(2) a cena 4 diz a luva certa no próprio plano')
ok(!finais.some((p) => /\b(snow|snowy|winter)\b/i.test(p)), '(2) a neve inventada no fecho virou outono (a história não fala de neve)')
ok(finais.every((p) => p.includes('red rubber boots')), '(2) a ficha do Leo nunca é reescrita pela troca de cor (as botas vermelhas ficam)')
const neve = ancoraDaHistoria('Mia built a snowman in the snowy garden on a winter morning with her blue scarf.')
ok(neve.estacao === 'winter' && travarDesenhoInfantil('A snowy garden, Mia smiles.', { personagem: kidsCharacter('mia')!, ancora: neve, historia: 'snowy winter' }).includes('snowy garden'), '(2) história de inverno: a neve fica')
ok(ancoraDaHistoria('').objeto === null && fraseDaAncora(ancoraDaHistoria('')) === null, '(2) história sem objeto/cenário: nenhuma frase inventada')
const bola = ancoraDaHistoria('Leo kicked his favorite red ball across the sunny garden.')
ok(bola.objeto === 'favorite red ball' && bola.cenario === 'sunny garden', `(2) o caso bom do Kling 4 (Leo + bola): "${bola.objeto}" · "${bola.cenario}"`)

console.log('(3) amostras seguidas contam histórias diferentes')
ok(kidsBeatFor(1, 0) === KIDS_SERIES_BEATS[0] && /mitten/.test(KIDS_SERIES_BEATS[0]), '(3) causa documentada: a amostra era sempre seq 1/ciclo 0 = a luva perdida')
ok(kidsSampleBeatFor(0) !== kidsSampleBeatFor(1), `(3) amostra 1 ≠ amostra 2 ("${kidsSampleBeatFor(0)}" / "${kidsSampleBeatFor(1)}")`)
let vizinhasDiferentes = true
for (let k = 0; k < 120; k++) if (kidsSampleBeatFor(k) === kidsSampleBeatFor(k + 1)) vizinhasDiferentes = false
ok(vizinhasDiferentes, '(3) nenhuma amostra repete a história da anterior (120 seguidas)')
ok(new Set(Array.from({ length: KIDS_SERIES_BEATS.length }, (_, k) => kidsSampleBeatFor(k))).size === KIDS_SERIES_BEATS.length, '(3) as 30 primeiras amostras cobrem os 30 momentos')
ok(kidsSampleOrdinalFallback('abc') === kidsSampleOrdinalFallback('abc') && kidsSampleOrdinalFallback('abc') >= 0 && kidsSampleOrdinalFallback('abc') < KIDS_SERIES_BEATS.length, '(3) sem a contagem do banco: ordinal estável pelo id do pedido')
ok(kidsSampleIdea({ theme: 'ocean friends', ordinal: 2 }) === `${kidsSampleBeatFor(2)} (part of the series: ocean friends)` && kidsSampleIdea({ theme: '', ordinal: 2 }) === kidsSampleBeatFor(2), '(3) o tema da pessoa segue junto, como no piloto')
ok(kidsIdeaForRun({ theme: '', seq: 1, cycleIndex: 0 }) === KIDS_SERIES_BEATS[0], '(3) pack/piloto: a ordem de sempre (nada muda)')

console.log('(fiação) a rota e o cron chamam as funções')
const route = rd('app/api/generate-video-cinematic/route.ts')
const iElenco = route.indexOf('if (desenhoInfantil.ativo) { personagemElenco.elenco = elencoDoDesenho(desenhoInfantil.personagem, personagemElenco.elenco)')
const iPolitica = route.indexOf('classicVisualPolicy.character = fichaDoProtagonista(personagemElenco.elenco)')
ok(iElenco > 0 && iPolitica > iElenco, '(fiação) rota: o elenco do desenho é trocado ANTES da política da cena ler o protagonista')
const iTrava = route.indexOf('classicScenePrompts[i] = travarDesenhoInfantil(classicScenePrompts[i], { personagem: desenhoInfantil.personagem, ancora: ancoraDesenho')
const iEpoca = route.indexOf('classicScenePrompts[i] = elencoEpoca.prompts[i]')
const iDry = route.indexOf('const classicReport = classicDryRunReport({')
ok(iTrava > iEpoca && iTrava < iDry, '(fiação) rota: a trava do desenho é o último toque, depois do elenco/época e antes do dry-run/still/clipe')
ok(route.includes('${desenhoProtagonista ? `') && route.includes('is the main subject of EVERY shot') && route.includes('never alone and never instead of ${desenhoProtagonista.name}'), '(fiação) descritor de cenas: no desenho, o personagem escolhido é o sujeito de todo plano (o esquilo só ao lado)')
ok(route.includes("desenhoInfantil.ativo ? { name: desenhoInfantil.personagem.name, sheet: desenhoInfantil.personagem.sheet } : null))") || route.includes("desenhoInfantil.ativo ? { name: desenhoInfantil.personagem.name, sheet: desenhoInfantil.personagem.sheet } : null, kling4TrialCandidate && scenes.length === 3))") /* KINEO-K4-SUJEITO-0111 v6/v7 — o 7º argumento (só o Kling 4 grátis, com 3 cenas) não muda a regra do desenho */, '(fiação) descritor: a regra só entra com kids_cartoon (filme comum = mensagem de sempre)')
const cron = rd('lib/kidsVenda/cron.ts')
ok(cron.includes("if (order.kind === 'sample') {") && cron.includes('ideaDaRun = kidsSampleIdea({ theme: order.theme, ordinal })') && cron.includes("idea: ideaDaRun, ideaId: null"), '(fiação) cron: a amostra pede a história pela ordem dela entre as amostras')
ok(cron.includes(".select('id', { count: 'exact', head: true }).eq('kind', 'sample').lt('created_at', order.created_at)"), '(fiação) cron: a ordem vem de uma contagem (sem truncar em 1000), nenhuma chamada de modelo nova')
const kc = rd('lib/kidsCartoon/kidsCartoon.ts')
ok(kc.includes(`'${CLAUSULA_SEM_GENTE}'`) && kc.includes('The same main character appears in this scene, consistent design: ${sheet}.'), '(espelho) os literais espelhados em kidsCartoon.ts batem com personagemAjuste')
ok(!/^import /m.test(kc.replace(/^import \{ NARRATION_LANGUAGE_CODES[^\n]*\n/, '')), '(espelho) kidsCartoon.ts não ganhou import novo (segue puro)')

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
