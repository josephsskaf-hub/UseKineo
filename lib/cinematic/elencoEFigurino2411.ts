// KINEO-ELENCO-E-FIGURINO-2411 [CEO 24/11, prova paga do personagem único: a referência única ligou em 1 de 3 roteiros] — três perdas ANTES do motor.
// Mapa: docs/canais/2026-11-24/RESULTADO.md · docs/filme-nota-9/CENSO-DEFEITOS-E-CONSERTOS-2411.md (seções C e E). Guardião: scripts/test-elenco-e-figurino-2411.mjs.
//
// 1. NOME CURTO × NOME COMPLETO (Le Prince, ensaio e93dcd39): a lista de palavras leu "Prince" e a leitura semântica leu "Louis Le Prince".
//    mesmoPersonagem() tira "prince" como TÍTULO ("Prince Harry") e os dois nomes nunca casavam: aplicarElencoSemantico devolvia null (protagonista
//    "sem ficha") e elencoConferido retirava "Prince" (cinematic_cast_checked.removidos = ["Prince"]). Filme sem protagonista.
//    Agora o nome curto vira o nome completo quando o roteiro prova que é a mesma pessoa: o curto é a ÚLTIMA palavra do completo, o completo está
//    escrito no roteiro, só UM nome lido termina nele e todo nome com maiúscula do roteiro que acaba nele é parte do completo ("Le Prince").
//    Dois parentes ("Mary Smith" e "John Smith"), nome de lugar, título na frente ("Prince Harry") e escrita não latina: nada muda.
// 2. A PISTA NÃO CRIA GENTE (Slocum, render 63cbd4d7): a pista [Pexels: old bearded sailor …] foi copiada pelo escritor de cenas ("An old bearded
//    sailor grips the helm…"); o elenco do 15 s lê os VISUAIS (lib/filmes/filme15Elenco elencoDoFilme15) e "sailor", que a narração não escreve,
//    passava pelo aceitaPapelDasCenas (feito para o "avô" do pedido em PT/ES) e entrava como 2º membro: duas folhas, stills reprovados, ficha
//    descartada, text-to-video. Com a leitura semântica respondida, papel que só a PISTA escreve nunca entra pelos visuais (KINEO-PISTA-NAO-MANDA-0411).
// 3. A ROUPA DO PEDIDO NA FICHA (Cooper, render 2b17bd7f): a ficha era a frase da narração ("a man in a black tie"); o paletó vivia só no pedido
//    original ("a man in a dark suit and black tie who called himself Dan Cooper") e nas pistas. A folha saiu sem paletó e a referência fiel repetiu
//    o erro nos 4 planos. Agora a descrição que o PEDIDO ORIGINAL cola ao nome do protagonista (aposto, "named/called", "who called himself") entra
//    na ficha dele quando traz palavras que ela não tem. Sem descrição no pedido: nada muda. A narração e a pista não são lidas aqui (roupa de uma
//    cena só, "wearing a parachute" no plano 3, nunca vira roupa fixa).
// Interruptor ELENCO_E_FIGURINO_2411: 'off' = a rota byte a byte; 'internal' = só a lista EXATA da casa; 'public' só com prova paga + sim do dono.
// Módulo puro (sem rede): a rota decide quando chamar.
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { apostoDoPedido, nomeadoNoPedido, textoDoPedidoOriginal, trechoDescreve } from '@/lib/cinematic/fichaDoPedido'
import { escritaLatina } from '@/lib/cinematic/conferenciaDoElenco'
import { contaDaCasaExata } from '@/lib/internalAccounts'

export const ELENCO_E_FIGURINO_2411_VERSAO = 'KINEO-ELENCO-E-FIGURINO-2411'
export type ModoElencoEFigurino2411 = 'off' | 'internal' | 'public'
/** [autor 24/11] 'internal': só a lista exata da casa. 'public' só com revisor independente + prova paga em filmes da casa + sim do dono. Voltar: 'off'. */
export const ELENCO_E_FIGURINO_2411: ModoElencoEFigurino2411 = 'internal'
export const elencoEFigurinoLigado = (modo: ModoElencoEFigurino2411, email: string | null | undefined): boolean =>
  modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))

