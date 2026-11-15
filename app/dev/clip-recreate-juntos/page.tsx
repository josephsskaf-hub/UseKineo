// KINEO-CLIP-RECREATE-JUNTOS-1511 — prévia SÓ DE DESENVOLVIMENTO da tela que junta Clip e Recreate (a conta da casa não dá para abrir logada no teste
// local). Em produção: 404 (notFound). Nunca indexada. Monta a MESMA ClipRecreateJuntos com as props de VISITANTE do /recreate (só a vitrine pública,
// a tarifa pública; nada da receita dos moldes da casa): o Generate daqui leva ao cadastro, nunca gera nem cobra. ?modelo=<id> abre com o modelo
// escolhido; ?tema=dark|light para as fotos nos dois temas.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RECREATE_FORMATS, recreateCreditsFor } from '@/lib/recreate/formats'
import { publicRecreateCatalog } from '@/lib/recreate/catalogPublic'
import { formatosParaOCliente } from '@/lib/recreate/catalogoServidor'
import PreviaJuntos from './PreviaJuntos'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Clip + Recreate (dev) | Kineo' }, robots: { index: false, follow: false } }

export default function Page({ searchParams = {} }: { searchParams?: Record<string, string | string[] | undefined> }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const publicos = publicRecreateCatalog()
  const formatos = formatosParaOCliente(null).filter(f => publicos.some(p => p.id === f.id)) // o mesmo filtro do visitante em RecreateFlowPage
  const formatIds = publicos.map(f => f.id)
  const guestQuotes = RECREATE_FORMATS.filter(f => formatIds.includes(f.id)).map(f => { const credits = recreateCreditsFor(f); return { id: f.id, credits, available: credits !== null, shortfall: 0 } })
  const modelo = typeof searchParams.modelo === 'string' && formatIds.includes(searchParams.modelo) ? searchParams.modelo : undefined
  const tema = searchParams.tema === 'dark' || searchParams.tema === 'light' ? searchParams.tema : null
  return <PreviaJuntos tema={tema} recreate={{ currentFlow: true, flowBasePath: '/recreate', initialId: modelo, guestQuotes, signedIn: false, accountKey: null, ownVideoVisible: false, generationAllowed: true, internalTools: false, formatos, formatIds, createTabs: false }} />
}
