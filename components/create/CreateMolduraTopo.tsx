'use client'

// KINEO-LIBRARY-MOLDURA-NOVA-1211 [fundador 12/11: "a questão da Library é que ele está voltando no fluxo antigo. Você olha o menu da esquerda,
// ele não é um menu novo"] — o cabeçalho da tela nova (o MESMO da CreateShell: marca · abas Film/Clip/Cartoon/Ads/Recreate · créditos ·
// "My videos ↗") para as telas que ainda moram em app/(dashboard). Hoje só a /library usa (opção B da foto div1-library-decisao-ABC.png):
// o "My videos ↗" da tela nova leva a ela e a pessoa não cai mais na lateral antiga.
// Nenhuma aba fica marcada (a Library não é uma aba de criar). O assinante pago segue com "Buy credits" (a MESMA entrada da lateral,
// KINEO-ASSINANTE-COMPRA-SEMPRE-1211: quem vê decide o servidor). Sem preço, sem nome de motor, nada começa sozinho.
import Link from 'next/link'
import { KineoBrandIcon } from '@/components/KineoBolt'
import BuyCreditsLink from '@/components/billing/BuyCreditsEntry'
import CreateTabs from './CreateTabs'
import CreateNavConta from './CreateNavConta'
import '@/app/recreate/recreate.css'
import './create.css'

export { MOLDURA_TOPO_ROTAS, usaMolduraNova } from '@/lib/create/molduraNova' // a regra mora num módulo puro (a casca e os guardiões leem sem montar componente)

export default function CreateMolduraTopo({ showRecreate = true, showClip = true, surface = 'library_top' }: { showRecreate?: boolean; showClip?: boolean; surface?: string }) {
  return <div className="recreate ct-moldura-topo" data-create-moldura="topo" style={{ minHeight: 0 }}>
    <header className="rc-nav ct-nav">
      <Link href="/" className="rc-brand"><KineoBrandIcon size={28} /><span>Kineo</span></Link>
      <CreateTabs active={null} showRecreate={showRecreate} showClip={showClip} />
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <BuyCreditsLink surface={surface} style={{ fontSize: 12, whiteSpace: 'nowrap' }} />
        <CreateNavConta />
      </div>
    </header>
  </div>
}
