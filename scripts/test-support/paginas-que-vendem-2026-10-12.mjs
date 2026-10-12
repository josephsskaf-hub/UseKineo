// KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — a normalização ÚNICA que os guardiões de TRAVA da página de motor usam para descontar
// desta rodada SÓ o que ela mudou (fundador 12/10, "tudo sim": compra direta na primeira dobra do Seedance, faixa do Kineo 1
// aposentado, meta description em positivo). Todo o resto da página segue travado byte a byte. O conteúdo novo é provado à
// parte por scripts/test-paginas-que-vendem-1210.mjs (e o bloco de compra, renderizado, por provaCompraSeedance abaixo).
//
// Quem usa: test-citation-engine-metadata (fonte e metadata), test-paid-seedance-bridge-2026-09-28 (arquivo inteiro),
// test-seedance-hero-plans-2026-09-28 e test-veo-hero-plans-2026-09-30 (HTML renderizado e metadata de cada motor).

// ── FONTE ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const IMPORT_FAIXA = "import Kineo1RetiredNotice from '@/components/Kineo1RetiredNotice' // KINEO-PAGINAS-QUE-VENDEM-2026-10-12"
const IMPORT_FREE_NOVO = "  TRIAL_CREDITS_SHOWN,\n  FREE_FILM_LABEL,\n  TRIAL_SEEDANCE15_FILMS,\n} from '@/lib/freeTierOffer'"
const IMPORT_FREE_BASE = "  TRIAL_CREDITS_SHOWN,\n} from '@/lib/freeTierOffer'"
const META_COMENTARIO = [
  '    // KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — terminava em "not enough for this reference video" (a frase que o Google e o',
  '    // ChatGPT citam terminava num "não"). Mesma honestidade, em positivo: o que o trial dá de fato e onde está o filme inteiro.',
]
const META_NOVA = "${TRIAL_CREDITS_SHOWN >= e.creditCost ? 'covers this reference video' : `${TRIAL_SEEDANCE15_FILMS >= 1 ? `start with a ${FREE_FILM_LABEL}; ` : ''}the full 60-second ${e.name} video comes with a paid plan`}.`"
const META_BASE = "${TRIAL_CREDITS_SHOWN >= e.creditCost ? 'covers this reference video' : 'not enough for this reference video'}.`"
const FAIXA_JSX = [
  '          {/* KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — quem chega pelo 301 do Kineo 1 (?from=kineo-1) lê o que mudou; no Seedance o',
  '              botão principal do hero passou a ser a compra direta do Creator (SeedanceHeroActions buyPage). */}',
  "          {params.engine === 'seedance' && <Kineo1RetiredNotice />}",
]
const HERO_NOVO = "<SeedanceHeroActions signupHref={signupUrl} campaign={campaign} buyPage={params.engine === 'seedance' ? 'seedance' : undefined} />"
const HERO_BASE = '<SeedanceHeroActions signupHref={signupUrl} campaign={campaign} />'

/** Fonte da página de motor → a mesma fonte sem as edições desta rodada (LF). */
export function semPaginasQueVendemFonte(src) {
  let out = src.replace(/\r\n/g, '\n')
  const linhas = out.split('\n').filter((l) => l !== IMPORT_FAIXA && !META_COMENTARIO.includes(l) && !FAIXA_JSX.includes(l))
  out = linhas.join('\n')
  out = out.split(IMPORT_FREE_NOVO).join(IMPORT_FREE_BASE)
  out = out.split(META_NOVA).join(META_BASE)
  out = out.split(HERO_NOVO).join(HERO_BASE)
  return out
}

