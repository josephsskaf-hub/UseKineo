// ═══ KINEO-PARCEIRO-EYEBIBLE-2-1410 — ELENCO FIXO: o capitão é o MESMO homem nas 7 cenas ═══
//
// CASO (Robert/EyeBible, Seedance 1.5, 14/10, render c9844e94): drama com três papéis que falam (YOUNG SOLDIER, CAPTAIN,
// WOUNDED SOLDIER). A ficha de personagem da estrada clássica (deriveStoryCharacter, KINEO-SEEDANCE-FICHA-2026-09-15) só
// reconhece UM protagonista DESCRITO pelo autor ("a middle-aged man with a gray beard…", "Benny, the tiniest bunny"); o
// roteiro do Robert não descreve ninguém, a ficha saiu null e cada cena reinventou o capitão (o still FLUX de cada cena é
// um pedido independente — continuidade só existe se estiver escrita no prompt).
//
// O QUE ISTO FAZ: lê os papéis que FALAM (a mesma regra que tira o rótulo da voz: lib/scriptParser papeisQueFalam) e dá a
// cada um UMA ficha de aparência determinística (idade pelo papel/qualificador, gênero pelo papel ou pelos pronomes das
// frases que o citam, cabelo/rosto/porte distintos entre os papéis, figurino da época que o roteiro sugere). A ficha entra
// só nas cenas que citam o papel (sceneStyle.comElencoNaCena). Zero chamada paga, zero modelo: mesmo roteiro → mesmo elenco.
// Roteiro sem papel que fala → [] e nada muda.

import { papeisQueFalam } from '@/lib/scriptParser'
import type { PapelDoElenco } from '@/lib/cinematic/sceneStyle'

const FEMININO = /\b(?:woman|women|girl|mother|mom|mum|queen|lady|princess|wife|sister|daughter|grandmother|grandma|aunt|nun|actress|waitress|heroine|bride|maid|widow|empress|duchess|madam|mrs|ms|miss)\b/
const MASCULINO = /\b(?:man|men|boy|father|dad|king|lord|prince|husband|brother|son|grandfather|grandpa|uncle|monk|priest|actor|hero|groom|widower|emperor|duke|sir|mr)\b/
const CRIANCA = /\b(?:kid|child|boy|girl|little|toddler)\b/
const JOVEM = /\b(?:young|younger|teen|teenage|rookie|new|junior|private|cadet|apprentice)\b/
const VELHO = /\b(?:old|older|elderly|aged|grand|grandmother|grandfather|grandma|grandpa|veteran|senior|ancient)\b/
const LIDER = /\b(?:captain|commander|general|chief|sergeant|officer|colonel|major|lieutenant|king|queen|emperor|doctor|professor|boss|leader|master|father|mother)\b/

const CABELO = ['short dark hair', 'close-cropped brown hair', 'shaggy black hair', 'short sandy-blond hair', 'wavy chestnut hair', 'cropped reddish-brown hair']
const ROSTO_HOMEM = ['a short dark beard', 'a thick mustache', 'light stubble', 'a clean-shaven face', 'a full brown beard', 'a narrow goatee']
const ROSTO = ['a thin scar across the left cheek', 'deep-set eyes and a strong square jaw', 'a crooked nose and high cheekbones', 'freckles and a narrow face', 'heavy eyebrows and a broad face', 'a dimpled chin and sharp eyes']
const PORTE = ['broad-shouldered build', 'lean wiry build', 'stocky build', 'tall slender build', 'compact muscular build', 'average build']

/** FNV-1a de 32 bits: o mesmo papel escolhe sempre o mesmo traço. */
function hash(texto: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h >>> 0
}

/** Escolhe da lista a opção do hash; se outro papel já levou, a próxima livre — dois papéis nunca com o mesmo traço. */
function escolhe(lista: string[], semente: number, usados: Set<string>): string {
  for (let i = 0; i < lista.length; i++) {
    const op = lista[(semente + i) % lista.length]
    if (!usados.has(op)) { usados.add(op); return op }
  }
  return lista[semente % lista.length]
}

