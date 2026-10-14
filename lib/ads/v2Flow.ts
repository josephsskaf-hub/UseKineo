// KINEO-ADS-FLUXO-2026-10-13 — o FLUXO NOVO do Studio Ads (modo simples do /ads/v2), no formato do Studio de filmes.
// Fundador, 13/10: "o design do estúdio de fazer filme está muito bom; traz para o Ads" (benchmark-ads-fluxo-2026-10-13.md,
// seções 4 e 5). Esta lib é PURA (só importa tipos): as abas, a cor de cada estilo no palco, os anúncios da casa do
// "Comece deste", a vaga dos 2–3 roteiros (que outra pista entrega no /plan) e as frases novas nas 16 línguas.
// Nada aqui chama rota, cobra ou decide preço: o custo da tela continua vindo de adsV2Credits (lib/ads/v2Tiers.ts).
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import type { AdsV2StyleChoice, AdsV2StyleKey } from '@/lib/ads/v2Styles'
import type { AdsV2ScenePresetId } from '@/lib/ads/v2Scene'

// ─── as abas do topo (como Filme/Clipe no Studio) ────────────────────────────────────────────────────────────────────

export type AdsV2FlowTab = 'one' | 'batch' | 'production'
/** Um anúncio = o modo simples; Lote = ?mode=batch; Produção = o construtor completo (?mode=full). Link de página inteira. */
export const ADS_V2_FLOW_TABS: ReadonlyArray<{ id: AdsV2FlowTab; href: string }> = [
  { id: 'one', href: '/ads/v2' },
  { id: 'batch', href: '/ads/v2?mode=batch' },
  { id: 'production', href: '/ads/v2?mode=full' },
]
export function adsV2FlowTabFor(mode: 'simple' | 'full' | 'batch' | null | undefined): AdsV2FlowTab | null {
  return mode === 'simple' ? 'one' : mode === 'batch' ? 'batch' : mode === 'full' ? 'production' : null
}

// ─── a cor de cada estilo (pinta o palco, como STAGE_TINT dos motores no Studio) ─────────────────────────────────────

/** Sem estilo ("Auto") = a cor do Ads de sempre (PRODUCT_TINT.ads em components/ProductStage.tsx). */
export const ADS_V2_FLOW_AUTO_TINT: readonly [string, string] = ['#2563EB', '#F43F5E']
export const ADS_V2_STYLE_TINT: Readonly<Record<AdsV2StyleKey, readonly [string, string]>> = {
  package_explosion: ['#F97316', '#EF4444'],
  giant_product: ['#6366F1', '#22D3EE'],
  product_closeup: ['#E0A458', '#8B5CF6'],
  ocean_ad: ['#0EA5E9', '#14B8A6'],
  mechanical_assembly: ['#64748B', '#38BDF8'],
  naked_eye_3d_ad: ['#A855F7', '#06B6D4'],
  beach_ad: ['#F59E0B', '#06B6D4'],
  lighting_ad: ['#FACC15', '#6366F1'],
  supermarket_ad: ['#22C55E', '#EAB308'],
  poster_ad: ['#EC4899', '#F59E0B'],
  graffiti_ad: ['#F43F5E', '#84CC16'],
  dreamlike_cloud: ['#A78BFA', '#60A5FA'],
  parachute_delivery: ['#3B82F6', '#F97316'],
  shoal_surround: ['#0891B2', '#2DD4BF'],
  dishes_served: ['#EA580C', '#FBBF24'],
  // KINEO-ESTILOS-DIA1-2026-10-13
  dolly_zoom: ['#78716C', '#F59E0B'],
  boom_drop: ['#DC2626', '#F97316'],
  macaron_machine: ['#F9A8D4', '#5EEAD4'],
  starlight_gift: ['#1D4ED8', '#FDE68A'],
}
export function adsV2StyleTint(style: AdsV2StyleChoice | string | null | undefined): readonly [string, string] {
  return style && style !== 'none' && Object.prototype.hasOwnProperty.call(ADS_V2_STYLE_TINT, style) ? ADS_V2_STYLE_TINT[style as AdsV2StyleKey] : ADS_V2_FLOW_AUTO_TINT
}

// ─── "Comece deste": anúncios da casa que preenchem ESTILO + CENA + PESSOA (nunca o produto) ─────────────────────────

/**
 * Cada vídeo é um arquivo da casa que já existe: a prévia feita PELO PRÓPRIO efeito (public/ads-styles/<estilo>.mp4) ou o
 * clipe de verdade de um apresentador de IA (public/ads/presenters/<id>.mp4). O clique copia a receita (estilo, clima da
 * cena, apresentador) — fotos, texto, link, preço e nível ficam como estão.
 */
export interface AdsV2StartFrom {
  id: string
  video: string
  poster: string
  style: AdsV2StyleChoice
  scene: AdsV2ScenePresetId | null
  presenter: string | null
}
const styleAsset = (k: AdsV2StyleKey) => ({ video: `/ads-styles/${k}.mp4`, poster: `/ads-styles/${k}.jpg` })
export const ADS_V2_START_FROM: readonly AdsV2StartFrom[] = [
  { id: 'giant-neon', style: 'giant_product', scene: 'neon', presenter: null, ...styleAsset('giant_product') },
  { id: 'explosion', style: 'package_explosion', scene: null, presenter: null, ...styleAsset('package_explosion') },
  { id: 'sofia', style: 'none', scene: null, presenter: 'sofia', video: '/ads/presenters/sofia.mp4', poster: '/ads/presenters/sofia.webp' },
  { id: 'beach-sunset', style: 'beach_ad', scene: 'sunset', presenter: null, ...styleAsset('beach_ad') },
  { id: 'closeup-rain', style: 'product_closeup', scene: 'rain', presenter: null, ...styleAsset('product_closeup') },
  { id: 'billboard-neon', style: 'naked_eye_3d_ad', scene: 'neon', presenter: null, ...styleAsset('naked_eye_3d_ad') },
  { id: 'amara-snow', style: 'none', scene: 'snow', presenter: 'amara', video: '/ads/presenters/amara.mp4', poster: '/ads/presenters/amara.webp' },
  { id: 'clouds', style: 'dreamlike_cloud', scene: null, presenter: null, ...styleAsset('dreamlike_cloud') },
]

