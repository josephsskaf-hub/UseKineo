// KINEO-K4-SUJEITO-0111 [TRAVA 8.2 — vai do fundador 01/11 "vai tudo" (melhorias)] — O SUJEITO OBRIGATÓRIO DO FILME KLING 4.
//
// Revisor de vídeos, 01/11 (docs/revisao-videos/2026-11-01.md e FILA-DEFEITOS.md, CENA_FORA_DO_PEDIDO): no filme grátis de 15 s do
// Kling 4 (multi_prompt de 3 cenas) o tema central do pedido não aparecia em quadro nenhum —
//   · "o avião C-54 que sumiu": o avião nunca aparece; 2 homens de terno em 5 de 8 quadros (1º filme; a cliente pagou mesmo assim);
//   · "criança com caneta 3D": a criança nunca aparece;
//   · "vida sob o gelo": o desfecho (a vida debaixo do gelo) não aparece.
// O elenco (elencoEpoca/folhaDePersonagem) cuida de GENTE nomeada; máquina, bicho e objeto central não tinham dono — e veículo é
// sujeito, nunca pessoa (KINEO-ELENCO-AVIAO-LUGAR-0111 já impede "Skymaster" de virar homem de terno; faltava o avião ENTRAR).
//
// Aqui, puro e determinístico (sem rede, sem custo), ANTES do POST pago:
//   1. sujeitoObrigatorio — do PEDIDO (e, para modelo de veículo, da fala) sai o sujeito central: veículo, criatura, criança (com o
//      objeto que segura) ou objeto, por um léxico curto em inglês/português/espanhol. Nome próprio de gente NUNCA vira sujeito
//      (pessoa real não ganha "clearly visible" aqui — essa é a regra do elenco); pedido sem objeto central = null, nada muda.
//   2. exigirSujeitoNoKling4 — se nenhum prompt do multi_prompt mostra o sujeito, a cena cuja FALA o cita (senão a última, o
//      desfecho) ganha "Main subject clearly visible in frame: …" logo depois do meio, dentro do orçamento de 464 code points da
//      camada (o mesmo de cenaKling4). Corrige, nunca bloqueia. A cena corrigida que tinha imagem-chave do meio perde a imagem
//      (a imagem foi desenhada sem o sujeito e venceria o texto); a imagem de abertura nunca é tirada — a cena 1 só é escolhida
//      sem ela. A fala nunca é tocada ("Use my script as is" continua literal).
//   3. O relato (sujeito, origem, já presente, corrigido, cena, imagem tirada) vai no claim, em kling4_trial.sujeito_obrigatorio.
import { KLING4_ORCAMENTO_DA_CAMADA, eixoCurtoKling4 } from '@/lib/cinematic/cenaKling4'

export const SUJEITO_K4_VERSAO = 'k4_sujeito_0111_v1' as const

export type TipoDoSujeito = 'veiculo' | 'criatura' | 'pessoa' | 'objeto'
interface Entrada { grupo: string; tipo: TipoDoSujeito; en: string; re: RegExp }

