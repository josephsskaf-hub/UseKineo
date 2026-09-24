export const BUSINESS_ADS_VERSION = 'business_ads_v1'

/** Server-owned deployment cut. Missing deployment is unknown, never a clock fallback. */
export function businessAdsStamp(name: string, deploySha: string | undefined): Record<string, unknown> {
  if (name !== 'business_ads_page_viewed' && name !== 'business_ads_cta_clicked') return {}
  return {
    business_ads_version: BUSINESS_ADS_VERSION,
    business_ads_deploy_sha: deploySha && /^[a-f0-9]{40}$/i.test(deploySha) ? deploySha : null,
    ...(name === 'business_ads_page_viewed' ? { business_ads_page_viewed: true } : {}),
  }
}
