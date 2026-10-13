// KINEO-ROMANCE-ADULTO-2026-10-13 — [TRAVA 8.2 — vai do fundador 13/10 'tudo sim' (romance adulto e realista)]
//
// O CASO (13/10): d.hein.0@web.de fez 7 filmes de romance/flerte de 35 s no Seedance 1.5 e 3 saíram muito errados —
// todos os planos GERADOS (nenhum de banco). As causas, todas no código:
//   A. "no logo animation" ligou o look `animated3d` (a palavra NEGADA casava) e, com "young couple", saíram rostos de
//      criança estilo Pixar num romance;
//   B. "Resolution: 1080 × 1920" virou o ano 1080 (filme medieval, castelo);
//   C. o look era tirado também do texto que o GPT escreveu ("illustrated by their body language" → livro ilustrado);
//   D. nenhum sinal de romance no Diretor de Formato → documentary_faceless, que apagava "man/woman" e deixava
//      "Close-up shot of and standing"; no character_story o supervisor reescrevia para "two individuals" → duas mulheres;
//   E. "clearly adult" do cliente chegou a 1 de 35 prompts de cena;
//   F. nenhuma trava de saída: nem "adultos, sem menores" nas cenas nem no still FLUX.
//
// Este módulo é a parte PURA do conserto (sem imports, determinístico): reconhece o pedido romântico (en/pt/es), e
// para ele (a) força o look fotorreal (a rota usa forcePhotorealAnchor de sceneStyle), (b) troca palavras de idade
// jovem por adulto nos prompts de cena, (c) cola o sufixo de adultos em TODA cena e no still, (d) acrescenta termos ao
// negative_prompt onde o motor aceita (Veo/Kling 2.5; o Seedance não tem negative — vale o (c)), (e) fixa o elenco
// ("a man and a woman, both adults", ou dois homens / duas mulheres quando o pedido diz isso) e (f) a rota manda o
// romance para character_story. Pedido que não é romance: nenhuma função muda nada (texto byte a byte).

export const ROMANCE_ADULTO_VERSAO = 'romance_adulto_v1'

/** Vai no FIM de toda cena (e do still) de um pedido romântico. */
export const ROMANCE_ADULT_SUFFIX = ', both clearly adults in their late 20s to 30s, mature adult faces, no children, no teenagers'

/** Termos que entram no negative_prompt (Veo/Kling 2.5) quando o pedido é romântico. */
export const ROMANCE_NEGATIVE_TERMS: ReadonlyArray<string> = ['child', 'teen', 'minor', 'schoolkid', 'cartoon', 'cute']

export type RomanceCast = 'man_woman' | 'two_men' | 'two_women'

export interface RomanceAdulto {
  ativo: boolean
  /** Por que (telemetria e ensaio de $0). */
  motivo: string
  elenco: RomanceCast
  /** O elenco fixo que abre toda cena ("a man and a woman, both adults"). */
  elencoFrase: string
  /** Como o par é chamado dentro da cena, no lugar de "two individuals"/"two people". */
  parFrase: string
}

const ELENCO: Record<RomanceCast, { frase: string; par: string }> = {
  man_woman: { frase: 'a man and a woman, both adults', par: 'a man and a woman' },
  two_men: { frase: 'two men, both adults', par: 'two men' },
  two_women: { frase: 'two women, both adults', par: 'two women' },
}

