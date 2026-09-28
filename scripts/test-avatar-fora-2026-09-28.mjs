// KINEO-AVATAR-FORA-2026-09-28 — decisão do fundador (27/09): "avatar sai por hora".
//
// O caso, medido no banco antes da mudança: em toda a história, 1 filme 'avatar' e 3 'presenter' entregues (o último
// em 15/07); nos últimos 30 dias, 3 avatar_dispatch_received — os 3 ensaios de $0 (dry_run) — e 0 cliques no card do
// /studio (studio_avatar_card_clicked). Mesmo assim o Avatar era vendido em 14 superfícies públicas: contagem "Seven"
// (FAQ da home, schema, /ph), mega-menu, menu mobile, bento e 4 cards do toolkit da home, pricing (resultado do
// Studio, calculadora, tabela, FAQ do Autopilot, Character Lock), llms.txt/api/facts, /ph, rodapé, sitemap, banner
// "NEW — AI Avatar Video" do painel e o Studio (link + card).
//
// A mudança: UM interruptor, AVATAR_PUBLIC=false em lib/engineLaunch.ts (mesmo desenho do S25_PUBLIC), com
// avatarVisible(email) para as contas da casa. Este guardião EXECUTA o código real (engineLaunch, kineoFacts, a rota
// do llms.txt, a rota /api/me/credits, o metadata do /ai-avatar, o custo do biller) e RENDERIZA a home, o Studio, o
// pricing e o rodapé com o JSX real. Prova:
//   (a) contagem 'Six' e lista sem Avatar — e virar o interruptor devolve 'Seven' e o Avatar (derivado, não digitado);
//   (b) catálogo que o ChatGPT lê (kineoFacts → llms.txt) sem Avatar, e o interruptor o traz de volta com 110 cr;
//   (c) home, pricing, rodapé e Studio sem nenhuma porta do Avatar para o público — e a conta da casa ainda vê;
//   (d) /ai-avatar com robots noindex (canonical mantido), fora do sitemap e do rodapé;
//   (e) o /avatar e o /api/generate-avatar seguem no ar (clonagem de voz: 5 perfis, 1 pagante) e a cobrança não mudou;
//   (f) a copy de SEO (lib/comparisons.ts executado + as fichas HeyGen/Synthesys/D-ID/Synthesia das alternativas) não
//       promete apresentador — diz "not today" e manda quem precisa de rosto ao concorrente.
// Cada bloco tem um mutante em memória que precisa ficar VERMELHO.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import { renderPage } from './preview-ux-complete.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { offlineModules } from './gpt24h-offline-support.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ) // o carregador offline resolve '@/' a partir do cwd
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const INTERNO = 'josephsskaf@gmail.com'
const PUBLICO = 'cliente.qualquer@gmail.com'

// Executa engineLaunch.ts (fonte dada) com o isInternalEmail real, sem alias.
const internal = createOfflineLoader()('lib/internalAccounts.ts')
const rodaLaunch = (src) => {
  const semImport = src.replace(/import \{ isInternalEmail \} from '@\/lib\/internalAccounts'\n/, '')
  if (semImport === src) throw new Error('engineLaunch mudou o import de internalAccounts — atualizar o guardião')
  const js = ts.transpileModule(semImport, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, isInternalEmail: internal.isInternalEmail })
  return exports
}
const LIGA = (src) => src.replace('export const AVATAR_PUBLIC = false', 'export const AVATAR_PUBLIC = true')

console.log('== (a) interruptor único, executado ==')
const launchSrc = rd('lib/engineLaunch.ts')
const L = rodaLaunch(launchSrc)
const provaA = (M) => M.AVATAR_PUBLIC === false && M.VIDEO_ENGINE_COUNT_WORD === 'Six' && M.VIDEO_ENGINE_COUNT_SENTENCE_START === 'Six' &&
  M.VIDEO_ENGINE_LIST_COPY === 'Veo 3.1, Kling 3, Kling 2.5, MiniMax H3, Seedance 1.5 and Kineo 1' && !/Avatar/.test(M.VIDEO_ENGINE_LIST_COPY)
