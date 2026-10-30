// KINEO-BRIEF-NAO-E-FALA-3010 · KINEO-LEGENDA-LARGURA-3010 · KINEO-LEGENDA-FRASE-3010 · KINEO-PEDIDO-MUDO-3010 · KINEO-CLIPE-LOGO-3010 ·
// KINEO-SEM-MARCA-3010 · KINEO-CLIPE-OU-FILME-3010 — guardião sem rede com os pedidos REAIS do revisor (29-30/10).
import { readFileSync } from 'node:fs'
import { detectPastedScript, isProductionBrief, semPreambuloDeChat, PRODUCTION_BRIEF_RULE } from '../lib/pastedScript'
import { fonteDaLegendaQueCabe, terminaEmPalavraFuncao, buildCaptionsFromWhisperWords } from '../lib/compose'
import { citaMarcaNoClipe, pareceRoteiroDeFilme, CLIPE_ROTEIRO_EVENTOS } from '../lib/clips/clipTextoLongo'
import { comUniformeSemMarca, UNIFORME_SEM_MARCA } from '../lib/cinematic/filmQuality'
import { pedeVideoMudo, hrefDoClipeComTexto } from '../lib/growth/pedidoMudo'
let ok = 0, f = 0
const check = (n: string, c: boolean) => { if (c) { ok++; console.log('ok   ' + n) } else { f++; console.log('FAIL ' + n) } }

