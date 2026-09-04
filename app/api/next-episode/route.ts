import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeSeriesSeed } from '@/lib/seriesContinuation'

// ═══ KINEO-PROXIMO-EPISODIO-2026-08-21 ═════════════════════════════════════
//
// O NÚMERO QUE MANDOU CONSTRUIR ISTO (medido em 14 dias):
//   436 cadastros → 251 fizeram vídeo → 164 fizeram EXATAMENTE UM → 63 viram
//   o preço → 3 pagaram.
// A queda brutal não é no checkout, é do vídeo 1 para o vídeo 2. E o detalhe
// que fecha o diagnóstico: 76 dessas 164 pessoas AINDA TINHAM crédito de
// sobra. Não foi falta de saldo. Foi falta de MOTIVO.
//
// Por que ninguém faz o segundo: quando o filme fica pronto, a tela oferece
// "gerar outro" — que é um formulário em branco. A pessoa teria que inventar
// um tema novo, do zero, com a empolgação já passando. Formulário em branco é
// o ponto onde a sessão morre.
//
// A INVERSÃO: em vez de pedir a próxima ideia, a gente ENTREGA. O filme
// termina com o EPISÓDIO 2 já escrito, no mesmo assunto e no mesmo formato,
// pronto para renderizar em um clique. Deixa de ser "faça outro vídeo" e vira
// "seu próximo vídeo está pronto, quer ver?".
//
// POR QUE ISSO VALE MAIS QUE CRÉDITO GRÁTIS: a conversão histórica salta de
// 0,33% (1 filme) para 11,76% (4-6 filmes). O fundador corretamente apontou
// que isso é CORRELAÇÃO — pode ser que quem já ia comprar seja quem faz 4.
// Mas há um lado causal defensável e barato: quem não tem a próxima ideia
// pronta certamente não faz o 4º vídeo. Remover o formulário em branco não
// garante a compra; deixá-lo lá garante a desistência.
//
// CUSTO: uma chamada de gpt-4o-mini por filme concluído (~$0.0002). Não gasta
// crédito do usuário, não chama fal, não renderiza nada — só escreve texto.
// Renderizar só acontece se a pessoa clicar, e aí é o fluxo normal, cobrado
// normalmente.
//
// ═══ KINEO-MEMORIA-SERIE-2026-09-04 — a rota passa a ter memória própria ═══
//
// O NÚMERO QUE MANDOU MEXER (30 dias, contas externas, medido em 04/09):
//   quem fez 1 filme paga 0,3%; 2-3 filmes 1,8%; 4-7 filmes 15,4%. Mover a
//   pessoa do filme 1 para o 2 é a jogada — e este cartão era a peça feita
//   para isso. Só que `next_episode_clicked` = 1 evento em 30 dias, 1 pessoa,
//   com 413 pessoas chegando na tela de filme pronto. E não existia NENHUM
//   evento de exposição: não dava para saber se o cartão apareceu uma vez.
//
// OS TRÊS DEFEITOS QUE ESTE BLOCO FECHA (todos confirmados lendo o código):
//   1. A memória da série não existia. `videos.script` está VAZIO em 774 de
//      774 filmes entregues em 30 dias (a coluna existe, é lida por
//      /api/video-summary, nunca foi escrita). O conteúdo real que EXISTE no
//      banco é `videos.topic` (média 399 caracteres).
//   2. `alreadyDone` nasceu morto: a rota aceitava a lista "já cobri isto,
//      não repita" e NENHUM caller no repo jamais preencheu o campo. É
//      exatamente o campo que impede o episódio 3 de repetir o 1 e o 2.
//   3. O caller mandava a ORDEM (`topic` = o que a pessoa digitou), não a
//      NARRAÇÃO que o filme falou (`voiceover_script`, no mesmo objeto). E
//      quando `lastFastRenderRef` estava vazio (mount novo, volta da Stripe),
//      o cartão simplesmente não aparecia.
//
// A RESPOSTA: o cliente manda `fromVideoId` (o handle durável do filme) e o
// servidor vira a fonte de verdade — lê o filme de origem RESTRITO AO DONO
// com o mesmo client autenticado (nunca service key), usa `videos.topic`
// como fallback de `previousTopic`, e monta `alreadyDone` sozinho com os
// últimos filmes concluídos da pessoa (excluindo o de origem, que já vai em
// EPISODE 1 — repetir seria dizer "não repita o que eu te mandei escrever").
// Toda leitura de banco falha FECHADA e SILENCIOSA: o caminho de escrever o
// episódio nunca depende do banco estar bom. Isto é um bônus de tela de
// sucesso; um 403 barulhento aqui seria pior que cartão nenhum.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface Corpo {
  /** O tema/roteiro do filme que a pessoa ACABOU de fazer. Preferir a NARRAÇÃO
   *  real (`voiceover_script`); com `fromVideoId` válido, pode vir vazio. */
  previousTopic?: string
  /** Temas que ela já fez, para o GPT não repetir. O servidor SEMPRE acrescenta
   *  o que sabe (KINEO-MEMORIA-SERIE-2026-09-04). */
  alreadyDone?: string[]
  language?: string
  /** uuid do filme que a pessoa acabou de fazer (`videos.id`). Lido restrito
   *  ao dono; se não existir ou não for dela, segue sem memória. */
  fromVideoId?: string
}

