// KINEO-12H-2026-09-12 — guardião da leva "analise os vídeos das últimas 12 h"
// (fundador, 12/09 17:20). Seis defeitos vistos em 10 filmes reais:
//   1. voz lê a INSTRUÇÃO em vez da fala entre aspas (8738c753, turco)
//   2. voz lê a FICHA de personagem como fala (9bac0a81, Lumi e Pipo)
//   3. ideia de 1 clique colada na frente do texto vira o tema (fichas 7/9/10)
//   4. clipe do modo clipe fica sem desfecho quando a aba fecha (2 de 2)
//   5. filme entregue com link do fornecedor que morre em 30 dias (ficha 7)
//   6. pacote de publicação escrito do topic, não do que a voz diz (ficha 10)
//   + ficção infantil em PT sem aviso de motor (léxico só inglês)
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
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, require: () => ({}), ...globals }); return exp }

console.log('== 1-2. parser: instrução e ficha não são fala ==')
const P = roda(rd('lib/scriptParser.ts'))
const TURCO = '“Karanlık Dosya” kanalı için 30 saniyelik, Türkçe, 9:16 dikey YouTube Shorts hazırla. Konu: 1872’de Atlantik’te mürettebatsız bulunan Mary Celeste gemisinin gerçek gizemi.\n\nSeslendirme:\n“1872’de Atlantik Okyanusu’nda bir gemi bulundu… Ama gemide tek bir kişi bile yoktu. Geminin adı Mary Celeste’ydi. İçeride yiyecek, su ve yük hâlâ duruyordu. Fakat kaptan, karısı, iki yaşındaki kızı ve yedi mürettebat kaybolmuştu. Geminin filikası da yoktu. Kimse onların neden gemiyi terk ettiğini öğrenemedi. Mary Celeste’nin sırrı hâlâ çözülemedi.”\n\nKaranlık, sinematik ve gerçekçi bir görsel stil kullan. Altyazılar Türkçe olsun.'
const narrTurco = P.parseUserScript(TURCO).narration
checa('turco: a narração é SÓ a fala entre aspas', narrTurco.startsWith('1872’de Atlantik Okyanusu') && /çözülemedi\.?$/.test(narrTurco))
checa('turco: a instrução ("hazırla"), o "Konu:" e a moldura visual saem', !/hazırla|Konu|sinematik|Altyazılar/.test(narrTurco))
checa('quotedSpeechUnderLabel devolve a fala; sem moldura devolve null', P.quotedSpeechUnderLabel(TURCO) !== null && P.quotedSpeechUnderLabel('Narration: “only twelve words are here in this quoted line for the test ok”') === null)
const FICHA_VOZ = ['Target length: 40 seconds', 'Narration: Natural male American English voice, 20s–30s, controlled and serious', 'Every night at exactly three in the morning, the lights in that house turn on by themselves.'].join('\n')
checa('ficha de voz (contrato de 03/09) continua: regra 5 não entra e a narração sobrevive', P.screenplaySpeechOnly(FICHA_VOZ) === null && /lights in that house/.test(P.parseUserScript(FICHA_VOZ).narration))
const LUMI = 'Lumi: pequena criatura redonda azul-clara, duas anteninhas amarelas, olhos grandes e expressão alegre. Voz infantil feminina, doce, clara e animada.\n\nPipo: pequena criatura verde, orelhas redondas e mochila laranja. Voz infantil masculina/cartunesca, divertida e claramente diferente da voz de Lumi.\n\nManter exatamente o mesmo design dos personagens durante todo o vídeo.\n\nEnsinar de maneira lenta, clara e repetitiva. Mostrar os números visualmente.\n\nCrie um vídeo infantil educativo em formato de historinha narrada em português Brasil.'
checa('Lumi: é um BRIEF (ficha + instruções, sem rótulo de fala)', P.looksLikeBrief(LUMI) === true)
checa('Lumi: linhas de ficha e de instrução não viram fala', P.isCharacterSheetLine('Lumi: pequena criatura redonda azul-clara, duas anteninhas amarelas, olhos grandes') && P.isInstructionLine('Crie um vídeo infantil educativo em formato de historinha narrada em português Brasil.') && !/Voz infantil feminina|Crie um vídeo/.test(P.parseUserScript(LUMI).narration))
checa('fala de personagem entre aspas NÃO é ficha', !P.isCharacterSheetLine('Lumi: "Vamos aprender os números juntos, Pipo, eu adoro contar!"'))
checa('história normal não é brief', P.looksLikeBrief('Era uma vez Lumi e Pipo, dois amigos muito curiosos que decidiram aprender a contar até dez em inglês. Durante o passeio, Lumi encontrou o número 1.') === false)
checa('narração que começa com "Create" sem entregável continua fala', !P.isInstructionLine('Create memories that last a lifetime, they said.'))

