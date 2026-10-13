// KINEO-SHOPIFY-2026-10-13 — a tela EMBUTIDA do app (App URL no painel da Shopify = https://www.usekineo.com/shopify/app).
//
// Por que um Route Handler com HTML e não uma página React: a tela vive num iframe do admin da Shopify e precisa de (1) o
// cabeçalho frame-ancestors POR LOJA, (2) o App Bridge carregado ANTES de qualquer outro script (exigência 2.2.3) e (3) nada
// do layout do site (menu, rodapé, vitrine). Sem dependência nova: App Bridge e Polaris (web components) vêm do CDN da Shopify.
//
// ORDEM DAS TRAVAS: interruptor (404) → credenciais (503) → loja pela regex (400) → se veio `hmac` (abertura pelo admin), ele
// TEM de bater (401) → HTML. Os dados só saem pelas rotas /api/shopify/* com o token de sessão do App Bridge.
// O HTML não carrega segredo nenhum: o client id (shopify-api-key) é público por definição.
//
// ETAPA 2 (requisito 2.2.2 — o anúncio nasce DENTRO do admin; a etapa 1 abria o site numa aba nova): a tela mostra o plano e o
// saldo da conta Kineo da loja (/api/shopify/account; o botão "Plans" abre a página de planos da Shopify App Pricing no topo),
// lista os produtos, e para o produto escolhido: nível + estilo → "Write my ad" (POST /api/shopify/ads action plan: o texto e o
// custo ANTES de gastar) → "Generate" (action start; sem saldo num plano pago, o botão diz o preço do anúncio extra, US$ 7) →
// andamento (/api/shopify/ads/status a cada 6 s) → o MP4 do nosso storage tocando ali mesmo + "Download MP4" + (opcional, só com
// os escopos opcionais pedidos no clique) "Add to product page". Todo texto que vem da loja ou do servidor entra por
// textContent (nunca innerHTML).
// Acréscimos do fundador (13/10, "tudo sim"): o plano aparece com a promessa dele (Starter = "A new ad for your product every
// week", Business = "12 ads a month", Free = 1 amostra; nada de "unlimited"); lembrete semanal DENTRO do app ("Your weekly ad is
// ready to make", sem e-mail); o anúncio pronto leva o rótulo "Made with AI"; depois do 1º anúncio entregue, um cartão discreto
// de avaliação (só com SHOPIFY_APP_STORE_URL; nenhum incentivo oferecido — regra da Shopify).
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
  .k-bar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
  .k-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:12px}
  .k-card{background:#fff;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 0 rgba(0,0,0,.08)}
  .k-card img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px;background:#e3e3e3}
  .k-ph{width:100%;aspect-ratio:1/1;border-radius:8px;background:#e3e3e3}
  .k-title{font-weight:600;font-size:14px;line-height:1.3;min-height:36px}
  .k-note{font-size:13px;color:#616161;margin:8px 0}
  .k-err{font-size:13px;color:#8e1f0b;margin:8px 0}
  .k-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
  .k-opt{border:1px solid #c9cccf;border-radius:10px;padding:8px 12px;background:#fff;cursor:pointer;font-size:13px}
  .k-opt[aria-pressed="true"]{border-color:#005bd3;box-shadow:0 0 0 1px #005bd3}
  .k-opt[disabled]{opacity:.45;cursor:not-allowed}
  .k-script{background:#fff;border-radius:10px;padding:12px;font-size:14px;line-height:1.45;white-space:pre-wrap}
  .k-video{width:100%;max-width:360px;aspect-ratio:9/16;background:#000;border-radius:12px}
  select{font-size:13px;padding:6px 8px;border-radius:8px;border:1px solid #c9cccf}
</style>
</head>
<body>
<s-page heading="Product video ads">
  <s-section>
    <div class="k-bar">
      <div><strong id="k-plan">Loading your plan…</strong> <span id="k-credits" class="k-note"></span></div>
      <s-button id="k-plans">Plans</s-button>
    </div>
    <div id="k-planmsg" class="k-note"></div>
    <div id="k-weekly" class="k-note" hidden><strong>Your weekly ad is ready to make.</strong> Pick a product below.</div>
  </s-section>
  <s-section id="k-make" heading="Make the ad" hidden>
    <p class="k-note">Product: <strong id="k-prod"></strong></p>
    <div class="k-note">Level</div>
    <div id="k-tiers" class="k-row"></div>
    <div class="k-row"><label class="k-note" for="k-style">Style</label> <select id="k-style"><option value="none">Auto (no effect)</option></select></div>
    <div class="k-row"><s-button id="k-planbtn" variant="primary">Write my ad</s-button> <s-button id="k-cancel">Back to products</s-button></div>
    <div id="k-planout" hidden>
      <div class="k-note">What the ad will say</div>
      <div id="k-script" class="k-script"></div>
      <div id="k-cost" class="k-note"></div>
      <div class="k-row"><s-button id="k-go" variant="primary">Generate</s-button></div>
    </div>
    <div id="k-progress" class="k-note"></div>
    <div id="k-done" hidden>
      <div class="k-note" id="k-ailabel"><strong>Made with AI</strong> · voice, music and motion generated by Kineo from your product photos.</div>
      <video id="k-video" class="k-video" controls playsinline></video>
      <div class="k-row"><s-button id="k-dl" variant="primary">Download MP4</s-button> <s-button id="k-attach" hidden>Add to product page</s-button></div>
      <div id="k-review" class="k-note" hidden>Enjoying Kineo Ads? <a id="k-reviewlink" href="#" target="_top">Leave a review</a></div>
    </div>
    <div id="k-makemsg" class="k-note"></div>
  </s-section>
  <s-section id="k-pick" heading="Pick a product">
    <p class="k-note">Choose a product and Kineo makes a 15-second video ad from its photos — voice, music and on-screen text included. It is made right here and saved to your account.</p>
    <s-text-field id="k-q" label="Search products" placeholder="Search by title"></s-text-field>
    <div id="k-msg" class="k-note">Loading products…</div>
    <div id="k-list" class="k-grid"></div>
    <div style="margin-top:12px"><s-button id="k-more" hidden>Load more</s-button></div>
  </s-section>
</s-page>
<script>
(function () {
  var AUTH_URL = ${JSON.stringify(authUrl)};
  var $ = function (id) { return document.getElementById(id); };
  var list = $('k-list'), msg = $('k-msg'), more = $('k-more'), q = $('k-q');
  var next = null, query = '', account = null, chosen = null, tier = 'photo_motion', planned = null, poll = null, videoUrl = null, deliveredOrder = null;
  var TIER_NAMES = { photo_motion: 'Photo motion', commercial: 'Commercial', cinema: 'Cinema' };
  var ERRORS = {
    plan_required: 'Your free ad was already used. Pick a plan to make more ads.',
    sample_level_only: 'The free ad uses the Photo motion level. Pick a plan for the other levels.',
    out_of_credits: 'Not enough credits for this ad.',
    daily_cap: 'You reached today\\'s limit of extra ads. Try again tomorrow or upgrade your plan.',
    monthly_cap: 'You reached this month\\'s limit of extra ads. Upgrade your plan for more ads.',
    too_expensive: 'Extra ads cover the Photo motion and Commercial levels.',
    billing_busy: 'Billing is busy. Try again in a moment.',
    billing_failed: 'Shopify could not bill the extra ad. Nothing was charged on Kineo.',
    no_photos: 'This product has no photos. Add a photo in Shopify first.',
    photos_unavailable: 'We could not read this product\\'s photos. Try another product or another photo.',
    product_not_found: 'This product was not found.',
    moderation: 'This product can\\'t be advertised with Kineo (content policy).',
    daily_limit: 'You reached today\\'s limit. Try again tomorrow.',
    sample_cap: 'Today\\'s free ads are taken. Come back tomorrow or pick a plan.',
    another_active: 'Another ad is still being made. Wait for it to finish.',
    unverified_owner: 'Open the app as the store owner (with a verified email) to connect your Kineo account.',
    no_shop_email: 'Your store has no contact email. Add one in Shopify settings.',
    closed: 'Video ads are not open yet.'
  };
  function say(el, text, isError) { el.textContent = text || ''; el.className = isError ? 'k-err' : 'k-note'; }
  function errText(d, fallback) { return (d && d.error && ERRORS[d.error]) || (d && typeof d.message === 'string' && d.message) || fallback; }
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

  // ── conta: plano, saldo, amostra ───────────────────────────────────────────
  async function loadAccount() {
    var params = new URLSearchParams(window.location.search);
    var path = '/api/shopify/account' + (params.has('plan_handle') ? '?plan_handle=' + encodeURIComponent(params.get('plan_handle') || '') : '');
    var r = await api(path);
    if (!r.ok) { say($('k-planmsg'), errText(r.data, 'Could not load your plan. Try again in a moment.'), true); return; }
    account = r.data;
    var names = { free: 'Free', starter: 'Shop Starter', business: 'Shop Business' };
    $('k-plan').textContent = 'Plan: ' + (names[account.plan] || 'Free') + ((account.pitch && account.pitch[account.plan]) ? ' — ' + account.pitch[account.plan] : '');
    $('k-weekly').hidden = !account.weekly_ready;
    $('k-credits').textContent = '· ' + account.credits + ' credits';
    var note = account.sample_available ? 'Your first ad is free (Photo motion level, 15 s).' : (account.access === 'ok' ? '' : 'Pick a plan to make ads.');
    if (account.granted_now) note = account.granted_now + ' credits were added for this billing cycle. ' + note;
    say($('k-planmsg'), note);
    var sel = $('k-style');
    if (sel.options.length === 1) (account.styles || []).forEach(function (s) { var o = document.createElement('option'); o.value = s.key; o.textContent = s.label; sel.appendChild(o); });
  }
  $('k-plans').addEventListener('click', function () { if (account && account.pricing_url) window.open(account.pricing_url, '_top'); });

  // ── produtos ───────────────────────────────────────────────────────────────
  function card(p) {
    var el = document.createElement('div'); el.className = 'k-card';
    if (p.image) { var img = document.createElement('img'); img.src = p.image; img.alt = p.alt || p.title || ''; img.loading = 'lazy'; el.appendChild(img); }
    else { var ph = document.createElement('div'); ph.className = 'k-ph'; el.appendChild(ph); }
    var t = document.createElement('div'); t.className = 'k-title'; t.textContent = p.title || 'Untitled product'; el.appendChild(t);
    var b = document.createElement('s-button'); b.setAttribute('variant', 'primary');
    if (!p.image) { b.setAttribute('disabled', ''); b.textContent = 'Add a photo first'; }
    else { b.textContent = 'Make a 15-second ad'; b.addEventListener('click', function () { openMaker(p); }); }
    el.appendChild(b);
    return el;
  }
  async function load(reset) {
    if (reset) { list.textContent = ''; next = null; }
    say(msg, 'Loading products…');
    var path = '/api/shopify/products?' + new URLSearchParams(Object.assign({}, next ? { after: next } : {}, query ? { q: query } : {})).toString();
    var r = await api(path);
    if (!r.ok) { say(msg, r.status === 401 ? 'Reconnecting to your store…' : 'Could not load products. Try again in a moment.', true); return; }
    (r.data.products || []).forEach(function (p) { list.appendChild(card(p)); });
    next = r.data.next || null;
    if (next) more.removeAttribute('hidden'); else more.setAttribute('hidden', '');
    say(msg, list.children.length ? '' : 'No products found.');
  }
  more.addEventListener('click', function () { load(false); });
  var timer = null;
  q.addEventListener('input', function (e) { clearTimeout(timer); var v = (e.target && e.target.value) || ''; timer = setTimeout(function () { query = String(v).trim(); load(true); }, 350); });

  // ── o anúncio: nível, estilo, plano (texto + custo), gerar, andamento, vídeo ──
  function renderTiers() {
    var box = $('k-tiers'); box.textContent = '';
    var freeOnly = account && account.access !== 'ok';
    ((account && account.tiers) || [{ id: 'photo_motion', credits: 34 }]).forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'k-opt';
      b.textContent = (TIER_NAMES[t.id] || t.id) + ' · ' + t.credits + ' credits';
      if (freeOnly && t.id !== (account.sample_tier || 'photo_motion')) b.disabled = true;
      b.setAttribute('aria-pressed', t.id === tier ? 'true' : 'false');
      b.addEventListener('click', function () { tier = t.id; planned = null; $('k-planout').hidden = true; renderTiers(); });
      box.appendChild(b);
    });
  }
  function openMaker(p) {
    chosen = p; planned = null; deliveredOrder = null; videoUrl = null;
    if (account && account.access !== 'ok') tier = account.sample_tier || 'photo_motion';
    $('k-prod').textContent = p.title || 'Untitled product';
    $('k-planout').hidden = true; $('k-done').hidden = true; say($('k-progress'), ''); say($('k-makemsg'), '');
    renderTiers();
    $('k-make').hidden = false; $('k-pick').hidden = true;
    window.scrollTo(0, 0);
  }
  $('k-cancel').addEventListener('click', function () { if (poll) clearTimeout(poll); $('k-make').hidden = true; $('k-pick').hidden = false; });
  $('k-planbtn').addEventListener('click', async function () {
    if (!chosen) return;
    var b = $('k-planbtn'); b.setAttribute('loading', '');
    say($('k-makemsg'), 'Reading the product and writing your ad… (about 30 seconds)');
    var r = await api('/api/shopify/ads', { method: 'POST', body: JSON.stringify({ action: 'plan', product_id: chosen.id, tier: tier, style: $('k-style').value }) });
    b.removeAttribute('loading');
    if (!r.ok) { say($('k-makemsg'), errText(r.data, 'Could not write the ad. Try again in a moment.'), true); return; }
    planned = r.data;
    var lines = [];
    if (planned.narration) lines.push('Voice: ' + planned.narration);
    (planned.overlays || []).forEach(function (o) { if (o && o.text) lines.push('On screen: ' + o.text); });
    $('k-script').textContent = lines.join('\\n') || 'Music and on-screen text only.';
    var go = $('k-go');
    if (planned.sample) { go.textContent = 'Make my free ad'; say($('k-cost'), 'Free sample: no credits used.'); }
    else if (planned.balance >= planned.credits) { go.textContent = 'Generate · ' + planned.credits + ' credits'; say($('k-cost'), 'You have ' + planned.balance + ' credits.'); }
    else if (planned.extra_available) { go.textContent = 'Generate · extra ad US$ ' + planned.extra_usd; say($('k-cost'), 'Not enough credits (' + planned.balance + ' of ' + planned.credits + '). This ad is billed by Shopify as an extra ad (US$ ' + planned.extra_usd + ').'); }
    else { go.textContent = 'Pick a plan'; say($('k-cost'), 'Not enough credits (' + planned.balance + ' of ' + planned.credits + ').'); }
    $('k-planout').hidden = false; say($('k-makemsg'), '');
  });
  $('k-go').addEventListener('click', async function () {
    if (!planned) return;
    var extra = !planned.sample && planned.balance < planned.credits;
    if (extra && !planned.extra_available) { if (account && account.pricing_url) window.open(account.pricing_url, '_top'); return; }
    var b = $('k-go'); b.setAttribute('loading', '');
    var r = await api('/api/shopify/ads', { method: 'POST', body: JSON.stringify({ action: 'start', order_id: planned.order_id, extra: extra }) });
    b.removeAttribute('loading');
    if (!r.ok) { say($('k-makemsg'), errText(r.data, 'Could not start the ad. Try again in a moment.'), true); return; }
    $('k-planout').hidden = true;
    say($('k-progress'), 'Making your ad… This takes a few minutes. You can leave this page — the ad will be saved to your account.');
    watch(planned.order_id);
    loadAccount();
  });
  async function watch(orderId) {
    var r = await api('/api/shopify/ads/status?order_id=' + encodeURIComponent(orderId));
    if (r.ok && r.data.status === 'delivered' && r.data.video && r.data.video.video_url) {
      videoUrl = r.data.video.video_url; deliveredOrder = orderId;
      $('k-video').src = videoUrl; $('k-done').hidden = false;
      say($('k-progress'), 'Your ad is ready.');
      if (account && account.attach_media) $('k-attach').removeAttribute('hidden');
      loadAccount().then(function () {
        if (account && account.review_card && account.review_url) { $('k-reviewlink').href = account.review_url; $('k-review').hidden = false; }
      });
      return;
    }
    if (r.ok && (r.data.status === 'failed' || r.data.status === 'cancelled')) { say($('k-progress'), 'This ad could not be made. Any credits used were returned.', true); loadAccount(); return; }
    if (r.ok && r.data.progress) say($('k-progress'), 'Making your ad… ' + r.data.progress.ready + ' of ' + r.data.progress.total + ' shots ready.');
    poll = setTimeout(function () { watch(orderId); }, 6000);
  }
  $('k-dl').addEventListener('click', async function () {
    if (!videoUrl) return;
    try {
      var res = await fetch(videoUrl); var blob = await res.blob();
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kineo-ad.mp4';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { window.open(videoUrl, '_blank'); }
  });
  $('k-attach').addEventListener('click', async function () {
    if (!deliveredOrder || !chosen) return;
    var b = $('k-attach'); b.setAttribute('loading', '');
    var body = JSON.stringify({ order_id: deliveredOrder, product_id: chosen.id });
    var r = await api('/api/shopify/ads/attach', { method: 'POST', body: body });
    if (!r.ok && r.data.error === 'scope_missing') {
      // A permissão (escopos opcionais) só é pedida AGORA, no clique do lojista.
      try { await shopify.scopes.request(['write_products', 'write_files']); } catch (e) { b.removeAttribute('loading'); say($('k-makemsg'), 'Kineo needs permission to add videos to your products.', true); return; }
      r = await api('/api/shopify/ads/attach', { method: 'POST', body: body });
    }
    b.removeAttribute('loading');
    say($('k-makemsg'), r.ok ? 'Added to your product page. Shopify shows it once processing ends.' : (r.data.error === 'scope_missing' ? 'Kineo needs permission to add videos to your products.' : 'Could not add the video to the product.'), !r.ok);
  });

  loadAccount().then(function () { load(true); });
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
