// KINEO-CAIXA-NOVA-1511 — prévia SÓ DE DESENVOLVIMENTO da caixa nova da aba Film (a conta da casa não dá para abrir logada no teste local).
// Em produção: 404 (notFound). Nunca indexada. Não gera, não cobra: o Generate daqui não chama o StudioSimples (ver PreviaDaCaixa).
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PreviaDaCaixa from './PreviaDaCaixa'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Caixa nova (dev) | Kineo' }, robots: { index: false, follow: false } }

export default function Page({ searchParams = {} }: { searchParams?: Record<string, string | string[] | undefined> }) {
  if (process.env.NODE_ENV === 'production') notFound()
  return <PreviaDaCaixa contaPaga={searchParams.conta === 'paga'} ideia={typeof searchParams.ideia === 'string' ? searchParams.ideia : ''} aviso={searchParams.aviso === '1'} gratis={searchParams.gratis === '1'} tema={searchParams.tema === 'dark' || searchParams.tema === 'light' ? searchParams.tema : null} />
}
