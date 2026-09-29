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
//   (f2) REVISÃO 2: /best-ai-shorts-generators (render real) e a página do Kling 3 (Character Lock) sem apresentador;
//   (g)  REVISÃO 2: o bento da home fecha a grade — JSX real + cascata real do <style> da página + auto-placement,
//        nenhuma célula vazia de 1440px a 320px, para 5 motores (visitante), 6 (casa) e qualquer contagem de 1 a 9.
// Cada bloco tem um mutante em memória que precisa ficar VERMELHO.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
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
// Reancorado 29/09 (KINEO-KINEO1-FORA-2026-09-29): o Kineo 1 também saiu do catálogo (KINEO1_PUBLIC=false), então a
// contagem é "Five" e ligar só o Avatar devolve "Six" com "... Seedance 1.5 and Avatar". O que se vigia é o mesmo:
// Avatar fora, e o interruptor o traz de volta por derivação, nunca por número digitado.
const provaA = (M) => M.AVATAR_PUBLIC === false && M.VIDEO_ENGINE_COUNT_WORD === 'Five' && M.VIDEO_ENGINE_COUNT_SENTENCE_START === 'Five' &&
  M.VIDEO_ENGINE_LIST_COPY === 'Veo 3.1, Kling 3, Kling 2.5, MiniMax H3 and Seedance 1.5' && !/Avatar/.test(M.VIDEO_ENGINE_LIST_COPY)
