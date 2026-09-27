// KINEO-ADS-SPRINT16H-2026-09-27 — guardião do item ADS da sprint de 16 h (dom 27/09, alvo MRR). Decisões do fundador:
// a promessa "human-reviewed within 24 h with corrected version" CAI (fica "A human checks your first ad"); /ads/new abre
// SEM login com texto+link guardados em sessionStorage ('kineo:ads:draft:v1'); a fila de upload substitui "Wait for the
// current upload to finish"; a lista "Your ads" ganha miniatura (videos.thumbnail_url juntada no GET, uma consulta só);
// a FAQ deriva o custo por anúncio de lib/ads/offer.ts. Cada prova TRAVA o literal antigo (= 0) e prova o novo.
// Só readFileSync (sem alias @/); o que é executado (adsPassCopy, adsAccessReason, TIER_CREDITS) roda pelo loader offline.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
const count = (s, needle) => s.split(needle).length - 1
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
const load = createOfflineLoader()

const OFFER = rd('lib/ads/offer.ts')
const W = rd('app/(dashboard)/ads/new/AdsWizardClient.tsx')
const DOOR = rd('app/ads/page.tsx')
const PAGE = rd('app/(dashboard)/ads/new/page.tsx')
const ROUTE = rd('app/api/ads/orders/route.ts')
const TYPES = rd('lib/ads/types.ts')
const FACTS = rd('lib/growth/studioAdsFacts.ts')
const STYLE = rd('lib/ads/adStyle.ts')
const panel = W.slice(W.indexOf('function AdsAutoPanel('), W.indexOf('// ─── passo 1: brief'))

// ── 1. a promessa antiga morreu em TODOS os arquivos do Studio Ads; a nova está nos três lugares que a pessoa lê ──
const ADS_FILES = { 'lib/ads/offer.ts': OFFER, 'app/(dashboard)/ads/new/AdsWizardClient.tsx': W, 'app/ads/page.tsx': DOOR, 'app/(dashboard)/ads/new/page.tsx': PAGE, 'lib/growth/studioAdsFacts.ts': FACTS }
for (const [name, src] of Object.entries(ADS_FILES)) {
  checa(`1. ${name}: "24 hours" = 0, "corrected version" = 0, "human editor reviews" = 0`, !/24 hours|corrected version|human editor reviews/i.test(src))
}
checa('1a. offer.ts: o include da revisão é "A human checks your first ad"', /^\s+'A human checks your first ad',$/m.test(OFFER))
checa('1b. assistente: REVIEW_LINE = "A human checks your first ad."', /^const REVIEW_LINE = 'A human checks your first ad\.'$/m.test(W))
checa('1c. porta /ads: o parágrafo diz o novo e só cita o botão de pedido de mudança que a entrega tem (DeliveryView)', /<p>A human checks your first ad\. Need a change\? The delivery screen has a request button that opens an email to us with your order number already filled in\.<\/p>/.test(DOOR) && /Email the change request/.test(W) && /Studio Ads change request · \$\{order\.id\}/.test(W))
const offer = load('lib/ads/offer.ts')
const copy = offer.adsPassCopy()
checa('1d. adsPassCopy() EXECUTADO: include novo presente; nada de prazo nem "versão corrigida" em lugar nenhum da copy', copy.includes.includes('A human checks your first ad') && !/24 hours|corrected version|human editor/i.test(JSON.stringify(copy)))
checa('1e. excludes não falam mais de "Square and landscape" (1:1, 4:5 e 16:9 existem em lib/ads/adStyle.ts) e continuam ≥ 2 (honestidade)', !/Square and landscape/i.test(JSON.stringify(copy)) && copy.excludes.length >= 2 && /'1:1'/.test(STYLE) && /'4:5'/.test(STYLE) && /'16:9'/.test(STYLE))
checa('1f. o /llms.txt e o /api/facts herdam a copy (studioAdsFacts copia includes/excludes de adsPassCopy, não digita a promessa)', /includes: \[\.\.\.copy\.includes\]/.test(FACTS) && /excludes: \[\.\.\.copy\.excludes\]/.test(FACTS))

