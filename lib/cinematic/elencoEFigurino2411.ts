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
// VOLTA 2 (revisor independente 24/11, 4 entradas que impediam 'public'):
//   (1) a pista em inglês não apaga ninguém quando a narração NÃO é inglês (detectNarrationLanguage da casa; sem certeza de inglês = não retira);
//   (2) o papel da pista só sai quando a pista DESCREVE O PROTAGONISTA: gênero do papel compatível com o dele e, em toda seção em que a pista o
//       escreve, a narração cita o protagonista sem pronome do outro gênero nem plural ("She waited", "met him", "they"). Plural/singular da
//       mesma palavra ("fishermen"/"fisherman") conta como a narração escrevendo o papel;
//   (3) a descrição do pedido só entra quando é de UMA pessoa (sem outra pessoa coordenada, "a woman in a red dress and a man in…") e do mesmo
//       gênero da ficha; figura conhecida fica como está;
//   (4) traje de UM momento não vira fixo: complemento de roupa/equipamento ("wearing a parachute") que o roteiro cita, mas não na 1ª seção em
//       que mostra a pessoa, sai da descrição. Critério e onde erra: ver tracoDaPessoaNoRoteiro.
//   E a troca de nome só acontece onde hoje os nomes NÃO casam (mesmoPersonagem falso): "Smith" com "John Smith" já casava e fica como está.
// Interruptor ELENCO_E_FIGURINO_2411: 'off' = a rota byte a byte; 'internal' = só a lista EXATA da casa; 'public' só com prova paga + sim do dono.
// Módulo puro (sem rede): a rota decide quando chamar.
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { apostoDoPedido, nomeadoNoPedido, textoDoPedidoOriginal, trechoDescreve } from '@/lib/cinematic/fichaDoPedido'
import { escritaLatina } from '@/lib/cinematic/conferenciaDoElenco'
import { mesmoPersonagem } from '@/lib/cinematic/elencoEpoca'
import { generoDoPapel } from '@/lib/cinematic/elencoSemantico'
import { figuraConhecidaJuiz } from '@/lib/cinematic/juizFicha'
import { figuraConhecida } from '@/lib/cinematic/personagemAjuste'
import { detectNarrationLanguage } from '@/lib/textLanguage'
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
    if (!completo || mesmoPersonagem(completo, f.nome) || base.some((g) => g !== f && palavrasDoNome(g.nome).join(' ') === palavrasDoNome(completo).join(' '))) return f
    renomeados.push([f.nome, completo])
    const canonica = f.canonica.startsWith(f.nome) ? completo + f.canonica.slice(f.nome.length) : f.canonica
    return { ...f, nome: completo, canonica } // o núcleo fica o nome curto: é como as cenas o citam ("Le Prince boarded")
  })
  return { elenco: renomeados.length ? saida : (base as FichaDePersonagem[]), renomeados }
}

