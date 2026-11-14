// KINEO-RECREATE-SEU-VIDEO-1311 — 2º passo da tela: confere o vídeo enviado ANTES de cobrar (2 a 15 s, 24 a 60 fps, até 100 MB, MP4/MOV)
// e devolve os segundos, o preço da tabela de hoje e o prompt pronto (editável). Nada é cobrado aqui.
import { NextRequest, NextResponse } from 'next/server'
import { clipsAdmin, loadClipAccount } from '@/lib/clips/clipServer'
import { isPayingPlan } from '@/app/api/admin/_shared/mrr'
import { RECREATE_HEADERS } from '@/lib/recreate/server'
import { ioDoTextoReal, lerVideoDoCliente, seuVideoSession } from '@/lib/recreate/seuVideoServer'
import { promptDoSeuVideo, SEU_VIDEO_MOTOR, SEU_VIDEO_VERSAO } from '@/lib/recreate/seuVideo' // KINEO-RECREATE-KLING4-1311
import { promptPorGenero } from '@/lib/recreate/seuVideoRules'
import type { SeuVideoGender } from '@/lib/recreate/seuVideoRules'
import { seuVideoPresentation } from '@/lib/recreate/seuVideoPresentation'
import { montarTextoDoPedido, TEXTO_DO_PEDIDO_EVENTO, TEXTO_DO_PEDIDO_VERSAO } from '@/lib/recreate/textoDoPedido' // KINEO-RECREATE-TEXTO-DO-PEDIDO-1311
import { ownedClipImageUrl } from '@/lib/clips/clipCatalog' // KINEO-RECREATE-TEXTO-DO-PEDIDO-1311
import { writeServerEvent } from '@/lib/serverEvents'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 45 // KINEO-RECREATE-TEXTO-DO-PEDIDO-1311 — era 30: quadro (teto 18 s) + visão (teto 12 s) + leitura do vídeo
export const runtime = 'nodejs'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: RECREATE_HEADERS })

export async function POST(req: NextRequest) {
  const { supabase, user } = await seuVideoSession()
  if (!user) return json({ error: 'Not found.' }, 404)
  if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) return json({ error: 'Invalid origin.' }, 403)
  let raw: Record<string, unknown>
  try { raw = await req.json() } catch { return json({ error: 'Invalid request.' }, 400) }
  const admin = clipsAdmin()
  const account = admin ? await loadClipAccount(supabase, user) : null
  if (!admin || !account) return json({ error: 'Could not check your video. Please retry.' }, 503)
  const v = await lerVideoDoCliente(admin, user.id, raw.video_path)
  if (!v.ok) {
    await writeServerEvent({ name: 'recreate_seu_video_refused', userId: user.id, path: '/api/recreate/seu-video/check', metadata: { versao: SEU_VIDEO_VERSAO, code: v.code, stage: 'check' } }).catch(() => false)
    return json(v, 422)
  }
  const people = Math.min(3, Math.max(1, Math.round(Number(raw.people) || 1)))
  const positions = Array.isArray(raw.positions) ? raw.positions.map((x) => String(x ?? '')) : []
  const genders = raw.genders === undefined ? undefined : raw.genders
  if (genders !== undefined && (!Array.isArray(genders) || genders.length !== people || genders.some(g => g !== 'man' && g !== 'woman'))) return json({ error: 'Choose Man or Woman for each photo.', code: 'genders' }, 400)
  // KINEO-RECREATE-TEXTO-DO-PEDIDO-1311 [CEO 13/11 22:46, item A] — no Kling, o texto que troca de primeira: o molde da tela (promptPorGenero,
  // homem/mulher escolhido por foto) com "the main person" trocado pela descrição da visão (roupa e posição, 1 quadro do vídeo). A escolha da
  // tela GANHA da visão; sem escolha, a visão lê homem/mulher das fotos (opcionais, só da própria conta). Sem descrição = o texto da tela, byte a
  // byte; sem gênero nenhum = o texto de hoje. Custo (quadro + visão) no evento; nada é cobrado do cliente aqui.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const fotos = (Array.isArray(raw.photos) ? raw.photos : []).slice(0, 3).map((u) => (typeof u === 'string' ? ownedClipImageUrl(u, user.id, supabaseUrl) : null)).filter((u): u is string => !!u)
  const texto = SEU_VIDEO_MOTOR === 'kling4' ? await montarTextoDoPedido(ioDoTextoReal(v.url, v.meta), { pessoas: people, fotos, generosDaTela: (genders as SeuVideoGender[] | undefined) ?? [], posicoes: positions }) : null
  if (texto) await writeServerEvent({ name: TEXTO_DO_PEDIDO_EVENTO, userId: user.id, path: '/api/recreate/seu-video/check', metadata: { versao: TEXTO_DO_PEDIDO_VERSAO, fonte: texto.fonte, visao: texto.visao, usd: texto.usd, fotos: fotos.length, generos: texto.generos, descricoes: texto.descricoes, generos_da_tela: !!genders } }).catch(() => false)
  const body: Record<string, unknown> = {
    ok: true, seconds: Math.round(v.meta.segundos * 10) / 10, fps: Math.round(v.meta.fps), width: v.meta.largura, height: v.meta.altura, bytes: v.bytes,
    generated_seconds: v.gerados, aspect_ratio: v.proporcao, credits: v.creditos, balance: account.balance, shortfall: Math.max(0, (v.creditos ?? 0) - account.balance),
    needs_plan: v.gerados > 10 && !isPayingPlan(account.plan), prompt: genders ? promptPorGenero(genders as SeuVideoGender[], positions) : promptDoSeuVideo(SEU_VIDEO_MOTOR, people, positions), engine: SEU_VIDEO_MOTOR, // legacy engine response retained; browse
    presentation: seuVideoPresentation(), ...(genders ? { prompt_edited: true } : {}),
  }
  // KINEO-RECREATE-TEXTO-DO-PEDIDO-1311 — o texto da visão só entra quando ACRESCENTA: descrição (roupa e posição) no molde da tela, ou o gênero
  // lido das fotos quando a tela não escolheu. Sem isso, o texto acima (o da tela) fica byte a byte.
  const visaoAcrescenta = !!texto && texto.fonte !== 'padrao' && (texto.descricoes.some(Boolean) || !genders)
  if (visaoAcrescenta && texto) body.prompt = texto.prompt
  body.prompt_source = visaoAcrescenta && texto ? texto.fonte : genders ? 'tela' : 'padrao' // tela | visao | tela_e_visao | padrao
  return json(body)
}
