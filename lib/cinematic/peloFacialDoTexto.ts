// KINEO-PELO-FACIAL-DO-TEXTO-1211 [CEO 12/11 02:25, "as DUAS camadas"] — a 1ª camada do pelo facial: quando o PEDIDO ou o ROTEIRO citam barba,
// bigode ou barbeado de um personagem, isso entra na ficha dele ANTES da folha (a folha nasce da ficha, e toda cena repete a ficha). Quando o texto
// não cita, vale a 2ª camada (KINEO-PELO-FACIAL-1211, lib/cinematic/elencoTrava.ts: a leitura da folha com visão trava o que o motor desenhou).
// Nada de "barbeado por padrão": rasparia a figura histórica de barba conhecida (CEO 12/11, cancelado). De quem é a menção: a frase tem de citar o
// NOME do personagem; com um humano só no elenco, qualquer menção é dele. Puro: sem rede. Guardião: scripts/test-pelo-facial-do-texto-1211.mjs.
import type { FichaDePersonagem } from './folhaDePersonagem'

const PELO_RE = /(?<![\p{L}])(?:(?:thick|thin|long|short|grey|gray|white|black|dark|bushy|neat|curled|curly|handlebar|full|trimmed|red|brown|blond|blonde|pointed|small|bristly|waxed)\s+){0,3}(?:beard|moustache|mustache|goatee|stubble|sideburns)(?![\p{L}])|(?<![\p{L}])clean[- ]shaven(?![\p{L}])|(?<![\p{L}])beardless(?![\p{L}])/iu
export const MARCA_PELO_DO_TEXTO = 'facial hair as written:'

/** O pelo facial que o texto dá a ESTE personagem ("a thick grey beard" → "thick grey beard"); null = o texto não cita. */
export function peloFacialDoTexto(texto: unknown, nome: string, unicoHumano: boolean): string | null {
  const frases = String(texto ?? '').replace(/\s+/gu, ' ').split(/(?<=[.!?…])\s+/u)
  const palavrasDoNome = String(nome ?? '').split(/\s+/u).filter((w) => /^\p{Lu}\p{Ll}{2,}/u.test(w))
  for (const f of frases) {
    const m = PELO_RE.exec(f)
    if (!m) continue
    if (!unicoHumano && !palavrasDoNome.some((w) => new RegExp(`(?<![\\p{L}])${w}(?![\\p{L}])`, 'u').test(f))) continue
    return m[0].toLowerCase().trim()
  }
  return null
}

/** O elenco com o pelo facial do texto na ficha de cada humano que o texto cita. Sem menção: o mesmo elenco, ficha por ficha, byte a byte. */
export function comPeloFacialDoTexto(elenco: readonly FichaDePersonagem[], texto: unknown): FichaDePersonagem[] {
  const humanos = elenco.filter((f) => f.tipo === 'humano').length
  return elenco.map((f) => {
    if (f.tipo !== 'humano' || f.canonica.includes(MARCA_PELO_DO_TEXTO)) return f
    const pelo = peloFacialDoTexto(texto, f.nome, humanos === 1)
    if (!pelo) return f
    const [desc, ...resto] = f.canonica.split('; ')
    return { ...f, canonica: [desc, `${MARCA_PELO_DO_TEXTO} ${pelo}`, ...resto].join('; ') }
  })
}
