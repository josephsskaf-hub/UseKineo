import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface Corpo {
  /** O tema/roteiro do filme que a pessoa ACABOU de fazer. */
  previousTopic?: string
  /** Temas que ela já fez, para o GPT não repetir. */
  alreadyDone?: string[]
  language?: string
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

    const anterior = (body.previousTopic ?? '').trim().slice(0, 4000)
    if (!anterior) return NextResponse.json({ error: 'previousTopic is required' }, { status: 400 })
    const jaFeitos = Array.isArray(body.alreadyDone)
      ? body.alreadyDone.filter((t): t is string => typeof t === 'string').slice(0, 8)
      : []

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

${jaFeitos.length ? `ALREADY COVERED — do not repeat these:\n${jaFeitos.map((t) => `- ${t.slice(0, 120)}`).join('\n')}` : ''}

Write EPISODE 2.`

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

    return NextResponse.json({ title: titulo || 'Episode 2', script, words: palavras })
  } catch (e) {
    console.error('[next-episode]', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
