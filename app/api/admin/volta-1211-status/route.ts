// ═══ KINEO-VOLTA-STATUS-1311 — GET /api/admin/volta-1211-status: o estado da carta de volta no Resend, SÓ LEITURA ═══════════════
//
// Para a CEO enxergar devolvidos e spam sem o painel (CEO 13/11 16:40). Só sessão de admin; sem porta de cron.
// Lê: carimbos volta_1211_emailed (quem recebeu, quando, e o resend_id quando existe), e-mail e descadastro do perfil (só no
// servidor), visitas pela carta (metadata.utm_campaign) e o Resend (GET /emails/{id} para quem tem id; GET /emails, a lista, para
// os 50 primeiros, que nasceram sem id guardado). Devolve SÓ contagens e a régua — nenhum endereço, nenhum id de pessoa.
// Não grava nada: nem evento, nem corrida. Não envia nada.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { readAll } from '@/lib/supabase/readAll'
import { VOLTA_1211_CAMPAIGN, VOLTA_1211_SENT } from '@/lib/growth/volta1211'
import {
  VOLTA_LISTA_MAX_PAGINAS, casarPelaLista, contarEstados, listaPassouDoInicio, nomeDoErroResend, normalizarEstado, voltaRegua,
  type ResendListado, type VoltaEnviado, type VoltaEstado,
} from '@/lib/growth/volta1211Status'

