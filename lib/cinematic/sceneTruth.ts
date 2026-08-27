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
// ─────────────────────────────────────────────────────────────────────────
// RETRATACAO E CORRECAO — 27/08, segunda versao deste arquivo
//
// A primeira versao subiu com tres defeitos que o conselho apontou e que eu
// confirmei com grep antes de aceitar. Estao os tres corrigidos aqui:
//
//  D1. NAO TINHA CALLER. `grep -rn sceneTruth app/ lib/ components/` devolvia
//      zero ocorrencias fora deste arquivo. Era biblioteca morta em producao:
//      24 testes verdes que nao provavam NADA sobre o caminho pago. Agora
//      aplicarContrato() e chamado em route.ts imediatamente antes do POST.
//
//  D2. `acaoObrigatoria` era gravada como null e nunca verificada. Um campo
//      declarado no contrato e jamais preenchido e pior que campo ausente:
//      finge cobertura que nao existe. Agora existe LEXICO_DE_ACAO e a acao
//      e verificada como qualquer outra clausula.
//
//  D3. SUJEITO FORA DO LEXICO APROVAVA POR OMISSAO (`if (!e) return false`).
//      O LEXICO_VISUAL cobre 5 entidades. Toda fala sobre qualquer outro
//      assunto — ou seja, quase tudo que o cliente escreve — produzia
//      contrato VAZIO e passava por definicao. O gate era cego para o
//      produto inteiro. Agora, quando o lexico nao conhece o assunto, entra
//      a ANCORA GENERICA: fala e prompt precisam compartilhar pelo menos um
//      substantivo concreto. Cobertura declarada em `cobertura`, para o log
//      nunca mais dar a entender que verificou o que nao verificou.
//
// O CONTRATO
//
// Uma fonte unica por cena:
//   { falaFinal, sujeitoObrigatorio, acaoObrigatoria, elementosProibidos,
//     ancoras, promptFinal }
//
// Regra dura: se a fala mudar, o prompt precisa ser reconstruido. A fala e o
// trilho mestre (Contrato C1); a imagem serve a ela, nunca o contrario.
//
// POR QUE CORRIGE EM VEZ DE BLOQUEAR
//
// A casa ja derrubou render bom com portao rigido: o guard de narracao curta
// (#349/#350) barrou cliente real em looping ate virar incidente. Um gate
// novo que BLOQUEIA repete esse erro com dinheiro alheio. Entao este aqui
// NUNCA impede o render: ele CORRIGE o prompt (tira o proibido, injeta a
// representacao que falta) e registra o veredito. Se a correcao nao for
// possivel, deixa passar e grava o motivo — falso negativo custa uma cena
// ruim; falso positivo custa o cliente inteiro.
//
// Sem GPT, sem rede, sem banco, sem relogio. Determinismo importa: o gate
// precisa dar o mesmo veredito toda vez, ser testavel offline e nao custar
// um centavo por cena.

export type VeredictoCena =
  | 'aprovada'
  | 'sujeito_ausente'
  | 'elemento_proibido'
  | 'acao_contrariada'
  | 'sem_ancora_comum'

/** O quanto este veredito realmente sabe do assunto da cena. */
export type CoberturaContrato =
  /** O assunto esta no LEXICO_VISUAL: verificacao forte, com traicoes conhecidas. */
  | 'lexico'
  /** Fora do lexico: so exigimos que fala e imagem partilhem algo concreto. */
  | 'generica'
  /** A fala nao tem substantivo concreto nenhum (frase abstrata). Nada a exigir. */
  | 'nenhuma'

export interface ContratoCena {
  indice: number
  /** O que sera FALADO. Verbatim do usuario — nunca reescrito. */
  falaFinal: string
  /** Entidades do lexico citadas na fala que a imagem PRECISA representar. */
  sujeitoObrigatorio: string[]
  /** A acao central da fala, quando o lexico de acao a reconhece. */
  acaoObrigatoria: string | null
  /** Substantivos concretos da fala (usados quando o lexico nao cobre). */
  ancoras: string[]
  /** O que NAO pode aparecer nesta cena. */
  elementosProibidos: string[]
  /** O prompt que sera enviado ao motor. */
  promptFinal: string
}

