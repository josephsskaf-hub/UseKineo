// KINEO-TELA-RECREATE-1611 — SÓ DE DESENVOLVIMENTO (404 em produção): os cartões dos moldes da casa para a prévia ?conta=casa, lidos das cópias LOCAIS que já
// existem no disco (lib/recreate/assets e C:\kineo\docs\remodelamento-1611, as mesmas que subiram ao bucket privado), sem login, bucket nem URL assinada.
import { NextResponse } from 'next/server'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { RECREATE_ASSETS_SERVIDOR } from '@/lib/recreate/catalogoServidor'
import { invasorArquivoDaVitrine } from '@/lib/recreate/invasorMolde'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function procurar(pasta: string, arquivo: string, fundo = 3): Promise<string | null> {
  let itens: import('node:fs').Dirent[]
  try { itens = await readdir(pasta, { withFileTypes: true }) } catch { return null }
  for (const i of itens) if (i.isFile() && i.name === arquivo) return path.join(pasta, i.name)
  if (fundo > 0) for (const i of itens) if (i.isDirectory()) { const achou = await procurar(path.join(pasta, i.name), arquivo, fundo - 1); if (achou) return achou }
  return null
}

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  if (process.env.NODE_ENV === 'production') return new NextResponse(null, { status: 404 })
  const local = RECREATE_ASSETS_SERVIDOR[params.name as keyof typeof RECREATE_ASSETS_SERVIDOR]
  const doMolde = invasorArquivoDaVitrine(params.name)
  const arquivo = local ? path.join(process.cwd(), 'lib/recreate/assets', local.file) : doMolde ? await procurar(path.join(process.cwd(), '..', '..', 'kineo', 'docs', 'remodelamento-1611'), doMolde.arquivo) : null
  const tipo = local?.contentType ?? doMolde?.contentType
  if (!arquivo || !tipo) return new NextResponse(null, { status: 404 })
  try { const bytes = await readFile(arquivo); return new NextResponse(bytes, { headers: { 'Content-Type': tipo, 'Cache-Control': 'no-store' } }) } catch { return new NextResponse(null, { status: 404 }) }
}
