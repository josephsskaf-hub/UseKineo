import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, OPENAI_SCRIPT_TIMEOUT_MS } from '@/lib/openai'
import { narrationFit, speechSeconds, MIN_COVERAGE, WORDS_PER_SECOND } from '@/lib/narrationFit'
// KINEO-P0A-MESMA-REGUA-2026-08-26 — o MESMO extrator de fala que o guard usa
// (app/api/generate-video-cinematic: `parseUserScript(prompt).narration`).
// Importar daqui é o que garante que as duas pontas nunca mais divirjam.
import { parseUserScript } from '@/lib/scriptParser'
// KINEO-350-POLITICA — as regras puras (teto, preflight, preservação do autor,
// duração sugerida) moram em lib/expandPolicy para serem testáveis de verdade.
import {
  MAX_GROWTH_FACTOR,
  authorPreserved,
  largestFittingDuration,
  lostDirectives,
  lostMarkers,
  maximumFittingDuration,
  restoreDirectives,
  missingWords,
  needsAuthoring,
  requiredGrowth,
  resolveGrowthBase,
  withinGrowthLimit,
  type ExpandOutcome,
  maxCandidateWords,
} from '@/lib/expandPolicy'

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

// O teto de expansão (MAX_GROWTH_FACTOR) mudou de casa no #350: agora vive em
// lib/expandPolicy, onde o preflight e os testes o leem da MESMA fonte.

