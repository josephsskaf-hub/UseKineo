// KINEO-MOTORES-GEO-2026-10-06 — "motor desligado não tem página indexável".
//
// A página de um motor em manutenção (hoje: Omni Flash, pausado desde 15/09 em lib/engineLaunch.ts) segue no ar — quem
// chega por link vê o aviso e a alternativa —, mas não pode ser indexada nem citada como lugar para usar o motor: ela
// sai do sitemap (app/sitemap.ts) e ganha robots noindex AQUI, no layout do segmento, para que o generateMetadata da
// página (travado por scripts/test-citation-engine-metadata.mjs e test-veo-hero-plans) não mude. A régua é a mesma do
// sitemap e do llms.txt: isIndexableEngineSlug (lib/growth/enginePageCatalog.ts). Despausar o motor devolve o índice
// sozinho — nada a redigitar. Slug desconhecido: a página responde 404 (dynamicParams = false), aqui nada muda.
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ENGINES, isIndexableEngineSlug } from '@/lib/growth/enginePageCatalog'

export function generateMetadata({ params }: { params: { engine: string } }): Metadata {
  return ENGINES[params.engine] && !isIndexableEngineSlug(params.engine) ? { robots: { index: false, follow: true } } : {}
}

export default function EngineSegmentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
