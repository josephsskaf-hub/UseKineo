import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { mintUserSession, callAsUser, type UserSession } from '@/lib/autopilot/session'

// ═══ KINEO-DEMO-RENDER-2026-08-21 — FILME CINEMATOGRÁFICO SEM NAVEGADOR ═══
//
// POR QUE ISTO EXISTE: para recrutar criador de afiliado a jogada é mandar um
// FILME PRONTO no nicho dele em vez de um pedido ("testa minha ferramenta").
// Isso é oito filmes hoje, e mais alguns toda semana. Fazer isso clicando no
// site é lento e não escala; e o Autopilot, que já gera sozinho, só usa o
// motor RÁPIDO — justamente o que não impressiona ninguém.
//
// O QUE NÃO FOI FEITO, DE PROPÓSITO: nada da lógica de render foi copiado.
// Esta rota age COMO O DONO DA CONTA — emite uma sessão real e curta via
// service_role e chama as MESMAS rotas HTTP que o browser dele chamaria
// (/api/generate-video-cinematic → /api/cinematic-clip-status → /api/compose).
// Herda de graça: débito de crédito, teto de plano, claim anti-duplo-submit,
// marca d'água e a linha em `videos`. É a mesma escolha de lib/autopilot/
// session.ts, e pelo mesmo motivo: forkar o pipeline é perder paridade de
// cobrança no primeiro bug que alguém corrigir de um lado só.
//
// DUAS ETAPAS, porque um clipe de IA demora minutos e a lambda tem teto:
//   step=start  → submete e devolve o estado (generationId, ids da fal, script)
//   step=finish → recebe esse estado, espera os clipes e monta o filme
// Quem orquestra guarda o estado entre as duas — assim nada fica pendurado
// esperando dentro de uma requisição que vai ser morta por timeout.
//
// ⚠ GASTA DINHEIRO DE VERDADE (fal + Creatomate) e DÉBITA CRÉDITO da conta
// alvo, igualzinho a um render feito à mão. Por isso: CRON_SECRET fail-closed
// e a conta alvo só pode ser resolvida por e-mail explícito no corpo — nunca
// varrendo a tabela de usuários.
//
// ═══ ⚠⚠ O FORMATO DO `prompt` NÃO É LIVRE — LEIA ANTES DE ENFILEIRAR ═══════
//
// ERRO COMETIDO EM 21/08, e caro: enfileirei 8 filmes com roteiros marcados
// como HOOK / MICRO REWARD / ESCALATION / PAYOFF. Os 8 saíram com a narração
// REESCRITA e ENCOLHIDA — 155 palavras viraram ~40. Medido nos arquivos:
// 17 segundos de fala dentro de 80 segundos de filme. O fundador viu e
// descreveu como "apagões" e "imagens repetidas"; não era nada disso —
// medi zero frame preto em dois limiares. Era vazio de narração, com cenas
// de 13 segundos sem ninguém falando.
//
// A CAUSA: quem decide se a narração é verbatim é `parseUserScript`
// (lib/scriptParser.ts), e ele procura UMA coisa só — o marcador
// `[Pexels: <consulta visual>]`. Os marcadores HOOK/MICRO REWARD/... são de
// OUTRO parser (`parseViralScriptSections`, usado no /api/analyze-idea).
// Sem `[Pexels: ...]`, `hasMarkers` é false, `verbatim` é false, e o
// generate-video-cinematic entende que recebeu um TEMA, não um roteiro — daí
// ele escreve o texto dele e ignora o meu. Contrato C1 nunca liga.
//
// FORMATO CERTO, uma linha por cena:
//   [Pexels: chess board dramatic lighting] In 1997, a machine beat the
//   greatest chess player alive. Everyone said chess was dead.
//   [Pexels: crowded tournament hall] Chess is not dead. More people play...
//
// Vale para o Kling 3 (hollywood) também: ali o `[Pexels: ...]` não busca
// stock nenhum, ele vira a DIREÇÃO VISUAL da cena, e
// `parsedScript.narration` inteira vira a fala do filme
// (generate-video-cinematic ~1825: `verbatim && parsedScript.narration`).
//
// REGRA QUE FICA: antes de enfileirar, confira que o prompt tem um
// `[Pexels: ...]` por cena. Depois do render, confira `verbatim = true` e
// `length(voiceover_script)` compatível com o que você escreveu. Se o texto
// guardado for muito menor que o seu, o filme JÁ nasceu errado — não adianta
// olhar a imagem.
//
// ═══ POR QUE TAMBÉM EXISTE UM GET DRENADO POR CRON ═══════════════════════
// O POST acima exige quem chama ter o CRON_SECRET em mãos. Eu não tenho, e
// pedir para o fundador colar um segredo no chat é a pior forma de resolver
// isso: segredo colado em conversa vaza, fica no histórico e não se revoga.
//
// A saída é a fila `demo_render_jobs`. Quem ENFILEIRA é o service_role, que já
// administra o banco. Quem EXECUTA é o cron da Vercel, e a Vercel injeta o
// `Authorization: Bearer $CRON_SECRET` sozinha na hora de chamar a rota. Ou
// seja: o segredo nunca sai da plataforma e ninguém precisa digitá-lo.
//
// Cada passada do cron AVANÇA UM ESTÁGIO por job, porque um clipe de IA demora
// minutos e a lambda morre em 300s:
//   queued → submitted → composing → done
// Se a passada acabar no meio, o job fica no estágio em que estava e a próxima
// continua dali. Nada é regerado: clipe pronto na fal continua pronto.
export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface CinematicResposta {
  generationId?: string
  fal_request_ids?: (string | null)[]
  fal_model?: string
  fal_models?: string[]
  voiceover_script?: string
  scene_captions?: string[]
  // ⚠️ KINEO-DEMO-MONTA-IGUAL-2026-08-22 — OS QUATRO CAMPOS QUE FALTAVAM.
  // Sem eles este worker montava o filme por um caminho que NENHUM cliente usa
  // (ver o bloco no POST do compose, abaixo). Declarados aqui para que o
  // TypeScript cobre o repasse, em vez de deixar sumir em silêncio de novo.
  scene_engines?: string[]
  scene_narrations?: (string | null)[]
  scene_dialogues?: (string | null)[]
  scene_seconds?: number[]
  duration?: number
  quality?: string
  verbatim?: boolean
  speed?: number
  error?: string
  pending?: boolean
  retry_after_ms?: number
  queued?: boolean
}

