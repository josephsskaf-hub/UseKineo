// KINEO-QUEM-APARECE-2511 [CEO 25/11 08:21, docs/semana-2/DECISAO-QUEM-APARECE-NO-PLANO-2511.md; desenho aprovado 08:40, DESENHO-QUEM-APARECE-2511.md] — UMA
// leitura responde, por plano, quem do elenco está VISÍVEL. Nasceu de dois achados da mesma pergunta: a parte B do 2º personagem pelo prenome (lista de
// formas de ausência que a revisão sempre achava furada) e o protagonista posto em plano que o roteiro pede sem ele (Alcatraz, Umudara, Shiro: a regra
// protagonistaEmTodaCena e a cláusula da ficha em toda cena com "alguém").
//   · o modelo (o mesmo gpt-4o-mini do crítico de still, só texto) OBSERVA: por plano e por número do elenco, on_screen (yes | no | unclear) e how
//     (shown | voice_only | stated_absent | memory | not_mentioned). Lê o marcador do autor e a fala de cada plano; o visual que o nosso escritor gerou vai
//     rotulado como nosso e só como contexto. Sem exemplo no pedido (regra de 11/11). Nenhuma lista de palavras decide presença;
//   · o CÓDIGO decide: visível = on_screen 'yes' com how 'shown' ou 'memory'; 'no' = ausente; 'unclear' ou resposta incoerente ('yes' com voz, ausência
//     dita ou não citado) = aquele plano fica com a regra de hoje (null). A saída é conferida por esquema: plano a mais ou faltando, número de elenco
//     fora da lista ou fora de ordem, valor fora do enum = a leitura falhou = a main de hoje no filme inteiro. O texto do cliente só chega ao modelo no
//     papel de dado; o que volta é só número e enum.
//   · interruptor QUEM_APARECE_2511: 'internal' = só a lista EXATA da casa (contaDaCasaExata); cliente e 'off' = nenhuma chamada, nada muda.
import { contaDaCasaExata } from '@/lib/internalAccounts'
import { STILL_CRITIC_MODELO, custoDoCriticoUsd } from '@/lib/cinematic/criticoStill'

export const QUEM_APARECE_2511_VERSAO = 'quem_aparece_2511_v1'
export type ModoQuemAparece2511 = 'off' | 'internal' | 'public'
export const QUEM_APARECE_2511: ModoQuemAparece2511 = 'internal'
export const quemApareceLigado = (modo: ModoQuemAparece2511, email: string | null | undefined): boolean =>
  modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))
export const QUEM_APARECE_PRAZO_MS = 6_000
export const QUEM_APARECE_MAX_PLANOS = 12
export const QUEM_APARECE_MAX_ELENCO = 6
const FALA_MAX = 600, MARCADOR_MAX = 300, VISUAL_MAX = 500, NOME_MAX = 80

export type NaTela = 'yes' | 'no' | 'unclear'
export type Como = 'shown' | 'voice_only' | 'stated_absent' | 'memory' | 'not_mentioned'
const NA_TELA: readonly NaTela[] = ['yes', 'no', 'unclear']
const COMO: readonly Como[] = ['shown', 'voice_only', 'stated_absent', 'memory', 'not_mentioned']
export type PessoaDoElenco = { nome: string; tipo?: 'humano' | 'animal' | 'criatura' | null; genero?: 'man' | 'woman' | null }
export type PlanoParaLer = { fala: string; marcador: string; visual: string }
/** A leitura conferida: por plano, por pessoa do elenco (na ordem do elenco), o que o modelo viu. */
export type LeituraDePresenca = Array<Array<{ naTela: NaTela; como: Como }>>
/** O que os consumidores leem: o elenco lido e, por plano, os nomes visíveis ou null (aquele plano fica com a regra de hoje). */
export type PresencaDosPlanos = { elenco: readonly string[]; planos: ReadonlyArray<ReadonlyArray<string> | null> }