checa('AVATAR_PUBLIC=false; contagem "Six" e lista pública sem Avatar', provaA(L))
checa('avatarVisible: público e anônimo não veem; conta da casa vê', L.avatarVisible(PUBLICO) === false && L.avatarVisible(null) === false && L.avatarVisible(undefined) === false && L.avatarVisible(INTERNO) === true)
checa('Avatar não virou pausa (pausa diria "manutenção", motivo falso) e S25 segue interno', !L.enginePaused('avatar') && !L.enginePaused('presenter') && !L.PAUSED_ENGINE_KEYS.includes('avatar') && L.S25_PUBLIC === false)
{
  const ligado = LIGA(launchSrc)
  const V = rodaLaunch(ligado)
  checa('virar o interruptor devolve "Seven" e "..., Kineo 1 and Avatar" (derivado, não digitado)', ligado !== launchSrc && V.AVATAR_PUBLIC === true && V.VIDEO_ENGINE_COUNT_WORD === 'Seven' && V.VIDEO_ENGINE_LIST_COPY === 'Veo 3.1, Kling 3, Kling 2.5, MiniMax H3, Seedance 1.5, Kineo 1 and Avatar' && V.avatarVisible(PUBLICO) === true)
  const mutante = launchSrc.replace("AVATAR_PUBLIC ? 'Seven' : 'Six'", "'Seven'")
  checa('mutante (contagem cravada "Seven") → vermelho', mutante !== launchSrc && !provaA(rodaLaunch(mutante)))
  const mutante2 = launchSrc.replace('return AVATAR_PUBLIC || isInternalEmail(email)', 'return true')
  checa('mutante (avatarVisible sempre true) → vermelho', mutante2 !== launchSrc && rodaLaunch(mutante2).avatarVisible(PUBLICO) === true)
}

