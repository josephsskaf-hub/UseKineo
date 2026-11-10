// KINEO-TELA-NOVA-CABECALHO-1011 [fundador 10/11: "Quero todas as telas com o design que fizemos no codex"] — o lado direito do cabeçalho da
// tela nova (abas Film · Cartoon · Ads e o Recreate com abas): o que o menu do Studio dá hoje, sem promoção e sem relógio.
//   · saldo: NavCreditsBadge — o espelho do CreditsBadge do cabeçalho do dashboard (components/TopBar.tsx), MESMA fonte: GET /api/credits
//     (campo `credits`), o evento creditsChanged e o realtime de profiles.video_credits. Leitura que falhou = some (nunca "0" inventado).
//   · "Pricing": /pricing, o destino do menu (components/MobileNav.tsx · Sidebar.tsx handleCreditChipClick).
//   · "My videos ↗": /library. KINEO-ENTRADAS-SO-LOGADO-1011 [CEO 10/11: "aponte My videos para a página que mostra os filmes"] — era /clips,
//     que só lista clipes; os FILMES da aba Film são linhas de `videos` e só aparecem na /library (abas Videos · Ads · Clips · Images · Audio:
//     app/(dashboard)/library/LibraryClient.tsx:103-109 e :84 /api/videos; os clipes e os Recreates, que são linhas de clipe, na aba Clips via /api/clips :79).
//     É também o item "Library" do menu (lib/ui/workspaceNavigation.ts:16).
// Sem hooks próprios: entra no RecreateClient sem mexer na ordem dos useState dele.
import Link from 'next/link'
import NavCreditsBadge from '@/components/NavCreditsBadge'
import './create.css'

export const CREATE_NAV_PRICING_HREF = '/pricing'
export const CREATE_NAV_VIDEOS_HREF = '/library' // KINEO-ENTRADAS-SO-LOGADO-1011

export default function CreateNavConta() {
  return <div className="ct-nav-account" data-create-nav-account="">
    <NavCreditsBadge />
    <Link href={CREATE_NAV_PRICING_HREF} className="ct-nav-link" data-create-nav="pricing">Pricing</Link>
    <Link href={CREATE_NAV_VIDEOS_HREF} className="ct-nav-link" data-create-nav="videos">My videos ↗</Link>
  </div>
}
