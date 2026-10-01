// KINEO-ADS-V2-2026-09-28 — guardião da TELA do anúncio v2 (etapa 3: /ads/v2).
// Especificação: docs/ESPEC-ANUNCIO-V2-2026-09-28.md. Roda com `node scripts/test-ads-v2-tela-2026-09-28.mjs`.
// A página e o cliente (TSX com alias '@/') são lidos por readFileSync; as regras puras da tela (lib/ads/v2Screen.ts,
// sem import) e os módulos puros da base são IMPORTADOS e EXECUTADOS (Node 24 importa .ts pelo caminho).
// O que isto segura:
//   R — portas do page.tsx (login → acesso ao Ads → v2) e os destinos exatos dos redirects;
//   S — "Start over" existe em todas as fases, pede confirmação e ZERA o estado (remontagem por key), sem retomar
//       pedido e sem deixar resposta atrasada mexer na tela nova;
//   C — o custo mostrado vem de adsV2Credits (o mesmo do débito), nunca de número cravado;
//   X — "Screen or text" nunca oferece "Redo" por IA;
//   K — recorte 9:16 1080×1920 JPEG q0.9 com ponto focal, e a prévia usa a mesma conta;
//   P — PATCH do pedido (narração/cartão) com os portões do POST; I — o cliente não importa módulo de servidor.
//   V — revisão cética de 28/09: poll que não para/agenda, trava de duplo clique antes do 1º await, voz que volta
//       (rascunho com a narração na chave), "Get credits" em outra aba, aviso do Start over com /start no ar, refação
//       que falha volta ao anúncio do pai, copy do Cinema amarrada ao planShots, touch-action por eixo, foco seguro.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const imp = (p) => import(pathToFileURL(join(RAIZ, p)).href)
let ok = 0
const falhas = []
const check = (nome, condicao) => {
  let v = false
  try { v = typeof condicao === 'function' ? !!condicao() : !!condicao } catch (e) { falhas.push(`${nome} (lançou: ${e.message})`); return }
  if (v) ok++; else falhas.push(nome)
}
const eqSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n')
/** Corpo de uma função/bloco: do primeiro '{' de FIM DE LINHA a partir do marcador (o corpo; tipos e parâmetros de uma
 *  linha ficam para trás) até a chave que fecha (contagem de chaves). */
const bloco = (src, marcador) => {
  const i = src.indexOf(marcador)
  if (i < 0) return ''
  const a = src.indexOf('{\n', i)
  if (a < 0) return ''
  let n = 0
  for (let j = a; j < src.length; j++) {
    if (src[j] === '{') n++
    else if (src[j] === '}') { n--; if (n === 0) return src.slice(a, j + 1) }
  }
  return ''
}
const ordem = (s, ...marcas) => {
  let at = -1
  for (const m of marcas) {
    const k = typeof m === 'string' ? s.indexOf(m, at + 1) : (() => { const r = new RegExp(m.source, m.flags.includes('g') ? m.flags : m.flags + 'g'); r.lastIndex = at + 1; const x = r.exec(s); return x ? x.index : -1 })()
    if (k < 0 || k <= at) return false
    at = k
  }
  return true
}

const F = {
  page: 'app/(dashboard)/ads/v2/page.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  screen: 'lib/ads/v2Screen.ts',
  orders: 'app/api/ads/v2/orders/route.ts',
}
for (const p of Object.values(F)) check(`arquivo existe: ${p}`, existsSync(join(RAIZ, p)))
const page = semComentarios(rd(F.page))
const client = semComentarios(rd(F.client))
const screenSrc = rd(F.screen)
const orders = semComentarios(rd(F.orders))
const SC = await imp(F.screen)
const T = await imp('lib/ads/v2Tiers.ts')
const SL = await imp('lib/ads/v2ShotLists.ts')
const CT = await imp('lib/ads/v2Contract.ts')

// ── R. portas do page.tsx ───────────────────────────────────────────────────────────────────────
check('R1 sem login → /login?redirect=/ads/v2 (antes de qualquer leitura de acesso)', /if \(!user\) redirect\(`\/login\?redirect=\$\{encodeURIComponent\('\/ads\/v2'\)\}`\)/.test(page) && ordem(page, 'if (!user) redirect(', 'loadAdsAccess('))
check('R2 sem acesso ao Studio Ads (adsGate ≠ ok) → /ads?from=v2, com rastro ads_access_denied', () => {
  const b = bloco(page, "if (gate !== 'ok')")
  return /const gate = adsGate\(reason\)/.test(page) && /name: 'ads_access_denied'/.test(b) && /redirect\('\/ads\?from=v2'\)/.test(b)
})
check('R3 sem o v2 (adsV2Visible com o e-mail VERIFICADO do auth) → /ads/new, conferido UMA vez só (depois do acesso)', /if \(!adsV2Visible\(user\.email\)\) redirect\('\/ads\/new'\)/.test(page) && (page.match(/adsV2Visible\(/g) || []).length === 1)
check('R4 ordem das portas: login → acesso ao Ads → v2 → desenho da tela', ordem(page, 'if (!user) redirect(', "if (gate !== 'ok')", 'if (!adsV2Visible(user.email))', '<AdsV2Client'))
check('R5 página dinâmica e saldo que falha vira null (nunca 0)', /export const dynamic = 'force-dynamic'/.test(page) && /balance = !prof\.error && prof\.data && Number\.isFinite\(n\) \? n : null/.test(page) && /\} catch \{\n    balance = null\n  \}/.test(page) && !/balance = 0\b/.test(page))

