// KINEO-LEGENDA-GRAFIA-DO-ROTEIRO-2026-09-28 — a legenda escreve a marca como o roteiro escreve.
//
// O defeito (10 anúncios Kineo 1 de 28/09, conta acffefe5): 12 aparições de marca erradas em 5 filmes. ADMITIY virou
// "ADMITIWE"/"ADMITIWI"/"ADMITI IN", Shivshankar virou "SHIVSHANKER", "SmartTender AI, Unnati" virou "SMART TENDER AI
// UNATI", RUIS virou "RUUS", eCredit.ng perdeu o ponto e o "NG" ficou sozinho numa legenda, "twaalf over vier" virou
// "12 OVER 4", e dois travessões "–" que ninguém fala apareceram na tela. A narração estava certa (as palavras do
// Whisper batem com o roteiro fora as marcas); só o TEXTO da legenda errava.
//
// A causa: no caminho clássico (Kineo 1, Seedance 1.5, Veo, Kling 2.5) e no Studio Ads o texto da legenda vem 100% das
// palavras que o Whisper ouviu (Push #258, para a legenda não descolar quando o narrador lê "63%" por extenso), e o
// whisper-1 transcreve de ouvido: uma não-palavra como ADMITIY nunca sai certa. O roteiro, que o TTS leu palavra por
// palavra, chega ao montador junto e só era usado no plano B (Whisper vazio).
//
// O conserto, SÓ na leitura: este módulo troca o campo `word` das palavras do Whisper pela grafia do roteiro e deixa
// start, end e sentenceEnd como o Whisper mediu. O tempo continua sendo o do áudio real (a razão do #258 segue de pé);
// o texto passa a ser o que o cliente escreveu. O cache de voz continua guardando o Whisper bruto — nada a invalidar.
//
// Como alinha:
//   1. roteiro em palavras (espaço e travessão separam; hífen não): a grafia exibida perde a pontuação das pontas (mantém '.', '-' e apóstrofo internos e os
//      símbolos que dão sentido ao número: moeda, %, #, @, &, +, °) e perde '[' e ']' (o karaokê monta rich text
//      `[color …]`); a chave de comparação é minúscula, sem acento, só letras e dígitos (\p{L}\p{N}, flag u). Palavra
//      sem chave ('—', '&' solto) sai;
//   2. maior sequência comum (LCS) entre as chaves do roteiro e as do Whisper: cada par vira ÂNCORA (grafia do roteiro,
//      tempo do Whisper);
//   3. entre duas âncoras, trecho de até 4 palavras de cada lado:
//        · mesma contagem → troca 1:1, tempos intactos;
//        · contagem diferente → as palavras do roteiro se espalham no intervalo do trecho do Whisper: se o roteiro tem
//          MENOS palavras ("eCredit.ng" × "eCredit" "ng"), cada palavra do roteiro fica com um grupo de palavras do
//          Whisper e herda o início do primeiro e o fim do último (tempos reais, nada inventado); se tem MAIS
//          ("sixty three percent" × "63%"), cada palavra do Whisper reparte o PRÓPRIO intervalo entre as suas palavras
//          do roteiro. O sentenceEnd de uma palavra do Whisper fica na última palavra que ocupa o intervalo dela;
//        · roteiro sem par no Whisper (entre âncoras, ou depois da última) NÃO é anexado: sem tempo medido, não entra;
//        · Whisper sem par no roteiro fica como está (foi falado);
//   4. token do Whisper que é só pontuação ('–') é descartado — exceto quando ele mesmo fecha ou abre frase (ver 6);
//   5. TRAVA DE SEGURANÇA — âncoras < 70% das palavras do roteiro, OU qualquer trecho sem âncora com mais de 4 palavras
//      de um dos lados → devolve as palavras do Whisper SEM MUDANÇA (o comportamento de antes);
//   6. os cortes do montador não mudam: os inícios de frase que o sentenceStartTimes de lib/compose.ts lê (e o fim da
//      primeira frase, que dá a janela do gancho) são recalculados sobre a saída; se diferirem da entrada em um
//      milésimo que seja, devolve o Whisper sem mudança. O espelho do predicado mora aqui (lib pura, sem import) e o
//      guardião scripts/test-legenda-grafia-do-roteiro-2026-09-28.mjs prova que ele é igual ao de lib/compose.ts.
//
// Quem chama: app/api/compose/route.ts (antes do buildCreatomateSource, só quando o áudio é TTS do próprio scaledScript
// — nunca avatar, nunca voz gravada pela pessoa) e app/api/compose/unlock/route.ts (export limpo pago: TTS sempre).
// O caminho hollywood (Kling 3/H3/Omni/S25) não passa por aqui.

