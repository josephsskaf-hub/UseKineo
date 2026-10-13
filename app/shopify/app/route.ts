// KINEO-SHOPIFY-2026-10-13 — a tela EMBUTIDA do app (App URL no painel da Shopify = https://www.usekineo.com/shopify/app).
//
// Por que um Route Handler com HTML e não uma página React: a tela vive num iframe do admin da Shopify e precisa de (1) o
// cabeçalho frame-ancestors POR LOJA, (2) o App Bridge carregado ANTES de qualquer outro script (exigência 2.2.3) e (3) nada
// do layout do site (menu, rodapé, vitrine). Sem dependência nova: App Bridge e Polaris (web components) vêm do CDN da Shopify.
//
// ORDEM DAS TRAVAS: interruptor (404) → credenciais (503) → loja pela regex (400) → se veio `hmac` (abertura pelo admin), ele
// TEM de bater (401) → HTML. Os dados (produtos) só saem por /api/shopify/products com o token de sessão do App Bridge.
// O HTML não carrega segredo nenhum: o client id (shopify-api-key) é público por definição.
//
// A tela: lista os produtos (foto, título), busca por título e o botão "Make a 15-second ad" → POST /api/shopify/ads → abre o
// Studio Ads numa aba nova com o link do produto. Todo texto que vem da loja entra por textContent (nunca innerHTML).
import { NextRequest, NextResponse } from 'next/server'
import { escapeHtml, frameAncestors, normalizeShop, readShopifyCreds, shopifyAppLive, shopifyNotFound, verifyOAuthQueryHmac } from '@/lib/shopify/core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function page(apiKey: string, shop: string): string {
  const authUrl = `/api/shopify/auth?${new URLSearchParams({ shop }).toString()}`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="shopify-api-key" content="${escapeHtml(apiKey)}">
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
<script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
<title>Kineo Ads</title>
<style>
  body{margin:0;background:#f1f1f1;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#303030}
  .k-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:12px}
  .k-card{background:#fff;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 0 rgba(0,0,0,.08)}
  .k-card img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px;background:#e3e3e3}
  .k-ph{width:100%;aspect-ratio:1/1;border-radius:8px;background:#e3e3e3}
  .k-title{font-weight:600;font-size:14px;line-height:1.3;min-height:36px}
  .k-note{font-size:13px;color:#616161;margin:8px 0}
  .k-err{font-size:13px;color:#8e1f0b;margin:8px 0}
</style>
</head>
<body>
<s-page heading="Product video ads">
  <s-section heading="Pick a product">
    <p class="k-note">Choose a product and Kineo makes a 15-second video ad from its photos — voice, music and on-screen text included.</p>
    <s-text-field id="k-q" label="Search products" placeholder="Search by title"></s-text-field>
    <div id="k-msg" class="k-note">Loading products…</div>
    <div id="k-list" class="k-grid"></div>
    <div style="margin-top:12px"><s-button id="k-more" hidden>Load more</s-button></div>
  </s-section>
</s-page>
<script>
(function () {
  var AUTH_URL = ${JSON.stringify(authUrl)};
  var list = document.getElementById('k-list');
  var msg = document.getElementById('k-msg');
  var more = document.getElementById('k-more');
  var q = document.getElementById('k-q');
  var next = null;
  var query = '';
  function say(text, isError) { msg.textContent = text || ''; msg.className = isError ? 'k-err' : 'k-note'; }
  async function api(path, opts) {
    opts = opts || {};
    var token = await shopify.idToken();
    var headers = Object.assign({}, opts.headers || {}, { Authorization: 'Bearer ' + token });
    if (opts.body) headers['content-type'] = 'application/json';
    var res = await fetch(path, Object.assign({}, opts, { headers: headers }));
    var data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (res.status === 401 && data && data.error === 'reauthorize') { window.open(AUTH_URL, '_top'); }
    return { ok: res.ok, status: res.status, data: data || {} };
  }
  function card(p) {
    var el = document.createElement('div'); el.className = 'k-card';
    if (p.image) { var img = document.createElement('img'); img.src = p.image; img.alt = p.alt || p.title || ''; img.loading = 'lazy'; el.appendChild(img); }
    else { var ph = document.createElement('div'); ph.className = 'k-ph'; el.appendChild(ph); }
    var t = document.createElement('div'); t.className = 'k-title'; t.textContent = p.title || 'Untitled product'; el.appendChild(t);
    var b = document.createElement('s-button'); b.setAttribute('variant', 'primary');
    if (!p.published) { b.setAttribute('disabled', ''); b.textContent = 'Publish to your store first'; }
    else { b.textContent = 'Make a 15-second ad'; b.addEventListener('click', function () { makeAd(p, b); }); }
    el.appendChild(b);
    return el;
  }
  async function makeAd(p, b) {
    b.setAttribute('loading', ''); say('Opening Kineo Studio Ads…');
    var r = await api('/api/shopify/ads', { method: 'POST', body: JSON.stringify({ product_id: p.id }) });
    b.removeAttribute('loading');
    if (r.ok && r.data.url) { window.open(r.data.url, '_blank'); say('Studio Ads opened in a new tab with this product\\'s photos.'); return; }
    say(r.data.error === 'product_not_public' ? 'This product is not on your online store yet — publish it first.' : 'Could not open the ad maker. Try again in a moment.', true);
  }
  async function load(reset) {
    if (reset) { list.textContent = ''; next = null; }
    say('Loading products…');
    var path = '/api/shopify/products?' + new URLSearchParams(Object.assign({}, next ? { after: next } : {}, query ? { q: query } : {})).toString();
    var r = await api(path);
    if (!r.ok) { say(r.status === 401 ? 'Reconnecting to your store…' : 'Could not load products. Try again in a moment.', true); return; }
    var ps = r.data.products || [];
    ps.forEach(function (p) { list.appendChild(card(p)); });
    next = r.data.next || null;
    if (next) more.removeAttribute('hidden'); else more.setAttribute('hidden', '');
    say(list.children.length ? '' : 'No products found.');
  }
  more.addEventListener('click', function () { load(false); });
  var timer = null;
  q.addEventListener('input', function (e) { clearTimeout(timer); var v = (e.target && e.target.value) || ''; timer = setTimeout(function () { query = String(v).trim(); load(true); }, 350); });
  load(true);
})();
</script>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  if (!shopifyAppLive()) return shopifyNotFound()
  const creds = readShopifyCreds()
  if (!creds) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  const q = req.nextUrl.searchParams
  const shop = normalizeShop(q.get('shop'))
  if (!shop) return NextResponse.json({ error: 'invalid_shop' }, { status: 400 })
  if (q.has('hmac') && !verifyOAuthQueryHmac(q, creds.apiSecret)) return NextResponse.json({ error: 'invalid_hmac' }, { status: 401 })
  return new NextResponse(page(creds.apiKey, shop), {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': frameAncestors(shop) },
  })
}
