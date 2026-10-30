// ═══ KINEO-JUIZ-FICHA-2710 [TRAVA 8.2 — vai do fundador 27/10 "faz todos esses consertos de 1 a 6"] — itens 1 e 2: O JUIZ NÃO ENTREGA O QUE
// REPROVOU DUAS VEZES, E A FICHA LEVA AS PALAVRAS DO CLIENTE ═══
//
// OS DOIS FILMES DE 27/10 (grátis, 15 s, Seedance 1.5, estrada clássica, folha de personagem ligada):
//   · 695d4e46 — "a tiny blue-skinned Lord Krishna emerges…": o Krishna saiu um mascote roxo e gorducho em TODA cena. O crítico do still
//     SABIA (cena 1 nota 30 "Character is purple, not blue-skinned as required" → refeita, nota 20 FAIL, seguiu a original; cena 2 nota 30 →
//     refeita, nota 40 FAIL, seguiu a refeita) e o filme foi entregue assim.
//   · 61bdbd1b — "a beautiful strawberry girl wearing a pink dress, a tall banana boy wearing a black suit…": a menina-morango virou uma
//     menina humana comum; a banana só na cena 1. Crítico FAIL 30/30/40 depois da refação, seguiu a original, filme entregue.
//
// AS DUAS CAUSAS:
//   (1) O laço do crítico (lib/cinematic/criticoStill escolherFotoCritico) escolhe a "melhor das duas" quando as duas reprovam — e a melhor
//       de duas reprovadas em IDENTIDADE/SUJEITO ainda é o personagem errado. Faltava um terceiro caminho.
//   (2) A ficha canônica (lib/cinematic/folhaDePersonagem canonicaDeterministica) INVENTA a aparência quando o roteiro não casa com os
//       padrões dela: criatura sem espécie vira "a small and chubby <cor sorteada> creature with a cream belly, big round friendly eyes" — o
//       mascote roxo é literalmente esse texto com 'soft purple' sorteado para "krishna"; papel "girl" vira "a girl about nine years old with
//       … wearing a red t-shirt" — a menina humana. As palavras do cliente ("tiny blue-skinned", "strawberry girl wearing a pink dress")
//       nunca chegavam à folha; o casting (gpt-4o-mini) só refinava o rascunho inventado.
//
// O CONSERTO (tudo puro aqui; a rede fica na rota):
//   A. FICHA LITERAL — para cada personagem do elenco, procura no PEDIDO DO CLIENTE o sintagma que o descreve (artigo + modificadores + nome/
//      papel + complemento "wearing/in/with…") e o leva VERBATIM para a canônica, com prioridade sobre o determinístico, o casting e a tabela de
//      figuras: `Krishna, exactly as the author wrote: "tiny blue-skinned Lord Krishna"; the Hindu god Krishna: deep blue skin…`. A ficha
//      literal nasce com origem 'autor' — o leitor do casting (lerCasting) nunca a troca. Figura conhecida (Krishna, Shiva, Rama, Durga,
//      Buddha) ganha a iconografia canônica DEPOIS das palavras do cliente. A natureza do elenco ("fruit characters with human bodies") entra
//      em toda ficha literal.
//   B. SEM FOLHA — still reprovado em identidade/sujeito cuja refação também reprovou (ou não saiu) NÃO segue: a cena ganha UM still de texto
//      puro (FLUX, o gerador de sempre, SEM a folha), com as palavras do cliente na frente, julgado pelo mesmo crítico (sem referência; o
//      critério SUJEITO lê a descrição literal). Segue a de nota maior; texto puro sem 2º julgamento vence a que reprovou duas vezes.
//      Reprovação de identidade em 2+ cenas = a FOLHA está errada: cai para o filme inteiro (toda cena com folha volta ao texto puro — o still
//      sem folha quando existe, senão o FLUX original da cena). Custo: no máximo 1 still extra por cena reprovada e
//      STILL_CRITIC_MAX_REGERACOES_FILME por filme, dentro do prazo do crítico com folha. Decisão gravada no evento do crítico
//      (fallback: 'sem_folha' | 'folha') e no evento da folha (folha_descartada).
// Guardião: scripts/test-juiz-ficha-2710.mjs (executa este arquivo com os DOIS pedidos reais de 27/10 + mutantes).
import {
  chamarCritico, STILL_CRITIC_MAX_REGERACOES_FILME, STILL_CRITIC_TIMEOUT_MS, STILL_CRITIC_MIN_CHAMADA_MS, STILL_CRITIC_REGERACAO_USD,
  type ChamadaDoCritico, type EntradaCritico, type ProblemaStill, type RelatoCriticoStill, type VereditoCritico,
} from '@/lib/cinematic/criticoStill'
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { FIGURAS_FIEIS, figuraFiel, ANATOMIA_DO_SER, especieCanonica } from '@/lib/cinematic/seresFieis' // KINEO-JUIZ-REFAZ-2810 — a tabela única de figuras (as 5 hindus daqui mudaram para lá, com Lucifer, Ghost Rider…)

