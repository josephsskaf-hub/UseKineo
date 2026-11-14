// ═══ KINEO-PESSOA-DO-PEDIDO-1111 [CEO 11/11, revisão do 1º filme de cliente no formato de 4 planos] — A PESSOA SEM NOME DO PEDIDO ═══
//
// O FILME DE 11/11 09:16 (vídeo 24564d97, Kling 4 grátis, espanhol, nota 7,0): o pedido dizia "A young blonde woman, approximately
// 25 years old, with natural makeup and a casual pastel pink outfit, in a beautiful but realistic modern home…". Saiu uma morena de
// perfil, de regata. Onde a descrição se perdeu (lido no despacho real):
//   (1) o FORMATO foi decidido sobre o roteiro de 15 s (só as 4 falas em espanhol, sem ninguém) → 'documentary_faceless' (padrão);
//   (2) no faceless a rota apaga a pessoa da cena ("A young woman" → "A young woman seen in silhouette from behind") e cola "faceless
//       cinematic b-roll, no foreground human faces" — a moça virou silhueta antes de qualquer ficha;
//   (3) a ficha do pedido (KINEO-FICHA-DO-PEDIDO-0911) só lê o aposto de NOME PRÓPRIO ("Mara, a young …"); esta pessoa não tem nome →
//       elenco vazio ("sem_personagem"), nenhuma ficha, nenhum "Visible:" no plano. O compactador de 512 não tinha o que cortar.
//
// O CONSERTO (puro, sem rede): lê no PEDIDO ORIGINAL a pessoa descrita sem nome — artigo + cabeça com substantivo de pessoa ("A young
// blonde woman") + os complementos de aparência colados por vírgula ("approximately 25 years old", "with natural makeup and a casual
// pastel pink outfit"), parando no primeiro trecho que não descreve gente ("in a beautiful … home", "holds the pen"). A rota usa isso em
// dois pontos, nas duas estradas: o formato que caiu no faceless SÓ por padrão vira história com personagem (pessoa muda, narrador por
// cima — nunca apresentador), e a ficha da história/hollywood que não existia passa a ser estas palavras, verbatim.
// Fica como estava: sem pedido original, pessoa nua ("a man", "a woman" sem nenhuma aparência), pedido em outra língua que não o inglês
// (o vocabulário de descrição do pt/es é o da ficha do pedido; trecho que ele não reconhece não entra), tag [faceless], faceless pedido
// em palavras ("sem apresentador" — o motivo não é o padrão), apresentador, estrela, qualidade herdada.
// Guardião: scripts/test-pessoa-do-pedido-1111.mjs (o pedido real do 24564d97 + controles + mutantes).
import { textoDoPedidoOriginal, trechoDescreve } from '@/lib/cinematic/fichaDoPedido'
import { canonicaLiteral } from '@/lib/cinematic/juizFicha'
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import type { DecisaoFormato } from '@/lib/cinematic/visualMode'

export const MARCA_PESSOA_DO_PEDIDO = 'KINEO-PESSOA-DO-PEDIDO-1111'
export const PESSOA_DO_PEDIDO_VERSAO = 'pessoa_do_pedido_1111_v2'
export const PESSOA_DO_PEDIDO_MAX_PALAVRAS = 40

