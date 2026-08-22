import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, OPENAI_SCRIPT_TIMEOUT_MS } from '@/lib/openai'
import { narrationFit, speechSeconds, MIN_COVERAGE, WORDS_PER_SECOND } from '@/lib/narrationFit'

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

    const antes = narrationFit(original, target)
    // Já enche: devolve o original intacto. Expandir aqui só adicionaria
    // texto que ninguém pediu e aumentaria a chance de invenção à toa.
    if (antes.ok) {
      return NextResponse.json({ script: original, expanded: false, coverage: antes.coverage })
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
    const depois = narrationFit(expandido, target)

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
        words: Math.round(speechSeconds(expandido) * WORDS_PER_SECOND),
        seconds: Math.round(depois.speech),
        coverage: Number(depois.coverage.toFixed(2)),
      },
    })
  } catch (e) {
    console.error('[expand-script]', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Could not expand the script right now.' }, { status: 500 })
  }
}
