import OrganicCtaLink from '@/components/OrganicCtaLink'
import BuyCreatorCta from '@/components/BuyCreatorCta'

/** English Seedance and Veo heroes; keep both existing destinations intact. */
// KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — com `buyPage` (só a página do Seedance), o botão principal deixa de ser "/pricing" e
// vira a compra direta do Creator (components/BuyCreatorCta). "Create your account" (o caminho grátis) fica ao lado, como
// secundário, e "See plans & credits" vira link de texto logo abaixo. Sem `buyPage` (Veo), tudo como antes — e esse ramo vem
// PRIMEIRO no arquivo de propósito: o mutante do guardião do Veo troca o PRIMEIRO link de planos deste arquivo.
export default function SeedanceHeroActions({ signupHref, campaign, buyPage }: {
  signupHref: string
  campaign: string
  buyPage?: string
}) {
  const accountLink = (
    <OrganicCtaLink
      href={signupHref}
      source={campaign}
      placement="hero_account"
      style={{ display: 'inline-block', border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 800, padding: '14px 24px', borderRadius: 980, textDecoration: 'none' }}
    >
      Create your account
    </OrganicCtaLink>
  )
  if (!buyPage) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 22 }}>
        <OrganicCtaLink
          href="/pricing"
          source={campaign}
          placement="hero"
          style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 900, padding: '15px 32px', borderRadius: 980, textDecoration: 'none', fontSize: '1.05rem' }}
        >
          See plans &amp; credits →
        </OrganicCtaLink>
        {accountLink}
      </div>
    )
  }
  return (
    <>
      <BuyCreatorCta page={buyPage} secondary={accountLink} />
      <p style={{ margin: '8px 0 0', fontSize: '.85rem' }}>
        <OrganicCtaLink href="/pricing" source={campaign} placement="hero" style={{ color: '#2997ff', fontWeight: 700, textDecoration: 'none' }}>
          See plans &amp; credits →
        </OrganicCtaLink>
      </p>
    </>
  )
}