/** Substantivo de UMA pessoa, em inglês (a cabeça da descrição). */
const PESSOA_RE = /(?<![\p{L}\p{N}-])(an?) ((?:[\p{L}\d-]+ ){0,4}?)(woman|man|girl|boy|lady|guy|person|teenager|teen|mother|father|mom|dad|grandmother|grandfather|grandma|grandpa|influencer|creator|model|nurse|doctor|chef|student|fisherman|sailor|soldier|guard|worker|businessman|businesswoman|athlete)(?![\p{L}\p{N}-])/giu
/** Idade colada à pessoa: "approximately 25 years old", "around 30", "in her late twenties". */
const IDADE_RE = /^(?:(?:approximately|about|around|roughly|aged|age)\s+)?\d{1,3}(?:\s*-\s*\d{1,3})?(?:\s+years?\s+old|\s*y\/?o)?$|^in (?:her|his|their) (?:(?:early|mid|late)[ -])?(?:teens|twenties|thirties|forties|fifties|sixties|seventies|eighties|\d0s)$/iu
/** Complemento de aparência aberto por elo (o resto é conferido por trechoDescreve, da ficha do pedido). */
const ELO_DE_APARENCIA_RE = /^(?:with|wearing|dressed in|in (?:a|an) (?:[\p{L}-]+ ){0,3}(?:outfit|dress|suit|uniform|jacket|coat|sweater|hoodie|shirt|t-shirt|top|blouse|skirt|jeans))\b/iu
/** Elo que abre uma LISTA de traços ou de roupa: depois dele, o pedaço seguinte sem elo continua a mesma lista ("with warm brown skin, expressive … eyes"). */
const ELO_DE_LISTA_RE = /^(?:with|wearing|dressed in)\b/iu
/**
 * KINEO-PESSOA-DO-PEDIDO-1111 (2) — as frases seguintes sobre a mesma pessoa: "She wears a cream blouse and elegant black trousers." (657ad797,
 * 11/11: a roupa vivia na 2ª frase e o filme saiu de jaqueta escura). Só o sujeito pronome da pessoa + verbo de vestir/ter.
 */
const FRASE_SEGUINTE_RE = /^(?:she|he|they)\s+(?:wears|is wearing|are wearing|is dressed in|are dressed in|has|have)\s+(.+)$/iu
const VESTIR_RE = /^(?:she|he|they)\s+(?:wears|is wearing|are wearing|is dressed in|are dressed in)\s/iu
/** Quantas frases depois da 1ª ainda são lidas (a descrição de uma pessoa vem junto; mais longe já é outra coisa). */
export const FRASES_SEGUINTES_MAX = 3
const HUMANO = { nome: '', nucleo: '', tipo: 'humano' } as const
/** A 1ª palavra de um pedaço SEM elo com cara de verbo do inglês (-s, -ed, -ing): ação, não traço ("walks home", "smiled"). */
const CARA_DE_VERBO_RE = /^\p{L}{3,}(?:s|ed|ing)$/iu

/** O maior começo do trecho (em palavras) que ainda é descrição da pessoa: "… long neat black braids sits alone at …" → "… braids". '' = nenhum. */
function comecoQueDescreve(cabeca: string, artigo: string, trecho: string): string {
  const palavras = trecho.split(/\s+/).filter(Boolean)
  for (let n = palavras.length; n >= 2; n--) {
    const parte = palavras.slice(0, n).join(' ')
    if (trechoDescreve(`${cabeca} ${parte}`, artigo, HUMANO)) return parte
  }
  return ''
}