/** A receita de um anúncio da casa: SÓ estilo, clima da cena e pessoa (null = sem pessoa). Id desconhecido = null. */
export function adsV2StartFromRecipe(id: string): { style: AdsV2StyleChoice; scene: AdsV2ScenePresetId | null; presenter: string | null } | null {
  const it = ADS_V2_START_FROM.find((x) => x.id === id)
  return it ? { style: it.style, scene: it.scene, presenter: it.presenter } : null
}

// ─── os 2–3 roteiros (KINEO-ADS-ROTEIROS, pista codex/ads-roteiros-1310) ─────────────────────────────────────────────
// Contrato: POST /api/ads/v2/plan devolve, além do de sempre, `scripts: [{ id: 'a'|'b'|'c', tone: 'benefit'|'bold'|'story',
// label, narration, overlays: [{role,start,end,text}], words }]` e `script_id: 'a'` (o 'a' = a própria narration/overlays da
// resposta). Escolher = POST /api/ads/v2/plan/choose { order_id, script_id } → { order_id, script_id, tone, narration,
// overlays, credits } (400 id ruim, 404 não achou, 409 já gerando). O lote manda `scripts: false`. Sem `scripts` = o de hoje.

export const ADS_V2_SCRIPT_TONES = ['benefit', 'bold', 'story'] as const
export type AdsV2ScriptTone = (typeof ADS_V2_SCRIPT_TONES)[number]
/** O /plan só é disparado sozinho depois que a pessoa para de digitar por este tempo (e só com mudança de verdade). */
export const ADS_V2_AUTO_PLAN_MS = 1200
/** Rota de escolha do roteiro (grátis; não cobra, não planeja de novo). */
export const ADS_V2_SCRIPT_CHOOSE_ROUTE = '/api/ads/v2/plan/choose'