console.log('1) pedido de produção não vira narração')
const BRIEF = 'Calma, calma, aqui está prontinho pra você copiar: Crie um vídeo infantil para YouTube Shorts com até 50 segundos, em formato vertical 9:16. Mostre animais fofinhos em animação 3D colorida, com expressões engraçadas, música infantil animada e uma aventura surpreendente. A história deve prender a atenção das crianças desde o primeiro segundo, com movimentos dinâmicos, cores vibrantes, personagens carismáticos e um final divertido e inesperado. Use qualidade visual profissional, falas simples em português e música original.'
check('1.1 o pedido real (29/10) com preâmbulo do chat é pedido de produção', isProductionBrief(BRIEF))
check('1.2 deixa de ser "roteiro colado"', detectPastedScript(BRIEF).pasted === false && detectPastedScript(BRIEF).reason === 'production_brief')
check('1.3 o escritor recebe o pedido sem o preâmbulo', semPreambuloDeChat(BRIEF).startsWith('Crie um vídeo infantil'))
const CONTO = 'Às 3:33 da madrugada, alguém começou a bater na janela do meu quarto. Eu morava no terceiro andar. Achei estranho, mas ignorei. Até ouvir uma voz feminina sussurrando que queria entrar. Peguei o celular e a tela acendeu sozinha com o meu nome. Quando olhei de novo para o vidro, havia uma mão aberta, pálida, encostada do lado de fora, e ela começou a bater devagar.'
check('1.4 conto colado (prosa longa) segue roteiro colado', detectPastedScript(CONTO).pasted === true && detectPastedScript(CONTO).reason === 'long_prose')
check('1.5 diálogo colado segue diálogo', detectPastedScript('Motu: Chutki, is Bheem home?\nChutki: No, he went to the forest.').reason === 'dialogue')
check('1.6 ideia curta segue ideia curta', detectPastedScript('the secret life of vegetables').reason === 'short_idea')
check('1.7 texto sem preâmbulo fica igual', semPreambuloDeChat('A dog runs on the beach') === 'A dog runs on the beach')
const rota = readFileSync(new URL('../app/api/generate-script/route.ts', import.meta.url), 'utf8')
check('1.8 o escritor liga a regra do pedido de produção', rota.includes("colado.reason === 'production_brief' ? `\\n\\n${PRODUCTION_BRIEF_RULE}`"))
check('1.9 as 2 chamadas ao escritor usam o tema sem preâmbulo', (rota.match(/this topic:\\n\\n' \+ temaDoEscritor/g) ?? []).length === 2)
check('1.10 a regra proíbe narrar formato/música/duração', /Never narrate the request itself/.test(PRODUCTION_BRIEF_RULE))

console.log('2) legenda')
check('2.1 palavra de 19 letras no gancho (76) encolhe para caber em 9:16', fonteDaLegendaQueCabe('EXTRAORDINARIAMENTE', 76, 1080, '78%') < 76)
check('2.2 e não desce do piso de 36', fonteDaLegendaQueCabe('PNEUMOULTRAMICROSCOPICOSSILICOVULCANOCONIOSE', 76, 1080, '78%') === 36)
check('2.3 palavras curtas ficam no tamanho de sempre', fonteDaLegendaQueCabe('THE MAN WALKED', 62, 1080, '78%') === 62)
check('2.4 16:9 (mais largo) não encolhe palavra média', fonteDaLegendaQueCabe('EXTRAORDINARY', 46, 1920, '84%') === 46)
check('2.5 artigo/preposição é palavra-função (en/pt/es)', terminaEmPalavraFuncao('the') && terminaEmPalavraFuncao('da') && terminaEmPalavraFuncao('del') && !terminaEmPalavraFuncao('room'))
const W = (ws: string[]) => ws.map((word, i) => ({ word, start: i * 0.3, end: i * 0.3 + 0.25 }))
const chunks = buildCaptionsFromWhisperWords(W(['the', 'man', 'walked', 'into', 'the', 'room']) as never, 10, 0, 4).map((c) => c.text)
check('2.6 o teto de 4 não termina em "into": "the man walked | into the room"', JSON.stringify(chunks) === JSON.stringify(['the man walked', 'into the room']))
const virgula = buildCaptionsFromWhisperWords(W(['Then,', 'the', 'door', 'opened']) as never, 10, 0, 4).map((c) => c.text)
check('2.7 a vírgula fecha o chunk', virgula[0] === 'Then,')
const compose = readFileSync(new URL('../lib/compose.ts', import.meta.url), 'utf8')
check('2.8 o elemento da legenda usa a fonte que cabe', compose.includes('font_size: fonteDaLegendaQueCabe(text, hook ? ACTIVE_ASPECT.hookFontSize : ACTIVE_ASPECT.captionFontSize'))
check('2.9 "silent video" (29/10) pede vídeo mudo', pedeVideoMudo('15-second silent video. Pure black background. One enormous 3D word BROKENBASE'))
check('2.10 "sem narração" e "sin narración" também', pedeVideoMudo('vídeo sem narração de um carro') && pedeVideoMudo('video sin narración'))
check('2.11 pedido comum não dispara', !pedeVideoMudo('the secret life of vegetables, narrated by a broccoli'))
check('2.12 a porta leva o texto para o Clipe', hrefDoClipeComTexto('silent video of rain').startsWith('/clips?prompt=silent+video+of+rain'))
const gen = readFileSync(new URL('../app/(dashboard)/generate/GenerateClient.tsx', import.meta.url), 'utf8')
check('2.13 o Filme mostra o aviso do vídeo mudo', gen.includes("mode === 'cinematic_ai' && pedeVideoMudo(prompt)") && gen.includes('PEDIDO_MUDO_EVENTOS.clicked'))

console.log('3) logo no anúncio')
check('3.1 Trans Web ("your company shirt") pede o logo', citaMarcaNoClipe('a young guy wearing your company shirt, knocking on doors: join Trans Web Internet today'))
check('3.2 "minha loja" / "nuestra marca" também', citaMarcaNoClipe('anúncio da minha loja de roupas') && citaMarcaNoClipe('anuncio de nuestra marca'))
check('3.3 cena comum não pede logo', !citaMarcaNoClipe('a cat jumps on a table'))
const clips = readFileSync(new URL('../app/(dashboard)/clips/ClipsClient.tsx', import.meta.url), 'utf8')
check('3.4 a tela do Clipe mostra a nota do logo com botão de enviar', clips.includes('data-clip-logo-hint') && clips.includes("t('logoHintCta')"))

console.log('4) marca de terceiro')
const GUARDIOLA = '"Did Guardiola invent the false 9?" In 2009, Guardiola changed Barcelona\'s attack style. Messi was key.'
check('4.1 Guardiola/Barcelona ganha camisa sem marca', comUniformeSemMarca('a footballer receives the ball', GUARDIOLA).endsWith(UNIFORME_SEM_MARCA))
check('4.2 frase positiva (sem "no logo")', !/\bno\b/i.test(UNIFORME_SEM_MARCA))
check('4.3 policial de uniforme não dispara', comUniformeSemMarca('a police officer in uniform', 'a police officer in uniform') === 'a police officer in uniform')
check('4.4 não duplica', comUniformeSemMarca(comUniformeSemMarca('a player', GUARDIOLA), GUARDIOLA).split(UNIFORME_SEM_MARCA.trim()).length === 2)

console.log('A/B) Clipe: história vira Filme como botão principal, e é medido')
check('A.1 conto continua detectado', pareceRoteiroDeFilme(CONTO))
check('A.2 o botão principal vira o Filme narrado', clips.includes('data-clip-action="long_script_film_main"') && clips.includes("t('clipAnyway', { s: seconds })"))
check('A.3 o clipe continua possível (opção pequena)', /clipAnyway[\s\S]{0,200}void generate\(\)/.test(clips))
check('B.1 os 3 eventos existem', CLIPE_ROTEIRO_EVENTOS.shown === 'clip_long_script_shown' && CLIPE_ROTEIRO_EVENTOS.film === 'clip_long_script_film_clicked' && CLIPE_ROTEIRO_EVENTOS.clipAnyway === 'clip_long_script_clip_anyway')
check('B.2 a tela grava visto, filme e clipe-mesmo-assim', ['CLIPE_ROTEIRO_EVENTOS.shown', 'CLIPE_ROTEIRO_EVENTOS.film', 'CLIPE_ROTEIRO_EVENTOS.clipAnyway'].every((s) => clips.includes(s)))

console.log(`\n${f === 0 ? '✅' : '❌'} ${ok} verdes, ${f} vermelhas`)
if (f) process.exit(1)
