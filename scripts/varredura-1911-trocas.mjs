// Recortes intencionais da varredura de 19/11, gerados do diff sobre a main.
// Cada troca precisa encontrar exatamente um alvo na referência histórica.
export function comVarreduraHome1911(fonte) {
  return aplicar(fonte, [
    [
      "import { TIER_CREDITS, TIER_PRICES } from '@/lib/checkoutPricing' // KINEO-AEO-PRICE-TRUTH-2026-08-19",
      "import { formatCheckoutMoney, TIER_CREDITS, TIER_PRICES } from '@/lib/checkoutPricing' // KINEO-AEO-PRICE-TRUTH-2026-08-19"
    ],
    [
      "              <tr><td><UiLabel>Starting price</UiLabel></td><td className=\"us\" data-label=\"Kineo\">{usdPrice(TIER_PRICES.starter.usd)}<UiLabel>/mo</UiLabel></td><td data-label=\"OpusClip\">$15/mo</td><td data-label=\"HeyGen\">$29/mo</td><td data-label=\"Submagic\">$19/mo</td></tr>",
      "              <tr><td><UiLabel>Starting price</UiLabel></td><td className=\"us\" data-label=\"Kineo\">{formatCheckoutMoney('usd', TIER_PRICES.starter.usd)}<UiLabel>/mo</UiLabel></td><td data-label=\"OpusClip\">$15/mo</td><td data-label=\"HeyGen\">$29/mo</td><td data-label=\"Submagic\">$19/mo</td></tr>"
    ]
  ])
}

export function comVarreduraRecreate1911(fonte) {
  return aplicar(fonte, [
    [
      "import SiteSettingsMenu from '@/components/SiteSettingsMenu'",
      "import PublicSiteHeader from '@/components/PublicSiteHeader'\nimport SiteSettingsMenu from '@/components/SiteSettingsMenu'"
    ],
    [
      "import { RECREATE_FORMATS, recreateFormat, type RecreateFormat } from '@/lib/recreate/formats'",
      "import { RECREATE_FORMATS, recreateAutumnTemplatesLast, recreateFormat, type RecreateFormat } from '@/lib/recreate/formats'"
    ],
    [
      "        <div className=\"rc-grid\">{gradeSemParecidosJuntos(catalog).map((f, index) => <article key={f.id} className={`rc-card ${index % 4 === 1 ? 'rc-card-short' : ''} ${selected?.id === f.id ? 'rc-card-selected' : ''}`}>",
      "        <div className=\"rc-grid\">{recreateAutumnTemplatesLast(gradeSemParecidosJuntos(catalog)).map((f, index) => <article key={f.id} className={`rc-card ${index % 4 === 1 ? 'rc-card-short' : ''} ${selected?.id === f.id ? 'rc-card-selected' : ''}`}>"
    ],
    [
      "    <header className={createTabs ? 'rc-nav ct-nav' : 'rc-nav'}><Link href=\"/\" className=\"rc-brand\" onClick={currentFlow ? leaveFlow : undefined}><KineoBrandIcon size={28} /><span>Kineo</span></Link>{createTabs ? <CreateTabs active=\"recreate\" {...(currentFlow ? { recreateHref: flowBasePath } : {})} /> : <Link href={currentFlow ? flowBasePath : '/recreate'} onClick={e => { if (editingDisabled) e.preventDefault(); else if (currentFlow) leaveFlow(e) }}>Recreate</Link>}{createTabs ? <CreateNavConta /> : <SiteSettingsMenu signedIn={signedIn} />}</header>",
      "    {currentFlow && flowBasePath === '/recreate' && !selected && !createTabs\n      ? <PublicSiteHeader signedIn={signedIn} currentPath=\"/recreate\" signupHref=\"/signup?redirect=%2Frecreate\" />\n      : <header className={createTabs ? 'rc-nav ct-nav' : 'rc-nav'}><Link href=\"/\" className=\"rc-brand\" onClick={currentFlow ? leaveFlow : undefined}><KineoBrandIcon size={28} /><span>Kineo</span></Link>{createTabs ? <CreateTabs active=\"recreate\" {...(currentFlow ? { recreateHref: flowBasePath } : {})} /> : <Link href={currentFlow ? flowBasePath : '/recreate'} onClick={e => { if (editingDisabled) e.preventDefault(); else if (currentFlow) leaveFlow(e) }}>Recreate</Link>}{createTabs ? <CreateNavConta /> : <SiteSettingsMenu signedIn={signedIn} />}</header>}"
    ]
  ])
}

const IMPORT_MENU_ANTIGO = "import SiteSettingsMenu from '@/components/SiteSettingsMenu'"
const IMPORT_CABECALHO = "import PublicSiteHeader from '@/components/PublicSiteHeader'"
const PRICING_NAV_ANTIGA = `      {/* ───────── Top Nav (simple) ───────── */}
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <KineoBrandIcon size={32} />
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-extrabold tracking-tight text-[var(--text)]">
                Kineo
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <SiteSettingsMenu />
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card2)] transition"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>`

export function pricingPreservado1911(base, atual) {
  if (base === null) return false
  if (base.includes(IMPORT_CABECALHO)) return atual === base
  return atual === aplicar(base, [
    [IMPORT_MENU_ANTIGO, IMPORT_CABECALHO],
    ["import KineoBolt, { KineoBoltText, KineoBrandIcon } from '@/components/KineoBolt'", "import KineoBolt, { KineoBoltText } from '@/components/KineoBolt'"],
    [PRICING_NAV_ANTIGA, '      <PublicSiteHeader signedIn={signedIn ?? undefined} currentPath="/pricing" />'],
  ])
}

function aplicar(fonte, trocas) {
  return trocas.reduce((texto, [antes, depois]) => {
    if (texto.split(antes).length !== 2) throw new Error('VARREDURA-1911 sem alvo único: ' + antes.slice(0, 90))
    return texto.replace(antes, () => depois)
  }, fonte)
}