/** Quantas edições desta rodada a fonte contém (os guardiões exigem 6 — prova que a normalização tem sujeito). */
export function edicoesPaginasQueVendemFonte(src) {
  const lf = src.replace(/\r\n/g, '\n')
  const linhas = lf.split('\n')
  const umaVez = (x) => lf.split(x).length === 2
  return [
    linhas.includes(IMPORT_FAIXA),
    umaVez(IMPORT_FREE_NOVO),
    META_COMENTARIO.every((l) => linhas.includes(l)),
    umaVez(META_NOVA),
    FAIXA_JSX.every((l) => linhas.includes(l)),
    umaVez(HERO_NOVO),
  ].filter(Boolean).length
}
export const EDICOES_PAGINAS_QUE_VENDEM_FONTE = 6

// ── METADATA ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// A descrição terminava em "; not enough for this reference video." e passou a dizer, em positivo, o filme grátis e que o
// filme inteiro vem com um plano. Volta à frase antiga SÓ esse final exato; qualquer outra diferença segue vermelha.
const FIM_POSITIVO = /; (?:start with a free \d+-second film \(Seedance 1\.5\); )?the full 60-second .+? video comes with a paid plan\.$/
export function semDescricaoPositiva(desc) {
  return typeof desc === 'string' ? desc.replace(FIM_POSITIVO, '; not enough for this reference video.') : desc
}
/** O mesmo, aplicado às três descrições do objeto de metadata (description, openGraph, twitter). */
export function semMetaPositiva(meta) {
  if (!meta || typeof meta !== 'object') return meta
  const out = { ...meta }
  if ('description' in out) out.description = semDescricaoPositiva(out.description)
  if (out.openGraph) out.openGraph = { ...out.openGraph, description: semDescricaoPositiva(out.openGraph.description) }
  if (out.twitter) out.twitter = { ...out.twitter, description: semDescricaoPositiva(out.twitter.description) }
  return out
}
/** A frase nova existe quando (e só quando) o trial não cobre o filme de referência. */
export function descricaoPositivaOk(desc, trialCobre) {
  return trialCobre ? !FIM_POSITIVO.test(desc) && desc.endsWith('covers this reference video.') : FIM_POSITIVO.test(desc) && !desc.includes('not enough')
}

// ── HTML ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// No Seedance a fileira de ações do hero (See plans + Create your account) virou o bloco de compra direta (BuyCreatorCta,
// com "Create your account" ao lado) + o link de texto "See plans". As duas formas viram o MESMO marcador neutro, dos dois
// lados; o resto do hero e da página continua comparado byte a byte.
const ACOES_BASE = /<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:22px">[\s\S]*?<\/div>/
const ACOES_NOVAS = /<div data-kineo="buy-creator-cta"[^>]*><div[^>]*>[\s\S]*?<\/div><p[^>]*>[\s\S]*?<\/p><p[^>]*>[\s\S]*?<\/p><\/div><p style="margin:8px 0 0;font-size:\.85rem"><a[^>]*>See plans &amp; credits →<\/a><\/p>/
export const ACOES_NEUTRAS = '<!--acoes-do-hero-->'
export function comAcoesNeutras(html) {
  return ACOES_NOVAS.test(html) ? html.replace(ACOES_NOVAS, ACOES_NEUTRAS) : html.replace(ACOES_BASE, ACOES_NEUTRAS)
}
/** O bloco de compra do Seedance renderizado: checkout do Creator mensal, conta ao lado, planos logo abaixo. */
export function provaCompraSeedance(html) {
  const bloco = html.match(ACOES_NOVAS)?.[0]
  if (!bloco) return false
  const links = [...bloco.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
  const signup = '/signup?intent_campaign=seo_engine_seedance&amp;redirect=%2Fstudio%3Fengine%3Dseedance%26intent_campaign%3Dseo_engine_seedance'
  return links.length === 3
    && links[0][1] === '/api/stripe/checkout?tier=basic&amp;billing=monthly&amp;intent_campaign=buy_creator_seedance'
    && /^Get Creator/.test(links[0][2])
    && links[1][1] === signup && links[1][2] === 'Create your account' && /border:1px solid #48484a/.test(links[1][0])
    && links[2][1] === '/pricing'
}
