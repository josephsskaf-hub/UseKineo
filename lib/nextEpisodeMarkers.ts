// ═══ KINEO-EPISODIO2-MARCADORES-2026-09-05 ══════════════════════════════════
//
// O NÚMERO QUE MANDOU CONSTRUIR ISTO (medido em 05/09, contas externas):
//   16 chamadas a /api/next-episode em um dia → 12 voltaram 502. Log da
//   Vercel, 10 de 14: "[next-episode] sem marcadores, descartado". Sonda
//   local com o MESMO prompt, modelo e temperatura: 0 de 8 respostas trazem
//   os quatro marcadores. O modelo recebe o episódio 1 em PROSA (é a
//   narração real do filme, sem rótulos) e imita a prosa — a regra "use
//   these four markers" perde para o exemplo. Resultado: 9 em 10 pessoas
//   chegaram na tela de filme pronto e o cartão "Episode 2" simplesmente
//   NÃO APARECEU. A porta do segundo filme — o degrau 1→2 que decide quem
//   paga — estava fechada para quase todo mundo, sem erro na tela.
//
// A RESPOSTA: o servidor deixa de DESCARTAR e passa a ROTULAR. Os marcadores
// são só andaime para o fast-path verbatim (parseViralScriptSections); o que
// importa para o Contrato C1 é que as PALAVRAS da narração não mudem. Então:
//   1. `normalizarMarcadores` aceita as variações que o modelo usa
//      ("**HOOK**", "Hook:", "MICRO-REWARD", "HOOK: primeira frase…") e as
//      devolve no esqueleto canônico;
//   2. `rotularProsa` divide a prosa por FRASES em 4 blocos determinísticos
//      (gancho = 1ª frase, payoff = última, meio dividido ao meio) e insere
//      apenas os rótulos — a narração sai idêntica, palavra por palavra;
//   3. só quando nem isso é possível (menos de 4 frases) a rota devolve o 502
//      de antes.
// Nada aqui reescreve fala. Nada aqui chama IA.

export const MARCADORES = ['HOOK', 'MICRO REWARD', 'ESCALATION', 'PAYOFF'] as const
export type MarcadoresVia = 'model' | 'normalized' | 'auto_split'

