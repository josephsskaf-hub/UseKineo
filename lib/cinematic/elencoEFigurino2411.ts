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
// VOLTA 2 (histórico; os itens (1), (2) e (4) foram SUBSTITUÍDOS pela VOLTA 3 abaixo):
//   (1) a pista em inglês não apaga ninguém quando a narração NÃO é inglês (detectNarrationLanguage da casa; sem certeza de inglês = não retira);
//   (2) o papel da pista só sai quando a pista DESCREVE O PROTAGONISTA: gênero do papel compatível com o dele e, em toda seção em que a pista o
//       escreve, a narração cita o protagonista sem pronome do outro gênero nem plural ("She waited", "met him", "they"). Plural/singular da
//       mesma palavra ("fishermen"/"fisherman") conta como a narração escrevendo o papel;
//   (3) a descrição do pedido só entra quando é de UMA pessoa (sem outra pessoa coordenada, "a woman in a red dress and a man in…") e do mesmo
//       gênero da ficha; figura conhecida fica como está;
//   (4) traje de UM momento não vira fixo: complemento de roupa/equipamento ("wearing a parachute") que o roteiro cita, mas não na 1ª seção em
//       que mostra a pessoa, sai da descrição. Critério e onde erra: ver tracoDaPessoaNoRoteiro.
//   E a troca de nome só acontece onde hoje os nomes NÃO casam (mesmoPersonagem falso): "Smith" com "John Smith" já casava e fica como está.
// VOLTA 3 (2ª passada do revisor + direção da CEO 24/11):
//   (1)(3) quem sabe quantas pessoas o roteiro tem é a LEITURA SEMÂNTICA. O papel que só a pista escreve sai SÓ quando a leitura respondeu e leu
//       UMA pessoa (protagonista, nenhum coadjuvante, nem os "só citados" — conta-se a resposta BRUTA), os dois são gente, o gênero não se opõe
//       e a LÍNGUA DO FILME é inglês. A língua é a que a rota já resolve para a voz (resolveNarrationLanguage: body.language, com o texto só
//       trocando o "en" quando é claro), não o detector em texto curto (o Le Prince dava null). Pronome e seção saíram: não separam duas irmãs.
//   (2) a descrição para no primeiro "with/beside/holding/next to/alongside/carrying/accompanied by" (o que vem depois pode ser outra pessoa ou
//       bicho); gênero marcado na descrição exige o mesmo gênero na ficha (ficha sem gênero = dúvida = nada).
//   (4) traje pela FORMA da frase do pedido: só a roupa que APRESENTA a pessoa por "in"/"dressed in" ("a man in a dark suit", "a nurse in blue
//       scrubs") entra; "wearing …" e "with …" (equipamento de um momento) não entram. O roteiro não é mais lido aqui. Interruptor PRÓPRIO
//       (FIGURINO_DO_PEDIDO_2411) para a CEO poder abrir elenco e nome sem o figurino.
// Interruptor ELENCO_E_FIGURINO_2411: 'off' = a rota byte a byte; 'internal' = só a lista EXATA da casa; 'public' só com prova paga + sim do dono.
// Módulo puro (sem rede): a rota decide quando chamar.
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { apostoDoPedido, nomeadoNoPedido, textoDoPedidoOriginal, trechoDescreve } from '@/lib/cinematic/fichaDoPedido'
import { escritaLatina } from '@/lib/cinematic/conferenciaDoElenco'
import { mesmoPersonagem } from '@/lib/cinematic/elencoEpoca'
import { generoDoPapel } from '@/lib/cinematic/elencoSemantico'
import { figuraConhecidaJuiz } from '@/lib/cinematic/juizFicha'
import { figuraConhecida } from '@/lib/cinematic/personagemAjuste'
import { contaDaCasaExata } from '@/lib/internalAccounts'

export const ELENCO_E_FIGURINO_2411_VERSAO = 'KINEO-ELENCO-E-FIGURINO-2411'
export type ModoElencoEFigurino2411 = 'off' | 'internal' | 'public'
/** [autor 24/11] 'internal': só a lista exata da casa. 'public' só com revisor independente + prova paga em filmes da casa + sim do dono. Voltar: 'off'. */
export const ELENCO_E_FIGURINO_2411: ModoElencoEFigurino2411 = 'internal'
export const elencoEFigurinoLigado = (modo: ModoElencoEFigurino2411, email: string | null | undefined): boolean =>
  modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))
/** [volta 3] O figurino do pedido tem interruptor próprio (a rota exige os DOIS ligados). Mesmo molde; entregue em 'internal'. */
export const FIGURINO_DO_PEDIDO_2411: ModoElencoEFigurino2411 = 'internal'

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
/** Volta 3: quantas pessoas a leitura semântica leu, pela resposta BRUTA (inclui coadjuvante "só citado", que lerElencoSemantico descarta).
 *  null = sem leitura ou resposta ilegível (dúvida). */
