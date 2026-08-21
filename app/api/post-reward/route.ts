import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// ═══ KINEO-CREDITO-POR-POSTAR-2026-08-21 ═══════════════════════════════════
//
// A IDEIA: todo filme do free tier sai com `usekineo.com/free` queimado no
// pixel. Isso já é um outdoor. Só que hoje a gente ENTREGA esse outdoor de
// graça, não pede nada em troca, e não faz ideia se alguém posta.
//
// Aqui a marca d'água deixa de ser só uma trava de conversão e vira canal de
// aquisição: postou, colou o link, ganha crédito. O efeito é duplo e os dois
// lados importam:
//   1. distribuição real — o público de quem postou vê nosso domínio, e essa
//      pessoa confia nele muito mais do que num anúncio nosso;
//   2. empurra para o 4º filme — o crédito só serve para gerar mais, e 4 é o
//      ponto onde a conversão histórica salta (0,33% com 1 · 11,76% com 4-6).
//
// POR QUE ISSO É BARATO DE VERDADE: o prêmio é pago em CRÉDITO, não em
// dinheiro. 20 créditos = 1 filme Seedance ≈ $1,54 de fal — e só sai do caixa
// se a pessoa realmente gerar. Um clique em anúncio no nosso setor custa
// $23,63 (CPC medido) e não vem com vídeo nenhum.
//
// ⚠ HONESTIDADE SOBRE VERIFICAÇÃO: NÃO dá para provar que o vídeo publicado é
// o nosso sem baixar o post e comparar quadros — não vale o custo nem a
// latência. As travas abaixo são de CONTENÇÃO, não de prova:
//   · 1 prêmio por VÍDEO (a pessoa precisa ter gerado o filme na conta dela)
//   · URL única no sistema inteiro (índice no banco, não checagem em memória)
//   · teto por conta
// O pior caso é alguém colar links plausíveis até o teto. O teto É o orçamento
// máximo do abuso, e está calibrado para custar menos que um clique de anúncio.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** 20 créditos = exatamente 1 filme Seedance. O prêmio é "mais um vídeo". */
const POST_REWARD_CREDITS = 20
/** Teto por conta: 5 posts = 100 créditos ≈ $7,70 de fal no pior caso. */
const POST_REWARD_MAX_PER_USER = 5

// Só plataformas onde um Short/Reel/TikTok realmente vive. Domínio de encurtador
// fica de fora de propósito: encurtador esconde o destino e é o caminho óbvio
// para colar qualquer coisa.
const PLATAFORMAS: { nome: string; hosts: string[] }[] = [
  { nome: 'youtube', hosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'] },
  { nome: 'tiktok', hosts: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'm.tiktok.com'] },
  { nome: 'instagram', hosts: ['instagram.com', 'www.instagram.com'] },
]

