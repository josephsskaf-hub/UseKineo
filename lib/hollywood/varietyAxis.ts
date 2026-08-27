// ═══ KINEO-VARIEDADE-SEM-AMPUTAR-2026-08-27 ═══════════════════════════════
//
// O CASO REAL QUE MANDOU ESCREVER ISTO
//
// Render 37c8d832 (MiniMax H3, 7 cenas, 45 creditos). A narracao dizia
// "a German U-boat sank it in 1942" e a imagem entregou UM ROSTO HUMANO
// SUBMERSO FAZENDO BOLHAS. Nao foi alucinacao do modelo: foi o nosso codigo.
//
// O contrato C3 (variedade visual) reescrevia a cena repetida assim:
//     const head = stripped.split(' ').slice(0, 14).join(' ')
//     sc.prompt = `${AXE}, ${head}, ${styleSheet}`
//
// `.slice(0, 14)` corta por CONTAGEM DE PALAVRAS. Na cena 4 a palavra numero
// 14 era exatamente `Mouth` — o inicio de "Mouth closed, not speaking, no lip
// movement.", a instrucao que PROIBE rosto falando. O corte decapitou a
// proibicao e deixou a palavra "Mouth" solta no fim do prompt. O motor leu
// "boca" como PEDIDO e entregou uma boca.
//
// E o estrago era maior que uma cena: ao reconstruir o prompt como
// `${AXE}, ${head}, ${styleSheet}`, os QUATRO sufixos de protecao que o
// planner aplica em toda cena iam junto para o lixo:
//   · "mouth closed, not speaking"  → rosto falando em cena de b-roll
//   · NO_TEXT_SUFFIX               → texto ilegivel/chines na tela
//   · SHARP_SUFFIX                 → imagem sem nitidez
//   · STABLE_SHOT_SUFFIX           → horizonte torto / angulo holandes
// Medido no render real: as cenas de dialogo (1, 2, 6) chegaram com 842-870
// caracteres; as cenas passadas pelo C3 (3, 4, 5, 7) ficaram com 131-173.
// A cena 5 terminou em "searching for" — sem objeto. A 3, em "shipwrecks are".
//
// A CORRECAO
//
// O objetivo do C3 e dar um EIXO VISUAL NOVO a cena repetida. Isso se faz
// PREFIXANDO o eixo — nao amputando o prompt. Aqui:
//   1. remove o environmentSheet (a cola que repetia o mesmo cenario);
//   2. prefixa o eixo;
//   3. NAO corta nada por contagem de palavras;
//   4. se ainda assim passar do teto, corta pelo MIOLO em fronteira de FRASE,
//      preservando SEMPRE a cauda (onde vivem os sufixos de protecao);
//   5. nunca deixa um fragmento de instrucao negativa solto.
//
// Puro: sem rede, sem banco, sem relogio. Testado com a cena 4 REAL.

/**
 * Teto de seguranca. O prompt de cena tipico do planner tem 840-870 chars;
 * com o eixo prefixado chega a ~950. O teto so entra em acao em prompt
 * anormalmente longo, e mesmo ai corta por FRASE, nunca no meio de uma.
 */
export const TETO_PROMPT_CENA = 1400

/**
 * Fragmentos que NUNCA podem sobrar sozinhos no fim de um prompt: sao o
 * inicio de uma instrucao NEGATIVA. Um fragmento destes vira PEDIDO para o
 * modelo — foi assim que `Mouth` virou uma boca fazendo bolhas.
 */
export const INICIOS_DE_PROIBICAO = [
  'mouth', 'no ', 'not ', 'never', 'avoid', 'without', 'zero ',
]

/** Cauda protegida: a partir daqui vivem os sufixos que nao podem sumir. */
const MARCA_DE_CAUDA = 'Cinematography (match exactly):'

function normalizar(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim()
}

/**
 * Corta em fronteira de FRASE, nunca no meio. Devolve o maior prefixo cujo
 * fim seja `.`, `!` ou `?` e que caiba no limite. Se nenhuma frase couber,
 * devolve string vazia — melhor perder a descricao inteira do que entregar
 * meia instrucao.
 */
export function cortarEmFronteiraDeFrase(texto: string, limite: number): string {
  const t = normalizar(texto)
  if (t.length <= limite) return t
  const recorte = t.slice(0, limite)
  const fim = Math.max(recorte.lastIndexOf('. '), recorte.lastIndexOf('! '), recorte.lastIndexOf('? '))
  return fim > 0 ? t.slice(0, fim + 1).trim() : ''
}

/**
 * `true` se o texto termina com o COMECO de uma instrucao negativa — ou seja,
 * se uma proibicao foi decapitada. Este e o teste que a cena 4 do render
 * 37c8d832 reprovaria: "...as it spreads. Mouth".
 */
export function terminaEmProibicaoQuebrada(texto: string): boolean {
  const t = normalizar(texto).toLowerCase().replace(/[.,;:]+$/, '')
  const ultima = t.split(/(?<=[.!?])\s+/).pop() ?? ''
  // Uma frase completa de proibicao tem mais de duas palavras. Um fragmento
  // ("Mouth", "no", "not") tem uma ou duas — e e exatamente o perigo.
  const palavras = ultima.split(' ').filter(Boolean)
  if (palavras.length > 2) return false
  return INICIOS_DE_PROIBICAO.some((p) => ultima === p.trim() || ultima.startsWith(p))
}

/**
 * Aplica um eixo visual novo a uma cena repetida SEM amputar o prompt.
 *
 * @param promptOriginal prompt completo da cena, com os sufixos de protecao
 * @param environmentSheet cenario compartilhado (a "cola" que repete) ou null
 * @param eixo o eixo visual novo (angulo/hora/escala)
 */
export function aplicarEixoVisual(
  promptOriginal: string,
  environmentSheet: string | null | undefined,
  eixo: string,
): string {
  // 1. Tira a cola do cenario compartilhado — a razao de as cenas repetirem.
  const semCenario = normalizar(
    environmentSheet ? promptOriginal.split(environmentSheet).join(' ') : promptOriginal,
  )

  // 2. Prefixa o eixo. Nada e cortado: os sufixos de protecao viajam junto.
  const comEixo = `${eixo}, ${semCenario}`
  if (comEixo.length <= TETO_PROMPT_CENA) return comEixo

  // 3. Prompt anormalmente longo: corta o MIOLO, preserva a CAUDA.
  const corte = semCenario.indexOf(MARCA_DE_CAUDA)
  if (corte > 0) {
    const cauda = semCenario.slice(corte)
    const espacoParaMiolo = TETO_PROMPT_CENA - eixo.length - cauda.length - 4
    const miolo = espacoParaMiolo > 40
      ? cortarEmFronteiraDeFrase(semCenario.slice(0, corte), espacoParaMiolo)
      : ''
    return miolo ? `${eixo}, ${miolo} ${cauda}` : `${eixo}. ${cauda}`
  }

  // 4. Sem cauda identificavel: corta por frase e nunca deixa proibicao pela metade.
  let miolo = cortarEmFronteiraDeFrase(semCenario, TETO_PROMPT_CENA - eixo.length - 2)
  while (miolo && terminaEmProibicaoQuebrada(miolo)) {
    const fim = miolo.slice(0, -1).lastIndexOf('.')
    miolo = fim > 0 ? miolo.slice(0, fim + 1) : ''
  }
  return miolo ? `${eixo}, ${miolo}` : eixo
}