export const MARCA_JUIZ_FICHA = 'KINEO-JUIZ-FICHA-2710'
export const JUIZ_FICHA_VERSAO = 'juiz_ficha_v1'
/** Os problemas do crítico que dizem "é OUTRO personagem / outro sujeito" — só eles disparam o caminho sem folha. */
export const PROBLEMAS_DE_IDENTIDADE: ReadonlyArray<ProblemaStill> = ['identidade', 'sujeito']
/** Teto de stills sem folha por filme: o MESMO orçamento de refações do crítico (nunca mais foto extra do que ele já permitia). */
export const JUIZ_FICHA_MAX_SEM_FOLHA_FILME = STILL_CRITIC_MAX_REGERACOES_FILME
/** Janela do still de texto puro (FLUX dev 9:16: 3-6 s típicos). */
export const JUIZ_FICHA_JANELA_STILL_MS = 12_000
/** Menos que isto de folga até o prazo do crítico = não tenta (still + julgamento não caberiam). */
export const JUIZ_FICHA_MIN_MS = 10_000
/** Identidade reprovada em quantas cenas = a folha está errada (cai para o filme inteiro). */
export const JUIZ_FICHA_MIN_CENAS_FOLHA_ERRADA = 2

const limpa = (s: string | null | undefined) => String(s ?? '').replace(/\s+/g, ' ').trim()
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const palavraRe = (w: string, flags = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}-])${escapaRe(w)}(?![\\p{L}\\p{N}-])`, flags)

// ═══ A. A FICHA LITERAL — as palavras do cliente, verbatim ══════════════════════════════════════════════════════════
/** Figuras conhecidas que a tabela da casa não tinha em 27/10 (o Krishna do filme 695d4e46). Iconografia de domínio público. */
export const FIGURAS_CONHECIDAS_JUIZ: ReadonlyArray<{ nomes: readonly string[]; descricao: string; genero: 'man' | 'woman' }> = FIGURAS_FIEIS // KINEO-JUIZ-REFAZ-2810 — era a lista local (Krishna, Shiva, Rama, Durga, Buddha); a tabela única vive em lib/cinematic/seresFieis
export function figuraConhecidaJuiz(nome: string): (typeof FIGURAS_CONHECIDAS_JUIZ)[number] | null {
  const n = limpa(nome).toLowerCase().replace(/^the\s+/, '')
  return FIGURAS_CONHECIDAS_JUIZ.find((f) => f.nomes.includes(n)) ?? figuraFiel(nome) ?? null // KINEO-JUIZ-REFAZ-2810 — "Lord Krishna" também cai (o título sai em figuraFiel)
}

/** Artigos e determinantes que abrem o sintagma ("a tiny blue-skinned Lord Krishna", "uma menina de vestido rosa"). */
const ARTIGO_RE = /^(?:a|an|the|one|this|that|his|her|their|my|our|your|um|uma|o|os|as|el|la|un|una|une|le)$/i
/** Palavra que NÃO descreve ninguém sozinha (fica fora da conta de "tem descrição"). */
const PALAVRA_VAZIA_RE = /^(?:very|quite|rather|also|such|same|other|another|certain|only|just|named|called|lord|lady|sir|mr|mrs|ms|dr|mister|saint|st|senhor|senhora|dom|dona|don|doña)$/i
/** Sem artigo: só as palavras que PARECEM modificador ficam ("blue-skinned", "tiny", "Lord", "golden"). */
const MODIFICADOR_RE = /^(?:[A-Z][a-z]+|[\p{L}]+-[\p{L}-]+|[\p{L}]+(?:ed|ing|y|ful|ous|al|ish|less|like|ish)|tiny|small|little|big|tall|short|huge|giant|old|young|cute|beautiful|handsome|chubby|slim|fat|thin|blue|red|green|yellow|pink|purple|orange|white|black|brown|grey|gray|golden|silver|pale|dark|bright)$/iu
/** Algo que de fato descreve (cor, composto, roupa, tamanho, sufixo adjetival) — exigido quando o sintagma veio SEM artigo. */
const DESCRITIVO_RE = /(?:[\p{L}]+-[\p{L}]+|\b(?:blue|red|green|yellow|pink|purple|orange|white|black|brown|grey|gray|golden|gold|silver|pale|dark|bright|tiny|small|little|big|tall|short|huge|giant|old|young|elderly|cute|beautiful|handsome|chubby|slim|fat|thin|dress|suit|outfit|robe|gown|uniform|armou?r|cloak|coat|jacket|shirt|hoodie|jeans|hat|crown|helmet|scarf|glasses|skin|skinned|hair|haired|eyes|eyed|beard|bearded|wearing|dressed)\b|[\p{L}]+(?:ed|ful|ous|ish|less|like)\b)/iu
/** O complemento à direita do nome: só quando CONTINUA o sintagma ("wearing a pink dress", "in a red dress", "with a flute", "who wears…"). */
const CONTINUACAO_RE = /^[\s,]*(?:(?:who|that)\s+(?:is\s+)?)?(?:wearing|wears|wore|dressed\s+in|dressed\s+as|in|with|holding|carrying|riding|covered\s+in|made\s+of|vestindo|vestida\s+de|vestido\s+de|usando|com|de|segurando|con|vestida|vestido)\b/iu
/** Onde o complemento acaba: pontuação forte, vírgula/"and" que abre OUTRO sintagma, ou um verbo narrativo. */
const LIMITE_DIREITA_RE = /[.;:!?…]|,\s*(?:and|e|y)\b|,\s*(?:a|an|the|one|two|three|his|her|their|he|she|they|it|we|um|uma|o|a|el|la|un|una|ele|ela)\b|\s+(?:and|e|y)\s+(?:a|an|the|one|two|three|his|her|their|he|she|they|it|we|um|uma|o|a|el|la|un|una|ele|ela)\b|\s+(?:emerges?|rises?|stands?|sits?|walks?|runs?|looks?|holds?|says?|said|smiles?|appears?|begins?|starts?|turns?|opens?|closes?|flies|floats?|steps?|moves?|dances?|sings?|plays?|jumps?|falls?|enters?|leaves?|waits?|watches?|cries|laughs?|goes|comes?|grows?|becomes?|is|was|are|were|has|had|can|will|then|while|as|before|after|when|until|suddenly|discovers?|finds?|meets?|sees?|hears?|feels?|wants?|tries|decides?|realizes?|learns?|tells?|asks?|answers?|shouts?|whispers?|lives?|lived|works?|travels?|arrives?|returns?|carries|carried|surge|aparece|anda|corre|olha|diz|sorri|entra|sai|encontra|descobre|está|é|tem|sonríe|camina|mira|dice|encuentra)\b/iu
const PALAVRAS_MAX_COMPLEMENTO = 14
const PALAVRAS_MAX_ESQUERDA = 5

export interface LiteralDoCliente {
  /** O sintagma do cliente, verbatim (sem o artigo). */
  literal: string
  /** A palavra pela qual foi achado (nome ou papel). */
  chave: string
}

/** O começo da cláusula em que o nome está (depois da última pontuação forte). */
function clausulaAntes(texto: string, ini: number): string {
  const esquerda = texto.slice(0, ini)
  let corte = -1
  for (const sinal of ['.', ';', ':', '!', '?', '…', '\n', '(', ')']) corte = Math.max(corte, esquerda.lastIndexOf(sinal))
  return esquerda.slice(corte + 1)
}

/** O complemento à direita ("wearing a pink dress"), cortado no limite do sintagma; '' se o texto não continua a descrição. */
function complementoDepois(texto: string, fim: number): string {
  const direita = texto.slice(fim, fim + 400)
  const conector = CONTINUACAO_RE.exec(direita)
  if (!conector) return ''
  // o limite é procurado DEPOIS do conector ("who is holding a flute": o "is" do conector não é o verbo que fecha o sintagma)
  const lim = LIMITE_DIREITA_RE.exec(direita.slice(conector[0].length))
  const bruto = limpa((lim ? direita.slice(0, conector[0].length + lim.index) : direita).replace(/^[\s,]+/, ''))
  return bruto.split(' ').slice(0, PALAVRAS_MAX_COMPLEMENTO).join(' ').replace(/[\s,;]+$/, '')
}

/**
 * As palavras do cliente sobre ESTE personagem: o sintagma em volta da 1ª ocorrência do nome (ou do papel) no pedido — modificadores
 * depois do último artigo da cláusula ("tiny blue-skinned Lord"), o nome, e o complemento que continua a descrição ("wearing a pink dress").
 * Nome nu sem nenhum modificador ("Krishna emerges") → null (nada literal a carregar; a ficha fica como está). Determinístico.
 */
export function descricaoLiteral(pedido: string, ficha: Pick<FichaDePersonagem, 'nome' | 'nucleo'>): LiteralDoCliente | null {
  const texto = limpa(String(pedido ?? '').replace(/\[[^\]]*\]/g, ' ')).slice(0, 8000)
  if (!texto) return null
  const chaves: string[] = []
  for (const c of [limpa(ficha.nome).replace(/^the\s+/i, ''), limpa(ficha.nucleo)]) if (c && !chaves.some((x) => x.toLowerCase() === c.toLowerCase())) chaves.push(c)
  for (const chave of chaves) {
    for (const m of texto.matchAll(palavraRe(chave, 'giu'))) {
      const ini = m.index ?? 0
      const fim = ini + m[0].length
      const palavrasEsq = clausulaAntes(texto, ini).trim().split(/\s+/).filter(Boolean)
      let mods: string[] = []
      let comArtigo = false
      let k = -1
      for (let i = palavrasEsq.length - 1; i >= 0; i--) if (ARTIGO_RE.test(palavrasEsq[i].replace(/[^\p{L}]/gu, ''))) { k = i; break }
      if (k >= 0 && palavrasEsq.length - k - 1 <= PALAVRAS_MAX_ESQUERDA) { mods = palavrasEsq.slice(k + 1); comArtigo = true }
      else for (let i = palavrasEsq.length - 1; i >= 0 && mods.length < 3; i--) { if (MODIFICADOR_RE.test(palavrasEsq[i].replace(/[,;]+$/, ''))) mods.unshift(palavrasEsq[i]); else break }
      // vírgula no meio dos modificadores = outro sintagma antes ("a red dress, a cherry girl" → só "cherry")
      const virgula = mods.map((w) => /[,;]$/.test(w)).lastIndexOf(true)
      if (virgula >= 0) mods = mods.slice(virgula + 1)
      const compl = complementoDepois(texto, fim)
      const esquerda = mods.join(' ')
      const temDescricaoEsq = comArtigo ? mods.some((w) => !PALAVRA_VAZIA_RE.test(w.replace(/[^\p{L}]/gu, ''))) : DESCRITIVO_RE.test(esquerda)
      if (!temDescricaoEsq && !compl) continue
      const literal = limpa(`${temDescricaoEsq || comArtigo ? esquerda : ''} ${m[0]} ${compl}`).replace(/[,;.]+$/, '')
      if (literal.toLowerCase() === m[0].toLowerCase()) continue
      return { literal, chave }
    }
  }
  return null
}

/** A natureza do elenco inteiro, quando o cliente a declara ("fruit characters with human bodies", "anthropomorphic vegetables"). */
export function naturezaDoElenco(pedido: string): string | null {
  const t = limpa(String(pedido ?? ''))
  const m = /\b((?:[\p{L}-]+\s){0,2}characters?\s+with\s+(?:human|animal)\s+bod(?:y|ies))\b/iu.exec(t) ?? /\b(anthropomorphic\s+[\p{L}-]+(?:\s+[\p{L}-]+)?)\b/iu.exec(t)
  return m ? limpa(m[1]).replace(/^(?:cute|funny|little|small|adorable|animated|3d|2d|cartoon)\s+/i, '') : null
}

/** A canônica literal: nome, as palavras do cliente entre aspas, a natureza do elenco e (figura conhecida) a iconografia canônica. */
export function canonicaLiteral(ficha: Pick<FichaDePersonagem, 'nome'>, literal: string, natureza: string | null, canon: string | null): string {
  return `${ficha.nome}, exactly as the author wrote: "${literal}"${natureza ? `, one of the ${natureza}` : ''}${canon ? `; ${canon}` : ''}`
}

// KINEO-CONSISTENCIA-SER-3010 — "The Robot Who Learned to Love" (nikolmishukov, 29/10): o robô mudava de modelo a cada cena. A ficha literal
// dizia só "tiny discarded robot" e cada cena trazia outra descrição ("a small rusty robot", "a shiny silver humanoid robot") brigando com ela.
const TRACOS_DE_DESENHO = 'small|tiny|little|big|large|giant|huge|old|new|rusty|rusted|shiny|silver|metal|metallic|humanoid|cute|friendly|broken|discarded|abandoned|lonely|sad|happy|white|black|red|blue|green|yellow|orange|pink|purple|grey|gray|golden|gold|bronze|copper|chrome|round|rounded|boxy|futuristic|retro|vintage|toy|mechanical|robotic|glowing|tall|short|dusty|dirty|battered|worn|sleek|modern|cartoon|realistic|wooden|plastic|fluffy|furry|scaly|spotted|striped|baby|young|elderly|adorable|tiny-eyed|big-eyed'
/** Ficha literal de ser não humano ganha a anatomia fixa da espécie e a ordem de manter o mesmo desenho; gente e ficha comum ficam iguais. */
export function canonicaComDesenhoFixo(ficha: Pick<FichaDePersonagem, 'tipo' | 'nucleo' | 'canonica'>): string {
  if (ficha.tipo === 'humano' || !literalDaCanonica(ficha.canonica)) return ficha.canonica
  const esp = especieCanonica(ficha.nucleo)
  const anatomia = esp ? ANATOMIA_DO_SER[esp] : undefined
  return `${ficha.canonica}${anatomia ? `; ${anatomia}` : ''}, with the exact same design, size and colours in every scene`
}
/** Tira da cena a descrição concorrente do mesmo ser ("a shiny silver humanoid robot" → "the robot"): quem diz como ele é, é a ficha. */
export function semDescricaoConcorrente(prompt: string, nucleo: string): string {
  const n = String(nucleo ?? '').trim()
  if (!n || /[^\p{L}-]/u.test(n)) return prompt
  return String(prompt ?? '').replace(new RegExp(String.raw`\b(?:a|an|the)\s+(?:(?:${TRACOS_DE_DESENHO}),?\s+){1,4}${n}\b`, 'gi'), `the ${n}`)
}

/** Lê de volta as palavras do cliente de uma canônica literal (para o still sem folha e para o crítico). null = canônica comum. */
export function literalDaCanonica(canonica: string): string | null {
  const m = /exactly as the author wrote: "([^"]+)"/.exec(String(canonica ?? ''))
  return m ? m[1] : null
}

export interface ElencoLiteral {
  elenco: FichaDePersonagem[]
  /** nomes das fichas que ganharam as palavras do cliente */
  literais: string[]
  /** [canônica de antes, canônica literal] — para trocar nos prompts de cena já escritos */
  trocas: Array<[string, string]>
  natureza: string | null
}

/**
 * O elenco com a ficha literal onde o cliente descreveu o personagem. Ficha do autor (origem 'autor') fica como está — já é dele. Todo o
 * resto (determinística, modelo, mítica) é trocado quando o pedido tem palavras para o nome ou o papel. Idempotente: canônica já literal
 * não muda. Nunca mexe no objeto recebido.
 */
export function elencoComFichaLiteral(pedido: string, elenco: ReadonlyArray<FichaDePersonagem>): ElencoLiteral {
  const natureza = naturezaDoElenco(pedido)
  const literais: string[] = []
  const trocas: Array<[string, string]> = []
  const saida = elenco.map((f) => {
    if (f.origem === 'autor' || literalDaCanonica(f.canonica)) return { ...f }
    const lit = descricaoLiteral(pedido, f)
    if (!lit) return { ...f }
    const conhecida = figuraConhecidaJuiz(f.nome)
    const canonica = canonicaLiteral(f, lit.literal, natureza, conhecida?.descricao ?? null)
    literais.push(f.nome)
    trocas.push([f.canonica, canonica])
    return { ...f, canonica, origem: 'autor' as FichaDePersonagem['origem'], ...(conhecida ? { tipo: 'criatura' as FichaDePersonagem['tipo'], genero: conhecida.genero } : {}) }
  })
  return { elenco: saida, literais, trocas, natureza }
}

/** Um prompt de cena já escrito com a canônica antiga (cláusula da ficha, ordem do protagonista) passa a dizer a literal. */
export function trocarFichaNoPrompt(prompt: string, trocas: ReadonlyArray<[string, string]>): string {
  let out = String(prompt ?? '')
  for (const [antes, depois] of trocas) {
    if (!antes || antes === depois) continue
    out = out.split(antes).join(depois)
    // a forma sem o nome ("Dino, " tirado), que promptDoStillComFolha e elencoSecundario usam
    const semNomeAntes = antes.replace(/^[^,]+,\s*/, '')
    const semNomeDepois = depois.replace(/^[^,]+,\s*/, '')
    if (semNomeAntes && semNomeAntes !== antes && semNomeAntes.length > 20) out = out.split(semNomeAntes).join(semNomeDepois)
  }
  return out
}

// ═══ B. SEM FOLHA — o terceiro caminho quando as duas fotos com folha reprovaram ═══════════════════════════════════
export type MotivoSemFolha = 'aprovado' | 'nao_julgado' | 'falha_de_outro_tipo' | 'reprovado_2x' | 'reprovado_sem_refacao'
export interface DecisaoSemFolha {
  /** o still com folha NÃO pode seguir sozinho */
  precisa: boolean
  motivo: MotivoSemFolha
  /** a nota da foto com folha que seguiria (a escolhida pelo crítico) */
  notaFolha: number | null
}
type RelatoParaDecisao = Pick<RelatoCriticoStill, 'veredito' | 'problemas' | 'regerou' | 'regeracao_ok' | 'veredito_regerada' | 'problemas_regerada' | 'nota' | 'nota_regerada' | 'escolhida'>

export function falhouNaIdentidade(problemas: ReadonlyArray<ProblemaStill> | null | undefined): boolean {
  return Array.isArray(problemas) && problemas.some((p) => PROBLEMAS_DE_IDENTIDADE.includes(p))
}

/**
 * O still com folha pode seguir? NÃO quando o 1º veredito foi FAIL em identidade/sujeito e (a) a refação também reprovou (em qualquer
 * critério — a 2ª reprovação de identidade/sujeito em qualquer das duas basta) ou (b) a refação não saiu. PASS, ERRO, PULADO e FAIL de outro
 * tipo (anatomia, texto, artefato) seguem o fluxo de sempre.
 */
export function decidirSemFolha(r: RelatoParaDecisao): DecisaoSemFolha {
  const notaFolha = r.escolhida === 'regerada' ? (r.nota_regerada ?? r.nota) : r.nota
  if (r.veredito === 'PASS') return { precisa: false, motivo: 'aprovado', notaFolha }
  if (r.veredito !== 'FAIL') return { precisa: false, motivo: 'nao_julgado', notaFolha }
  const identidade = falhouNaIdentidade(r.problemas) || (r.veredito_regerada === 'FAIL' && falhouNaIdentidade(r.problemas_regerada))
  if (!identidade) return { precisa: false, motivo: 'falha_de_outro_tipo', notaFolha }
  if (r.regerou && r.regeracao_ok && r.veredito_regerada === 'PASS') return { precisa: false, motivo: 'aprovado', notaFolha }
  if (r.regerou && r.regeracao_ok && r.veredito_regerada !== 'FAIL') return { precisa: false, motivo: 'nao_julgado', notaFolha } // KINEO-JUIZ-ESTADOS-3010 — same continuation policy; unknown is never approval.
  if (r.regerou && r.regeracao_ok) return { precisa: true, motivo: 'reprovado_2x', notaFolha }
  return { precisa: true, motivo: 'reprovado_sem_refacao', notaFolha }
}

/** A folha está errada? A mesma reprovação de identidade em `minimo` cenas ou mais. */
export function folhaErrada(decisoes: ReadonlyArray<Pick<DecisaoSemFolha, 'precisa'>>, minimo: number = JUIZ_FICHA_MIN_CENAS_FOLHA_ERRADA): boolean {
  return decisoes.filter((d) => d.precisa).length >= Math.max(1, minimo)
}

/**
 * Qual still segue depois do texto puro: sem texto puro → a folha (não há outra); texto puro sem 2º julgamento ou aprovado → texto puro
 * (uma foto desconhecida vence uma que reprovou duas vezes no personagem); as duas reprovadas → nota maior, empate = texto puro.
 */
export function escolherSemFolha(notaFolha: number | null, texto: { veredito: VereditoCritico; nota: number | null } | null, temTexto: boolean): 'sem_folha' | 'folha' {
  if (!temTexto) return 'folha'
  if (!texto || texto.veredito !== 'FAIL') return 'sem_folha'
  return (texto.nota ?? 0) >= (notaFolha ?? 0) ? 'sem_folha' : 'folha'
}

/** As palavras do cliente de cada ficha (literal quando existe; senão a canônica sem o nome). */
export function palavrasDoCliente(fichas: ReadonlyArray<Pick<FichaDePersonagem, 'nome' | 'canonica'>>): string {
  return fichas.map((f) => literalDaCanonica(f.canonica) ?? limpa(f.canonica).replace(new RegExp(`^${escapaRe(f.nome)},\\s*`, 'i'), '')).filter(Boolean).join('; ')
}

/** O prompt do still de texto puro: a ordem literal NA FRENTE (positiva, sem nomear defeito), depois a cena de sempre (o prompt FLUX da cena). */
export function promptDoStillSemFolha(scenePrompt: string, fichas: ReadonlyArray<Pick<FichaDePersonagem, 'nome' | 'canonica'>>): string {
  const quem = palavrasDoCliente(fichas)
  const cena = limpa(scenePrompt)
  if (!quem) return cena
  return limpa(`The character must look exactly as the author wrote: ${quem}; this exact design, nothing else. ${cena}`)
}

/** O que o crítico confere no still de texto puro: a cena + as palavras do cliente (o critério SUJEITO lê isto; não há referência). */
export function mostraSemFolha(visual: string, fichas: ReadonlyArray<Pick<FichaDePersonagem, 'nome' | 'canonica'>>): string {
  const quem = palavrasDoCliente(fichas)
  return quem ? `${limpa(visual)} — The character must be exactly as the author wrote: ${quem}.` : limpa(visual)
}

/** Semente do still de texto puro: determinística, diferente da do filme e da refação do crítico (7.919·(i+1)). */
export function seedDoStillSemFolha(seed: number, indice: number): number {
  const s = Number.isFinite(seed) ? Math.floor(Math.abs(seed)) : 0
  return (s + 104_729 * (Math.max(0, Math.floor(indice)) + 1)) % 2_147_483_647
}

export interface ResultadoSemFolha {
  cena: number
  decisao: DecisaoSemFolha
  tentou: boolean
  /** por que não tentou (orçamento, prazo) ou o que saiu */
  motivo: string
  url: string | null
  veredito: VereditoCritico | null
  problemas: ProblemaStill[]
  nota: number | null
  escolha: 'sem_folha' | 'folha'
  custo_usd: number
  ms: number
}
export interface EstadoJuizFicha {
  prazo: number
  restantes: number
  resultados: ResultadoSemFolha[]
}
export function novoJuizFicha(o: { prazo: number; maxPorFilme?: number }): EstadoJuizFicha {
  return { prazo: Number.isFinite(o.prazo) ? o.prazo : Infinity, restantes: Math.max(0, Math.floor(o.maxPorFilme ?? JUIZ_FICHA_MAX_SEM_FOLHA_FILME)), resultados: [] }
}
export interface DepsSemFolha {
  /** o still FLUX de sempre (na rota: generateCinematicSceneStill), SEM folha; null = falhou */
  gerarStill: (scenePrompt: string, seed: number, pollWindowMs: number) => Promise<string | null>
  /** o crítico de sempre, sem referência (padrão: chamarCritico) */
  julgar?: (e: EntradaCritico, url: string, timeoutMs: number) => Promise<ChamadaDoCritico>
  agora?: () => number
}

/**
 * O caminho sem folha de UMA cena: decide pelo relato do crítico; dentro do teto por filme e do prazo, gera o still de texto puro, julga-o
 * (sem referência) e escolhe. NUNCA lança; qualquer falha = a foto com folha segue (escolha 'folha'). Registra em `estado.resultados`.
 */
export async function julgarSemFolha(
  estado: EstadoJuizFicha,
  args: { indice: number; relato: RelatoParaDecisao; scenePrompt: string; visual: string; fala: string; fichas: ReadonlyArray<Pick<FichaDePersonagem, 'nome' | 'canonica'>>; seed: number },
  deps: DepsSemFolha,
): Promise<ResultadoSemFolha> {
  const agora = deps.agora ?? (() => Date.now())
  const t0 = agora()
  const decisao = decidirSemFolha(args.relato)
  const r: ResultadoSemFolha = { cena: args.indice + 1, decisao, tentou: false, motivo: decisao.motivo, url: null, veredito: null, problemas: [], nota: null, escolha: 'folha', custo_usd: 0, ms: 0 }
  try {
    if (!decisao.precisa) return r
    if (estado.restantes <= 0) { r.motivo = 'teto_filme'; return r }
    const folga = estado.prazo - agora()
    if (folga < JUIZ_FICHA_MIN_MS) { r.motivo = 'sem_tempo'; return r }
    estado.restantes -= 1 // reservado ANTES do await: as cenas correm em paralelo
    r.tentou = true
    r.custo_usd = STILL_CRITIC_REGERACAO_USD
    let url: string | null = null
    try { url = await deps.gerarStill(promptDoStillSemFolha(args.scenePrompt, args.fichas), seedDoStillSemFolha(args.seed, args.indice), Math.max(1_000, Math.min(JUIZ_FICHA_JANELA_STILL_MS, folga - STILL_CRITIC_MIN_CHAMADA_MS))) } catch { url = null }
    if (!url) { r.motivo = 'still_falhou'; return r }
    r.url = url
    const restante = estado.prazo - agora()
    let julgamento: ChamadaDoCritico | null = null
    if (restante >= STILL_CRITIC_MIN_CHAMADA_MS) {
      const julgar = deps.julgar ?? ((e, u, timeoutMs) => chamarCritico(e, u, { timeoutMs }))
      try { julgamento = await julgar({ indice: args.indice, url, mostra: mostraSemFolha(args.visual, args.fichas), fala: args.fala, prompt: args.scenePrompt, seed: args.seed }, url, Math.min(STILL_CRITIC_TIMEOUT_MS, restante)) } catch { julgamento = null }
    }
    if (julgamento) { r.veredito = julgamento.veredito; r.problemas = julgamento.problemas; r.nota = julgamento.nota; r.custo_usd = Math.round((r.custo_usd + julgamento.custoUsd) * 1e6) / 1e6 }
    const util = julgamento && julgamento.veredito !== 'ERRO' ? { veredito: julgamento.veredito, nota: julgamento.nota } : null
    r.escolha = escolherSemFolha(decisao.notaFolha, util, true)
    r.motivo = julgamento ? (util ? `julgado_${julgamento.veredito.toLowerCase()}` : 'julgamento_erro') : 'sem_2o_julgamento'
    return r
  } catch (err) {
    r.motivo = `lancou: ${limpa(err instanceof Error ? err.message : String(err)).slice(0, 80)}`
    r.escolha = 'folha'
    return r
  } finally {
    r.ms = Math.max(0, agora() - t0)
    estado.resultados.push(r)
  }
}

/** O que entra no evento do crítico desta cena (nunca URL nem texto do cliente). */
export function metadadoSemFolha(r: ResultadoSemFolha | null | undefined): Record<string, unknown> {
  if (!r) return { juiz_ficha: JUIZ_FICHA_VERSAO, fallback: null }
  return { juiz_ficha: JUIZ_FICHA_VERSAO, fallback: r.decisao.precisa ? r.escolha : null, fallback_motivo: r.motivo, fallback_tentou: r.tentou, fallback_veredito: r.veredito, fallback_problemas: r.problemas, fallback_nota: r.nota, fallback_nota_folha: r.decisao.notaFolha, fallback_custo_usd: r.custo_usd, fallback_ms: r.ms }
}

/** O que entra no evento da folha do filme: a folha foi descartada? quantas cenas caíram para o texto puro? */
export function relatoJuizFicha(estado: EstadoJuizFicha, folhaDescartada: boolean, literais: ReadonlyArray<string>): Record<string, unknown> {
  return {
    juiz_ficha: JUIZ_FICHA_VERSAO,
    fichas_literais: literais.length,
    folha_descartada: folhaDescartada,
    sem_folha_decididas: estado.resultados.filter((r) => r.decisao.precisa).length,
    sem_folha_tentadas: estado.resultados.filter((r) => r.tentou).length,
    sem_folha_escolhidas: estado.resultados.filter((r) => r.escolha === 'sem_folha').length,
    sem_folha_cenas: estado.resultados.filter((r) => r.escolha === 'sem_folha').map((r) => r.cena),
    sem_folha_custo_usd: Math.round(estado.resultados.reduce((s, r) => s + r.custo_usd, 0) * 1e6) / 1e6,
  }
}

/**
 * Os stills finais das cenas com folha, cena a cena: sem a folha descartada, a escolha de cada cena; com a folha descartada, o texto puro
 * da cena quando existe, senão o FLUX original (null = a cena cai para o FLUX que já está em sceneStills); só fica com a folha a cena que
 * não tem NENHUMA outra foto. `comFolha[i]` = o still com folha (já com a escolha por cena aplicada), `semFolha[i]` = o de texto puro
 * escolhido, `flux[i]` = o still FLUX original da cena.
 */
export function stillsFinaisDaFolha(args: { comFolha: ReadonlyArray<string | null>; semFolha: ReadonlyArray<string | null>; flux: ReadonlyArray<string | null>; folhaDescartada: boolean }): (string | null)[] {
  return args.comFolha.map((folha, i) => {
    if (!args.folhaDescartada) return folha
    if (args.semFolha[i]) return args.semFolha[i]
    if (args.flux[i]) return null
    return folha
  })
}
