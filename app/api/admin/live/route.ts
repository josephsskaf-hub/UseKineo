// KINEO-ADMIN-LIVE-2026-08-19 — pedido do fundador: "quero ver quantas pessoas
// passaram no site em 7 dias, nas últimas 24h, e QUEM está online AGORA, com
// e-mail e nome do lado e se testou algo — pra eu mandar e-mail e fechar a
// compra".
//
// Nasceu de um caso real de hoje: wongzeehern (SG, veio do ChatGPT) cadastrou,
// foi ao checkout em 2 minutos, hesitou e ficou testando — e só descobrimos
// consultando o banco na mão. Com esta tela, esse cara aparece piscando em
// verde no /admin no minuto em que acontece.
//
// FONTE DA VERDADE: a tabela `events`. Todo evento carrega user_id (quando
// logado) e session_id (sempre) — então:
//   · VISITANTES  = sessões distintas com evento na janela (inclui anônimo)
//   · ONLINE AGORA = user_id distinto com evento nos últimos 5 minutos
// A janela de 5 min é o padrão de "usuários ativos" do GA e evita o falso
// positivo de quem só deixou a aba aberta.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ONLINE_WINDOW_MIN = 5

export interface LiveVisitor {
  user_id: string
  email: string
  name: string | null
  country: string | null
  minutes_ago: number
  last_page: string | null
  credits: number | null
  plan: string | null
  is_paid: boolean
  videos: number
  /** Sinais do que a pessoa fez NESTA sessão de hoje — o "testou algo". */
  did: string[]
  /** Quão perto de comprar: 3 = abriu checkout · 2 = gerou vídeo · 1 = só olhou */
  heat: number
  source: string | null
  // ═══ KINEO-LIVE-V2-2026-08-19 ═══════════════════════════════════════════
  // Pedido do fundador: "deixa esse LIVE mais completo pra eu entender melhor
  // as situações". Ele olhou a tela e não conseguiu explicar por que alguém
  // aparecia com 30 créditos e 0 vídeos. A resposta é que a coluna 'vídeos'
  // conta VÍDEO PRONTO, e o crédito já sai da conta quando a geração COMEÇA —
  // então, no meio de um render, a pessoa aparece com o crédito gasto e nenhum
  // vídeo. Não era bug, era leitura impossível. Os campos abaixo tornam a
  // situação legível sem precisar consultar o banco na mão.
  /** true = tem geração EM VOO agora (explica crédito gasto sem vídeo). */
  rendering: boolean
  /** Quanto do trial já foi gasto: "20 of 50" — do contador oficial. */
  creditsUsedLabel: string | null
  /** Em QUÊ foi: "Seedance×2 (40cr) · Kineo 1×1 (2cr)". Só débitos efetivos. */
  spentOn: string | null
  /** Horas desde o cadastro — separa quem chegou agora de quem voltou. */
  hoursOld: number
  /** Falhas de geração desta pessoa: um número alto aqui é dor, não uso. */
  failed: number
  /** Motor da última tentativa, para saber o que ela está testando. */
  lastEngine: string | null
  // ═══ KINEO-LEDGER-2026-08-25 (fundador: "eu nao entendo se eu dou 40
  // creditos como o cara pode ter 46 — quero melhorar a qualidade dos dados").
  // O caso concreto: pedrohscordeiro apareceu com 46cr e a tela só contava a
  // história do trial (25). Os outros 21+ vinham de bônus de admin e de
  // estornos de débito — invisíveis. A resposta não é esconder: é mostrar a
  // EQUAÇÃO inteira, de fontes reais (nunca inferência):
  //   trial (profiles.trial_credits_granted)
  //   + bônus (events admin_credits_granted, soma por user_id)
  //   + compras (bulk_purchase_completed.credits_granted)
  //   + estornos (credit_debits com refunded_at)
  //   − gastos (credit_debits, todos)
  //   = saldo esperado
  // Se não bater com profiles.video_credits, a diferença aparece com ⚠ em vez
  // de fingir que a conta fecha — é assim que se acha o próximo furo de dados.
  /** "= 25 trial + 24 bônus + 24 estorno − 27 gastos", pronto pra ler. */
  ledger: string | null
  /** saldo real − saldo esperado. 0 = livros fecham. ≠0 = furo visível. */
  ledgerGap: number
}