/** A pessoa sem nome que o pedido original descreve, verbatim ("a young blonde woman, approximately 25 years old, with …"). null = não há. */
export function pessoaDoPedido(ideiaOriginal: unknown): string | null {
  const pedido = textoDoPedidoOriginal(ideiaOriginal)
  if (!pedido) return null
  for (const m of pedido.matchAll(PESSOA_RE)) {
    const artigo = m[1].toLowerCase()
    const cabeca = `${m[2]}${m[3]}`.trim()
    // a cabeça com adjetivo tem de ser descrição de gente; a cabeça nua ("a woman") só vale com idade ou aparência colada por vírgula
    const nua = m[2].trim() === ''
    if (!nua && !trechoDescreve(cabeca, artigo, HUMANO)) continue
    const ini = (m.index ?? 0) + m[0].length
    const fimDaFrase = pedido.slice(ini).search(/[.;:!?\n]/u)
    const resto = pedido.slice(ini, fimDaFrase < 0 ? undefined : ini + fimDaFrase)
    const partes = resto.split(',').map((p) => p.trim())
    const aceitos: string[] = []
    let lista = '' // o elo da lista aberta ("with", "wearing"): o pedaço seguinte sem elo continua nela
    for (const [i, p] of partes.entries()) {
      if (!p) { if (i === 0) continue; break } // "woman, approximately…": o 1º pedaço é vazio
      if (IDADE_RE.test(p)) { aceitos.push(p); lista = ''; continue }
      const elo = ELO_DE_APARENCIA_RE.test(p)
      const parte = elo ? comecoQueDescreve(cabeca, artigo, p)
        : lista && !CARA_DE_VERBO_RE.test(p.split(/\s+/)[0]) ? comecoQueDescreve(cabeca, artigo, `${lista} ${p}`).slice(lista.length).trim() : '' // "…, walks home": verbo não continua a lista
      if (!parte) break // o primeiro trecho que não descreve a pessoa fecha a ficha: lugar, ação, outra oração
      aceitos.push(parte)
      if (elo) lista = ELO_DE_LISTA_RE.exec(p)?.[0].toLowerCase() ?? ''
      if (parte !== p) break // o verbo cortou o pedaço ("… braids sits alone"): o resto da frase é ação
    }
    if (nua && aceitos.length === 0) continue // pessoa nua
    // as frases seguintes sobre a mesma pessoa ("She wears …", "She has …")
    const depois = fimDaFrase < 0 ? '' : pedido.slice(ini + fimDaFrase + 1)
    const seguintes = depois.split(/(?<=[.;!?\n])/u).map((f) => f.trim()).filter(Boolean).slice(0, FRASES_SEGUINTES_MAX)
    for (const f of seguintes) {
      const s = FRASE_SEGUINTE_RE.exec(f.replace(/[.;!?]+$/u, ''))
      if (!s) continue
      const parte = comecoQueDescreve(cabeca, artigo, `${VESTIR_RE.test(f) ? 'wearing' : 'with'} ${s[1]}`)
      if (parte) aceitos.push(parte)
    }
    const frase = [`${artigo} ${cabeca}`, ...aceitos].join(', ')
    if (frase.split(/\s+/).length > PESSOA_DO_PEDIDO_MAX_PALAVRAS) continue
    return frase
  }
  return null
}

/** O papel (o substantivo de pessoa) da descrição: "woman" em "a beautiful … woman, with …". */
export function papelDaPessoa(pessoa: string | null): string | null {
  if (!pessoa) return null
  const m = new RegExp(PESSOA_RE.source, 'iu').exec(pessoa)
  return m ? m[3].toLowerCase() : null
}

/**
 * A ficha da história/hollywood com a pessoa do pedido: a derivada do roteiro ("a beautiful 26-year-old South African woman, with warm brown
 * skin" — a 1ª oração só) dá lugar às palavras inteiras do cliente quando fala do MESMO papel. Derivada de nome próprio ("Mara, the guard")
 * ou de outro papel fica; sem derivada, a pessoa do pedido.
 */
export function fichaDaPessoa(derivada: string | null, pessoa: string | null): string | null {
  if (!pessoa) return derivada
  if (!derivada) return pessoa
  if (/^(?!(?:A|An|The)\b)\p{Lu}[\p{L}'’.-]*(?: \p{Lu}[\p{L}'’.-]*)*,/u.test(derivada.trim())) return derivada
  const papel = papelDaPessoa(pessoa)
  return papel && new RegExp(`(?<![\\p{L}])${papel}(?![\\p{L}])`, 'iu').test(derivada) ? pessoa : derivada
}

/**
 * O elenco com a pessoa do pedido: o personagem SEM nome próprio cujo papel é o da descrição ("the woman", sorteado pelo elenco
 * determinístico — 657ad797: "wavy hair … dark blue jacket over a grey t-shirt") passa a ser as palavras do cliente, verbatim, origem 'autor'.
 * Mesma forma de saída da ficha do pedido: `trocas` = [canônica de antes, canônica literal], para os prompts já escritos. Um só personagem
 * recebe (o primeiro do papel); ficha do autor, nome próprio, bicho e criatura ficam.
 */
