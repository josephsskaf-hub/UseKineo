import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, OPENAI_SCRIPT_TIMEOUT_MS } from '@/lib/openai'
import { narrationFit, speechSeconds, MIN_COVERAGE, WORDS_PER_SECOND } from '@/lib/narrationFit'
// KINEO-P0A-MESMA-REGUA-2026-08-26 — o MESMO extrator de fala que o guard usa
// (app/api/generate-video-cinematic: `parseUserScript(prompt).narration`).
// Importar daqui é o que garante que as duas pontas nunca mais divirjam.
import { parseUserScript } from '@/lib/scriptParser'

// ═══ KINEO-COMPLETAR-ROTEIRO-2026-08-22 ════════════════════════════════════
//
// O BURACO QUE O FUNDADOR APONTOU, e ele estava certo: o conserto de hoje
// tratava os dois caminhos de forma diferente.
//
//   a IA escreve  → mede e RE-PEDE ao GPT até chegar no tamanho   ✅
//   o cliente escreve → mede e RECUSA: "adicione 24 palavras"     ❌
//
// Ou seja: para o cliente a gente reclamava em vez de resolver. E doeu em mim
// primeiro: escrevi um roteiro de 127 palavras para o teste do Kling 3, tomei
// a recusa da régua que eu mesmo acabara de subir para 95%, e tive de
// reescrever na mão. Se irrita quem fez a trava, irrita muito mais quem só
// quer o vídeo.
//
// ─── POR QUE ISTO NÃO É AUTOMÁTICO, E POR QUE ISSO IMPORTA ─────────────────
//
// O Contrato C1 diz que quando a pessoa escolhe "use meu roteiro como está",
// o GPT NUNCA escreve fala. Expandir em silêncio quebraria isso.
//
// E o risco não é teórico. Hoje de manhã eu vetei um vídeo do lote de demos
// porque o GPT, ao preencher roteiro sozinho, tinha inventado cinco
// estatísticas — incluindo "200% de chance de atingir monetização", que é
// matematicamente impossível. Quando falta texto, o modelo preenche com
// números que soam autoritários. Se isso entrar no vídeo do cliente sem
// ninguém ler, o dano é dele e da marca junto.
//
// Por isso o desenho é OFERECER + MOSTRAR: esta rota devolve o texto
// expandido e o cliente lê antes de gastar crédito. Ele autoriza (C1
// preservado) e revisa (invenção não passa despercebida).
//
// ⚠️ A ROTA NUNCA RENDERIZA E NUNCA DEBITA. Ela só escreve texto. O custo é
// uma chamada de gpt-4o (~$0.01) contra 150 créditos de um render Hollywood
// entregue com um terço de música sem história.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 45

/** Teto de expansão: mais que isto não é "completar", é reescrever. */
const MAX_GROWTH_FACTOR = 2.5

