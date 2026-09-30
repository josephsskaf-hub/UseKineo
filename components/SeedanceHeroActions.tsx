import OrganicCtaLink from '@/components/OrganicCtaLink'

/** English Seedance and Veo heroes; keep both existing destinations intact. */
export default function SeedanceHeroActions({ signupHref, campaign }: {
  signupHref: string
  campaign: string
}) {
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
      <OrganicCtaLink
        href={signupHref}
        source={campaign}
        placement="hero_account"
        style={{ display: 'inline-block', border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 800, padding: '14px 24px', borderRadius: 980, textDecoration: 'none' }}
      >
        Create your account
      </OrganicCtaLink>
    </div>
  )
}