// ── 2. FAQ "Do I need a subscription?": o custo por anúncio nasce de KINEO1_35S_CREDITS, nunca digitado ──
const faqStart = DOOR.indexOf('<summary>Do I need a subscription?</summary>')
const faq = DOOR.slice(faqStart, DOOR.indexOf('</details>', faqStart))
checa('2a. FAQ: "Any paid plan includes Studio Ads ({KINEO1_35S_CREDITS} credits per 35-second ad, the same credits as your videos). The pass is for people without a plan"', /Any paid plan includes Studio Ads \(\{KINEO1_35S_CREDITS\} credits per 35-second ad, the same credits as your videos\)\. The pass is for people without a plan/.test(faq))
checa('2b. FAQ: nenhum número de crédito digitado à mão (o passe também vem de {ADS_PASS_CREDITS})', !/\b\d+ credits?\b/.test(faq) && /\{ADS_PASS_CREDITS\} credits/.test(faq))
const offerImport = DOOR.slice(DOOR.indexOf('import {\n  ADS_PASS_ACCESS_DAYS'), DOOR.indexOf("} from '@/lib/ads/offer'"))
checa('2c. KINEO1_35S_CREDITS vem do import de @/lib/ads/offer e é número', offerImport.includes('KINEO1_35S_CREDITS,') && typeof offer.KINEO1_35S_CREDITS === 'number')
// "Any paid plan" é fato do código: todo degrau de TIER_CREDITS (lib/checkoutPricing.ts) entra como 'subscriber' (lib/ads/access.ts).
const cp = load('lib/checkoutPricing.ts')
const access = load('lib/ads/access.ts')
const tiers = Object.keys(cp.TIER_CREDITS)
checa('2d. "Any paid plan includes Studio Ads" é verdade: todo degrau de TIER_CREDITS → adsAccessReason = subscriber', tiers.length >= 3 && tiers.every((plan) => access.adsAccessReason({ plan, ads_access_until: null }, 'someone@example.com') === 'subscriber'))
checa('2e. os modelos de 35 s cobram exatamente KINEO1_35S_CREDITS (a FAQ fala do que o produto cobra)', (() => { const m = load('lib/ads/models.ts'); const s35 = m.ADS_MODELS.filter((x) => x.seconds === 35); return s35.length > 0 && s35.every((x) => x.credits === offer.KINEO1_35S_CREDITS) })())