export interface ResultadoContrato {
  veredicto: VeredictoCena
  cobertura: CoberturaContrato
  /** Sujeitos da fala sem NENHUMA representacao visual no prompt. */
  sujeitosSemRepresentacao: string[]
  /** Elementos proibidos encontrados no prompt. */
  proibidosEncontrados: string[]
  /** Visuais que CONTRADIZEM a acao da fala (navio intacto para "sank"). */
  contradicoesDeAcao: string[]
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
 * Enquanto for pequena, quem manda na maioria das cenas e a ancora generica
 * — e o campo `cobertura` diz qual dos dois julgou.
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

/**
 * LEXICO DE ACAO (defeito D2).
 *
 * So entram acoes cuja contradicao visual e INEQUIVOCA. "sank" contra um
 * navio intacto navegando e contradicao; "walked" contra qualquer coisa nao
 * e. Na duvida, a acao fica de fora — o preco de um falso positivo aqui e
 * corromper um prompt que estava certo.
 */
export interface EntradaAcao {
  /** Como a acao aparece na fala. */
  termos: string[]
  /** Visuais que CONTRADIZEM essa acao. Nenhum pode estar no prompt. */
  traem: string[]
}

export const LEXICO_DE_ACAO: EntradaAcao[] = [
  {
    termos: ['sank', 'sunk', 'went down', 'afundou'],
    traem: ['sailing on the surface', 'afloat', 'pristine ship', 'intact ship',
      'ship at full steam', 'leaving port'],
  },
  {
    termos: ['destroyed', 'ruined', 'collapsed', 'destruido', 'desabou'],
    traem: ['pristine', 'brand new', 'freshly built', 'immaculate'],
  },
  {
    termos: ['abandoned', 'deserted', 'empty', 'abandonado', 'deserto'],
    traem: ['crowd', 'crowded', 'busy street', 'packed stadium', 'bustling'],
  },
  {
    termos: ['buried', 'underground', 'enterrado', 'subterraneo'],
    traem: ['open sky above it', 'on a hilltop', 'floating in the air'],
  },
  {
    termos: ['frozen', 'iced over', 'congelado'],
    traem: ['desert heat', 'tropical beach', 'sunbathing'],
  },
  {
    termos: ['disappeared', 'vanished', 'desapareceu'],
    traem: ['standing in plain sight', 'clearly visible in the foreground'],
  },
]

/** Proibicoes por modo visual — ver lib/cinematic/visualMode.ts */
export const PROIBIDOS_DOCUMENTARIO_FACELESS = [
  'host', 'presenter', 'anchor', 'looking directly into the camera',
  'speaks', 'exclaims', 'he asks', 'she asks', 'talking head',
]

/**
 * Palavras que NAO servem de ancora: nao tem forma visual propria.
 * Sem esta lista, "the", "everything" e "because" contariam como substantivo
 * concreto e a ancora generica aprovaria qualquer coisa — que e exatamente o
 * defeito D3 disfarcado de correcao.
 */
const VAZIAS = new Set([
  'the', 'and', 'but', 'for', 'not', 'you', 'your', 'this', 'that', 'these',
  'those', 'with', 'from', 'into', 'onto', 'over', 'under', 'about', 'after',
  'before', 'when', 'what', 'which', 'while', 'their', 'there', 'here', 'they',
  'them', 'then', 'than', 'have', 'has', 'had', 'was', 'were', 'been', 'being',
  'are', 'its', 'his', 'her', 'him', 'she', 'who', 'whom', 'why', 'how',
  'all', 'any', 'each', 'every', 'everything', 'nothing', 'something',
  'anyone', 'someone', 'nobody', 'everyone', 'more', 'most', 'much', 'many',
  'some', 'few', 'very', 'just', 'only', 'even', 'still', 'also', 'again',
  'once', 'never', 'always', 'ever', 'now', 'today', 'yesterday', 'tomorrow',
  'one', 'two', 'three', 'first', 'last', 'next', 'own', 'same', 'other',
  'would', 'could', 'should', 'will', 'can', 'may', 'might', 'must',
  'because', 'until', 'through', 'during', 'without', 'within', 'between',
  'thing', 'things', 'way', 'ways', 'time', 'times', 'year', 'years',
  'people', 'life', 'world', 'part', 'kind', 'sort', 'lot', 'bit',
  'make', 'made', 'take', 'took', 'come', 'came', 'know', 'knew', 'think',
  'thought', 'want', 'need', 'like', 'look', 'looked', 'see', 'saw', 'seen',
  'get', 'got', 'give', 'gave', 'say', 'said', 'tell', 'told', 'find',
  'found', 'left', 'right', 'back', 'down', 'out', 'off', 'up',
  // Abstratos frequentes em narracao. Entram aqui porque nao tem NENHUMA
  // forma visual propria — exigir que a imagem mostre "answer" ou "reason"
  // produziria aviso em cena legitima. Cada palavra adicionada aqui cega um
  // pouco o gate, entao so entra o que e inequivocamente sem imagem.
  'answer', 'answers', 'question', 'questions', 'reason', 'reasons',
  'truth', 'fact', 'facts', 'idea', 'ideas', 'point', 'sense', 'matter',
  'chance', 'chances', 'result', 'results', 'problem', 'problems',
  'knows', 'known', 'knowing', 'wonder', 'wondered', 'believe', 'believed',
  'happen', 'happened', 'happens', 'become', 'became', 'remain', 'remained',
  'nobody', 'anybody', 'everybody', 'anything', 'everything',
])

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

/** A acao central da fala, se o lexico de acao a reconhecer (defeito D2). */
export function extrairAcao(fala: string): string | null {
  const f = normalizar(fala)
  for (const a of LEXICO_DE_ACAO) {
    const termo = a.termos.find((t) => f.includes(normalizar(t)))
    if (termo) return a.termos[0]
  }
  return null
}

/**
 * Substantivos concretos da fala (defeito D3).
 *
 * Heuristica declarada, nao magica: palavra com 4+ letras, fora da lista de
 * vazias, sem digito. Nao e analise sintatica — e um piso de concretude que
 * funciona offline e da o mesmo resultado toda vez.
 */
export function extrairAncoras(fala: string): string[] {
  const vistas = new Set<string>()
  for (const bruta of normalizar(fala).split(/[^a-z0-9'-]+/)) {
    const w = bruta.replace(/^['-]+|['-]+$/g, '')
    if (w.length < 4) continue
    if (/\d/.test(w)) continue
    if (VAZIAS.has(w)) continue
    vistas.add(w)
  }
  return [...vistas]
}

function entradaDe(sujeito: string): EntradaLexico | undefined {
  const s = normalizar(sujeito)
  return LEXICO_VISUAL.find((e) => e.termos.some((t) => normalizar(t) === s))
}

function entradaAcaoDe(acao: string): EntradaAcao | undefined {
  const a = normalizar(acao)
  return LEXICO_DE_ACAO.find((e) => e.termos.some((t) => normalizar(t) === a))
}

/**
 * Uma ancora conta como presente se o prompt tiver a palavra OU um prefixo
 * dela com 4+ letras — "wreckage" satisfaz "wreck", "explosion" satisfaz
 * "explode". Comparacao por palavra inteira do prompt, nunca por substring
 * solta: sem isso "art" casaria dentro de "start" e a ancora nao valeria nada.
 */
function ancoraPresente(ancora: string, palavrasDoPrompt: Set<string>): boolean {
  if (palavrasDoPrompt.has(ancora)) return true
  const raiz = ancora.slice(0, Math.max(4, ancora.length - 3))
  for (const p of palavrasDoPrompt) {
    if (p.length >= 4 && (p.startsWith(raiz) || ancora.startsWith(p.slice(0, Math.max(4, p.length - 3))))) {
      return true
    }
  }
  return false
}

function palavrasDe(texto: string): Set<string> {
  const s = new Set<string>()
  for (const w of normalizar(texto).split(/[^a-z0-9'-]+/)) {
    const limpa = w.replace(/^['-]+|['-]+$/g, '')
    if (limpa) s.add(limpa)
  }
  return s
}

/**
 * O GATE. Recebe o contrato, devolve o veredito.
 *
 * Ordem de severidade — o pior achado manda:
 *  1. `elemento_proibido`  a imagem contem algo proibido pelo modo visual, ou
 *                          que TRAI o sujeito da fala (o nadador no U-boat).
 *  2. `acao_contrariada`   a imagem contradiz a acao da fala (navio intacto
 *                          navegando enquanto a narracao diz que afundou).
 *  3. `sujeito_ausente`    a fala cita algo do lexico e a imagem nao mostra
 *                          nada que o represente.
 *  4. `sem_ancora_comum`   fora do lexico: fala e imagem nao partilham um
 *                          unico substantivo concreto. Este e o unico
 *                          veredito de AVISO — ver severidadeDe().
 */
export function verificarContrato(contrato: ContratoCena): ResultadoContrato {
  const p = normalizar(contrato.promptFinal)
  const palavras = palavrasDe(contrato.promptFinal)

  // 1. Proibicoes explicitas do modo visual + as que traem cada sujeito.
  const proibidos = new Set(contrato.elementosProibidos.map(normalizar))
  for (const s of contrato.sujeitoObrigatorio) {
    for (const t of entradaDe(s)?.traem ?? []) proibidos.add(normalizar(t))
  }
  const proibidosEncontrados = [...proibidos].filter((x) => x && p.includes(x))

  // 2. Contradicoes da acao (D2).
  const contradicoesDeAcao = contrato.acaoObrigatoria
    ? (entradaAcaoDe(contrato.acaoObrigatoria)?.traem ?? []).filter((t) => p.includes(normalizar(t)))
    : []

  // 3. Cada sujeito do lexico precisa de ao menos UMA representacao visual.
  const sujeitosSemRepresentacao = contrato.sujeitoObrigatorio.filter((s) => {
    const e = entradaDe(s)
    // D3: sujeito declarado fora do lexico NAO passa mais em silencio — cai
    // na ancora generica abaixo, que exige partilha concreta com a imagem.
    if (!e) return false
    return !e.representam.some((r) => p.includes(normalizar(r)))
  })

  // 4. Cobertura: quem esta julgando esta cena?
  const cobertura: CoberturaContrato =
    contrato.sujeitoObrigatorio.length > 0 ? 'lexico'
      : contrato.ancoras.length > 0 ? 'generica'
        : 'nenhuma'

  const base = { cobertura, sujeitosSemRepresentacao, proibidosEncontrados, contradicoesDeAcao }

  if (proibidosEncontrados.length > 0) {
    return { ...base, veredicto: 'elemento_proibido',
      motivo: `a imagem contem ${proibidosEncontrados.join(', ')}, que esta proibido nesta cena` }
  }
  if (contradicoesDeAcao.length > 0) {
    return { ...base, veredicto: 'acao_contrariada',
      motivo: `a fala diz "${contrato.acaoObrigatoria}" e a imagem mostra ${contradicoesDeAcao.join(', ')}` }
  }
  if (sujeitosSemRepresentacao.length > 0) {
    return { ...base, veredicto: 'sujeito_ausente',
      motivo: `a fala cita ${sujeitosSemRepresentacao.join(', ')} e a imagem nao mostra nada que represente isso` }
  }
  if (cobertura === 'generica' && !contrato.ancoras.some((a) => ancoraPresente(a, palavras))) {
    return { ...base, veredicto: 'sem_ancora_comum',
      motivo: `a fala fala de ${contrato.ancoras.slice(0, 4).join(', ')} e o prompt nao partilha nenhuma dessas palavras` }
  }
  return { ...base, veredicto: 'aprovada',
    motivo: cobertura === 'nenhuma'
      ? 'fala sem substantivo concreto — nada a exigir da imagem'
      : 'sujeito representado, acao coerente, nenhum elemento proibido' }
}

/**
 * `sem_ancora_comum` e AVISO, nao reprovacao.
 *
 * Um prompt visual legitimo pode nao repetir nenhuma palavra da fala — a
 * narracao diz "ninguem nunca soube o que houve" e a imagem mostra um
 * corredor vazio. Reprovar isso seria repetir o erro do guard de narracao
 * curta, que barrou cliente real por uma regra defensavel no papel.
 */
export function severidadeDe(v: VeredictoCena): 'ok' | 'aviso' | 'corrigir' {
  if (v === 'aprovada') return 'ok'
  if (v === 'sem_ancora_comum') return 'aviso'
  return 'corrigir'
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
    // D2: era `null` fixo. Agora e extraida e verificada como as demais.
    acaoObrigatoria: extrairAcao(args.falaFinal),
    ancoras: extrairAncoras(args.falaFinal),
    elementosProibidos: args.elementosProibidos ?? [],
    promptFinal: args.promptFinal,
  }
}

export interface CorrecaoContrato {
  /** O prompt que deve ser enviado ao motor (igual ao original se nada mudou). */
  promptCorrigido: string
  /** Veredito da PRIMEIRA passada, antes de corrigir. */
  antes: ResultadoContrato
  /** Veredito depois da correcao. */
  depois: ResultadoContrato
  /** O que foi feito, para telemetria. */
  acoes: string[]
}

/**
 * O CALLER USA ISTO (defeito D1).
 *
 * Verifica, corrige o que da para corrigir de forma deterministica, e
 * devolve o prompt final. NUNCA bloqueia o render — ver o cabecalho.
 *
 * Correcoes possiveis, nesta ordem:
 *  1. remover do prompt o trecho proibido / que trai o sujeito ou a acao;
 *  2. injetar no INICIO uma representacao do sujeito ausente. Inicio, e nao
 *     fim: a licao do KINEO-UPRIGHT-B e do mouthPrefix do H3 e que token no
 *     comeco pesa mais do que aviso no fim.
 */
export function aplicarContrato(contrato: ContratoCena): CorrecaoContrato {
  const antes = verificarContrato(contrato)
  const acoes: string[] = []
  let prompt = contrato.promptFinal

  if (severidadeDe(antes.veredicto) === 'corrigir') {
    for (const ruim of [...antes.proibidosEncontrados, ...antes.contradicoesDeAcao]) {
      const re = new RegExp(ruim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      if (re.test(prompt)) {
        prompt = prompt.replace(re, '').replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').trim()
        acoes.push(`removido: ${ruim}`)
      }
    }
    for (const s of antes.sujeitosSemRepresentacao) {
      const rep = entradaDe(s)?.representam[0]
      if (rep) {
        prompt = `${rep}, ${prompt}`
        acoes.push(`injetado: ${rep}`)
      }
    }
  }

  const depois = prompt === contrato.promptFinal
    ? antes
    : verificarContrato({ ...contrato, promptFinal: prompt })

  return { promptCorrigido: prompt, antes, depois, acoes }
}