const corta = (s: unknown, max: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const TIPO_EN: Record<string, string> = { humano: 'person', animal: 'animal', criatura: 'creature' }

/** O pedido ao modelo: só observação, em JSON. Nenhum exemplo; nenhuma ordem de pôr ou tirar ninguém. */
export function pedidoDePresenca(elenco: readonly PessoaDoElenco[], planos: readonly PlanoParaLer[]): { messages: unknown[]; caracteres: number } {
  const sistema = 'You read the plan of a short film. For every numbered shot and every numbered cast member, say whether that cast member is visible on screen in that shot. ' +
    'Judge from the author\'s words for the shot: the author\'s shot note, when there is one, and the line spoken over the shot. The generated visual was written by us, not by the author: use it only to understand the shot, never as the only reason to put someone on screen. ' +
    'Answer only with JSON: {"shots": [{"shot": number, "cast": [{"id": number, "on_screen": "yes" | "no" | "unclear", "how": "shown" | "voice_only" | "stated_absent" | "memory" | "not_mentioned"}]}]}, ' +
    'one entry per shot in order and, inside each, one entry per cast member in order. "how" says how the shot relates to that person: "shown" = seen in the shot, "voice_only" = only heard, ' +
    '"stated_absent" = the words say the person is not there, "memory" = seen in a memory or flashback, "not_mentioned" = the shot does not involve the person.'
  const quem = elenco.map((p, i) => `${i + 1}. ${corta(p.nome, NOME_MAX)} (${TIPO_EN[p.tipo ?? ''] ?? 'character'}${p.genero === 'man' ? ', male' : p.genero === 'woman' ? ', female' : ''})`).join('\n')
  const tomadas = planos.map((p, i) => [`Shot ${i + 1}.`, `Author's shot note: ${corta(p.marcador, MARCADOR_MAX) || '(none)'}`, `Spoken line: ${corta(p.fala, FALA_MAX) || '(none)'}`,
    `Generated visual (ours): ${corta(p.visual, VISUAL_MAX) || '(none)'}`].join('\n')).join('\n\n')
  const texto = `Cast:\n${quem}\n\nShots:\n${tomadas}`
  return { messages: [{ role: 'system', content: sistema }, { role: 'user', content: texto }], caracteres: sistema.length + texto.length }
}

/** A resposta conferida por esquema. Qualquer desvio = null (a leitura falhou). */
export function lerLeituraDePresenca(raw: string, nElenco: number, nPlanos: number): LeituraDePresenca | null {
  let o: unknown
  try { o = JSON.parse(raw) } catch { return null }
  const shots = o && typeof o === 'object' ? (o as Record<string, unknown>).shots : null
  if (!Array.isArray(shots) || shots.length !== nPlanos || nElenco < 1) return null
  const out: LeituraDePresenca = []
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i] && typeof shots[i] === 'object' ? (shots[i] as Record<string, unknown>) : null
    if (!s || s.shot !== i + 1 || !Array.isArray(s.cast) || s.cast.length !== nElenco) return null
    const linha: Array<{ naTela: NaTela; como: Como }> = []
    for (let k = 0; k < s.cast.length; k++) {
      const c = s.cast[k] && typeof s.cast[k] === 'object' ? (s.cast[k] as Record<string, unknown>) : null
      if (!c || c.id !== k + 1 || !NA_TELA.includes(c.on_screen as NaTela) || !COMO.includes(c.how as Como)) return null
      linha.push({ naTela: c.on_screen as NaTela, como: c.how as Como })
    }
    out.push(linha)
  }
  return out
}

/** A regra, no código: visível = 'yes' visto (ou lembrança); ausente = 'no'; o resto = aquele plano fica com a regra de hoje. */
export function decidirPresenca(l: LeituraDePresenca, elenco: readonly PessoaDoElenco[]): PresencaDosPlanos {
  const planos = l.map((linha) => {
    const nomes: string[] = []
    for (let k = 0; k < linha.length; k++) {
      const { naTela, como } = linha[k]
      if (naTela === 'unclear') return null
      if (naTela === 'yes') { if (como !== 'shown' && como !== 'memory') return null; nomes.push(elenco[k].nome) }
    }
    return nomes
  })
  return { elenco: elenco.map((p) => p.nome), planos }
}

