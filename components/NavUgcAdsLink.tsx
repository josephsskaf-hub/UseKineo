'use client'

// KINEO-MENU-UGC-2010 — o item "AI UGC Ads" do menu do topo (home, /examples, /trending) e do menu do celular da home.
// Componente de cliente só porque o destino segue a língua escolhida na interface (que mora no navegador): português →
// /anuncios-ugc-com-ia, o resto → /ai-ugc-ads (lib/ui/menuUgc2010.ts). O servidor e o 1º quadro do cliente saem em inglês
// (mesma regra do InterfaceLanguageProvider), então não há diferença de hidratação. Visual = o dos itens de texto do menu
// (quem chama passa a classe, como nos outros links); sem preço.
import Link from 'next/link'
import { UiLabel, useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { menuUgcHref } from '@/lib/ui/menuUgc2010'
import { createEntryForContentHref } from '@/lib/create/entry' // KINEO-ENTRADAS-CARTOES-1011

// KINEO-ENTRADAS-CARTOES-1011 [fundador 10/11: "clico em AI UGC Ads, vai para a página antiga"] — `signedIn` (só quem sabe o login passa; padrão
// false = o de hoje): LOGADO vai fazer o anúncio UGC na aba Ads da tela nova (/create/ads?entry=ugc, a mesma entrada do cartão UGC da home);
// visitante segue na página de conteúdo. Interruptores fora de 'public' = a página de conteúdo, byte a byte (lib/create/entry.ts).
export const NAV_UGC_MAKE_NOW_HREF = '/ads/v2?entry=ugc'

export default function NavUgcAdsLink({ className, 'data-nav-item': navItem, signedIn = false }: { className?: string; 'data-nav-item': 'more:ugc'; signedIn?: boolean }) {
  const language = useInterfaceLanguage()
  return <Link href={createEntryForContentHref('ads', menuUgcHref(language), NAV_UGC_MAKE_NOW_HREF, signedIn)} className={className} data-nav-item={navItem}><UiLabel>AI UGC Ads</UiLabel></Link>
}