/** O formato das palavras do Whisper (espelho estrutural de WhisperWord em lib/compose.ts — lib pura, sem import). */
export interface PalavraComTempo {
  word: string
  start: number
  end: number
  sentenceEnd?: boolean
}

/** Fração mínima das palavras do roteiro que precisa virar âncora para a troca valer. */
export const GRAFIA_ANCORAS_MINIMAS = 0.7
/** Maior trecho sem âncora (de cada lado) que ainda se troca; acima disso, nada muda. */
export const GRAFIA_TRECHO_MAXIMO = 4
/** Teto de custo do LCS (palavras do roteiro × palavras do Whisper). 90 s ≈ 300 × 300 = 90 mil. */
const GRAFIA_CELULAS_MAXIMAS = 1_000_000

export type MotivoGrafia =
  | 'aplicada'
  | 'sem_palavras'
  | 'roteiro_vazio'
  | 'grande_demais'
  | 'poucas_ancoras'
  | 'trecho_longo'
  | 'cortes_mudariam'
  | 'erro'

export interface ResultadoGrafia {
  words: PalavraComTempo[]
  aplicada: boolean
  motivo: MotivoGrafia
  palavrasDoRoteiro: number
  ancoras: number
  /** palavras exibidas cujo texto mudou (troca 1:1 com texto diferente + palavras nascidas de trecho espalhado) */
  trocadas: number
  /** trechos de contagem diferente mantidos com o texto do Whisper porque escondiam fim de frase */
  trechosMantidos: number
}

// Pontas: fica letra, dígito e o símbolo que dá sentido ao número ou à marca.
const PONTAS = /^[^\p{L}\p{N}\p{Sc}%#@&+°]+|[^\p{L}\p{N}\p{Sc}%#@&+°]+$/gu
// Espelho do teste de pontuação final de sentenceStartTimes (lib/compose.ts).
const FECHA_POR_PONTUACAO = /[.!?]["'”’)\]]?$/

/** Grafia que a legenda mostra para um token do roteiro. */
export function grafiaExibida(token: string): string {
  return String(token ?? '').replace(/[[\]]/g, '').replace(PONTAS, '')
}

/** Chave de comparação: minúscula, sem acento, só letras e dígitos (qualquer alfabeto). */
export function chaveDaPalavra(token: string): string {
  return String(token ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function terminaComPontuacao(w: PalavraComTempo | undefined): boolean {
  return FECHA_POR_PONTUACAO.test(String(w?.word ?? '').trim())
}
function fechaFrase(w: PalavraComTempo | undefined): boolean {
  return w?.sentenceEnd === true || terminaComPontuacao(w)
}

/** Espelho de sentenceStartTimes (lib/compose.ts): início da palavra cuja anterior fecha frase. */
export function iniciosDeFrase(words: PalavraComTempo[]): number[] {
  const out: number[] = []
  for (let i = 1; i < words.length; i++) {
    const t = words[i]?.start
    if (typeof t !== 'number' || !Number.isFinite(t)) continue
    if (fechaFrase(words[i - 1])) out.push(t)
  }
  return out
}

/** Espelho da janela do gancho (lib/compose.ts): fim da primeira palavra com sentenceEnd. */
function fimDaPrimeiraFrase(words: PalavraComTempo[]): number | null {
  const w = words.find((x) => x?.sentenceEnd === true)
  return w && Number.isFinite(w.end) ? w.end : null
}

function r3(v: number): number {
  return Math.round(v * 1000) / 1000
}

/** LCS por programação dinâmica sobre os sufixos; devolve os pares (índice no roteiro, índice no Whisper). */
function maiorSequenciaComum(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length
  const m = b.length
  const largura = m + 1
  const dp = new Uint32Array((n + 1) * largura)
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * largura + j] =
        a[i] === b[j] ? dp[(i + 1) * largura + j + 1] + 1 : Math.max(dp[(i + 1) * largura + j], dp[i * largura + j + 1])
    }
  }
  const pares: Array<[number, number]> = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pares.push([i, j])
      i++
      j++
    } else if (dp[(i + 1) * largura + j] >= dp[i * largura + j + 1]) {
      i++
    } else {
      j++
    }
  }
  return pares
}

/** Todas as maneiras de cortar `n` itens em sequência em `k` grupos não vazios (n, k ≤ 4 aqui). */
function particoes(n: number, k: number): number[][] {
  if (k === 1) return [[n]]
  const out: number[][] = []
  for (let primeiro = 1; primeiro <= n - (k - 1); primeiro++) {
    for (const resto of particoes(n - primeiro, k - 1)) out.push([primeiro, ...resto])
  }
  return out
}

function semelhanca(a: string, b: string): number {
  if (a === b) return 100
  let prefixo = 0
  while (prefixo < a.length && prefixo < b.length && a[prefixo] === b[prefixo]) prefixo++
  return prefixo - Math.abs(a.length - b.length)
}