export interface AdsV2ScriptOption {
  key: string
  /** A, B, C — pela ordem em que o servidor mandou */
  letter: string
  /** o tom conhecido (traduzido na tela pelas frases) ou null */
  tone: AdsV2ScriptTone | null
  /** o rótulo que o servidor deu (usado só quando o tom não é conhecido) */
  label: string | null
  narration: string | null
  overlays: string[]
  words: number | null
}
/** Lê `scripts` da resposta do /plan com tolerância; menos de 2 opções válidas = null (a tela mostra o roteiro único de hoje). */
export function adsV2ScriptOptions(raw: unknown): AdsV2ScriptOption[] | null {
  if (!Array.isArray(raw)) return null
  const out: AdsV2ScriptOption[] = []
  for (const [i, s] of raw.slice(0, 3).entries()) {
    if (!s || typeof s !== 'object') continue
    const o = s as Record<string, unknown>
    const narration = typeof o.narration === 'string' && o.narration.trim() ? o.narration.replace(/\s+/g, ' ').trim() : null
    const overlays = (Array.isArray(o.overlays) ? o.overlays : [])
      .map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' && typeof (x as { text?: unknown }).text === 'string' ? (x as { text: string }).text : ''))
      .map((x) => x.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    if (!narration && !overlays.length) continue
    const key = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : String(i)
    const tone = typeof o.tone === 'string' && (ADS_V2_SCRIPT_TONES as readonly string[]).includes(o.tone) ? (o.tone as AdsV2ScriptTone) : null
    const label = typeof o.label === 'string' && o.label.trim() ? o.label.trim() : null
    const words = typeof o.words === 'number' && Number.isFinite(o.words) && o.words >= 0 ? Math.round(o.words) : null
    out.push({ key, letter: String.fromCharCode(65 + out.length), tone, label, narration, overlays, words })
  }
  return out.length >= 2 ? out : null
}

/** O título do produto que a página deu, no teto do campo do quadro final (corta em fronteira de palavra). */
export function adsV2FlowName(title: unknown, max = 60): string {
  const t = typeof title === 'string' ? title.replace(/\s+/g, ' ').trim() : ''
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const sp = cut.lastIndexOf(' ')
  return (sp > 20 ? cut.slice(0, sp) : cut).replace(/[\s—–|,;:-]+$/u, '').trim()
}

// ─── as frases (16 línguas; nenhuma cai no inglês) ───────────────────────────────────────────────────────────────────

export interface AdsV2FlowCopy {
  tabs: { label: string; one: string; batch: string; production: string }
  link: { title: string; stores: string; paste: string; pasteFail: string; orPhoto: string }
  read: { title: string; name: string; price: string; priceNone: string; from: string; fix: string }
  stage: { eyebrow: string; autoDesc: string; bestFor: string; style: string; opening: string; end: string; badge: string }
  review: { planShort: string; title: string; product: string; style: string; scene: string; presenter: string; level: string; none: string; noPerson: string; surprise: string; then: string; go: string; scripts: string; scriptsHint: string }
  start: { title: string; sub: string; use: string; applied: string }
  /** o roteiro sai sozinho (sem o botão "Descobrir e planejar"); "Atualizar roteiros" fica como link manual */
  auto: { note: string; paused: string; refresh: string; writeNow: string }
  /** o tom de cada roteiro do /plan (benefit/bold/story), traduzido */
  tones: Record<AdsV2ScriptTone, string>
}

const EN: AdsV2FlowCopy = {
  tabs: { label: 'Ad mode', one: 'One ad', batch: 'Batch', production: 'Production' },
  link: { title: 'Paste your product link', stores: 'Shopify, Amazon, Etsy or any product page — we read the name, photos and price.', paste: 'Paste', pasteFail: 'Your browser blocked pasting — click the box and paste the link there.', orPhoto: 'or drop a photo' },
  read: { title: 'We read your page', name: 'Product name', price: 'Price', priceNone: 'No price on the page — add one if you want it in the ad.', from: 'From {host} · {n} photos', fix: 'Fix anything that looks wrong.' },
  stage: { eyebrow: 'Style', autoDesc: 'We pick the look from your product.', bestFor: 'Best for', style: 'Style', opening: 'Your opening', end: 'End card', badge: 'Style preview' },
  review: { planShort: 'Script (free)', title: 'Review and generate', product: 'Product', style: 'Style', scene: 'Scene', presenter: 'Person', level: 'Level', none: '—', noPerson: 'No person', surprise: 'Surprise me', then: 'Free. Next: {go}', go: 'Generate · {c} credits', scripts: 'Choose your script', scriptsHint: 'Pick one; you can still edit it before you generate.' },
  auto: { note: 'We write your scripts by ourselves once your product and text are in — free.', paused: 'Automatic scripts paused. Tap “Refresh scripts” to try again.', refresh: 'Refresh scripts', writeNow: 'Write my scripts now' },
  tones: { benefit: 'Benefit', bold: 'Bold', story: 'Story' },
  start: { title: 'Start from a Kineo ad', sub: 'One tap copies the style, scene and person. Your product stays yours.', use: 'Start from this', applied: 'Copied the style, scene and person. Your photos and text did not change.' },
}
const PT: AdsV2FlowCopy = {
  tabs: { label: 'Modo do anúncio', one: 'Um anúncio', batch: 'Lote', production: 'Produção' },
  link: { title: 'Cole o link do seu produto', stores: 'Shopify, Amazon, Etsy ou qualquer página de produto — lemos o nome, as fotos e o preço.', paste: 'Colar', pasteFail: 'O navegador bloqueou o colar — clique na caixa e cole o link ali.', orPhoto: 'ou arraste uma foto' },
  read: { title: 'Lemos sua página', name: 'Nome do produto', price: 'Preço', priceNone: 'A página não tem preço — coloque um se quiser no anúncio.', from: 'De {host} · {n} fotos', fix: 'Corrija o que estiver errado.' },
  stage: { eyebrow: 'Estilo', autoDesc: 'A gente escolhe o visual pelo seu produto.', bestFor: 'Ideal para', style: 'Estilo', opening: 'Sua abertura', end: 'Quadro final', badge: 'Prévia do estilo' },
  review: { planShort: 'Roteiro (grátis)', title: 'Revisar e gerar', product: 'Produto', style: 'Estilo', scene: 'Cena', presenter: 'Pessoa', level: 'Nível', none: '—', noPerson: 'Sem pessoa', surprise: 'Surpresa', then: 'Grátis. Depois: {go}', go: 'Gerar · {c} créditos', scripts: 'Escolha seu roteiro', scriptsHint: 'Escolha um; dá para editar antes de gerar.' },
  auto: { note: 'Escrevemos seus roteiros sozinhos assim que o produto e o texto estiverem aqui — grátis.', paused: 'Roteiros automáticos pausados. Toque em “Atualizar roteiros” para tentar de novo.', refresh: 'Atualizar roteiros', writeNow: 'Escrever meus roteiros agora' },
  tones: { benefit: 'Benefício', bold: 'Direto', story: 'História' },
  start: { title: 'Comece de um anúncio da Kineo', sub: 'Um toque copia o estilo, a cena e a pessoa. O produto continua sendo o seu.', use: 'Comece deste', applied: 'Estilo, cena e pessoa copiados. Suas fotos e seu texto não mudaram.' },
}
const ES: AdsV2FlowCopy = {
  tabs: { label: 'Modo del anuncio', one: 'Un anuncio', batch: 'Lote', production: 'Producción' },
  link: { title: 'Pega el enlace de tu producto', stores: 'Shopify, Amazon, Etsy o cualquier página de producto: leemos el nombre, las fotos y el precio.', paste: 'Pegar', pasteFail: 'Tu navegador bloqueó el pegado: haz clic en la caja y pega el enlace ahí.', orPhoto: 'o arrastra una foto' },
  read: { title: 'Leímos tu página', name: 'Nombre del producto', price: 'Precio', priceNone: 'La página no tiene precio: añade uno si lo quieres en el anuncio.', from: 'De {host} · {n} fotos', fix: 'Corrige lo que esté mal.' },
  stage: { eyebrow: 'Estilo', autoDesc: 'Elegimos el estilo según tu producto.', bestFor: 'Ideal para', style: 'Estilo', opening: 'Tu apertura', end: 'Cierre', badge: 'Vista previa del estilo' },
  review: { planShort: 'Guion (gratis)', title: 'Revisar y generar', product: 'Producto', style: 'Estilo', scene: 'Escena', presenter: 'Persona', level: 'Nivel', none: '—', noPerson: 'Sin persona', surprise: 'Sorpréndeme', then: 'Gratis. Después: {go}', go: 'Generar · {c} créditos', scripts: 'Elige tu guion', scriptsHint: 'Elige uno; aún puedes editarlo antes de generar.' },
  auto: { note: 'Escribimos tus guiones solos en cuanto estén el producto y el texto — gratis.', paused: 'Guiones automáticos en pausa. Toca «Actualizar guiones» para intentarlo de nuevo.', refresh: 'Actualizar guiones', writeNow: 'Escribir mis guiones ahora' },
  tones: { benefit: 'Beneficio', bold: 'Directo', story: 'Historia' },
  start: { title: 'Empieza desde un anuncio de Kineo', sub: 'Un toque copia el estilo, la escena y la persona. Tu producto sigue siendo tuyo.', use: 'Empezar desde este', applied: 'Copiamos el estilo, la escena y la persona. Tus fotos y tu texto no cambiaron.' },
}
const FR: AdsV2FlowCopy = {
  tabs: { label: 'Mode de la pub', one: 'Une pub', batch: 'Lot', production: 'Production' },
  link: { title: 'Collez le lien de votre produit', stores: 'Shopify, Amazon, Etsy ou toute page produit — nous lisons le nom, les photos et le prix.', paste: 'Coller', pasteFail: 'Votre navigateur a bloqué le collage — cliquez dans le champ et collez-y le lien.', orPhoto: 'ou déposez une photo' },
  read: { title: 'Nous avons lu votre page', name: 'Nom du produit', price: 'Prix', priceNone: 'Pas de prix sur la page — ajoutez-en un si vous le voulez dans la pub.', from: 'De {host} · {n} photos', fix: 'Corrigez ce qui semble faux.' },
  stage: { eyebrow: 'Style', autoDesc: 'Nous choisissons le rendu selon votre produit.', bestFor: 'Idéal pour', style: 'Style', opening: 'Votre ouverture', end: 'Carte finale', badge: 'Aperçu du style' },
  review: { planShort: 'Script (gratuit)', title: 'Vérifier et générer', product: 'Produit', style: 'Style', scene: 'Scène', presenter: 'Personne', level: 'Niveau', none: '—', noPerson: 'Sans personne', surprise: 'Surprenez-moi', then: 'Gratuit. Ensuite : {go}', go: 'Générer · {c} crédits', scripts: 'Choisissez votre script', scriptsHint: 'Choisissez-en un ; vous pourrez encore le modifier avant de générer.' },
  auto: { note: 'Nous écrivons vos scripts tout seuls dès que le produit et le texte sont là — gratuit.', paused: 'Scripts automatiques en pause. Touchez « Actualiser les scripts » pour réessayer.', refresh: 'Actualiser les scripts', writeNow: 'Écrire mes scripts maintenant' },
  tones: { benefit: 'Bénéfice', bold: 'Audacieux', story: 'Histoire' },
  start: { title: 'Partir d’une pub Kineo', sub: 'Un clic copie le style, la scène et la personne. Votre produit reste le vôtre.', use: 'Partir de celle-ci', applied: 'Style, scène et personne copiés. Vos photos et votre texte n’ont pas changé.' },
}
const DE: AdsV2FlowCopy = {
  tabs: { label: 'Anzeigenmodus', one: 'Eine Anzeige', batch: 'Stapel', production: 'Produktion' },
  link: { title: 'Füge den Link zu deinem Produkt ein', stores: 'Shopify, Amazon, Etsy oder jede Produktseite — wir lesen Name, Fotos und Preis.', paste: 'Einfügen', pasteFail: 'Dein Browser hat das Einfügen blockiert — klicke ins Feld und füge den Link dort ein.', orPhoto: 'oder zieh ein Foto hierher' },
  read: { title: 'Wir haben deine Seite gelesen', name: 'Produktname', price: 'Preis', priceNone: 'Kein Preis auf der Seite — trag einen ein, wenn er in die Anzeige soll.', from: 'Von {host} · {n} Fotos', fix: 'Korrigiere, was nicht stimmt.' },
  stage: { eyebrow: 'Stil', autoDesc: 'Wir wählen den Look passend zu deinem Produkt.', bestFor: 'Ideal für', style: 'Stil', opening: 'Dein Einstieg', end: 'Abschlusskarte', badge: 'Stil-Vorschau' },
  review: { planShort: 'Skript (gratis)', title: 'Prüfen und erstellen', product: 'Produkt', style: 'Stil', scene: 'Szene', presenter: 'Person', level: 'Stufe', none: '—', noPerson: 'Ohne Person', surprise: 'Überrasch mich', then: 'Kostenlos. Danach: {go}', go: 'Erstellen · {c} Credits', scripts: 'Wähle dein Skript', scriptsHint: 'Wähle eins; du kannst es vor dem Erstellen noch bearbeiten.' },
  auto: { note: 'Wir schreiben deine Skripte von selbst, sobald Produkt und Text da sind — kostenlos.', paused: 'Automatische Skripte pausiert. Tippe auf „Skripte aktualisieren“, um es erneut zu versuchen.', refresh: 'Skripte aktualisieren', writeNow: 'Meine Skripte jetzt schreiben' },
  tones: { benefit: 'Nutzen', bold: 'Mutig', story: 'Geschichte' },
  start: { title: 'Starte mit einer Kineo-Anzeige', sub: 'Ein Tipp übernimmt Stil, Szene und Person. Dein Produkt bleibt deins.', use: 'Damit starten', applied: 'Stil, Szene und Person übernommen. Deine Fotos und dein Text sind unverändert.' },
}
const IT: AdsV2FlowCopy = {
  tabs: { label: 'Modalità annuncio', one: 'Un annuncio', batch: 'Lotto', production: 'Produzione' },
  link: { title: 'Incolla il link del tuo prodotto', stores: 'Shopify, Amazon, Etsy o qualsiasi pagina prodotto: leggiamo nome, foto e prezzo.', paste: 'Incolla', pasteFail: 'Il browser ha bloccato l’incolla: clicca nel campo e incolla lì il link.', orPhoto: 'oppure trascina una foto' },
  read: { title: 'Abbiamo letto la tua pagina', name: 'Nome del prodotto', price: 'Prezzo', priceNone: 'Nessun prezzo nella pagina: aggiungine uno se lo vuoi nell’annuncio.', from: 'Da {host} · {n} foto', fix: 'Correggi ciò che non va.' },
  stage: { eyebrow: 'Stile', autoDesc: 'Scegliamo lo stile in base al tuo prodotto.', bestFor: 'Ideale per', style: 'Stile', opening: 'La tua apertura', end: 'Schermata finale', badge: 'Anteprima dello stile' },
  review: { planShort: 'Copione (gratis)', title: 'Rivedi e genera', product: 'Prodotto', style: 'Stile', scene: 'Scena', presenter: 'Persona', level: 'Livello', none: '—', noPerson: 'Nessuna persona', surprise: 'Sorprendimi', then: 'Gratis. Poi: {go}', go: 'Genera · {c} crediti', scripts: 'Scegli il tuo copione', scriptsHint: 'Scegline uno; puoi ancora modificarlo prima di generare.' },
  auto: { note: 'Scriviamo i tuoi copioni da soli appena ci sono prodotto e testo — gratis.', paused: 'Copioni automatici in pausa. Tocca «Aggiorna copioni» per riprovare.', refresh: 'Aggiorna copioni', writeNow: 'Scrivi ora i miei copioni' },
  tones: { benefit: 'Beneficio', bold: 'Audace', story: 'Storia' },
  start: { title: 'Parti da un annuncio Kineo', sub: 'Un tocco copia stile, scena e persona. Il prodotto resta il tuo.', use: 'Parti da questo', applied: 'Stile, scena e persona copiati. Le tue foto e il tuo testo non sono cambiati.' },
}
const NL: AdsV2FlowCopy = {
  tabs: { label: 'Advertentiemodus', one: 'Eén advertentie', batch: 'Batch', production: 'Productie' },
  link: { title: 'Plak de link van je product', stores: 'Shopify, Amazon, Etsy of elke productpagina — we lezen de naam, foto’s en prijs.', paste: 'Plakken', pasteFail: 'Je browser blokkeerde plakken — klik in het vak en plak de link daar.', orPhoto: 'of sleep een foto hierheen' },
  read: { title: 'We hebben je pagina gelezen', name: 'Productnaam', price: 'Prijs', priceNone: 'Geen prijs op de pagina — voeg er een toe als je die in de advertentie wilt.', from: 'Van {host} · {n} foto’s', fix: 'Verbeter wat niet klopt.' },
  stage: { eyebrow: 'Stijl', autoDesc: 'We kiezen de look op basis van je product.', bestFor: 'Ideaal voor', style: 'Stijl', opening: 'Je opening', end: 'Eindkaart', badge: 'Stijlvoorbeeld' },
  review: { planShort: 'Script (gratis)', title: 'Controleren en maken', product: 'Product', style: 'Stijl', scene: 'Scène', presenter: 'Persoon', level: 'Niveau', none: '—', noPerson: 'Geen persoon', surprise: 'Verras me', then: 'Gratis. Daarna: {go}', go: 'Maken · {c} credits', scripts: 'Kies je script', scriptsHint: 'Kies er een; je kunt het nog bewerken voordat je maakt.' },
  auto: { note: 'We schrijven je scripts vanzelf zodra product en tekst er zijn — gratis.', paused: 'Automatische scripts gepauzeerd. Tik op ‘Scripts vernieuwen’ om het opnieuw te proberen.', refresh: 'Scripts vernieuwen', writeNow: 'Schrijf mijn scripts nu' },
  tones: { benefit: 'Voordeel', bold: 'Gedurfd', story: 'Verhaal' },
  start: { title: 'Begin met een Kineo-advertentie', sub: 'Eén tik kopieert de stijl, scène en persoon. Je product blijft van jou.', use: 'Hiermee beginnen', applied: 'Stijl, scène en persoon gekopieerd. Je foto’s en tekst zijn niet veranderd.' },
}
const PL: AdsV2FlowCopy = {
  tabs: { label: 'Tryb reklamy', one: 'Jedna reklama', batch: 'Seria', production: 'Produkcja' },
  link: { title: 'Wklej link do swojego produktu', stores: 'Shopify, Amazon, Etsy lub dowolna strona produktu — odczytamy nazwę, zdjęcia i cenę.', paste: 'Wklej', pasteFail: 'Przeglądarka zablokowała wklejanie — kliknij pole i wklej tam link.', orPhoto: 'lub przeciągnij zdjęcie' },
  read: { title: 'Odczytaliśmy Twoją stronę', name: 'Nazwa produktu', price: 'Cena', priceNone: 'Na stronie nie ma ceny — dodaj ją, jeśli ma być w reklamie.', from: 'Z {host} · zdjęcia: {n}', fix: 'Popraw to, co się nie zgadza.' },
  stage: { eyebrow: 'Styl', autoDesc: 'Dobieramy wygląd do Twojego produktu.', bestFor: 'Najlepszy do', style: 'Styl', opening: 'Twój początek', end: 'Plansza końcowa', badge: 'Podgląd stylu' },
  review: { planShort: 'Scenariusz (za darmo)', title: 'Sprawdź i wygeneruj', product: 'Produkt', style: 'Styl', scene: 'Scena', presenter: 'Osoba', level: 'Poziom', none: '—', noPerson: 'Bez osoby', surprise: 'Zaskocz mnie', then: 'Za darmo. Potem: {go}', go: 'Generuj · {c} kredytów', scripts: 'Wybierz scenariusz', scriptsHint: 'Wybierz jeden; przed generowaniem nadal możesz go edytować.' },
  auto: { note: 'Piszemy scenariusze sami, gdy tylko będą produkt i tekst — za darmo.', paused: 'Automatyczne scenariusze wstrzymane. Stuknij „Odśwież scenariusze”, aby spróbować ponownie.', refresh: 'Odśwież scenariusze', writeNow: 'Napisz teraz moje scenariusze' },
  tones: { benefit: 'Korzyść', bold: 'Odważny', story: 'Historia' },
  start: { title: 'Zacznij od reklamy Kineo', sub: 'Jedno dotknięcie kopiuje styl, scenę i osobę. Produkt zostaje Twój.', use: 'Zacznij od tej', applied: 'Skopiowano styl, scenę i osobę. Twoje zdjęcia i tekst się nie zmieniły.' },
}
const TR: AdsV2FlowCopy = {
  tabs: { label: 'Reklam modu', one: 'Tek reklam', batch: 'Toplu', production: 'Prodüksiyon' },
  link: { title: 'Ürün bağlantını yapıştır', stores: 'Shopify, Amazon, Etsy veya herhangi bir ürün sayfası — adı, fotoğrafları ve fiyatı okuruz.', paste: 'Yapıştır', pasteFail: 'Tarayıcın yapıştırmayı engelledi — kutuya tıklayıp bağlantıyı oraya yapıştır.', orPhoto: 'ya da bir fotoğraf sürükle' },
  read: { title: 'Sayfanı okuduk', name: 'Ürün adı', price: 'Fiyat', priceNone: 'Sayfada fiyat yok — reklamda olsun istersen bir fiyat ekle.', from: '{host} kaynağından · {n} fotoğraf', fix: 'Yanlış görünen her şeyi düzelt.' },
  stage: { eyebrow: 'Stil', autoDesc: 'Görünümü ürününe göre biz seçeriz.', bestFor: 'En uygun', style: 'Stil', opening: 'Açılışın', end: 'Kapanış kartı', badge: 'Stil önizlemesi' },
  review: { planShort: 'Senaryo (ücretsiz)', title: 'Gözden geçir ve oluştur', product: 'Ürün', style: 'Stil', scene: 'Sahne', presenter: 'Kişi', level: 'Seviye', none: '—', noPerson: 'Kişi yok', surprise: 'Beni şaşırt', then: 'Ücretsiz. Sonra: {go}', go: 'Oluştur · {c} kredi', scripts: 'Senaryonu seç', scriptsHint: 'Birini seç; oluşturmadan önce yine düzenleyebilirsin.' },
  auto: { note: 'Ürün ve metin hazır olunca senaryolarını kendimiz yazarız — ücretsiz.', paused: 'Otomatik senaryolar duraklatıldı. Yeniden denemek için “Senaryoları yenile”ye dokun.', refresh: 'Senaryoları yenile', writeNow: 'Senaryolarımı şimdi yaz' },
  tones: { benefit: 'Fayda', bold: 'Cesur', story: 'Hikâye' },
  start: { title: 'Bir Kineo reklamından başla', sub: 'Tek dokunuş stili, sahneyi ve kişiyi kopyalar. Ürün senin kalır.', use: 'Bundan başla', applied: 'Stil, sahne ve kişi kopyalandı. Fotoğrafların ve metnin değişmedi.' },
}
const RU: AdsV2FlowCopy = {
  tabs: { label: 'Режим рекламы', one: 'Одна реклама', batch: 'Пакет', production: 'Продакшн' },
  link: { title: 'Вставьте ссылку на товар', stores: 'Shopify, Amazon, Etsy или любая страница товара — мы прочитаем название, фото и цену.', paste: 'Вставить', pasteFail: 'Браузер заблокировал вставку — нажмите на поле и вставьте ссылку туда.', orPhoto: 'или перетащите фото' },
  read: { title: 'Мы прочитали вашу страницу', name: 'Название товара', price: 'Цена', priceNone: 'На странице нет цены — добавьте её, если она нужна в рекламе.', from: 'С {host} · фото: {n}', fix: 'Исправьте то, что выглядит неверно.' },
  stage: { eyebrow: 'Стиль', autoDesc: 'Мы подберём стиль под ваш товар.', bestFor: 'Лучше всего для', style: 'Стиль', opening: 'Ваше начало', end: 'Финальный кадр', badge: 'Пример стиля' },
  review: { planShort: 'Сценарий (бесплатно)', title: 'Проверить и создать', product: 'Товар', style: 'Стиль', scene: 'Сцена', presenter: 'Человек', level: 'Уровень', none: '—', noPerson: 'Без человека', surprise: 'Удивите меня', then: 'Бесплатно. Затем: {go}', go: 'Создать · {c} кредитов', scripts: 'Выберите сценарий', scriptsHint: 'Выберите один; его ещё можно изменить перед созданием.' },
  auto: { note: 'Мы сами напишем сценарии, как только будут товар и текст, — бесплатно.', paused: 'Автоматические сценарии на паузе. Нажмите «Обновить сценарии», чтобы попробовать снова.', refresh: 'Обновить сценарии', writeNow: 'Написать сценарии сейчас' },
  tones: { benefit: 'Выгода', bold: 'Смело', story: 'История' },
  start: { title: 'Начните с рекламы Kineo', sub: 'Одно нажатие копирует стиль, сцену и человека. Товар остаётся вашим.', use: 'Начать с этой', applied: 'Стиль, сцена и человек скопированы. Ваши фото и текст не изменились.' },
}
const UK: AdsV2FlowCopy = {
  tabs: { label: 'Режим реклами', one: 'Одна реклама', batch: 'Пакет', production: 'Продакшн' },
  link: { title: 'Вставте посилання на товар', stores: 'Shopify, Amazon, Etsy або будь-яка сторінка товару — ми прочитаємо назву, фото й ціну.', paste: 'Вставити', pasteFail: 'Браузер заблокував вставлення — натисніть на поле й вставте посилання туди.', orPhoto: 'або перетягніть фото' },
  read: { title: 'Ми прочитали вашу сторінку', name: 'Назва товару', price: 'Ціна', priceNone: 'На сторінці немає ціни — додайте її, якщо вона потрібна в рекламі.', from: 'З {host} · фото: {n}', fix: 'Виправте те, що виглядає неправильно.' },
  stage: { eyebrow: 'Стиль', autoDesc: 'Ми підберемо стиль під ваш товар.', bestFor: 'Найкраще для', style: 'Стиль', opening: 'Ваш початок', end: 'Фінальний кадр', badge: 'Приклад стилю' },
  review: { planShort: 'Сценарій (безкоштовно)', title: 'Перевірити й створити', product: 'Товар', style: 'Стиль', scene: 'Сцена', presenter: 'Людина', level: 'Рівень', none: '—', noPerson: 'Без людини', surprise: 'Здивуйте мене', then: 'Безкоштовно. Далі: {go}', go: 'Створити · {c} кредитів', scripts: 'Оберіть сценарій', scriptsHint: 'Оберіть один; його ще можна змінити перед створенням.' },
  auto: { note: 'Ми самі напишемо сценарії, щойно будуть товар і текст, — безкоштовно.', paused: 'Автоматичні сценарії на паузі. Натисніть «Оновити сценарії», щоб спробувати знову.', refresh: 'Оновити сценарії', writeNow: 'Написати сценарії зараз' },
  tones: { benefit: 'Вигода', bold: 'Сміливо', story: 'Історія' },
  start: { title: 'Почніть із реклами Kineo', sub: 'Одне натискання копіює стиль, сцену й людину. Товар лишається вашим.', use: 'Почати з цієї', applied: 'Стиль, сцену й людину скопійовано. Ваші фото й текст не змінилися.' },
}
const AR: AdsV2FlowCopy = {
  tabs: { label: 'وضع الإعلان', one: 'إعلان واحد', batch: 'دفعة', production: 'إنتاج' },
  link: { title: 'الصق رابط منتجك', stores: 'Shopify أو Amazon أو Etsy أو أي صفحة منتج — نقرأ الاسم والصور والسعر.', paste: 'لصق', pasteFail: 'منع المتصفح اللصق — انقر داخل المربع والصق الرابط هناك.', orPhoto: 'أو اسحب صورة' },
  read: { title: 'قرأنا صفحتك', name: 'اسم المنتج', price: 'السعر', priceNone: 'لا يوجد سعر في الصفحة — أضف سعرًا إن أردته في الإعلان.', from: 'من {host} · {n} صور', fix: 'صحّح أي شيء يبدو خاطئًا.' },
  stage: { eyebrow: 'النمط', autoDesc: 'نختار الشكل المناسب لمنتجك.', bestFor: 'الأنسب لـ', style: 'النمط', opening: 'افتتاحيتك', end: 'البطاقة الختامية', badge: 'معاينة النمط' },
  review: { planShort: 'النص (مجانًا)', title: 'راجع وأنشئ', product: 'المنتج', style: 'النمط', scene: 'المشهد', presenter: 'الشخص', level: 'المستوى', none: '—', noPerson: 'بدون شخص', surprise: 'فاجئني', then: 'مجانًا. بعد ذلك: {go}', go: 'أنشئ · {c} رصيد', scripts: 'اختر النص', scriptsHint: 'اختر واحدًا؛ يمكنك تعديله قبل الإنشاء.' },
  auto: { note: 'نكتب نصوصك تلقائيًا بمجرد إضافة المنتج والنص — مجانًا.', paused: 'النصوص التلقائية متوقفة. اضغط «تحديث النصوص» للمحاولة مرة أخرى.', refresh: 'تحديث النصوص', writeNow: 'اكتب نصوصي الآن' },
  tones: { benefit: 'الفائدة', bold: 'جريء', story: 'قصة' },
  start: { title: 'ابدأ من إعلان من Kineo', sub: 'لمسة واحدة تنسخ النمط والمشهد والشخص. منتجك يبقى منتجك.', use: 'ابدأ من هذا', applied: 'نُسخ النمط والمشهد والشخص. صورك ونصك لم يتغيرا.' },
}
const UR: AdsV2FlowCopy = {
  tabs: { label: 'اشتہار کا موڈ', one: 'ایک اشتہار', batch: 'بیچ', production: 'پروڈکشن' },
  link: { title: 'اپنی پروڈکٹ کا لنک پیسٹ کریں', stores: 'Shopify، Amazon، Etsy یا کوئی بھی پروڈکٹ صفحہ — ہم نام، تصاویر اور قیمت پڑھتے ہیں۔', paste: 'پیسٹ کریں', pasteFail: 'براؤزر نے پیسٹ روک دیا — خانے پر کلک کریں اور لنک وہاں پیسٹ کریں۔', orPhoto: 'یا ایک تصویر یہاں چھوڑیں' },
  read: { title: 'ہم نے آپ کا صفحہ پڑھ لیا', name: 'پروڈکٹ کا نام', price: 'قیمت', priceNone: 'صفحے پر قیمت نہیں — اگر اشتہار میں چاہیے تو شامل کریں۔', from: '{host} سے · {n} تصاویر', fix: 'جو غلط لگے اسے درست کریں۔' },
  stage: { eyebrow: 'اسٹائل', autoDesc: 'ہم آپ کی پروڈکٹ کے مطابق انداز چنتے ہیں۔', bestFor: 'بہترین برائے', style: 'اسٹائل', opening: 'آپ کا آغاز', end: 'آخری کارڈ', badge: 'اسٹائل کا نمونہ' },
  review: { planShort: 'اسکرپٹ (مفت)', title: 'جائزہ لیں اور بنائیں', product: 'پروڈکٹ', style: 'اسٹائل', scene: 'منظر', presenter: 'شخص', level: 'لیول', none: '—', noPerson: 'کوئی شخص نہیں', surprise: 'حیران کریں', then: 'مفت۔ اس کے بعد: {go}', go: 'بنائیں · {c} کریڈٹس', scripts: 'اپنا اسکرپٹ چنیں', scriptsHint: 'ایک چنیں؛ بنانے سے پہلے آپ اسے اب بھی بدل سکتے ہیں۔' },
  auto: { note: 'پروڈکٹ اور متن آتے ہی ہم خود آپ کے اسکرپٹ لکھ دیتے ہیں — مفت۔', paused: 'خودکار اسکرپٹ رکے ہوئے ہیں۔ دوبارہ کوشش کے لیے “اسکرپٹ تازہ کریں” دبائیں۔', refresh: 'اسکرپٹ تازہ کریں', writeNow: 'میرے اسکرپٹ ابھی لکھیں' },
  tones: { benefit: 'فائدہ', bold: 'بے باک', story: 'کہانی' },
  start: { title: 'Kineo کے کسی اشتہار سے شروع کریں', sub: 'ایک ٹیپ اسٹائل، منظر اور شخص کاپی کرتا ہے۔ پروڈکٹ آپ ہی کی رہتی ہے۔', use: 'اسی سے شروع کریں', applied: 'اسٹائل، منظر اور شخص کاپی ہو گئے۔ آپ کی تصاویر اور متن نہیں بدلے۔' },
}
const HI: AdsV2FlowCopy = {
  tabs: { label: 'विज्ञापन मोड', one: 'एक विज्ञापन', batch: 'बैच', production: 'प्रोडक्शन' },
  link: { title: 'अपने प्रोडक्ट का लिंक पेस्ट करें', stores: 'Shopify, Amazon, Etsy या कोई भी प्रोडक्ट पेज — हम नाम, फ़ोटो और कीमत पढ़ते हैं।', paste: 'पेस्ट करें', pasteFail: 'ब्राउज़र ने पेस्ट रोक दिया — बॉक्स पर क्लिक करें और लिंक वहाँ पेस्ट करें।', orPhoto: 'या एक फ़ोटो यहाँ छोड़ें' },
  read: { title: 'हमने आपका पेज पढ़ लिया', name: 'प्रोडक्ट का नाम', price: 'कीमत', priceNone: 'पेज पर कीमत नहीं है — विज्ञापन में चाहिए तो जोड़ें।', from: '{host} से · {n} फ़ोटो', fix: 'जो गलत लगे उसे ठीक करें।' },
  stage: { eyebrow: 'स्टाइल', autoDesc: 'हम आपके प्रोडक्ट के हिसाब से लुक चुनते हैं।', bestFor: 'सबसे अच्छा', style: 'स्टाइल', opening: 'आपकी शुरुआत', end: 'आख़िरी कार्ड', badge: 'स्टाइल का नमूना' },
  review: { planShort: 'स्क्रिप्ट (मुफ़्त)', title: 'जाँचें और बनाएँ', product: 'प्रोडक्ट', style: 'स्टाइल', scene: 'सीन', presenter: 'व्यक्ति', level: 'लेवल', none: '—', noPerson: 'कोई व्यक्ति नहीं', surprise: 'मुझे चौंकाएँ', then: 'मुफ़्त। फिर: {go}', go: 'बनाएँ · {c} क्रेडिट', scripts: 'अपनी स्क्रिप्ट चुनें', scriptsHint: 'एक चुनें; बनाने से पहले आप इसे अब भी बदल सकते हैं।' },
  auto: { note: 'प्रोडक्ट और टेक्स्ट आते ही हम खुद आपकी स्क्रिप्ट लिख देते हैं — मुफ़्त।', paused: 'अपने-आप स्क्रिप्ट रुकी हुई है। फिर से कोशिश करने के लिए “स्क्रिप्ट रीफ़्रेश करें” दबाएँ।', refresh: 'स्क्रिप्ट रीफ़्रेश करें', writeNow: 'मेरी स्क्रिप्ट अभी लिखें' },
  tones: { benefit: 'फ़ायदा', bold: 'दमदार', story: 'कहानी' },
  start: { title: 'Kineo के किसी विज्ञापन से शुरू करें', sub: 'एक टैप स्टाइल, सीन और व्यक्ति कॉपी करता है। प्रोडक्ट आपका ही रहता है।', use: 'इससे शुरू करें', applied: 'स्टाइल, सीन और व्यक्ति कॉपी हो गए। आपकी फ़ोटो और टेक्स्ट नहीं बदले।' },
}
const ID: AdsV2FlowCopy = {
  tabs: { label: 'Mode iklan', one: 'Satu iklan', batch: 'Massal', production: 'Produksi' },
  link: { title: 'Tempel link produkmu', stores: 'Shopify, Amazon, Etsy, atau halaman produk mana pun — kami membaca nama, foto, dan harganya.', paste: 'Tempel', pasteFail: 'Browser memblokir tempel — klik kotaknya lalu tempel link di sana.', orPhoto: 'atau seret sebuah foto' },
  read: { title: 'Kami sudah membaca halamanmu', name: 'Nama produk', price: 'Harga', priceNone: 'Tidak ada harga di halaman — tambahkan jika ingin ada di iklan.', from: 'Dari {host} · {n} foto', fix: 'Perbaiki yang terlihat salah.' },
  stage: { eyebrow: 'Gaya', autoDesc: 'Kami memilih tampilan sesuai produkmu.', bestFor: 'Cocok untuk', style: 'Gaya', opening: 'Pembukaanmu', end: 'Kartu penutup', badge: 'Pratinjau gaya' },
  review: { planShort: 'Naskah (gratis)', title: 'Periksa dan buat', product: 'Produk', style: 'Gaya', scene: 'Adegan', presenter: 'Orang', level: 'Level', none: '—', noPerson: 'Tanpa orang', surprise: 'Kejutkan aku', then: 'Gratis. Berikutnya: {go}', go: 'Buat · {c} kredit', scripts: 'Pilih naskahmu', scriptsHint: 'Pilih satu; kamu masih bisa mengeditnya sebelum membuat.' },
  auto: { note: 'Kami menulis naskahmu sendiri begitu produk dan teks sudah ada — gratis.', paused: 'Naskah otomatis dijeda. Ketuk “Segarkan naskah” untuk mencoba lagi.', refresh: 'Segarkan naskah', writeNow: 'Tulis naskahku sekarang' },
  tones: { benefit: 'Manfaat', bold: 'Berani', story: 'Cerita' },
  start: { title: 'Mulai dari iklan Kineo', sub: 'Satu ketukan menyalin gaya, adegan, dan orangnya. Produkmu tetap milikmu.', use: 'Mulai dari ini', applied: 'Gaya, adegan, dan orang disalin. Foto dan teksmu tidak berubah.' },
}
const VI: AdsV2FlowCopy = {
  tabs: { label: 'Chế độ quảng cáo', one: 'Một quảng cáo', batch: 'Hàng loạt', production: 'Sản xuất' },
  link: { title: 'Dán liên kết sản phẩm của bạn', stores: 'Shopify, Amazon, Etsy hoặc bất kỳ trang sản phẩm nào — chúng tôi đọc tên, ảnh và giá.', paste: 'Dán', pasteFail: 'Trình duyệt đã chặn thao tác dán — hãy bấm vào ô và dán liên kết vào đó.', orPhoto: 'hoặc kéo một ảnh vào đây' },
  read: { title: 'Chúng tôi đã đọc trang của bạn', name: 'Tên sản phẩm', price: 'Giá', priceNone: 'Trang không có giá — hãy thêm nếu bạn muốn có trong quảng cáo.', from: 'Từ {host} · {n} ảnh', fix: 'Sửa bất cứ điều gì có vẻ sai.' },
  stage: { eyebrow: 'Phong cách', autoDesc: 'Chúng tôi chọn giao diện theo sản phẩm của bạn.', bestFor: 'Phù hợp nhất cho', style: 'Phong cách', opening: 'Phần mở đầu', end: 'Thẻ kết thúc', badge: 'Xem trước phong cách' },
  review: { planShort: 'Kịch bản (miễn phí)', title: 'Xem lại và tạo', product: 'Sản phẩm', style: 'Phong cách', scene: 'Cảnh', presenter: 'Người', level: 'Cấp độ', none: '—', noPerson: 'Không có người', surprise: 'Gây bất ngờ cho tôi', then: 'Miễn phí. Tiếp theo: {go}', go: 'Tạo · {c} tín dụng', scripts: 'Chọn kịch bản của bạn', scriptsHint: 'Chọn một; bạn vẫn có thể sửa trước khi tạo.' },
  auto: { note: 'Chúng tôi tự viết kịch bản ngay khi có sản phẩm và văn bản — miễn phí.', paused: 'Kịch bản tự động đang tạm dừng. Chạm “Làm mới kịch bản” để thử lại.', refresh: 'Làm mới kịch bản', writeNow: 'Viết kịch bản ngay' },
  tones: { benefit: 'Lợi ích', bold: 'Táo bạo', story: 'Câu chuyện' },
  start: { title: 'Bắt đầu từ một quảng cáo của Kineo', sub: 'Một chạm sao chép phong cách, cảnh và người. Sản phẩm vẫn là của bạn.', use: 'Bắt đầu từ cái này', applied: 'Đã sao chép phong cách, cảnh và người. Ảnh và văn bản của bạn không đổi.' },
}

export const ADS_V2_FLOW_COPY: Record<InterfaceLanguage, AdsV2FlowCopy> = {
  en: EN, pt: PT, es: ES, fr: FR, de: DE, it: IT, nl: NL, pl: PL, tr: TR, ru: RU, uk: UK, ar: AR, ur: UR, hi: HI, id: ID, vi: VI,
}

export function adsV2FlowCopy(language: InterfaceLanguage | string | null | undefined): AdsV2FlowCopy {
  return (language && Object.prototype.hasOwnProperty.call(ADS_V2_FLOW_COPY, language) ? ADS_V2_FLOW_COPY[language as InterfaceLanguage] : null) ?? EN
}
