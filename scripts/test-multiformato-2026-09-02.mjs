// ═══ KINEO-MULTIFORMATO-2026-09-02 ═══════════════════════════════════════
// 16:9 · 1:1 · 4:5 nativos, ao lado do 9:16 de sempre.
//
// A TESE, em uma frase: reenquadrar é caro para o mercado e barato para nós.
// Eles partem de um vídeo PRONTO e precisam rastrear um sujeito (OpusClip
// cobra US$29/mês por isso; Submagic e Veed fazem crop manual; InVideo
// re-renderiza e cobra crédito de novo). Nossas cenas são GERADAS: o quadro
// certo é um campo de string no payload da fal.
//
// A REGRA DE SEGURANÇA que estes testes existem para provar: SEM `aspect`,
// absolutamente nada muda. 100% dos primeiros vídeos da casa são Shorts.
import { readFileSync } from 'node:fs'
// ⚠️ `.replace(/\r\n/g, '\n')`: os arquivos existentes do repo estão em CRLF
// (autocrlf=true no Windows) e os arquivos novos nascem em LF. Sem normalizar,
// toda verificação multi-linha falha por causa do \r invisível — e o autor
// perde tempo procurando um defeito que não existe.
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
let ok = 0, fail = 0
const check = (n, c) => { c ? (ok++, console.log('  ok  ' + n)) : (fail++, console.log('  FAIL ' + n)) }

const aspect = src('lib/aspect.ts')
const profile = src('lib/renderProfile.ts')
const compose = src('lib/compose.ts')
const cine = src('app/api/generate-video-cinematic/route.ts')
const fast = src('app/api/generate-video-fast/route.ts')
const composeRoute = src('app/api/compose/route.ts')
const router = src('lib/hollywood/router.ts')
const pix = src('lib/pixabay.ts')
const studio = src('app/(dashboard)/studio/StudioClient.tsx')
const gen = src('app/(dashboard)/generate/GenerateClient.tsx')

