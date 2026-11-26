// KINEO-DOMINIO-ANTIGO-2611 [CEO 26/11 10:12; dono: "não quero desistir do Google"] — a conta do Google Ads foi recusada pela 3ª vez por "Circumventing
// systems: Cloaking". Os únicos anúncios da conta são 3 antigos com o destino em shortsforgeai.com, e todo pedido a esse host levava um 308 para outro
// domínio (www.usekineo.com): "Redirecting users or crawlers … to different domains" é o exemplo de cloaking que o próprio Google escreveu.
// Regra (pura; o middleware só a aplica): nos hosts shortsforgeai.com e www.shortsforgeai.com, as PÁGINAS DOS ANÚNCIOS respondem 200 NO PRÓPRIO host, com o
// MESMO HTML para qualquer user-agent (nada aqui lê o user-agent), e o canonical delas continua absoluto em https://www.usekineo.com (metadata de sempre).
// O que essas páginas carregam ao abrir também fica no mesmo host: mídia e fonte da pasta public, as chamadas de API que a página faz ao abrir, e a
// pré-carga (RSC) que o <Link> do Next faz das outras páginas: todo fetch da página (Sec-Fetch-Dest: empty, cabeçalho do NAVEGADOR, não do user-agent) a
// uma página fora da lista recebe 204 no mesmo host, e o Next então abre a página por navegação normal, que leva o 308. O Next 14 APAGA o cabeçalho RSC e o
// _rsc antes do middleware (next/dist/server/web/adapter.js, FLIGHT_PARAMETERS), por isso o sinal é o Sec-Fetch-Dest. Todo o resto do host antigo segue com o 308 de hoje.
// [CEO 26/11 10:36] As URLs FINAIS lidas na conta (coluna "URL final", 26/11 10:38): www.shortsforgeai.com/signup (os 3 reprovados), shortsforgeai.com/start,
// www.shortsforgeai.com e shortsforgeai.vercel.app/pricing (campanhas removidas). [CEO 26/11] shortsforgeai.vercel.app fica FORA por ora (segue como hoje; para incluí-lo, basta pô-lo no Set abaixo:
// os 6 sitelinks da conta apontam para ele, ver docs/google-ads/INVENTARIO-DOMINIO-ANTIGO-2611.md). "/signup" e "/start" mostram a home
// (entrar e cadastrar continuam sendo um clique que leva a www.usekineo.com; nenhum cookie de sessão nasce no host antigo). O webhook do Stripe e o
// /api/youtube/* do vercel.app seguem como hoje: o middleware nem chama a regra nesses caminhos (runsOnLegacyHost).
// Voltar: HOSTS_DO_DOMINIO_ANTIGO_2611 = new Set() (o middleware volta ao 308 de tudo).
export const HOSTS_DO_DOMINIO_ANTIGO_2611: ReadonlySet<string> = new Set(['shortsforgeai.com', 'www.shortsforgeai.com'])

/** As páginas de destino dos anúncios, e o que cada uma mostra. "/ai-shorts/2-clicks" é o caminho de EXIBIÇÃO de um dos anúncios; a página não existe
 *  (404 também em www.usekineo.com), então mostra a home, a mesma que o anúncio sempre levou. */
export const PAGINAS_DOS_ANUNCIOS_2611: ReadonlyMap<string, string> = new Map([
  ['/', '/'],
  ['/pricing', '/pricing'],
  ['/ai-shorts/2-clicks', '/'],
  ['/signup', '/'], // URL final dos 3 anúncios reprovados: a home, sem o formulário de cadastro no host antigo
  ['/start', '/'], // URL final de um anúncio antigo (o next.config já leva /start a /signup no mesmo host antes do middleware)
])

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

/** As duas URLs finais que são de CADASTRO: quem CHEGA nelas (do anúncio, do robô, digitando: Sec-Fetch-Site cross-site, none ou ausente) vê a home no
 *  próprio host; quem CLICA "Sign up" dentro da própria página (Sec-Fetch-Site same-origin, cabeçalho do NAVEGADOR) segue com o 308 para
 *  www.usekineo.com/signup, senão o botão de cadastro voltaria à home. Navegador sem Sec-Fetch-Site (Safari antes de 16.4) vê a home nos dois casos. */
export const ENTRADAS_DE_CADASTRO_2611: ReadonlySet<string> = new Set(['/signup', '/start'])

/** Arquivos da pasta public que o matcher do middleware não exclui (o matcher já deixa _next, imagens e a fonte manrope fora). */
const ARQUIVO_DA_PAGINA_2611 = /\.(?:mp4|webm|mov|mp3|wav|ogg|woff2?|ttf|otf|ico|webmanifest|css|js|avif)$/i

export type DecisaoDominioAntigo2611 =
  | { acao: 'segue' } // serve no próprio host, como em www
  | { acao: 'reescreve'; para: string } // serve outra página no próprio host
  | { acao: 'pre_carga_204' } // fetch da página (pré-carga RSC) a página fora da lista: 204 no próprio host
  | { acao: 'redireciona' } // o 308 de hoje

/** null = não é um host antigo dos anúncios (o middleware segue como hoje). Nunca lê user-agent. */
export function decidirDominioAntigo2611(a: { host: string; pathname: string; method: string; buscaDaPagina: boolean; doProprioSite?: boolean }): DecisaoDominioAntigo2611 | null {
  if (!HOSTS_DO_DOMINIO_ANTIGO_2611.has(String(a.host ?? '').toLowerCase())) return null
  const metodo = String(a.method ?? '').toUpperCase()
  if (metodo === 'POST' && ESCRITAS_AO_ABRIR_2611.has(a.pathname)) return { acao: 'segue' }
  if (metodo !== 'GET' && metodo !== 'HEAD') return { acao: 'redireciona' }
  if (a.doProprioSite === true && ENTRADAS_DE_CADASTRO_2611.has(a.pathname)) return a.buscaDaPagina ? { acao: 'pre_carga_204' } : { acao: 'redireciona' }
  const pagina = PAGINAS_DOS_ANUNCIOS_2611.get(a.pathname)
  if (pagina !== undefined) return pagina === a.pathname ? { acao: 'segue' } : { acao: 'reescreve', para: pagina }
  if (CHAMADAS_AO_ABRIR_2611.has(a.pathname) || ARQUIVO_DA_PAGINA_2611.test(a.pathname)) return { acao: 'segue' }
  if (a.buscaDaPagina) return { acao: 'pre_carga_204' }
  return { acao: 'redireciona' }
}
