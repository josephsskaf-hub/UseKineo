// KINEO-INVASOR-DE-CAMPO-1511 — o POST do molde "Pitch invader" (chamado por app/api/recreate/route.ts depois de conferir sessão, origem e que ESTA
// conta pode ver o molde). Só do servidor. A ordem do dinheiro é a do submitClip de sempre (forma, replay, teto, foto, moderação, saldo, linha, débito
// ÚNICO, fila/envio, estorno em qualquer falha); aqui só o que é deste molde, ANTES de qualquer custo: a porta da fila, os arquivos privados no lugar e a
// leitura da foto (cabelo, barba, óculos) para o texto da receita.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { submitClip } from '@/lib/clips/clipFlow'
import { filaKlingEditEstado, loadClipAccount, submitDepsFor, type ClipAccount } from '@/lib/clips/clipServer'
import { ownedClipImageUrl } from '@/lib/clips/clipCatalog'
import { comEndUserDaFal } from './falEndUser'
import { lerDescricaoDaPessoa } from './descricaoDaPessoa'
import { FRASE_FILA_CHEIA, esperaNaFila, filaCheia, naFila, posicaoNaFila } from './filaKlingEdit'
import { INVASOR_TRECHOS } from './invasorMolde'
import { INVASOR_CREDITOS_PROVISORIO_CASA, INVASOR_EVENTOS, INVASOR_FAL_USD, entradaDoTrecho, invasorDaLinha, planInvasor, resolverEntrada, semOculosDaDescricao, textoDoInvasor } from './invasor'
import { assinarTrechoDoInvasor, invasorArquivosPresentes } from './invasorServer'
import { writeServerEvent } from '@/lib/serverEvents'

type Resposta = { body: Record<string, unknown>; status: number }
const NADA_COBRADO = 'Could not start your clip. Nothing was charged.'

/** A simulação (só a casa): as entradas dos 3 trechos com o vídeo como marcador e o custo. Ninguém é chamado. */
export function simulacaoDoInvasor(): Record<string, unknown> {
  const prompt = textoDoInvasor({ genero: 'man', cabeloEBarba: null, semOculos: true })
  return { simulation: true, format: 'Pitch invader', seconds: 18, photos: 1, credits: INVASOR_CREDITOS_PROVISORIO_CASA, mode: 'Face swap', charged: false, fal_usd: INVASOR_FAL_USD,
    steps: INVASOR_TRECHOS.map((_, i) => ({ model: 'kling/v4/video-to-video/edit', input: { ...entradaDoTrecho({ prompt, foto: '<your photo>', trecho: i }), video_url: `<segment ${i + 1} of ${INVASOR_TRECHOS.length}, private>` } })) }
}

export async function pedirInvasor(a: { admin: SupabaseClient; supabase: SupabaseClient; user: User; account: ClipAccount; raw: Record<string, unknown>; key: string }): Promise<Resposta> {
  const { admin, supabase, user, account, raw, key } = a
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const ctx = { userId: user.id, supabaseUrl, dono: (u: string) => ownedClipImageUrl(u, user.id, supabaseUrl) }
  const conferido = planInvasor(raw, ctx, null)
  if (!conferido.ok) return { body: { error: conferido.error }, status: conferido.status }
  const base = submitDepsFor({ admin, userSupabase: supabase, account })
  const envio = comEndUserDaFal(base.submit, account.userId)
  const deps = {
    ...base,
    engineAccess: () => ({ ok: true as const }), // a sessão e a visibilidade do molde já foram conferidas na rota
    // O trecho 0 guarda o MARCADOR do vídeo: a URL assinada (privada, 1 h) nasce aqui; as marcas kineo_* nunca vão à fal.
    submit: async (model: string, input: Record<string, unknown>) => {
      const entrada = await resolverEntrada(input, (i) => assinarTrechoDoInvasor(admin, i))
      return entrada ? envio(model, entrada) : { ok: false as const, ambiguous: false, error: 'Source unavailable' }
    },
  }
  // A repetição da MESMA chave devolve o pedido que já existe (a foto não é lida de novo: a leitura pode variar e mudaria a impressão digital).
  const existente = key ? await deps.findByKey(user.id, key).catch(() => null) : null
  if (existente) {
    if (!invasorDaLinha(existente)) return { body: { error: 'This request is already reserved. Check your clips before trying again.', code: 'idempotency_conflict' }, status: 409 }
    return { body: { clip: { id: existente.id, status: existente.status }, replay: true }, status: 200 }
  }
  // A PORTA, antes de qualquer custo: fila cheia = "tente em alguns minutos" (nada cobrado). Este molde segura a vaga por 3 trechos (~8 a 12 min).
  const fila = await filaKlingEditEstado(admin)
  if (fila && filaCheia(fila.naFila, fila.vagaOcupada)) return { body: { error: FRASE_FILA_CHEIA, code: 'queue_full' }, status: 429 }
  if (!(await invasorArquivosPresentes(admin))) return { body: { error: NADA_COBRADO }, status: 503 }
  let leitura: { cabeloEBarba: string | null; semOculos: boolean | null } | null = null
  if (account.balance >= INVASOR_CREDITOS_PROVISORIO_CASA) {
    const lida = await lerDescricaoDaPessoa(conferido.plan.photos[0])
    leitura = lida.ok ? { cabeloEBarba: lida.cabeloEBarba, semOculos: semOculosDaDescricao(lida.texto) } : null
    await writeServerEvent({ name: INVASOR_EVENTOS.descricao, userId: user.id, path: '/api/recreate', metadata: { produto: 'invasor_de_campo', ok: lida.ok, ...(lida.ok ? { usd: lida.usd, descricao: lida.texto } : { why: lida.why }) } }).catch(() => false)
  }
  const resolvido = planInvasor(raw, ctx, leitura)
  if (!resolvido.ok) return { body: { error: resolvido.error }, status: resolvido.status }
  const plan = resolvido.plan
  const result = await submitClip(deps, { userId: user.id, idempotencyKey: key, body: plan.body, recreatePlan: plan })
  if (!result.ok) {
    if (result.code === 'credits' || result.code === 'debit_failed') {
      const balance = result.balance ?? (await loadClipAccount(supabase, user))?.balance
      if (balance !== undefined && plan.credits > balance) return { body: { error: `You need ${plan.credits - balance} more credits.`, code: 'credits', shortfall: plan.credits - balance, plans: '/pricing' }, status: result.status }
    }
    return { body: { error: result.code === 'idempotency_conflict' ? 'This request is already reserved. Check your clips before trying again.' : 'Could not start this clip. Check your photos, plan and balance, then retry.', code: result.code }, status: result.status }
  }
  if (!result.replay) await writeServerEvent({ name: 'recreate_started', userId: user.id, path: '/api/recreate', metadata: { format: 'invasor-de-campo', clip_id: result.clip.id, seconds: result.clip.seconds, credits: result.clip.credits, segments: INVASOR_TRECHOS.length, hair_read: !!leitura?.cabeloEBarba } }).catch(() => false)
  const esperando = naFila(result.clip)
  const estado = esperando ? await filaKlingEditEstado(admin, result.clip.id) : null
  const posicao = esperando && estado ? posicaoNaFila(estado.naFrente, estado.vagaOcupada) : null
  return { body: { clip: { id: result.clip.id, status: result.clip.status, ...(esperando ? { queued: true, queue_position: posicao, ...(posicao ? { wait_label: esperaNaFila(posicao).label, wait_minutes: esperaNaFila(posicao).minutes } : {}) } : {}) }, replay: result.replay }, status: result.status }
}