const limpa = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()
const semTags = (t: unknown) => limpa(String(t ?? '').replace(/\[[^\]]*\]/g, ' '))
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const palavrasDoNome = (s: string) => norm(limpa(s)).split(/[^\p{L}\p{N}'’-]+/u).filter(Boolean)

// ═══ 1. O nome curto que o roteiro prova ser o nome completo ═════════════════════════════════════════════════════════════
/** Sequências de palavras com maiúscula do texto (sem as pistas): "Louis Le Prince", "Le Prince", "Paris". */
function nomesComMaiuscula(texto: string): string[][] {
  const seqs: string[][] = []
  let atual: string[] = []
  for (const m of texto.matchAll(/[\p{L}\p{N}'’-]+|[^\p{L}\p{N}'’-]+/gu)) {
    const t = m[0]
    if (/^[\p{L}\p{N}]/u.test(t)) { if (/^\p{Lu}/u.test(t)) atual.push(norm(t)); else { if (atual.length) seqs.push(atual); atual = [] } }
    else if (!/^ +$/.test(t)) { if (atual.length) seqs.push(atual); atual = [] }
  }
  if (atual.length) seqs.push(atual)
  return seqs
}
const ehSufixo = (seq: string[], nome: string[]) => seq.length <= nome.length && seq.every((w, i) => w === nome[nome.length - seq.length + i])
const terminaEm = (seq: string[], w: string) => seq.length > 0 && seq[seq.length - 1] === w

/** O nome completo lido para o nome curto da lista, ou null. O roteiro tem de provar que é a mesma pessoa (ver o cabeçalho). */
export function nomeCompletoProvado(curto: string, lidos: ReadonlyArray<string>, roteiro: string): string | null {
  const c = palavrasDoNome(curto)
  if (c.length !== 1 || /^(?:the|a|an)\s/i.test(curto) || !/^\p{Lu}/u.test(limpa(curto))) return null
  const texto = semTags(roteiro)
  if (!escritaLatina(texto)) return null
  const w = c[0]
  const candidatos = lidos.filter((n) => { const p = palavrasDoNome(n); return p.length >= 2 && p[p.length - 1] === w })
  if (candidatos.length !== 1) return null
  // outro nome lido que cita a palavra (outro parente, "Prince Albert") = dúvida
  if (lidos.some((n) => n !== candidatos[0] && palavrasDoNome(n).includes(w))) return null
  const completo = palavrasDoNome(candidatos[0])
  const seqs = nomesComMaiuscula(texto)
  if (!seqs.some((s) => s.join(' ') === completo.join(' '))) return null // o completo está escrito no roteiro
  // todo nome com maiúscula que acaba na palavra é o completo ou parte final dele ("Le Prince"); "John Smith" ao lado de "Mary Smith" = outra pessoa
  if (!seqs.filter((s) => terminaEm(s, w)).every((s) => ehSufixo(s, completo))) return null
  return limpa(candidatos[0])
}

/** O elenco da lista com o nome completo onde o roteiro o prova. Nada provado = o MESMO array (referência), para a rota ficar byte a byte. */
export function elencoComNomeCompleto(base: ReadonlyArray<FichaDePersonagem>, lidos: ReadonlyArray<string>, roteiro: string): { elenco: FichaDePersonagem[]; renomeados: Array<[string, string]> } {
  const renomeados: Array<[string, string]> = []
  const saida = base.map((f) => {
    const completo = nomeCompletoProvado(f.nome, lidos, roteiro)
    if (!completo || base.some((g) => g !== f && palavrasDoNome(g.nome).join(' ') === palavrasDoNome(completo).join(' '))) return f
    renomeados.push([f.nome, completo])
    const canonica = f.canonica.startsWith(f.nome) ? completo + f.canonica.slice(f.nome.length) : f.canonica
    return { ...f, nome: completo, canonica } // o núcleo fica o nome curto: é como as cenas o citam ("Le Prince boarded")
  })
  return { elenco: renomeados.length ? saida : (base as FichaDePersonagem[]), renomeados }
}

// ═══ 2. Papel que só a pista escreve não entra pelos visuais ═════════════════════════════════════════════════════════════
/** As pistas [ … ] do roteiro, juntas. */
const pistasDo = (roteiro: string): string => limpa((String(roteiro ?? '').match(/\[[^\]]*\]/g) ?? []).join(' '))
const formas = (w: string) => { const n = norm(limpa(w)); return [n, `${n}s`, `${n}es`, n.replace(/s$/, ''), n.replace(/ies$/, 'y')].filter((x) => x.length >= 2) }
const temPalavra = (texto: string, w: string) => formas(w).some((f) => new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(f)}(?![\\p{L}\\p{N}])`, 'iu').test(norm(texto)))
/** O papel (núcleo) está escrito numa pista [Pexels: …] e em nenhum ponto da narração: quem o criou foi a pista. */
export function papelSoDaPista(roteiro: string, chave: string): boolean {
  const k = limpa(chave)
  if (!k) return false
  return temPalavra(pistasDo(roteiro), k) && !temPalavra(semTags(roteiro), k)
}
/** O filtro do 15 s: a regra de antes (quando existe) E o papel não nasceu da pista. */
export function aceitaPapelSemPista<F>(roteiro: string, antes: ((ficha: F, chave: string) => boolean) | null): (ficha: F, chave: string) => boolean {
  return (ficha, chave) => (antes ? antes(ficha, chave) : true) && !papelSoDaPista(roteiro, chave)
}

// ═══ 3. A descrição do pedido original na ficha do protagonista ══════════════════════════════════════════════════════════
/** "a man in a dark suit and black tie who called himself Dan Cooper": a descrição antes de "who called himself/herself <Nome>". */
export function autodenominadoNoPedido(pedido: string, ficha: Pick<FichaDePersonagem, 'nome' | 'nucleo' | 'tipo'>): string | null {
  const nome = limpa(ficha.nome)
  if (!pedido || !/^\p{Lu}/u.test(nome)) return null
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(an?|the)\\s+([^.,;:!?()\\n"“”]{2,160}?)\\s+who\\s+(?:called|calls)\\s+(?:him|her)self\\s+${escapaRe(nome)}(?![\\p{L}\\p{N}-])`, 'giu')
  for (const m of pedido.matchAll(re)) {
    const trecho = limpa(m[2])
    if (trechoDescreve(trecho, m[1], ficha)) return trecho
  }
  return null
}
const palavrasConteudo = (s: string) => palavrasDoNome(s).filter((w) => w.length >= 3 && !/^(?:and|the|with|wearing|dressed)$/.test(w))
export const MARCA_DO_PEDIDO_2411 = 'as the request describes:'
/** A ficha do protagonista humano com a descrição que o PEDIDO cola ao nome dele, quando ela traz palavra que a ficha não tem. Sem isso: o mesmo array. */
export function fichaComDescricaoDoPedido(ideiaOriginal: unknown, elenco: ReadonlyArray<FichaDePersonagem>): { elenco: FichaDePersonagem[]; trocas: Array<[string, string]>; descricao: string | null } {
  const pedido = textoDoPedidoOriginal(ideiaOriginal)
  const i = elenco.findIndex((f) => f.protagonista)
  const p = i >= 0 ? elenco[i] : null
  if (!pedido || !p || p.tipo !== 'humano' || (p.origem as string) === 'mitica' || p.canonica.includes(MARCA_DO_PEDIDO_2411)) return { elenco: elenco as FichaDePersonagem[], trocas: [], descricao: null }
  const outros = elenco.map((f) => f.nome)
  const descricao = apostoDoPedido(pedido, p, outros) ?? nomeadoNoPedido(pedido, p, outros) ?? autodenominadoNoPedido(pedido, p)
  if (!descricao) return { elenco: elenco as FichaDePersonagem[], trocas: [], descricao: null }
  const ficha = palavrasConteudo(p.canonica)
  if (palavrasConteudo(descricao).every((w) => ficha.includes(w))) return { elenco: elenco as FichaDePersonagem[], trocas: [], descricao: null } // a ficha já diz tudo
  const [cabeca, ...resto] = p.canonica.split('; ')
  const canonica = [cabeca, `${MARCA_DO_PEDIDO_2411} ${descricao}`, ...resto].join('; ')
  const saida = elenco.map((f, k) => (k === i ? { ...f, canonica } : f))
  return { elenco: saida, trocas: [[p.canonica, canonica]], descricao }
}

/** Para o ensaio e o evento: só nomes, papéis e origem (nunca texto do cliente). */
export const relatoDoElenco2411 = (elenco: ReadonlyArray<Pick<FichaDePersonagem, 'nome' | 'tipo' | 'origem' | 'protagonista'>>) =>
  elenco.map((f) => ({ nome: f.nome, tipo: f.tipo, origem: f.origem, protagonista: f.protagonista }))
