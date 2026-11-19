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

function aplicar(fonte, trocas) {
  return trocas.reduce((texto, [antes, depois]) => {
    if (texto.split(antes).length !== 2) throw new Error('VARREDURA-1911 sem alvo único: ' + antes.slice(0, 90))
    return texto.replace(antes, () => depois)
  }, fonte)
}