const SISTEMA = `You EXPAND an existing short-form video script so its narration fills the requested duration. You are not rewriting it — you are continuing it.

ABSOLUTE RULES — breaking any of these makes the output unusable:

1. NEVER change, reword, shorten or "improve" a single sentence the author already wrote. Every existing sentence must appear in your output EXACTLY as it was, in the same order.
2. You may ONLY ADD new sentences, placed where they fit the narrative.
3. ONLY REAL, VERIFIABLE FACTS. No invented statistics, no invented percentages, no invented quotes, no invented people, no invented dates. If you are not certain a detail is true, leave it out and add a different true detail instead.
   This is the hard one and it is why a human reads your output before it airs: a model filling space tends to produce authoritative-sounding numbers that do not exist. Percentages above 100 for a probability, "studies show", "experts say" and round-number claims with no source are all forbidden.
4. Keep the author's voice, register and language. If the script is in English, stay in English.
5. Preserve the existing section markers (HOOK, MICRO REWARD, ESCALATION, RHYTHM, PAYOFF) and the [Pexels: ...] cues exactly as written. If you add a beat that needs its own footage cue, write a new [Pexels: two to five lowercase words] line for it.
6. The PAYOFF must remain the last section and must still deliver a concrete answer.
7. There is a HARD MAXIMUM number of spoken words, given in the request. Going over it makes your output unusable and it is thrown away — the author gets nothing. Land at or under that maximum. If the extra true material you have would push you over, add less of it.

Output ONLY the full expanded script. No preamble, no explanation, no markdown fences.`

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

    let body: { script?: string; targetSeconds?: number; baseScript?: string }
    try {
      body = (await req.json()) as { script?: string; targetSeconds?: number; baseScript?: string }
    } catch {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    }

    const original = (body.script ?? '').trim()
    const target = Number(body.targetSeconds)
    if (!original) return NextResponse.json({ error: 'script is required' }, { status: 400 })
    if (!Number.isFinite(target) || target <= 0) {
      return NextResponse.json({ error: 'targetSeconds is required' }, { status: 400 })
    }

    // KINEO-350-BASE-IMUTAVEL — a BASE do teto de crescimento é sempre o texto
    // que a PESSOA escreveu, nunca o que a IA já produziu. Sem isto, a 2ª
    // rodada mediria 2,5× em cima de um texto que já era 2,5× o original:
    // crescimento composto de 6,25× pela porta dos fundos, que é exatamente o
    // "a IA escreveu o roteiro inteiro" que o teto existe para impedir.
    const base = (body.baseScript ?? '').trim() || original

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
    const medida = (s: number, alvo: number) => ({
      words: Math.round(s * WORDS_PER_SECOND),
      seconds: Math.round(s),
      coverage: Number((s / alvo).toFixed(2)),
    })
    // Já enche pela régua do guard: nada a fazer. Devolve o original intacto
    // e DIZ que nada mudou (expanded:false + stillShort:false explícitos), com
    // as medidas — o cliente precisa saber que não houve expansão para não
    // oferecer "Use this script" como se houvesse.
    if (antes.ok) {
      return NextResponse.json({
        outcome: 'already_fits' as ExpandOutcome,
        script: original,
        expanded: false,
        stillShort: false,
        coverage: antes.coverage,
        before: medida(antes.speech, target),
        after: medida(antes.speech, target),
      })
    }

    // ═══ KINEO-350-PREFLIGHT-IDEIA-vs-ROTEIRO (D1) ════════════════════════
    //
    // 19joschaschuetz96, 25/08 20:41 e 20:44: fala de 7s e depois de 2s para um
    // vídeo de 60s. O mínimo é 57s de fala. Nenhuma expansão dentro do teto de
    // 2,5× chega lá — 2 × 2,5 = 5. Ele levava 422 e tentava de novo, para sempre.
    //
    // A resposta certa NÃO é afrouxar o teto: 2s virando 60s significa a IA
    // escrevendo 96% do roteiro sem ninguém pedir, e o fundador vetou isso em
    // 26/08. A resposta certa é reconhecer que ISTO NÃO É UM ROTEIRO CURTO, é
    // uma IDEIA — e ideia se ESCREVE, com clique e preview, pelo caminho que já
    // existe (/api/generate-script).
    //
    // Então: descobrimos ANTES de gastar a chamada, ANTES de gastar a espera e
    // ANTES de gastar uma rodada. E devolvemos 200: isto é um resultado
    // ESPERADO do domínio, não uma falha do servidor. 4xx/5xx ficam reservados
    // para autenticação, limite e indisponibilidade de verdade.
    if (needsAuthoring(antes.speech, target)) {
      const maxCabivel = maximumFittingDuration(antes.speech)
      console.log(
        `[expand-script] needs_authoring: fala ${antes.speech.toFixed(1)}s para alvo ${target}s ` +
        `(precisaria crescer ${requiredGrowth(antes.speech, target).toFixed(1)}x, teto ${MAX_GROWTH_FACTOR}x)`,
      )
      return NextResponse.json({
        outcome: 'needs_authoring' as ExpandOutcome,
        script: original,
        expanded: false,
        stillShort: true,
        coverage: antes.coverage,
        before: medida(antes.speech, target),
        after: medida(antes.speech, target),
        targetSeconds: target,
        missingWords: missingWords(antes.speech, target),
        requiredGrowth: Number(requiredGrowth(antes.speech, target).toFixed(2)),
        maxGrowthFactor: MAX_GROWTH_FACTOR,
        maximumFittingSeconds: Number(maxCabivel.toFixed(1)),
        // Duração VÁLIDA do seletor, ou null. Nunca um número que a tela não
        // consegue selecionar — botão falso é pior que botão ausente.
        suggestedDuration: largestFittingDuration(antes.speech),
      })
    }

    // Alvo: 100% de cobertura, não o mínimo. Mirar exatamente MIN_COVERAGE
    // deixaria o resultado na borda — qualquer variação da fala real na TTS
    // reprovaria de novo, e a pessoa faria a viagem duas vezes.
    const palavrasAlvo = Math.ceil(target * WORDS_PER_SECOND)
    const palavrasAtuais = Math.round(antes.speech * WORDS_PER_SECOND)

    // ═══ KINEO-TETO-NO-PROMPT-2026-09-01 (sprint v1-v4 #37) ════════════════
    //
    // A base do teto era resolvida DEPOIS da chamada, só para julgar. Agora ela
    // é resolvida ANTES, para que o pedido possa CARREGAR o teto — é o mesmo
    // cálculo, com as mesmas entradas, movido de lugar. O veredito lá embaixo
    // reusa exatamente estas constantes: teto contado duas vezes seria a mesma
    // doença das duas réguas do #349.
    const falaBase = parseUserScript(base).narration || base
    const baseResolvida = resolveGrowthBase(speechSeconds(falaBase), antes.speech)
    const speechBase = baseResolvida.speech
    if (baseResolvida.repaired) {
      console.warn('[expand-script] base de crescimento reparada (nao era ancestral)', {
        recebida: Math.round(speechSeconds(falaBase)), usada: Math.round(speechBase),
      })
    }
    const palavrasTeto = maxCandidateWords(speechBase)

    // O alvo NUNCA pode ser maior que o teto — pedir 104 palavras e recusar
    // acima de 100 é mandar a pessoa numa viagem que já está reprovada. O
    // preflight `needsAuthoring` garante base × 2,5 ≥ alvo × 0,95, então a
    // faixa de choque é estreita (até 5%), mas existe: aqui ela morre.
    const palavrasPedido = Math.min(palavrasAlvo, palavrasTeto)
    const palavrasAdicionar = Math.max(0, palavrasPedido - palavrasAtuais)

    const usuario = `The script below is ${palavrasAtuais} spoken words, which is about ${Math.round(antes.speech)} seconds of narration. It needs to fill a ${target}-second video, so it needs roughly ${palavrasPedido} spoken words in total.

Add about ${palavrasAdicionar} words of NEW, TRUE material that deepens this same story — more of the specific facts, the mechanism, the consequences. Do not pad with generalities, rhetorical questions or filler.

HARD MAXIMUM: ${palavrasTeto} spoken words in the whole script. This is a limit, not a target — aim for ${palavrasPedido}, never go past ${palavrasTeto}. Output longer than ${palavrasTeto} spoken words is discarded and the author is left with nothing.

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

    let expandido = (res.choices[0]?.message?.content ?? '').trim()
    if (!expandido) {
      return NextResponse.json(
        { outcome: 'transient_failure' as ExpandOutcome, error: 'Could not expand the script. Please try again.' },
        { status: 502 },
      )
    }

    // KINEO-350-DIRETIVAS (D3, segunda metade) — `Voice:`, `Music:`, `Format:`
    // são recado de produção do PRÓPRIO autor. Se o modelo os engoliu, a gente
    // devolve as linhas DELE de volta — não inventa substitutas e não reprova a
    // expansão por isso, porque não é fala e o Contrato C1 protege a fala.
    //
    // KINEO-351 — a volta agora é NA POSIÇÃO ORIGINAL. O #350 empilhava tudo no
    // fim do arquivo, o que para uma diretiva é feio e para um marcador seria
    // destruir a estrutura fingindo consertar.
    const diretivasPerdidas = lostDirectives(original, expandido)
    expandido = restoreDirectives(original, expandido)

    // KINEO-351 — MARCADOR ESTRUTURAL PERDIDO NÃO SE REMENDA. Se o modelo comeu
    // o HOOK ou o PAYOFF, o roteiro que ele devolveu não é o roteiro da pessoa:
    // reinserir o cabeçalho no fim faria o texto MENTIR sobre a própria forma.
    // Melhor devolver o problema com alternativas do que entregar isso.
    const marcadoresPerdidos = lostMarkers(original, expandido)
    if (marcadoresPerdidos.length > 0) {
      console.warn('[expand-script] recusado: estrutura perdida', marcadoresPerdidos)
      return NextResponse.json(
        {
          outcome: 'structure_lost' as ExpandOutcome,
          error: 'The writer dropped part of your script structure. Your original was left untouched.',
          lostMarkers: marcadoresPerdidos,
          before: medida(antes.speech, target),
          suggestedDuration: largestFittingDuration(antes.speech),
        },
        { status: 422 },
      )
    }

    // ─── VERIFICAÇÕES, porque "o modelo prometeu" não é garantia ────────────
    // KINEO-P0A-MESMA-REGUA — o veredito do "depois" também é pela FALA (a
    // régua do guard). Medir o texto cru aqui aprovaria expansões que o guard
    // recusaria em seguida: era metade do loop.
    const falaExpandida = parseUserScript(expandido).narration || expandido
    const depois = narrationFit(falaExpandida, target)

    // (a) Cresceu demais = reescreveu em vez de completar.
    // KINEO-350 — o teto agora é medido contra a BASE IMUTÁVEL do autor, não
    // contra o texto da rodada anterior (que já pode ser obra da IA).
    // KINEO-BASE-DE-CRESCIMENTO-2026-08-31 (#9) — base que nao e ancestral do
    // roteiro de entrada e base errada: o teto seria menor que o proprio
    // texto que a pessoa mandou completar, e o growth_limit sairia SEMPRE.
    // #37: `speechBase`/`palavrasTeto` ja foram resolvidos ANTES da chamada,
    // para que o pedido carregasse o mesmo teto que esta linha cobra.
    if (!withinGrowthLimit(speechBase, depois.speech)) {
      console.warn('[expand-script] recusado: crescimento excessivo sobre a base', {
        base: Math.round(speechBase), depois: Math.round(depois.speech), teto: MAX_GROWTH_FACTOR,
      })
      return NextResponse.json(
        {
          outcome: 'growth_limit' as ExpandOutcome,
          error: 'The expansion changed too much of your script. Please add the extra lines yourself.',
          before: medida(antes.speech, target),
          after: medida(depois.speech, target),
          baseSeconds: Math.round(speechBase),
          baseRepaired: baseResolvida.repaired,
          // #37 — o juiz desta rodada: o teto agora vai NO PEDIDO, entao a
          // distancia entre `maxWords` e `candidateWords` diz se o modelo
          // obedeceu. Estouro pequeno = ajustar a frase; estouro grande = o
          // modelo ignora o limite e a resposta e outra.
          maxWords: palavrasTeto,
          candidateWords: Math.round(depois.speech * WORDS_PER_SECOND),
          suggestedDuration: largestFittingDuration(antes.speech),
          // ═══ sprint-v1v4 #30 — O TEXTO DESCARTADO VOLTA COMO OFERTA ═══
          //
          // MEDIDO: 13 pessoas bateram na parede de narracao em 14 dias e
          // TODAS as 13 tinham ZERO video antes dela. 5 nunca fizeram video
          // nenhum. O caso souzadelima135 (01/09 14:21, vindo do chatgpt.com,
          // roteiro colado de 21s pedindo 35s) mostra o beco inteiro em 5
          // segundos de eventos: o expansor disparou sozinho, o modelo
          // escreveu texto QUE ENCHE o alvo, e nos JOGAMOS FORA por estourar
          // o teto de 2,5x. Sobrou na tela uma frase ("we kept yours") e
          // nenhum botao: 21s de fala nao cabe em 35/60/90, entao
          // largestFittingDuration devolve null e o botao de duracao menor
          // nem aparece. Ela foi embora com 0 videos.
          //
          // O teto de 2,5x NAO muda e o C1 NAO afrouxa: nada disto vira
          // video sozinho. O que muda e que o candidato para de ser
          // destruido em silencio e volta ROTULADO como o que ele e — um
          // roteiro NOVO, nao o dela terminado — para ela LER e decidir.
          // E exatamente o padrao ja sancionado nesta tela ("Read it before
          // we render"): olhos humanos antes do render.
          candidate: expandido,
          candidateSeconds: Math.round(depois.speech),
          candidateFits: depois.ok,
        },
        { status: 422 },
      )
    }

    // (b) O TEXTO ORIGINAL SOBREVIVEU? Esta é a checagem que protege o C1.
    //
    // KINEO-350-MESMA-REGUA-NA-CHECAGEM-IRMA (D3) — antes ela fatiava o texto
    // CRU e exigia que bullets e `Voice:`/`Format:` voltassem palavra por
    // palavra. O modelo reformata linha de produção o tempo todo, então
    // roteiro vindo do ChatGPT era reprovado por engano: 3 de 3 no canário de
    // hoje. É o MESMO erro de duas réguas do #349, cometido no vizinho.
    //
    // Agora compara FALA com FALA, na ordem, com normalização à prova de
    // Unicode e SEM o filtro de "≥ 5 palavras" — que deixava "Ninguém
    // acreditou." sair sem verificação nenhuma.
    const preservado = authorPreserved(falaOriginal, falaExpandida)
    if (!preservado.ok) {
      console.warn(`[expand-script] recusado: ${preservado.missing.length} frase(s) do autor foram alteradas`)
      return NextResponse.json(
        {
          outcome: 'author_rewrite_rejected' as ExpandOutcome,
          error: 'The expansion rewrote part of your script instead of adding to it. Your original was left untouched.',
          rewroteAuthor: true,
          before: medida(antes.speech, target),
          suggestedDuration: largestFittingDuration(antes.speech),
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
      outcome: (depois.ok ? 'expanded_ready' : 'still_short') as ExpandOutcome,
      script: expandido,
      expanded: true,
      stillShort: !depois.ok,
      restoredDirectives: diretivasPerdidas.length,
      // #9 — tripwire: depois do conserto do cliente isto tem de ser sempre
      // false. true em producao = alguem voltou a mandar base nao-ancestral.
      baseRepaired: baseResolvida.repaired,
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
      // Sempre presente: se a expansão parar curta, a tela precisa saber se
      // existe uma duração honesta para oferecer — ou se não existe nenhuma.
      suggestedDuration: largestFittingDuration(depois.speech),
    })
  } catch (e) {
    console.error('[expand-script]', e instanceof Error ? e.message : String(e))
    // Erro de infraestrutura é transitório por definição: a tela deve oferecer
    // "tentar de novo" e NÃO deve queimar uma das duas rodadas da pessoa.
    return NextResponse.json(
      { outcome: 'transient_failure' as ExpandOutcome, error: 'Could not expand the script right now.' },
      { status: 500 },
    )
  }
}
