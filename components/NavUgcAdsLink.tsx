'use client'

// KINEO-MENU-UGC-2010 — o item "AI UGC Ads" do menu do topo (home, /examples, /trending) e do menu do celular da home.
// Componente de cliente só porque o destino segue a língua escolhida na interface (que mora no navegador): português →
// /anuncios-ugc-com-ia, o resto → /ai-ugc-ads (lib/ui/menuUgc2010.ts). O servidor e o 1º quadro do cliente saem em inglês
// (mesma regra do InterfaceLanguageProvider), então não há diferença de hidratação. Visual = o dos itens de texto do menu
// (quem chama passa a classe, como nos outros links); sem preço.
import Link from 'next/link'
import { UiLabel, useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { menuUgcHref } from '@/lib/ui/menuUgc2010'

export default function NavUgcAdsLink({ className, 'data-nav-item': navItem }: { className?: string; 'data-nav-item': 'more:ugc' }) {
  const language = useInterfaceLanguage()
  return <Link href={menuUgcHref(language)} className={className} data-nav-item={navItem}><UiLabel>AI UGC Ads</UiLabel></Link>
}