/** Teto da lista montada pelo servidor. O `.slice(0, 8)` do corpo continua
 *  sendo o teto final depois da união com o que o cliente mandou. */
const MAX_JA_FEITOS_SERVIDOR = 6
/** Quantos filmes recentes ler para montar a lista (12 lidos → ≤6 sobrevivem
 *  depois de tirar o de origem, os vazios e os duplicados). */
const LIMITE_LEITURA_MEMORIA = 12
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface LinhaVideo {
  id: string
  title: string | null
  topic: string | null
}

interface MemoriaSerie {
  /** `videos.topic` do filme de origem (fallback de `previousTopic`). */
  topicOrigem: string
  /** Se a linha do filme de origem foi lida (e era do dono). */
  hadMemory: boolean
  /** "ALREADY COVERED" montado pelo servidor, já normalizado, sem o de origem. */
  jaFeitos: string[]
  /** Total de filmes concluídos da pessoa (episodeNumber = total + 1). */
  totalConcluidos: number
}

/**
 * Lê o que o servidor sabe sobre a série da pessoa. NUNCA lança: qualquer
 * erro do Supabase vira `console.warn` e memória vazia — a rota segue.
 * Mesmo client autenticado da rota (RLS do dono), sem service key.
 */
async function lerMemoriaSerie(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  fromVideoId: string | undefined,
): Promise<MemoriaSerie> {
  const vazia: MemoriaSerie = { topicOrigem: '', hadMemory: false, jaFeitos: [], totalConcluidos: 0 }
  const memoria: MemoriaSerie = { ...vazia }
  const origemId = fromVideoId && UUID_RE.test(fromVideoId) ? fromVideoId : undefined

  // (a) O filme de origem, RESTRITO AO DONO. `.eq('user_id', userId)` não é
  // enfeite: é o que impede ler o filme de outra pessoa por uuid adivinhado.
  if (origemId) {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, topic')
        .eq('id', origemId)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) {
        console.warn('[next-episode] memoria: leitura do filme de origem falhou', error.message)
      } else if (data) {
        const linha = data as LinhaVideo
        memoria.topicOrigem = (linha.topic ?? linha.title ?? '').trim()
        memoria.hadMemory = true
      }
    } catch (e) {
      console.warn('[next-episode] memoria: filme de origem', e instanceof Error ? e.message : String(e))
    }
  }

  // (c)+(d) Os últimos filmes concluídos da pessoa + a contagem total, numa
  // única ida ao banco (`count: 'exact'` conta o conjunto inteiro, o `limit`
  // só recorta as linhas devolvidas).
  try {
    const { data, error, count } = await supabase
      .from('videos')
      .select('id, title, topic', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(LIMITE_LEITURA_MEMORIA)
    if (error) {
      console.warn('[next-episode] memoria: leitura dos filmes concluídos falhou', error.message)
    } else {
      memoria.totalConcluidos = typeof count === 'number' && count > 0 ? count : 0
      const vistos = new Set<string>()
      for (const linha of (data ?? []) as LinhaVideo[]) {
        // O de origem é o EPISODE 1 do prompt — não entra em "já cobri".
        if (origemId && linha.id === origemId) continue
        // `topic` primeiro (é o conteúdo inteiro, média 399 chars); `title` é o
        // mesmo texto cortado em ~120. normalizeSeriesSeed tira o andaime da
        // ordem antiga ("Create the next episode in the same Short series
        // about…") e corta em 180 na fronteira — ver bloco A3 em
        // lib/seriesContinuation.ts.
        const semente = normalizeSeriesSeed(linha.topic || linha.title)
        if (!semente) continue
        const chave = semente.toLowerCase()
        if (vistos.has(chave)) continue
        vistos.add(chave)
        memoria.jaFeitos.push(semente)
        if (memoria.jaFeitos.length >= MAX_JA_FEITOS_SERVIDOR) break
      }
    }
  } catch (e) {
    console.warn('[next-episode] memoria: filmes concluídos', e instanceof Error ? e.message : String(e))
  }

  return memoria
}