function classificar(raw: string): { url: string; platform: string } | null {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.toLowerCase()
  const hit = PLATAFORMAS.find((p) => p.hosts.includes(host))
  if (!hit) return null
  // Normaliza: fora query string (utm, ?si=, ?feature=) para que o mesmo post
  // colado de dois lugares diferentes conte como UM. Sem isto, o índice único
  // de URL não seguraria nada.
  const limpa = `${u.origin}${u.pathname}`.replace(/\/+$/, '').toLowerCase()
  return { url: limpa, platform: hit.nome }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !svc) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
    const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

    let body: { url?: string; videoId?: string }
    try {
      body = (await req.json()) as { url?: string; videoId?: string }
    } catch {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    }

    const classificado = classificar(String(body.url ?? ''))
    if (!classificado) {
      return NextResponse.json(
        { error: 'Paste the link to your published video on YouTube, TikTok or Instagram.' },
        { status: 400 },
      )
    }

    // ⚠ GATE DE TIER NO SERVIDOR, espelhando o da tela. A UI só mostra o card
    // para free sem compra, mas rota aberta é rota que alguém chama por fora:
    // um assinante ganharia 20 créditos por um outdoor que NÃO EXISTE — o
    // filme dele sai limpo, sem `usekineo.com/free` em lugar nenhum. Gate de
    // servidor e gate de UI são um PAR neste repositório (a lição do
    // cinematicUnlocked de 20/08, que dessincronizou e anulou a mudança do dia).
    const { data: perfilGate } = await admin
      .from('profiles')
      .select('is_pro, plan')
      .eq('id', user.id)
      .maybeSingle()
    if (perfilGate?.is_pro === true) {
      return NextResponse.json(
        { error: 'Paid plans already export without a watermark — nothing to reward.' },
        { status: 403 },
      )
    }

    const videoId = typeof body.videoId === 'string' && body.videoId.trim() ? body.videoId.trim() : null

    // O vídeo tem de ser DESTA conta. Sem isto, qualquer um reivindicaria o
    // filme de outra pessoa e o índice único por (user_id, video_id) não
    // impediria nada — ele só garante unicidade, não propriedade.
    if (videoId) {
      const { data: v } = await admin
        .from('videos')
        .select('id, user_id')
        .eq('id', videoId)
        .maybeSingle()
      if (!v || v.user_id !== user.id) {
        return NextResponse.json({ error: 'That video is not on your account.' }, { status: 403 })
      }
    }

    const { count: jaGanhou } = await admin
      .from('post_rewards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if ((jaGanhou ?? 0) >= POST_REWARD_MAX_PER_USER) {
      return NextResponse.json(
        {
          error: `You have already claimed the maximum of ${POST_REWARD_MAX_PER_USER} posting rewards.`,
          maxed: true,
        },
        { status: 409 },
      )
    }

    // A inserção é a trava de verdade: o índice único de URL e o de vídeo vivem
    // no BANCO. Checar antes e inserir depois deixaria uma janela de corrida
    // (duas abas, dois cliques) por onde sai crédito dobrado. Insere primeiro,
    // trata o 23505.
    const { error: insErro } = await admin.from('post_rewards').insert({
      user_id: user.id,
      video_id: videoId,
      url: classificado.url,
      platform: classificado.platform,
      credits_granted: POST_REWARD_CREDITS,
    })
    if (insErro) {
      if ((insErro as { code?: string }).code === '23505') {
        return NextResponse.json(
          { error: 'That link (or that video) has already been rewarded.', duplicate: true },
          { status: 409 },
        )
      }
      console.error('[post-reward] insert', insErro.message)
      return NextResponse.json({ error: 'Could not record that right now.' }, { status: 500 })
    }

    // Crédito SÓ depois que a linha existe. Na ordem inversa, um erro no insert
    // deixaria crédito concedido sem rastro e sem teto.
    const { data: perfil } = await admin
      .from('profiles')
      .select('video_credits')
      .eq('id', user.id)
      .maybeSingle()
    const novoSaldo = ((perfil?.video_credits as number) ?? 0) + POST_REWARD_CREDITS
    const { error: credErro } = await admin
      .from('profiles')
      .update({ video_credits: novoSaldo })
      .eq('id', user.id)
    if (credErro) {
      // A linha ficou registrada mas o crédito não entrou. Some com a linha
      // para que a pessoa possa tentar de novo — caso contrário ela perde o
      // prêmio E o direito de reivindicá-lo, que é o pior dos dois mundos.
      await admin.from('post_rewards').delete().eq('user_id', user.id).eq('url', classificado.url)
      console.error('[post-reward] credit', credErro.message)
      return NextResponse.json({ error: 'Could not add the credits. Try again.' }, { status: 500 })
    }

    await admin.from('events').insert({
      user_id: user.id,
      name: 'post_reward_claimed',
      metadata: { platform: classificado.platform, credits: POST_REWARD_CREDITS, video_id: videoId },
    })

    return NextResponse.json({
      ok: true,
      creditsAdded: POST_REWARD_CREDITS,
      balance: novoSaldo,
      remaining: POST_REWARD_MAX_PER_USER - ((jaGanhou ?? 0) + 1),
    })
  } catch (e) {
    console.error('[post-reward]', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
