// KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — a frase do plano Business que substitui os pacotes avulsos de agência na vitrine
// (components/AgencyVolumeBridge) e entra no /llms.txt + /api/facts. Nada digitado: preço e "12 product ads of 15 s" vêm de
// lib/businessPlan.ts; os 15 estilos de lib/ads/v2Styles.ts; a pessoa de IA de lib/ads/v2Presenter.ts; o 1º anúncio grátis
// de lib/ads/sample.ts. Cada cláusula só aparece com o interruptor dela ligado — desligou lá, some daqui no mesmo deploy.
import { BUSINESS_AD_SECONDS, BUSINESS_ADS_PER_MONTH, BUSINESS_PAGE_PATH, BUSINESS_PRICE_LABEL } from '@/lib/businessPlan'
import { ADS_V2_STYLES, ADS_V2_STYLES_PUBLIC } from '@/lib/ads/v2Styles'
import { ADS_V2_PRESENTER_PUBLIC } from '@/lib/ads/v2Presenter'
import { ADS_SAMPLE_LIVE } from '@/lib/ads/sample'

export interface BusinessPitch {
  price: string
  adsPerMonth: number
  adSeconds: number
  styles: number | null
  aiPerson: boolean
  firstAdFree: boolean
  pageUrl: string
  /** Uma frase para a vitrine e para o llms.txt. */
  sentence: string
}

export function businessPitch(baseUrl = ''): BusinessPitch {
  const styles = ADS_V2_STYLES_PUBLIC ? ADS_V2_STYLES.length : null
  const parts = [
    `Business — ${BUSINESS_PRICE_LABEL}/month: about ${BUSINESS_ADS_PER_MONTH} product ads of ${BUSINESS_AD_SECONDS} s per month`,
    `from one product photo or a product link${styles ? `, in ${styles} styles` : ''}`,
  ]
  const extras: string[] = []
  if (ADS_V2_PRESENTER_PUBLIC) extras.push('an optional AI person holding the product and talking about it')
  const firstAd = ADS_SAMPLE_LIVE ? ' Your first ad is free to try.' : ''
  return {
    price: BUSINESS_PRICE_LABEL,
    adsPerMonth: BUSINESS_ADS_PER_MONTH,
    adSeconds: BUSINESS_AD_SECONDS,
    styles,
    aiPerson: ADS_V2_PRESENTER_PUBLIC,
    firstAdFree: ADS_SAMPLE_LIVE,
    pageUrl: `${baseUrl}${BUSINESS_PAGE_PATH}`,
    sentence: `${parts.join(' ')}${extras.length ? `, with ${extras.join(', ')}` : ''}.${firstAd}`,
  }
}