const SISTEMA = `You EXPAND an existing short-form video script so its narration fills the requested duration. You are not rewriting it — you are continuing it.

ABSOLUTE RULES — breaking any of these makes the output unusable:

1. NEVER change, reword, shorten or "improve" a single sentence the author already wrote. Every existing sentence must appear in your output EXACTLY as it was, in the same order.
2. You may ONLY ADD new sentences, placed where they fit the narrative.
3. ONLY REAL, VERIFIABLE FACTS. No invented statistics, no invented percentages, no invented quotes, no invented people, no invented dates. If you are not certain a detail is true, leave it out and add a different true detail instead.
   This is the hard one and it is why a human reads your output before it airs: a model filling space tends to produce authoritative-sounding numbers that do not exist. Percentages above 100 for a probability, "studies show", "experts say" and round-number claims with no source are all forbidden.
4. Keep the author's voice, register and language. If the script is in English, stay in English.
5. Preserve the existing section markers (HOOK, MICRO REWARD, ESCALATION, RHYTHM, PAYOFF) and the [Pexels: ...] cues exactly as written. If you add a beat that needs its own footage cue, write a new [Pexels: two to five lowercase words] line for it.
6. The PAYOFF must remain the last section and must still deliver a concrete answer.

Output ONLY the full expanded script. No preamble, no explanation, no markdown fences.`

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

    let body: { script?: string; targetSeconds?: number }
    try {
      body = (await req.json()) as { script?: string; targetSeconds?: number }
    } catch {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    }

    const original = (body.script ?? '').trim()
    const target = Number(body.targetSeconds)
    if (!original) return NextResponse.json({ error: 'script is required' }, { status: 400 })
    if (!Number.isFinite(target) || target <= 0) {
      return NextResponse.json({ error: 'targetSeconds is required' }, { status: 400 })
    }

    // ═══ KINEO-P0A-MESMA-REGUA-2026-08-26 — A CAUSA DO LOOP INFINITO ═══════
    //
    // INCIDENTE (ofirshu555, 26/08 08:31→08:32, vindo do ChatGPT): o guard
    // barrou com 38s/45s e 12 palavras faltando; o autoexpand disparou; o
    // servidor respondeu "já enche"; a pessoa aceitou; a geração seguinte
    // reprovou com EXATAMENTE os mesmos 38s e as mesmas 12 palavras. Duas
    // voltas em 32 segundos. Ela foi embora sem nenhum vídeo.
    //
    // O QUE ESTAVA ERRADO — as duas pontas mediam TEXTOS DIFERENTES com a
    // mesma régua:
    //   · o guard mede `parseUserScript(prompt).narration` — só a FALA, depois
    //     de remover HOOK/PAYOFF, blocos de metadados, [Pexels: ...], prefixos
    //     de cena e markdown;
    //   · esta rota media o texto CRU, marcadores e cabeçalhos inclusos.
    // Num roteiro estruturado o texto cru tem muito mais palavras que a fala,
    // então `antes.ok` dava TRUE e o early-return devolvia o roteiro
    // INALTERADO — sem `stillShort`, sem before/after (por isso a produção
    // registrou still_short:false com after_seconds:null). O cliente exibia o
    // mesmo texto como se fosse a expansão, a pessoa aprovava, e caía no
    // mesmo guard. Loop garantido para todo roteiro com marcadores.
    //
    // A correção é uma só: DECIDIR pela fala, exatamente como o guard. A
    // expansão continua operando sobre o roteiro inteiro (para preservar
    // marcadores e estrutura), mas o veredito usa a mesma medida do dono da
    // decisão. Hipótese "a geração recebia o roteiro original" — CONTRADITA
    // pela evidência: o roteiro devolvido ERA o original, por decisão da rota.
    const falaOriginal = parseUserScript(original).narration || original
    const antes = narrationFit(falaOriginal, target)
    // Já enche pela régua do guard: nada a fazer. Devolve o original intacto
    // e DIZ que nada mudou (expanded:false + stillShort:false explícitos), com
    // as medidas — o cliente precisa saber que não houve expansão para não
    // oferecer "Use this script" como se houvesse.
    if (antes.ok) {
      return NextResponse.json({
        script: original,
        expanded: false,
        stillShort: false,
        coverage: antes.coverage,
        before: {
          words: Math.round(antes.speech * WORDS_PER_SECOND),
          seconds: Math.round(antes.speech),
          coverage: Number(antes.coverage.toFixed(2)),
        },
        after: {
          words: Math.round(antes.speech * WORDS_PER_SECOND),
          seconds: Math.round(antes.speech),
          coverage: Number(antes.coverage.toFixed(2)),
        },
      })
    }

    // Alvo: 100% de cobertura, não o mínimo. Mirar exatamente MIN_COVERAGE
    // deixaria o resultado na borda — qualquer variação da fala real na TTS
    // reprovaria de novo, e a pessoa faria a viagem duas vezes.
    const palavrasAlvo = Math.ceil(target * WORDS_PER_SECOND)
    const palavrasAtuais = Math.round(antes.speech * WORDS_PER_SECOND)

    const usuario = `The script below is ${palavrasAtuais} spoken words, which is about ${Math.round(antes.speech)} seconds of narration. It needs to fill a ${target}-second video, so it needs roughly ${palavrasAlvo} spoken words in total.

Add about ${palavrasAlvo - palavrasAtuais} words of NEW, TRUE material that deepens this same story — more of the specific facts, the mechanism, the consequences. Do not pad with generalities, rhetorical questions or filler.

Every sentence already in this script must survive untouched.

SCRIPT:
${original}`

    const res = await openai.chat.completions.create(
      {
        model: 'gpt-4o',
        temperature: 0.5, // baixa: expandir fato pede precisão, não criatividade
        max_tokens: 900,
        messages: [
          { role: 'system', content: SISTEMA },
          { role: 'user', content: usuario },
        ],
      },
      { timeout: OPENAI_SCRIPT_TIMEOUT_MS, maxRetries: 0 },
    )

    const expandido = (res.choices[0]?.message?.content ?? '').trim()
    if (!expandido) {
      return NextResponse.json({ error: 'Could not expand the script. Please try again.' }, { status: 502 })
    }

    // ─── VERIFICAÇÕES, porque "o modelo prometeu" não é garantia ────────────
    // KINEO-P0A-MESMA-REGUA — o veredito do "depois" também é pela FALA (a
    // régua do guard). Medir o texto cru aqui aprovaria expansões que o guard
    // recusaria em seguida: era metade do loop.
    const falaExpandida = parseUserScript(expandido).narration || expandido
    const depois = narrationFit(falaExpandida, target)

    // (a) Cresceu demais = reescreveu em vez de completar.
    if (depois.speech > antes.speech * MAX_GROWTH_FACTOR) {
      console.warn('[expand-script] recusado: crescimento excessivo', {
        antes: Math.round(antes.speech), depois: Math.round(depois.speech),
      })
      return NextResponse.json(
        { error: 'The expansion changed too much of your script. Please add the extra lines yourself.' },
        { status: 422 },
      )
    }

    // (b) O TEXTO ORIGINAL SOBREVIVEU? Esta é a checagem que protege o C1.
    // Compara frase a frase, normalizado — se o modelo reescreveu qualquer
    // linha do autor, a expansão inteira é descartada. Melhor devolver o
    // problema do que devolver o roteiro dele adulterado.
    const normaliza = (t: string) =>
      t.toLowerCase().replace(/\[[^\]]*\]/g, ' ').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
    const frasesOriginais = original
      .split(/(?<=[.!?])\s+/)
      .map((f) => normaliza(f))
      .filter((f) => f.split(' ').length >= 5) // frases muito curtas dão falso negativo
    const corpoExpandido = normaliza(expandido)
    const perdidas = frasesOriginais.filter((f) => !corpoExpandido.includes(f))
    if (perdidas.length > 0) {
      console.warn(`[expand-script] recusado: ${perdidas.length} frase(s) do autor foram alteradas`)
      return NextResponse.json(
        {
          error: 'The expansion rewrote part of your script instead of adding to it. Your original was left untouched.',
          rewroteAuthor: true,
        },
        { status: 422 },
      )
    }

    // (c) Ainda curto: devolve mesmo assim, com o número, para a UI decidir.
    // Não é erro — é informação. Um roteiro que foi de 53% para 88% ajudou a
    // pessoa mesmo sem fechar a conta.
    console.log(
      `[expand-script] ${palavrasAtuais} → ${Math.round(depois.speech * WORDS_PER_SECOND)} palavras ` +
      `(cobertura ${(antes.coverage * 100).toFixed(0)}% → ${(depois.coverage * 100).toFixed(0)}%, ` +
      `mínimo ${(MIN_COVERAGE * 100).toFixed(0)}%)`,
    )

    return NextResponse.json({
      script: expandido,
      expanded: true,
      stillShort: !depois.ok,
      before: {
        words: palavrasAtuais,
        seconds: Math.round(antes.speech),
        coverage: Number(antes.coverage.toFixed(2)),
      },
      after: {
        words: Math.round(speechSeconds(falaExpandida) * WORDS_PER_SECOND), // KINEO-P0A: fala, não texto cru
        seconds: Math.round(depois.speech),
        coverage: Number(depois.coverage.toFixed(2)),
      },
    })
  } catch (e) {
    console.error('[expand-script]', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Could not expand the script right now.' }, { status: 500 })
  }
}
