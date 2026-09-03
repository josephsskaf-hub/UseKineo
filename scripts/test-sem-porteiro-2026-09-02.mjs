// ═══ KINEO-SEM-PORTEIRO-2026-09-02 ════════════════════════════════════════
// O fundador viu o "Open the generator" da home abrir a página antiga por
// alguns segundos antes de cair no Studio. A causa: o botão apontava para
// /generate, que desde 24/08 não é mais uma página — é um PORTEIRO
// `force-dynamic` que só decide o destino e redireciona. Cada clique fazia
// DUAS viagens ao servidor, e no meio delas o cliente ficava olhando a URL
// velha achando que o site tinha travado.
//
// A correção NÃO é matar o porteiro — ele tem que continuar de pé, porque
// todo e-mail já enviado (resgate de render órfão, campanhas, links no inbox
// das pessoas) aponta para /generate e não pode quebrar nunca. A correção é
// os NOSSOS botões pararem de passar por ele.
//
// A REGRA, que é a mesma que o porteiro aplica hoje:
//   · link SEM query  → /studio
//   · link COM query  → /studio/create?<a mesma query, intacta>
// Assim o destino final é byte-a-byte o mesmo; o que some é a viagem extra.
import { readFileSync, existsSync } from 'node:fs'
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
let ok = 0, fail = 0
const check = (n, c) => { c ? (ok++, console.log('  ok  ' + n)) : (fail++, console.log('  FAIL ' + n)) }

const porteiro = src('app/(dashboard)/generate/page.tsx')
const landing = src('app/KineoLanding.tsx')
const sucesso = src('app/checkout/success/page.tsx')
const cancelado = src('app/checkout/cancelled/page.tsx')
const avatarLanding = src('components/AvatarLandingClient.tsx')
const avatarBanner = src('components/AvatarLaunchBanner.tsx')
const pricingCards = src('components/PricingCards.tsx')
const pricingClient = src('app/pricing/PricingClient.tsx')
const hist = src('app/(dashboard)/history/HistoryClient.tsx')
const meus = src('app/(dashboard)/my-videos/MyVideosClient.tsx')
const create = src('app/(dashboard)/create/CreateClient.tsx')
const autopilot = src('app/(dashboard)/autopilot/AutopilotClient.tsx')

console.log('1 · o porteiro CONTINUA de pé (link no inbox de cliente não quebra)')
check('/generate ainda existe como rota', existsSync(new URL('../app/(dashboard)/generate/page.tsx', import.meta.url)))
check('ele ainda redireciona, sem query → /studio · com query → /studio/create', porteiro.includes("redirect(query ? `/studio/create?${query}` : '/studio')"))
check('ele ainda repassa a query INTEIRA (não enumera chaves)', porteiro.includes('for (const [rawKey, rawValue] of Object.entries(searchParams ?? {}))'))
check('o destino real existe', existsSync(new URL('../app/(dashboard)/studio/create/page.tsx', import.meta.url)))

console.log('2 · o botão que o fundador viu quebrado')
check('bento da home vai DIRETO ao destino final', landing.includes("'/studio/create?src=engine_bento'"))
check('e não passa mais pelo porteiro', !landing.includes("'/generate?src=engine_bento'"))
check('o caminho de quem NÃO está logado ficou intocado (signup)', landing.includes("'/signup?utm_source=engine_bento'"))
check('a razão está escrita no código, não só no commit', landing.includes('KINEO-SEM-PORTEIRO-2026-09-02'))

console.log('3 · pós-pagamento (o pior lugar possível para uma tela lenta)')
check('checkout/success: primeiro clique pós-compra é direto', sucesso.includes('/studio/create?create_intent=fast&prompt=') && !sucesso.includes('/generate?create_intent=fast'))
check('checkout/success: o link sem query vai para /studio', !sucesso.includes('href="/generate"'))
check('checkout/cancelled: idem', !cancelado.includes('href="/generate"'))

console.log('4 · avatar (landing própria + banner)')
// O caminho antigo sobrevive DE PROPÓSITO dentro dos comentários que explicam
// a mudança — quem abrir o arquivo daqui a três meses precisa saber o que
// estava escrito antes e por que mudou. A prova então olha só para o código.
// (Esta verificação já pagou por si: a v1 reprovou o AvatarLaunchBanner, e o
// href estava certo — o errado era o comentário do topo, que continuava
// dizendo "Links to /generate?avatar=1". Um comentário que mente sobre o
// destino do botão é exatamente o tipo de coisa que faz o próximo leitor
// procurar defeito no lugar errado.)
const semComentario = (f) =>
  f.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
check('AvatarLandingClient: 3 CTAs diretos, com o avatar=1 preservado', avatarLanding.split('href="/studio/create?avatar=1').length === 4 && !semComentario(avatarLanding).includes('/generate?avatar=1'))
check('AvatarLaunchBanner: idem', avatarBanner.includes('href="/studio/create?avatar=1"') && !semComentario(avatarBanner).includes('/generate?avatar=1'))