// Rótulo numa linha própria, com as decorações que o modelo costuma pôr:
// "**HOOK**", "## HOOK", "— HOOK —", "Hook:", "[HOOK]", "MICRO-REWARD:".
const LINHA_ROTULO =
  /^\s*[#*\-–—\[\(]*\s*(HOOK|MICRO[\s\-_]?REWARD|ESCALATION|PAYOFF)\s*[\]\)]*\s*[:.\-–—]?\s*[*]*\s*$/i
// Rótulo INLINE no começo da frase: "HOOK: In 1833, …" / "**Payoff:** The…".
const ROTULO_INLINE =
  /^\s*[#*\-–—\[\(]*\s*(HOOK|MICRO[\s\-_]?REWARD|ESCALATION|PAYOFF)\s*[\]\)]*\s*[*]*\s*[:\-–—]\s*[*]*\s*(?=\S)/i

function canonico(rotulo: string): (typeof MARCADORES)[number] {
  const r = rotulo.toUpperCase().replace(/[\s\-_]+/g, ' ')
  if (r.startsWith('MICRO')) return 'MICRO REWARD'
  if (r === 'HOOK' || r === 'ESCALATION' || r === 'PAYOFF') return r
  return 'HOOK'
}

/** Os quatro rótulos existem como LINHA própria (não só como substring)? */
export function temMarcadores(texto: string): boolean {
  const vistos = new Set<string>()
  for (const linha of texto.split(/\r?\n/)) {
    const m = linha.match(LINHA_ROTULO)
    if (m) vistos.add(canonico(m[1]))
  }
  return MARCADORES.every((m) => vistos.has(m))
}

// KINEO-MARCADOR-DA-CASA-2026-09-05
//
// O DEFEITO: a home escreve o roteiro da pessoa de graca (/api/demo-script),
// ela LE, aprova e clica. app/HomeTopicForm.tsx:buildActivationPrompt entrega
// esse roteiro ao /signup no formato de marcadores da PROPRIA CASA:
//   "HOOK: ..." / "MICRO REWARD 1: ..." / "ESCALATION: ..." / "PAYOFF: ..."
// Ai looksLikeInstruction (lib/momentumTopic.ts) olha a primeira linha, ve
// "HOOK:" bater no seu LABEL_LINE (escrito para pegar "STYLE:", "MAIN
// CHARACTER:" de colagem de chatbot) e decide que o texto e INSTRUCAO. O
// auto-start nao dispara, e a pessoa ainda leva na tela um aviso dizendo
// "Your ChatGPT script is still here" — para um roteiro que a NOSSA home
// escreveu e que ela nunca colou de lugar nenhum.
//
// MEDIDO (05/09, campanha push69_home_one_click_starters, historico completo):
//    36 pessoas PULADAS por este motivo — 21 fizeram filme (58%), 6 fizeram 2 (17%)
//   292 pessoas com auto-start DISPARADO — 202 fizeram filme (69%), 66 dois (23%)
// Pos-marco (03/09 16:00 UTC, 44h): 10 pessoas, TODAS de source=homepage,
// prompt_length 338-431 — a assinatura exata do handoff da home. Das 8 contas
// TAAFT sem nenhum filme no periodo, 7 pararam aqui.
//
// A REGRA: um texto cuja PRIMEIRA linha ja e um marcador da casa e que traz TRES
// marcadores distintos nao e colagem de chatbot — e o formato que o proprio
// fast-path verbatim (parseViralScriptSections) foi feito para ler. Reconhecer e
// LISTA BRANCA, nao afrouxamento: nada que hoje e recusado por rotulo estranho,
// markdown ou frase de regra passa a ser aceito. Exigir TRES distintos (e nao um
// "HOOK:" solto) e o que impede uma colagem que por acaso abre com rotulo de
// virar render automatico.
const MIN_MARCADORES_DISTINTOS = 3

/**
 * O texto esta escrito no formato de secoes da casa (HOOK / MICRO REWARD /
 * ESCALATION / PAYOFF), com rotulo INLINE ou em linha propria?
 *
 * Diferente de `temMarcadores`, que exige os QUATRO em linha propria porque
 * governa o esqueleto que a rota de episodio devolve. Aqui o dono e outro: o
 * porteiro do auto-start, que precisa responder "isto e roteiro nosso?" — e o
 * handoff da home manda rotulo inline ("HOOK: In 1833, ...").
 */
export function pareceRoteiroDaCasa(bruto: string | null | undefined): boolean {
  if (typeof bruto !== 'string') return false
  const linhas = bruto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (linhas.length === 0) return false
  // A PRIMEIRA linha com conteudo tem de ser um marcador. Roteiro nosso nunca
  // comeca com prosa solta, e exigir isso mantem de fora a colagem que enterra
  // um "PAYOFF:" no meio de tres paragrafos de conversa com o chatbot.
  if (!LINHA_ROTULO.test(linhas[0]) && !ROTULO_INLINE.test(linhas[0])) return false
  const vistos = new Set<string>()
  for (const linha of linhas) {
    const m = linha.match(LINHA_ROTULO) ?? linha.match(ROTULO_INLINE)
    if (m) vistos.add(canonico(m[1]))
  }
  return vistos.size >= MIN_MARCADORES_DISTINTOS
}

/** Palavras faladas, ignorando linhas que são só rótulo. Serve para provar
 *  que rotular não mudou a narração. */
export function palavrasFaladas(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .filter((l) => !LINHA_ROTULO.test(l))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
}

/** Converte as variações de rótulo para o esqueleto canônico. Não mexe em
 *  nenhuma outra linha. */
export function normalizarMarcadores(texto: string): string {
  // Rótulo no MEIO da linha ("… fell? MICRO REWARD: It did …"): só com dois-
  // pontos, para nunca confundir "the hook of the story" com marcador.
  // Só no começo da linha ou logo depois de fim de frase — "here is the hook:"
  // no meio de uma oração não é rótulo.
  const quebrado = texto.replace(
    /(^|[.!?…]["'”’)\]]?\s+)\s*[*#]*\s*(HOOK|MICRO[\s\-_]?REWARD|ESCALATION|PAYOFF)\b\s*[*#]*\s*:\s*/gim,
    (_m, antes: string, r: string) => `${antes.trimEnd()}\n${canonico(r)}\n`,
  )
  const saida: string[] = []
  for (const linha of quebrado.split(/\r?\n/)) {
    const soRotulo = linha.match(LINHA_ROTULO)
    if (soRotulo) {
      saida.push(canonico(soRotulo[1]))
      continue
    }
    const inline = linha.match(ROTULO_INLINE)
    if (inline) {
      saida.push(canonico(inline[1]))
      saida.push(linha.slice(inline[0].length).replace(/[*]+$/,'').trim())
      continue
    }
    saida.push(linha)
  }
  return saida.join('\n').trim()
}

// Frases: corta depois de . ! ? (e aspas/parênteses de fechamento) seguido de
// espaço. Não corta em abreviações comuns nem em números decimais.
function frases(prosa: string): string[] {
  const plano = prosa.replace(/\s+/g, ' ').trim()
  if (!plano) return []
  const partes = plano.split(/(?<=[.!?…]["'”’)\]]?)\s+(?=[^a-z])/)
  return partes.map((p) => p.trim()).filter(Boolean)
}

/** Divide prosa sem rótulos em 4 blocos determinísticos e insere só os
 *  rótulos. Devolve null quando há menos de 4 frases (não dá para rotular
 *  sem inventar fala). As palavras saem idênticas à entrada. */
export function rotularProsa(prosa: string): string | null {
  const fs = frases(prosa)
  if (fs.length < 4) return null
  // gancho = 1ª frase; payoff = última (duas quando há fala de sobra);
  // o meio vai metade para MICRO REWARD, metade para ESCALATION.
  const nPayoff = fs.length >= 8 ? 2 : 1
  const hook = fs.slice(0, 1)
  const payoff = fs.slice(fs.length - nPayoff)
  const meio = fs.slice(1, fs.length - nPayoff)
  const corte = Math.ceil(meio.length / 2)
  const micro = meio.slice(0, corte)
  const esc = meio.slice(corte)
  if (!micro.length || !esc.length) return null
  return [
    'HOOK', hook.join(' '), '',
    'MICRO REWARD', micro.join(' '), '',
    'ESCALATION', esc.join(' '), '',
    'PAYOFF', payoff.join(' '),
  ].join('\n')
}

/** O contrato da rota: devolve o roteiro com os 4 marcadores e por qual
 *  caminho isso foi conseguido — ou null quando não dá sem inventar fala. */
export function garantirMarcadores(script: string): { script: string; via: MarcadoresVia } | null {
  const bruto = script.trim()
  if (!bruto) return null
  // Sempre pelo esqueleto canônico: o que sai daqui vai para o fast-path
  // verbatim, que procura os rótulos em linha própria e sem decoração.
  // 'model' = o modelo já pôs os 4 rótulos em linha própria (decorados ou não);
  // 'normalized' = os rótulos vieram inline ("HOOK: …") e foram destacados.
  const modeloObedeceu = temMarcadores(bruto)
  const norm = normalizarMarcadores(bruto)
  if (temMarcadores(norm)) return { script: norm, via: modeloObedeceu ? 'model' : 'normalized' }
  // Prosa (talvez com 1-3 rótulos perdidos): tira o que sobrou de rótulo e
  // rotula do zero, sem tocar nas palavras faladas.
  const prosa = palavrasFaladas(norm).join(' ')
  const rotulado = rotularProsa(prosa)
  if (!rotulado) return null
  return { script: rotulado, via: 'auto_split' }
}
