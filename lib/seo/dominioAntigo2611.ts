// KINEO-DOMINIO-ANTIGO-2611 [CEO 26/11 10:12; dono: "não quero desistir do Google"] — a conta do Google Ads foi recusada pela 3ª vez por "Circumventing
// systems: Cloaking". Os únicos anúncios da conta são 3 antigos com o destino em shortsforgeai.com, e todo pedido a esse host levava um 308 para outro
// domínio (www.usekineo.com): "Redirecting users or crawlers … to different domains" é o exemplo de cloaking que o próprio Google escreveu.
// Regra (pura; o middleware só a aplica): nos TRÊS hosts antigos, as URLs FINAIS dos anúncios e dos sitelinks respondem 200 NO PRÓPRIO host, com o MESMO
// HTML para qualquer user-agent (nada aqui lê o user-agent), e o canonical delas continua absoluto em https://www.usekineo.com (metadata de sempre).
// O que essas páginas carregam ao abrir também fica no mesmo host: mídia e fonte da pasta public, as chamadas de API que a página faz ao abrir, e a
// pré-carga (RSC) que o <Link> do Next faz das outras páginas: todo fetch da página (Sec-Fetch-Dest: empty, cabeçalho do NAVEGADOR, não do user-agent) a
// uma página fora da lista recebe 204 no mesmo host, e o Next então abre a página por navegação normal, que leva o 308. O Next 14 APAGA o cabeçalho RSC e o
// _rsc antes do middleware (next/dist/server/web/adapter.js, FLIGHT_PARAMETERS), por isso o sinal é o Sec-Fetch-Dest. Todo o resto do host antigo segue com o 308 de hoje.
// Caminhos que já rodavam no host antigo (webhook do Stripe, /api/youtube/* com o callback do OAuth em shortsforgeai.vercel.app) ficam FORA da regra:
// null, e o middleware faz o de hoje (que já os deixa rodar no lugar).
// Voltar: HOSTS_DO_DOMINIO_ANTIGO_2611 = new Set() (o middleware volta ao 308 de tudo).
export const HOSTS_DO_DOMINIO_ANTIGO_2611: ReadonlySet<string> = new Set(['shortsforgeai.com', 'www.shortsforgeai.com', 'shortsforgeai.vercel.app'])

/** Os caminhos que já rodavam no próprio host antigo antes desta regra (middleware.ts: LEGACY_HOST_DIRECT_PATHS e LEGACY_HOST_DIRECT_PREFIXES). */
const CAMINHOS_QUE_JA_RODAVAM_NO_HOST_ANTIGO_2611 = (p: string) => p === '/api/stripe/webhook' || p.startsWith('/api/youtube/')

/** A LISTA ÚNICA das URLs finais da conta 186-928-2523, a mesma nos três hosts (lida na conta em 26/11; fotos em docs/google-ads/retirada-2611/).
 *  mostra: a página servida no próprio host a quem CHEGA. clique_vai_a_www: quem clica nesse caminho DE DENTRO da página (Sec-Fetch-Site same-origin,
 *  cabeçalho do NAVEGADOR) segue com o 308 para www.usekineo.com, porque é página de conta (cadastro, estúdio, vídeos): nenhuma sessão nem cookie
 *  nasce no host antigo. Navegador sem Sec-Fetch-Site (Safari antes de 16.4) vê a página de entrada nos dois casos. Fragmento (#how-it-works) não chega ao servidor. */
export const URLS_DA_CONTA_2611: ReadonlyArray<{ caminho: string; mostra: string; clique_vai_a_www: boolean; origem: string }> = [
  { caminho: '/', mostra: '/', clique_vai_a_www: false, origem: 'anúncio da campanha "Search - US - Launch Test" (www); sitelinks "Watch Sample Shorts" (vercel.app) e "How It Works" (vercel.app/#how-it-works)' },
  { caminho: '/pricing', mostra: '/pricing', clique_vai_a_www: false, origem: 'anúncio da campanha "Search - Vendas" (vercel.app); sitelinks "See Pricing Plans" e "7-Day Money Back" (vercel.app)' },
  { caminho: '/ai-shorts/2-clicks', mostra: '/', clique_vai_a_www: false, origem: 'caminho de EXIBIÇÃO do anúncio "Viral Shorts in 2 Clicks" (a página não existe; 404 também em www)' },
  { caminho: '/signup', mostra: '/', clique_vai_a_www: true, origem: 'URL final dos 3 anúncios REPROVADOS da campanha "ShortsForgeAI - Conversao - US" (www)' },
  { caminho: '/start', mostra: '/', clique_vai_a_www: true, origem: 'anúncio da campanha "Search - US - Free Trial" (shortsforgeai.com; o next.config leva /start a /signup no mesmo host antes do middleware)' },
  { caminho: '/generate', mostra: '/', clique_vai_a_www: true, origem: 'sitelink "Start Generating Free" (vercel.app/generate)' },
  { caminho: '/my-videos', mostra: '/', clique_vai_a_www: true, origem: 'sitelink "My Videos Library" (vercel.app/my-videos)' },
]
const URL_DA_CONTA_2611 = new Map(URLS_DA_CONTA_2611.map((u) => [u.caminho, u] as const))

/** As chamadas que essas páginas fazem ao abrir (GET, mesma origem): sem elas, o 308 para outro domínio quebra a chamada por CORS. Medidas no navegador
 *  na home e no /pricing (docs/google-ads/CONSERTO-DOMINIO-ANTIGO-2611.md). Só leitura; sem cookie de sessão no host antigo, a resposta é a de visitante. */
