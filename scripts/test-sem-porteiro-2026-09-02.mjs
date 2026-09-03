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

console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
