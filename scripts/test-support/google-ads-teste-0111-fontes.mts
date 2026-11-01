// KINEO-GOOGLE-ADS-TESTE-0111 — lê das FONTES ÚNICAS os números que os anúncios citam (preço do plano, créditos por filme)
// e os módulos do teste. Usa o jiti do projeto com o alias "@/" do tsconfig, para o gerador e o guardião rodarem com
// `node arquivo.mts` puro (Node 24, sem rede, sem banco).
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { Numeros } from './google-ads-teste-0111-anuncios.mts'

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const require = createRequire(import.meta.url)
const createJiti = require('jiti') as (file: string, opts: Record<string, unknown>) => (id: string) => any
export const carregar = createJiti(path.join(RAIZ, 'scripts', 'x.js'), {
  alias: { '@/': RAIZ.replace(/\\/g, '/') + '/' },
  interopDefault: true,
  cache: false,
  requireCache: false,
})

export function numerosDasFontes(): Numeros {
  const precos = carregar(path.join(RAIZ, 'lib', 'checkoutPricing.ts'))
  const k4 = carregar(path.join(RAIZ, 'lib', 'kling4PaidPricing.ts'))
  const mkt = carregar(path.join(RAIZ, 'lib', 'marketingPrice.ts'))
  return {
    starter: precos.formatCheckoutMoney('usd', precos.TIER_PRICES.starter.usd),
    creator: precos.formatCheckoutMoney('usd', precos.TIER_PRICES.basic.usd),
    creatorCredits: precos.TIER_CREDITS.basic,
    k4: { 15: k4.KLING4_PAID_CREDITS[15], 30: k4.KLING4_PAID_CREDITS[30], 60: k4.KLING4_PAID_CREDITS[60] },
    seedance60: mkt.creditsPerReferenceVideo('cinematic_ai'),
    veo60: mkt.creditsPerReferenceVideo('cinematic_veo'),
  }
}

export const DOC = path.join(RAIZ, 'docs', 'GOOGLE-ADS-TESTE-2026-11-01.md')
export const INICIO = '<!-- KINEO-GOOGLE-ADS-TESTE-0111:GERADO-INICIO (scripts/gerar-google-ads-teste-0111.mts — não editar à mão) -->'
export const FIM = '<!-- KINEO-GOOGLE-ADS-TESTE-0111:GERADO-FIM -->'
