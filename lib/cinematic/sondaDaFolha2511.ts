// KINEO-SONDA-DA-FOLHA-2511 [CEO 25/11: "nenhum filme novo até a sonda mostrar a causa"] — a sonda barata da folha, só para a casa e sem filme: gera UMA
// folha de personagem pelo MESMO caminho do filme (promptDaFolha → generateCinematicSceneStill, o FLUX da folha) a partir da canônica e do look que o
// filme usou, com ou sem o nome próprio (KINEO-FICHA-SEM-NOME-2511), guarda a imagem no nosso bucket e roda o conferente UMA vez (lerAFolha +
// decidirDaFolha, KINEO-JUIZ-DA-FOLHA-2411 com a pergunta de forma KINEO-FORMA-DA-FOLHA-2511). Não regera, não grava no banco, não cobra crédito.
// Travas: lista exata da casa; uma chamada por vez (por instância); o mesmo pedido (canônica, nome, look, com/sem nome, semente) não repete; teto de
// chamadas por instância. Custo por chamada: a folha SONDA_FOLHA_USD = US$ 0,025 [revisora 25/11, §2, catálogo da fal: fal-ai/flux/dev arredonda para o
// megapixel de cima; 9:16 = 0,59 MP → 1 MP × US$ 0,025] + a leitura (o filme addef2b6 gravou US$ 0,000559). PERSONAGEM_FOLHA_USD (0,015) fica: é a
// estimativa de log do filme (custoDoPersonagemUsd, a folha nova do conferente), não entra em crédito; corrigir é outra entrega.
// A forma: a sonda pergunta (formaNaSonda), o filme não (FORMA_DA_FOLHA_2511 = 'sonda').
// Volta 3 [CEO 25/11]: o modo "só ler" (`modo: 'ler'`) — UMA leitura do conferente sobre uma folha que JÁ está no nosso bucket (as 4 da sonda de 04:02),
// sem gerar imagem: ≈ US$ 0,0006. Para provar a pergunta de forma nova nas folhas que já existem. Teto próprio por instância. E o corpo da folha aceita
// `genero` ('man' | 'woman' | null), que a ficha sem nome usa ("a young woman").
import { contaDaCasaExata } from '@/lib/internalAccounts'
import { promptDaFolha, type FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { decidirDaFolha, descricaoParaOJuiz, especieDaDescricao, formaNaSonda, type ChamadaDaFolha, type LeituraDaFolha, type VereditoDaFolha } from '@/lib/cinematic/juizDaFolha2411'

export const SONDA_DA_FOLHA_TETO_POR_INSTANCIA = 8
export const SONDA_FOLHA_USD = 0.025
export const SONDA_LEITURA_TETO_POR_INSTANCIA = 20
const URL_MAX = 600
const CANONICA_MAX = 1200, NOME_MAX = 80, LOOK_MAX = 400

export type PedidoDaSonda = { nome: string; tipo: FichaDePersonagem['tipo']; genero: FichaDePersonagem['genero']; canonica: string; lookPhrase: string; filmeFotorreal: boolean; semNome: boolean; seed: number }
export type PedidoDeLeitura = { url: string; nome: string; tipo: FichaDePersonagem['tipo']; canonica: string; filmeFotorreal: boolean }
export type EstadoDaSonda = { ocupada: boolean; feitas: Set<string>; chamadas: number; leituras: number }
export type AdmissaoDaSonda = 'ok' | 'nao_e_da_casa' | 'ocupada' | 'repetida' | 'teto'
export type ResultadoDaSonda = {
  prompt: string; url: string | null; descricao: string; especie: string | null
  leitura: LeituraDaFolha | null; veredito: VereditoDaFolha | null; custo_usd: number; erro: string | null
}

const texto = (x: unknown, max: number) => (typeof x === 'string' && x.trim() && x.length <= max && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(x) ? x.trim() : null)
/** O corpo do POST, campo a campo. Fora do formato = null. */
export function lerPedidoDaSonda(body: unknown): PedidoDaSonda | null {
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  if (!b) return null
  const nome = texto(b.nome, NOME_MAX), canonica = texto(b.canonica, CANONICA_MAX), lookPhrase = texto(b.look_phrase, LOOK_MAX)
  const tipo = b.tipo === 'humano' || b.tipo === 'animal' || b.tipo === 'criatura' ? b.tipo : null
  const seed = typeof b.seed === 'number' && Number.isInteger(b.seed) && b.seed >= 0 && b.seed < 2_147_483_647 ? b.seed : null
  const genero = b.genero === undefined || b.genero === null ? null : b.genero === 'man' || b.genero === 'woman' ? b.genero : undefined
  if (!nome || !canonica || !lookPhrase || !tipo || seed === null || genero === undefined || typeof b.filme_fotorreal !== 'boolean' || typeof b.sem_nome !== 'boolean') return null
  return { nome, tipo, genero, canonica, lookPhrase, filmeFotorreal: b.filme_fotorreal, semNome: b.sem_nome, seed }
}
/** O corpo do modo "só ler": `modo: 'ler'` e uma URL https do NOSSO bucket público de stills (onde a sonda guarda a folha). Fora disso = null. */
export function lerPedidoDeLeitura(body: unknown, baseDoBucket: string): PedidoDeLeitura | null {
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  if (!b || b.modo !== 'ler') return null
  const base = String(baseDoBucket ?? '').replace(/\/+$/, '')
  const url = texto(b.url, URL_MAX), nome = texto(b.nome, NOME_MAX), canonica = texto(b.canonica, CANONICA_MAX)
  const tipo = b.tipo === 'humano' || b.tipo === 'animal' || b.tipo === 'criatura' ? b.tipo : null
  const prefixo = `${base}/storage/v1/object/public/broll/`
  if (!/^https:\/\/[^/]+$/.test(base) || !url || !url.startsWith(prefixo) || /\.\.|[\s?#]/.test(url.slice(prefixo.length)) || url.length === prefixo.length) return null
  if (!nome || !canonica || !tipo || typeof b.filme_fotorreal !== 'boolean') return null
  return { url, nome, tipo, canonica, filmeFotorreal: b.filme_fotorreal }
}
export const chaveDaSonda = (p: PedidoDaSonda) => JSON.stringify([p.nome, p.tipo, p.genero, p.canonica, p.lookPhrase, p.semNome, p.seed])
export const chaveDaLeitura = (p: PedidoDeLeitura) => JSON.stringify(['ler', p.url, p.nome, p.tipo, p.canonica, p.filmeFotorreal])
export const novoEstadoDaSonda = (): EstadoDaSonda => ({ ocupada: false, feitas: new Set(), chamadas: 0, leituras: 0 })
/** A trava, antes de qualquer chamada paga. 'ok' reserva a vez (ocupada, chamada contada, pedido marcado); o chamador libera com liberarSonda. */
export function admitirSonda(estado: EstadoDaSonda, email: string | null | undefined, chave: string, tipo: 'folha' | 'ler' = 'folha'): AdmissaoDaSonda {
  if (!contaDaCasaExata(email)) return 'nao_e_da_casa'
  if (estado.ocupada) return 'ocupada'
  if (estado.feitas.has(chave)) return 'repetida'
  if (tipo === 'folha' ? estado.chamadas >= SONDA_DA_FOLHA_TETO_POR_INSTANCIA : estado.leituras >= SONDA_LEITURA_TETO_POR_INSTANCIA) return 'teto'
  estado.ocupada = true
  if (tipo === 'folha') estado.chamadas++; else estado.leituras++
  estado.feitas.add(chave)
  return 'ok'
}
export function liberarSonda(estado: EstadoDaSonda): void { estado.ocupada = false }

/** UMA folha e UMA leitura. Nunca regera. A rede entra pelas deps (o guardião as troca). */
export async function rodarSondaDaFolha(p: PedidoDaSonda, deps: {
  gerar: (prompt: string, seed: number) => Promise<string | null>
  guardar: (url: string) => Promise<string | null>
  ler: (descricao: string, url: string) => Promise<ChamadaDaFolha>
}): Promise<ResultadoDaSonda> {
  const ficha: FichaDePersonagem = { nome: p.nome, nucleo: p.nome, tipo: p.tipo, canonica: p.canonica, origem: 'autor', protagonista: true, genero: p.genero }
  const prompt = promptDaFolha(ficha, { lookPhrase: p.lookPhrase }, p.semNome)
  const modoForma = formaNaSonda(), descricao = descricaoParaOJuiz(ficha), especie = especieDaDescricao(descricao, modoForma)
  const base = { prompt, descricao, especie, leitura: null, veredito: null }
  const falUrl = await deps.gerar(prompt, p.seed).catch(() => null)
  if (!falUrl) return { ...base, url: null, custo_usd: SONDA_FOLHA_USD, erro: 'folha_falhou' }
  const url = await deps.guardar(falUrl).catch(() => null)
  if (!url) return { ...base, url: null, custo_usd: SONDA_FOLHA_USD, erro: 'bucket_falhou' }
  const r = await deps.ler(descricao, url)
  const custo = Math.round((SONDA_FOLHA_USD + r.custoUsd) * 1e6) / 1e6
  if (!r.leitura) return { ...base, url, custo_usd: custo, erro: r.erro ?? 'sem_leitura' }
  return { ...base, url, leitura: r.leitura, veredito: decidirDaFolha(r.leitura, p.filmeFotorreal, descricao, modoForma), custo_usd: custo, erro: null }
}

export type ResultadoDaLeitura = Omit<ResultadoDaSonda, 'prompt'>
/** O modo "só ler": UMA leitura do conferente (com a pergunta de forma da sonda) sobre a folha que já está no bucket. Nenhuma imagem gerada. */
export async function rodarLeituraDaSonda(p: PedidoDeLeitura, deps: { ler: (descricao: string, url: string) => Promise<ChamadaDaFolha> }): Promise<ResultadoDaLeitura> {
  const ficha = { nome: p.nome, canonica: p.canonica }
  const modoForma = formaNaSonda(), descricao = descricaoParaOJuiz(ficha), especie = especieDaDescricao(descricao, modoForma)
  const r = await deps.ler(descricao, p.url)
  const custo = Math.round(r.custoUsd * 1e6) / 1e6
  if (!r.leitura) return { url: p.url, descricao, especie, leitura: null, veredito: null, custo_usd: custo, erro: r.erro ?? 'sem_leitura' }
  return { url: p.url, descricao, especie, leitura: r.leitura, veredito: decidirDaFolha(r.leitura, p.filmeFotorreal, descricao, modoForma), custo_usd: custo, erro: null }
}