export function elencoComPessoaDoPedido(pessoa: string | null, elenco: ReadonlyArray<FichaDePersonagem>): { elenco: FichaDePersonagem[]; literais: string[]; trocas: Array<[string, string]> } {
  const papel = papelDaPessoa(pessoa)
  const literais: string[] = []
  const trocas: Array<[string, string]> = []
  let usada = false
  const saida = elenco.map((f) => {
    if (!pessoa || !papel || usada || f.origem === 'autor' || f.tipo !== 'humano') return { ...f }
    const nome = String(f.nome ?? '').trim().toLowerCase().replace(/^(?:the|a|an)\s+/u, '')
    if (nome !== papel) return { ...f }
    usada = true
    const canonica = canonicaLiteral(f, pessoa.replace(/^an?\s+/iu, ''), null, null)
    literais.push(f.nome)
    trocas.push([f.canonica, canonica])
    return { ...f, canonica, origem: 'autor' as FichaDePersonagem['origem'] }
  })
  return { elenco: saida, literais, trocas }
}

/**
 * O formato do filme com a pessoa do pedido: SÓ o faceless que veio do padrão (o roteiro não cita ninguém) vira história com personagem —
 * pessoa muda, narrador por cima. Tag [faceless], "sem apresentador", apresentador e história ficam como estão.
 */
export function formatoComPessoaDoPedido(decisao: DecisaoFormato, pessoa: string | null): DecisaoFormato {
  if (!pessoa || decisao.modo !== 'documentary_faceless' || !/^padrao:/u.test(decisao.motivo)) return decisao
  return { modo: 'character_story', motivo: `o pedido original descreve a pessoa ("${pessoa}"): pessoa muda, narrador por cima`, apresentadorPedido: false }
}

// ═══ KINEO-LUZ-DO-PEDIDO-1111 [CEO 11/11, prova paga do 657ad797 = 8,0; 1ª versão devolvida] — A LUZ QUE O CLIENTE PEDIU ═══
// A prova paga do 657ad797 saiu num café à noite com luminárias; o pedido dizia "Natural sunlight enters through large glass windows." O
// planejador de cenas escreveu "a dimly lit café" e nada levava a luz do cliente ao plano.
// A 1ª versão colava a 1ª frase que CONTINHA palavra de luz em toda cena — num pedido de história isso injeta AÇÃO em toda cena ("At sunset,
// the boy finds the wooden box." nas 4 cenas = REPETICAO). Agora, só o que é LUZ:
//   (a) frase cujo ASSUNTO é a luz — o sujeito é luz/sol/iluminação ("Natural sunlight enters through large glass windows", "Soft warm light
//       fills the room", "Lighting: golden hour") — vai inteira (3 a 20 palavras);
//   (b) senão, a expressão de luz de uma frase de DIREÇÃO de filmagem (começa com Use / Shot / Filmed / Lit / Lighting / Style / Look:
//       "soft natural daylight" em "Use soft natural daylight, realistic skin texture…"); em frase de AÇÃO ("At sunset, the boy finds the
//       box", "the boy goes to school, and at night finds the box") = nada — ela só conta para o conflito (c);
//   (c) duas luzes de tipos diferentes no pedido (dia numa frase, noite em outra) = null: a casa não escolhe.
// Palavra de luz em enredo sem expressão de luz ("The neon sign says OPEN", "He drove all night") = nada. Inglês. Proibição ("No text …") nunca.
export const MARCA_LUZ_DO_PEDIDO = 'KINEO-LUZ-DO-PEDIDO-1111'
const ADJ_DE_LUZ = '(?:soft|warm|cool|natural|bright|golden|gentle|diffused|harsh|hazy|morning|afternoon|evening|late|early|pale|moody|cinematic|clear|dappled|low)'
/** (a) o sujeito da frase é a luz. */
const SUJEITO_LUZ_RE = new RegExp(`^(?:lighting\\s*:|light\\s*:|(?:the\\s+|a\\s+)?(?:${ADJ_DE_LUZ}[\\s,]+){0,3}(?:sunlight|daylight|sunshine|moonlight|candlelight|lamplight|window light|light|lighting|glow|sun|neon lights?)\\s+(?:enters?|enter|fills?|floods?|pours?|streams?|falls?|shines?|comes?|bathes?|washes?|spills?|filters?|glows?|is|are|should|must)\\b)`, 'iu')
/** (b) frase de direção de filmagem (não de ação): só nela a expressão de luz vale. */
const DIRECAO_DE_FILMAGEM_RE = /^(?:use|using|shot|shoot|filmed|film|lit|lighting|style|look|mood|atmosphere)(?![\p{L}])/iu
/** (b) a expressão de luz dentro de uma frase. */
const EXPRESSAO_LUZ_RE = new RegExp(`(?<![\\p{L}])(?:(?:at|during|by|under|in)\\s+(?:the\\s+)?(?:${ADJ_DE_LUZ}\\s+){0,2}(?:sunset|sunrise|dawn|dusk|twilight|midday|noon|night|nighttime|golden hour|moonlight|sunlight|daylight|candlelight|neon lights?|street ?lights?)|(?:${ADJ_DE_LUZ}\\s+){1,3}(?:daylight|sunlight|window light))(?![\\p{L}])`, 'iu')
const CLASSE_LUZ: ReadonlyArray<[RegExp, 'dia' | 'tarde' | 'noite']> = [
  [/(?<![\p{L}])(?:night|nighttime|moonlight|moonlit|candlelight|candlelit|neon|street ?lights?|lamplight|midnight)(?![\p{L}])/iu, 'noite'],
  [/(?<![\p{L}])(?:sunset|dusk|twilight|golden hour)(?![\p{L}])/iu, 'tarde'],
  [/(?<![\p{L}])(?:sunlight|daylight|sunshine|sun|sunrise|dawn|morning|midday|noon|window light)(?![\p{L}])/iu, 'dia'],
]
const classeDaLuz = (t: string) => CLASSE_LUZ.find(([re]) => re.test(t))?.[1] ?? null
/** Luz de DIA: "dimly lit" no plano da cena contradiz e sai. */
const LUZ_DE_DIA_RE = /(?<![\p{L}])(?:sunlight|sunlit|sunshine|daylight|natural light|sunrise|window light|bright light|midday|noon|morning)(?![\p{L}])/iu
export const MARCA_LUZ_NO_PROMPT = 'Lighting as the customer asked:'

