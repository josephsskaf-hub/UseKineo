// KINEO-CLIP-RECREATE-JUNTOS-1511 — prévia SÓ DE DESENVOLVIMENTO da tela que junta Clip e Recreate (a conta da casa não dá para abrir logada no teste
// local). Em produção: 404 (notFound). Nunca indexada. Monta a MESMA ClipRecreateJuntos com as props de VISITANTE do /recreate (só a vitrine pública,
// a tarifa pública; nada da receita dos moldes da casa): o Generate daqui leva ao cadastro, nunca gera nem cobra. ?modelo=<id> abre com o modelo
// escolhido; ?tema=dark|light para as fotos nos dois temas.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RECREATE_FORMATS, recreateCreditsFor } from '@/lib/recreate/formats'
import { publicRecreateCatalog } from '@/lib/recreate/catalogPublic'
import { formatosParaOCliente, visibleRecreateFormatsServidor } from '@/lib/recreate/catalogoServidor'
import { INTERNAL_EXACT_EMAILS } from '@/lib/internalAccounts'
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
  // KINEO-TELA-RECREATE-1611 — ?conta=casa&saldo=N: a tela como a CONTA DA CASA a vê (o catálogo da casa e o saldo N), para fotografar painel, compra e grade
  // sem login local. É um ESTADO LOGADO SIMULADO: as leituras do navegador (/api/recreate, social, recarga) são respondidas por PreviaJuntos com estes números;
  // nada gera, cobra nem compra (o Generate com saldo só vai até o pedido, que a prévia recusa). ?recarga=1 simula o assinante (a barra da recarga).
  if (searchParams.conta === 'casa') {
    const email = INTERNAL_EXACT_EMAILS[0]
    const saldo = typeof searchParams.saldo === 'string' && /^\d{1,5}$/.test(searchParams.saldo) ? Number(searchParams.saldo) : 0
    const local = (u: string) => u.replace('/api/recreate/assets/', '/dev/clip-recreate-juntos/midia/') // as capas da casa vêm das cópias locais (rota de dev)
    const casa = formatosParaOCliente(email).map(f => ({ ...f, preview: local(f.preview), poster: local(f.poster) }))
    const catalogo = visibleRecreateFormatsServidor(email).map(f => { const credits = recreateCreditsFor(f); return { id: f.id, credits, available: credits !== null, shortfall: credits === null ? 0 : Math.max(0, credits - saldo) } })
    const escolhido = typeof searchParams.modelo === 'string' && casa.some(f => f.id === searchParams.modelo) ? searchParams.modelo : undefined
    return <PreviaJuntos tema={tema} simulada={{ catalogo, recarga: searchParams.recarga === '1' }} recreate={{ currentFlow: true, flowBasePath: '/recreate', initialId: escolhido, signedIn: true, accountKey: 'dev-previa-casa', ownVideoVisible: true, generationAllowed: true, internalTools: true, formatos: casa, formatIds: casa.map(f => f.id), createTabs: true }} />
  }
  return <PreviaJuntos tema={tema} recreate={{ currentFlow: true, flowBasePath: '/recreate', initialId: modelo, guestQuotes, signedIn: false, accountKey: null, ownVideoVisible: false, generationAllowed: true, internalTools: false, formatos, formatIds, createTabs: false }} />
}