export type ChamadaDePresenca = { presenca: PresencaDosPlanos | null; custoUsd: number; ms: number; erro: string | null; unclear: number }
/** UMA leitura (rede). Nunca lança. Sem chave, prazo, HTTP, JSON torto ou fora do esquema = presenca null (a main de hoje). */
export async function lerQuemAparece(elenco: readonly PessoaDoElenco[], planos: readonly PlanoParaLer[], opts: { timeoutMs?: number; fetchImpl?: typeof fetch; apiKey?: string; agora?: () => number } = {}): Promise<ChamadaDePresenca> {
  const agora = opts.agora ?? Date.now, t0 = agora()
  const fim = (presenca: PresencaDosPlanos | null, custoUsd: number, erro: string | null): ChamadaDePresenca =>
    ({ presenca, custoUsd, ms: Math.max(0, agora() - t0), erro, unclear: presenca ? presenca.planos.filter((p) => p === null).length : 0 })
  if (elenco.length < 1 || elenco.length > QUEM_APARECE_MAX_ELENCO || planos.length < 1 || planos.length > QUEM_APARECE_MAX_PLANOS) return fim(null, 0, 'fora_do_tamanho')
  const key = opts.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  if (!key) return fim(null, 0, 'sem_chave')
  const { messages, caracteres } = pedidoDePresenca(elenco, planos)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), Math.max(1, opts.timeoutMs ?? QUEM_APARECE_PRAZO_MS))
  try {
    const res = await (opts.fetchImpl ?? fetch)('https://api.openai.com/v1/chat/completions', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: STILL_CRITIC_MODELO, temperature: 0, max_tokens: 900, response_format: { type: 'json_object' }, messages }) })
    if (!res.ok) return fim(null, 0, `http_${res.status}`)
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    const custo = custoDoCriticoUsd(data.usage, 0, caracteres)
    const l = lerLeituraDePresenca(data.choices?.[0]?.message?.content ?? '', elenco.length, planos.length)
    return l ? fim(decidirPresenca(l, elenco), custo, null) : fim(null, custo, 'fora_do_esquema')
  } catch {
    return fim(null, custoDoCriticoUsd(null, 0, caracteres), ctrl.signal.aborted ? 'prazo' : 'fetch')
  } finally { clearTimeout(timer) }
}

const base = (s: string) => String(s ?? '').toLowerCase().replace(/^the\s+/, '').trim()
/** A mesma pessoa: o nome igual, sem caixa e sem o "the" da frente. */
export const mesmaPessoa = (a: string, b: string): boolean => !!base(a) && base(a) === base(b)
/** O que a leitura diz desta pessoa neste plano: true visível, false ausente, null = a regra de hoje (sem leitura, plano incerto ou pessoa fora do elenco lido). */
export function presencaDe(p: PresencaDosPlanos | null | undefined, plano: number, nome: string): boolean | null {
  if (!p || !p.elenco.some((n) => mesmaPessoa(n, nome))) return null
  const d = p.planos[plano]
  return d ? d.some((n) => mesmaPessoa(n, nome)) : null
}
/** Por plano, a presença de uma pessoa que tem vários nomes (a referência única: `nomes` da ficha): a primeira decisão que a leitura tem. */
export function presencaPorPlano(p: PresencaDosPlanos | null | undefined, nPlanos: number, nomes: readonly string[]): Array<boolean | null> {
  return Array.from({ length: nPlanos }, (_, i) => { for (const n of nomes) { const d = presencaDe(p, i, n); if (d !== null) return d } return null })
}

// As cenas de hoje corrigidas pela leitura moram na camada que as decide (personagemAjuste cenasComPresenca2511; elencoEpoca e filme15Elenco com a mesma
// regra inline), porque essas camadas não importam este módulo.

/** Para o claim: só número. `mudou` = os planos em que a leitura trocou quem está em relação à regra de hoje. */
export type RelatoQuemAparece = { versao: string; fonte: 'leitura' | 'main'; motivo: string | null; ms: number; custo_usd: number; planos: Array<number[] | null>; unclear: number; mudou: number[]; sem_imagem_chave: number[] }
export function relatoQuemAparece(c: ChamadaDePresenca, elenco: readonly PessoaDoElenco[], mudou: readonly number[] = [], semImagemChave: readonly number[] = []): RelatoQuemAparece {
  return { versao: QUEM_APARECE_2511_VERSAO, fonte: c.presenca ? 'leitura' : 'main', motivo: c.erro, ms: c.ms, custo_usd: Math.round(c.custoUsd * 1e6) / 1e6,
    planos: c.presenca ? c.presenca.planos.map((d) => (d ? d.map((n) => elenco.findIndex((e) => mesmaPessoa(e.nome, n)) + 1) : null)) : [], unclear: c.unclear,
    mudou: [...mudou], sem_imagem_chave: [...semImagemChave] }
}

