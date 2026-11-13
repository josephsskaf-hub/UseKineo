'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { KineoBrandIcon } from '@/components/KineoBolt'
import CreateTabs from './CreateTabs'
import CreateNavConta from './CreateNavConta'
import ProductExamples from './ProductExamples'
import '@/app/recreate/recreate.css'
import './create.css'

/** Presentation only. The existing Ads session still owns fields, drafts, requests and billing. */
export default function AdsMoldura({ children, showRecreate = true, showClip = false }: { children: ReactNode; showRecreate?: boolean; showClip?: boolean }) {
  return <main className="recreate create-shell ct-ads" data-create-shell="ads">
    <header className="rc-nav ct-nav"><Link href="/" className="rc-brand"><KineoBrandIcon size={28} /><span>Kineo</span></Link><CreateTabs active="ads" showRecreate={showRecreate} showClip={showClip} /><CreateNavConta /></header>
    <style dangerouslySetInnerHTML={{ __html: `.ct-ads .adv2.kps-page{max-width:none!important;padding:20px 28px!important;background:transparent!important;color:var(--rc-text)}.ct-ads .adv2 .kps-grid.rc-workspace{display:grid!important;grid-template-columns:minmax(320px,420px) minmax(0,1fr)!important;gap:24px!important;align-items:start!important;height:auto!important;max-height:none!important;padding:0!important}.ct-ads .adv2 .rc-panel{width:auto!important;max-width:none!important;min-width:0!important;max-height:none!important;overflow:visible!important}.ct-ads .adv2 .rc-reference{min-width:0!important;position:sticky;top:20px;max-height:85dvh;overflow:auto}.ct-ads .adv2-head{margin:0 0 18px!important}.ct-ads .adv2-head h1{font-size:28px!important}.ct-ads .adv2-head .sub{font-size:14px!important}.ct-ads .adv2 label,.ct-ads .adv2 small{font-size:12px;line-height:1.5}.ct-ads .adv2 .kps-panel>div{min-width:0}.ct-ads .adv2 .adv2f-rowslot{display:none}.ct-ads .ct-product-examples{padding:24px 28px}@media(max-width:760px){.ct-ads .adv2.kps-page{padding:16px!important}.ct-ads .adv2 .kps-grid.rc-workspace{grid-template-columns:minmax(0,1fr)!important}.ct-ads .adv2 .rc-reference{position:relative;top:0;max-height:none}.ct-ads .ct-product-examples{padding:20px 16px}}` }} />
    <style dangerouslySetInnerHTML={{ __html: `.ct-ads .ace-stage-media{height:min(62dvh,560px)!important;max-height:none!important;aspect-ratio:9/16;width:auto!important;max-width:100%;margin-inline:auto}.ct-ads .ace-stage-media img,.ct-ads .ace-stage-media video{object-fit:contain!important}.ct-ads .ace-stage span,.ct-ads .ace-stage p,.ct-ads .ace-tag,.ct-ads .ace-still small{font-size:12px!important}@media(max-width:760px){.ct-ads .adv2 .kps-grid.rc-workspace{grid-template-rows:auto!important}.ct-ads .adv2 .rc-panel,.ct-ads .adv2 .rc-reference{grid-column:auto!important;grid-row:auto!important}}` }} />
    {children}
    <ProductExamples tab="ads" />
  </main>
}