export const CHAMADAS_AO_ABRIR_2611: ReadonlySet<string> = new Set([
  '/api/offers/bf2026',
  '/api/offers/studio50',
  '/api/offers/offer290-rescue',
  '/api/offers/annual-welcome',
  '/api/affiliate/offer',
  '/api/stripe/checkout/resume',
  '/api/stripe/change-plan',
  '/api/kling4-trial/availability',
  '/api/kling4-paid/availability',
  '/api/stats/public',
  '/api/geo',
  '/api/consent',
])
/** As duas ESCRITAS que a página faz sozinha (POST): o rastro de evento e a escolha da faixa de consentimento. Sem elas, o POST levaria o 308 e quebraria. */
export const ESCRITAS_AO_ABRIR_2611: ReadonlySet<string> = new Set(['/api/events', '/api/consent'])

/** [revisora 2c5749dd, V1] Arquivo da página só dentro de uma pasta REAL da public que não é rota do app (lista fechada; o guardião confere contra
 *  `ls public` e `app/`). Antes, qualquer caminho com final .js/.css/.mp4 passava e rota dinâmica EXECUTAVA no host antigo (/admin/people/x.css,
 *  /api/render/x.mp4, /a/CODE.js). Ficam fora de propósito: auth, ads, kids-cartoon e trending (também são rotas do app), design e gpt (a página não pede). */
export const PASTAS_DA_PUBLIC_2611: ReadonlySet<string> = new Set([
  'previews', 'videos', 'fonts', 'sfx', 'pwa', 'home-images', 'home-mosaic', 'posters', 'screening-room', 'nav-thumbs', 'ads-exemplos', 'ads-styles', 'models', 'og',
])
/** Os dois arquivos da raiz que o navegador pede sozinho (app/favicon.ico e app/manifest.ts: estáticos). */
const ARQUIVOS_DA_RAIZ_2611: ReadonlySet<string> = new Set(['/favicon.ico', '/manifest.webmanifest'])
const FINAL_DE_ARQUIVO_2611 = /\.(?:mp4|webm|mov|mp3|wav|ogg|woff2?|ttf|otf|ico|webmanifest|css|js|avif)$/i
function arquivoDaPagina2611(p: string): boolean {
  if (ARQUIVOS_DA_RAIZ_2611.has(p)) return true
  const pasta = /^\/([a-z0-9-]+)\//.exec(p)?.[1]
  return pasta !== undefined && PASTAS_DA_PUBLIC_2611.has(pasta) && FINAL_DE_ARQUIVO_2611.test(p) && !p.includes('..') && !p.includes('%')
}

/** [revisora 2c5749dd, V2] Nenhuma sessão no host antigo: o pedido chega ao app SEM os cookies sb-* (Supabase) e a resposta os apaga (Max-Age=0).
 *  Assim nada renova, lê nem cria sessão lá (change-plan, checkout/resume?go=1, páginas). Puro: recebe o cabeçalho Cookie, devolve o novo e os nomes. */
export function semSessaoNoHostAntigo2611(cabecalhoCookie: string | null): { cookie: string | null; apagar: string[] } {
  const partes = String(cabecalhoCookie ?? '').split(';').map((p) => p.trim()).filter(Boolean)
  const nome = (p: string) => p.split('=')[0].trim()
  const apagar = partes.filter((p) => nome(p).startsWith('sb-')).map(nome)
  const ficam = partes.filter((p) => !nome(p).startsWith('sb-'))
  return { cookie: ficam.length ? ficam.join('; ') : null, apagar: [...new Set(apagar)] }
}

export type DecisaoDominioAntigo2611 =
  | { acao: 'segue' } // serve no próprio host, como em www
  | { acao: 'reescreve'; para: string } // serve outra página no próprio host
  | { acao: 'pre_carga_204' } // fetch da página (pré-carga RSC) a página fora da lista: 204 no próprio host
  | { acao: 'redireciona' } // o 308 de hoje

/** null = não é um host antigo dos anúncios (o middleware segue como hoje). Nunca lê user-agent. */
export function decidirDominioAntigo2611(a: { host: string; pathname: string; method: string; buscaDaPagina: boolean; doProprioSite?: boolean }): DecisaoDominioAntigo2611 | null {
  if (!HOSTS_DO_DOMINIO_ANTIGO_2611.has(String(a.host ?? '').toLowerCase())) return null
  if (CAMINHOS_QUE_JA_RODAVAM_NO_HOST_ANTIGO_2611(a.pathname)) return null
  const metodo = String(a.method ?? '').toUpperCase()
  if (metodo === 'POST' && ESCRITAS_AO_ABRIR_2611.has(a.pathname)) return { acao: 'segue' }
  if (metodo !== 'GET' && metodo !== 'HEAD') return { acao: 'redireciona' }
  const url = URL_DA_CONTA_2611.get(a.pathname)
  if (url !== undefined) {
    if (a.doProprioSite === true && url.clique_vai_a_www) return a.buscaDaPagina ? { acao: 'pre_carga_204' } : { acao: 'redireciona' }
    return url.mostra === a.pathname ? { acao: 'segue' } : { acao: 'reescreve', para: url.mostra }
  }
  if (CHAMADAS_AO_ABRIR_2611.has(a.pathname) || arquivoDaPagina2611(a.pathname)) return { acao: 'segue' }
  if (a.buscaDaPagina) return { acao: 'pre_carga_204' }
  return { acao: 'redireciona' }
}