checa('AVATAR_PUBLIC=false; contagem "Five" e lista pública sem Avatar', provaA(L))
checa('avatarVisible: público e anônimo não veem; conta da casa vê', L.avatarVisible(PUBLICO) === false && L.avatarVisible(null) === false && L.avatarVisible(undefined) === false && L.avatarVisible(INTERNO) === true)
checa('Avatar não virou pausa (pausa diria "manutenção", motivo falso) e S25 segue interno', !L.enginePaused('avatar') && !L.enginePaused('presenter') && !L.PAUSED_ENGINE_KEYS.includes('avatar') && L.S25_PUBLIC === false)
{
  const ligado = LIGA(launchSrc)
  const V = rodaLaunch(ligado)
  checa('virar o interruptor devolve "Six" e "... Seedance 1.5 and Avatar" (derivado, não digitado)', ligado !== launchSrc && V.AVATAR_PUBLIC === true && V.VIDEO_ENGINE_COUNT_WORD === 'Six' && V.VIDEO_ENGINE_LIST_COPY === 'Veo 3.1, Kling 3, Kling 2.5, MiniMax H3, Seedance 1.5 and Avatar' && V.avatarVisible(PUBLICO) === true)
  // 29/09: a contagem virou o tamanho da lista derivada; o mutante crava a contagem na palavra antiga.
  const mutante = launchSrc.replace('export const VIDEO_ENGINE_COUNT_WORD: string = ENGINE_COUNT_WORDS[PUBLIC_VIDEO_ENGINE_NAMES.length]', "export const VIDEO_ENGINE_COUNT_WORD: string = 'Seven'")
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
  // 29/09 (KINEO-KINEO1-FORA-2026-09-29): sem o tile do Kineo 1 o visitante vê 4 motores no bento.
  checa('home (visitante): o bento renderizou (4 tiles de motor) e o toolkit ficou com 4 cards', conta(pub, 'class="tile') === 4 && conta(pub, 'class="tcard"') === 4 && pub.includes('href="/animate"'))
  // 29/09 (KINEO-KINEO1-FORA): "Five" e a lista sem Kineo 1 nem Avatar.
  checa('home (visitante): FAQ diz "Five" e a lista sem Avatar', pub.includes('Five') && pub.includes('Veo 3.1, Kling 3, Kling 2.5, MiniMax H3 and Seedance 1.5') && !pub.includes('and Avatar'))
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
  // Reancorado 29/09 (KINEO-ENTRADA-SEEDANCE15, E2b): o Kineo 1 também saiu da /pricing (trava j do E1); o Avatar segue fora.
  checa('pricing: o resultado do Studio segue, só sem o Avatar', html.includes('Every available engine — Kling 3, Veo 3.1, Kling 2.5, MiniMax H3, Seedance 1.5 — plus 2 free HD enhances'))
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

// ═══ REVISÃO 2 (28/09) — as sobras que o revisor achou com a integração rodando ═══════════════════════════════════
console.log('== (f2) sobras públicas do apresentador: /best-ai-shorts-generators e a página do Kling 3 ==')
{
  // A página renderizada com o JSX real (React clássico; filhos de @/app e @/components viram null — a ficha da Kineo
  // é texto da própria página). Era a ÚNICA superfície pública não travada que ainda dizia "add a talking AI Presenter".
  const requireNode = createRequire(import.meta.url)
  const React = requireNode('react')
  const { renderToStaticMarkup } = requireNode('react-dom/server')
  const realLaunch = createOfflineLoader()('lib/engineLaunch.ts')
  const melhores = (launchMock = null) => {
    const cache = new Map()
    const load = (file) => {
      if (cache.has(file)) return cache.get(file)
      const js = ts.transpileModule(readFileSync(join(RAIZ, file), 'utf8'), { compilerOptions: { module: 1, jsx: ts.JsxEmit.React, target: 9, esModuleInterop: true } }).outputText
      const box = { exports: {} }
      cache.set(file, box.exports)
      const shim = (id) => {
        if (id === 'react') return React
        if (id === 'next/link') return { __esModule: true, default: ({ children, prefetch, ...p }) => React.createElement('a', p, children) }
        if (id === '@/lib/engineLaunch' && launchMock) return launchMock
        if (id.startsWith('@/app/') || id.startsWith('@/components/')) return { __esModule: true, default: () => null }
        const base = id.startsWith('@/') ? id.slice(2) : id.startsWith('.') ? join(dirname(file), id).split('\\').join('/') : null
        if (!base) return requireNode(id)
        for (const ext of ['.ts', '.tsx']) if (existsSync(join(RAIZ, base + ext))) return load(base + ext)
        throw new Error('import inesperado em ' + file + ': ' + id)
      }
      vm.runInNewContext(js, { module: box, exports: box.exports, require: shim, React, process: { env: {} }, URL, URLSearchParams, console: { log() {}, warn() {}, error() {} }, Intl, Date, Math, JSON })
      cache.set(file, box.exports)
      return box.exports
    }
    return renderToStaticMarkup(React.createElement(load('app/best-ai-shorts-generators/page.tsx').default))
  }
  const pub = melhores()
  const fichaKineo = (html) => { const i = html.indexOf('Kineo turns a single typed topic'); return i >= 0 ? html.slice(i, html.indexOf('does not try to be a general editor', i) + 40) : '' }
  checa('/best-ai-shorts-generators (render real): a ficha da Kineo não vende "AI Presenter" e diz que não há apresentador hoje', fichaKineo(pub).length > 200 && !/AI Presenter/.test(pub) && fichaKineo(pub).includes('It does not offer an AI presenter or avatar today'))
  checa('/best-ai-shorts-generators: o resto da ficha segue (roteiro próprio e vários motores) e o HeyGen continua como escolha honesta de rosto', fichaKineo(pub).includes('paste your own script or choose among several video engines') && pub.includes('If you need a talking presenter on screen, HeyGen is built for that'))
  const liga = melhores({ ...realLaunch, AVATAR_PUBLIC: true })
  checa('/best-ai-shorts-generators: virar AVATAR_PUBLIC devolve "add a talking AI Presenter" (derivado, não digitado)', fichaKineo(liga).includes('choose among several video engines or add a talking AI Presenter') && !fichaKineo(liga).includes('does not offer an AI presenter'))
  // A página do Kling 3 (lib/growth/enginePageCatalog, lida por /ai-video-generator/kling-3, /facts e o hub) prometia
  // "Yes. Character Lock saves a presenter" — ferramenta do Avatar Studio, fora do catálogo junto com o Avatar.
  const ENV_CAT = { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: 'true' }
  const catalogo = (mock) => createOfflineLoader({ env: ENV_CAT, mocks: mock ? { '@/lib/engineLaunch': mock } : {} })('lib/growth/enginePageCatalog.ts')
  const C = catalogo()
  const faqK3 = C.ENGINES['kling-3']?.faq ?? []
  checa('página do Kling 3 (executada): nenhuma página de motor promete Character Lock/AI Presenter; a FAQ diz o que o motor faz e "not part of the catalogue today"', Object.keys(C.ENGINES).length >= 6 && !/Character Lock|AI Presenter/.test(JSON.stringify(C.ENGINES)) && faqK3.length === 3 && faqK3.some((f) => /one portrait of the character/.test(f.a) && /not part of the catalogue today/.test(f.a)))
  const Con = catalogo({ ...realLaunch, AVATAR_PUBLIC: true })
  checa('página do Kling 3: com AVATAR_PUBLIC=true a resposta do Character Lock volta', (Con.ENGINES['kling-3']?.faq ?? []).some((f) => f.a.startsWith('Yes. Character Lock saves a presenter')))
}

console.log('== (g) bento da home completo: o JSX real, a cascata real, nenhuma célula vazia em nenhuma largura ==')
{
  // O CASO (revisão 2): sem o tile do Avatar, o visitante vê 5 motores num grid de 3 colunas (e de 2 até 700px) — a
  // última fileira ficava com um buraco. Contar "5 tiles" (bloco c) ficava verde com o buraco na tela.
  // A PROVA: renderiza a home com o JSX real, lê o <style> que a própria página injeta, monta a cascata (postcss +
  // postcss-selector-parser: mídia, especificidade, ordem, :last-child/:nth-child) para o .bento e cada .tile, e
  // simula o auto-placement do grid (esparso, por fileira). Vazias = colunas × fileiras − soma dos spans.
  const VAZIOS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
  const dom = (html) => {
    const raiz = { tag: '#root', attrs: {}, classes: [], children: [], parent: null }
    let atual = raiz
    let i = 0
    while (i < html.length) {
      const lt = html.indexOf('<', i)
      if (lt < 0) break
      if (html.startsWith('<!--', lt)) { const f = html.indexOf('-->', lt); i = f < 0 ? html.length : f + 3; continue }
      let gt = lt + 1
      let aspas = null
      for (; gt < html.length; gt++) { const ch = html[gt]; if (aspas) { if (ch === aspas) aspas = null } else if (ch === '"' || ch === "'") aspas = ch; else if (ch === '>') break }
      const dentro = html.slice(lt + 1, gt)
      i = gt + 1
      if (dentro.startsWith('!')) continue
      if (dentro.startsWith('/')) { const nome = dentro.slice(1).trim().toLowerCase(); let n = atual; while (n && n.tag !== nome) n = n.parent; if (n && n.parent) atual = n.parent; continue }
      const tag = (/^([a-zA-Z][\w:-]*)/.exec(dentro) ?? [null, ''])[1].toLowerCase()
      const attrs = {}
      for (const m of dentro.slice(tag.length).matchAll(/([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[m[1].toLowerCase()] = (m[2] ?? m[3] ?? m[4] ?? '').replace(/&amp;/g, '&')
      const el = { tag, attrs, classes: (attrs.class ?? '').split(/\s+/).filter(Boolean), children: [], parent: atual }
      atual.children.push(el)
      const fecha = dentro.endsWith('/') || VAZIOS.has(tag)
      if (!fecha && (tag === 'style' || tag === 'script')) { const f = html.indexOf(`</${tag}`, i); el.text = html.slice(i, f); i = html.indexOf('>', f) + 1; continue }
      if (!fecha) atual = el
    }
    return raiz
  }
  const acha = (no, fn, out = []) => { for (const c of no.children) { if (fn(c)) out.push(c); acha(c, fn, out) } return out }
  const irmaos = (el) => (el.parent ? el.parent.children : [el])
  const nth = (expr, pos) => {
    const e = String(expr).replace(/\s+/g, '').toLowerCase()
    if (e === 'odd') return pos % 2 === 1
    if (e === 'even') return pos % 2 === 0
    if (/^[+-]?\d+$/.test(e)) return pos === Number(e)
    const m = /^([+-]?\d*)n([+-]\d+)?$/.exec(e)
    if (!m) throw new Error('nth não suportado: ' + expr)
    const a = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : Number(m[1])
    const b = Number(m[2] ?? 0)
    if (a === 0) return pos === b
    const k = (pos - b) / a
    return Number.isInteger(k) && k >= 0
  }
  const DINAMICAS = new Set([':hover', ':focus', ':focus-visible', ':focus-within', ':active', ':visited', ':target', ':checked', ':disabled', ':placeholder-shown', ':invalid', ':link', ':any-link'])
  const PSEUDO_ELEMENTO = /^::|^:(before|after|first-line|first-letter)$/i
  const temPseudoElemento = (sel) => sel.nodes.some((n) => n.type === 'pseudo' && PSEUDO_ELEMENTO.test(n.value))
  const casaComposto = (el, partes) => partes.every((p) => {
    if (p.type === 'class') return el.classes.includes(p.value)
    if (p.type === 'tag') return el.tag === p.value.toLowerCase()
    if (p.type === 'universal') return true
    if (p.type === 'id') return el.attrs.id === p.value
    if (p.type === 'attribute') {
      const v = el.attrs[p.attribute.toLowerCase()]
      if (v === undefined) return false
      if (!p.operator) return true
      if (p.operator === '=') return v === p.value
      if (p.operator === '^=') return v.startsWith(p.value)
      if (p.operator === '$=') return v.endsWith(p.value)
      if (p.operator === '*=') return v.includes(p.value)
      if (p.operator === '~=') return v.split(/\s+/).includes(p.value)
      throw new Error('atributo não suportado: ' + String(p))
    }
    if (p.type === 'pseudo') {
      const nome = p.value.toLowerCase()
      const irm = irmaos(el)
      const pos = irm.indexOf(el) + 1
      if (nome === ':last-child') return pos === irm.length
      if (nome === ':first-child') return pos === 1
      if (nome === ':only-child') return irm.length === 1
      if (nome === ':nth-child') return nth(String(p.nodes[0]), pos)
      if (nome === ':nth-last-child') return nth(String(p.nodes[0]), irm.length - pos + 1)
      if (nome === ':not') return !p.nodes.some((s) => casaSeletor(el, s))
      if (nome === ':is' || nome === ':where') return p.nodes.some((s) => casaSeletor(el, s))
      if (DINAMICAS.has(nome)) return false
      throw new Error('pseudo não suportado: ' + nome)
    }
    throw new Error('nó de seletor não suportado: ' + p.type)
  })
  function casaSeletor(el, sel) {
    const comps = [[]]
    const combs = []
    for (const n of sel.nodes) {
      if (n.type === 'combinator') { combs.push(n.value.trim() || ' '); comps.push([]) } else if (n.type !== 'comment') comps[comps.length - 1].push(n)
    }
    const casa = (e, i) => {
      if (!casaComposto(e, comps[i])) return false
      if (i === 0) return true
      const c = combs[i - 1]
      if (c === '>') return !!e.parent && e.parent.tag !== '#root' && casa(e.parent, i - 1)
      if (c === ' ') { for (let a = e.parent; a && a.tag !== '#root'; a = a.parent) if (casa(a, i - 1)) return true; return false }
      const irm = irmaos(e)
      const k = irm.indexOf(e)
      if (c === '+') return k > 0 && casa(irm[k - 1], i - 1)
      if (c === '~') return irm.slice(0, k).some((x) => casa(x, i - 1))
      throw new Error('combinador não suportado: ' + c)
    }
    return casa(el, comps.length - 1)
  }
  const cmp = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
  const especificidade = (sel) => {
    let e = [0, 0, 0]
    for (const n of sel.nodes) {
      if (n.type === 'id') e[0]++
      else if (n.type === 'class' || n.type === 'attribute') e[1]++
      else if (n.type === 'tag') e[2]++
      else if (n.type === 'pseudo') {
        const nome = n.value.toLowerCase()
        if (PSEUDO_ELEMENTO.test(nome)) e[2]++
        else if (nome === ':where') { /* especificidade 0 */ } else if (nome === ':not' || nome === ':is') { const m = n.nodes.map(especificidade).reduce((a, b) => (cmp(a, b) >= 0 ? a : b), [0, 0, 0]); e = [e[0] + m[0], e[1] + m[1], e[2] + m[2]] } else e[1]++
      }
    }
    return e
  }
  // Mídia: true/false/null (null = não sei avaliar — só pode existir longe dos elementos medidos, senão lança).
  const midia = (params, w) => {
    const q = params.split(',').map((consulta) => {
      const termos = consulta.trim().toLowerCase().split(/\s+and\s+/).map((bruto) => {
        const t = bruto.trim()
        if (t === 'screen' || t === 'all' || t === 'only screen') return true
        if (t === 'print') return false
        let m = /^\(\s*max-width\s*:\s*(\d+(?:\.\d+)?)px\s*\)$/.exec(t)
        if (m) return w <= Number(m[1])
        m = /^\(\s*min-width\s*:\s*(\d+(?:\.\d+)?)px\s*\)$/.exec(t)
        if (m) return w >= Number(m[1])
        return null
      })
      return termos.includes(false) ? false : termos.includes(null) ? null : true
    })
    return q.includes(true) ? true : q.includes(null) ? null : false
  }
  const regrasDe = (css) => {
    const regras = []
    const coleta = (no, medias) => no.each((f) => {
      if (f.type === 'rule') {
        let seletores = null
        try { seletores = selectorParser().astSync(f.selector).nodes } catch { seletores = null }
        regras.push({ seletores, texto: f.selector, medias, decls: (f.nodes ?? []).filter((d) => d.type === 'decl').map((d) => ({ prop: d.prop.toLowerCase(), value: d.value.trim(), important: !!d.important })) })
      } else if (f.type === 'atrule') {
        const nome = f.name.toLowerCase()
        if (nome === 'media') coleta(f, [...medias, f.params])
        else if (nome === 'supports') coleta(f, [...medias, '@supports ' + f.params])
      }
    })
    coleta(postcss.parse(css), [])
    return regras
  }
  const valores = (regras, el, props, w) => {
    const cands = []
    regras.forEach((r, ordem) => {
      const rel = r.decls.filter((d) => props.includes(d.prop))
      if (!rel.length) return
      let ok = true
      for (const m of r.medias) { const v = m.startsWith('@supports') ? null : midia(m, w); if (v === false) return; if (v === null) ok = null }
      if (!r.seletores) throw new Error('seletor que o parser recusou declara ' + rel.map((d) => d.prop).join(',') + ': ' + r.texto)
      let melhor = null
      for (const s of r.seletores) if (!temPseudoElemento(s) && casaSeletor(el, s)) { const e = especificidade(s); if (!melhor || cmp(e, melhor) > 0) melhor = e }
      if (!melhor) return
      if (ok === null) throw new Error('mídia não avaliável numa regra que acerta o elemento: ' + r.medias.join(' | '))
      for (const d of rel) cands.push({ ...d, spec: melhor, ordem })
    })
    for (const par of (el.attrs.style ?? '').split(';')) {
      const k = par.indexOf(':')
      if (k > 0) { const prop = par.slice(0, k).trim().toLowerCase(); if (props.includes(prop)) cands.push({ prop, value: par.slice(k + 1).replace(/!important/i, '').trim(), important: /!important/i.test(par), spec: [1e9, 0, 0], ordem: 1e9 }) }
    }
    const out = {}
    for (const p of props) {
      const cs = cands.filter((c) => c.prop === p).sort((x, y) => (Number(x.important) - Number(y.important)) || cmp(x.spec, y.spec) || (x.ordem - y.ordem))
      out[p] = cs.length ? cs[cs.length - 1].value : null
    }
    return out
  }
  const trilhas = (v) => {
    const toks = []
    let prof = 0
    let cur = ''
    for (const ch of v) { if (ch === '(') prof++; if (ch === ')') prof--; if (/\s/.test(ch) && prof === 0) { if (cur) toks.push(cur); cur = '' } else cur += ch }
    if (cur) toks.push(cur)
    let n = 0
    for (const t of toks) {
      const m = /^repeat\((.*)\)$/i.exec(t)
      if (m) { const k = m[1].indexOf(','); const vezes = m[1].slice(0, k).trim(); if (!/^\d+$/.test(vezes)) throw new Error('repeat não numérico: ' + t); n += Number(vezes) * trilhas(m[1].slice(k + 1).trim()) } else if (!/^\[.*\]$/.test(t)) n++
    }
    return n
  }
  const COLUNA = ['grid-column', 'grid-column-start', 'grid-column-end', 'grid-area', 'grid-row', 'grid-row-start', 'grid-row-end']
  const GRID = ['display', 'grid-template-columns', 'grid-auto-flow', 'grid-template', 'grid']
  const spanDe = (v, cols) => {
    if (v === null || v === 'auto') return 1
    const m = /^span\s+(\d+)$/.exec(v)
    if (m) return Number(m[1])
    if (/^1\s*\/\s*-1$/.test(v)) return cols
    throw new Error('grid-column não suportado: ' + v)
  }
  /** Mede o bento da seção .home-engines (ou uma cópia dele com `k` tiles) numa largura de viewport. */
  const mede = (arv, regras, w, k = null) => {
    const secao = acha(arv, (e) => e.classes.includes('home-engines'))[0]
    const bento = secao ? acha(secao, (e) => e.classes.includes('bento'))[0] : null
    if (!bento) throw new Error('bento da home não achado')
    const salvo = bento.children
    const tiles = k === null ? salvo : Array.from({ length: k }, (_, i) => ({ ...salvo[i % salvo.length], parent: bento, children: [] }))
    bento.children = tiles
    try {
      const g = valores(regras, bento, GRID, w)
      if (g['grid-template'] || g.grid) throw new Error('grid/grid-template no bento: medir à mão')
      const cols = trilhas(g['grid-template-columns'] ?? 'none')
      const spans = tiles.map((t) => {
        const v = valores(regras, t, COLUNA, w)
        for (const p of COLUNA.slice(1)) if (v[p] !== null && v[p] !== 'auto') throw new Error(`${p} no tile: medir à mão`)
        return spanDe(v['grid-column'], cols)
      })
      let fileira = 0
      let col = 0
      let excesso = 0
      for (const s of spans) { if (s > cols) excesso++; const ss = Math.min(s, cols); if (col + ss > cols) { fileira++; col = 0 } col += ss }
      const fileiras = spans.length ? fileira + 1 : 0
      const vazias = fileiras * cols - spans.reduce((a, s) => a + Math.min(s, cols), 0)
      return { display: g.display, fluxo: g['grid-auto-flow'], cols, tiles: tiles.length, spans, fileiras, vazias, excesso, todosTiles: tiles.every((t) => t.classes.includes('tile')) }
    } finally { bento.children = salvo }
  }
  const cssDa = (arv) => acha(arv, (e) => e.tag === 'style').map((e) => e.text ?? '').join('\n')
  const LARGURAS = [1440, 1280, 1001, 1000, 901, 900, 701, 700, 600, 561, 560, 381, 380, 360, 320]
  const esperado = (w) => (w > 700 ? 3 : w > 380 ? 2 : 1)
  const pubArv = dom(home(null))
  const casaArv = dom(home(INTERNO))
  const cssPub = cssDa(pubArv)
  const regras = regrasDe(cssPub)
  const regrasCasa = regrasDe(cssDa(casaArv))
  const m1440 = mede(pubArv, regras, 1440)
  // 29/09 (KINEO-KINEO1-FORA-2026-09-29): o tile do Kineo 1 saiu para o visitante — 4 tiles; a casa segue com 6.
  checa(`denominador: o <style> real da home tem ${regras.length} regras (≥ 300) e o .bento tem 4 filhos .tile (visitante) / 6 (casa)`, regras.length >= 300 && m1440.tiles === 4 && m1440.todosTiles && mede(casaArv, regrasCasa, 1440).tiles === 6)
  const colunasVistas = LARGURAS.map((w) => mede(pubArv, regras, w).cols)
  checa(`a cascata lê os três degraus do grid (colunas por largura: ${colunasVistas.join(',')}) e o bento é grid esparso`, LARGURAS.every((w, i) => colunasVistas[i] === esperado(w)) && LARGURAS.every((w) => { const m = mede(pubArv, regras, w); return m.display === 'grid' && (m.fluxo === null || m.fluxo === 'row') }))
  for (const [quem, arv, rs] of [['visitante (4 motores)', pubArv, regras], ['conta da casa (6 motores)', casaArv, regrasCasa]]) {
    const ruins = LARGURAS.map((w) => ({ w, ...mede(arv, rs, w) })).filter((m) => m.vazias !== 0 || m.excesso !== 0)
    checa(`home ${quem}: nenhuma célula vazia e nenhuma coluna implícita em ${LARGURAS.length} larguras (falhas: ${ruins.map((m) => `${m.w}px ${m.cols}col spans ${m.spans.join('+')} → ${m.vazias} vazia(s)`).slice(0, 3).join(' | ') || 'nenhuma'})`, ruins.length === 0)
  }
  const genericos = []
  for (let k = 1; k <= 9; k++) for (const w of [1440, 700, 380]) { const m = mede(pubArv, regras, w, k); if (m.vazias !== 0 || m.excesso !== 0) genericos.push(`${k} tiles @${w}px → ${m.vazias}`) }
  checa(`a regra é da contagem, não do 5: 1 a 9 tiles em 3, 2 e 1 coluna fecham a grade (falhas: ${genericos.slice(0, 3).join(' | ') || 'nenhuma'})`, genericos.length === 0)
  // MUTANTE: o CSS de antes (sem as regras do último tile) — o buraco tem de voltar nas duas larguras do revisor.
  const semConserto = cssPub.replace(/\.klp \.home-engines \.bento > \.tile:last-child:nth-child\([^)]*\) \{[^}]*\}/g, '')
  const rm = regrasDe(semConserto)
  // 29/09: o visitante tem 4 tiles (par em 2 colunas); o mutante mede a grade com 5 tiles, o caso do revisor.
  checa('mutante (CSS sem o conserto): o buraco volta — 1 célula vazia em 3 colunas (1440px) e em 2 colunas (700px)', semConserto !== cssPub && mede(pubArv, rm, 1440, 5).vazias === 1 && mede(pubArv, rm, 700, 5).vazias === 1)
}

console.log(`${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
