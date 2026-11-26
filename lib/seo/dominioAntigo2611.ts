// KINEO-DOMINIO-ANTIGO-2611 [CEO 26/11 10:12; dono: "não quero desistir do Google"] — a conta do Google Ads 186-928-2523 foi suspensa por
// "Circumventing systems: Cloaking". Toda URL final da conta (6 anúncios em 4 campanhas e 6 sitelinks) está num domínio antigo, e todo pedido a esses
// domínios levava um 308 para outro domínio (www.usekineo.com): "Redirecting users or crawlers … to different domains" é o exemplo de cloaking que o
// próprio Google escreveu. A conta suspensa não deixa remover nem editar nada (dono e sessão Claude tentaram em 26/11).
//
// Regra (pura; o middleware só a aplica) — decisão da CEO 26/11 11:15, opção B, depois da revisora 2c5749dd:
// nos TRÊS hosts antigos, as 7 URLs finais da conta respondem SEMPRE 200, no próprio host, com a MESMA página de entrada
// (app/entrada-dominio-antigo-2611/route.ts: HTML estático que diz que o ShortsForgeAI agora é Kineo, com botões ABSOLUTOS para www.usekineo.com;
// sem formulário, modal, sessão, compra, script ou redirecionamento automático). A decisão usa só HOST, CAMINHO e MÉTODO: nunca cabeçalho do
// navegador, nunca user-agent. Tudo o mais no host antigo segue com o 308 de hoje para www.usekineo.com.
// Fora da regra (null; o middleware faz o de hoje): /api/stripe/webhook e /api/youtube/* (callback do OAuth registrado em shortsforgeai.vercel.app).
// Voltar: HOSTS_DO_DOMINIO_ANTIGO_2611 = new Set() (o middleware volta ao 308 de tudo).
export const HOSTS_DO_DOMINIO_ANTIGO_2611: ReadonlySet<string> = new Set(['shortsforgeai.com', 'www.shortsforgeai.com', 'shortsforgeai.vercel.app'])

/** A rota interna da página de entrada. Só é servida por reescrita do middleware nos hosts antigos; pedida direto, em qualquer host, dá 404. */
export const ROTA_DA_ENTRADA_2611 = '/entrada-dominio-antigo-2611' as const

/** Os caminhos que já rodavam no próprio host antigo antes desta regra (middleware.ts: LEGACY_HOST_DIRECT_PATHS e LEGACY_HOST_DIRECT_PREFIXES). */
const CAMINHOS_QUE_JA_RODAVAM_NO_HOST_ANTIGO_2611 = (p: string) => p === '/api/stripe/webhook' || p.startsWith('/api/youtube/')

/** A LISTA ÚNICA das URLs finais da conta 186-928-2523, a mesma nos três hosts (lida na conta em 26/11; fotos em docs/google-ads/retirada-2611/).
 *  Fragmento (#how-it-works) não chega ao servidor: é "/". */
export const URLS_DA_CONTA_2611: ReadonlyArray<{ caminho: string; origem: string }> = [
  { caminho: '/', origem: 'anúncio da campanha "ShortsForgeAI - Search - US - Launch Test" (www); sitelinks "Watch Sample Shorts" e "How It Works" (vercel.app, /#how-it-works)' },
  { caminho: '/pricing', origem: 'anúncio da campanha "ShortsForgeAI - Search - Vendas" (vercel.app); sitelinks "See Pricing Plans" e "7-Day Money Back" (vercel.app)' },
  { caminho: '/ai-shorts/2-clicks', origem: 'caminho de EXIBIÇÃO do anúncio "Viral Shorts in 2 Clicks" (a página não existe; 404 também em www)' },
  { caminho: '/signup', origem: 'URL final dos 3 anúncios REPROVADOS da campanha "ShortsForgeAI - Conversao - US" (www)' },
  { caminho: '/start', origem: 'anúncio da campanha "ShortsForgeAI - Search - US - Free Trial" (shortsforgeai.com; o redirect do next.config para /signup pula os hosts antigos)' },
  { caminho: '/generate', origem: 'sitelink "Start Generating Free" (vercel.app/generate)' },
  { caminho: '/my-videos', origem: 'sitelink "My Videos Library" (vercel.app/my-videos)' },
]
const CAMINHOS_DA_CONTA_2611: ReadonlySet<string> = new Set(URLS_DA_CONTA_2611.map((u) => u.caminho))

/** [revisora 2c5749dd, V2] Nenhuma sessão no host antigo: o pedido chega ao app SEM os cookies sb-* (Supabase) e a resposta os apaga (Max-Age=0).
 *  Puro: recebe o cabeçalho Cookie, devolve o novo e os nomes a apagar. */
export function semSessaoNoHostAntigo2611(cabecalhoCookie: string | null): { cookie: string | null; apagar: string[] } {
  const partes = String(cabecalhoCookie ?? '').split(';').map((p) => p.trim()).filter(Boolean)
  const nome = (p: string) => p.split('=')[0].trim()
  const apagar = partes.filter((p) => nome(p).startsWith('sb-')).map(nome)
  const ficam = partes.filter((p) => !nome(p).startsWith('sb-'))
  return { cookie: ficam.length ? ficam.join('; ') : null, apagar: [...new Set(apagar)] }
}

export type DecisaoDominioAntigo2611 =
  | { acao: 'entrada' } // a página de entrada, 200, no próprio host
  | { acao: 'redireciona' } // o 308 de hoje para www.usekineo.com

/** null = não é um host antigo, ou é um caminho que já rodava lá (o middleware segue como hoje). Lê só host, caminho e método. */
export function decidirDominioAntigo2611(a: { host: string; pathname: string; method: string }): DecisaoDominioAntigo2611 | null {
  if (!HOSTS_DO_DOMINIO_ANTIGO_2611.has(String(a.host ?? '').toLowerCase())) return null
  if (CAMINHOS_QUE_JA_RODAVAM_NO_HOST_ANTIGO_2611(a.pathname)) return null
  const metodo = String(a.method ?? '').toUpperCase()
  if ((metodo === 'GET' || metodo === 'HEAD') && CAMINHOS_DA_CONTA_2611.has(a.pathname)) return { acao: 'entrada' }
  return { acao: 'redireciona' }
}