const p = (fonte: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${fonte})(?![\\p{L}\\p{N}])`, 'iu')

// O léxico: o que o cliente escreve (en/pt/es) → a frase em inglês que o motor desenha. O grupo é a família de palavras que,
// em inglês, prova que o prompt da cena já mostra o sujeito.
const LEXICO: ReadonlyArray<Entrada> = [
  { grupo: 'aircraft', tipo: 'veiculo', en: 'airplane', re: p('airplanes?|aeroplanes?|plane|aircraft|airliners?|jetliners?|bombers?|seaplanes?|flights?|avi[aã]o|avi[õo]es|aeronaves?|v[ôo]os?|avi[óo]n(?:es)?|avionetas?|vuelos?|flugzeug') },
  { grupo: 'helicopter', tipo: 'veiculo', en: 'helicopter', re: p('helicopters?|helic[óo]pteros?') },
  { grupo: 'submarine', tipo: 'veiculo', en: 'submarine', re: p('submarines?|submarinos?') },
  { grupo: 'watercraft', tipo: 'veiculo', en: 'ship', re: p('ships?|shipwrecks?|vessels?|ocean liners?|galleons?|warships?|navios?|naufr[áa]gios?|gale[õo]es|buques?|barcos?|boats?|veleiros?|sailboats?|yachts?|iates?') },
  { grupo: 'spacecraft', tipo: 'veiculo', en: 'spacecraft', re: p('rockets?|spacecraft|spaceships?|space probes?|foguetes?|naves? espaciais?|nave espacial|cohetes?|sondas? espaciais?|sondas? espaciales?') },
  { grupo: 'rover', tipo: 'veiculo', en: 'rover', re: p('rovers?|jipe-rob[ôo]|veh[íi]culo explorador') },
  { grupo: 'train', tipo: 'veiculo', en: 'train', re: p('trains?|locomotives?|trens?|trem|tren(?:es)?|locomotivas?|locomotoras?') },
  { grupo: 'car', tipo: 'veiculo', en: 'car', re: p('cars?|automobiles?|carros?|autom[óo]veis|autom[óo]vel|coches?|carrinhos?') },
  { grupo: 'truck', tipo: 'veiculo', en: 'truck', re: p('trucks?|caminh[ãa]o|caminh[õo]es|cami[óo]n(?:es)?') },
  { grupo: 'bus', tipo: 'veiculo', en: 'bus', re: p('bus(?:es)?|[ôo]nibus|autob[úu]s(?:es)?') },
  { grupo: 'motorcycle', tipo: 'veiculo', en: 'motorcycle', re: p('motorcycles?|motorbikes?|motos?|motocicletas?') },
  { grupo: 'bicycle', tipo: 'veiculo', en: 'bicycle', re: p('bicycles?|bikes?|bicicletas?') },
  { grupo: 'balloon', tipo: 'veiculo', en: 'hot air balloon', re: p('hot air balloons?|bal[ãa]o de ar quente|globo aerost[áa]tico|zeppelins?|dirig[íi]veis|dirig[íi]vel|airships?') },
  { grupo: 'under_ice_life', tipo: 'criatura', en: 'living creatures swimming beneath the ice', re: p('(?:life|creatures?|vida|criaturas?|seres vivos)\\s+(?:under|beneath|below|sob|debaixo d[oa]|embaixo d[oa]|abaixo d[oa]|bajo|debajo del?)\\s+(?:the\\s+|o\\s+|a\\s+|el\\s+|la\\s+)?(?:ice|gelo|hielo|frozen\\s+\\p{L}+|ice\\s+sheet)') },
  { grupo: 'whale', tipo: 'criatura', en: 'whale', re: p('whales?|baleias?|ballenas?') },
  { grupo: 'shark', tipo: 'criatura', en: 'shark', re: p('sharks?|tubar[õo]es|tubar[ãa]o|tiburones|tibur[óo]n') },
  { grupo: 'squid', tipo: 'criatura', en: 'giant squid', re: p('giant squids?|squids?|lulas? gigantes?|lulas?|calamar(?:es)? gigantes?|calamar(?:es)?') },
  { grupo: 'octopus', tipo: 'criatura', en: 'octopus', re: p('octopus(?:es)?|octopi|polvos?|pulpos?') },
  { grupo: 'dinosaur', tipo: 'criatura', en: 'dinosaur', re: p('dinosaurs?|dinossauros?|dinosaurios?|t-?rex') },
  { grupo: 'dragon', tipo: 'criatura', en: 'dragon', re: p('dragons?|drag[õo]es|drag[ãa]o|dragones|drag[óo]n') },
  { grupo: 'robot', tipo: 'criatura', en: 'robot', re: p('robots?|rob[ôo]s?') },
  { grupo: 'alien', tipo: 'criatura', en: 'alien', re: p('aliens?|alien[íi]genas?|extraterrestres?') },
  { grupo: 'child', tipo: 'pessoa', en: 'child', re: p('child(?:ren)?|kids?|little (?:boy|girl)s?|toddlers?|crian[çc]as?|menin[oa]s?|beb[êe]s?|ni[ñn][oa]s?|nen[ea]s?') }, // "boy/girl/garota/chica" ficam de fora: muitas vezes é gente adulta (romance) — nunca "a child" num pedido adulto
  { grupo: 'diver', tipo: 'pessoa', en: 'scuba diver', re: p('divers?|scuba divers?|mergulhador(?:a|es)?|buceador(?:a|es)?|buzos?') },
  { grupo: 'astronaut', tipo: 'pessoa', en: 'astronaut', re: p('astronauts?|astronautas?|cosmonauts?') },
  { grupo: 'pen3d', tipo: 'objeto', en: '3D printing pen', re: p('3d pens?|3d printing pens?|caneta(?:s)? 3d|pluma(?:s)? 3d|bol[íi]grafo(?:s)? 3d|l[áa]piz 3d') },
  { grupo: 'treasure', tipo: 'objeto', en: 'treasure chest', re: p('treasure chests?|treasures?|ba[úu] do tesouro|tesouros?|tesoros?|cofre del tesoro') },
  { grupo: 'meteorite', tipo: 'objeto', en: 'meteorite', re: p('meteorites?|meteoritos?|asteroids?|aster[óo]ides?') },
  { grupo: 'sword', tipo: 'objeto', en: 'sword', re: p('swords?|espadas?') },
  { grupo: 'crown', tipo: 'objeto', en: 'crown', re: p('crowns?|coroas?|coronas?') },
  { grupo: 'statue', tipo: 'objeto', en: 'statue', re: p('statues?|est[áa]tuas?') },
]

// O que, em inglês, prova que o prompt da cena já mostra o sujeito (o prompt do descritor é sempre inglês).
const CHAVES: Readonly<Record<string, RegExp>> = {
  aircraft: p('airplanes?|aeroplanes?|planes?|aircraft|airliners?|jetliners?|jets?|bombers?|seaplanes?|fuselage'),
  helicopter: p('helicopters?'), submarine: p('submarines?'),
  watercraft: p('ships?|shipwrecks?|vessels?|liners?|galleons?|warships?|boats?|sailboats?|yachts?|hull'),
  spacecraft: p('rockets?|spacecraft|spaceships?|probes?'), rover: p('rovers?'),
  train: p('trains?|locomotives?'), car: p('cars?|automobiles?'), truck: p('trucks?'), bus: p('bus(?:es)?'),
  motorcycle: p('motorcycles?|motorbikes?'), bicycle: p('bicycles?|bikes?'), balloon: p('balloons?|zeppelins?|airships?'),
  under_ice_life: p('(?:creatures?|life|fish|animals?|organisms?|krill|jellyfish)\\b[^.]{0,60}\\b(?:beneath|under|below)\\b[^.]{0,30}\\bice'),
  whale: p('whales?'), shark: p('sharks?'), squid: p('squids?'), octopus: p('octopus(?:es)?|octopi'), dinosaur: p('dinosaurs?|t-?rex'),
  dragon: p('dragons?'), robot: p('robots?|androids?'), alien: p('aliens?|extraterrestrials?'),
  child: p('child(?:ren)?|kids?|boys?|girls?|toddlers?'), diver: p('divers?'), astronaut: p('astronauts?|cosmonauts?'),
  pen3d: p('3d (?:printing )?pens?'), treasure: p('treasures?|chests?'), meteorite: p('meteorites?|asteroids?'),
  sword: p('swords?'), crown: p('crowns?'), statue: p('statues?'),
}

// Modelo de veículo: "C-54 Skymaster", "B-29", "Boeing 747", "USS Thresher". Só vale com contexto de avião/navio no texto.
const MODELO_RE = /(?<![\p{L}\p{N}-])((?:\p{Lu}{1,3}-\d{1,4}\p{Lu}?)|(?:Boeing|Airbus|Douglas|Lockheed|Cessna|Antonov|Tupolev|Ilyushin|Sikorsky|Junkers|Messerschmitt)\s+[\p{L}\d-]+|(?:USS|HMS|RMS|SS)\s+\p{Lu}\p{Ll}+)(?:\s+(\p{Lu}\p{Ll}{3,}))?/u
const CONTEXTO_AEREO_RE = p('flights?|passengers?|pilots?|airfield|runway|airport|crash(?:ed)?|vanished over|disappeared over|cockpit|voo|passageiros|piloto|pista|aeroporto|vuelo|pasajeros|aeropuerto')
const CONTEXTO_NAVAL_RE = p('sank|sunk|sinking|navy|crew|sea|ocean|afundou|naufragou|marinha|tripula[çc][ãa]o|hundi[óo]|armada|tripulaci[óo]n')
const NAO_NOME_DE_MODELO = new Set(['The', 'This', 'That', 'And', 'But', 'When', 'Then', 'With', 'From', 'Over', 'Into', 'After', 'Before'])

export interface SujeitoObrigatorio {
  /** O que o motor tem de desenhar, em inglês: "a C-54 Skymaster airplane", "a child holding a 3D printing pen". */
  frase: string
  tipo: TipoDoSujeito
  grupos: string[]
  /** Fichas extras (modelo/nome) que também provam presença: "C-54", "Skymaster". */
  tokens: string[]
  origem: 'pedido' | 'fala'
}

const limpa = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()
const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const artigo = (s: string) => (/^[aeiou]/i.test(s) && !/^(?:uni|eu|one)/i.test(s) ? 'an' : 'a')

function primeiroDoLexico(texto: string): Array<{ e: Entrada; pos: number }> {
  const achados: Array<{ e: Entrada; pos: number }> = []
  for (const e of LEXICO) { const m = e.re.exec(texto); if (m) achados.push({ e, pos: m.index }) }
  // "life under the ice" vence "ice"/"under"; empate de posição: a entrada mais longa (frase) primeiro.
  return achados.sort((a, b) => a.pos - b.pos)
}

function modeloDoVeiculo(texto: string, contexto: string): { tokens: string[]; rotulo: string; grupo: 'aircraft' | 'watercraft' } | null {
  const m = MODELO_RE.exec(texto)
  if (!m) return null
  const naval = /^(?:USS|HMS|RMS|SS)\s/.test(m[1]) || (CONTEXTO_NAVAL_RE.test(contexto) && !CONTEXTO_AEREO_RE.test(contexto))
  if (!naval && !CONTEXTO_AEREO_RE.test(contexto) && !LEXICO[0].re.test(contexto)) return null
  const nome = m[2] && !NAO_NOME_DE_MODELO.has(m[2]) ? m[2] : ''
  return { tokens: [m[1], ...(nome ? [nome] : [])], rotulo: nome ? `${m[1]} ${nome}` : m[1], grupo: naval ? 'watercraft' : 'aircraft' }
}

/**
 * O sujeito central do pedido (null = pedido sem veículo/criatura/criança/objeto central, ou só gente nomeada — nada muda).
 * A fala só entra para achar o MODELO do veículo ("C-54 Skymaster") ou, sem nada no pedido, um modelo de veículo com contexto.
 */
export function sujeitoObrigatorio(args: { pedido: string; falas: ReadonlyArray<string>; pessoaPermitida?: boolean }): SujeitoObrigatorio | null {
  const pedido = limpa(String(args.pedido ?? '').replace(/^\s*\[Idea:\s*([^\]]*)\][\s\S]*$/i, '$1'))
  const falas = limpa((args.falas ?? []).join(' '))
  const tudo = `${pedido} ${falas}`
  // romance/pedido adulto (pessoaPermitida=false): criança nunca vira sujeito obrigatório.
  const achados = primeiroDoLexico(pedido).filter((a) => args.pessoaPermitida !== false || a.e.tipo !== 'pessoa')
  const modelo = modeloDoVeiculo(pedido, tudo) ?? modeloDoVeiculo(falas, tudo)
  const primeiro = achados[0]
  if (!primeiro) {
    if (!modelo) return null
    const en = modelo.grupo === 'aircraft' ? 'airplane' : 'ship'
    return { frase: `${artigo(modelo.rotulo)} ${modelo.rotulo} ${en}`, tipo: 'veiculo', grupos: [modelo.grupo], tokens: modelo.tokens, origem: modeloDoVeiculo(pedido, tudo) ? 'pedido' : 'fala' }
  }
  const e = primeiro.e
  if (e.tipo === 'veiculo' && modelo) {
    return { frase: `${artigo(modelo.rotulo)} ${modelo.rotulo} ${e.en}`, tipo: 'veiculo', grupos: [e.grupo], tokens: modelo.tokens, origem: 'pedido' }
  }
  if (e.tipo === 'pessoa') {
    // criança COM o objeto ("criança com caneta 3D", "a child … with a 3D pen"): os dois têm de aparecer juntos.
    const objeto = achados.find((a) => a.e.tipo === 'objeto' && a.pos > primeiro.pos)
    if (objeto) return { frase: `${artigo(e.en)} ${e.en} holding ${artigo(objeto.e.en)} ${objeto.e.en}`, tipo: 'pessoa', grupos: [e.grupo, objeto.e.grupo], tokens: [], origem: 'pedido' }
  }
  return { frase: e.grupo === 'under_ice_life' ? e.en : `${artigo(e.en)} ${e.en}`, tipo: e.tipo, grupos: [e.grupo], tokens: [], origem: 'pedido' }
}

/** O prompt (inglês) já mostra o sujeito? Todos os grupos (criança E caneta) ou uma ficha do modelo ("C-54"). */
export function promptMostraOSujeito(prompt: string, s: SujeitoObrigatorio): boolean {
  const t = String(prompt ?? '')
  if (s.tokens.some((tk) => new RegExp(`(?<![\\p{L}\\p{N}])${escapa(tk)}(?![\\p{L}\\p{N}])`, 'iu').test(t))) return true
  return s.grupos.every((g) => CHAVES[g]?.test(t))
}

/** A fala cita o sujeito? (qualquer língua do léxico, ou o modelo). */
function falaCita(fala: string, s: SujeitoObrigatorio): boolean {
  const t = String(fala ?? '')
  if (s.tokens.some((tk) => t.includes(tk))) return true
  return LEXICO.some((e) => e.grupo === s.grupos[0] && e.re.test(t))
}

const TAIL_RE = /(?:,\s*|\s)(?:no readable text|No readable text)|\sMouth closed, no speaking\./
const len = (s: string) => Array.from(s).length
const corta = (s: string, n: number) => Array.from(s).slice(0, Math.max(0, n)).join('')

/** "Main subject clearly visible in frame: <frase>." logo depois do meio, dentro do orçamento da camada (eixo sai antes do corpo). */
export function comSujeitoNaCena(prompt: string, frase: string, index: number, orcamento = KLING4_ORCAMENTO_DA_CAMADA): string {
  const clausula = `Main subject clearly visible in frame: ${frase}. `
  const medio = /^[^.]+\. /.exec(prompt)?.[0] ?? ''
  let resto = prompt.slice(medio.length)
  const junta = () => `${medio}${clausula}${resto}`
  if (len(junta()) <= orcamento) return junta()
  resto = resto.replace(`${eixoCurtoKling4(index)}. `, '')
  if (len(junta()) <= orcamento) return junta()
  const m = TAIL_RE.exec(resto)
  const cauda = m ? resto.slice(m.index) : ''
  const corpo = m ? resto.slice(0, m.index) : resto
  const cabe = orcamento - len(medio + clausula + cauda) - 1
  let curto = corta(corpo, cabe)
  const fronteira = Math.max(curto.lastIndexOf('. '), curto.lastIndexOf(', '))
  curto = (fronteira > cabe * 0.5 ? curto.slice(0, fronteira) : curto.replace(/\s+\S*$/, '')).replace(/[\s,;:.]+$/, '')
  resto = `${curto}${curto ? '.' : ''}${cauda}`
  return corta(junta(), orcamento)
}

export interface RelatoSujeitoK4 {
  versao: typeof SUJEITO_K4_VERSAO
  sujeito: string | null
  tipo: TipoDoSujeito | null
  origem: 'pedido' | 'fala' | null
  ja_presente: boolean
  corrigido: boolean
  /** Cena corrigida, 1-based (null = nada corrigido). */
  cena: number | null
  keyframe_removido: boolean
}

/** A checagem antes do POST pago do Kling 4: o sujeito em pelo menos 1 cena do multi_prompt — corrige, nunca bloqueia. */
export function exigirSujeitoNoKling4(args: {
  pedido: string; falas: ReadonlyArray<string>; prompts: ReadonlyArray<string>; stills?: ReadonlyArray<string | null>; pessoaPermitida?: boolean
}): { prompts: string[]; stills: (string | null)[]; relato: RelatoSujeitoK4 } {
  const prompts = [...args.prompts]
  const stills = [...(args.stills ?? [])]
  const s = sujeitoObrigatorio({ pedido: args.pedido, falas: args.falas, pessoaPermitida: args.pessoaPermitida })
  const relato: RelatoSujeitoK4 = { versao: SUJEITO_K4_VERSAO, sujeito: s?.frase ?? null, tipo: s?.tipo ?? null, origem: s?.origem ?? null, ja_presente: false, corrigido: false, cena: null, keyframe_removido: false }
  if (!s || prompts.length === 0) return { prompts, stills, relato }
  if (prompts.some((q) => promptMostraOSujeito(q, s))) { relato.ja_presente = true; return { prompts, stills, relato } }
  const n = prompts.length
  const pelaFala = prompts.map((_, i) => i).filter((i) => falaCita(args.falas[i] ?? '', s))
  const ordem = [...pelaFala, n - 1, ...prompts.map((_, i) => i)].filter((i, k, a) => a.indexOf(i) === k)
  // A imagem de abertura nunca sai (sem ela o filme todo muda de motor): a cena 1 com imagem só é escolhida se não houver outra.
  const alvo = ordem.find((i) => !(i === 0 && stills[0])) ?? ordem[0]
  prompts[alvo] = comSujeitoNaCena(prompts[alvo], s.frase, alvo)
  if (alvo > 0 && stills[alvo]) { stills[alvo] = null; relato.keyframe_removido = true }
  relato.corrigido = true
  relato.cena = alvo + 1
  return { prompts, stills, relato }
}