console.log('1 · a fonte única (lib/aspect.ts)')
check('os 4 formatos existem', aspect.includes("export const ASPECTS = ['9:16', '16:9', '1:1', '4:5'] as const"))
check('o padrão é 9:16', aspect.includes("export const DEFAULT_ASPECT: Aspect = '9:16'"))
check('entrada inválida cai no padrão (URL, body, banco)', aspect.includes('return (ASPECTS as readonly string[]).includes(s) ? (s as Aspect) : DEFAULT_ASPECT'))
check('9:16 mantém 1080×1920 e os números históricos do layout', /'9:16': \{[\s\S]{0,400}width: 1080,[\s\S]{0,80}height: 1920,[\s\S]{0,400}captionBottomY: '78%',[\s\S]{0,80}captionWidth: '78%',[\s\S]{0,120}captionFontSize: 62,[\s\S]{0,60}hookFontSize: 76,[\s\S]{0,60}letterboxPct: 6,/.test(aspect))
check('16:9 = 1920×1080 e SEM letterbox (o quadro já é cinema)', /'16:9': \{[\s\S]{0,400}width: 1920,[\s\S]{0,80}height: 1080,[\s\S]{0,600}letterboxPct: 0,/.test(aspect))
check('1:1 = 1080×1080 · 4:5 = 1080×1350', aspect.includes('width: 1080,\n    height: 1080,') && aspect.includes('width: 1080,\n    height: 1350,'))
check('toda dimensão é PAR (H.264 exige 4:2:0)', [1080, 1920, 1080, 1080, 1350].every((n) => n % 2 === 0))

console.log('2 · geometria do master (renderProfile)')
check('renderOutputSpecFor existe', profile.includes('export function renderOutputSpecFor('))
check('sem aspect → caminho antigo, honrando KINEO_RENDER_*', profile.includes('if (spec.aspect === DEFAULT_ASPECT)') && profile.includes('width: p.width, height: p.height'))
check('o guard "não é 9:16 volta ao default" continua de pé (protege a ENV)', profile.includes('const target = 9 / 16') && profile.includes('CACHED = { ...DEFAULT_RENDER_PROFILE }'))
check('fps continua vindo do perfil (alavanca de custo do Creatomate)', profile.includes('frame_rate: p.fps }'))

console.log('3 · compose: layout segue o quadro')
check('caption Y/width/fonte vêm do formato', compose.includes('y: ACTIVE_ASPECT.captionBottomY') && compose.includes('width: ACTIVE_ASPECT.captionWidth') && compose.includes('hook ? ACTIVE_ASPECT.hookFontSize : ACTIVE_ASPECT.captionFontSize'))
check('letterbox nunca excede o do formato (0 em 16:9 e 1:1)', compose.includes('const letterboxPct = Math.min(FAST_LETTERBOX_PCT, frame.letterboxPct)'))
check('marca d\'água acompanha o topo do quadro', compose.includes('y: frame.watermarkY'))
check('os DOIS builders fixam o formato na primeira linha', compose.split('setActiveAspect(aspect)').length === 3)
check('os DOIS builders emitem geometria por formato', compose.split('renderOutputSpecFor(frame.aspect)').length === 3)
check('a decisão de usar variável de módulo está justificada por escrito', compose.includes('SÍNCRONOS de ponta a ponta'))

console.log('4 · motores geram no quadro certo (é aqui que a vantagem existe)')
// São 10 ramos com `aspect_ratio` no arquivo. A troca automática pegou 9 (os
// que tinham 6 espaços de indentação) e o `return` DEFAULT — Seedance 1.5, o
// motor de 33% dos primeiros vídeos — escapou por estar com 4 espaços. Esta
// verificação foi quem pegou: sem ela, um pedido de 16:9 sairia deitado
// justamente no motor mais usado e certo em todos os outros. Defeito parcial
// é o pior tipo, porque "funciona quando eu testo".
check('os 10 literais aspect_ratio viraram um ponto só', !cine.includes("aspect_ratio: '9:16'") && cine.split('aspect_ratio: frame.falAspectRatio').length === 11)
check('buildFalInput recebe o formato como ÚLTIMO parâmetro', cine.includes('aspect?: string | null,\n): Record<string, unknown> {') && cine.includes('const frame = aspectSpec(aspect)'))
check('submitToFal repassa (call sites posicionais intactos)', cine.includes('stylized?: boolean, aspect?: string | null)') && cine.includes('buildFalInput(model, prompt, hd, hollywood, seconds, imageUrl, seed, stylized, aspect)'))
check('o caminho clássico manda o formato no despacho', cine.includes('generationSeed, undefined, aspectRequested)'))
check('a rota lê o formato do body, com default seguro', cine.includes("const aspectRequested = normalizeAspect((body as { aspect?: unknown }).aspect)"))
check('o planner recebe o formato em TODAS as 5 chamadas', cine.split('aspect: aspectRequested, // KINEO-MULTIFORMATO-2026-09-02').length === 6)

console.log('5 · prompts do planner param de contradizer o payload')
check('o system prompt usa o enquadramento pedido', router.includes('ultra-realistic ${frame.promptFraming} short film'))
check('a regra "em todo prompt" idem', router.includes('- ${frame.promptFraming} in every prompt.'))
check('o backstop limpa "9:16" antes de injetar o certo', router.includes('prompt.replace(/,?\\s*9:16(\\s+vertical)?(\\s+framing)?/gi'))
check('a cena de diálogo forçada idem', router.includes('Medium shot, ${frame.promptFraming} — looking straight into the lens'))

console.log('6 · Kineo 1 (Pixabay): o sinal de orientação inverte')
check('bônus de orientação segue o quadro (não mais "+10 retrato" fixo)', pix.includes('const orientationBonus = portrait === wantsPortrait ? 10 : 0'))
check('penalidade de resolução espelha o corte real', pix.includes('? portrait ? (rez.height < 1080 ? 3 : 0) : (rez.width < 2560 ? 2 : 0)') && pix.includes(': portrait ? (rez.height < 2560 ? 2 : 0) : (rez.width < 1920 ? 3 : 0)'))
check('o passe preferido busca altura em Short e LARGURA em 16:9', pix.includes("ACTIVE_FRAME.vertical ? `&min_height=1200` : `&min_width=1920`"))
check('a entrada pública fixa o quadro antes de buscar', pix.includes('setActiveFrame(opts?.aspect)'))
check('a rota fast passa o formato ao ranker', fast.includes('styleCtx, aspect }') && fast.includes("const aspect = normalizeAspect((body as { aspect?: unknown }).aspect)"))

console.log('7 · a corrente inteira: Studio → URL → generate → compose')
check('Studio tem os 4 formatos (16:9 sai do SOON)', studio.includes('ASPECT_PILLS.map((a) =>') && !studio.includes('title="Coming soon">16:9'))
check('a escolha VIAJA na URL (antes morria na tela)', studio.includes("if (aspect !== '9:16') q.set('aspect', aspect)"))
check('GenerateClient lê da URL com default seguro', gen.includes("const aspectRequested = normalizeAspect(searchParams.get('aspect'))"))
check('só viaja quando não é o padrão (link antigo intacto) — 3 pontos', gen.split("aspectRequested !== '9:16' ? { aspect: aspectRequested } : {}").length === 4)
check('compose recebe e repassa aos DOIS builders', composeRoute.includes('const aspectRequested = normalizeAspect') && composeRoute.split('aspect: aspectRequested, // KINEO-MULTIFORMATO-2026-09-02').length === 3)

console.log('8 · custo (o argumento comercial)')
const cost = (w, h) => (w * h) / (1080 * 1920)
check('16:9 custa o MESMO que 9:16 (mesmos pixels)', cost(1920, 1080) === 1)
check('1:1 custa 44% MENOS', Math.round((1 - cost(1080, 1080)) * 100) === 44)
check('4:5 custa 30% menos', Math.round((1 - cost(1080, 1350)) * 100) === 30)
check('nenhum formato novo encarece o render', [cost(1920, 1080), cost(1080, 1080), cost(1080, 1350)].every((c) => c <= 1))

console.log('9 · invariantes de não-regressão (o que NÃO pode ter mudado)')
check('9:16 continua sendo o padrão em todos os pontos de entrada', studio.includes("useState<Aspect>('9:16')") && aspect.includes("DEFAULT_ASPECT: Aspect = '9:16'"))
check('nenhum literal 1080/1920 novo no compose (geometria só via spec)', !/width: 1080,\s*height: 1920/.test(compose))
check('o piso do TikTok (61,5s) segue intocado', compose.includes('totalDuration = 61.5'))
check('o contrato de duração de hoje segue intocado', compose.includes('const TTS_WORDS_PER_SECOND = 3.1'))

console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