console.log('== (b) catálogo lido por motor de resposta (kineoFacts → /api/facts, /llms.txt) ==')
const ENV = { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: 'true' }
const realLaunch = createOfflineLoader()('lib/engineLaunch.ts')
const provaFatos = (F) => {
  const facts = F.getKineoFacts()
  return !F.ENGINE_FACTS.some((e) => /Avatar|Presenter/i.test(e.name) || /ai-avatar/.test(e.url)) &&
    !facts.plans.some((p) => p.includes.some((line) => /Avatar|Character Lock|gesture clips|UGC product ads/.test(line))) &&
    facts.notAFit.some((n) => /does not currently offer an avatar or presenter engine/.test(n.useInstead)) &&
    !facts.notAFit.some((n) => /Kineo has an Avatar engine/.test(n.useInstead))
}
{
  const F = createOfflineLoader({ env: ENV })('lib/kineoFacts.ts')
  checa('ENGINE_FACTS, planos e "quando não usar" sem Avatar/Character Lock; frase honesta sobre apresentador', provaFatos(F))
  checa('os 6 motores do catálogo seguem com URL e crédito (nada mais saiu)', ['Kineo 1', 'Seedance 1.5', 'Kling 2.5', 'Veo 3.1', 'MiniMax H3', 'Kling 3'].every((n) => F.ENGINE_FACTS.some((e) => e.name === n && e.credits > 0 && /^https:\/\//.test(e.url))))
  const Fliga = createOfflineLoader({ env: ENV, mocks: { './engineLaunch': { ...realLaunch, AVATAR_PUBLIC: true } } })('lib/kineoFacts.ts')
  const av = Fliga.ENGINE_FACTS.find((e) => e.name === 'Avatar')
  checa('mutante (AVATAR_PUBLIC=true no import) devolve o Avatar a 110 cr com /ai-avatar → o bloco acima fica vermelho', Boolean(av) && av.credits === 110 && /\/ai-avatar$/.test(av.url) && !provaFatos(Fliga))
}
{
  const load = createOfflineLoader({ env: ENV, globals: { Response } })
  const body = await load('app/llms.txt/route.ts').GET().text()
  checa('/llms.txt real: nenhum link /ai-avatar, nenhuma linha **Avatar**, "Kineo does not currently offer"', !/ai-avatar/.test(body) && !/\*\*Avatar\*\*/.test(body) && /Kineo does not currently offer an avatar or presenter engine/.test(body))
  const F = load('lib/kineoFacts.ts')
  const fixture = { ...F, TRIAL_ACCESS: { ...F.TRIAL_ACCESS, everyEngineUnlocked: false } }
  const dormente = await createOfflineLoader({ env: ENV, globals: { Response }, mocks: { '@/lib/kineoFacts': fixture } })('app/llms.txt/route.ts').GET().text()
  checa('/llms.txt ramo dormente (trial sem todos os motores): Studio-plan sem Avatar', /Kineo 1 and Seedance 1\.5 are unlocked by plan \(Kling 2\.5, Veo 3\.1 and Kling 3 are Studio-plan engines\)/.test(dormente) && !/Kling 3 and Avatar/.test(dormente))
}

console.log('== (c) home, Studio, pricing e rodapé renderizados com o JSX real ==')
const wall = ['fast', 'cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_hollywood'].map((engine, i) => ({ id: 'w' + i, title: 'Demo ' + i, videoUrl: '/demo.mp4', engine, badge: engine.toUpperCase() }))
const home = (email) => renderPage('app/KineoLanding.tsx', false, {}, { initialEmail: email, engineWall: wall })
const conta = (html, s) => html.split(s).length - 1
const PORTAS = /href="\/avatar"|Talking Avatar|AI Presenter|Character Lock|Transparent Clips|UGC Product Ads|Talking presenters/
{
  const pub = home(null), casa = home(INTERNO)
  checa('home (visitante): 0 portas do Avatar — mega-menu, mobile, bento, 4 cards do toolkit e subtítulo', !PORTAS.test(pub))
  checa('home (visitante): o bento renderizou (5 tiles de motor) e o toolkit ficou com 4 cards', conta(pub, 'class="tile') === 5 && conta(pub, 'class="tcard"') === 4 && pub.includes('href="/animate"'))
  checa('home (visitante): FAQ diz "Six" e a lista sem Avatar', pub.includes('Six') && pub.includes('Veo 3.1, Kling 3, Kling 2.5, MiniMax H3, Seedance 1.5 and Kineo 1') && !pub.includes('Kineo 1 and Avatar'))
  checa('home (conta da casa): as 7 portas do Avatar continuam (mega, mobile, tile, 4 cards)', conta(casa, 'href="/avatar"') === 7 && conta(casa, 'class="tcard"') === 8 && casa.includes('Talking Avatar'))
  checa('home (e-mail público logado): mesmas 0 portas', !PORTAS.test(home(PUBLICO)))
}
{
  const studio = (fx) => renderPage('app/(dashboard)/studio/StudioClient.tsx', false, { demoOffer: true, demoShell: true, prompt: 'A lighthouse in a storm', balance: 100, ...fx })
  const pub = studio({ pickerOpen: true }), casa = studio({ pickerOpen: true, avatarOn: true })
  checa('Studio (público, seletor aberto): sem link "AI Presenter" e sem card Avatar', !pub.includes('href="/avatar"') && !pub.includes('Avatar Studio →') && !pub.includes('Talking AI presenter'))
  checa('Studio (conta da casa, flag avatar): link e card continuam', casa.includes('href="/avatar"') && casa.includes('Avatar Studio →') && casa.includes('Talking AI presenter'))
  checa('Studio: os motores do seletor seguem lá para o público (o card saiu, o picker não)', pub.includes('Kling 3') && pub.includes('Seedance 1.5') && pub.includes('href="/animate"'))
}
{
  const html = renderPage('app/pricing/PricingClient.tsx', false, { demoOffer: true, demoShell: true, displayCurrency: 'usd', signedIn: true })
  checa('pricing (render real): sem "AI Presenter", sem "Character Lock", sem ", Avatar" no Studio', !/AI Presenter|Character Lock|Kineo 1, Avatar/.test(html))
  checa('pricing: o resultado do Studio segue, só sem o Avatar', html.includes('Every available engine — Kling 3, Veo 3.1, Kling 2.5, MiniMax H3, Seedance 1.5, Kineo 1 — plus 2 free HD enhances'))
  // A FAQ do Autopilot hoje nem renderiza (PRICING_SHOW_AUTOPILOT=false filtra a pergunta); a frase é conferida no fonte
  // para não voltar a vender o AI Presenter no dia em que o Autopilot reaparecer.
  const pcSrc = rd('app/pricing/PricingClient.tsx')
  checa('pricing (fonte): FAQ do Autopilot, calculadora, tabela e Character Lock só com AVATAR_PUBLIC', pcSrc.includes("any engine — Seedance, Kling, Hollywood${AVATAR_PUBLIC ? ', AI Presenter' : ''} — completely separately") && pcSrc.includes("...(AVATAR_PUBLIC ? [{ ic: '🧑‍🎤', name: 'AI Presenter videos', cost: costPres }] : []),") && pcSrc.includes('{AVATAR_PUBLIC && <span>✓ Character Lock — same face in every video</span>}') && conta(pcSrc, 'AI Presenter — talking avatar') === 1 && /\.\.\.\(AVATAR_PUBLIC\s+\? \[\{\s+label: `🎬 AI Presenter — talking avatar/.test(pcSrc))
  checa('pricing: a calculadora e a tabela seguem com os motores vendidos (Kling 3 e Seedance)', html.includes('Kling 3 films · native voice &amp; lip sync') && html.includes('Kling 3 — top cinematic'))
}
{
  const ft = renderPage('components/Footer.tsx', false, {}, {})
  checa('rodapé (render real): sem link /ai-avatar; o resto do grupo Produto fica', !ft.includes('href="/ai-avatar"') && ft.includes('href="/facts"') && ft.includes('href="/viral-now"'))
}

console.log('== (d) /ai-avatar fora do índice, fora do sitemap ==')
const metadataDe = (src, avatarPublic) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9, jsx: 4 } }).outputText
  const exports = {}
  const req = (id) => id === '@/lib/engineLaunch' ? { AVATAR_PUBLIC: avatarPublic } : id === '@/lib/marketingPrice' ? { STARTER_PRICE: '$X' } : id === 'react/jsx-runtime' ? { jsx: () => null, jsxs: () => null, Fragment: 'f' } : { __esModule: true, default: () => null }
  vm.runInNewContext(js, { exports, require: req })
  return exports.metadata
}
{
  const src = rd('app/ai-avatar/page.tsx')
  const m = metadataDe(src, false), mOn = metadataDe(src, true)
  checa('/ai-avatar (metadata executado): robots noindex, follow mantido, canonical intacto', m.robots?.index === false && m.robots?.follow === true && m.alternates?.canonical === 'https://www.usekineo.com/ai-avatar')
  checa('/ai-avatar: com AVATAR_PUBLIC=true o noindex some (a página volta ao índice)', mOn.robots === undefined && mOn.alternates?.canonical === 'https://www.usekineo.com/ai-avatar')
  const mut = src.replace('...(AVATAR_PUBLIC ? {} : { robots: { index: false, follow: true } }),', '')
  checa('mutante (sem o noindex) → vermelho', mut !== src && metadataDe(mut, false).robots === undefined)
  const sm = rd('app/sitemap.ts')
  checa('sitemap: /ai-avatar só existe dentro do ramo AVATAR_PUBLIC', conta(sm, "path: '/ai-avatar'") === 1 && sm.includes("...(AVATAR_PUBLIC ? [{ path: '/ai-avatar', priority: 0.8, freq: 'weekly' as const }] : []),") && sm.includes("import { AVATAR_PUBLIC } from '@/lib/engineLaunch'"))
  const foot = rd('components/Footer.tsx')
  checa('rodapé: /ai-avatar só dentro do ramo AVATAR_PUBLIC', conta(foot, "href: '/ai-avatar'") === 1 && foot.includes("...(AVATAR_PUBLIC ? [{ href: '/ai-avatar', label: 'AI Avatar video — your face, any script' }] : []),"))
}

console.log('== (c2) superfícies lidas no fonte ==')
{
  const ph = rd('app/ph/page.tsx')
  checa('/ph: linha do Studio sem Avatar fixo (só com AVATAR_PUBLIC)', ph.includes("`Kling 3, Veo 3.1, MiniMax H3, Omni Flash${AVATAR_PUBLIC ? ', Avatar' : ''}`") && !ph.includes("'Kling 3, Veo 3.1, MiniMax H3, Omni Flash, Avatar'"))
  const shell = rd('app/(dashboard)/DashboardShell.tsx')
  checa('painel: banner "NEW — AI Avatar Video" atrás do interruptor; o componente continua existindo', shell.includes('{AVATAR_PUBLIC && <WorkspaceSecondaryNotice><AvatarLaunchBanner /></WorkspaceSecondaryNotice>}') && existsSync(join(RAIZ, 'components/AvatarLaunchBanner.tsx')))
  const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
  checa('/studio/create: as 3 ofertas do Creator não vendem mais o "AI Presenter"', !gc.includes('full AI scenes, AI Presenter, clean downloads') && !gc.includes('Full AI scenes, AI Presenter and') && !gc.includes('full AI scenes, the AI Presenter and') && gc.includes('Full AI scenes and {TIER_CREDITS.basic} credits every month.'))
  checa('/studio/create: o link de clonar voz continua indo ao /avatar, agora "Avatar Studio"', gc.includes('No clone yet? <a href="/avatar" style={{ color: \'#2997ff\', fontWeight: 700 }}>Record one in Avatar Studio →</a>') && !gc.includes('Record one in AI Presenter'))
}

console.log('== (e) o que NÃO mudou: /avatar no ar, servidor aberto, cobrança igual ==')
{
  checa('/avatar (Avatar Studio) e a clonagem de voz seguem no ar', existsSync(join(RAIZ, 'app/(dashboard)/avatar/page.tsx')) && rd('app/(dashboard)/avatar/AvatarStudioClient.tsx').includes('/api/avatar/voice') && existsSync(join(RAIZ, 'app/api/avatar/voice/route.ts')))
  const g = rd('app/api/generate-avatar/route.ts')
  checa('/api/generate-avatar sem gate do interruptor (de propósito: quem chega por link direto não vê botão que falha)', !/AVATAR_PUBLIC|avatarVisible/.test(g) && /const AVATAR_CREDIT_COST = engine === 'presenter' \? 70 : 110/.test(g))
  const cost = createOfflineLoader()('lib/credits/engineCost.ts')
  checa('biller executado: avatar 110, presenter 70 (preço e cobrança intocados)', cost.creditCostFor('avatar', true) === 110 && cost.creditCostFor('presenter', true) === 70)
  const planGate = rd('lib/enginePlanGate.ts'), wallSrc = rd('lib/engineWall.ts')
  checa('enginePlanGate e engineWall não leem o interruptor (fora do escopo desta mudança)', !/AVATAR_PUBLIC|avatarVisible/.test(planGate + wallSrc))
}
{
  // /api/me/credits real: flag `avatar` separada da `internal` (que é s25Visible).
  const rota = (email) => createOfflineLoader({ mocks: {
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    '@/lib/supabase/server': { createClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email } } }) },
      from: () => { const c = { select: () => c, eq: () => c, maybeSingle: async () => ({ data: { video_credits: 7, plan: 'Basic' } }) }; return c },
    }) },
  } })('app/api/me/credits/route.ts')
  const pub = (await rota(PUBLICO).GET()).body, casa = (await rota(INTERNO).GET()).body
  checa('/api/me/credits (executado): público avatar:false, casa avatar:true; saldo e plano intactos', pub.avatar === false && casa.avatar === true && pub.credits === 7 && pub.plan === 'basic' && pub.internal === false)
  const st = rd('app/(dashboard)/studio/StudioClient.tsx')
  checa('Studio liga o card pela flag `avatar`, nunca pela `internal` do S25', st.includes('if (alive && d?.avatar === true) setAvatarOn(true)') && !/d\?\.internal === true\) setAvatarOn/.test(st) && st.includes('{avatarOn && <Link href="/avatar">'))
}

console.log('== (f) copy de SEO/comparação sem apresentador ==')
{
  // lib/comparisons.ts EXECUTADO (TOOLS + PAIRS, o que as 8 páginas de comparação e o kineoFacts leem).
  const compSrc = readFileSync(join(RAIZ, 'lib/comparisons.ts'), 'utf8')
  const carrega = (src) => offlineModules({ replacements: { 'lib/comparisons.ts': src } })('lib/comparisons.ts')
  const provaComp = (C) => {
    const tudo = JSON.stringify(C.TOOLS) + JSON.stringify(C.PAIRS)
    const faqs = C.PAIRS.flatMap((p) => p.faq)
    const hey = C.getPair('heygen-vs-kineo')?.faq.find((f) => f.q === 'Does Kineo have avatars at all?')
    const syn = faqs.find((f) => f.q === 'Does Kineo have avatars?')
    return !/AI Presenter|presenter render type, priced/.test(tudo) && !/Presenter/.test(C.TOOLS.kineo.exportLimits) &&
      /^Not today\. .*does not currently offer an avatar or presenter render type/.test(hey?.a ?? '') &&
      /^Not today\. .*does not currently offer an avatar or presenter render type/.test(syn?.a ?? '')
  }
  const C = carrega(compSrc)
  checa('comparisons (executado): régua de créditos, linha da Kineo e as 2 FAQs sem "AI Presenter"; respostas "Not today"', provaComp(C))
  checa('comparisons: a régua segue com os motores vendidos (Kineo 1, Seedance, Kling 2.5, Kling 3)', /Kineo 1 \d+ credits, Seedance \d+, MiniMax H3 \d+, Kling 2\.5 \d+, Kling 3 \d+/.test(C.TOOLS.kineo.exportLimits))
  const mut = compSrc.split('`Kling 2.5 ${KINEO_KLING_COST}, ` +').join("`Kling 2.5 ${KINEO_KLING_COST}, AI Presenter 70, ` +")
  checa('mutante (régua volta a cobrar "AI Presenter 70") → vermelho', mut !== compSrc && !provaComp(carrega(mut)))
}
{
  // As 4 fichas da página de alternativas, isoladas como o test-synthesia-ai-answer isola a da Synthesia.
  const alt = rd('app/alternatives/[competitor]/page.tsx')
  // Comentários saem antes da checagem: o marcador da casa cita a copy antiga e não pode passar por copy publicada.
  const semComentario = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/[^\n]*$/gm, '').replace(/\s\/\/ KINEO-[^\n]*/g, '')
  const ficha = (src, ini, fim) => { const a = src.indexOf(ini), b = src.indexOf(fim, a + 1); return a > -1 && b > a ? semComentario(src.slice(a, b)) : '' }
  const fichas = (src) => ({
    heygen: ficha(src, '\n  heygen: {', '\n  pika: {'),
    synthesys: ficha(src, '\n  synthesys: {', "\n  'd-id': {"),
    did: ficha(src, "\n  'd-id': {", '\n  sendshort: {'),
    synthesia: ficha(src, '\n  synthesia: {', '\n  canva:'),
  })
  const PROMESSA = /AI Presenter|Character Lock|gesture clips|same trick|Presenter AND|optional 720p|perfect lip-sync/
  const provaAlt = (src) => {
    const f = fichas(src)
    return Object.values(f).every((b) => b.length > 200 && !PROMESSA.test(b)) &&
      /feature: 'Talking AI presenter with lip-sync \(photo \+ script\)', sfa: false/.test(f.heygen) &&
      /feature: 'Talking AI presenter with lip-sync', sfa: false/.test(f.synthesys) &&
      /feature: 'Photo \+ script → talking video with lip-sync', sfa: false/.test(f.did) &&
      /feature: 'AI presenter', sfa: 'Not offered today'/.test(f.synthesia) &&
      [f.heygen, f.synthesys, f.did].every((b) => /does not offer (an avatar or )?(a )?presenter today|does not offer a presenter/.test(b)) &&
      /No, not today\./.test(f.heygen) && /No, not today\./.test(f.did) && /No, not today\./.test(f.synthesia)
  }
  checa('alternativas: HeyGen, Synthesys, D-ID e Synthesia sem prometer apresentador; linha do presenter = não; "No, not today"', provaAlt(alt))
  checa('alternativas: a vitória honesta do concorrente segue visível (Pick HeyGen/Synthesys/D-ID if…)', alt.includes('Pick HeyGen if you need enterprise avatar libraries') && alt.includes('Pick Synthesys if you need a spokesperson on screen') && alt.includes('Pick D-ID if you need a talking face'))
  const mut = alt.replace("feature: 'Talking AI presenter with lip-sync (photo + script)', sfa: false", "feature: 'Talking AI presenter with lip-sync (photo + script)', sfa: true")
  checa('mutante (HeyGen volta a marcar presenter = sim) → vermelho', mut !== alt && !provaAlt(mut))
}

console.log(`${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
