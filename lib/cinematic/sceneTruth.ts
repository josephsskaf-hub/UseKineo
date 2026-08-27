// ═══ CONTRATO CENA VERDADEIRA — 2026-08-27 ════════════════════════════════
//
// O QUE ISTO RESOLVE
//
// Hoje a fala e o prompt visual sao dois textos que ninguem obriga a
// concordar. O planner escreve os dois, e a partir dali eles seguem caminhos
// separados: a fala vai para o TTS, o prompt vai para o motor de video.
// Ninguem, em ponto nenhum, pergunta "a imagem mostra o que a frase diz?".
//
// O caso que provou o buraco (render 37c8d832): a narracao dizia
// "a German U-boat sank it in 1942" e a imagem entregou um rosto humano
// submerso fazendo bolhas. O corte de 14 palavras (ja corrigido em debe92b8)
// foi o gatilho — mas mesmo sem ele NADA no sistema teria reprovado a cena,
// porque nada compara fala com imagem.
//
// O CONTRATO
//
// Uma fonte unica por cena:
//   { falaFinal, sujeitoObrigatorio, acaoObrigatoria, elementosProibidos, promptFinal }
//
// Regra dura: se a fala mudar, o prompt precisa ser reconstruido. A fala e o
// trilho mestre (Contrato C1); a imagem serve a ela, nunca o contrario.
//
// COMO O SUJEITO E EXTRAIDO
//
// Sem GPT. Um lexico deterministico: entidades concretas que aparecem em
// roteiro de documentario/misterio/historia, cada uma com os visuais que a
// REPRESENTAM e os que a TRAEM. "U-boat" representa-se por submarino,
// destrocos, sonar, mapa, torpedo — nunca por um nadador.
//
// Determinismo importa: o gate precisa dar o mesmo veredito toda vez, ser
// testavel sem rede e nao custar um centavo por cena.
//
// Puro: sem rede, sem banco, sem relogio.

export type VeredictoCena = 'aprovada' | 'sujeito_ausente' | 'elemento_proibido'

export interface ContratoCena {
  indice: number
  /** O que sera FALADO. Verbatim do usuario — nunca reescrito. */
  falaFinal: string
  /** Entidades concretas citadas na fala que a imagem PRECISA representar. */
  sujeitoObrigatorio: string[]
  /** O verbo/acao central da fala, quando identificavel. */
  acaoObrigatoria: string | null
  /** O que NAO pode aparecer nesta cena. */
  elementosProibidos: string[]
  /** O prompt que sera enviado ao motor. */
  promptFinal: string
}

export interface ResultadoContrato {
  veredicto: VeredictoCena
  /** Sujeitos da fala sem NENHUMA representacao visual no prompt. */
  sujeitosSemRepresentacao: string[]
  /** Elementos proibidos encontrados no prompt. */
  proibidosEncontrados: string[]
  /** Explicacao curta, para telemetria e para o log do fundador. */
  motivo: string
}

/**
 * LEXICO DE REPRESENTACAO VISUAL.
 *
 * Cada entrada: a entidade como aparece na fala, os visuais que a
 * REPRESENTAM (pelo menos um precisa estar no prompt) e os que a TRAEM
 * (nenhum pode estar).
 *
 * A lista nasce dos casos reais. Cresce quando um render novo revelar um
 * par (fala, imagem) que ninguem previu — e cada entrada nova vira teste.
 */
export interface EntradaLexico {
  /** Como a entidade aparece na fala (minusculas, sem acento). */
  termos: string[]
  /** Ao menos UM destes precisa estar no prompt visual. */
  representam: string[]
  /** NENHUM destes pode estar no prompt visual. */
  traem: string[]
}