interface ClipStatusResposta {
  clips?: { id: string; status: string; url: string | null }[]
  allDone?: boolean
  done?: number
  total?: number
  failed?: number
  error?: string
}

interface ComposeResposta {
  render_id?: string
  error?: string
}

function autorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

function baseUrlDe(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
}

async function sessaoPara(email: string): Promise<{ session: UserSession; userId: string } | { erro: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !svc) return { erro: 'supabase env incompleto' }
  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin
    .from('profiles')
    .select('id, email')
    .ilike('email', email.trim())
    .maybeSingle()
  if (error) return { erro: `busca do perfil falhou: ${error.message}` }
  if (!data?.id) return { erro: `nenhuma conta com o e-mail ${email}` }
  const session = await mintUserSession(data.id as string)
  if (!session) return { erro: 'nao consegui emitir sessao para essa conta' }
  return { session, userId: data.id as string }
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let corpo: Record<string, unknown>
  try {
    corpo = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'corpo invalido' }, { status: 400 })
  }

  const email = String(corpo.email ?? '').trim()
  if (!email) return NextResponse.json({ error: 'email da conta alvo e obrigatorio' }, { status: 400 })
  const step = String(corpo.step ?? 'start')

  const sess = await sessaoPara(email)
  if ('erro' in sess) return NextResponse.json({ error: sess.erro }, { status: 400 })
  const baseUrl = baseUrlDe(req)

  // ── ETAPA 1: submete o filme ao motor ────────────────────────────────────
  if (step === 'start') {
    const prompt = String(corpo.prompt ?? '').trim()
    if (!prompt) return NextResponse.json({ error: 'prompt e obrigatorio' }, { status: 400 })
    const engine = String(corpo.engine ?? 'cinematic')
    const duration = Number(corpo.duration) || 60
    // O id precisa casar com validCinematicGenerationId: [A-Za-z0-9_-]{8,100}.
    const generationId = `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

    const r = await callAsUser<CinematicResposta>({
      baseUrl,
      path: '/api/generate-video-cinematic',
      session: sess.session,
      method: 'POST',
      body: { generationId, prompt, duration, language: 'en', engine },
      timeoutMs: 280_000,
    })

    if (!r.ok || !r.body) {
      return NextResponse.json(
        {
          error: r.body?.error ?? r.errorText ?? `HTTP ${r.status}`,
          // 409/503 com `pending` = "aceito, reconciliando": quem chamou tenta
          // de novo com o MESMO generationId, que é o que o claim espera.
          pending: r.body?.pending ?? false,
          generationId,
          status: r.status,
        },
        { status: r.status === 0 ? 502 : r.status },
      )
    }

    const ids = (r.body.fal_request_ids ?? []).filter((x): x is string => typeof x === 'string' && x.length > 0)
    if (ids.length === 0) {
      return NextResponse.json({ error: 'o motor nao devolveu nenhum clipe', generationId }, { status: 502 })
    }

    return NextResponse.json({
      step: 'started',
      generationId,
      email,
      falRequestIds: ids,
      falModel: r.body.fal_model ?? null,
      falModels: r.body.fal_models ?? null,
      voiceoverScript: r.body.voiceover_script ?? '',
      sceneCaptions: r.body.scene_captions ?? [],
      duration: r.body.duration ?? duration,
      quality: r.body.quality ?? engine,
      verbatim: r.body.verbatim ?? false,
      speed: typeof r.body.speed === 'number' ? r.body.speed : null,
      topic: prompt.slice(0, 200),
      dica: 'chame de novo com step=finish e este mesmo objeto',
    })
  }

  // ── ETAPA 2: espera os clipes e monta ────────────────────────────────────
  if (step === 'finish') {
    const generationId = String(corpo.generationId ?? '').trim()
    const falRequestIds = Array.isArray(corpo.falRequestIds) ? (corpo.falRequestIds as string[]) : []
    if (!generationId || falRequestIds.length === 0) {
      return NextResponse.json({ error: 'generationId e falRequestIds sao obrigatorios' }, { status: 400 })
    }

    const qs = new URLSearchParams({ ids: JSON.stringify(falRequestIds), generationId })
    if (corpo.falModel) qs.set('model', String(corpo.falModel))
    if (Array.isArray(corpo.falModels) && corpo.falModels.length > 0) {
      qs.set('models', JSON.stringify(corpo.falModels))
    }

    // Teto de 240s: sobra folga dentro do maxDuration de 300 para o compose
    // responder. Se os clipes não ficarem prontos a tempo, devolvemos
    // `pending` e quem orquestra chama step=finish de novo — os clipes já
    // prontos continuam prontos do lado da fal, nada se perde.
    const prazo = Date.now() + 240_000
    let ultimo: ClipStatusResposta | null = null
    while (Date.now() < prazo) {
      const s = await callAsUser<ClipStatusResposta>({
        baseUrl,
        path: `/api/cinematic-clip-status?${qs.toString()}`,
        session: sess.session,
        method: 'GET',
        timeoutMs: 30_000,
      })
      ultimo = s.body
      if (s.status === 502) {
        return NextResponse.json({ error: s.body?.error ?? 'o motor falhou nos clipes' }, { status: 502 })
      }
      if (s.body?.allDone) break
      await new Promise((r) => setTimeout(r, 6000))
    }

    if (!ultimo?.allDone) {
      return NextResponse.json({
        step: 'pending',
        prontos: ultimo?.done ?? 0,
        total: ultimo?.total ?? falRequestIds.length,
        falharam: ultimo?.failed ?? 0,
        dica: 'chame step=finish de novo; os clipes prontos nao se perdem',
      })
    }

    const clipUrls = (ultimo.clips ?? []).map((c) => c.url).filter((u): u is string => typeof u === 'string')
    if (clipUrls.length === 0) {
      return NextResponse.json({ error: 'clipes marcados como prontos mas sem url' }, { status: 502 })
    }

    const c = await callAsUser<ComposeResposta>({
      baseUrl,
      path: '/api/compose',
      session: sess.session,
      method: 'POST',
      body: {
        generationId,
        clip_urls: clipUrls,
        voiceover_script: String(corpo.voiceoverScript ?? ''),
        scene_captions: Array.isArray(corpo.sceneCaptions) ? corpo.sceneCaptions : [],
        duration: Number(corpo.duration) || 60,
        topic: String(corpo.topic ?? 'Kineo demo'),
        quality: String(corpo.quality ?? 'cinematic'),
        language: 'en',
        // `speed` só viaja quando a narração é verbatim — é assim que o
        // GenerateClient faz, e o compose usa isso para honrar o Contrato C1.
        ...(corpo.verbatim && typeof corpo.speed === 'number' ? { speed: corpo.speed } : {}),
      },
      timeoutMs: 290_000,
    })

    const renderId = (c.body?.render_id ?? '').trim()
    if (!c.ok || !renderId) {
      return NextResponse.json(
        { error: c.body?.error ?? c.errorText ?? `HTTP ${c.status}`, status: c.status },
        { status: c.status === 0 ? 502 : c.status },
      )
    }
    return NextResponse.json({ step: 'composing', renderId, generationId, clipes: clipUrls.length })
  }

  return NextResponse.json({ error: 'step deve ser start ou finish' }, { status: 400 })
}

// ═══ WORKER: drena a fila `demo_render_jobs` ═════════════════════════════
// Chamado pelo cron da Vercel, que injeta o CRON_SECRET sozinha.
// Avança UM estágio por job em cada passada. Um job por passada, de propósito:
// os motores caros (Kling 3) já disputam fila na fal, e disparar oito de uma
// vez só faz todo mundo esperar mais.
const MAX_TENTATIVAS = 4

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !svc) return NextResponse.json({ error: 'env missing' }, { status: 503 })
  const db = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
  const baseUrl = baseUrlDe(req)

  // Mais velho primeiro: a ordem da fila é a ordem de prioridade que quem
  // enfileirou escolheu.
  const { data: jobs } = await db
    .from('demo_render_jobs')
    .select('*')
    .in('status', ['queued', 'submitted'])
    .lt('attempts', MAX_TENTATIVAS)
    .order('created_at', { ascending: true })
    .limit(1)

  const job = jobs?.[0] as Record<string, unknown> | undefined
  if (!job) return NextResponse.json({ ok: true, nota: 'fila vazia' })

  const id = job.id as string
  const email = job.account_email as string
  const marcar = async (patch: Record<string, unknown>) => {
    await db.from('demo_render_jobs').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  }
  await marcar({ attempts: ((job.attempts as number) ?? 0) + 1 })

  const sess = await sessaoPara(email)
  if ('erro' in sess) {
    await marcar({ error: sess.erro })
    return NextResponse.json({ id, erro: sess.erro }, { status: 200 })
  }

  try {
    // ── queued → submitted ────────────────────────────────────────────────
    if (job.status === 'queued') {
      const generationId = `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      const r = await callAsUser<CinematicResposta>({
        baseUrl,
        path: '/api/generate-video-cinematic',
        session: sess.session,
        method: 'POST',
        body: {
          generationId,
          prompt: job.prompt as string,
          duration: (job.duration as number) ?? 60,
          language: 'en',
          engine: (job.engine as string) ?? 'cinematic',
        },
        timeoutMs: 280_000,
      })
      if (!r.ok || !r.body) {
        const msg = r.body?.error ?? r.errorText ?? `HTTP ${r.status}`
        // `pending` = aceito e reconciliando. NÃO é falha: devolver o job para
        // `queued` sem consumir tentativa evitaria contar errado, mas manter a
        // tentativa é o que impede um job problemático de girar para sempre.
        await marcar({ error: msg })
        return NextResponse.json({ id, estagio: 'start', erro: msg })
      }
      const ids = (r.body.fal_request_ids ?? []).filter((x): x is string => typeof x === 'string' && x.length > 0)
      if (ids.length === 0) {
        await marcar({ error: 'o motor nao devolveu clipes' })
        return NextResponse.json({ id, estagio: 'start', erro: 'sem clipes' })
      }
      await marcar({
        status: 'submitted',
        generation_id: generationId,
        fal_request_ids: ids,
        fal_model: r.body.fal_model ?? null,
        fal_models: r.body.fal_models ?? null,
        voiceover_script: r.body.voiceover_script ?? '',
        scene_captions: r.body.scene_captions ?? [],
        // KINEO-DEMO-MONTA-IGUAL-2026-08-22 — guardados aqui porque o worker
        // roda em PASSADAS separadas: submete numa, compõe noutra. Sem
        // persistir, a resposta do /api/generate-video-cinematic morre no fim
        // desta requisição e o compose da passada seguinte monta às cegas.
        scene_engines: r.body.scene_engines ?? [],
        scene_narrations: r.body.scene_narrations ?? [],
        scene_dialogues: r.body.scene_dialogues ?? [],
        scene_seconds: r.body.scene_seconds ?? [],
        verbatim: r.body.verbatim ?? false,
        speed: typeof r.body.speed === 'number' ? r.body.speed : null,
        // ⚠ `engine` e `quality` sao vocabularios DIFERENTES: pede-se
        // 'hollywood' ao motor, mas o compose cobra 'cinematic_hollywood'.
        // Guardamos o quality que o SERVIDOR devolveu, nunca uma traducao
        // adivinhada — traduzir errado faria o compose recusar o filme DEPOIS
        // de debitar o credito (o bug de 20/08 nos tiers de 35s e 90s).
        quality: r.body.quality ?? null,
        error: null,
        // Submeteu com sucesso: zera para que a espera pelos clipes tenha o
        // orçamento de tentativas inteiro, e não o que sobrou do submit.
        attempts: 0,
      })
      return NextResponse.json({ id, estagio: 'submetido', alvo: job.target_name, clipes: ids.length })
    }

    // ── submitted → composing ─────────────────────────────────────────────
    const falRequestIds = (job.fal_request_ids as string[]) ?? []
    const generationId = (job.generation_id as string) ?? ''
    const qs = new URLSearchParams({ ids: JSON.stringify(falRequestIds), generationId })
    if (job.fal_model) qs.set('model', String(job.fal_model))
    if (Array.isArray(job.fal_models) && (job.fal_models as string[]).length > 0) {
      qs.set('models', JSON.stringify(job.fal_models))
    }

    const s = await callAsUser<ClipStatusResposta>({
      baseUrl,
      path: `/api/cinematic-clip-status?${qs.toString()}`,
      session: sess.session,
      method: 'GET',
      timeoutMs: 30_000,
    })
    if (s.status === 502) {
      await marcar({ status: 'failed', error: s.body?.error ?? 'motor falhou nos clipes' })
      return NextResponse.json({ id, estagio: 'clipes', erro: 'motor falhou' })
    }
    if (!s.body?.allDone) {
      // Ainda cozinhando. NÃO consome tentativa — esperar não é errar.
      await marcar({ attempts: (job.attempts as number) ?? 0 })
      return NextResponse.json({
        id,
        estagio: 'aguardando clipes',
        alvo: job.target_name,
        prontos: s.body?.done ?? 0,
        total: s.body?.total ?? falRequestIds.length,
      })
    }

    const clipUrls = (s.body.clips ?? []).map((c) => c.url).filter((u): u is string => typeof u === 'string')
    if (clipUrls.length === 0) {
      await marcar({ status: 'failed', error: 'clipes prontos sem url' })
      return NextResponse.json({ id, erro: 'clipes prontos sem url' })
    }

    const c = await callAsUser<ComposeResposta>({
      baseUrl,
      path: '/api/compose',
      session: sess.session,
      method: 'POST',
      body: {
        generationId,
        clip_urls: clipUrls,
        voiceover_script: String(job.voiceover_script ?? ''),
        scene_captions: Array.isArray(job.scene_captions) ? job.scene_captions : [],
        // ═══ KINEO-DEMO-MONTA-IGUAL-2026-08-22 ═════════════════════════════
        // ESTES QUATRO CAMPOS FALTAVAM, E É POR ISSO QUE O DEMO SAIU QUEBRADO.
        //
        // O fundador reprovou um Kling 3 deste worker: "só o avatar fala, e
        // ainda sem legenda; as outras cenas têm apagão de narração". Medi os
        // três motores lado a lado e o veredito foi este:
        //     Kling 2.5 (produto normal) .... legenda OK
        //     H3        (produto normal) .... legenda OK (3 de 4 frames)
        //     Kling 3   (ESTE worker) ....... legenda em 0 de 6 frames
        // O único quebrado é o único que passou por aqui.
        //
        // O QUE ACONTECIA: o /api/compose lê `scene_engines`, `scene_dialogues`
        // e `scene_narrations` do corpo. Sem eles:
        //   · toda cena caía no default 'support' — inclusive as de DIÁLOGO,
        //     então o filme perdia a noção de qual cena é o avatar falando;
        //   · `dialogueLine` nascia vazio, e é dele que sai a legenda quando a
        //     transcrição do clipe não vem. Sem texto, o fallback não emite
        //     nada — que é exatamente o "sem legenda" que ele viu;
        //   · a narração por cena não existia, então a TTS não tinha como ser
        //     distribuída — o "apagão de narração" nas cenas de apoio.
        //
        // A LIÇÃO É MAIOR QUE O BUG: um worker de teste que monta o filme por
        // um caminho DIFERENTE do cliente não testa o produto — testa a si
        // mesmo. Os oito demos que eu gerei para os afiliados saíram por aqui,
        // e por isso NÃO representam o que um cliente recebe. Este worker
        // agora repassa o corpo inteiro que o GenerateClient repassa
        // (app/(dashboard)/generate/GenerateClient.tsx:4051), e o cron de
        // resgate faz o mesmo (finish-stranded-renders:428). Três chamadores,
        // um só formato.
        scene_engines: Array.isArray(job.scene_engines) ? job.scene_engines : [],
        scene_narrations: Array.isArray(job.scene_narrations) ? job.scene_narrations : [],
        scene_dialogues: Array.isArray(job.scene_dialogues) ? job.scene_dialogues : [],
        scene_seconds: Array.isArray(job.scene_seconds) ? job.scene_seconds : [],
        duration: (job.duration as number) ?? 60,
        topic: String(job.target_name ?? 'Kineo demo'),
        quality: String(job.quality ?? job.engine ?? 'cinematic_ai'),
        language: 'en',
        ...(job.verbatim && typeof job.speed === 'number' ? { speed: Number(job.speed) } : {}),
      },
      timeoutMs: 290_000,
    })
    const renderId = (c.body?.render_id ?? '').trim()
    if (!c.ok || !renderId) {
      const msg = c.body?.error ?? c.errorText ?? `HTTP ${c.status}`
      await marcar({ error: msg })
      return NextResponse.json({ id, estagio: 'compose', erro: msg })
    }
    // `composing` é o estado final desta fila. Daqui em diante quem termina o
    // filme é o pipeline normal de compose + o cron finish-stranded-renders,
    // exatamente como num render feito à mão. Não duplicamos essa espera.
    await marcar({ status: 'composing', render_id: renderId, error: null })
    return NextResponse.json({ id, estagio: 'montando', alvo: job.target_name, renderId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await marcar({ error: msg.slice(0, 400) })
    return NextResponse.json({ id, erro: msg.slice(0, 400) }, { status: 200 })
  }
}