export interface LiveData {
  visitors_7d: number
  visitors_24h: number
  signups_7d: number
  signups_24h: number
  videos_24h: number
  checkouts_24h: number
  online_now: number
  online: LiveVisitor[]
  generated_at: string
}

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

    const now = Date.now()
    const iso = (msAgo: number) => new Date(now - msAgo).toISOString()
    const H24 = 24 * 60 * 60 * 1000
    const D7 = 7 * H24
    const ONLINE = ONLINE_WINDOW_MIN * 60 * 1000

    // ── Contagens (RPC-free: uma leitura por janela, colunas mínimas) ───────
    const [ev7d, ev24h, evOnline, sign7d, sign24h, vids24h, ck24h] = await Promise.all([
      admin.from('events').select('session_id').gte('created_at', iso(D7)).limit(60000),
      admin.from('events').select('session_id').gte('created_at', iso(H24)).limit(60000),
      admin.from('events').select('user_id, session_id, name, path, created_at').gte('created_at', iso(ONLINE)).order('created_at', { ascending: false }).limit(3000),
      admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', iso(D7)),
      admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', iso(H24)),
      admin.from('videos').select('id', { count: 'exact', head: true }).gte('created_at', iso(H24)),
      admin.from('events').select('id', { count: 'exact', head: true }).eq('name', 'checkout_started').gte('created_at', iso(H24)),
    ])

    const uniq = (rows: Array<{ session_id?: string | null }> | null) =>
      new Set((rows ?? []).map((r) => r.session_id).filter(Boolean)).size

    // ── Quem está online: último evento por usuário logado ─────────────────
    type OnlineRow = { user_id: string | null; name: string; path: string | null; created_at: string }
    const onlineRows = ((evOnline.data ?? []) as OnlineRow[]).filter((r) => !!r.user_id)
    const byUser = new Map<string, { last: OnlineRow; events: string[] }>()
    for (const row of onlineRows) {
      const uid = row.user_id as string
      const cur = byUser.get(uid)
      if (!cur) byUser.set(uid, { last: row, events: [row.name] })
      else cur.events.push(row.name)
    }
    const ids = [...byUser.keys()]

    let online: LiveVisitor[] = []
    if (ids.length > 0) {
      // KINEO-LIVE-V3-2026-08-19 — o consumo REAL, por motor, das últimas 24h.
      // O fundador viu '80 créditos, 0 usados' e '48, usou 2' e não conseguiu
      // explicar nenhum dos dois. Os dois eram o MESMO defeito de leitura: a
      // tela INFERIA o uso a partir do saldo ('50 − saldo'), e o saldo não é
      // um contador — ele sobe (extensão de trial devolve créditos, estorno
      // devolve) e desce por coisas diferentes (Kineo 1 custa 1-2cr pra conta
      // trial). A verdade sobre USO mora em dois lugares que a tela agora lê:
      // profiles.trial_credits_used (o contador oficial do trial) e os claims
      // de consumo (o que cada débito realmente comprou, por motor).
      const claimsPromise = admin
        .from('events')
        .select('user_id, metadata')
        .in('name', ['compose_submission_claim', 'cinematic_submission_claim'])
        .in('user_id', ids)
        .gte('created_at', new Date(now - 24 * 60 * 60 * 1000).toISOString())
        .limit(2000)
      // KINEO-SPEND-FULL-2026-08-20 (fundador: "quero saber onde os créditos
      // foram gastos, se foi em fotos, vídeos ou áudios"). Vídeo vem dos
      // claims acima; FOTO e ÁUDIO vêm das próprias tabelas — cada linha é
      // uma geração cobrada, com o motor no campo `model`.
      const dayIso = new Date(now - 24 * 60 * 60 * 1000).toISOString()
      const imagesPromise = admin
        .from('images').select('user_id, model').in('user_id', ids).gte('created_at', dayIso).limit(2000)
      const audiosPromise = admin
        .from('audios').select('user_id, model').in('user_id', ids).gte('created_at', dayIso).limit(2000)
      // KINEO-LEDGER-2026-08-25 — as três fontes do razão, TODAS all-time
      // (o saldo é acumulado desde o cadastro; janela de 24h aqui mentiria).
      const grantsPromise = admin
        .from('events').select('user_id, metadata').eq('name', 'admin_credits_granted').in('user_id', ids).limit(2000)
      const purchasesPromise = admin
        .from('events').select('user_id, metadata').eq('name', 'bulk_purchase_completed').in('user_id', ids).limit(500)
      const debitsPromise = admin
        .from('credit_debits').select('user_id, amount, refunded_at').in('user_id', ids).limit(4000)
      const [profRes, vidRes] = await Promise.all([
        admin.from('profiles')
          .select('id, email, name, plan, has_paid, video_credits, trial_credits_used, trial_credits_granted, signup_country, last_country, signup_utm_source, created_at')
          .in('id', ids),
        admin.from('videos').select('user_id').in('user_id', ids).limit(2000),
      ])
      const [claimsRes, imagesRes, audiosRes, grantsRes, purchasesRes, debitsRes] = await Promise.all([claimsPromise, imagesPromise, audiosPromise, grantsPromise, purchasesPromise, debitsPromise])
      // Razão por pessoa: bônus, compras, gastos e estornos — números crus.
      const ledgerBy = new Map<string, { bonus: number; bought: number; spent: number; refunded: number }>()
      const led = (uid: string) => {
        const cur = ledgerBy.get(uid) ?? { bonus: 0, bought: 0, spent: 0, refunded: 0 }
        ledgerBy.set(uid, cur)
        return cur
      }
      for (const g of grantsRes.data ?? []) {
        const uid = (g as { user_id: string | null }).user_id
        const amt = Number((g as { metadata?: { amount?: unknown } }).metadata?.amount ?? 0)
        if (uid && Number.isFinite(amt)) led(uid).bonus += amt
      }
      for (const b of purchasesRes.data ?? []) {
        const uid = (b as { user_id: string | null }).user_id
        const amt = Number((b as { metadata?: { credits_granted?: unknown } }).metadata?.credits_granted ?? 0)
        if (uid && Number.isFinite(amt)) led(uid).bought += amt
      }
      for (const d of debitsRes.data ?? []) {
        const uid = (d as { user_id: string | null }).user_id
        const amt = Number((d as { amount?: unknown }).amount ?? 0)
        if (!uid || !Number.isFinite(amt)) continue
        const entry = led(uid)
        entry.spent += amt
        if ((d as { refunded_at?: string | null }).refunded_at) entry.refunded += amt
      }
      // "🖼 3 fotos (schnell×2, seedream×1)" — o modelo diz o motor; contamos
      // por pessoa. Custo exato por foto/áudio varia por motor (1-5cr) e mora
      // no biller; aqui o objetivo é LEITURA — o que a pessoa fez, de relance.
      const mediaBy = new Map<string, { img: Map<string, number>; aud: Map<string, number> }>()
      const bump = (uid: string, kind: 'img' | 'aud', model: string) => {
        const entry = mediaBy.get(uid) ?? { img: new Map(), aud: new Map() }
        const m = entry[kind]
        m.set(model, (m.get(model) ?? 0) + 1)
        mediaBy.set(uid, entry)
      }
      for (const r of imagesRes.data ?? []) {
        const uid = (r as { user_id: string }).user_id
        if (uid) bump(uid, 'img', ((r as { model?: string }).model ?? '?').split('/').pop() ?? '?')
      }
      for (const r of audiosRes.data ?? []) {
        const uid = (r as { user_id: string }).user_id
        if (uid) bump(uid, 'aud', ((r as { model?: string }).model ?? '?').split('/').pop() ?? '?')
      }
      // "Seedance×2 (40cr) · Kineo 1×3 (6cr)" — o extrato de hoje, por pessoa.
      const ENGINE_SHORT: Record<string, string> = {
        fast: 'Kineo 1', cinematic_ai: 'Seedance', cinematic_kling: 'Kling 2.5',
        cinematic_h3: 'H3', cinematic_veo: 'Veo', cinematic_hollywood: 'Kling 3',
        cinematic_omni: 'Omni', // KINEO-OMNI-2026-08-25
        avatar: 'Avatar', presenter: 'Presenter',
      }
      const spentBy = new Map<string, Map<string, { n: number; cr: number }>>()
      for (const c of claimsRes.data ?? []) {
        const uid = (c as { user_id: string }).user_id
        const md = (c as { metadata: { quality?: string; cost?: number; credit_cost?: number; status?: string } }).metadata ?? {}
        // claim 'released' = estornado: não é consumo, é tentativa devolvida.
        if (md.status === 'released') continue
        const q = md.quality ?? '?'
        const cr = typeof md.cost === 'number' ? md.cost : typeof md.credit_cost === 'number' ? md.credit_cost : 0
        const m = spentBy.get(uid) ?? new Map()
        const cur = m.get(q) ?? { n: 0, cr: 0 }
        cur.n += 1; cur.cr += cr
        m.set(q, cur); spentBy.set(uid, m)
      }
      const vidCount = new Map<string, number>()
      for (const v of vidRes.data ?? []) {
        const uid = (v as { user_id: string }).user_id
        vidCount.set(uid, (vidCount.get(uid) ?? 0) + 1)
      }
      const PAID_PLANS = new Set(['starter', 'basic', 'pro', 'autopilot'])
      const internal = (e: string) => {
        const s = e.toLowerCase()
        return s.startsWith('josephsskaf') || s.startsWith('josephskaf') || s.endsWith('@shortsforgeai.com')
      }

      online = (profRes.data ?? [])
        .map((p) => {
          const row = byUser.get(p.id as string)!
          const names = new Set(row.events)
          // "Testou algo": traduz eventos crus em sinais que o fundador lê de
          // relance — e ordena por proximidade da compra.
          const did: string[] = []
          let heat = 1
          if ([...names].some((n) => n.startsWith('checkout'))) { did.push('🚨 no checkout'); heat = 3 }
          if (names.has('video_generation_started') || names.has('generate_started')) { did.push('🎬 gerando vídeo'); heat = Math.max(heat, 2) }
          if (names.has('video_generation_completed')) { did.push('✅ vídeo pronto'); heat = Math.max(heat, 2) }
          if (names.has('video_downloaded')) { did.push('⬇ baixou'); heat = Math.max(heat, 2) }
          if (names.has('pricing_view') || names.has('inline_pricing_currency_resolved')) did.push('💰 viu preço')
          if (names.has('upgrade_modal_opened') || [...names].some((n) => n.includes('topup'))) did.push('⚡ modal de crédito')
          if ([...names].some((n) => n.startsWith('images_') || n === 'image_generated')) did.push('🖼 imagens')
          // KINEO-GUARD-VISIVEL-2026-08-25 (caso Pedro) — o bloqueio educativo
          // de roteiro-curto agora tem nome próprio e vira um chip legível em
          // vez de FAILED genérico. "crédito devolvido" é verdade desde o #325.
          if (names.has('narration_guard_blocked')) did.push('✋ roteiro curto — barrado, crédito devolvido')
          if (did.length === 0) did.push('👀 navegando')

          // KINEO-LIVE-V2-2026-08-19 — o estado que faltava para a tela ser
          // legível. 'rendering' é o que explica "crédito gasto, zero vídeo".
          // KINEO-RENDERING-HONESTO-2026-08-25 (caso Pedro): started sem
          // completed ficava 'RENDERING' PARA SEMPRE mesmo depois do FAILED —
          // o fundador olhou a tela e não conseguiu saber se o render estava
          // vivo. Agora a ORDEM decide: só é rendering se o último started
          // veio DEPOIS do último completed/failed.
          // row.events vem em ordem DESC (query newest-first): indexOf = a
          // ocorrência MAIS RECENTE; índice menor = mais novo.
          const newestIdx = (name: string) => row.events.indexOf(name)
          const iStart = newestIdx('video_generation_started')
          const iDoneCandidates = [newestIdx('video_generation_completed'), newestIdx('video_generation_failed')].filter((i) => i >= 0)
          const iDone = iDoneCandidates.length > 0 ? Math.min(...iDoneCandidates) : -1
          const rendering = iStart >= 0 && (iDone === -1 || iStart < iDone)
          const failed = row.events.filter((n) => n === 'video_generation_failed').length
          const lastEngine =
            [...names].find((n) => n.startsWith('engine_')) ?? null
          const createdAt = (p as { created_at?: string }).created_at
          const hoursOld = createdAt
            ? Math.max(0, Math.round((now - Date.parse(createdAt)) / 3_600_000))
            : 0
          // KINEO-LIVE-V3-2026-08-19 — usa o CONTADOR oficial, nunca a
          // inferência '50 − saldo'. A inferência quebrava dos dois lados:
          // saldo 80 (extensão de trial devolveu créditos) virava '0 usados',
          // e um Kineo 1 debitado (1-2cr pra conta trial) virava mistério.
          const tcu = (p as { trial_credits_used?: unknown }).trial_credits_used
          const tcg = (p as { trial_credits_granted?: unknown }).trial_credits_granted
          // "4 of 50 used" ao lado de um saldo de 46 obriga quem lê a fazer
          // a conta de cabeça. Agora a linha diz as duas coisas em português:
          // quanto GASTOU e quanto SOBRA do trial.
          // KINEO-LIVE-SALDO-2026-08-20 (fundador: "gastou 36 dos 40 tambem
          // nao da pra entender") — o defeito era repetição: a célula já mostra
          // o SALDO em número grande, e o rótulo repetia esse mesmo número no
          // fim ("sobram 4"), então o 4 aparecia duas vezes e o cabeçalho ainda
          // dizia "Credits used". Agora cada coisa aparece UMA vez: o número
          // grande é o saldo (com "cr"), e este rótulo conta só a história do
          // trial — quanto foi concedido e quanto já queimou.
          const creditsUsedLabel =
            typeof tcu === 'number' && typeof tcg === 'number' && tcg > 0
              ? `trial: ${tcg} concedidos, ${tcu} queimados`
              : null
          // O extrato de hoje: em QUÊ os créditos foram (só débitos efetivos;
          // estorno não conta). É a resposta direta do pedido do fundador —
          // "diz com o quê a pessoa usou".
          const spent = spentBy.get(p.id as string)
          const media = mediaBy.get(p.id as string)
          const parts: string[] = []
          if (spent) {
            for (const [q, v] of [...spent.entries()].sort((a, b) => b[1].cr - a[1].cr)) {
              // KINEO-LIVE-LEGIVEL-2026-08-20 (fundador: "1x3 nao da pra
              // entender") — o nome do motor TERMINA em número ("Kineo 1"),
              // então "Kineo 1×3" lia como parte do nome. A quantidade vai
              // para a FRENTE e o crédito ganha rótulo: "3 vídeos no Kineo 1
              // · 4 créditos". Ninguém precisa decifrar.
              const plural = v.n === 1 ? 'vídeo' : 'vídeos'
              // KINEO-LIVE-24H-2026-08-20 (2ª leitura do fundador: "2 vídeos no
              // Kineo 1 seriam 10 créditos, está escrito 7"). A conta dele está
              // certa; o rótulo é que mentia por omissão, em duas frentes:
              //   1. O extrato soma o `cost` gravado em CADA claim, ou seja, o
              //      preço VIGENTE no dia do render. Dois vídeos feitos durante
              //      a troca de preço de hoje (2cr → 5cr) somam 7, não 10. Está
              //      historicamente correto e é assim que tem de ser — trocar
              //      pelo preço de hoje reescreveria o passado e faria o extrato
              //      divergir do que foi realmente debitado.
              //   2. A coluna VIDEOS ao lado é o total HISTÓRICO da pessoa (12),
              //      enquanto isto aqui é só das últimas 24h. Duas janelas de
              //      tempo na mesma linha, sem dizer qual é qual.
              // O conserto é falar: o período entra no texto e o crédito ganha
              // "no preço da época" quando os vídeos custaram preços diferentes.
              const mistoDePrecos = v.n > 1 && v.cr % v.n !== 0
              parts.push(
                `🎬 24h: ${v.n} ${plural} no ${ENGINE_SHORT[q] ?? q} · ${v.cr} ${v.cr === 1 ? 'crédito' : 'créditos'}` +
                (mistoDePrecos ? ' (preço da época)' : ''),
              )
            }
          }
          if (media && media.img.size > 0) {
            const total = [...media.img.values()].reduce((a, b) => a + b, 0)
            const det = [...media.img.entries()].map(([m, n]) => `${n} no ${m}`).join(', ')
            parts.push(`🖼 24h: ${total} foto${total > 1 ? 's' : ''} (${det})`)
          }
          if (media && media.aud.size > 0) {
            const total = [...media.aud.values()].reduce((a, b) => a + b, 0)
            const det = [...media.aud.entries()].map(([m, n]) => `${n} no ${m}`).join(', ')
            parts.push(`🎙 24h: ${total} áudio${total > 1 ? 's' : ''} (${det})`)
          }
          const spentOn = parts.length > 0 ? parts.join(' · ') : null

          // KINEO-LEDGER-2026-08-25 — a equação do saldo, termo a termo.
          // Só entra termo ≠ 0: a linha comum fica "= 25 trial − 3 gastos".
          const lg = ledgerBy.get(p.id as string) ?? { bonus: 0, bought: 0, spent: 0, refunded: 0 }
          const trialGranted = typeof tcg === 'number' ? tcg : 0
          const saldoReal = typeof p.video_credits === 'number' ? p.video_credits : null
          const terms: string[] = []
          if (trialGranted > 0) terms.push(`${trialGranted} trial`)
          if (lg.bonus > 0) terms.push(`+ ${lg.bonus} bônus`)
          if (lg.bought > 0) terms.push(`+ ${lg.bought} compras`)
          if (lg.refunded > 0) terms.push(`+ ${lg.refunded} estorno`)
          if (lg.spent > 0) terms.push(`− ${lg.spent} gastos`)
          const expected = trialGranted + lg.bonus + lg.bought + lg.refunded - lg.spent
          const ledgerGap = saldoReal === null ? 0 : saldoReal - expected
          const ledger = terms.length > 0 ? `= ${terms.join(' ')}` : null

          return {
            user_id: p.id as string,
            email: (p.email as string) ?? '',
            name: (p.name as string | null) ?? null,
            country: ((p.signup_country ?? p.last_country) as string | null) ?? null,
            minutes_ago: Math.max(0, Math.round((now - Date.parse(row.last.created_at)) / 60000)),
            last_page: row.last.path ?? null,
            credits: typeof p.video_credits === 'number' ? p.video_credits : null,
            plan: (p.plan as string | null) ?? null,
            is_paid: PAID_PLANS.has(((p.plan as string) ?? '').toLowerCase()),
            videos: vidCount.get(p.id as string) ?? 0,
            did,
            heat,
            source: (p.signup_utm_source as string | null) ?? null,
            rendering,
            creditsUsedLabel,
            spentOn,
            hoursOld,
            failed,
            lastEngine,
            ledger,
            ledgerGap,
          }
        })
        .filter((v) => v.email && !internal(v.email))
        .sort((a, b) => b.heat - a.heat || a.minutes_ago - b.minutes_ago)
    }

    const data: LiveData = {
      visitors_7d: uniq(ev7d.data as Array<{ session_id?: string | null }> | null),
      visitors_24h: uniq(ev24h.data as Array<{ session_id?: string | null }> | null),
      signups_7d: sign7d.count ?? 0,
      signups_24h: sign24h.count ?? 0,
      videos_24h: vids24h.count ?? 0,
      checkouts_24h: ck24h.count ?? 0,
      online_now: online.length,
      online,
      generated_at: new Date().toISOString(),
    }
    return NextResponse.json(data)
  } catch (e) {
    console.error('[admin/live] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Failed to load live data.' }, { status: 500 })
  }
}