/** A melhor partição de `itens` em pedaços, um por chave de `alvo`; `vale` recusa partições proibidas ([] = nenhuma). */
function melhorParticao(itens: string[], alvo: string[], vale: (tamanhos: number[]) => boolean = () => true): number[] {
  let melhor: number[] = []
  let melhorNota = -Infinity
  for (const tamanhos of particoes(itens.length, alvo.length)) {
    if (!vale(tamanhos)) continue
    let nota = 0
    let p = 0
    tamanhos.forEach((t, g) => {
      nota += semelhanca(itens.slice(p, p + t).join(''), alvo[g])
      p += t
    })
    if (nota > melhorNota) {
      melhorNota = nota
      melhor = tamanhos
    }
  }
  return melhor
}

/**
 * O alinhamento completo, com o diagnóstico. `words` são as palavras do Whisper sobre o áudio; `roteiro` é o texto
 * que o TTS leu para gerar ESSE áudio (o scaledScript do compose). Nunca lança; na dúvida devolve `words` intacto.
 */
export function alinharGrafiaDoRoteiro(words: PalavraComTempo[], roteiro: string): ResultadoGrafia {
  // Travessão (– —) separa palavra na fala como o espaço ("results—fast" são duas); o hífen (-) fica ("follow-up").
  const tokens = String(roteiro ?? '')
    .split(/[\s–—]+/)
    .map((t) => {
      const exibida = grafiaExibida(t)
      return { exibida, chave: chaveDaPalavra(exibida) }
    })
    .filter((t) => t.chave !== '')
  let ancoras = 0
  const sem = (motivo: MotivoGrafia): ResultadoGrafia => ({
    words,
    aplicada: false,
    motivo,
    palavrasDoRoteiro: tokens.length,
    ancoras,
    trocadas: 0,
    trechosMantidos: 0,
  })
  try {
    if (!Array.isArray(words) || words.length === 0) return sem('sem_palavras')
    if (tokens.length === 0) return sem('roteiro_vazio')

    const chaves = words.map((w) => chaveDaPalavra(String(w?.word ?? '')))
    const falados = chaves.map((c, i) => ({ i, chave: c })).filter((x) => x.chave !== '')
    if (falados.length === 0) return sem('sem_palavras')
    if (tokens.length * falados.length > GRAFIA_CELULAS_MAXIMAS) return sem('grande_demais')

    const pares = maiorSequenciaComum(
      tokens.map((t) => t.chave),
      falados.map((f) => f.chave),
    )
    ancoras = pares.length
    // TRAVA 1 — pouca âncora = o roteiro não é o que foi falado; não se mexe em nada.
    if (pares.length < GRAFIA_ANCORAS_MINIMAS * tokens.length) return sem('poucas_ancoras')

    // Trechos sem âncora: [r0, r1) no roteiro × [f0, f1) nas palavras faladas (índices de `falados`).
    const trechos: Array<{ r0: number; r1: number; f0: number; f1: number }> = []
    let pr = 0
    let pf = 0
    for (const [ri, fi] of pares) {
      trechos.push({ r0: pr, r1: ri, f0: pf, f1: fi })
      pr = ri + 1
      pf = fi + 1
    }
    trechos.push({ r0: pr, r1: tokens.length, f0: pf, f1: falados.length })
    // TRAVA 2 — trecho longo sem âncora = alinhamento incerto; não se mexe em nada.
    if (trechos.some((t) => Math.max(t.r1 - t.r0, t.f1 - t.f0) > GRAFIA_TRECHO_MAXIMO)) return sem('trecho_longo')

    // saida[i] = o que entra no lugar da palavra i do Whisper (undefined = ela mesma, [] = sai).
    const saida: Array<PalavraComTempo[] | undefined> = new Array(words.length)
    // Pontuação solta do Whisper ('–'): sai da tela, a menos que feche frase ou comece uma (aí o corte dependeria dela).
    const descartavel = (i: number): boolean => {
      const w = words[i]
      return w.sentenceEnd !== true && !terminaComPontuacao(w) && !(i > 0 && fechaFrase(words[i - 1]))
    }
    let trocadas = 0
    let trechosMantidos = 0
    const troca = (i: number, exibida: string): void => {
      const w = words[i]
      // Palavra do Whisper com pontuação final conta como fim de frase no montador; a grafia exibida nunca termina em
      // pontuação — então ela fica como está, e o corte não se mexe.
      if (terminaComPontuacao(w) || exibida === w.word) return
      saida[i] = [{ ...w, word: exibida }]
      trocadas++
    }

    for (const [ri, fi] of pares) troca(falados[fi].i, tokens[ri].exibida)

    for (const t of trechos) {
      const nr = t.r1 - t.r0
      const nf = t.f1 - t.f0
      if (nr === 0 || nf === 0) continue // Whisper sem par fica; roteiro sem tempo não entra
      if (nr === nf) {
        for (let k = 0; k < nr; k++) troca(falados[t.f0 + k].i, tokens[t.r0 + k].exibida)
        continue
      }
      const idx = falados.slice(t.f0, t.f1).map((f) => f.i)
      const primeiro = idx[0]
      const ultimo = idx[idx.length - 1]
      const escritas = tokens.slice(t.r0, t.r1)
      const ditas = idx.map((i) => words[i])
      const tempoRuim = ditas.some((w) => !Number.isFinite(w.start) || !Number.isFinite(w.end) || w.end < w.start)
      // Pontuação sem chave presa no meio do trecho e que não pode sair (fecha/abre frase) → mantém o trecho.
      let presa = false
      for (let i = primeiro + 1; i < ultimo; i++) if (chaves[i] === '' && !descartavel(i)) presa = true
      if (tempoRuim || presa || ditas.some((w) => terminaComPontuacao(w))) {
        trechosMantidos++
        continue
      }
      const novas: PalavraComTempo[] = []
      if (nr < nf) {
        // Menos palavras escritas: cada uma fica com um grupo de palavras ditas (tempos reais das pontas do grupo).
        // Partição que enterra um fim de frase no MEIO de um grupo é proibida (o corte seguinte sumiria).
        const tamanhos = melhorParticao(
          ditas.map((w) => chaveDaPalavra(w.word)),
          escritas.map((e) => e.chave),
          (tams) => {
            let q = 0
            return tams.every((tam) => {
              const enterra = ditas.slice(q, q + tam - 1).some((w) => w.sentenceEnd === true)
              q += tam
              return !enterra
            })
          },
        )
        if (tamanhos.length === 0) {
          trechosMantidos++
          continue
        }
        let p = 0
        tamanhos.forEach((tam, g) => {
          const grupo = ditas.slice(p, p + tam)
          const fim = grupo[grupo.length - 1]
          novas.push({
            word: escritas[g].exibida,
            start: grupo[0].start,
            end: fim.end,
            ...(fim.sentenceEnd === true ? { sentenceEnd: true } : {}),
          })
          p += tam
        })
      } else {
        // Mais palavras escritas: cada palavra dita reparte o PRÓPRIO intervalo entre as suas palavras escritas.
        const tamanhos = melhorParticao(
          escritas.map((e) => e.chave),
          ditas.map((w) => chaveDaPalavra(w.word)),
        )
        let p = 0
        tamanhos.forEach((tam, g) => {
          const w = ditas[g]
          const passo = (w.end - w.start) / tam
          for (let k = 0; k < tam; k++) {
            const ultimaDoGrupo = k === tam - 1
            novas.push({
              word: escritas[p + k].exibida,
              start: k === 0 ? w.start : r3(w.start + k * passo),
              end: ultimaDoGrupo ? w.end : r3(w.start + (k + 1) * passo),
              ...(ultimaDoGrupo && w.sentenceEnd === true ? { sentenceEnd: true } : {}),
            })
          }
          p += tam
        })
      }
      saida[primeiro] = novas
      for (const i of idx.slice(1)) saida[i] = []
      trocadas += novas.length
    }

    for (let i = 0; i < words.length; i++) {
      if (chaves[i] === '' && saida[i] === undefined && descartavel(i)) {
        saida[i] = []
        trocadas++
      }
    }

    const out: PalavraComTempo[] = []
    for (let i = 0; i < words.length; i++) {
      const s = saida[i]
      if (s === undefined) out.push(words[i])
      else out.push(...s)
    }

    // TRAVA 3 — os cortes do montador e a janela do gancho têm de sair idênticos.
    const antes = iniciosDeFrase(words)
    const depois = iniciosDeFrase(out)
    const mesmosCortes = antes.length === depois.length && antes.every((t, k) => t === depois[k])
    if (out.length === 0 || !mesmosCortes || fimDaPrimeiraFrase(words) !== fimDaPrimeiraFrase(out)) {
      return sem('cortes_mudariam')
    }

    return {
      words: out,
      aplicada: true,
      motivo: 'aplicada',
      palavrasDoRoteiro: tokens.length,
      ancoras,
      trocadas,
      trechosMantidos,
    }
  } catch {
    return sem('erro')
  }
}

/** A troca pedida: as palavras do Whisper com a grafia do roteiro (ou intactas, quando a trava manda). */
export function grafiaDoRoteiro(words: PalavraComTempo[], roteiro: string): PalavraComTempo[] {
  return alinharGrafiaDoRoteiro(words, roteiro).words
}