function dobrar(t: string): string {
  return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// Sinal FORTE: sozinho já é romance. Datação por carbono não é encontro.
const FORTE_RE = /(?<![a-z])(?:romance|romances|romantic|romantically|flirt|flirts|flirting|flirty|flirtation|flirtatious|(?<!carbon |radiocarbon |radiometric )dating|date night|first date|kiss|kisses|kissing|kissed|love story|love affair|seduce|seduces|seducing|seduction|seductive|sensual|sensuality|honeymoon|making out|make out|sweetheart|sweethearts|courtship|wooing|slow dance|magnetic attraction|mutual attraction|romantic tension|sexual tension|undeniable chemistry|instant chemistry|palpable chemistry|chemistry between|attraction between|romantico|romantica|romanticos|romanticas|flerte|flertando|flertar|paquera|paquerando|beijo|beijos|beijando|beijar|lua de mel|seducao|coqueteo|coqueteando|coquetear|cita romantica|primera cita|beso|besos|besando|besar|luna de miel|seduccion)(?![a-z])/
// Sinal FRACO: precisa de outro fraco ou de um PAR de pessoas ("two adults", "a man and a woman"). "tourist attraction",
// "a couple of" e "fell in love with physics" (biografia) sozinhos não contam; "love"/"passion" ficam de fora (genéricos demais).
const FRACO_RE = /(?<![a-z])(?:couple(?! of)|couples|chemistry|(?<!tourist |main |star )attraction|attracted|lovers|intimate|intimacy|in love|boyfriend|girlfriend|namoro|namorado|namorada|namorados|apaixonado|apaixonada|apaixonados|amantes|casal|quimica|atracao|intimo|intima|novio|novia|enamorado|enamorada|enamorados|pareja|atraccion)(?![a-z])/g
const PAR_RE = /(?<![a-z])(?:two (?:[a-z-]+ ){0,3}(?:adults|people|persons|partners|strangers|lovers|individuals|characters|souls|men|women)|a man and a woman|a woman and a man|dois adultos|duas pessoas|um homem e uma mulher|uma mulher e um homem|dos adultos|dos personas|un hombre y una mujer|una mujer y un hombre)(?![a-z])/
// Par só de bichos/robôs (história infantil de pinguins apaixonados) não é o risco que esta trava cobre.
const HUMANO_RE = /(?<![a-z])(?:man|men|woman|women|people|person|persons|adult|adults|guy|guys|lady|ladies|boy|boys|girl|girls|husband|wife|boyfriend|girlfriend|human|humans|partners|strangers|individuals|homem|mulher|pessoas|adultos|hombre|mujer|personas)(?![a-z])/
const NAO_HUMANO_RE = /(?<![a-z])(?:penguins?|robots?|cats?|kittens?|dogs?|puppies|puppy|bunnies|bunny|rabbits?|foxes|fox|bears?|birds?|swans?|owls?|ducks?|frogs?|mice|mouse|dragons?|unicorns?|dinosaurs?|animals?|toys?|cars?|trains?)(?![a-z])/

const DOIS_HOMENS_RE = /(?<![a-z])(?:two (?:[a-z-]+ ){0,2}(?:men|guys|gentlemen|husbands|boyfriends)|gay (?:couple|men|man|lovers|romance|love story)|a man and (?:another|a second|his) (?:man|boyfriend|husband)|dois homens|casal gay|dos hombres|pareja gay)(?![a-z])/
const DUAS_MULHERES_RE = /(?<![a-z])(?:two (?:[a-z-]+ ){0,2}(?:women|ladies|girlfriends|wives)|lesbian|lesbians|sapphic|a woman and (?:another|a second|her) (?:woman|girlfriend|wife)|duas mulheres|casal lesbico|dos mujeres|pareja lesbica)(?![a-z])/

const INATIVO: RomanceAdulto = { ativo: false, motivo: 'sem sinal de romance', elenco: 'man_woman', elencoFrase: ELENCO.man_woman.frase, parFrase: ELENCO.man_woman.par }

/** O pedido do CLIENTE (nunca o texto do GPT) é de romance/flerte/encontro/beijo/atração entre pessoas? */
export function decidirRomanceAdulto(pedido: string | null | undefined): RomanceAdulto {
  const t = dobrar(pedido ?? '').slice(0, 12000)
  if (!t) return INATIVO
  const forte = t.match(FORTE_RE)?.[0] ?? null
  const fracos = [...new Set(t.match(FRACO_RE) ?? [])]
  const par = t.match(PAR_RE)?.[0] ?? null
  const ehRomance = forte !== null || (fracos.length >= 1 && par !== null) || fracos.length >= 2 // KINEO-ROMANCE-ADULTO-2026-10-13
  if (!ehRomance) return INATIVO
  if (!HUMANO_RE.test(t) && NAO_HUMANO_RE.test(t)) return { ...INATIVO, motivo: 'romance entre bichos/objetos, sem pessoas' }
  const elenco: RomanceCast = DOIS_HOMENS_RE.test(t) ? 'two_men' : DUAS_MULHERES_RE.test(t) ? 'two_women' : 'man_woman'
  const sinal = forte ? `"${forte}"` : `"${fracos.join('", "')}"${par ? ` + "${par}"` : ''}`
  return { ativo: true, motivo: `pedido romantico (${sinal})`, elenco, elencoFrase: ELENCO[elenco].frase, parFrase: ELENCO[elenco].par }
}

// (b) palavras de idade jovem → adulto. Ordem importa: a frase específica antes da palavra solta.
type Troca = [RegExp, string]
const TROCAS_ADULTO: Troca[] = [
  [/\b(young|teenage|teen) (couple|lovers|pair)\b/gi, 'adult $2'],
  [/\b(a|an|the) (?:young|teenage|teen) (?:man|boy|guy)\b/gi, '$1 man in his early thirties'],
  [/\b(a|an|the) (?:young|teenage|teen) (?:woman|girl|lady)\b/gi, '$1 woman in her early thirties'],
  [/\b(?:young|teenage|teen) (?:men|boys|guys)\b/gi, 'men in their early thirties'],
  [/\b(?:young|teenage|teen) (?:women|girls|ladies)\b/gi, 'women in their early thirties'],
  [/\b(a|the) (?:boy|schoolboy)\b/gi, '$1 man in his early thirties'],
  [/\b(a|the) (?:girl|schoolgirl)\b/gi, '$1 woman in her early thirties'],
  [/\bschool uniforms?\b/gi, 'smart casual clothes'],
  [/\b(?:boys|schoolboys)\b/gi, 'men'],
  [/\b(?:girls|schoolgirls)\b/gi, 'women'],
  [/\b(?:boy|schoolboy)\b/gi, 'man'],
  [/\b(?:girl|schoolgirl)\b/gi, 'woman'],
  [/\b(?:kids|children|teenagers|teens)\b/gi, 'adults'],
  [/\b(?:kid|child|teenager|teenage|teen)\b/gi, 'adult'],
  [/\byoung\b/gi, 'adult'],
  [/\b(?:youthful|childlike|child-like|baby-faced|babyfaced)\b/gi, 'mature'],
  // pt / es (o descritor escreve em inglês; o verbatim pode trazer a língua do cliente)
  [/(?<![\p{L}])(?:menino|garoto)(?![\p{L}])/giu, 'homem'],
  [/(?<![\p{L}])(?:menina|garota)(?![\p{L}])/giu, 'mulher'],
  [/(?<![\p{L}])(?:jovem|adolescente|criança)(?![\p{L}])/giu, 'adulto'],
  [/(?<![\p{L}])(?:jovens|adolescentes|crianças)(?![\p{L}])/giu, 'adultos'],
  [/(?<![\p{L}])(?:niño|chico)(?![\p{L}])/giu, 'hombre'],
  [/(?<![\p{L}])(?:niña|chica)(?![\p{L}])/giu, 'mujer'],
  [/(?<![\p{L}])(?:joven)(?![\p{L}])/giu, 'adulto'],
]
const maiuscula = (orig: string, novo: string) => (/^\p{Lu}/u.test(orig) && novo ? novo[0].toUpperCase() + novo.slice(1) : novo)

/** (b) Troca idade jovem por adulto. Puro; texto sem nenhuma dessas palavras volta idêntico. */
export function adultizarTexto(texto: string): string {
  let out = texto || ''
  for (const [re, para] of TROCAS_ADULTO) {
    out = out.replace(re, (...args: unknown[]) => {
      const m = String(args[0])
      const grupos = args.slice(1).filter((g) => typeof g === 'string' || g === undefined) as Array<string | undefined>
      const novo = para.replace(/\$(\d)/g, (_x, n: string) => grupos[Number(n) - 1] ?? '')
      return maiuscula(m, novo)
    })
  }
  return out.replace(/\b([Aa]) (adult|early)\b/g, (_m, a: string, w: string) => `${a}n ${w}`)
}

// "two individuals" / "two people" (o supervisor fala×imagem escreve assim) viram o par fixo; sem isso o motor escolhe.
const PAR_GENERICO_RE = /\b(?:the )?two (?:adult |attractive |young |clearly adult )?(?:individuals|people|persons|figures|adults|partners|strangers|silhouettes)\b/gi

/**
 * (b)+(e)+(c) — o prompt final de uma cena de romance: idade adulta, elenco fixo na frente, sufixo de adultos no fim.
 * Idempotente (aplicar duas vezes = uma). Pedido sem romance: devolve o prompt intocado.
 */
export function aplicarRomanceAdulto(prompt: string, r: RomanceAdulto): string {
  if (!r.ativo) return prompt
  // o próprio sufixo diz "no children, no teenagers": a troca de idade não pode reescrevê-lo numa 2ª passada
  let p = (prompt || '').split(ROMANCE_ADULT_SUFFIX).map(adultizarTexto).join(ROMANCE_ADULT_SUFFIX)
  p = p.replace(PAR_GENERICO_RE, (m) => maiuscula(m, r.parFrase))
  const elenco = `Cast: ${r.elencoFrase}.`
  if (!p.includes(elenco)) p = `${elenco} ${p}`
  if (!p.includes(ROMANCE_ADULT_SUFFIX)) p = p.replace(/[\s,;]+$/, '') + ROMANCE_ADULT_SUFFIX
  return p
}

/** (d) negative_prompt de romance: só os termos que faltam, no fim. Idempotente. */
export function negativoRomanceAdulto(negativo: string): string {
  const atual = negativo || ''
  const faltam = ROMANCE_NEGATIVE_TERMS.filter((t) => !new RegExp(`(?:^|[^a-z])${t}(?:[^a-z]|$)`, 'i').test(atual))
  if (!faltam.length) return atual
  return atual ? `${atual.replace(/[\s,]+$/, '')}, ${faltam.join(', ')}` : faltam.join(', ')
}

/**
 * Texto para a moderação: SEM o nosso sufixo de segurança. "no children, no teenagers" é termo de menor
 * (lib/safety/moderationPolicy MINOR_TERM_LIST) e, somado a uma nota sexual baixa de um romance adulto legítimo,
 * barraria o pedido por causa da NOSSA proteção.
 */
export function textoParaModeracao(prompts: string[]): string {
  return prompts.map((p) => (p || '').split(ROMANCE_ADULT_SUFFIX).join('')).join('\n')
}
