// ═══ KINEO-ELENCO-TRAVA-0311 — o personagem nomeado NÃO troca entre as cenas ═══════════════════════════════════════════
//
// Caso real (02/11 19:03 UTC, youbykh, espanhol, filme grátis de 15 s, Kling 4 → Seedance 1.5, generation fb31ffa6, render 58ad28e8):
// "un perro pequeño … una niña perdida". O cachorro realista azul virou pelúcia 3D e a menina da cena 2 era outra menina. Causas
// confirmadas no código e nos eventos:
//   (a) o still-com-folha da cena 2 estourou o prazo do edit (motivos_still {ok:2, provider_timeout:1}) e a cena saiu do still FLUX de
//       texto puro — sem a folha da menina e sem a ficha no prompt (cenas_com_ficha_no_prompt [1,3]; juiz do plano: plano 2 'sem_ficha');
//   (b) o portão do filme grátis refez UMA cena com o MESMO payload assinado (o mesmo still como 1º quadro): quem nasceu sem a folha
//       renascia sem a folha — e a escolha da cena seguia o quadro "depois da troca", não a cena que ficou sem referência;
//   (c) a ficha não travava o ESTILO: o cachorro sem cor no texto ganhou a cor sorteada do conto infantil ("sky blue") e o "drawn in a
//       soft friendly cartoon style", que a trava do filme fotorreal reescreveu como "drawn in a soft friendly photorealistic,
//       ultra-detailed with a rounded body" — cachorro azul de desenho num filme fotorreal = o motor oscila entre bicho e pelúcia;
//       e o pedido original ("Estilo animación cinematográfica 3D familiar") nunca chegou ao look: só o roteiro estruturado era lido;
//   (d) a ficha da menina tinha 6 palavras do autor, sem cabelo/idade/pele/roupa: cada cena desenhava a sua menina.
//
// Este módulo é PURO (a rede da leitura das âncoras é injetada) e serve TODAS as estradas que usam ficha:
//   1. travarEstiloDaFicha — UMA linha de estilo explícita na ficha (fotorreal: "a real … filmed in photorealistic live action";
//      desenho: o mesmo desenho do filme em toda cena), sem o "cartoon style" infantil e sem a cor sorteada num filme fotorreal.
//      Só frase POSITIVA no prompt (o motor sem negative_prompt desenha o que se proíbe — revisão de 7372accfe).
//   2. fichaRala + âncoras — personagem humano/animal de descrição curta ganha âncoras de aparência LIDAS da folha (a imagem de
//      referência que gera todo still), uma vez por filme, e elas viajam verbatim em toda cena. Nunca nome de pessoa real/famosa.
//   3. vizinhaDoElenco — o still-com-folha que falhou duas vezes (prazo/fornecedor) usa o still aprovado mais próximo do MESMO
//      elenco; sem nenhum, a cena segue em texto, com a ficha inteira (estilo + âncoras) no prompt.
//   4. garantirFichasNoPrompt / trocasDaFicha — toda cena com personagem carrega a ficha travada; a ficha antiga (inclusive a forma
//      reescrita pela trava de estilo do filme) é trocada pela nova em todo prompt já escrito.
//   5. cenaSemReferencia — o portão do filme grátis prefere refazer a cena que nasceu sem a referência e refaz o still com a folha.
// Guardião: scripts/test-elenco-trava-0311.mjs (o caso youbykh com a forma real: 3 cenas, 1 still estourado, troca de identidade).
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { DRAWN_LOOK_PATTERNS, semEstiloNegado, deriveStyleAnchor, type StyleAnchor } from '@/lib/cinematic/sceneStyle'
import { CLAUSULA_FICHA } from '@/lib/cinematic/personagemAjuste'
import { ESTILO_INFANTIL } from '@/lib/cinematic/seresFieis'
import { epocaDaHistoria, pistasDaEpoca, trocarModernidades, type Epoca } from '@/lib/cinematic/elencoEpoca' // KINEO-EPOCA-NA-FICHA-0311