console.log('5 · preço (a página que o comprador lê antes de decidir)')
check('PricingCards sem porteiro', !pricingCards.includes('href="/generate"'))
check('PricingClient sem porteiro', !pricingClient.includes('href="/generate"'))

console.log('6 · telas de dentro (mesma latência, mesmo conserto)')
check('history', !hist.includes('href="/generate"'))
check('my-videos', !meus.includes('href="/generate"'))
check('create: o "refazer este vídeo" leva o prompt intacto', create.includes('/studio/create?prompt=${encodeURIComponent(video.videoPrompt || video.title)}&autoanalyze=1') && !create.includes('/generate?prompt='))
check('autopilot', !autopilot.includes('href="/generate"'))

console.log('7 · invariante: nenhum arquivo tocado sobrou com o porteiro no href')
const tocados = { landing, sucesso, cancelado, avatarLanding, avatarBanner, pricingCards, pricingClient, hist, meus, create, autopilot }
for (const [nome, txt] of Object.entries(tocados)) {
  check(`${nome}: nenhum href para /generate`, !/href=\{?[`'"]\/generate/.test(txt))
}

console.log('8 · a regra do porteiro, aplicada à mão, dá o mesmo destino')
const destino = (href) => {
  const [, q = ''] = href.split('?')
  return q ? `/studio/create?${q}` : '/studio'
}
check('/generate?src=engine_bento → /studio/create?src=engine_bento', destino('/generate?src=engine_bento') === '/studio/create?src=engine_bento')
check('/generate?avatar=1 → /studio/create?avatar=1', destino('/generate?avatar=1') === '/studio/create?avatar=1')
check('/generate (sem query) → /studio', destino('/generate') === '/studio')

console.log('9 · RODADA 2 — o que a primeira varredura deixou passar')
// CONFISSÃO ÚTIL, para o próximo que ler este arquivo: a rodada 1 procurou por
// `href="/generate"` e achou 15 pontos. O fundador clicou, viu o problema
// continuar, e estava certo — sobravam 21. Nenhum deles usa `href=` literal:
// vivem em router.push, em ternário dentro de variável, em `action=` de
// formulário e em redirect() de servidor. Procurar pela SINTAXE do link em vez
// de pela STRING do caminho é o erro que custou uma rodada inteira.
const dashboardPage = src('app/(dashboard)/dashboard/page.tsx')
const homeForm = src('app/HomeTopicForm.tsx')
const signup = src('app/(auth)/signup/page.tsx')
const pill = src('components/ActiveRenderPill.tsx')
const onboarding = src('components/OnboardingPanel.tsx')
check('SALTO TRIPLO morto: /dashboard ia para /generate, que ia para /studio', dashboardPage.includes("redirect('/studio')") && !dashboardPage.includes("redirect('/generate')"))
check('CTA final da home ("Create a video") vai direto', landing.includes("isSignedIn ? '/studio' :"))
check('o formulário da home manda o tema direto', homeForm.includes("action={isSignedIn ? '/studio/create' : '/signup'}") && homeForm.includes("destination: '/studio/create'"))
check('primeiro clique de conta NOVA não passa pelo porteiro', signup.includes("`/studio/create?${activationParams.toString()}`") && signup.includes("useState('/studio/create?welcome=1')"))
check('pílula de render ativo aponta para o destino real', pill.includes('`/studio/create?${new URLSearchParams({'))
check('painel de onboarding reconhece o endereço NOVO da tela de criar', onboarding.includes("pathname?.startsWith('/studio/create')"))
check('prova social volta a aparecer na tela de criar', src('components/SocialProofToast.tsx').includes("'/studio'"))
check('banner de indicação volta a ser suprimido na tela de criar', src('components/ReferralPromoBanner.tsx').includes("'/studio'"))
check('o shell sabe o título da tela nova', src('app/(dashboard)/DashboardShell.tsx').includes("'/studio/create': 'Generate New Short'"))

console.log('9b · RODADA 3 (03/09) — os 20 que o fio de alarme achou')
// Não foi a rodada 2 que achou estes: foi a VARREDURA da seção 10, na primeira
// vez que rodou. É exatamente para isso que ela existe — e é por isso que ela
// vale mais que qualquer lista feita à mão.
check('PWA instalado abria no porteiro (manifest start_url)', src('app/manifest.ts').includes("start_url: '/studio'"))
check('e-mail de boas-vindas NOVO aponta direto (os antigos seguem pelo porteiro)', src('app/api/send-welcome/route.ts').includes("'/studio/create?welcome=1'"))
check('fallback de redirect pós-login', src('lib/authRedirect.ts').includes("fallback = '/studio'"))
check('pós-checkout self-serve (tipo E valor)', !src('lib/growth/checkoutSuccessFlow.ts').includes("'/generate'"))
check('erro de checkout de pacote volta para /studio', src('app/api/stripe/checkout/route.ts').includes("destination: '/studio' | '/pricing' = '/studio'"))
// CONFLITO DE 03/09 12:51 — enquanto eu editava FreeHookClient.tsx, o Codex o
// reescreveu na main para usar o helper hookActivationHref(). Resolução: ficar
// com a versão da main no cliente e corrigir o /generate DENTRO do helper novo.
check('3 ferramentas gratuitas de SEO (script, saashub, produto)', ['app/free-script-generator/FreeScriptClient.tsx', 'app/from-saashub/SaaSHubBridgeClient.tsx', 'lib/growth/productToVideo.ts'].every((f) => src(f).includes('/studio/create')))
check('hook: o cliente usa o helper da main, e o helper vai direto', src('app/free-hook-generator/FreeHookClient.tsx').includes('hookActivationHref(') && src('lib/growth/answerEngineHookWorkbench.ts').includes('/studio/create?'))
check('5 helpers de crescimento (série, remix, comentário, brief, plano)', ['lib/seriesContinuation.ts', 'lib/growth/exampleRemix.ts', 'lib/growth/commentToVideo.ts', 'lib/growth/clientShortBrief.ts', 'lib/growth/businessContentPlan.ts'].every((f) => src(f).includes('/studio/create?')))
check('a lista de afiliados JÁ conhecia /studio/create (não precisou mexer)', src('lib/affiliateFirstClick.ts').includes("'/studio/create',"))

console.log('10 · FIO DE ALARME — varredura do repositório inteiro')
// Esta é a verificação que vale mais que todas as outras juntas: em vez de eu
// lembrar de cada arquivo, ela ANDA na árvore e reprova qualquer caminho
// /generate novo que apareça em código. Sem ela, o próximo botão criado daqui
// a um mês nasce passando pelo porteiro outra vez e ninguém percebe.
import { readdirSync, statSync } from 'node:fs'
const RAIZ = new URL('../', import.meta.url)
// Lista de exceções, cada uma com o motivo escrito. Não cresça esta lista sem
// justificar: cada nome novo aqui é um pedaço do site que volta a ter a
// viagem extra.
const PERMITIDOS = new Set([
  'app/(dashboard)/generate/page.tsx',   // é o PORTEIRO em si — tem que existir
  'app/(dashboard)/v2/page.tsx',         // texto explicativo que cita a rota de propósito
  '_success_page_backup.tsx',            // arquivo morto, fora da árvore de build
  // Os cinco abaixo NÃO são links: são checagens de caminho (o componente
  // pergunta "estou na tela de criar?"). Todos citam /generate porque o
  // porteiro ainda existe, e todos já foram atualizados para reconhecer
  // /studio também — é isso que a seção 9 verifica, um por um.
  'components/ActiveRenderPill.tsx',
  'components/OnboardingPanel.tsx',
  'components/SocialProofToast.tsx',
  'components/ReferralPromoBanner.tsx',
  'app/(dashboard)/DashboardShell.tsx',
  // Rodada 3 (03/09) — o fio de alarme achou mais 20 arquivos. Dois deles são
  // LISTAS DE CAMINHO, não links, e /generate tem que continuar nelas:
  'app/robots.ts',              // DISALLOW: o porteiro não deve ser indexado
  'lib/affiliateFirstClick.ts', // allow-list de destinos que preservam o cookie
])
const semComment = (f) => f.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
const acharArquivos = (dir, acc = []) => {
  for (const nome of readdirSync(dir)) {
    if (nome === 'node_modules' || nome === '.next' || nome === '.git' || nome === 'docs' || nome === 'scripts') continue
    const caminho = new URL(nome + '/', dir)
    const alvo = new URL(nome, dir)
    try {
      if (statSync(alvo).isDirectory()) acharArquivos(caminho, acc)
      else if (/\.tsx?$/.test(nome)) acc.push(alvo)
    } catch { /* link quebrado, ignora */ }
  }
  return acc
}
const reincidentes = []
for (const arq of acharArquivos(RAIZ)) {
  const rel = decodeURIComponent(arq.pathname.replace(RAIZ.pathname, ''))
  if (PERMITIDOS.has(rel)) continue
  const corpo = semComment(readFileSync(arq, 'utf8').replace(/\r\n/g, '\n'))
  // Só interessa /generate em posição de CAMINHO (aspas ou crase na frente).
  if (/['"`]\/generate(\?|['"`])/.test(corpo)) reincidentes.push(rel)
}
check(
  reincidentes.length === 0
    ? 'nenhum arquivo do repositório manda o cliente pelo porteiro'
    : `arquivos ainda mandando pelo porteiro: ${reincidentes.join(', ')}`,
  reincidentes.length === 0,
)

console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