export function pessoasDaLeitura(raw: string | null | undefined): number | null {
  let o: unknown
  try { o = JSON.parse(String(raw ?? '')) } catch { return null }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null
  const r = o as { protagonist?: unknown; supporting?: unknown }
  if (!('protagonist' in r)) return null
  const sup = Array.isArray(r.supporting) ? r.supporting.filter((s) => s && typeof s === 'object').length : 0
  return (r.protagonist && typeof r.protagonist === 'object' ? 1 : 0) + sup
}
export type ProtagonistaDaPista = Pick<FichaDePersonagem, 'nome' | 'nucleo' | 'genero' | 'tipo'>
export interface ContextoDaPista { /** a língua resolvida da narração (a da voz) */ lingua: string | null | undefined; /** a resposta bruta do leitor semântico */ leituraBruta: string | null | undefined }
const generoDaFicha = (g: unknown): 'male' | 'female' | null => (g === 'man' ? 'male' : g === 'woman' ? 'female' : null)
/** Volta 3: a pista que escreve o papel descreve O PROTAGONISTA (Slocum, Le Prince)? Só com: papel só na pista; filme em inglês; a leitura leu
 *  exatamente UMA pessoa; papel e protagonista humanos; gênero do papel não oposto ao do protagonista. Qualquer dúvida = não (o papel fica). */
export function pistaDescreveOProtagonista(roteiro: string, ficha: Pick<FichaDePersonagem, 'tipo'>, chave: string, protagonista: ProtagonistaDaPista | null | undefined, ctx: ContextoDaPista): boolean {
  if (!protagonista || ctx.lingua !== 'en' || pessoasDaLeitura(ctx.leituraBruta) !== 1) return false
  if (ficha.tipo !== 'humano' || protagonista.tipo !== 'humano' || !papelSoDaPista(roteiro, chave)) return false
  const gP = generoDaFicha(protagonista.genero)
  const gR = generoDoPapel(chave)
  return !(gR && gP && gR !== gP)
}
/** O filtro do 15 s: a regra de antes (quando existe) E o papel não é o protagonista descrito pela pista. */
export function aceitaPapelSemPista<F extends Pick<FichaDePersonagem, 'tipo'>>(roteiro: string, antes: ((ficha: F, chave: string) => boolean) | null, protagonista: ProtagonistaDaPista | null | undefined, ctx: ContextoDaPista): (ficha: F, chave: string) => boolean {
  return (ficha, chave) => (antes ? antes(ficha, chave) : true) && !pistaDescreveOProtagonista(roteiro, ficha, chave, protagonista, ctx)
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

/** Volta 3 (2): o que vem depois de "with/beside/holding…" pode ser outra pessoa ou bicho ("with his daughter in a red coat"): a descrição para ali. */
const PARADA_RE = /\s+(?:with|beside|holding|next\s+to|alongside|carrying|accompanied\s+by|together\s+with)\s.*$/iu
/** Volta 3 (4): só a roupa que APRESENTA a pessoa ("in …", "dressed in …") fica; "wearing …" (equipamento de um momento) sai. */
const VESTINDO_RE = /\s+wearing\s.*$/iu
/** A descrição de UMA pessoa só, do gênero da ficha, sem o que vem depois das paradas. null = dúvida = nada. */
export function descricaoDaPessoa(descricao: string, ficha: Pick<FichaDePersonagem, 'genero'>): string | null {
  const curta = limpa(descricao.replace(PARADA_RE, '').replace(VESTINDO_RE, ''))
  if (!curta) return null
  const cabecaDe = (s: string) => s.split(/\s+(?:in|dressed)\s/iu)[0]
  const partes = curta.split(/\s*(?:,|\band\b|\bor\b)\s+(?=(?:a|an|the|another|other|his|her|their)\s)/iu)
  for (const parte of partes.slice(1)) {
    const m = /^(?:a|an|the|another|other|his|her|their)\s+(.+)$/iu.exec(parte.trim())
    if (m && generoDoPapel(cabecaDe(m[1]))) return null // outra pessoa coordenada
  }
  const g = generoDoPapel(cabecaDe(partes[0]))
  const gF = generoDaFicha(ficha.genero)
  if (g && g !== gF) return null // gênero marcado diferente do da ficha, ou ficha sem gênero
  return curta
}
const palavrasConteudo = (s: string) => palavrasDoNome(s).filter((w) => w.length >= 3 && !/^(?:and|the|with|wearing|dressed)$/.test(w))
export const MARCA_DO_PEDIDO_2411 = 'as the request describes:'
/** A ficha do protagonista humano com a descrição que o PEDIDO cola ao nome dele, quando ela traz palavra que a ficha não tem. Sem isso: o mesmo array. */
export function fichaComDescricaoDoPedido(ideiaOriginal: unknown, elenco: ReadonlyArray<FichaDePersonagem>): { elenco: FichaDePersonagem[]; trocas: Array<[string, string]>; descricao: string | null } {
  const pedido = textoDoPedidoOriginal(ideiaOriginal)
  const i = elenco.findIndex((f) => f.protagonista)
  const p = i >= 0 ? elenco[i] : null
  if (!pedido || !p || p.tipo !== 'humano' || (p.origem as string) === 'mitica' || figuraConhecidaJuiz(p.nome) || figuraConhecida(p.nome) || p.canonica.includes(MARCA_DO_PEDIDO_2411)) return { elenco: elenco as FichaDePersonagem[], trocas: [], descricao: null }
  const outros = elenco.map((f) => f.nome)
  const lida = apostoDoPedido(pedido, p, outros) ?? nomeadoNoPedido(pedido, p, outros) ?? autodenominadoNoPedido(pedido, p)
  const descricao = lida ? descricaoDaPessoa(lida, p) : null // volta 3 (2) e (4)
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