/** A luz do pedido original: a frase cujo assunto é a luz, ou só a expressão de luz da frase de ação. null = não há, ou há duas luzes diferentes. */
export function luzDoPedido(ideiaOriginal: unknown): string | null {
  const pedido = textoDoPedidoOriginal(ideiaOriginal)
  if (!pedido) return null
  const achadas: string[] = []
  const daAcao: string[] = []
  for (const f of pedido.split(/(?<=[.!?\n])/u)) {
    const t = f.trim().replace(/[.!?]+$/u, '').trim()
    if (!t || /^(?:no|not|never|without|don't|do not)\b/iu.test(t)) continue
    const n = t.split(/\s+/u).length
    if (SUJEITO_LUZ_RE.test(t) && n >= 2 && n <= 20 && !/(?<![\p{L}])(?:text|subtitles?|captions?|logos?)(?![\p{L}])/iu.test(t)) { achadas.push(t); continue }
    const e = EXPRESSAO_LUZ_RE.exec(t)
    // KINEO-LUZ-DO-PEDIDO-1111 (revisão da CEO) — a expressão de luz só vale em frase de DIREÇÃO de filmagem ("Use soft natural daylight,
    // realistic skin texture…"); dentro de frase de AÇÃO ("At sunset, the boy finds the box", "…and at night finds the box") ela não entra
    // (o planejador já põe a hora na cena certa; a luz global escureceria as outras) — mas conta para o conflito de luzes.
    if (e && DIRECAO_DE_FILMAGEM_RE.test(t)) achadas.push(e[0].toLowerCase())
    else if (e) daAcao.push(e[0].toLowerCase())
  }
  if (!achadas.length) return null
  const classes = new Set([...achadas, ...daAcao].map(classeDaLuz).filter(Boolean))
  if (classes.size > 1) return null // dia numa frase, noite em outra: a casa não escolhe
  return achadas[0]
}

/** O prompt da cena com a luz do pedido no fim (e sem "dimly lit" quando a luz pedida é de dia). Sem luz: o mesmo prompt. */
export function comLuzDoPedido(prompt: string, luz: string | null): string {
  if (!luz || prompt.includes(MARCA_LUZ_NO_PROMPT)) return prompt
  const p = LUZ_DE_DIA_RE.test(luz) ? prompt.replace(/(?<![\p{L}])dimly[ -]lit\s+/giu, '').replace(/(?<![\p{L}])dim(?=\s+(?:light|café|cafe|room|bar|interior))\s+/giu, 'soft ') : prompt
  return `${p.replace(/\s+$/u, '')} ${MARCA_LUZ_NO_PROMPT} ${luz.replace(/[.\s]+$/u, '')}.`
}

// ═══ KINEO-LUGAR-DO-PEDIDO-1111 [CEO 11/11, reprise dos 6 filmes] — O LUGAR QUE O CLIENTE PEDIU ═══
// O 657ad797 pedia "sits alone at a stylish Johannesburg coffee shop"; os planos diziam só "in a café" (e na 1ª prova, um café escuro
// qualquer). Aqui: o lugar do pedido — preposição + até 4 palavras + substantivo de LUGAR ("at a stylish Johannesburg coffee shop") — vira
// "Setting as the customer asked: a stylish Johannesburg coffee shop." no fim de toda cena. Só quando o pedido cita UM lugar só: com dois ou
// mais (a história anda: "goes to school, then to the beach"), nada — o planejador põe cada lugar na cena certa, e um lugar global estragaria
// as outras. Inglês. Pedido sem lugar = null = o prompt de sempre.
const LUGAR_NOME = '(?:coffee shop|coffeehouse|café|cafe|restaurant|bar|pub|bakery|kitchen|bedroom|living room|bathroom|office|classroom|school|library|museum|hospital|church|temple|mosque|forest|jungle|beach|park|street|alley|market|marketplace|zoo|harbor|harbour|port|station|train station|airport|apartment|house|mansion|garden|farm|desert|mountain|lake|river|castle|palace|studio|gym|hotel|lobby|stadium|arena|warehouse|factory|laboratory|lab|village|city square|square|bridge|rooftop|basement|attic|cave|island|ship|boat|train|bus|car|subway|metro|mall|shop|store|boutique|salon|spa|clinic|courtroom|prison|cemetery|field|meadow|valley|canyon|volcano|glacier)'
const LUGAR_RE = new RegExp(`(?<![\\p{L}])(?:at|in|inside|on|into|through|across|near|outside)\\s+((?:an?|the)\\s+(?:[\\p{L}'’-]+\\s+){0,4}?${LUGAR_NOME})(?![\\p{L}])`, 'giu')
const LUGAR_SO_RE = new RegExp(`(?<![\\p{L}])${LUGAR_NOME}(?![\\p{L}])`, 'giu')
export const MARCA_LUGAR_NO_PROMPT = 'Setting as the customer asked:'

// ═══ KINEO-LUGAR-DO-ROTEIRO-1411 [CEO 14/11, lote 3 dos vídeos de teste: caso E] ═══════════════════════════════════════════════════════════
// Racetrack Playa (39c5cc92, sem gente): os planos 3 e 4 não diziam lugar e o motor fez do deserto um lago ártico. A regra do lugar já lia o
// roteiro colado (pedidoDoCliente cai no texto quando não há ideia) e as cenas (lugarDasCenas), mas não conhecia "lakebed" nem "playa", e
// "an empty, dry lakebed" (com vírgula) não casava. Aqui: (1) o lugar árido vira UM tipo só (desert, lakebed, dry lake, playa, salt flat,
// dunes): "the cracked lakebed at Racetrack Playa" é um lugar, não dois. Nada mais muda: a lista de sempre, a regra de UM lugar só e o
// rótulo. Interruptor LUGAR_DO_ROTEIRO_1411: 'off' = byte a byte o de antes. Ensaio: docs/ENSAIO-LUGAR-DO-ROTEIRO-1411.md.
export type ModoLugarDoRoteiro = 'off' | 'all'
export const LUGAR_DO_ROTEIRO_1411: ModoLugarDoRoteiro = 'all'
export const lugarDoRoteiroLigado = (modo: ModoLugarDoRoteiro = LUGAR_DO_ROTEIRO_1411) => modo === 'all'
const LUGAR_ARIDO_1411 = 'dry lakebed|lakebed|lake bed|dry lake|playa|salt flats?|sand dunes|dunes'
const LUGAR_NOME_1411 = LUGAR_NOME.replace(/^\(\?:/u, `(?:${LUGAR_ARIDO_1411}|`)
// A vírgula entre adjetivos ("an empty, dry lakebed") NÃO entrou: no ensaio, ela destravava o lugar do filme em 4 filmes e 2 saíam errados
// (o jardim do Éden ia para a cena de Lúcifer entre as estrelas; a rua da chuva ia para o gatinho já no cobertor). O Racetrack não precisa dela.
const LUGAR_RE_1411 = new RegExp(`(?<![\\p{L}])(?:at|in|inside|on|into|through|across|near|outside)\\s+((?:an?|the)\\s+(?:[\\p{L}'’-]+\\s+){0,4}?${LUGAR_NOME_1411})(?![\\p{L}])`, 'giu')
const LUGAR_SO_RE_1411 = new RegExp(`(?<![\\p{L}])${LUGAR_NOME_1411}(?![\\p{L}])`, 'giu')
const ARIDO_RE_1411 = new RegExp(`^(?:desert|${LUGAR_ARIDO_1411})$`, 'iu')
/** O TIPO do lugar (a regra pede UM tipo só): "coffeehouse" = "coffee shop"; com o interruptor, todo lugar árido = "desert". */
const tipoDoLugar = (w: string) => { const t = w.toLowerCase().replace('coffeehouse', 'coffee shop').replace('cafe', 'café'); return lugarDoRoteiroLigado() && ARIDO_RE_1411.test(t) ? 'desert' : t }
const lugarRe = () => (lugarDoRoteiroLigado() ? LUGAR_RE_1411 : LUGAR_RE)
const lugarSoRe = () => (lugarDoRoteiroLigado() ? LUGAR_SO_RE_1411 : LUGAR_SO_RE)
// ═══ fim KINEO-LUGAR-DO-ROTEIRO-1411 ═══

/** O lugar do pedido original ("a stylish Johannesburg coffee shop"), quando o pedido cita UM lugar só. null = nenhum, ou mais de um. */
export function lugarDoPedido(ideiaOriginal: unknown): string | null {
  const pedido = textoDoPedidoOriginal(ideiaOriginal)
  if (!pedido) return null
  const semProibicao = pedido.split(/(?<=[.!?\n])/u).filter((f) => !/^\s*(?:no|not|never|without|don't|do not)\b/iu.test(f)).join(' ')
  const nomes = new Set([...semProibicao.matchAll(lugarSoRe())].filter((m) => !aridoComNomeProprio(semProibicao, m)).map((m) => tipoDoLugar(m[0]))) // KINEO-LUGAR-DO-ROTEIRO-1411 — era: LUGAR_SO_RE e o mapa de sempre
  if (nomes.size !== 1) return null // nenhum lugar, ou a história passa por mais de um
  const m = new RegExp(lugarRe().source, 'iu').exec(semProibicao) // KINEO-LUGAR-DO-ROTEIRO-1411
  if (!m) return null
  const lugar = m[1].trim().replace(/^the\s+/iu, 'the ')
  return lugar.split(/\s+/u).length <= 7 ? lugar : null
}

/** KINEO-LUGAR-UNICO-1111 [CEO 11/11, vigia do filme 4eb0c0c9: floresta → biblioteca → parque sem motivo] — quando o pedido não cita lugar,
 *  o lugar do FILME: se as cenas (a ação de cada uma) citam UM tipo de lugar só e alguma cena não cita nenhum, esse lugar vale para todas
 *  (a cena sem lugar deixava a imagem-chave inventar o seu). Nenhum lugar, dois tipos de lugar, ou toda cena já com o seu: null. */
export function lugarDasCenas(acoes: readonly unknown[]): string | null {
  const textos = acoes.map((a) => String(a ?? '').split(/(?<=[.!?\n])/u).filter((f) => !/^\s*(?:no|not|never|without|don't|do not)\b/iu.test(f)).join(' '))
  const porCena = textos.map((t) => new Set([...t.matchAll(lugarSoRe())].filter((m) => !aridoComNomeProprio(t, m)).map((m) => tipoDoLugar(m[0])))) // KINEO-LUGAR-DO-ROTEIRO-1411 — era: LUGAR_SO_RE e o mapa de sempre
  const nomes = new Set(porCena.flatMap((s) => [...s]))
  if (nomes.size !== 1 || porCena.every((s) => s.size > 0)) return null
  for (const t of textos) {
    const m = new RegExp(lugarRe().source, 'iu').exec(t) // KINEO-LUGAR-DO-ROTEIRO-1411
    if (m) { const lugar = m[1].trim(); return lugar.split(/\s+/u).length <= 7 ? lugar : null }
  }
  return null
}

/** KINEO-LUGAR-DO-ROTEIRO-1411 v2 — "the Dunes casino", "Racetrack Playa": o lugar árido com MAIÚSCULA no meio da frase é nome próprio, não o tipo. */
function aridoComNomeProprio(t: string, m: RegExpMatchArray): boolean {
  if (!lugarDoRoteiroLigado() || !ARIDO_RE_1411.test(m[0]) || /^desert$/iu.test(m[0])) return false
  const antes = t.slice(0, m.index ?? 0).trimEnd()
  return /^\p{Lu}/u.test(m[0]) && antes.length > 0 && !/[.!?:\n]$/u.test(antes)
}

/**
 * KINEO-LUGAR-DO-ROTEIRO-1411 v2 [CEO 14/11, dry-run do Racetrack sem lugar] — a rota passa a lugarDasCenas a `description` de cada cena, que no
 * roteiro colado é a FALA ("Rocks in Death Valley move by themselves On an empty dry lakebed called Racetrack Playa…": dois lugares, null). Os
 * PLANOS (aiPrompt) dizem "the cracked lakebed". Esta é a 2ª leitura, só para o lugar ÁRIDO: os planos, com UM tipo de lugar e ele árido.
 * Qualquer outro lugar fica com a regra de sempre (ler os planos para todo lugar mudaria 189 dos 516 filmes de 30 dias, sem ensaio).
 */
export function lugarAridoDosPlanos(planos: readonly unknown[]): string | null {
  if (!lugarDoRoteiroLigado()) return null
  const lugar = lugarDasCenas(planos)
  return lugar && new RegExp(`(?:^|\\s)(?:desert|${LUGAR_ARIDO_1411})$`, 'iu').test(lugar) ? lugar : null
}

/** KINEO-LUGAR-UNICO-1111 [CEO 11/11] — o lugar do FILME tem rótulo próprio: "as the customer asked" seria falso quando o cliente não pediu lugar. */
export const MARCA_LUGAR_DO_FILME = 'Setting of this film:'
export function comLugarDoFilme(prompt: string, lugar: string | null): string {
  if (!lugar || prompt.includes(MARCA_LUGAR_DO_FILME) || prompt.includes(MARCA_LUGAR_NO_PROMPT)) return prompt
  return `${prompt.replace(/\s+$/u, '')} ${MARCA_LUGAR_DO_FILME} ${lugar.replace(/[.\s]+$/u, '')}.`
}

/** O prompt da cena com o lugar do pedido no fim. Sem lugar, ou já com ele: o mesmo prompt. */
export function comLugarDoPedido(prompt: string, lugar: string | null): string {
  if (!lugar || prompt.includes(MARCA_LUGAR_NO_PROMPT)) return prompt
  return `${prompt.replace(/\s+$/u, '')} ${MARCA_LUGAR_NO_PROMPT} ${lugar.replace(/[.\s]+$/u, '')}.`
}
