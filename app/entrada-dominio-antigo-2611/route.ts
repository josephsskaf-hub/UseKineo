// KINEO-DOMINIO-ANTIGO-2611 [CEO 26/11 11:15, opção B] — a página de entrada dos hosts antigos (shortsforgeai.com, www.shortsforgeai.com,
// shortsforgeai.vercel.app). O middleware reescreve para cá as 7 URLs finais da conta do Google Ads (lib/seo/dominioAntigo2611.ts); pedida direto,
// esta rota dá 404 em qualquer host.
// Por que um Route Handler com HTML próprio, e não uma página do app: o layout raiz carrega scripts, provedores, banners e o modal de login.
// Aqui a resposta é a MESMA para todo pedido (só a query de chegada passa para os botões): sem formulário, sem modal, sem Supabase, sem compra,
// sem script nenhum, sem redirecionamento automático. Os botões são links ABSOLUTOS para www.usekineo.com; sair do host antigo é um clique.
// Textos: fatos de lib/brandIdentity.ts e lib/kineoFacts.ts (PRODUCT), sem preço. A troca de nome é de 30/06/2026 (commits "rebrand Kineo 30/06").
import { BRAND_URL } from '@/lib/brandIdentity'
import { PRODUCT } from '@/lib/kineoFacts'

export const dynamic = 'force-dynamic'

const CAPAS_2611 = [
  '/posters/04189a48-45f7-45f4-b98c-27832702e837.jpg',
  '/posters/26d25419-6719-47ab-b24b-df214e007fbd.jpg',
  '/posters/33249fbf-57b6-47cf-8486-88bfb2a02db1.jpg',
] as const

const escapa = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** Link absoluto para www.usekineo.com com a query de chegada (gclid, utm…). Puro e exportado para o guardião. */
export function linkParaKineo2611(caminho: string, busca: string): string {
  const url = new URL(caminho, BRAND_URL)
  new URLSearchParams(busca).forEach((valor, chave) => url.searchParams.append(chave, valor))
  return url.toString()
}

/** O HTML da página de entrada. Puro e exportado para o guardião: depende só da query de chegada. */
export function htmlDaEntrada2611(busca: string): string {
  const link = (caminho: string) => escapa(linkParaKineo2611(caminho, busca))
  const capas = CAPAS_2611.map((src) => `<img src="${src}" alt="A video made with Kineo" width="240" height="427" loading="lazy">`).join('')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ShortsForgeAI is now Kineo</title>
<meta name="description" content="ShortsForgeAI was renamed Kineo on June 30, 2026. Same product, same team, now at usekineo.com.">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${escapa(BRAND_URL)}/">
<style>
@font-face{font-family:Manrope;src:url(/fonts/manrope-v23/latin.woff2) format("woff2");font-weight:200 800;font-display:swap}
:root{--bg:#000;--card:#161618;--text:#f5f5f7;--muted:#86868b;--border:#2a2a2d;--accent:#2997ff;--btn-bg:#f5f5f7;--btn-text:#000;color-scheme:dark}
@media (prefers-color-scheme: light){:root{--bg:#fff;--card:#f5f5f7;--text:#1d1d1f;--muted:#6e6e73;--border:#d2d2d7;--accent:#0071e3;--btn-bg:#1d1d1f;--btn-text:#fff;color-scheme:light}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:Manrope,Arial,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased}
main{max-width:1040px;margin:0 auto;padding:56px 16px 64px}
.marca{font-weight:700;letter-spacing:-.01em;font-size:20px;margin:0 0 48px}
.selo{display:inline-block;border:1px solid var(--border);border-radius:999px;padding:6px 14px;font-size:13px;color:var(--muted);margin:0 0 20px}
h1{font-size:clamp(34px,6vw,60px);line-height:1.05;letter-spacing:-.03em;font-weight:600;margin:0 0 20px}
.lead{font-size:clamp(17px,2.2vw,21px);color:var(--muted);max-width:720px;margin:0 0 32px}
.lead strong{color:var(--text);font-weight:600}
.botoes{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 56px}
.botao{display:inline-block;text-decoration:none;border-radius:999px;padding:13px 24px;font-size:15px;font-weight:600;border:1px solid var(--border);color:var(--text)}
.botao.principal{background:var(--btn-bg);color:var(--btn-text);border-color:var(--btn-bg)}
.colunas{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start}
h2{font-size:22px;letter-spacing:-.01em;font-weight:600;margin:0 0 16px}
ul{margin:0;padding:0;list-style:none}
li{padding:12px 0;border-top:1px solid var(--border);color:var(--muted)}
li strong{color:var(--text);font-weight:600}
.capas{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.capas img{width:100%;height:auto;aspect-ratio:9/16;object-fit:cover;border-radius:14px;background:var(--card);display:block}
.conta{margin:48px 0 0;padding:20px 24px;border:1px solid var(--border);border-radius:16px;background:var(--card)}
.conta p{margin:0}
footer{margin:48px 0 0;font-size:13px;color:var(--muted)}
footer a{color:var(--accent);text-decoration:none}
@media (max-width:720px){main{padding-top:32px}.marca{margin-bottom:32px}.colunas{grid-template-columns:1fr}.botao{flex:1 1 auto;text-align:center}}
</style>
</head>
<body>
<main>
<p class="marca">Kineo</p>
<p class="selo">Formerly ShortsForgeAI</p>
<h1>ShortsForgeAI is now Kineo.</h1>
<p class="lead">On June 30, 2026, ShortsForgeAI was renamed <strong>Kineo</strong>. It is the same product from the same team, and it now lives at <strong>usekineo.com</strong>.</p>
<p class="botoes">
<a class="botao principal" href="${link('/signup')}">Create an account</a>
<a class="botao" href="${link('/login')}">Log in</a>
<a class="botao" href="${link('/pricing')}">See plans</a>
<a class="botao" href="${link('/')}">Go to usekineo.com</a>
</p>
<div class="colunas">
<section>
<h2>What Kineo does</h2>
<ul>
<li>${escapa(PRODUCT.oneLiner)}</li>
<li><strong>Start from a sentence.</strong> Type a topic or paste a script; no existing footage is needed.</li>
<li><strong>Any frame.</strong> ${escapa(PRODUCT.aspectRatio)}.</li>
<li><strong>Finished file.</strong> ${escapa(PRODUCT.watermarkPolicy)}</li>
<li><strong>Yours to keep.</strong> You own the videos you generate.</li>
</ul>
</section>
<section>
<h2>Made with Kineo</h2>
<div class="capas">${capas}</div>
</section>
</div>
<div class="conta"><p><strong>Already had a ShortsForgeAI account?</strong> Your account and plan are at usekineo.com.</p></div>
<footer>Kineo · <a href="${link('/')}">usekineo.com</a></footer>
</main>
</body>
</html>
`
}

function responder(request: Request, comCorpo: boolean): Response {
  const busca = new URL(request.url).search
  const html = htmlDaEntrada2611(busca)
  return new Response(comCorpo ? html : null, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
  })
}

export function GET(request: Request): Response {
  return responder(request, true)
}

export function HEAD(request: Request): Response {
  return responder(request, false)
}