// ── I. fronteira servidor/cliente ───────────────────────────────────────────────────────────────
const importsClient = [...rd(F.client).matchAll(/^import[\s\S]*?from '([^']+)'/gm)].map((m) => m[1])
// REANCORADO 29/09 (KINEO-ADS-MODO-SIMPLES-2026-09-29): (1) '@/components/BusinessVisualReferences' e
// '@/components/InterfaceLanguage' entraram no commit 0449de76 (Codex) sem atualizar esta lista — o I1 já estava VERMELHO
// na base c55bab53; ambos são componentes de navegador. (2) O modo simples: './AdsV2Simple' (cliente), '@/lib/ads/v2Simple'
// (pura, sem import) e '@/lib/ui/interfaceLanguage' (pura). A intenção do I1 continua: nenhum módulo de servidor.
// Approved delivery refinement: browser-only plan comparison; no request or persistence.
// REANCORADO 30/09 (KINEO-ADS-3-VARIACOES-2026-09-30): + './AdsV2Variations' — a opção "3 variações" e o painel das 3
// (cliente; importa só react, next/link, videoDownload e as libs puras v2Screen/v2Variations/interfaceLanguage).
// REANCORADO 01/10 (KINEO-ABAS-PALCO-2026-10-01): + '@/components/ProductStage' — o palco/quadro de engenharia
// compartilhado com Imagens e Espaços (cliente; importa só react e InterfaceLanguage). Nenhum módulo de servidor.
const PERMITIDOS = ['@/components/ProductStage', './AdsV2Variations','@/components/AdsPlanChanges', 'react', 'next/link', '@/components/studioKit', '../new/adsWizardTheme', '@/lib/videoDownload', '@/lib/ads/uploadFootage', '@/lib/ads/endCard', '@/lib/ads/v2Tiers', '@/lib/ads/v2ShotLists', '@/lib/ads/v2Screen',
  '@/components/BusinessVisualReferences', '@/components/InterfaceLanguage', './AdsV2Simple', '@/lib/ads/v2Simple', '@/lib/ui/interfaceLanguage']