/** Figurino: armadura/farda SÓ em história militar (soldado, exército, batalha…); a época vem das armas que o roteiro cita. */
function figurinoDoRoteiro(texto: string): string {
  const militar = /\b(?:soldiers?|army|armies|war|wars|battle|battles|battlefield|troops|enemy|enemies|legions?|knights?|warriors?|platoon|regiment|siege)\b/.test(texto)
  if (militar && /\b(?:arrows?|shields?|swords?|spears?|armou?r|knights?|castles?|legions?|chariots?|archers?)\b/.test(texto)) return 'battle-worn armor and a helmet'
  if (militar && /\b(?:rifles?|guns?|trench(?:es)?|tanks?|grenades?|helicopters?|bullets?|uniforms?)\b/.test(texto)) return 'a battle-worn military uniform and a helmet'
  return 'the same outfit'
}

/** Gênero do papel: o próprio rótulo manda; senão, os pronomes das frases que citam o papel; empate = sem gênero. */
function generoDoPapel(papel: string, frases: string[]): 'woman' | 'man' | null {
  if (FEMININO.test(papel)) return 'woman'
  if (MASCULINO.test(papel)) return 'man'
  const nucleo = papel.split(' ').pop() ?? papel
  const re = new RegExp(`\\b${nucleo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
  let ela = 0
  let ele = 0
  frases.forEach((f, i) => {
    if (!re.test(f)) return
    const janela = `${f} ${frases[i + 1] ?? ''}`
    ela += (janela.match(/\b(?:she|her|hers|herself)\b/g) ?? []).length
    ele += (janela.match(/\b(?:he|him|his|himself)\b/g) ?? []).length
  })
  return ela > ele ? 'woman' : ele > ela ? 'man' : null
}

/** O elenco fixo do roteiro: um papel por voz que fala, com a ficha de aparência que vai em toda cena que o cita. */
export function derivarElenco(script: string): PapelDoElenco[] {
  const bruto = (script || '').slice(0, 8000)
  const papeis = papeisQueFalam(bruto).slice(0, 6)
  if (papeis.length === 0) return []
  const texto = bruto.toLowerCase().replace(/[’‘]/g, "'")
  const frases = texto.split(/(?<=[.!?…])\s+|\n+/)
  const figurino = figurinoDoRoteiro(texto)
  const usados = new Set<string>()
  return papeis.map((rotulo) => {
    const papel = rotulo.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^\p{L}\p{N}' -]+/gu, ' ').replace(/\s+/g, ' ').trim()
    const h = hash(papel)
    const genero = generoDoPapel(papel, frases)
    const quem = genero === 'woman' ? 'a woman' : genero === 'man' ? 'a man' : 'a person'
    const pron = genero === 'woman' ? 'her' : genero === 'man' ? 'his' : 'their'
    const idade = CRIANCA.test(papel) ? 'a child of about ten' : JOVEM.test(papel) ? `${quem} in ${pron} early twenties`
      : VELHO.test(papel) ? `${quem} in ${pron} sixties` : LIDER.test(papel) ? `${quem} in ${pron} forties` : `${quem} in ${pron} thirties`
    const tracos = [
      escolhe(PORTE, h, usados),
      VELHO.test(papel) ? 'gray hair' : escolhe(CABELO, h >>> 3, usados),
      ...(genero === 'man' && !CRIANCA.test(papel) ? [VELHO.test(papel) ? 'a short gray beard' : escolhe(ROSTO_HOMEM, h >>> 6, usados)] : []),
      escolhe(ROSTO, h >>> 9, usados),
    ]
    return { papel, ficha: `${idade}, ${tracos.join(', ')}, wearing ${figurino}` }
  })
}
