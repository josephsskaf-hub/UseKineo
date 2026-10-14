// KINEO-ADS-POS-ENTREGA-1510 — a página PÚBLICA de aprovação do anúncio (o cliente da agência, sem login): /approve#<token>.
// O token mora no fragmento (#): o navegador não o manda ao servidor, nem no Referer, nem ao log. A página mostra SÓ o vídeo e o
// nome da marca da agência, com "Aprovar" / "Pedir mudanças" (com comentário). Fora do índice dos buscadores, sem referrer.
import type { Metadata } from 'next'
import ApproveClient from './ApproveClient'

export const metadata: Metadata = {
  title: 'Ad for approval',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
}

export const dynamic = 'force-static'

export default function ApprovePage() {
  return <ApproveClient />
}
