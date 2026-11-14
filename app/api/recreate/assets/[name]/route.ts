import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { RECREATE_ASSETS_SERVIDOR as RECREATE_ASSETS, RECREATE_FORMATS_SERVIDOR as RECREATE_FORMATS } from '@/lib/recreate/catalogoServidor' // KINEO-RECEITA-FORA-DO-JS-1411 — era: '@/lib/recreate/formats' (sem os moldes de movimento)
import { recreateFormatVisible } from '@/lib/recreate/access'
import { recreateSession, RECREATE_HEADERS } from '@/lib/recreate/server'
import { MOVIMENTO_DEMOS, MOVIMENTO_DEMO_DONOS } from '@/lib/recreate/movimentoDemos' // KINEO-MOVIMENTO-REVISOR-2-1411
import { movimentoDemoDoBucketValido } from '@/lib/recreate/movimento' // KINEO-MOVIMENTO-REVISOR-2-1411
import { guiaDoManifesto } from '@/lib/recreate/guiasManifesto' // KINEO-GUIA-PRIVADO-1411
import { assinarGuia, guiasAdmin } from '@/lib/recreate/guias' // KINEO-GUIA-PRIVADO-1411

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const { user } = await recreateSession()
  if (!user || !(Object.hasOwn(RECREATE_ASSETS, params.name) || guiaDoManifesto(params.name))) return new NextResponse(null, { status: 404, headers: RECREATE_HEADERS }) // KINEO-GUIA-PRIVADO-1411 — + o guia do manifesto (bucket privado)
  // KINEO-RECREATE-TRAVA-1011 — a base video/poster is served only to an account that can see its format.
  const owner = RECREATE_FORMATS.find(f => f.preview.endsWith('/' + params.name) || f.poster.endsWith('/' + params.name))
  if (!owner || !recreateFormatVisible(owner, user.email)) return new NextResponse(null, { status: 404, headers: RECREATE_HEADERS })
  // KINEO-MOVIMENTO-REVISOR-2-1411 [2º revisor, item 1] — o demo do molde de movimento que é resultado do produto (nunca no JavaScript público): redireciona só aqui, depois de
  // conferir quem pode ver o molde; URL fora da régua (outro ambiente, outro dono) = segue servindo o asset de sempre.
  const demo = owner.type === 'motion' && owner.preview.endsWith('/' + params.name) ? MOVIMENTO_DEMOS[owner.id] : undefined
  if (demo && movimentoDemoDoBucketValido(demo, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', MOVIMENTO_DEMO_DONOS)) return NextResponse.redirect(demo, { status: 302, headers: RECREATE_HEADERS })
  // KINEO-GUIA-PRIVADO-1411 — o guia no bucket privado: URL assinada CURTA (60 s) só no Location do redirecionamento, para quem pode ver o molde; falhou = 404.
  if (guiaDoManifesto(params.name)) {
    const admin = guiasAdmin()
    const assinada = admin ? await assinarGuia(admin, params.name, 60) : null
    return assinada ? NextResponse.redirect(assinada, { status: 302, headers: RECREATE_HEADERS }) : new NextResponse(null, { status: 404, headers: RECREATE_HEADERS })
  }
  const asset = RECREATE_ASSETS[params.name as keyof typeof RECREATE_ASSETS]
  const bytes = await readFile(path.join(process.cwd(), 'lib/recreate/assets', asset.file))
  const headers = { ...RECREATE_HEADERS, 'Content-Type': asset.contentType, 'Accept-Ranges': 'bytes' }
  const range = req.headers.get('range')
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range)
    const start = match ? Number(match[1]) : -1
    const end = match?.[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1
    if (start < 0 || start > end) return new NextResponse(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${bytes.length}` } })
    return new NextResponse(bytes.subarray(start, end + 1), { status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': String(end - start + 1) } })
  }
  return new NextResponse(bytes, { headers: { ...headers, 'Content-Length': String(bytes.length) } })
}
