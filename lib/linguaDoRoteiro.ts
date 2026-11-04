// KINEO-ROTEIRO-NA-LINGUA-0411 [fundador 03/11: "já pode arrumar"] — o roteiro nasce na língua de quem escreveu.
//
// Caso de 04/11: "Crie um vídeo infantil 3D…" (BR) e "Crea un YouTube Short…" (ES) saíram com roteiro em inglês. O seletor fica em
// 'en' por padrão e o escritor obedecia ao padrão; só depois o compose olhava o texto, que já estava em inglês. Em 5 dias: português,
// espanhol, italiano e árabe. A fala já tinha a regra certa (resolveNarrationLanguage); faltava a mesma regra ANTES de escrever.
// O CONSERTO É NA PORTA: o clique do Studio manda ?language=, o mesmo caminho das páginas de idioma. Nenhum arquivo de motor muda.
//
// A ORDEM:
//   1. escolha explícita da pessoa (o seletor foi tocado, ou a página pediu a língua) vence sempre;
//   2. língua nomeada no pedido: "Crie um vídeo em inglês" continua inglês, "narration in Spanish" passa a espanhol;
//   3. a língua do texto, pela regra da prévia (previaNarrationLanguage): latino ≥ 8 palavras e evidência clara, ou escrita não latina;
//   4. nada claro: o que veio (o padrão). Texto curto ("Los Angeles wildfires") fica como está.
//
// O QUE NÃO MUDA: segundos, régua de palavras, custo e motor. A língua só escolhe em qual língua o escritor escreve; as réguas por língua
// são as mesmas de quem já escolhe português ou espanhol hoje. Motor de voz própria (Kling, H3, Seedance 2.5) só fala en/pt/es: com outra
// língua detectada ele segue em inglês como antes, porque a rota recusaria o filme (language_not_supported_by_engine).
// LIB PURA (sem banco, sem rede).
import { isHollywoodLanguage, narrationLanguage, type NarrationLanguage } from '@/lib/textLanguage'
import { previaNarrationLanguage } from '@/lib/scenePreviewLanguage'

export const LINGUA_DO_ROTEIRO_VERSAO = 'roteiro_na_lingua_0411_v1' as const

const NOMES: ReadonlyArray<readonly [NarrationLanguage, string]> = [
  ['en', 'english|ingl[eê]s|ingl[eé]s'],
  ['pt', 'portuguese|portugu[eê]s|portugu[eé]s'],
  ['es', 'spanish|espanhol|espa[nñ]ol'],
  ['fr', 'french|franc[eê]s|franc[eé]s'],
  ['de', 'german|alem[aã]o|alem[aá]n'],
  ['it', 'italian|italiano'],
  ['hi', 'hindi'],
  ['ar', 'arabic|[aá]rabe'],
  ['ja', 'japanese|japon[eê]s|japon[eé]s'],
  ['ko', 'korean|coreano'],
  ['ru', 'russian|russo|ruso'],
  ['tr', 'turkish|turco'],
  ['id', 'indonesian|indon[eé]sio|indonesio'],
  ['zh', 'mandarin|chinese|chin[eê]s|chino'],
  ['nl', 'dutch|holand[eê]s|holand[eé]s'],
  ['pl', 'polish|polon[eê]s|polaco'],
  ['th', 'thai|tailand[eê]s|tailand[eé]s'],
  ['vi', 'vietnamese|vietnamita'],
  ['uk', 'ukrainian|ucraniano'],
]
const CODIGO_DO_NOME = (nome: string): NarrationLanguage | null => {
  for (const [codigo, formas] of NOMES) if (new RegExp(`^(?:${formas})$`, 'iu').test(nome)) return codigo
  return null
}
const TODOS = NOMES.map(([, formas]) => formas).join('|')
const PECA = 'v[ií]deo|video|film\\w*|pel[ií]cula|short|reel|clip\\w*|narra\\w*|locu\\w*|voice\\w*|voz|fala\\w*|spoken|speak\\w*|habla\\w*|idioma|l[ií]ngua|lengua|language|audio|[aá]udio|script|roteiro|gui[oó]n|story|hist[oó]ria|dublad\\w*'
const NOME_DEPOIS_DA_PECA = new RegExp(`(?<![\\p{L}])(?:${PECA})(?![\\p{L}])[^.\\n!?]{0,60}?(?<![\\p{L}])(?:in|em|en)\\s+(${TODOS})(?![\\p{L}])`, 'iu')
const NOME_ANTES_DA_FALA = new RegExp(`(?<![\\p{L}])(${TODOS})\\s+(?:narration|voice-?over|voice|audio|narrator)(?![\\p{L}])`, 'iu')

/** A língua que o próprio pedido nomeia para o filme, ou null. "in French Guiana" é lugar: nome seguido de palavra em maiúscula não conta. */
export function linguaPedidaNoTexto(texto: unknown): NarrationLanguage | null {
  const t = String(texto ?? '')
  const depois = NOME_DEPOIS_DA_PECA.exec(t)
  if (depois) {
    const resto = t.slice(depois.index + depois[0].length)
    if (!/^\s+\p{Lu}\p{Ll}/u.test(resto)) return CODIGO_DO_NOME(depois[1])
  }
  const antes = NOME_ANTES_DA_FALA.exec(t)
  return antes ? CODIGO_DO_NOME(antes[1]) : null
}

const MOTORES_DE_VOZ_PROPRIA = new Set(['hollywood', 'kling4', 'h3', 'h3max', 'omni', 's25'])

export type OrigemDaLingua = 'escolhida' | 'nomeada_no_pedido' | 'texto' | 'padrao' | 'motor_segurou'

export function linguaDoRoteiro(f: { hint: unknown; explicita?: unknown; texto: unknown; motor?: unknown }): { language: NarrationLanguage; origem: OrigemDaLingua; trocou: boolean } {
  const pedida = narrationLanguage(f.hint)
  const base: NarrationLanguage = pedida ?? 'en'
  const texto = String(f.texto ?? '')
  if (f.explicita === true && pedida) return { language: pedida, origem: 'escolhida', trocou: false }
  const nomeada = linguaPedidaNoTexto(texto)
  const candidata = nomeada ?? previaNarrationLanguage(base, texto)
  if (candidata === base) return { language: base, origem: nomeada ? 'nomeada_no_pedido' : 'padrao', trocou: false }
  if (typeof f.motor === 'string' && MOTORES_DE_VOZ_PROPRIA.has(f.motor) && !isHollywoodLanguage(candidata)) return { language: base, origem: 'motor_segurou', trocou: false }
  return { language: candidata, origem: nomeada ? 'nomeada_no_pedido' : 'texto', trocou: true }
}