// O mesmo esqueleto que o resto do pipeline espera (parseViralScriptSections
// procura estes marcadores em INGLÊS — ver CLAUDE.md e /api/analyze-idea).
// Se estes nomes mudarem aqui e não lá, a narração deixa de ser verbatim e o
// GPT volta a reescrever a fala do usuário, quebrando o Contrato C1.
const MARCADORES = ['HOOK', 'MICRO REWARD', 'ESCALATION', 'PAYOFF'] as const

// ⚠ COOLDOWN — e o motivo NÃO é o custo desta rota (~$0.0003 por chamada).
// É a COTA da OpenAI: um 429 aqui derruba `generate-script` E `analyze-idea`,
// ou seja, a geração de vídeo INTEIRA. Sem esta trava, uma sessão logada em
// loop transforma um card de bônus em queda do produto. Memória de processo é
// suficiente: a lambda é efêmera, o pior caso é o cooldown reiniciar junto com
// ela, e mesmo assim o teto por instância segura o loop.
const ULTIMA_CHAMADA = new Map<string, number>()
const COOLDOWN_MS = 45_000

function temMarcadores(texto: string): boolean {
  return MARCADORES.every((m) => texto.toUpperCase().includes(m))
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'unavailable' }, { status: 503 })

    let body: Corpo
    try {
      body = (await req.json()) as Corpo
    } catch {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    }

    const agora = Date.now()
    const ultima = ULTIMA_CHAMADA.get(user.id) ?? 0
    if (agora - ultima < COOLDOWN_MS) {
      return NextResponse.json({ error: 'Too soon.', retryAfterMs: COOLDOWN_MS - (agora - ultima) }, { status: 429 })
    }
    ULTIMA_CHAMADA.set(user.id, agora)
    // Limpeza preguiçosa: sem isto o Map cresce sem teto numa lambda quente.
    if (ULTIMA_CHAMADA.size > 500) {
      for (const [k, v] of ULTIMA_CHAMADA) if (agora - v > COOLDOWN_MS * 4) ULTIMA_CHAMADA.delete(k)
    }

    // KINEO-MEMORIA-SERIE-2026-09-04 — o servidor lê o que sabe ANTES de
    // decidir se tem com o que escrever. Falha fechada: memória vazia nunca
    // derruba a rota.
    const fromVideoId = typeof body.fromVideoId === 'string' ? body.fromVideoId.trim() : undefined
    const memoria = await lerMemoriaSerie(supabase, user.id, fromVideoId || undefined)

    // (b) `previousTopic` com fallback de servidor: o cliente manda a narração
    // real quando a tem (melhor fonte); vazio + `fromVideoId` válido cai em
    // `videos.topic`. O 400 só acontece DEPOIS dos dois caminhos.
    const anteriorCliente = (body.previousTopic ?? '').trim()
    const anterior = (anteriorCliente || memoria.topicOrigem).slice(0, 4000)
    if (!anterior) return NextResponse.json({ error: 'previousTopic is required' }, { status: 400 })

    // (c) "ALREADY COVERED" = o que o cliente mandou + o que o servidor sabe.
    // O servidor é a fonte de verdade; o cliente nunca preencheu isto em 30
    // dias (0 callers no repo). União sem duplicata (case-insensitive), teto 8.
    const jaFeitosCliente = Array.isArray(body.alreadyDone)
      ? body.alreadyDone.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean)
      : []
    const jaFeitos: string[] = []
    {
      const vistos = new Set<string>()
      for (const t of [...memoria.jaFeitos, ...jaFeitosCliente]) {
        const chave = t.toLowerCase()
        if (vistos.has(chave)) continue
        vistos.add(chave)
        jaFeitos.push(t)
      }
    }
    const jaFeitosFinal = jaFeitos.slice(0, 8)

    // (d) Episódio N = filmes concluídos + 1, mínimo 2 (sem memória, o cartão
    // continua dizendo "Episode 2", como sempre disse).
    const episodeNumber = Math.max(2, memoria.totalConcluidos + 1)

    const idioma = body.language === 'pt' ? 'Portuguese' : body.language === 'es' ? 'Spanish' : 'English'

    // A instrução carrega a regra da casa: 150-165 palavras, que é o que dá
    // 60s+ de narração a 2,3 palavras/s — o piso do TikTok Creator Rewards.
    const sistema = `You write short-form video scripts for a knowledge/curiosity channel.
You will be given the script of an episode the creator JUST made. Write EPISODE 2:
a different story in the same subject area, same voice, same format.

HARD RULES
- Output ONLY the script, using these four markers on their own lines, in this order:
HOOK / MICRO REWARD / ESCALATION / PAYOFF
- 150 to 165 words of narration total. This is a contract: shorter fails.
- Language: ${idioma}.
- It must be a DIFFERENT story, not a rephrasing of episode 1. Same curiosity, new subject.
- Only real, verifiable facts. No invented statistics, no invented quotes, no invented
  people. If you are not certain a detail is true, leave it out. The creator will publish
  this publicly and a false claim damages them.
- The HOOK is one sentence that creates an open loop. The PAYOFF closes it.
- Plain spoken language. No "in this video", no "subscribe", no emoji, no stage directions.

Also output, on the very first line and prefixed with "TITLE: ", a 4-8 word title for
this episode. The title line is NOT part of the narration word count.`

    const usuario = `EPISODE 1 (just produced):
${anterior}

${jaFeitosFinal.length ? `ALREADY COVERED — do not repeat these:\n${jaFeitosFinal.map((t) => `- ${t.slice(0, 120)}`).join('\n')}` : ''}

Write EPISODE ${episodeNumber}.`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 700,
        messages: [
          { role: 'system', content: sistema },
          { role: 'user', content: usuario },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    })

    if (!res.ok) {
      console.error('[next-episode] openai', res.status)
      return NextResponse.json({ error: 'could not write the next episode' }, { status: 502 })
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const bruto = (json.choices?.[0]?.message?.content ?? '').trim()
    if (!bruto) return NextResponse.json({ error: 'empty' }, { status: 502 })

    // Separa o título da narração. O título é só para a UI ("Episode 2:
    // <título>"); o script que vai para o pipeline não pode carregá-lo, senão
    // a narração verbatim leria o título em voz alta.
    let titulo = ''
    let script = bruto
    const linhas = bruto.split('\n')
    if (/^\s*TITLE\s*:/i.test(linhas[0] ?? '')) {
      titulo = linhas[0].replace(/^\s*TITLE\s*:/i, '').trim().replace(/^["']|["']$/g, '')
      script = linhas.slice(1).join('\n').trim()
    }

    // Se os marcadores não vieram, o fast-path verbatim NÃO ativa e o GPT do
    // analyze-idea reescreveria a narração — exatamente o que o Contrato C1
    // proíbe. Melhor devolver erro e não mostrar o card do que entregar um
    // episódio que sai diferente do que está escrito na tela.
    if (!temMarcadores(script)) {
      console.warn('[next-episode] sem marcadores, descartado')
      return NextResponse.json({ error: 'malformed script' }, { status: 502 })
    }

    const palavras = script
      .replace(/^(HOOK|MICRO REWARD|ESCALATION|PAYOFF)\s*$/gim, '')
      .split(/\s+/)
      .filter(Boolean).length

    // `title`/`script`/`words` mantêm o formato: o cliente depende deles. Os
    // três campos novos são a instrumentação que faltava (KINEO-MEMORIA-SERIE).
    return NextResponse.json({
      title: titulo || `Episode ${episodeNumber}`,
      script,
      words: palavras,
      episodeNumber,
      hadMemory: memoria.hadMemory,
      alreadyDoneCount: jaFeitosFinal.length,
    })
  } catch (e) {
    console.error('[next-episode]', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