// ═══ 2. Papel que só a pista escreve não entra pelos visuais ═════════════════════════════════════════════════════════════
/** As pistas [ … ] do roteiro, juntas. */
const pistasDo = (roteiro: string): string => limpa((String(roteiro ?? '').match(/\[[^\]]*\]/g) ?? []).join(' '))
const formas = (w: string) => { const n = norm(limpa(w)); return [n, `${n}s`, `${n}es`, n.replace(/s$/, ''), n.replace(/ies$/, 'y'), n.replace(/man$/, 'men'), n.replace(/men$/, 'man')].filter((x) => x.length >= 2) } // volta 2: "fisherman"/"fishermen"
const temPalavra = (texto: string, w: string) => formas(w).some((f) => new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(f)}(?![\\p{L}\\p{N}])`, 'iu').test(norm(texto)))
/** O papel (núcleo) está escrito numa pista [Pexels: …] e em nenhum ponto da narração: quem o criou foi a pista. */
export function papelSoDaPista(roteiro: string, chave: string): boolean {
  const k = limpa(chave)
  if (!k) return false
  return temPalavra(pistasDo(roteiro), k) && !temPalavra(semTags(roteiro), k)
}
/** Volta 2 (1): a regra compara a palavra da pista (inglês) com a narração; só vale quando a narração é inglês com certeza. */
export const narracaoEmIngles = (roteiro: string): boolean => detectNarrationLanguage(semTags(roteiro)).language === 'en'
/** As seções do roteiro (separadas por linha em branco): as pistas e a narração de cada uma. */
const secoesDo = (roteiro: string) => String(roteiro ?? '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((s) => ({ pistas: pistasDo(s), narracao: semTags(s) })).filter((s) => s.pistas || s.narracao)
const PRONOME = { male: /(?<![\p{L}])(?:he|him|his|himself)(?![\p{L}])/iu, female: /(?<![\p{L}])(?:she|her|hers|herself)(?![\p{L}])/iu, plural: /(?<![\p{L}])(?:they|them|their|theirs|themselves)(?![\p{L}])/iu }
export type ProtagonistaDaPista = Pick<FichaDePersonagem, 'nome' | 'nucleo' | 'genero'>
const generoDaFicha = (g: unknown): 'male' | 'female' | null => (g === 'man' ? 'male' : g === 'woman' ? 'female' : null)
/** Volta 2 (2): a pista que escreve o papel está DESCREVENDO O PROTAGONISTA (Slocum: "old bearded sailor" nas seções que só falam dele)?
 *  Precisa de: narração em inglês; papel só na pista; gênero do protagonista conhecido e o do papel igual ou não dito; e, em TODA seção em que a
 *  pista escreve o papel, a narração cita o protagonista e não tem pronome do outro gênero nem plural. Qualquer dúvida = não (o papel fica). */
export function pistaDescreveOProtagonista(roteiro: string, chave: string, protagonista: ProtagonistaDaPista | null | undefined): boolean {
  if (!protagonista || !papelSoDaPista(roteiro, chave) || !narracaoEmIngles(roteiro)) return false
  const gP = generoDaFicha(protagonista.genero)
  const gR = generoDoPapel(chave)
  if (!gP || (gR && gR !== gP)) return false
  const outro = gP === 'male' ? PRONOME.female : PRONOME.male
  const doNome = [...palavrasDoNome(protagonista.nome), ...palavrasDoNome(protagonista.nucleo)].filter((w) => w.length >= 3)
  const secoes = secoesDo(roteiro).filter((s) => temPalavra(s.pistas, chave))
  return secoes.length > 0 && secoes.every((s) => doNome.some((w) => temPalavra(s.narracao, w)) && !outro.test(s.narracao) && !PRONOME.plural.test(s.narracao))
}
/** O filtro do 15 s: a regra de antes (quando existe) E o papel não é o protagonista descrito pela pista. */
export function aceitaPapelSemPista<F>(roteiro: string, antes: ((ficha: F, chave: string) => boolean) | null, protagonista: ProtagonistaDaPista | null | undefined): (ficha: F, chave: string) => boolean {
  return (ficha, chave) => (antes ? antes(ficha, chave) : true) && !pistaDescreveOProtagonista(roteiro, chave, protagonista)
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
/** Volta 2 (3): a descrição é de UMA pessoa só e do gênero da ficha. "woman in a red dress and a man in a dark suit": depois de "and/,"
 *  vem outro sintagma que, sozinho, descreve gente = duas pessoas = dúvida = nada. */
export function descricaoDeUmaPessoa(descricao: string, ficha: Pick<FichaDePersonagem, 'genero'>): boolean {
  const cabecaDe = (s: string) => s.split(/\s+(?:in|wearing|with|dressed)\s/iu)[0]
  const partes = descricao.split(/\s*(?:,|\band\b|\bor\b)\s+(?=(?:a|an|the|another|other|his|her|their)\s)/iu)
  for (const parte of partes.slice(1)) {
    const m = /^(?:a|an|the|another|other|his|her|their)\s+(.+)$/iu.exec(parte.trim())
    if (m && generoDoPapel(cabecaDe(m[1]))) return false
  }
  const g = generoDoPapel(cabecaDe(partes[0]))
  const gF = generoDaFicha(ficha.genero)
  return !(g && gF && g !== gF)
}
/** Volta 2 (4): o critério que separa "traje da pessoa" de "traje de um momento". Cada complemento de roupa ("in a dark suit", "wearing a
 *  parachute", "and black tie") é conferido no ROTEIRO (narração e pistas, só para conferir, nunca como fonte): se o roteiro não cita o
 *  substantivo do complemento, ele fica (o pedido é a única fonte); se cita, ele só fica quando aparece já na 1ª seção que mostra a pessoa
 *  (a que cita o nome, o núcleo ou o núcleo da descrição). O paraquedas do Cooper só aparece nas seções 2 e 3, o terno já na 1ª.
 *  ONDE ERRA: (a) traje de um momento que o roteiro não cita (o pedido diz "a man wearing a parachute" e o roteiro nunca fala de paraquedas)
 *  fica; (b) traje de um momento que começa na 1ª seção (a história abre no hospital: "hospital gown") fica; (c) roupa fixa que o roteiro só
 *  cita a partir da 2ª seção sai. Equipamento na CABEÇA da descrição ("a parachutist") não é conferido. */
export function tracoDaPessoaNoRoteiro(descricao: string, roteiro: string | null | undefined, ficha: Pick<FichaDePersonagem, 'nome' | 'nucleo'>): string | null {
  const r = String(roteiro ?? '')
  const [cabeca, ...comps] = descricao.split(/\s+(?=(?:in|wearing|dressed in|with)\s)/iu)
  if (!r.trim() || comps.length === 0) return descricao
  const secoes = secoesDo(r).map((s) => `${s.pistas} ${s.narracao}`)
  const marcas = [...palavrasDoNome(ficha.nome), ...palavrasDoNome(ficha.nucleo), palavrasDoNome(cabeca).pop() ?? ''].filter((w) => w.length >= 3)
  const primeira = secoes.findIndex((s) => marcas.some((w) => temPalavra(s, w)))
  const fica = (pedaco: string): boolean => {
    const nucleo = palavrasDoNome(pedaco).pop() ?? ''
    if (nucleo.length < 3) return true
    const onde = secoes.map((s, i) => (temPalavra(s, nucleo) ? i : -1)).filter((i) => i >= 0)
    return onde.length === 0 || (primeira >= 0 && onde.includes(primeira))
  }
  const saida: string[] = []
  for (const c of comps) {
    const m = /^(dressed in|in|wearing|with)\s+(.*)$/iu.exec(c)
    const elo = m ? m[1] : ''
    const pedacos = (m ? m[2] : c).split(/\s+and\s+/iu).filter(fica)
    if (pedacos.length) saida.push(`${elo} ${pedacos.join(' and ')}`.trim())
  }
  return [cabeca, ...saida].join(' ')
}
const palavrasConteudo = (s: string) => palavrasDoNome(s).filter((w) => w.length >= 3 && !/^(?:and|the|with|wearing|dressed)$/.test(w))
export const MARCA_DO_PEDIDO_2411 = 'as the request describes:'
/** A ficha do protagonista humano com a descrição que o PEDIDO cola ao nome dele, quando ela traz palavra que a ficha não tem. Sem isso: o mesmo array. */
export function fichaComDescricaoDoPedido(ideiaOriginal: unknown, elenco: ReadonlyArray<FichaDePersonagem>, roteiro?: string | null): { elenco: FichaDePersonagem[]; trocas: Array<[string, string]>; descricao: string | null } {
  const pedido = textoDoPedidoOriginal(ideiaOriginal)
  const i = elenco.findIndex((f) => f.protagonista)
  const p = i >= 0 ? elenco[i] : null
  if (!pedido || !p || p.tipo !== 'humano' || (p.origem as string) === 'mitica' || figuraConhecidaJuiz(p.nome) || figuraConhecida(p.nome) || p.canonica.includes(MARCA_DO_PEDIDO_2411)) return { elenco: elenco as FichaDePersonagem[], trocas: [], descricao: null }
  const outros = elenco.map((f) => f.nome)
  const lida = apostoDoPedido(pedido, p, outros) ?? nomeadoNoPedido(pedido, p, outros) ?? autodenominadoNoPedido(pedido, p)
  const descricao = lida && descricaoDeUmaPessoa(lida, p) ? tracoDaPessoaNoRoteiro(lida, roteiro, p) : null // volta 2 (3) e (4)
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