export const maxDuration = 120
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com', 'josephskaf@hotmail.com'])
const ROUTE = '/api/admin/volta-1211-status'
const CHUNK = 200
const RESEND = 'https://api.resend.com'
/** 10 req/s por time no Resend (documentado): 120 ms entre chamadas deixa folga para os envios da casa no mesmo segundo. */
const PAUSA_MS = 120
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !ADMIN_EMAILS.has((user.email ?? '').trim().toLowerCase())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    // Chave de LEITURA própria (Full access no Resend), para a chave de envio continuar "Sending access". Sem ela, tenta a de envio —
    // que o Resend recusa com 401 restricted_api_key (fica visível em leitura.primeira_falha e em leitura.chave).
    const resendKey = process.env.RESEND_READ_API_KEY || process.env.RESEND_API_KEY
    const chave = process.env.RESEND_READ_API_KEY ? 'leitura' : 'envio'
    if (!url || !svc) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
    if (!resendKey) return NextResponse.json({ error: 'RESEND_READ_API_KEY / RESEND_API_KEY missing' }, { status: 503 })
    const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
    const resendGet = (path: string) => fetch(`${RESEND}${path}`, {
      headers: { Authorization: `Bearer ${resendKey}`, 'User-Agent': 'kineo-admin-volta-status/1.0' }, cache: 'no-store',
    })

    // ── 1. quem recebeu (um carimbo por pessoa: o primeiro) ──────────────────────────────────────────────────────────────
    const { data: carimbos } = await readAll(() => admin.from('events').select('id, user_id, created_at, metadata')
      .eq('name', VOLTA_1211_SENT).order('id', { ascending: true }), { route: ROUTE, table: 'events' })
    const porPessoa = new Map<string, { stampMs: number; resendId: string | null; seg: string; dia: string }>()
    for (const c of carimbos ?? []) {
      const uid = String(c.user_id)
      const ms = Date.parse(String(c.created_at))
      const md = (c.metadata ?? {}) as Record<string, unknown>
      const atual = porPessoa.get(uid)
      if (!Number.isFinite(ms) || (atual && atual.stampMs <= ms)) continue
      porPessoa.set(uid, { stampMs: ms, resendId: typeof md.resend_id === 'string' && md.resend_id ? md.resend_id : null, seg: String(md.seg ?? '?'), dia: String(c.created_at).slice(0, 10) })
    }
    const ids = Array.from(porPessoa.keys())
    if (ids.length === 0) return NextResponse.json({ campanha: VOLTA_1211_CAMPAIGN, enviados: 0, regua: voltaRegua({ enviados: 0, spam: 0, devolvidos: 0, descadastros: 0, visitas: 0, semEstado: 0 }) })

    // ── 2. e-mail e descadastro (servidor), visitas pela carta ─────────────────────────────────────────────────────────────
    const email = new Map<string, string>()
    let descadastros = 0
    const visitou = new Set<string>()
    for (let i = 0; i < ids.length; i += CHUNK) {
      const fatia = ids.slice(i, i + CHUNK)
      const [perfis, visitas] = await Promise.all([
        readAll(() => admin.from('profiles').select('id, email, email_opted_out, email_opted_out_at').in('id', fatia).order('id', { ascending: true }), { route: ROUTE, table: 'profiles' }),
        readAll(() => admin.from('events').select('id, user_id, created_at').in('user_id', fatia).eq('metadata->>utm_campaign', VOLTA_1211_CAMPAIGN).order('id', { ascending: true }), { route: ROUTE, table: 'events' }),
      ])
      for (const p of perfis.data ?? []) {
        const uid = String(p.id)
        email.set(uid, String(p.email ?? '').trim().toLowerCase())
        const saiu = Date.parse(String(p.email_opted_out_at ?? ''))
        if (p.email_opted_out === true && Number.isFinite(saiu) && saiu >= (porPessoa.get(uid)?.stampMs ?? Infinity)) descadastros++
      }
      for (const v of visitas.data ?? []) {
        const uid = String(v.user_id)
        if (Date.parse(String(v.created_at)) >= (porPessoa.get(uid)?.stampMs ?? Infinity)) visitou.add(uid)
      }
    }

    // ── 3. o Resend: por id quando existe; pela lista para os que nasceram sem id ──────────────────────────────────────────
    const enviados: VoltaEnviado[] = ids.map((uid) => ({ email: email.get(uid) ?? '', stampMs: porPessoa.get(uid)!.stampMs, resendId: porPessoa.get(uid)!.resendId }))
    const estados: VoltaEstado[] = enviados.map(() => 'sem_estado')
    let porId = 0, pelaLista = 0, falhasResend = 0, paginas = 0
    // KINEO-VOLTA-STATUS-ERRO-1311 — a 1ª recusa do Resend: só o código HTTP e o `name` do erro (ex.: 401 restricted_api_key =
    // chave "Sending access", que só envia). Nada do corpo além do name, nada da chave.
    let primeiraFalha: { http: number; erro: string | null } | null = null
    const falhou = async (r: Response) => { falhasResend++; if (!primeiraFalha) primeiraFalha = { http: r.status, erro: await nomeDoErroResend(r) } }
    for (let i = 0; i < enviados.length; i++) {
      const rid = enviados[i].resendId
      if (!rid) continue
      const r = await resendGet(`/emails/${encodeURIComponent(rid)}`)
      if (r.ok) { estados[i] = normalizarEstado(((await r.json()) as { last_event?: unknown }).last_event); porId++ } else await falhou(r)
      await dormir(PAUSA_MS)
    }
    const semId = enviados.some((e) => !e.resendId && e.email)
    let listaCortada = false
    if (semId) {
      const primeiro = Math.min(...enviados.filter((e) => !e.resendId).map((e) => e.stampMs))
      const listados: ResendListado[] = []
      let after: string | null = null
      for (;;) {
        if (paginas >= VOLTA_LISTA_MAX_PAGINAS) { listaCortada = true; break }
        const r = await resendGet(`/emails?limit=100${after ? `&after=${encodeURIComponent(after)}` : ''}`)
        paginas++
        if (!r.ok) { await falhou(r); break }
        const corpo = (await r.json()) as { has_more?: boolean; data?: Array<Record<string, unknown>> }
        const pagina: ResendListado[] = (corpo.data ?? []).map((d) => ({
          id: String(d.id ?? ''), to: Array.isArray(d.to) ? d.to.map(String) : typeof d.to === 'string' ? [d.to] : [],
          created_at: String(d.created_at ?? ''), last_event: typeof d.last_event === 'string' ? d.last_event : null,
        }))
        listados.push(...pagina)
        if (!corpo.has_more || pagina.length === 0 || listaPassouDoInicio(pagina, primeiro)) break
        after = pagina[pagina.length - 1].id
        await dormir(PAUSA_MS)
      }
      for (const [i, estado] of casarPelaLista(enviados, listados)) { estados[i] = estado; pelaLista++ }
    }

    // ── 4. contagem, por dia de lote, e a régua ──────────────────────────────────────────────────────────────────────────
    const total = contarEstados(estados)
    const porDia: Record<string, Record<string, number>> = {}
    ids.forEach((uid, i) => {
      const d = porPessoa.get(uid)!.dia
      porDia[d] = porDia[d] ?? {}
      porDia[d][estados[i]] = (porDia[d][estados[i]] ?? 0) + 1
    })
    const regua = voltaRegua({ enviados: ids.length, spam: total.complained, devolvidos: total.bounced, descadastros, visitas: visitou.size, semEstado: total.sem_estado })
    return NextResponse.json({
      campanha: VOLTA_1211_CAMPAIGN,
      enviados: ids.length,
      por_estado: total,
      // last_event é o ÚLTIMO estado: entregue de fato = delivered + opened + clicked (+ complained, que também chegou na caixa).
      chegou_na_caixa: total.delivered + total.opened + total.clicked + total.complained,
      devolvidos: total.bounced,
      spam: total.complained,
      descadastros,
      visitas_pela_carta: visitou.size,
      por_dia: porDia,
      regua,
      leitura: { por_id: porId, pela_lista: pelaLista, sem_estado: total.sem_estado, paginas_da_lista: paginas, lista_cortada: listaCortada, falhas_resend: falhasResend, primeira_falha: primeiraFalha, chave },
    })
  } catch (e) {
    console.error('[volta-1211-status] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