check("I1 o cliente começa com 'use client' e só importa módulos de navegador/puros (nada de v2Advance, v2Billing, serverAccess…)", /^'use client'/.test(rd(F.client)) && importsClient.length >= 8 && importsClient.every((m) => PERMITIDOS.includes(m)))
check('I2 lib/ads/v2Screen.ts é puro (nenhum import/require) e fora da trava 8.2', !/^\s*import\s/m.test(screenSrc) && !/\brequire\(/.test(semComentarios(screenSrc)))
check('I3 o cliente não grava evento de cliente (eventos do v2 são só-servidor)', !/trackEvent\(/.test(client))
check('I4 o v1 não foi tocado pela tela nova: o cliente só LÊ o tema do assistente (import), sem copiar o arquivo', importsClient.includes('../new/adsWizardTheme') && !existsSync(join(RAIZ, 'app/(dashboard)/ads/v2/adsWizardTheme.ts')))

// ── S. Start over ───────────────────────────────────────────────────────────────────────────────
const wrapper = bloco(client, 'export default function AdsV2Client')
const sessionBody = bloco(client.slice(client.indexOf('function AdsV2Session(')), '}) {')
const startOver = bloco(wrapper, 'function startOver()')
// REANCORADO 29/09 (KINEO-ADS-MODO-SIMPLES-2026-09-29): os textos do cabeçalho e da confirmação saíram do JSX para a tabela
// ADS_V2_SIMPLE_COPY.shell (lib/ads/v2Simple.ts) — no modo completo vale a tabela en, o MESMO inglês de antes (conferido
// aqui, executado); no simples, a língua da interface. S1/S2/V6/V10 continuam provando a mesma coisa: o botão fica no
// cabeçalho, a confirmação existe, o "sim" zera, o aviso do anúncio em andamento aparece e o foco vai para a opção segura.
const SIMPLE = await imp('lib/ads/v2Simple.ts')
const SHELL_EN = SIMPLE.ADS_V2_SIMPLE_COPY.en.shell
check('S1 botão "Start over" no cabeçalho da página, FORA de qualquer fase (desenhado antes da sessão, sem condição)', () => {
  const ret = wrapper.slice(wrapper.lastIndexOf('return ('))
  const btn = ret.indexOf('>\n          {shell.startOver}\n        </button>')
  const head = ret.indexOf('<header'), headEnd = ret.indexOf('</header>')
  return SHELL_EN.startOver === 'Start over' && btn > head && btn < headEnd && ret.indexOf('<AdsV2Session') > headEnd && !/phase/.test(ret.slice(head, headEnd))
})
check('S2 Start over pede confirmação (alertdialog) e só o "Yes, start over" zera', () => /role="alertdialog"/.test(wrapper) && /onClick=\{startOver\}>\{shell\.yes\}</.test(wrapper) && SHELL_EN.yes === 'Yes, start over' && /onClick=\{\(\) => setConfirmingReset\(true\)\}/.test(wrapper) && SHELL_EN.keep === 'Keep working' && /\{shell\.keep\}/.test(wrapper) && /const shell = mode === 'full' \? ADS_V2_SIMPLE_COPY\.en\.shell :/.test(wrapper))
check('S3 Start over REMONTA a sessão: soma 1 em session, limpa ?order da URL e fecha a confirmação', /setSession\(\(s\) => s \+ 1\)/.test(startOver) && /clearOrderParam\(\)/.test(startOver) && /setConfirmingReset\(false\)/.test(startOver) && /setActiveWork\(false\)/.test(startOver))
check('S4 a sessão é desenhada com key={session} e só a PRIMEIRA retoma pedido (resume={session === 0})', /<AdsV2Session\s+key=\{session\}\s+resume=\{session === 0\}/.test(wrapper))
check('S5 nenhum dado do pedido mora fora da sessão: o invólucro só tem session, saldo, confirmação e "tem anúncio andando"', () => {
  // REANCORADO 29/09 (KINEO-ADS-MODO-SIMPLES-2026-09-29): + `mode` (simples/completo), que é escolha de tela, não dado do pedido.
  const nomes = [...wrapper.matchAll(/const \[(\w+), set\w+\] = useState/g)].map((m) => m[1])
  // REANCORADO 30/09 (KINEO-ADS-3-VARIACOES-2026-09-30): + `groupId`/`groupChecked` — o ENDEREÇO do painel das 3 variações
  // (?group=), que é escolha de tela; os pedidos e o dinheiro continuam no servidor e na sessão.
  return eqSet(nomes, ['session', 'balance', 'confirmingReset', 'activeWork', 'mode', 'groupId', 'groupChecked'])
})
check('S6 o estado do anúncio (nível, texto, logo, fotos, cartão, rascunho, plano, pedido, vídeo) nasce VAZIO dentro da sessão', () =>
  [
    /const \[tier, setTier\] = useState<AdsV2Tier \| null>\(null\)/,
    /const \[business, setBusiness\] = useState\(''\)/,
    /const \[sentence, setSentence\] = useState\(''\)/,
    /const \[link, setLink\] = useState\(''\)/,
    /const \[sector, setSector\] = useState<AdsV2ScreenSector \| null>\(null\)/,
    /const \[logo, setLogo\] = useState<LogoItem \| null>\(null\)/,
    /const \[photos, setPhotos\] = useState<PhotoItem\[\]>\(\[\]\)/,
    /const \[card, setCard\] = useState<CardFields>\(DEFAULT_CARD\)/,
    /const \[draft, setDraft\] = useState<[^>]+>\(null\)/,
    /const \[plan, setPlan\] = useState<Plan \| null>\(null\)/,
    /const \[order, setOrder\] = useState<OrderView \| null>\(null\)/,
    /const \[video, setVideo\] = useState<VideoInfo \| null>\(null\)/,
  ].every((r) => r.test(sessionBody)))
check('S7 ao desmontar (Start over): aliveRef=false, poll cancelado, pedido corrente esquecido, URLs locais revogadas', () => {
  const eff = bloco(sessionBody, 'return () =>')
  return /aliveRef\.current = false/.test(eff) && /window\.clearTimeout\(pollRef\.current\)/.test(eff) && /currentOrderRef\.current = null/.test(eff) && /URL\.revokeObjectURL/.test(eff)
})
check('S8 resposta atrasada da sessão velha não mexe na tela nova: URL, poll e vista exigem aliveRef (e o pedido corrente)', () =>
  /if \(!aliveRef\.current\) return/.test(bloco(sessionBody, 'function setOrderParam(')) &&
  /if \(!aliveRef\.current\) return/.test(bloco(sessionBody, 'function schedulePoll(')) &&
  /if \(!aliveRef\.current \|\| currentOrderRef\.current !== v\.order_id\) return/.test(bloco(sessionBody, 'function applyView(')) &&
  (bloco(sessionBody, 'async function pollOnce(').match(/currentOrderRef\.current !== orderId\) return/g) || []).length === 2)
check('S9 retomar: só com resume, e rascunho/plano antigo NUNCA volta (só pedido em andamento, entregue ou falho)', () => {
  const eff = bloco(sessionBody, 'useEffect(() => {\n    if (!resume) return')
  return eff.length > 0 && /v\.status === 'draft' \|\| v\.status === 'planned'/.test(eff) && /isActiveOrderStatus\(o\.status\)/.test(eff) && /setPhase\('build'\)/.test(eff)
})
check('S10 "Start over" também na falha e "Make another ad" na entrega (os dois abrem a MESMA confirmação)', (sessionBody.match(/onClick=\{onAskStartOver\}/g) || []).length === 2 && /onAskStartOver=\{\(\) => setConfirmingReset\(true\)\}/.test(wrapper))

// ── C. custo ────────────────────────────────────────────────────────────────────────────────────
check('C1 preço dos níveis: adsV2Credits(t, 15) = 34/41/51 (executado) e a tela vende 15 s', SC.ADS_V2_SCREEN_SECONDS === 15 && T.adsV2Credits('photo_motion', SC.ADS_V2_SCREEN_SECONDS) === 34 && T.adsV2Credits('commercial', SC.ADS_V2_SCREEN_SECONDS) === 41 && T.adsV2Credits('cinema', SC.ADS_V2_SCREEN_SECONDS) === 51)
check('C2 cartão de nível mostra adsV2Credits(t, ADS_V2_SCREEN_SECONDS) e o que falta com o saldo', () => {
  const tiers = bloco(sessionBody, 'ADS_V2_TIER_IDS.map((t) =>')
  return /const credits = adsV2Credits\(t, ADS_V2_SCREEN_SECONDS\)/.test(tiers) && /\{credits\} credits/.test(tiers) && /balance < credits \? credits - balance : 0/.test(tiers) && /You need \{short\} more credits/.test(tiers)
})
check('C3 "Make my ad · N credits": N = cost = adsV2Credits(tier, ADS_V2_SCREEN_SECONDS) — o MESMO do débito do /start', /const cost = tier \? adsV2Credits\(tier, ADS_V2_SCREEN_SECONDS\) : null/.test(sessionBody) && /`Make my ad · \$\{cost\} credits`/.test(client) && /cost=\{cost\}/.test(sessionBody))
check('C4 preço do servidor diferente do mostrado = não começa (pede plano novo)', /if \(plan\.credits !== cost\) \{/.test(bloco(sessionBody, 'async function makeAd()')))
check('C5 nenhum preço cravado na tela: 34/41/51 não aparecem no cliente nem nas regras da tela', !/\b(34|41|51)\b/.test(client.replace(/ADS_V2_CSS = `[\s\S]*?`/, '')) && !/\b(34|41|51)\b/.test(semComentarios(screenSrc)))
check('C6 refação: o preço mostrado é o do servidor e vai de volta como expected_credits', /expected_credits: shot\.retake_credits/.test(client) && /Redo this shot · \{s\.retake_credits\} credits/.test(client))

// ── X. "Screen or text" nunca oferece "Redo" por IA ─────────────────────────────────────────────
const shot = (o) => ({ idx: 0, kind: 'place', source: 'client_photo', attempt: 1, state: 'ready', status: 'done', url: 'x', retake_credits: 5, ...o })
check('X1 canRedoShot: plano text NUNCA (entregue, pronto, com preço, em qualquer status)', ['delivered', 'generating', 'failed'].every((st) => ['done', 'skipped_text'].every((s) => SC.canRedoShot(shot({ kind: 'text', status: s, retake_credits: 5 }), st) === false)))
check('X2 canRedoShot: plano com IA pronto de anúncio entregue = sim; em andamento, falho, sem preço ou pedido não entregue = não', () =>
  SC.canRedoShot(shot({}), 'delivered') === true && SC.canRedoShot(shot({ kind: 'product_hero', retake_credits: 12 }), 'delivered') === true &&
  SC.canRedoShot(shot({ state: 'working', status: 'submitted' }), 'delivered') === false && SC.canRedoShot(shot({ state: 'failed', status: 'failed' }), 'delivered') === false &&
  SC.canRedoShot(shot({ retake_credits: 0 }), 'delivered') === false && SC.canRedoShot(shot({}), 'assembling') === false && SC.canRedoShot(shot({}), 'failed') === false)
check('X3 o botão "Redo this shot" existe UMA vez e só é desenhado sob canRedoShot', (client.match(/Redo this shot/g) || []).length === 1 && /\{redo && canRedoShot\(s, orderStatus\) \? \(/.test(client))
check('X4 o clique de refazer confere canRedoShot de novo antes de chamar /api/ads/v2/retake', ordem(bloco(sessionBody, 'async function redoShot('), 'canRedoShot(shot, order.status)) return', "'/api/ads/v2/retake'"))
check('X5 "Screen or text" explica a regra: "shown as a still with a slow zoom, so every word stays exactly right"', () => {
  const o = SC.ADS_V2_PHOTO_KIND_OPTIONS.find((x) => x.id === 'text')
  return o && o.label === 'Screen or text' && /shown as a still with a slow zoom, so every word stays exactly right/i.test(o.hint)
})
check('X6 rótulo do plano text é "Still with zoom" em toda fase; nunca "Animating"/"Ready"', ['generating', 'assembling', 'delivered'].every((st) => SC.shotStateLabel({ kind: 'text', source: 'client_photo', status: 'skipped_text', state: 'ready' }, st) === 'Still with zoom'))

// ── K. recorte 9:16 ─────────────────────────────────────────────────────────────────────────────
check('K1 saída do recorte: 1080×1920 JPEG qualidade 0,9', SC.ADS_V2_CROP.width === 1080 && SC.ADS_V2_CROP.height === 1920 && SC.ADS_V2_CROP.quality === 0.9 && SC.ADS_V2_CROP.type === 'image/jpeg')
check('K2 cropRect é 9:16, cabe na foto e é a MAIOR janela possível (paisagem, retrato, quadrada, já 9:16)', () =>
  [[4000, 3000], [1920, 1080], [1080, 1920], [3000, 3000], [900, 2400], [1200, 1600]].every(([w, h]) => [0, 0.5, 1].every((f) => {
    const r = SC.cropRect(w, h, f, f)
    const full = Math.min(w, h * 9 / 16)
    return near(r.sw / r.sh, 9 / 16) && r.sx >= -1e-9 && r.sy >= -1e-9 && r.sx + r.sw <= w + 1e-9 && r.sy + r.sh <= h + 1e-9 && near(r.sw, full)
  })))
check('K3 o ponto focal desliza a janela: 0 encosta no começo, 1 no fim, 0,5 centra; fora de 0..1 é preso', () => {
  const a = SC.cropRect(4000, 3000, 0, 0.5), b = SC.cropRect(4000, 3000, 1, 0.5), c = SC.cropRect(4000, 3000, 0.5, 0.5), d = SC.cropRect(4000, 3000, 7, -3)
  return a.sx === 0 && near(b.sx + b.sw, 4000) && near(c.sx, (4000 - c.sw) / 2) && near(d.sx, b.sx) && d.sy === 0
})
check('K4 arrastar: a foto anda com o dedo (direita → foco para a esquerda); eixo sem sobra não mexe', () => {
  const p = SC.panFocal({ fx: 0.5, fy: 0.5 }, { dx: 20, dy: 0 }, { w: 132, h: 234.67 }, { w: 4000, h: 3000 })
  const q = SC.panFocal({ fx: 0.5, fy: 0.5 }, { dx: 0, dy: 50 }, { w: 132, h: 234.67 }, { w: 4000, h: 3000 })
  return p.fx < 0.5 && p.fy === 0.5 && q.fy === 0.5 && q.fx === 0.5
})
check('K5 prévia = recorte: a moldura é 9:16 e usa object-position do MESMO ponto focal', /\.adv2 \.adv2-frame\{[^}]*aspect-ratio:9\/16/.test(rd(F.client)) && /style=\{\{ objectPosition: focalPosition\(photo\.fx, photo\.fy\) \}\}/.test(client) && /object-fit:cover/.test(rd(F.client)))
check('K6 o navegador recorta com cropRect e desenha em ADS_V2_CROP (1080×1920), JPEG q0.9, ANTES do upload', () => {
  const f = bloco(client, 'async function cropToVertical(')
  const e = bloco(sessionBody, 'async function ensurePhotosUploaded(')
  return /const r = cropRect\(img\.naturalWidth, img\.naturalHeight, p\.fx, p\.fy\)/.test(f) &&
    /ctx\.drawImage\(img, r\.sx, r\.sy, r\.sw, r\.sh, 0, 0, ADS_V2_CROP\.width, ADS_V2_CROP\.height\)/.test(f) &&
    /canvas\.width = ADS_V2_CROP\.width/.test(f) && /canvas\.height = ADS_V2_CROP\.height/.test(f) &&
    /canvasToBlob\(canvas, ADS_V2_CROP\.type, ADS_V2_CROP\.quality\)/.test(f) &&
    ordem(e, 'await cropToVertical(p)', 'await uploadFootage(file)')
})
check('K7 enquadramento mudou depois do envio = sobe de novo (assinatura do ponto focal), um arquivo por vez', /if \(p\.uploaded && p\.uploaded\.sig === sig\) \{/.test(bloco(sessionBody, 'async function ensurePhotosUploaded(')) && /for \(const p of photos\)/.test(bloco(sessionBody, 'async function ensurePhotosUploaded(')))
check('K8 foto pequena avisa (não bloqueia): largura do recorte < 720', SC.isSmallCrop(SC.cropRect(800, 600, 0.5, 0.5)) === true && SC.isSmallCrop(SC.cropRect(4000, 3000, 0.5, 0.5)) === false && SC.ADS_V2_MIN_CROP_WIDTH === 720)
check('K9 cartão final desenhado com o endCard (logo real) e enviado como PNG', /drawEndCard\(canvas, \{ logo: img,/.test(bloco(sessionBody, 'async function ensureCard(')) && ordem(bloco(sessionBody, 'async function ensureCard('), 'await toPngFile(canvas)', 'await uploadFootage(file)'))

// ── T. textos e espelhos ────────────────────────────────────────────────────────────────────────
check('T1 ESPELHO: as 4 marcações de foto = tipos do contrato (product/place/people/text), com os rótulos pedidos', eqSet(SC.ADS_V2_PHOTO_KIND_OPTIONS.map((o) => o.id), CT.ADS_V2_CONTRACT_PHOTO_KINDS) && eqSet(SC.ADS_V2_PHOTO_KIND_OPTIONS.map((o) => o.label), ['Food or product', 'Place', 'People', 'Screen or text']))
check('T2 ESPELHO: setores da tela = setores do contrato e dos moldes; limite da frase = contrato; 3 a 7 fotos', eqSet(SC.ADS_V2_SECTOR_OPTIONS.map((s) => s.id), CT.ADS_V2_CONTRACT_SECTORS) && eqSet(SC.ADS_V2_SECTOR_OPTIONS.map((s) => s.id), SL.ADS_V2_SECTORS) && SC.ADS_V2_SCREEN_SENTENCE_MAX === CT.ADS_V2_SENTENCE_MAX_CHARS && SL.ADS_V2_MIN_PHOTOS === 3 && SL.ADS_V2_MAX_PHOTOS === 7)
check('T3 frase ao servidor leva o nome do negócio (o plano recusa brief sem nome) e respeita 400', SC.composeSentence('Casa Laila', 'Grill in Amman') === 'Casa Laila: Grill in Amman' && SC.composeSentence('Casa Laila', 'casa laila grills in Amman') === 'casa laila grills in Amman' && SC.composeSentence('X', '  ') === null && SC.composeSentence('Name', 'y'.repeat(399)) === 'too_long')
check('T4 "How it works" em 4 passos e a coluna de ensino ao lado do montador (depois dele no HTML: no celular vai para baixo)', SC.ADS_V2_HOW_IT_WORKS.length === 4 && ordem(sessionBody, 'className="adv2-main"', '<aside className="adv2-aside"') && /@media\(max-width:1000px\)\{\.adv2 \.adv2-layout\{grid-template-columns:minmax\(0,1fr\)\}/.test(rd(F.client)))
// REANCORADO 29/09 (KINEO-ADS-V2-VIRADA-2026-09-29): o fundador pediu, na virada, UM link discreto para o assistente
// clássico ("Prefer a narrated 35-second ad? Use the classic maker"). A intenção do T5 continua: o v2 não vende 35/60 s
// como produto dele. O link clássico é a ÚNICA exceção, exigida inteira (uma vez, apontando para ?classic=1) e retirada
// do texto antes da varredura — qualquer outro "35 s"/"60 s" no cliente continua vermelho.
const LINK_CLASSICO = '<a href="/ads/new?classic=1">Prefer a narrated 35-second ad? Use the classic maker ({classicCredits} credits)</a>'
check('T5 nada de texto velho: sem 35/60 s, sem legenda/caption, sem narração obrigatória (cliente + regras da tela)', () => {
  const txt = client.split(LINK_CLASSICO).join('') + '\n' + semComentarios(screenSrc)
  return client.split(LINK_CLASSICO).length === 2 && !/\b(35|60)[- ]?(s\b|sec|second)/i.test(txt) && !/caption|subtitle/i.test(txt) && !/narration is required|voice-over is required/i.test(txt) && /you can turn off/.test(txt)
})
check('T6 entrega lembra o rótulo de IA do TikTok e o progresso não promete tempo (a pessoa pode sair)', /Turn on the AI-generated label when you post on TikTok/.test(client) && /You can leave this page/.test(client) && !/\d+\s*(min|minutes|seconds) (left|remaining)/i.test(client) && ['pending', 'image_submitted'].every((s) => SC.shotStateLabel({ kind: 'people', source: 'generated_scene', status: s, state: 'working' }, 'generating') === 'Preparing image') && SC.shotStateLabel({ kind: 'place', source: 'client_photo', status: 'submitted', state: 'working' }, 'generating') === 'Animating' && SC.shotStateLabel({ kind: 'place', source: 'client_photo', status: 'done', state: 'ready' }, 'generating') === 'Ready')
check('T7 todo erro das rotas vira frase que explica e diz o que fazer (nenhum código cru na tela)', () => {
  const codes = ['network', 'unauthenticated', 'no_access', 'v2_closed', 'not_ready', 'out_of_credits', 'another_active', 'daily_limit', 'link_unreachable', 'brief_needs_business', 'no_copy', 'price_changed', 'text_not_retakable', 'moderation_unavailable', 'algo_novo']
  return codes.every((c) => { const m = SC.adsV2ErrorMessage(c, { needed: 41, balance: 10, credits: 5 }); return typeof m === 'string' && m.length > 20 && !m.includes(c) && /\.$/.test(m) }) &&
    /41 credits and you have 10/.test(SC.adsV2ErrorMessage('out_of_credits', { needed: 41, balance: 10 })) && /apiError\(r\)/.test(client)
})
check('T8 foco visível e sem rolagem lateral a 400 px: minmax(0,…), min-width:0 e :focus-visible nos elementos novos', () => {
  const css = rd(F.client)
  return /\.adv2 \.adv2-layout\{display:grid;grid-template-columns:minmax\(0,1fr\)/.test(css) && /\.adv2 \.adv2-main\{min-width:0/.test(css) && /\.adv2 :is\(\[tabindex\],label\):focus-visible\{outline:2px/.test(css) && /\.adv2 \.adv2-tier:has\(input:focus-visible\)\{outline/.test(css) && /overflow-wrap:anywhere/.test(css)
})

// ── P. PATCH do pedido (narração e cartão) ──────────────────────────────────────────────────────
const patch = bloco(orders, 'export async function PATCH(')
check('P1 PATCH: login → acesso ao Ads → v2 → corpo sanitizado → só rascunho/planejado (UPDATE condicional)', ordem(patch, "v2Fail('unauthenticated', 401)", 'adsGate(reason)', "if (!adsV2Visible(user.email)) return v2Fail('v2_closed', 403)", 'sanitizePatchBody(', ".in('status', ['draft', 'planned'])"))
check('P2 PATCH: religar narração sem texto no plano = replan_needed; cartão só PNG do dono', /v2Fail\('replan_needed', 409\)/.test(patch) && /ownedFootage\(admin, user\.id, \[p\.card_footage_id\]\)/.test(patch) && /if \(!card\?\.isPng\) return v2Fail\('card_invalid', 400\)/.test(patch))
check('P3 sanitizePatchBody: exige order_id uuid e pelo menos um campo; tipos conferidos', () => {
  const U = '11111111-2222-4333-8444-555555555555'
  return CT.sanitizePatchBody({ order_id: U }).error === 'nothing_to_change' && CT.sanitizePatchBody({ order_id: 'x', narration: true }).error === 'bad_order_id' &&
    CT.sanitizePatchBody({ order_id: U, narration: 'no' }).error === 'bad_narration' && CT.sanitizePatchBody({ order_id: U, card_footage_id: 'abc' }).error === 'bad_card_footage_id' &&
    CT.sanitizePatchBody({ order_id: U, narration: false }).value.narration === false && CT.sanitizePatchBody({ order_id: U.toUpperCase(), card_footage_id: U }).value.order_id === U
})
check('P4 a tela usa o PATCH para narração (botão na prévia) e para o cartão editado depois do plano', /method: 'PATCH', body: \{ order_id: plan\.order_id, narration: want \}/.test(client) && /method: 'PATCH', body: \{ order_id: p\.order_id, card_footage_id: done\.footageId \}/.test(client) && /role="switch" aria-checked=\{narrationOn\}/.test(client))

// ── V. revisão cética da etapa 3 (28/09): defeitos confirmados e três furos que passavam verdes ────────────────
const pollBody = bloco(sessionBody, 'async function pollOnce(')
const applyBody = bloco(sessionBody, 'function applyView(')
const planBody = bloco(sessionBody, 'async function planAd()')
const makeBody = bloco(sessionBody, 'async function makeAd()')
const redoBody = bloco(sessionBody, 'async function redoShot(')
const toggleBody = bloco(sessionBody, 'async function toggleNarration()')
const draftBody = bloco(sessionBody, 'async function ensureDraft()')
const clientRaw = rd(F.client)
check('V1 poll que falha por rede/servidor CONTINUA (20 s) com aviso; só para em order_not_found/unauthenticated, e também com aviso', () => {
  const stop = bloco(pollBody, "if (r.code === 'order_not_found' || r.code === 'unauthenticated')")
  return /setPollNote\(apiError\(r\)\)/.test(stop) && ordem(pollBody, 'if (!r.ok) {', "if (r.code === 'order_not_found' || r.code === 'unauthenticated')", 'setPollNote(', 'schedulePoll(orderId, POLL_RETRY_MS)', 'setPollNote(null)', 'applyView(r.data)') && /const POLL_RETRY_MS = 20_000/.test(client)
})
check('V2 pedido em andamento SEMPRE agenda o próximo poll (8 s); entregue/falho não', () => {
  const ativo = bloco(applyBody, 'if (isActiveOrderStatus(v.status)) {')
  return /schedulePoll\(v\.order_id, POLL_MS\)/.test(ativo) && (applyBody.match(/schedulePoll\(/g) || []).length === 1 && /const POLL_MS = 8000/.test(client)
})
/** A trava (guarda de busy) vem antes do setBusy, e NENHUM await entre o começo da função e o setBusy. */
const travaAntesDoAwait = (body, guarda, liga) => { const g = body.indexOf(guarda), l = body.indexOf(liga); return g >= 0 && l > g && !body.slice(0, l).includes('await ') && body.indexOf('await ', l) > l }
check('V3 duplo clique não dispara duas vezes: planejar/começar/refazer/voz conferem busy e o ligam ANTES do 1º await; botões travam com busy', () =>
  travaAntesDoAwait(planBody, 'if (busy || missing.length) return', "setBusy('plan')") &&
  travaAntesDoAwait(makeBody, 'if (!plan || !planFresh || busy || cost === null) return', "setBusy('start')") &&
  travaAntesDoAwait(redoBody, 'if (!order || busy || !canRedoShot(shot, order.status)) return', "setBusy('redo')") &&
  travaAntesDoAwait(toggleBody, 'if (!plan || busy) return', "setBusy('voice')") &&
  /disabled=\{busy !== null \|\| cost === null \|\| short > 0\} onClick=\{onMake\}/.test(client) &&
  /disabled=\{busy !== null\} onClick=\{onCheck\}/.test(client) &&
  /disabled=\{locked \|\| missing\.length > 0\} onClick=\{\(\) => void planAd\(\)\}/.test(client) &&
  /disabled=\{redo\.busy\} onClick=\{\(\) => redo\.onConfirm\(s\)\}/.test(client))
check('V4 voz: o rascunho nasce com a narração da tela e a chave inclui a voz; planejar não "religa" a voz; religar sem texto = plano novo (sem PATCH)', () =>
  /const draftKey = \(voice: boolean\) => JSON\.stringify\(\{ tier, composed, link: linkNorm, voice \}\)/.test(sessionBody) &&
  /const key = draftKey\(narrationOn\)/.test(draftBody) && /narration: narrationOn \}/.test(draftBody) && !/narration: true/.test(draftBody) &&
  !/setNarrationOn\(true\)/.test(planBody) &&
  ordem(toggleBody, "if (want && !(typeof plan.narration === 'string' && plan.narration.trim())) {", 'setNarrationOn(true)', 'setPlan(null)', 'return', "method: 'PATCH'") &&
  /setDraft\(\(d\) => \(d && d\.id === plan\.order_id \? \{ \.\.\.d, key: draftKey\(on\) \} : d\)\)/.test(toggleBody) &&
  /role="switch" aria-checked=\{narrationOn\} disabled=\{busy !== null\} onClick/.test(client))
check('V5 "Get credits" abre OUTRA aba (fotos e plano só existem na memória desta) e o saldo é relido ao voltar', () => {
  const links = client.match(/<Link [^>]*href="\/pricing"[^>]*>/g) || []
  return links.length === 2 && links.every((l) => /target="_blank"/.test(l) && /rel="noopener"/.test(l)) &&
    /document\.addEventListener\('visibilitychange', onVisible\)/.test(wrapper) && /if \(document\.visibilityState === 'visible'\) void refreshBalance\(\)/.test(wrapper)
})
check('V6 "Start over" com /start ou /retake no ar AVISA que o anúncio continua (onActive antes da chamada paga; desfeito se falhar)', () =>
  ordem(makeBody, 'onActive(true)', "'/api/ads/v2/start'", 'if (!r.ok) {', 'onActive(false)') &&
  ordem(redoBody, 'onActive(true)', "'/api/ads/v2/retake'", 'if (!r.ok) {', 'onActive(false)') &&
  /\{activeWork \? shell\.activeNote : ''\}/.test(wrapper) && SHELL_EN.activeNote === ' The ad being made right now keeps going and will appear in My Videos.')
check('V7 refação que falha: não diz "this ad did not work", diz que o anúncio segue em My Videos e volta ao anúncio do pai', () => {
  const m1 = SC.failedOrderMessage('fal_503', true), m2 = SC.failedOrderMessage('charge_debit_unconfirmed', true), m0 = SC.failedOrderMessage('fal_503')
  return /still in My Videos/.test(m1) && /still in My Videos/.test(m2) && !/this ad/i.test(m1) && /redo/i.test(m1) && !/still in My Videos/.test(m0) &&
    /failedOrderMessage\(order\.error, !!order\.parent_order_id\)/.test(client) && /order\.parent_order_id \? 'This shot could not be redone' : 'This ad did not work'/.test(client) &&
    ordem(client, '{order.parent_order_id ? (', 'onClick={() => openOrder(order.parent_order_id as string)}', 'Back to my ad', ') : photos.length ? (', 'Back to my photos') &&
    ordem(bloco(sessionBody, 'function openOrder('), 'if (!aliveRef.current) return', 'currentOrderRef.current = id', 'setOrderParam(id)', "setPhase('loading')", 'void pollOnce(id)')
})
check('V8 copy do Cinema amarrada ao planShots: sem foto Food or product NÃO há close-herói, e a copy só promete com essa foto', () => {
  const ph = (kinds) => kinds.map((k, i) => ({ id: 'p' + i, url: 'https://x/' + i + '.jpg', kind: k }))
  const semProduto = SL.planShots({ sector: 'real_estate', tier: 'cinema', photos: ph(['place', 'place', 'people']) })
  const comProduto = SL.planShots({ sector: 'restaurant', tier: 'cinema', photos: ph(['product', 'place', 'people']) })
  const cin = SC.ADS_V2_TIER_COPY.cinema.includes.join(' ')
  return semProduto.shots.every((s) => s.kind !== 'product_hero') && comProduto.shots.filter((s) => s.kind === 'product_hero').length === 2 &&
    /with a Food or product photo, it opens on 2 hero close-ups/.test(cin) && !/Redo any shot/i.test(SC.ADS_V2_HOW_IT_WORKS.map((s) => s.body).join(' ')) &&
    !/\{ADS_V2_SCREEN_SECONDS\}-second/.test(client)
})
check('V9 celular: a moldura só prende o eixo que enquadra (paisagem pan-y, print estreito pan-x, 9:16 auto) e usa isso no estilo', () =>
  SC.frameTouchAction(4000, 3000) === 'pan-y' && SC.frameTouchAction(3000, 4000) === 'pan-y' && SC.frameTouchAction(1000, 1000) === 'pan-y' &&
  SC.frameTouchAction(1080, 2340) === 'pan-x' && SC.frameTouchAction(1080, 1920) === 'auto' && SC.frameTouchAction(0, 10) === 'auto' &&
  /const touchAction = frameTouchAction\(photo\.w, photo\.h\)/.test(client) && /style=\{\{ touchAction \}\}/.test(client))
check('V10 confirmação do "Start over" foca a opção SEGURA ("Keep working") e devolve o foco ao botão ao cancelar', () =>
  /<button ref=\{confirmRef\} type="button" className="adsw-btn ghost small" onClick=\{\(\) => \{ setConfirmingReset\(false\); resetBtnRef\.current\?\.focus\(\) \}\}>\{shell\.keep\}<\/button>/.test(wrapper) &&
  !/ref=\{confirmRef\}[^>]*onClick=\{startOver\}/.test(wrapper))
check('V11 "No logo" legível no ladrilho escuro (cor clara própria, não o cinza do tema)', /\.adv2 \.adv2-logo \.tile \.ph\{[^}]*color:#dbe4ef/.test(clientRaw) && /<span className="ph">No logo<\/span>/.test(client))

console.log(`${ok} verdes, ${falhas.length} vermelhos`)
if (falhas.length) {
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
process.exit(0)