export const MARCA_ELENCO_TRAVA = 'KINEO-ELENCO-TRAVA-0311'
export const ELENCO_TRAVA_VERSAO = 'elenco_trava_v1'

const limpa = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim()
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ═══ 0. O LOOK do filme lê também o PEDIDO original ═══════════════════════════════════════════════════════════════════
/**
 * O pedido de DESENHO explícito da ideia — só ele vira look (revisão de f009126dc). Da ideia NÃO valem o "animated"/"animation" solto
 * ("an animated debate about taxes" é um debate acalorado, não desenho), "black and white" nem "fairy tale": vale "3D animation",
 * "animated film/style", "cartoon", "Pixar", "anime", "desenho animado", "animación", "animação", "estilo animado"… O roteiro em si
 * continua lido pela régua de sempre (deriveStyleAnchor). Menção negada ("no cartoon") não conta.
 */
const PEDIDO_DE_DESENHO_RE: RegExp[] = [
  ...DRAWN_LOOK_PATTERNS.filter((re) => !/\(animated\|animation\|anime\|manga/.test(re.source)), // a lista da casa sem o padrão do "animated/animation" solto
  /\b(?:anime|manga|claymation|stop[- ]motion|dreamworks|2d animat(?:ed|ion)|comic book style)\b|\b(?:animated|animation)\s+(?:style|look|film|movie|series|short|cartoon)\b|\bin (?:an? )?(?:animated|animation) style\b/i,
  /(?<![\p{L}])(?:estilo animado|estilo de animación|estilo de animação|desenho 3d|dibujo 3d)(?![\p{L}])/iu,
]
export function pedidoDeDesenhoDaIdeia(ideiaOriginal: unknown): string {
  const ideia = typeof ideiaOriginal === 'string' ? semEstiloNegado(limpa(ideiaOriginal).slice(0, 600)) : ''
  if (!ideia) return ''
  return [...new Set(PEDIDO_DE_DESENHO_RE.map((re) => ideia.match(re)?.[0] ?? '').filter(Boolean))].join(', ')
}
/**
 * O texto que decide o look: o roteiro despachado + o pedido de desenho EXPLÍCITO da ideia de onde ele nasceu (body.original_idea, que o
 * Studio só manda quando o roteiro despachado é exatamente o que a ideia gerou). "Estilo animación cinematográfica 3D familiar" vivia só na
 * ideia: o roteiro estruturado em espanhol não citava estilo nenhum e o filme nascia fotorreal. Sem pedido explícito: o roteiro, byte a byte.
 */
export function textoDoLook(prompt: string, ideiaOriginal: unknown): string {
  const pedido = pedidoDeDesenhoDaIdeia(ideiaOriginal)
  if (!pedido) return prompt
  // pedido explícito que a régua do look não conhece ("estilo animado"): vai junto a forma que ela conhece (o desenho padrão da casa)
  return deriveStyleAnchor(pedido).look === 'photoreal' ? `${prompt}\n${pedido}, animated film` : `${prompt}\n${pedido}`
}
/** O texto inteiro do pedido (roteiro + ideia) — onde se procura a cor que o CLIENTE disse. */
export function textoDoPedido(prompt: string, ideiaOriginal: unknown): string {
  const ideia = typeof ideiaOriginal === 'string' ? limpa(ideiaOriginal).slice(0, 600) : ''
  return ideia ? `${prompt}\n${ideia}` : prompt
}

// ═══ 1. A LINHA DE ESTILO da ficha ═════════════════════════════════════════════════════════════════════════════════════
/** As cores que a ficha determinística SORTEIA no conto infantil (lib/cinematic/folhaDePersonagem CORES). */
export const CORES_SORTEADAS = ['bright green', 'sky blue', 'warm orange', 'soft purple', 'sunny yellow', 'teal'] as const
/** A palavra-base de cada cor sorteada, nas línguas da casa — se o PEDIDO diz a cor, ela é do cliente e fica. */
const COR_DITA: Record<(typeof CORES_SORTEADAS)[number], RegExp> = {
  'bright green': /(?<!\p{L})(?:green|verde|vert|grün)(?!\p{L})/iu,
  'sky blue': /(?<!\p{L})(?:blue|azul|bleu|blau|blu|celeste)(?!\p{L})/iu,
  'warm orange': /(?<!\p{L})(?:orange|naranja|laranja|arancione)(?!\p{L})/iu,
  'soft purple': /(?<!\p{L})(?:purple|violet|lilac|morado|roxo|púrpura|lila|viola)(?!\p{L})/iu,
  'sunny yellow': /(?<!\p{L})(?:yellow|amarillo|amarelo|jaune|gelb|giallo)(?!\p{L})/iu,
  'teal': /(?<!\p{L})(?:teal|turquoise|turquesa|verde-azulado)(?!\p{L})/iu,
}
/** O "drawn in a soft friendly cartoon style…" do conto infantil — e a forma que a trava do filme fotorreal reescreve. */
const ESTILO_INFANTIL_RE = /,?\s*drawn in a soft friendly [^,;.]*?with a rounded body and big expressive eyes/i
/** A marca de que a ficha já tem a linha de estilo (idempotente). */
const LINHA_FOTORREAL_RE = /filmed in photorealistic live action/i
const LINHA_DESENHO_RE = /the same character design in every scene/i

export function filmeFotorreal(style: Pick<StyleAnchor, 'look'>): boolean {
  return style.look === 'photoreal' || style.look === 'noir'
}

/** A espécie que a ficha diz ("a small dog with true dog anatomy" → "dog"). */
function especieDaFicha(f: Pick<FichaDePersonagem, 'nucleo' | 'canonica'>): string {
  const m = /\bwith (?:true|realistic) ([a-z-]+) anatomy\b/i.exec(f.canonica)
  return (m?.[1] ?? f.nucleo ?? 'animal').toLowerCase()
}

/** A linha de estilo, sempre POSITIVA: diz o que o personagem É, nunca o que ele não é. */
export function linhaDeEstilo(f: Pick<FichaDePersonagem, 'tipo' | 'nucleo' | 'canonica'>, style: Pick<StyleAnchor, 'look' | 'lookPhrase'>): string {
  if (filmeFotorreal(style)) {
    if (f.tipo === 'humano') return 'a real person filmed in photorealistic live action, natural skin texture and real fabric clothing'
    if (f.tipo === 'animal') {
      const esp = especieDaFicha(f)
      const cobertura = /owl|bird|duck|penguin|parrot|eagle|hawk|chicken|hen|rooster|chick/.test(esp) ? 'natural feathers' : /turtle|frog|snake|lizard|crab|octopus|whale|dolphin|fish|shark|seal/.test(esp) ? 'natural skin texture' : 'natural fur'
      return `a real living ${esp} filmed in photorealistic live action, ${cobertura} and true-to-life ${esp} size and proportions`
    }
    return 'a living creature filmed in photorealistic live action, with real textures, weight and natural light'
  }
  return `drawn in the film's own look (${limpa(style.lookPhrase).replace(/[,.;]+$/, '')}), the same character design in every scene`
}

/**
 * A ficha com o estilo travado. Filme fotorreal: sai o "cartoon style" infantil (inclusive a forma já reescrita) e sai a cor sorteada
 * que o pedido não disse; entra a linha fotorreal. Filme desenhado: entra a linha do desenho. Figura mítica e ficha já travada: só a
 * linha, se faltar. Idempotente.
 */
export function travarEstiloDaFicha(f: FichaDePersonagem, style: Pick<StyleAnchor, 'look' | 'lookPhrase'>, textoDoPedido: string): FichaDePersonagem {
  return fichaNaEpoca(travarSoEstiloDaFicha(f, style, textoDoPedido), epocaDaHistoria(textoDoPedido)) // KINEO-EPOCA-NA-FICHA-0311 — o estilo E a época
}
function travarSoEstiloDaFicha(f: FichaDePersonagem, style: Pick<StyleAnchor, 'look' | 'lookPhrase'>, textoDoPedido: string): FichaDePersonagem {
  let c = String(f.canonica ?? '')
  const fotorreal = filmeFotorreal(style)
  if (fotorreal ? LINHA_FOTORREAL_RE.test(c) : LINHA_DESENHO_RE.test(c)) return f
  if (fotorreal) {
    c = c.split(ESTILO_INFANTIL).join('').replace(ESTILO_INFANTIL_RE, '')
    if ((f.tipo === 'animal' || f.tipo === 'criatura') && f.origem !== 'autor') { // as palavras do cliente (origem 'autor') nunca perdem cor
      for (const cor of CORES_SORTEADAS) {
        if (COR_DITA[cor].test(textoDoPedido)) continue
        c = c.replace(new RegExp(`\\b(an?)\\s+((?:small|young|tiny|little)\\s+)?${escapaRe(cor)}\\s+`, 'i'), (m: string, _art: string, porte: string | undefined, offset: number, todo: string) => {
          const resto = porte ?? ''
          return `${/^[aeiou]/i.test(resto || todo.slice(offset + m.length)) ? 'an' : 'a'} ${resto}`
        })
      }
    }
    c = c.replace(/\s+—\s*$/, '').replace(/[\s,;]+$/, '')
  }
  return { ...f, canonica: `${c}; ${linhaDeEstilo({ ...f, canonica: c }, style)}` }
}

// ═══ KINEO-EPOCA-NA-FICHA-0311 [TRAVA 8.2 — fundador 03/11 pelo Canal do Revisor: "é o pior agora"] — a ficha veste a ÉPOCA ═══
// Caso (gustavoq.contato, 03/11 14:12 BRT, Kling 4 grátis 15 s, nota 7, não baixou): "1950: A pilot vanished over the Bermuda
// Triangle…" → o casting (origem 'modelo', 55 palavras) vestiu o piloto de jaqueta verde, JEANS e relógio de hoje, cabelo moderno; o
// sufixo de época ("Any person the shot describes wears…") vale para a cena, mas a ficha entra no prompt e vence. Mesma família:
// hansak.th (Petrov 1983 de moletom). A ficha de gente numa história de época (epocaDaHistoria: ano/década explícitos, sem "hoje")
// troca o que é de hoje pelo equivalente da década e ganha UMA linha positiva de figurino e cabelo do período. Serve as duas
// estradas (travarEstiloDoElenco: clássica pela policy, hollywood pela fichaDoProtagonista) — todos os motores. Idempotente.
const MARCA_EPOCA_NA_FICHA = 'period look:'
export function fichaNaEpoca(f: FichaDePersonagem, epoca: Epoca | null): FichaDePersonagem {
  if (!epoca || f.tipo !== 'humano' || (f.origem as string) === 'mitica') return f
  let c = String(f.canonica ?? '')
  if (c.includes(MARCA_EPOCA_NA_FICHA)) return f
  c = trocarModernidades(c, epoca).prompt
  const d = epoca.decada, rotulo = epoca.rotulo
  const troca = (re: RegExp, por: string, ate: number) => { if (d < ate) c = c.replace(re, por) }
  troca(/\b(?:skinny |ripped |blue |dark |light |slim )?(?:jeans|denim (?:jeans|pants|trousers))\b/gi, 'high-waisted wool trousers', 1960)
  troca(/\bdenim jacket\b/gi, 'wool jacket', 1960)
  troca(/\b(?:graphic |plain |white |black |grey |gray )?t-shirt\b/gi, 'buttoned collared shirt', 1960)
  troca(/\b(?:baseball cap|beanie|snapback)\b/gi, d >= 1900 ? 'fedora hat' : 'top hat', 1970)
  troca(/\b(?:smart ?watch|digital watch|modern (?:wrist)?watch|fitness tracker)\b/gi, 'leather-strap mechanical wristwatch', 2010)
  troca(/\b(?:modern|contemporary|trendy) (?:haircut|hairstyle)\b/gi, `${rotulo} hairstyle`, 2010)
  troca(/\b(?:undercut|fade haircut|man bun)\b/gi, `${rotulo} hairstyle`, 2010)
  troca(/\b(?:puffer jacket|windbreaker|track ?suit|athleisure)\b/gi, d >= 1900 ? `${rotulo} wool overcoat` : 'long wool coat', 1980)
  const quando = epoca.ano !== null ? `${epoca.ano}` : `the ${rotulo}`
  c = c.replace(/[\s,;]+$/, '')
  if (c.includes('natural features of ')) return { ...f, canonica: `${c}; ${MARCA_EPOCA_NA_FICHA} a person of ${quando} with period-accurate ${rotulo} hairstyle and clothing true to their own place and role` } // KINEO-ORIGEM-DO-ELENCO-0311 — a lista de roupa da década é ocidental (fedoras, trench coats); com origem na ficha, o figurino é o do lugar e do papel
  return { ...f, canonica: `${c}; ${MARCA_EPOCA_NA_FICHA} a person of ${quando} with period-accurate ${rotulo} hairstyle and clothing (${pistasDaEpoca(epoca).roupa})` }
}

/** O elenco inteiro com o estilo travado (mudou = alguma ficha trocou de texto). */
export function travarEstiloDoElenco(elenco: ReadonlyArray<FichaDePersonagem>, style: Pick<StyleAnchor, 'look' | 'lookPhrase'>, textoDoPedido: string): { elenco: FichaDePersonagem[]; trocas: Array<[string, string]> } {
  const novo = elenco.map((f) => travarEstiloDaFicha(f, style, textoDoPedido))
  return { elenco: novo, trocas: novo.flatMap((f, i): Array<[string, string]> => (f.canonica !== elenco[i].canonica ? [[elenco[i].canonica, f.canonica]] : [])) }
}

// ═══ 2. FICHA RALA + ÂNCORAS lidas da folha ═══════════════════════════════════════════════════════════════════════════
const ANCORA_HUMANA_RE = /\b(?:hair|bald|beard|skin|wearing|dress|shirt|t-shirt|jacket|coat|sweater|hoodie|jeans|trousers|skirt|uniform|years old|freckles)\b/i
const ANCORA_ANIMAL_RE = /\b(?:fur|coat|breed|spotted|striped|brindle|brown|black|white|golden|grey|gray|tan|ginger|cream|fluffy|short-haired|long-haired|collar)\b/i
const MARCA_ANCORAS = 'appearance anchors:'

/** Humano/animal cuja ficha não diz como ele É (cabelo, roupa, pelagem…) — cada cena desenharia o seu. Criatura/mítica: fora. */
export function fichaRala(f: Pick<FichaDePersonagem, 'tipo' | 'canonica' | 'nome'> & { origem: string }): boolean {
  if (f.origem === 'mitica' || (f.tipo !== 'humano' && f.tipo !== 'animal')) return false
  const c = String(f.canonica ?? '')
  if (c.includes(MARCA_ANCORAS)) return false
  const desc = c.replace(new RegExp(`^${escapaRe(f.nome)},\\s*`, 'i'), '').split(';')[0]
  return !(f.tipo === 'humano' ? ANCORA_HUMANA_RE : ANCORA_ANIMAL_RE).test(desc)
}

// KINEO-PELO-FACIAL-1211 [CEO 12/11 madrugada, Mona Lisa 1911: o Peruggia saiu de barba cheia numa cena e de bigode na outra, com a MESMA folha] — a
// leitura da folha não perguntava o pelo facial; sem ele no texto, cada imagem-chave sorteava. Agora a mesma chamada de visão (custo zero a mais) devolve
// "facial_hair", e a ficha de toda cena diz "clean-shaven" ou "thick dark moustache" igual.
export interface AncorasDeAparencia { idade: string; cabelo: string; pele: string; roupa: string; pelagem: string; porte: string; barba?: string }
/** Nome próprio, comparação com gente real, marca ou franquia: o campo inteiro sai (nunca inventa uma pessoa conhecida). */
const PROIBIDO_NA_ANCORA_RE = /\b(?:like|looks|resembl\w*|celebrit\w*|famous|actor|actress|singer|star|model|influencer|disney|pixar|marvel|dc|barbie|lego|brand|logo)\b/i
const campo = (v: unknown): string => {
  if (typeof v !== 'string') return ''
  const t = limpa(v).replace(/["“”]/g, '')
  if (!t || /^(?:n\/?a|none|unknown|not visible|not applicable|-)$/i.test(t)) return ''
  if (PROIBIDO_NA_ANCORA_RE.test(t) || /\b\p{Lu}\p{Ll}+\s+\p{Lu}\p{Ll}+/u.test(t)) return ''
  return t.toLowerCase().split(' ').slice(0, 9).join(' ').replace(/[^\p{L}\p{N}\s,'-]/gu, '').trim()
}
/** A resposta do modelo de visão, saneada. Ilegível ou vazia = null (a ficha fica como estava). */
export function lerAncoras(raw: string): AncorasDeAparencia | null {
  let j: Record<string, unknown>
  try { j = JSON.parse(String(raw ?? '')) as Record<string, unknown> } catch { return null }
  if (!j || typeof j !== 'object') return null
  const semPelo = typeof j.facial_hair === 'string' && /^(?:none|no(?:ne)?\s+facial\s+hair|no|clean[- ]?shaven|beardless)\b/i.test(limpa(j.facial_hair)) // KINEO-PELO-FACIAL-1211 — "none" vira "clean-shaven" (dizer que NÃO tem também trava)
  const a: AncorasDeAparencia = { idade: campo(j.age_range), cabelo: campo(j.hair), pele: campo(j.skin_tone), roupa: campo(j.clothing), pelagem: campo(j.coat), porte: campo(j.size), barba: semPelo ? 'clean-shaven' : campo(j.facial_hair) }
  return Object.values(a).some(Boolean) ? a : null
}
/** A frase das âncoras (só o que a imagem mostrou). */
export function fraseDasAncoras(tipo: FichaDePersonagem['tipo'], a: AncorasDeAparencia): string {
  const partes = tipo === 'humano'
    ? [a.idade, a.cabelo, a.barba ? (a.barba === 'clean-shaven' ? 'clean-shaven' : `facial hair: ${a.barba}`) : '', a.pele ? `${a.pele.replace(/\s*skin$/, '')} skin` : '', a.roupa ? `wearing ${a.roupa.replace(/^wearing\s+/, '')}` : ''] // KINEO-PELO-FACIAL-1211
    : [a.porte, a.pelagem ? `${a.pelagem.replace(/\s*(?:fur|coat)$/, '')} coat` : '']
  const p = partes.filter(Boolean)
  return p.length ? `${MARCA_ANCORAS} ${p.join(', ')}` : ''
}
/** A ficha com as âncoras (antes da linha de estilo, que fica por último). Sem âncora útil = a mesma ficha. */
export function fichaComAncoras(f: FichaDePersonagem, a: AncorasDeAparencia | null): FichaDePersonagem {
  if (!a || f.canonica.includes(MARCA_ANCORAS)) return f
  const frase = fraseDasAncoras(f.tipo, a)
  if (!frase) return f
  const [desc, ...resto] = f.canonica.split('; ')
  return { ...f, canonica: [desc, frase, ...resto].join('; ') }
}

/** O pedido ao modelo de visão: SÓ aparência visível, para continuidade, sem nome nem comparação. */
export function mensagensDasAncoras(f: Pick<FichaDePersonagem, 'tipo' | 'canonica'>, url: string): Array<{ role: 'system' | 'user'; content: unknown }> {
  const quem = f.tipo === 'humano' ? 'person' : 'animal'
  return [
    { role: 'system', content: `You describe a character reference image so that later shots can keep the SAME ${quem}. Return JSON only: {"age_range": "", "hair": "", "facial_hair": "", "skin_tone": "", "clothing": "", "coat": "", "size": ""}. For a person, facial_hair is "none" or what is visible (e.g. "thick dark moustache", "short full beard"). Plain visual words, at most 8 words per field, empty string when not visible or not applicable (a person has no coat field; an animal has no hair, skin_tone or clothing). Never name, identify or compare to any real or famous person, character, brand or franchise.` },
    { role: 'user', content: [{ type: 'text', text: `Character as written: ${limpa(f.canonica).slice(0, 300)}` }, { type: 'image_url', image_url: { url, detail: 'low' } }] },
  ]
}
export const ANCORAS_PRAZO_MS = 6_000
export const ANCORAS_MODELO = 'gpt-4o-mini'
/** Uma leitura de âncoras (1 chamada de visão, 6 s). Falha/sem chave/ilegível = null. Nunca lança. */
export async function lerAncorasDaFolha(f: FichaDePersonagem, url: string, opts?: { fetchImpl?: typeof fetch; apiKey?: string; timeoutMs?: number }): Promise<AncorasDeAparencia | null> {
  const key = opts?.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  if (!key || !url) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? ANCORAS_PRAZO_MS)
  try {
    const res = await (opts?.fetchImpl ?? fetch)('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: ANCORAS_MODELO, temperature: 0, max_tokens: 160, response_format: { type: 'json_object' }, messages: mensagensDasAncoras(f, url) }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return lerAncoras(data.choices?.[0]?.message?.content ?? '')
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ═══ 3. O STILL QUE FALHOU — refaz uma vez, depois a vizinha, por último o texto com a ficha inteira ══════════════════
export type DecisaoDaReferencia = 'ok' | 'retry_ok' | 'vizinha' | 'texto_ficha'
/** A janela máxima da 2ª tentativa do edit (a 1ª é de até 40 s; o edit leva 15-40 s, a fila às vezes mais) — nunca passa do prazo do lote. */
export const STILL_RETRY_JANELA_MS = 50_000
/** Menos que isto até o prazo do lote = não há 2ª tentativa (o edit não volta antes). */
export const STILL_RETRY_MIN_MS = 5_000
/**
 * A 2ª tentativa do still com folha — ou null (a cena vai direto à vizinha / texto_ficha). Revisão de f009126dc (BLOQUEIO): um POST que
 * LANÇOU (transporte/5xx = ambíguo, lib/falQueue) NUNCA é repetido — pode ter sido cobrado. Só refaz:
 *   · prazo estourado com id → LÊ o MESMO pedido (retomar; nenhum POST novo);
 *   · provider_failed com id E a fal dizendo FAILED → um POST novo (o job morreu do lado dela);
 *   · formato errado/não conferido → um POST novo (o job terminou e a foto veio fora do formato do filme).
 * Moderação, sem chave, falha de leitura/autorização e envio que lançou: nada. A janela é min(50 s, prazo do lote − agora).
 */
export function planoDaRetentativa(r: { motivo: string; requestId?: string | null; jobFalhou?: boolean; envioFalhou?: boolean }, restanteMs: number): { retomar: string | null; janelaMs: number } | null {
  if (!(restanteMs >= STILL_RETRY_MIN_MS) || r.envioFalhou) return null
  const janelaMs = Math.min(STILL_RETRY_JANELA_MS, Math.floor(restanteMs))
  if (r.motivo === 'provider_timeout') return r.requestId ? { retomar: r.requestId, janelaMs } : null
  if (r.motivo === 'provider_failed') return r.requestId && r.jobFalhou ? { retomar: null, janelaMs } : null
  if (r.motivo === 'formato_errado' || r.motivo === 'formato_nao_conferido') return { retomar: null, janelaMs }
  return null
}

const mesmoElenco = (a: readonly string[], b: readonly string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')
/**
 * O still aprovado mais próximo com o MESMO elenco (mesmos nomes, nem mais nem menos): na estrada clássica o still é o 1º quadro do
 * clipe, então a vizinha precisa mostrar as mesmas pessoas — a menina sozinha não abre a cena do cachorro com a menina.
 * Empate de distância = a cena anterior (a continuidade já vista). Nenhuma = null (a cena segue em texto com a ficha).
 */
export function vizinhaDoElenco(indice: number, nomes: readonly string[], cenas: ReadonlyArray<{ indice: number; nomes: readonly string[] }>, stills: ReadonlyArray<string | null>): { indice: number; url: string } | null {
  if (nomes.length === 0) return null
  const candidatas = cenas
    .filter((c) => c.indice !== indice && typeof stills[c.indice] === 'string' && stills[c.indice] && mesmoElenco(c.nomes, nomes))
    .sort((x, y) => Math.abs(x.indice - indice) - Math.abs(y.indice - indice) || x.indice - y.indice)
  const c = candidatas[0]
  return c ? { indice: c.indice, url: stills[c.indice] as string } : null
}

// ═══ 4. A FICHA EM TODA CENA ════════════════════════════════════════════════════════════════════════════════════════════
/** A ficha travada em cada cena que tem o personagem: falta a canônica exata → entra a cláusula da ficha. Idempotente. */
export function garantirFichasNoPrompt(prompt: string, fichas: ReadonlyArray<Pick<FichaDePersonagem, 'canonica'>>): string {
  let out = String(prompt ?? '')
  for (const f of fichas) if (f.canonica && !out.includes(f.canonica)) out = `${out.replace(/\s+$/, '')}${CLAUSULA_FICHA(f.canonica)}`
  return out
}

/**
 * Os pares "ficha antiga → ficha nova" para os prompts já escritos: a canônica antiga e a forma que a trava de estilo do filme
 * (lib/cinematic/filmQuality travarEstiloDoFilme) já reescreveu nela ("cartoon style" → o look fotorreal).
 */
export function trocasDaFicha(trocas: ReadonlyArray<[string, string]>, style: Pick<StyleAnchor, 'look' | 'lookPhrase'>): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const [antes, depois] of trocas) {
    out.push([antes, depois])
    if (filmeFotorreal(style)) {
      const reescrita = antes.replace(/\b(?:(?:stylized\s+)?3[dD]\s+(?:animated|animation|cartoon)(?:\s+(?:film\s+)?(?:look|style))?|(?:hand[- ]drawn\s+)?anime(?:\s+style)?|(?:storybook\s+)?illustration(?:\s+style)?|cartoon(?:\s+style)?|cel shading)\b/gi, style.lookPhrase)
      if (reescrita !== antes) out.push([reescrita, depois])
    }
  }
  return out
}

// ═══ 5. O RELATO por cena (vai ao claim assinado: o portão do filme grátis lê) ═══════════════════════════════════════
export interface CenaDoElencoTrava { cena: number; nomes: string[]; referencia: DecisaoDaReferencia | null; folhas: string[]; prompt_still: string | null; vizinha_de?: number }
export interface RelatoElencoTrava { versao: typeof ELENCO_TRAVA_VERSAO; estilo: string; ancoras: string[]; cenas: CenaDoElencoTrava[] }
/** As cenas que nasceram SEM a referência do personagem (still de texto): o portão as refaz primeiro. */
export function cenaSemReferencia(relato: unknown): number[] {
  const cenas = relato && typeof relato === 'object' ? (relato as { cenas?: unknown }).cenas : null
  if (!Array.isArray(cenas)) return []
  return cenas.flatMap((c) => {
    const x = c as Partial<CenaDoElencoTrava> | null
    return x && x.referencia === 'texto_ficha' && Number.isInteger(x.cena) ? [(x.cena as number) - 1] : []
  })
}
/** A referência da cena para refazer o still no portão: folhas + prompt do still com folha. Sem elas = null. */
export function referenciaDaCenaNoClaim(relato: unknown, indice: number): { folhas: string[]; prompt: string } | null {
  const cenas = relato && typeof relato === 'object' ? (relato as { cenas?: unknown }).cenas : null
  if (!Array.isArray(cenas)) return null
  const c = cenas.find((x) => (x as Partial<CenaDoElencoTrava> | null)?.cena === indice + 1) as Partial<CenaDoElencoTrava> | undefined
  const folhas = Array.isArray(c?.folhas) ? c!.folhas.filter((u): u is string => typeof u === 'string' && u.startsWith('https://')) : []
  return folhas.length > 0 && typeof c?.prompt_still === 'string' && c.prompt_still.trim().length >= 20 ? { folhas, prompt: c.prompt_still.slice(0, 2600) } : null
}