// ── 3. fila de upload no painel da IA ──
checa('3a. "Wait for the current upload to finish" = 0 no assistente inteiro', count(W, 'Wait for the current upload to finish') === 0)
checa('3b. fila: useRef<Array<{ file: File; isLogo: boolean }>>, push na chegada, retorno se já está esvaziando, laço em série', panel.includes('const uploadQueue = useRef<Array<{ file: File; isLogo: boolean }>>([])') && panel.includes('uploadQueue.current.push(') && panel.includes('if (draining.current) return') && panel.includes('for (let job = uploadQueue.current.shift(); job; job = uploadQueue.current.shift())'))
checa('3c. a fila e o busy zeram no finally (falha no meio não deixa resto pendurado)', /\} finally \{\n\s+uploadQueue\.current = \[\]\n\s+draining\.current = false\n\s+setBusy\(null\)\n\s+\}/.test(panel))
checa('3d. assinatura e proteções de 26/09 continuam: File[] copiado antes de zerar o input, lista vazia vira mensagem', panel.includes('async function addFiles(files: File[], isLogo: boolean)') && count(panel, "const picked = Array.from(e.target.files ?? []); e.target.value = ''; void addFiles(picked, ") === 2 && panel.includes('if (!files.length) return setError('))
checa('3e. o teto de mídia continua valendo dentro da fila (só os logos sobrevivem ao teto)', /if \(!asLogo && mediaRef\.current\.filter\(\(m\) => !m\.isLogo\)\.length >= MAX_MEDIA\) \{\n\s+uploadQueue\.current = uploadQueue\.current\.filter\(\(q\) => q\.isLogo\)/.test(panel))

// ── 4. /ads/new SEM login ──
checa('4a. page.tsx: anônimo renderiza o assistente com gate "anon" em vez de mandar ao /login', /if \(!user\) \{[\s\S]*?<AdsWizardClient gate="anon" access="none" resumingPass=\{false\} \/>/.test(PAGE))
const anonBlock = PAGE.slice(PAGE.indexOf('if (!user) {'), PAGE.indexOf('const { reason } = await loadAdsAccess'))
checa('4b. page.tsx: o único redirect ao /login fica atrás de ?resume=pass ou do modo IA fechado', count(PAGE, 'redirect(`/login') === 1 && /if \(resumingPass \|\| !adsAutoVisible\('none'\)\) \{\n\s+await writeServerEvent[^\n]*\n\s+redirect\(`\/login/.test(anonBlock))
checa('4c. page.tsx: adsAutoVisible importado de @/lib/ads/autoBrief (o painel anônimo É o painel da IA)', /import \{ adsAutoVisible \} from '@\/lib\/ads\/autoBrief'/.test(PAGE))
checa('4d. page.tsx: sem acesso (trial) continua indo a /ads — o rascunho fica no sessionStorage', /if \(gate === 'no_access' && !resumingPass\) \{[\s\S]*?redirect\('\/ads'\)/.test(PAGE))
checa('4e. page.tsx: o rastro do visitante continua (ads_access_denied who:anon), agora com outcome do painel', /name: 'ads_access_denied', path: '\/ads\/new', metadata: \{ stage: 'page', who: 'anon', outcome: 'anonymous_panel' \}/.test(PAGE))
checa('4f. assistente: tipo Gate aceita "anon" e Boot tem "anonymous"', /type Gate = 'ok' \| 'no_access' \| 'closed' \| 'anon'/.test(W) && /\| \{ kind: 'anonymous' \}/.test(W))

// ── 5. rascunho em sessionStorage e ZERO chamadas de API sem login ──
checa('5a. chave "kineo:ads:draft:v1" e validade de 1 h', W.includes("const ADS_DRAFT_KEY = 'kineo:ads:draft:v1'") && W.includes('const ADS_DRAFT_TTL_MS = 60 * 60_000'))
checa('5b. saveDraft grava { text, link, savedAt }; takeDraft lê, APAGA e recusa vencido', /const d: AdsDraft = \{ text, link, savedAt: Date\.now\(\) \}\n\s+window\.sessionStorage\.setItem\(ADS_DRAFT_KEY, JSON\.stringify\(d\)\)/.test(W) && /window\.sessionStorage\.getItem\(ADS_DRAFT_KEY\)/.test(W) && /window\.sessionStorage\.removeItem\(ADS_DRAFT_KEY\)/.test(W) && /Date\.now\(\) - x\.savedAt > ADS_DRAFT_TTL_MS\) return null/.test(W))
const bootEffect = W.slice(W.indexOf('// Carga + reconsulta pós-checkout'), W.indexOf('// URLs locais (blob:)'))
checa('5c. modo anônimo: o efeito de carga sai ANTES do GET /api/ads/orders (que responderia 401)', bootEffect.indexOf("if (gate === 'anon') return") > 0 && bootEffect.indexOf("if (gate === 'anon') return") < bootEffect.indexOf("callJson<OrdersPayload>('/api/ads/orders')"))
checa('5d. modo anônimo: o painel não busca marca/lista (sem GET), nasce em boot "anonymous" e é pintado por esse ramo', /if \(order \|\| anon\) return[^\n]*\n\s+let alive = true\n\s+void callJson<\{ orders\?: AdsOrder\[\] \}>\('\/api\/ads\/orders'\)/.test(panel) && /gate === 'anon' \? \{ kind: 'anonymous' \}/.test(W) && /\} else if \(boot\.kind === 'anonymous'\) \{[\s\S]*?<AdsAutoPanel\n\s+anon\n\s+order=\{null\}/.test(W))
const fnStart = (name) => panel.indexOf(`async function ${name}(`)
const head = (name) => panel.slice(fnStart(name), fnStart(name) + 260)
checa('5e. a 1ª ação de rede (upload, Read my page, Make the plan) guarda o rascunho e vai ao /login ANTES de qualquer await', ['addFiles', 'readLink', 'analyze'].every((f) => fnStart(f) > 0 && /if \(anon\) return saveDraftAndLogin\(text, link\)/.test(head(f)) && head(f).indexOf('if (anon) return saveDraftAndLogin') < (head(f).indexOf('await ') > 0 ? head(f).indexOf('await ') : 999)))
checa('5f. os botões de logo/fotos não abrem o seletor sem login, e a tela avisa em uma linha que arquivos não sobrevivem', count(panel, 'anon ? saveDraftAndLogin(text, link) : logoInput.current?.click()') === 1 && count(panel, 'anon ? saveDraftAndLogin(text, link) : mediaInput.current?.click()') === 1 && /\{anon \? <p className="adsw-hint" role="status">Write first, sign in when you are ready: your text and link come with you; photos and logo are uploaded after you sign in\.<\/p> : null\}/.test(panel))
checa('5g. de volta do login: restaura texto+link do rascunho e diz "Welcome back — your text is here. Add your logo and photos."', /if \(anon\) return\n\s+const d = takeDraft\(\)/.test(panel) && /setText\(\(t\) => t \|\| d\.text\)/.test(panel) && /setLink\(\(l\) => l \|\| d\.link\)/.test(panel) && panel.includes('{welcomeBack ? <p className="adsw-hint" role="status">Welcome back — your text is here. Add your logo and photos.</p> : null}'))
checa('5h. "passo a passo" sem login também passa pelo /login com o rascunho; logado, continua indo ao onSteps de sempre', panel.includes('const stepsOut = () => (anon ? saveDraftAndLogin(text, link) : onSteps())') && count(panel, 'onClick={stepsOut}') === 2 && W.includes('onSteps={toSteps}'))
checa('5i. ads_auto_started só nasce em ensureOrder/applyBrand/remix (todos depois do POST, logo depois do login); nenhum trackEvent atrás de anon', /void trackEvent\('ads_auto_started', \{ order_id: r\.data\.order\.id \}\)/.test(panel.slice(fnStart('ensureOrder'))) && !/anon[^\n]*trackEvent|trackEvent[^\n]*anon/.test(panel))
checa('5j. goLogin continua voltando para /ads/new', W.includes("window.location.href = `/login?redirect=${encodeURIComponent('/ads/new')}`"))

// ── 6. miniatura: uma consulta no GET (nunca N+1) e na lista "Your ads" ──
const get = (ROUTE.match(/export async function GET[\s\S]*?\n\}\n/) || [''])[0]
checa('6a. GET devolve thumbnail_url por pedido via withThumbnails(admin, …), ainda preso ao dono', /orders: await withThumbnails\(admin, data \?\? \[\]\)/.test(get) && /\.eq\('user_id', user\.id\)/.test(get))
checa('6b. uma consulta só em videos pela lista de ids (nunca N+1): .from("videos") aparece 1 vez na rota e fora de laço', count(ROUTE, ".from('videos')") === 1 && /const v = await admin\.from\('videos'\)\.select\('id, thumbnail_url'\)\.in\('id', ids\)/.test(ROUTE) && !/for \([^\n]*\n[^\n]*from\('videos'\)/.test(ROUTE))
checa('6c. falha ao ler videos = miniatura nula, nunca erro; ids deduplicados', /if \(!v\.error\) for \(const row of/.test(ROUTE) && /thumbs\.get\(o\.video_id\) \?\? null : null/.test(ROUTE) && /Array\.from\(new Set\(orders\.map\(\(o\) => o\.video_id\)/.test(ROUTE))
checa('6d. tipo do pedido: thumbnail_url opcional (só do GET, não é coluna de ads_orders)', /thumbnail_url\?: string \| null/.test(TYPES) && !/thumbnail_url/.test(ROUTE.match(/const ORDER_COLUMNS = '[^']*'/)[0]))
checa('6e. lista "Your ads": miniatura (thumbnail_url ou a 1ª foto), negócio · modelo · data COM hora · idioma, e o botão de sempre', panel.includes("const thumb = o.thumbnail_url ?? orderMedia(o).find((m) => !m.isLogo && m.kind === 'image')?.url ?? null") && panel.includes("toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })") && panel.includes('lang.native') && panel.includes('<img className="adsw-thumb"') && panel.includes('Open · more versions') && /\.adsw \.adsw-thumb\{/.test(W))
checa('6f. entregue + modo IA → hydrate abre na lista (order null, view brief) e a entrega fica atrás de "Open · more versions"', /if \(\(pick\.status === 'delivered' \|\| pick\.status === 'reviewed'\) && adsAutoVisible\(access\)\) \{\n\s+orderRef\.current = null\n\s+setOrder\(null\)\n\s+setBeats\(null\)\n\s+setStoryboard\(\{\}\)\n\s+setCard\(null\)\n\s+setView\('brief'\)\n\s+return\n\s+\}/.test(W) && W.includes('onOpenAd={(o) => {') && /\}, \[access\]\)\n\n\s+\/\/ Carga \+ reconsulta/.test(W))

// ── 7. barra de progresso ──
checa('7. progresso: "3 to 7 minutes" = 0; "This usually takes 2–3 minutes." presente', count(W, '3 to 7 minutes') === 0 && W.includes('This usually takes 2–3 minutes.'))

console.log(`test-ads-sprint16h-2026-09-27: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