console.log('== 3. ideia colada ==')
const ideias = roda(rd('lib/surpriseIdeas.ts')).SURPRISE_IDEAS
const intakeSrc = rd('lib/cinematic/promptIntake.ts').replace("import { SURPRISE_IDEAS } from '@/lib/surpriseIdeas'", 'const SURPRISE_IDEAS = __IDEAS__')
const I = roda(intakeSrc, { __IDEAS__: ideias })
const HISTORIA = 'Era uma vez Lumi e Pipo, dois amigos muito curiosos que decidiram aprender a contar até dez em inglês. Durante o passeio, Lumi encontrou o número 1 e descobriu que em inglês se fala ONE. Logo depois, eles encontraram o número 2.'
const colado = I.stripIdeaPrefix('The wave in Alaska that was taller than the Empire State Building: ' + HISTORIA)
checa('ficha 7: a ideia colada sai e o texto da pessoa manda', colado.text === HISTORIA && colado.strippedIdea === 'The wave in Alaska that was taller than the Empire State Building')
checa('ideia sozinha (1 clique de verdade) fica intacta', I.stripIdeaPrefix('The wave in Alaska that was taller than the Empire State Building').strippedIdea === null)
checa('ideia + comentário curto fica intacta', I.stripIdeaPrefix('The wave in Alaska that was taller than the Empire State Building — make it dramatic').strippedIdea === null)
checa('texto sem ideia da casa fica intacto', I.stripIdeaPrefix(HISTORIA).text === HISTORIA)
checa('quebra de linha entre a ideia e o texto também é reconhecida', I.stripIdeaPrefix('The island where landing is illegal — and what lives there\n' + HISTORIA).strippedIdea !== null || !ideias.some((i) => /landing is illegal/.test(i)))
const st = rd('app/(dashboard)/studio/StudioClient.tsx')
checa('Studio importa a lista da lib (fonte única)', /import \{ SURPRISE_IDEAS \} from '@\/lib\/surpriseIdeas'/.test(st) && !/const SURPRISE_IDEAS = \[/.test(st))
const fast = rd('app/api/generate-video-fast/route.ts')
const cin = rd('app/api/generate-video-cinematic/route.ts')
checa('as duas rotas passam o prompt pelo intake e gravam idea_prefix_stripped', /const intake = stripIdeaPrefix\(\(body\.prompt \?\? ''\)\.trim\(\)\)/.test(fast) && /const prompt = intake\.text/.test(fast) && /const intake = stripIdeaPrefix\(promptRaw\.replace/.test(cin) && (cin.match(/idea_prefix_stripped/g) || []).length === 1 && (fast.match(/idea_prefix_stripped/g) || []).length === 1)
checa('cinematic: brief com verbatim vira modo IA (brief_detected_ai_mode)', /const briefDetected = userSaysVerbatim && !parsedScript\.hasMarkers && looksLikeBrief\(prompt\)/.test(cin) && /\(userSaysVerbatim && !briefDetected\)/.test(cin) && /brief_detected_ai_mode/.test(cin))

console.log('== 4-5. cron: clipes órfãos e link do fornecedor ==')
const cron = rd('app/api/cron/finish-stranded-renders/route.ts')
checa('Fase C lê clip_submitted com 3 min+ e fecha por status da fal', /\.eq\('name', 'clip_submitted'\)/.test(cron) && /if \(ageMin >= 30\) await failClip\('stale_in_queue'\)/.test(cron) && /persistRenderAssets\(\{ userId, renderId, videoUrl: providerUrl, snapshotUrl: null, downloadTimeoutMs: 45_000 \}\)/.test(cron))
checa('Fase C: falha estorna pelo RPC e grava clip_failed; sucesso grava videos + clip_completed', /const refunded = await refundRenderCredits\(renderId\)/.test(cron) && /name: 'clip_failed', user_id: userId, path: '\/api\/cron\/finish-stranded-renders'/.test(cron) && /quality_mode: 'clip', duration: seconds, credits_used: CLIP_CREDITS/.test(cron) && /finished_by: 'cron'/.test(cron))
checa('Fase C: não repete clipe já entregue ou já fechado', /\.from\('videos'\)\.select\('id'\)\.eq\('render_id', renderId\)/.test(cron) && /\.in\('name', \['clip_completed', 'clip_failed'\]\)\.eq\('session_id', renderId\)/.test(cron))
checa('Fase D: filme com URL do fornecedor é copiado para o bucket e a linha atualizada', /backblazeb2\.com%,video_url\.ilike\.%creatomate%/.test(cron) && /render_asset_repersisted/.test(cron) && /\.update\(\{ video_url: persisted\.videoUrl, final_video_url: persisted\.videoUrl \}\)/.test(cron))
checa('desfechos novos entram no rastro terminal', /clip_failed:\|clip_completed_by_cron\|clip_status_unreachable\|clip_videos_insert_failed\|vendor_url_repersisted/.test(cron))
const ra = rd('lib/renderAssets.ts')
checa('persistRenderAssets aceita prazo maior; a rota continua em 25 s por padrão', /downloadTimeoutMs\?: number/.test(ra) && /downloadTimeoutMs: videoTimeoutMs,/.test(ra) && /: 25_000\n/.test(ra))

console.log('== 6. pacote nasce da narração ==')
const pk = rd('lib/publishPackServer.ts')
checa('garantirPacote busca a narração do compose_submission_claim pelo render_id e usa o topic só como reserva', /async function narracaoDoFilme\(/.test(pk) && /\.eq\('metadata->>render_id', renderId\)/.test(pk) && /narracao \|\| \(typeof filme\.topic === 'string' \? filme\.topic\.trim\(\) : ''\)/.test(pk))

console.log('== + ficção em PT/ES avisa o motor ==')
const F = roda(rd('lib/engineFit.ts'))
checa('Lumi e Pipo (era uma vez + historinha infantil) → stock_cannot_tell', F.classifyEngineFit('Crie um vídeo infantil educativo em formato de historinha narrada em português Brasil. Era uma vez Lumi e Pipo, dois amigos muito curiosos que decidiram aprender a contar até dez em inglês.').verdict === 'stock_cannot_tell')
checa('documentário em PT continua ok', F.classifyEngineFit('Em 1958, uma onda de 524 metros atingiu a baía de Lituya, no Alasca. Cientistas explicam como um deslizamento gerou o maior tsunami já registrado.').verdict === 'ok')

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