export const LEXICO_VISUAL: EntradaLexico[] = [
  {
    // O caso que originou tudo.
    termos: ['u-boat', 'uboat', 'u boat', 'submarine', 'submarino'],
    representam: ['submarine', 'u-boat', 'conning tower', 'periscope', 'torpedo',
      'wreck', 'shipwreck', 'hull', 'sonar', 'nautical chart', 'naval map', 'seabed'],
    traem: ['swimmer', 'diver face', 'bubbles from mouth', 'child', 'boy', 'girl',
      'person underwater', 'face underwater'],
  },
  {
    termos: ['shipwreck', 'sank', 'sunk', 'naufragio', 'wreck'],
    representam: ['wreck', 'shipwreck', 'hull', 'rusted', 'debris', 'seabed',
      'sunken', 'submerged ship', 'sonar', 'archival'],
    traem: ['swimmer', 'boy', 'girl', 'child', 'bubbles from mouth'],
  },
  {
    termos: ['satellite', 'satelite'],
    representam: ['satellite', 'orbit', 'aerial', 'from above', 'sensor',
      'imagery', 'radar', 'space'],
    traem: ['telescope on a tripod', 'stargazer'],
  },
  {
    termos: ['oil sheen', 'sheen', 'slick', 'mancha'],
    representam: ['sheen', 'slick', 'iridescent', 'oil', 'water surface',
      'rainbow film', 'aerial view'],
    traem: [],
  },
  {
    termos: ['coast guard', 'guarda costeira'],
    representam: ['coast guard', 'cutter', 'patrol', 'vessel', 'ship', 'helicopter'],
    traem: [],
  },
]

/** Proibicoes por modo visual — ver lib/cinematic/visualMode.ts */
export const PROIBIDOS_DOCUMENTARIO_FACELESS = [
  'host', 'presenter', 'anchor', 'looking directly into the camera',
  'speaks', 'exclaims', 'he asks', 'she asks', 'talking head',
]

function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Entidades do lexico citadas nesta fala. */
export function extrairSujeitos(fala: string): string[] {
  const f = normalizar(fala)
  const achados: string[] = []
  for (const e of LEXICO_VISUAL) {
    const termo = e.termos.find((t) => f.includes(normalizar(t)))
    if (termo) achados.push(e.termos[0])
  }
  return achados
}

function entradaDe(sujeito: string): EntradaLexico | undefined {
  const s = normalizar(sujeito)
  return LEXICO_VISUAL.find((e) => e.termos.some((t) => normalizar(t) === s))
}

/**
 * O GATE. Recebe o contrato, devolve o veredito.
 *
 * `sujeito_ausente`  = a fala cita algo concreto e a imagem nao mostra nada
 *                      que o represente.
 * `elemento_proibido`= a imagem contem algo que o modo visual proibe, ou que
 *                      TRAI o sujeito da fala (o nadador na cena do U-boat).
 */
export function verificarContrato(contrato: ContratoCena): ResultadoContrato {
  const p = normalizar(contrato.promptFinal)

  // 1. Proibicoes explicitas do modo visual + as que traem cada sujeito.
  const proibidos = new Set(contrato.elementosProibidos.map(normalizar))
  for (const s of contrato.sujeitoObrigatorio) {
    for (const t of entradaDe(s)?.traem ?? []) proibidos.add(normalizar(t))
  }
  const proibidosEncontrados = [...proibidos].filter((x) => x && p.includes(x))

  // 2. Cada sujeito da fala precisa de ao menos UMA representacao visual.
  const sujeitosSemRepresentacao = contrato.sujeitoObrigatorio.filter((s) => {
    const e = entradaDe(s)
    if (!e) return false // fora do lexico: nao inventamos exigencia
    return !e.representam.some((r) => p.includes(normalizar(r)))
  })

  if (proibidosEncontrados.length > 0) {
    return {
      veredicto: 'elemento_proibido',
      sujeitosSemRepresentacao,
      proibidosEncontrados,
      motivo: `a imagem contem ${proibidosEncontrados.join(', ')}, que esta proibido nesta cena`,
    }
  }
  if (sujeitosSemRepresentacao.length > 0) {
    return {
      veredicto: 'sujeito_ausente',
      sujeitosSemRepresentacao,
      proibidosEncontrados: [],
      motivo: `a fala cita ${sujeitosSemRepresentacao.join(', ')} e a imagem nao mostra nada que represente isso`,
    }
  }
  return {
    veredicto: 'aprovada',
    sujeitosSemRepresentacao: [],
    proibidosEncontrados: [],
    motivo: 'sujeito representado, nenhum elemento proibido',
  }
}

/** Monta o contrato a partir do que o planner produziu. */
export function montarContrato(args: {
  indice: number
  falaFinal: string
  promptFinal: string
  elementosProibidos?: string[]
}): ContratoCena {
  return {
    indice: args.indice,
    falaFinal: args.falaFinal,
    sujeitoObrigatorio: extrairSujeitos(args.falaFinal),
    acaoObrigatoria: null,
    elementosProibidos: args.elementosProibidos ?? [],
    promptFinal: args.promptFinal,
  }
}
