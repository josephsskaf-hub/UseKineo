// KINEO-ADMIN-JORNADA-1510 — DESFAZ, em memória, a aba "Clientes" nos 2 arquivos que JÁ existiam (o menu do AdminShell e a
// página principal do /admin), para os guardiões antigos que conferem esses arquivos BYTE A BYTE contra uma base anterior
// (ex.: scripts/test-demo-sob-medida-1510.mjs D10 confere o menu do admin contra o pai do commit da demo). Módulo auxiliar;
// não é teste (o nome não começa com test-).
//
// Trocas [como estava, como ficou] = o diff do commit da aba (cada inserção leva a linha vizinha como âncora). Cada bloco tem
// de aparecer EXATAMENTE uma vez (senão lança: mudança alheia no trecho não passa calada) e a marca não pode sobrar. Arquivo
// sem a marca = volta igual. Fim de linha: o do próprio texto (LF ou CRLF).
// ENCADEAR: a aba é a camada MAIS NOVA destes arquivos — aplicar por DENTRO das outras, ex.:
//   semDemoSobMedida1510(rel, semAdminJornada1510(rel, texto)).
// A prova de que devolve o pai byte a byte roda em scripts/test-admin-jornada-1510.mjs (J9).
export const MARCA_ADMIN_JORNADA_1510 = 'KINEO-ADMIN-JORNADA-1510'

const TROCAS = {
  'components/admin/AdminShell.tsx': [
    [
      "  { label: 'Pessoas', pages: [['/admin/people', 'Pessoas'], ['/admin/users', 'Contas']] },\n",
      "  { label: 'Pessoas', pages: [['/admin/clientes', 'Clientes'], ['/admin/people', 'Pessoas'], ['/admin/users', 'Contas']] }, // KINEO-ADMIN-JORNADA-1510 — atalho da aba Clientes\n",
    ],
  ],
  'app/admin/page.tsx': [
    [
      "import CeoClient from '@/app/(dashboard)/admin/ceo/CeoClient'\n",
      "import CeoClient from '@/app/(dashboard)/admin/ceo/CeoClient'\n// KINEO-ADMIN-JORNADA-1510 — abas no topo: Visão geral (esta tela, conteúdo intocado) | Clientes (/admin/clientes, só carrega quando aberta).\nimport { redirect } from 'next/navigation'\nimport AdminAbas from '@/components/admin/AdminAbas'\n",
    ],
    [
      'export default async function AdminHomePage() {\n',
      'export default async function AdminHomePage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {\n',
    ],
    [
      '  const data = await computeCeoData()\n  return <CeoClient data={data ?? undefined} viewerEmail={email} home />\n',
      "  // KINEO-ADMIN-JORNADA-1510 — /admin?aba=clientes é endereço da aba Clientes: vai para ela ANTES de calcular a Visão geral.\n  const aba = Array.isArray(searchParams?.aba) ? searchParams?.aba[0] : searchParams?.aba\n  if (aba === 'clientes') {\n    const resto = new URLSearchParams()\n    for (const k of ['p', 'f', 'internas']) {\n      const v = searchParams?.[k]\n      const um = Array.isArray(v) ? v[0] : v\n      if (um) resto.set(k, um)\n    }\n    redirect(`/admin/clientes${resto.toString() ? `?${resto.toString()}` : ''}`)\n  }\n\n  const data = await computeCeoData()\n  return (\n    <>\n      <AdminAbas atual=\"visao\" />\n      <CeoClient data={data ?? undefined} viewerEmail={email} home />\n    </>\n  )\n",
    ],
  ],
}
export const ARQUIVOS_ADMIN_JORNADA_1510 = Object.freeze(Object.keys(TROCAS))

/** Devolve `src` sem a aba Clientes (só para os arquivos da lista; os outros voltam intocados). */
export function semAdminJornada1510(rel, src) {
  const key = String(rel ?? '').replace(/\\/g, '/')
  if (!Object.hasOwn(TROCAS, key) || typeof src !== 'string' || !src.includes(MARCA_ADMIN_JORNADA_1510)) return src
  const crlf = src.includes('\r\n')
  let s = crlf ? src.replace(/\r\n/g, '\n') : src
  for (const [antes, depois] of TROCAS[key]) {
    const n = s.split(depois).length - 1
    if (n !== 1) throw new Error(`desfaz ${MARCA_ADMIN_JORNADA_1510} em ${key}: bloco achado ${n}× — ${depois.slice(0, 70)}`)
    s = s.split(depois).join(antes)
  }
  if (s.includes(MARCA_ADMIN_JORNADA_1510)) throw new Error(`desfaz ${MARCA_ADMIN_JORNADA_1510} em ${key}: sobrou linha marcada`)
  return crlf ? s.replace(/\n/g, '\r\n') : s
}