// ── a sonda da casa (/api/admin/sonda-presenca): uma por vez, a mesma leitura não repete, teto por instância ─────────────────────────────────────
export const SONDA_PRESENCA_TETO_POR_INSTANCIA = 120
export type EstadoDaSondaDePresenca = { ocupada: boolean; feitas: Set<string>; leituras: number; tempos: number[] }
export const novoEstadoDaSondaDePresenca = (): EstadoDaSondaDePresenca => ({ ocupada: false, feitas: new Set(), leituras: 0, tempos: [] })
export type PedidoDePresenca = { elenco: PessoaDoElenco[]; planos: PlanoParaLer[] }
const txt = (x: unknown, max: number, vazio = false) => (typeof x === 'string' && x.length <= max && (vazio || x.trim()) && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(x) ? x.trim() : null)
/** O corpo do POST da sonda, campo a campo. Fora do formato = null. */
export function lerPedidoDePresenca(body: unknown): PedidoDePresenca | null {
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  if (!b || !Array.isArray(b.elenco) || !Array.isArray(b.planos) || b.elenco.length < 1 || b.elenco.length > QUEM_APARECE_MAX_ELENCO || b.planos.length < 1 || b.planos.length > QUEM_APARECE_MAX_PLANOS) return null
  const elenco: PessoaDoElenco[] = []
  for (const e of b.elenco as unknown[]) {
    const r = e && typeof e === 'object' ? (e as Record<string, unknown>) : null
    const nome = r ? txt(r.nome, NOME_MAX) : null
    const tipo = r?.tipo === undefined || r?.tipo === null ? null : r.tipo === 'humano' || r.tipo === 'animal' || r.tipo === 'criatura' ? r.tipo : undefined
    const genero = r?.genero === undefined || r?.genero === null ? null : r.genero === 'man' || r.genero === 'woman' ? r.genero : undefined
    if (!nome || tipo === undefined || genero === undefined || elenco.some((x) => mesmaPessoa(x.nome, nome))) return null
    elenco.push({ nome, tipo, genero })
  }
  const planos: PlanoParaLer[] = []
  for (const p of b.planos as unknown[]) {
    const r = p && typeof p === 'object' ? (p as Record<string, unknown>) : null
    const fala = r ? txt(r.fala ?? '', FALA_MAX, true) : null, marcador = r ? txt(r.marcador ?? '', MARCADOR_MAX, true) : null, visual = r ? txt(r.visual ?? '', VISUAL_MAX, true) : null
    if (fala === null || marcador === null || visual === null || !(fala || marcador || visual)) return null
    planos.push({ fala, marcador, visual })
  }
  return { elenco, planos }
}
export const chaveDaPresenca = (p: PedidoDePresenca) => JSON.stringify([p.elenco.map((e) => [e.nome, e.tipo, e.genero]), p.planos.map((x) => [x.fala, x.marcador, x.visual])])
export type AdmissaoDePresenca = 'ok' | 'nao_e_da_casa' | 'ocupada' | 'repetida' | 'teto'
/** A trava, antes da chamada. 'ok' reserva a vez; o chamador libera com liberarSondaDePresenca. */
export function admitirSondaDePresenca(e: EstadoDaSondaDePresenca, email: string | null | undefined, chave: string): AdmissaoDePresenca {
  if (!contaDaCasaExata(email)) return 'nao_e_da_casa'
  if (e.ocupada) return 'ocupada'
  if (e.feitas.has(chave)) return 'repetida'
  if (e.leituras >= SONDA_PRESENCA_TETO_POR_INSTANCIA) return 'teto'
  e.ocupada = true; e.leituras++; e.feitas.add(chave)
  return 'ok'
}
export function liberarSondaDePresenca(e: EstadoDaSondaDePresenca, ms: number | null = null): void { e.ocupada = false; if (typeof ms === 'number' && Number.isFinite(ms)) e.tempos.push(ms) }
/** O p95 dos tempos desta instância (para comparar com o prazo de 6 s). Sem tempo = null. */
export function p95(tempos: readonly number[]): number | null {
  if (!tempos.length) return null
  const t = [...tempos].sort((a, b) => a - b)
  return t[Math.min(t.length - 1, Math.ceil(0.95 * t.length) - 1)]
}
