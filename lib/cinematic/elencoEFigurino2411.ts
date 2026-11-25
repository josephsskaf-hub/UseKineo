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
import { ESPECIES_DA_FOLHA, PERSONAGEM_MAX_PERSONAGENS } from '@/lib/cinematic/folhaDePersonagem' // KINEO-LEITOR-DO-ELENCO-2411
import { canonicaLiteral } from '@/lib/cinematic/juizFicha' // KINEO-LEITOR-DO-ELENCO-2411
import { fichaDoAutor } from '@/lib/cinematic/elencoSemantico' // KINEO-LEITOR-DO-ELENCO-2411
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

// ═══ KINEO-LEITURA-2411 [CEO 24/11, medida antes de abrir 'public'] — quanto a leitura semântica acerta a contagem de pessoas ═══════════════
// Só MEDE, para TODAS as contas: nada do filme muda (elenco, ficha, cena, prompt, custo, ordem). Leitura pura sobre valores que a rota já tem;
// nenhuma chamada nova. Vai no evento que já existe cinematic_dispatch_result (bloco leitura_2411), porque é o único evento escrito DEPOIS dos
// visuais das cenas (a regra da pista precisa deles) e já é o lugar das medidas do despacho (monument, named_cast_era); cinematic_cast_checked
// é escrito ~3400 linhas antes, sem visuais. Só números, booleanos e códigos de língua: nenhum nome, nenhum texto, nenhum e-mail.
// Qualquer exceção = { versao, erro: true } e o filme segue igual.
export const LEITURA_2411_VERSAO = 'leitura_2411_v1'
export type MedidaDaLeitura2411 = Record<string, number | boolean | string | null>
const codigoDeLingua = (v: unknown): string | null => (typeof v === 'string' && /^[a-z]{2,3}(?:-[a-z0-9]{2,4})?$/i.test(v.trim()) ? v.trim().toLowerCase() : null)
/** Coadjuvantes que o leitor marcou "só citados" (on_screen false), pela resposta bruta. null = sem leitura. */
export function soCitadosDaLeitura(raw: string | null | undefined): number | null {
  if (pessoasDaLeitura(raw) === null) return null
  const sup = (JSON.parse(String(raw)) as { supporting?: unknown }).supporting
  return Array.isArray(sup) ? sup.filter((s) => s && typeof s === 'object' && (s as { on_screen?: unknown }).on_screen === false).length : 0
}
/** A parte da LEITURA (no ponto do elenco do pedido). */
export function medidaDaLeitura2411(a: { leituraBruta: string | null | undefined; linguaResolvida: unknown; linguaDoDetector: unknown; linguaPedida: unknown }): MedidaDaLeitura2411 {
  try {
    const pessoas = pessoasDaLeitura(a.leituraBruta)
    return { versao: LEITURA_2411_VERSAO, respondeu: pessoas !== null, pessoas_lidas: pessoas, coadjuvantes_so_citados: soCitadosDaLeitura(a.leituraBruta),
      lingua_resolvida: codigoDeLingua(a.linguaResolvida), lingua_do_detector: codigoDeLingua(a.linguaDoDetector), lingua_pedida: codigoDeLingua(a.linguaPedida) }
  } catch { return { versao: LEITURA_2411_VERSAO, erro: true } }
}
/** A parte da REGRA (no ponto do elenco do 15 s): quantos papéis só a pista escreve e o que a regra de 'public' faria, SEM aplicar.
 *  `elencoHoje` e `elencoSePublic` são o elencoDoFilme15 de hoje e com a regra, calculados à parte (cópias: o filme usa o seu, já calculado). */
export function medidaDaRegra2411(base: MedidaDaLeitura2411 | null | undefined, a: { roteiro: string; visuais: ReadonlyArray<string>; extrair: (texto: string) => ReadonlyArray<Pick<FichaDePersonagem, 'nome' | 'nucleo'>>; elencoHoje: () => number; elencoSePublic: () => number }): MedidaDaLeitura2411 {
  const inicio: MedidaDaLeitura2411 = { ...(base ?? { versao: LEITURA_2411_VERSAO }) }
  try {
    const chaves = new Set<string>()
    for (const v of a.visuais) for (const f of a.extrair(String(v ?? ''))) { const k = String(f.nucleo || f.nome.split(' ').pop() || '').trim().toLowerCase(); if (k && papelSoDaPista(a.roteiro, k)) chaves.add(k) }
    const antes = a.elencoHoje()
    const sePublic = a.elencoSePublic()
    return { ...inicio, papeis_so_da_pista: chaves.size, elenco_antes: antes, elenco_se_public: sePublic, a_regra_agiria: sePublic < antes }
  } catch { return { ...inicio, erro: true } }
}
// ═══ KINEO-LEITOR-DO-ELENCO-2411 [CEO 24/11, etapa 3 do "filme para todos"] — quem o autor NOMEOU e DESCREVEU entra no elenco com a descrição ═══
// Mapa: docs/canais/2026-11-24/prova-3/RESULTADO-3.md (ensaios bf823182, 9ce9576c, 9467548b). Guardião: scripts/test-leitor-do-elenco-2411.mjs.
// TRÊS PERDAS (diagnóstico com arquivo e linha no relatório da etapa 3):
//   (a) "Elias Ward had kept…" + "Mara Quinn caught…": cada nome aparece UMA vez na narração; a lista de palavras pede 2 (folhaDePersonagem
//       nomesDoRoteiro: `c.total >= 2`) e a leitura semântica, que leu os dois, é descartada inteira porque o protagonista nomeado não tem papel
//       escrito na NARRAÇÃO e não está na lista (elencoSemantico aplicarElencoSemantico: `semFicha(sem.protagonist)` → null). Elenco vazio.
//   (a') "Elias is an old gray-bearded lighthouse keeper in a navy coat" (cópula) no pedido: nenhum leitor do pedido lê essa forma (aposto
//       "Nome, a …", "a … named Nome" e "a … who called himself Nome" só); a ficha ficou com a AÇÃO que o leitor copiou da narração.
//   (b) "Juno, a golden retriever with a red bandana": a espécie só está no PEDIDO e nas pistas; a narração diz "Juno walked… She sat…". A
//       leitura semântica exige a espécie do bicho nomeado na narração (lerPersonagem: `!species_text` → null) e o protagonista recusado
//       derruba a resposta (3 tentativas "json"); a lista de palavras pede o nome 2 vezes. Sobrou a ficha do sujeito ("the retriever", origem
//       modelo, protagonista1311 fichaDoSujeitoVivo) e o casting a reescreveu sem a bandana.
// A REGRA (pura, sem rede; decide o código, nada vai ao prompt do leitor):
//   1. DESCRIÇÃO: a ficha de nome próprio ganha as palavras que o autor colou ao nome — no PEDIDO original e, sem pedido, na NARRAÇÃO (sem as
//      pistas) — em três formas: aposto "Nome[ Sobrenome], a …", cópula "Nome[ Sobrenome] is/was a …" e "a … named/called Nome". O trecho tem
//      de passar inteiro em trechoDescreve (fichaDoPedido: tudo ou nada, a mesma régua do aposto de 09/11). Ficha que não é do autor vira a
//      ficha literal (canonicaLiteral, origem 'autor': o casting não a reescreve); ficha do autor ganha o trecho depois da cabeça (não se apaga
//      o que o autor já escreveu). Ficha que já tem todas as palavras: nada.
//   2. NOME: a ficha SEM nome ("the retriever") vira o nome próprio da narração quando a descrição colada a esse nome tem a mesma espécie
//      (o núcleo da ficha é palavra da descrição) — e só com UM nome assim (dois = dúvida = nada).
//   3. NOVO (volta 3: só GENTE; "a mesma pessoa" = mesmoPersonagem ou um nome é o fim do outro, e a mesma descrição de uma ficha já presente):
//      nome da narração que nenhuma ficha tem entra (até PERSONAGEM_MAX_PERSONAGENS) quando (i) tem descrição e a leitura semântica não o
//      descartou (respondeu sem ele = julgado = fora; não respondeu = a descrição basta), ou (ii) é nome e SOBRENOME (2+ palavras com
//      maiúscula), a leitura o leu como GENTE com o nome completo exato e a narração o mostra agindo ("Elias Ward had kept"). Sem descrição, a ficha é só o que o
//      autor escreveu dele (fichaDoAutor com a oração da narração): nada de cabelo, rosto ou roupa sorteados.
//   Fora sempre: figura conhecida/mítica (as regras de hoje: nada deduzido do nome), nome que a leitura listou como lugar/empresa, palavra de
//   função no começo de frase ("This is a…", "Meet"), escrita não latina. Interruptor PRÓPRIO, nasce 'internal' (só a lista exata da casa).
export const LEITOR_DO_ELENCO_2411_VERSAO = 'KINEO-LEITOR-DO-ELENCO-2411'
/** [autora 24/11] 'internal': só a lista exata da casa. 'public' só com revisor independente + ensaio da casa + sim da CEO. Voltar: 'off'. */
export const LEITOR_DO_ELENCO_2411: ModoElencoEFigurino2411 = 'internal'

const APOSTO_DO_NOME_RE = /^, (a|an|the) ([^,.;:!?…\n()"“”«»—–]{3,200}?) ?([,.;:!?…\n—–]|$)/iu
const COPULA_DO_NOME_RE = /^ (?:is|was) (a|an) ([^,.;:!?…\n()"“”«»—–]{3,200}?) ?([,.;:!?…\n—–]|$)/iu
const LISTA_DEPOIS_RE = /^,\s*(?:and|or)\s/iu
const DUPLO_ANTES_RE = /(?<![\p{L}\p{N}])(?:another|other|second)\s+$/iu
/** [volta 3] partícula de nome ("Joan of Arc", "Vincent van Gogh"): dentro do nome, nunca o corta em dois (era "Arc", "Gogh"). Classe fechada. */
const PARTICULA_2411 = '(?:of|van|von|de|da|di|du|del|della|der|den|le|la|bin|ibn|al|dos|das)'
const SOBRENOMES_RE = new RegExp(`^(?: (?:${PARTICULA_2411} )?\\p{Lu}[\\p{Ll}'’-]+){0,2}`, 'u')
/** Palavra com maiúscula que é função/abertura de frase, nunca nome: "This is a small dog", "Meet Juno", "Every evening". Classe fechada. */
const NUNCA_NOME_2411 = new Set(('the a an this that these those it its he she they we you i his her their our your my there here every each one someone everyone '
  + 'nobody nothing then when once but and so or meet imagine picture watch together now today tonight later soon after before suddenly finally still yet '
  + 'what who why how where which while until since because if as at in on of to for with from by into no not never always some all both many most '
  + 'hook payoff micro reward cta intro outro scene act part chapter '
  // artigos de alemão, francês, espanhol, italiano e português (replay 24/11: a leitura leu "Ein Junge" — "um menino" — como nome)
  + 'ein eine einen einem einer der die das den dem des le les une du el los las un una il lo gli uno um uma os as dos das do da del').split(' '))
const ESPECIE_ANIMAL_RE = new RegExp(`^(?:${ESPECIES_DA_FOLHA.animais})s?$`, 'iu')
const ESPECIE_CRIATURA_RE = new RegExp(`^(?:${ESPECIES_DA_FOLHA.criaturas})s?$`, 'iu')
const FUNCAO_NO_VERBO_RE = /^(?:of|and|or|the|a|an|in|on|at|to|with|from|for|by|as|is|was)$/iu

export type FonteDaDescricao = 'pedido' | 'roteiro'
export interface DescricaoDoNome2411 { trecho: string; artigo: string; forma: 'aposto' | 'copula' | 'nomeado'; fonte: FonteDaDescricao; tipo: FichaDePersonagem['tipo']; nucleo: string }

/** A cabeça da descrição ("old gray-bearded lighthouse keeper" de "… in a navy coat") e o ser que ela diz: criatura/animal pela lista da folha, senão gente. */
function serDaDescricao(trecho: string): { tipo: FichaDePersonagem['tipo']; nucleo: string } {
  const cabeca = trecho.split(/\s+(?:with|wearing|in|and|dressed)\s/iu)[0].split(/\s+/).filter(Boolean)
  const criatura = [...cabeca].reverse().find((w) => ESPECIE_CRIATURA_RE.test(w))
  if (criatura) return { tipo: 'criatura', nucleo: norm(criatura).replace(/s$/, '') }
  const animal = [...cabeca].reverse().find((w) => ESPECIE_ANIMAL_RE.test(w))
  if (animal) return { tipo: 'animal', nucleo: norm(animal).replace(/s$/, '') }
  return { tipo: 'humano', nucleo: norm(cabeca[cabeca.length - 1] ?? '') }
}

/** Os trechos colados ao nome no texto, nas três formas, antes de qualquer conferência. */
function trechosColadosAoNome(texto: string, nome: string): Array<{ trecho: string; artigo: string; forma: DescricaoDoNome2411['forma'] }> {
  const saida: Array<{ trecho: string; artigo: string; forma: DescricaoDoNome2411['forma'] }> = []
  for (const m of texto.matchAll(new RegExp(`(?<![\\p{L}\\p{N}-])${escapaRe(nome)}(?![\\p{L}\\p{N}-])`, 'gu'))) {
    const ini = m.index ?? 0
    if (DUPLO_ANTES_RE.test(texto.slice(Math.max(0, ini - 12), ini))) continue
    let fim = ini + m[0].length
    fim += (SOBRENOMES_RE.exec(texto.slice(fim, fim + 60))?.[0] ?? '').length // "Elias" lê "Elias Ward, a …"
    const resto = texto.slice(fim, fim + 240)
    const a = APOSTO_DO_NOME_RE.exec(resto)
    if (a && !(a[3] === ',' && LISTA_DEPOIS_RE.test(resto.slice(a[0].length - 1, a[0].length + 8)))) saida.push({ trecho: limpa(a[2]), artigo: a[1], forma: 'aposto' })
    const c = COPULA_DO_NOME_RE.exec(resto)
    if (c) saida.push({ trecho: limpa(c[2]), artigo: c[1], forma: 'copula' })
  }
  for (const m of texto.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])(an?|the)\\s+([^.,;:!?()\\n"“”]{2,160}?)\\s+(?:named|called)\\s+${escapaRe(nome)}(?![\\p{L}\\p{N}-])`, 'giu')))
    saida.push({ trecho: limpa(m[2]), artigo: m[1], forma: 'nomeado' })
  return saida
}

/** A descrição que o autor colou a este nome: primeiro no pedido, depois na narração (sem pistas). `ficha` = o ser esperado (null = o que a descrição disser).
 *  null = nenhuma forma, ou o trecho não passa INTEIRO na régua de descrição (dúvida = nada). */
export function descricaoDoNome2411(textos: ReadonlyArray<{ texto: string; fonte: FonteDaDescricao }>, nome: string, ficha: Pick<FichaDePersonagem, 'tipo' | 'nucleo'> | null, outros: ReadonlyArray<string> = []): DescricaoDoNome2411 | null {
  const n = limpa(nome)
  if (!/^\p{Lu}/u.test(n) || NUNCA_NOME_2411.has(norm(n.split(' ')[0]))) return null
  for (const { texto, fonte } of textos) {
    if (!texto || !escritaLatina(texto)) continue
    for (const t of trechosColadosAoNome(texto, n)) {
      const ser = serDaDescricao(t.trecho)
      // o ser esperado: o da ficha (bicho/criatura com o núcleo dela; "the retriever" × "golden retriever"); sem ficha, o que a descrição diz
      const esperado = ficha ? { tipo: ficha.tipo, nucleo: ficha.tipo === 'humano' ? ser.nucleo : norm(ficha.nucleo) === norm(n) ? ser.nucleo : norm(ficha.nucleo) } : ser
      if (ficha && ficha.tipo !== 'humano' && ser.tipo === 'humano' && !temPalavra(t.trecho, esperado.nucleo)) continue
      if (!trechoDescreve(t.trecho, t.artigo, { nome: n, nucleo: esperado.nucleo, tipo: esperado.tipo })) continue
      if (outros.some((o) => o && !mesmoPersonagem(o, n) && /^\p{Lu}/u.test(o) && temPalavra(t.trecho, o))) continue // cita outro do elenco
      return { trecho: t.trecho, artigo: t.artigo, forma: t.forma, fonte, tipo: esperado.tipo, nucleo: esperado.nucleo }
    }
  }
  return null
}

/** Nomes próprios da narração (sem pistas, sem rótulos de seção): sequências de 1 a 3 palavras com maiúscula, na ordem em que aparecem. */
export function nomesDaNarracao2411(roteiro: string): string[] {
  const texto = semTags(roteiro).replace(/(?:^|\s)[A-Z][A-Z0-9 ]{2,30}:/g, ' ') // "HOOK:", "MICRO REWARD 1:"
  const vistos: string[] = []
  for (const m of texto.matchAll(new RegExp(`(?<![\\p{L}\\p{N}'’-])\\p{Lu}\\p{Ll}+(?:'s|’s)?(?: (?:${PARTICULA_2411} )?\\p{Lu}\\p{Ll}+(?:'s|’s)?){0,3}(?![\\p{L}\\p{N}-])`, 'gu'))) { // [volta 3] "Joan of Arc" é UM nome
    let ws = m[0].replace(/(?:'s|’s)/gu, '').split(' ')
    while (ws.length && NUNCA_NOME_2411.has(norm(ws[0]))) ws = ws.slice(1)
    const nome = ws.join(' ')
    if (nome.length >= 3 && !vistos.includes(nome)) vistos.push(nome)
  }
  return vistos
}

/** O nome completo AGE na narração: "Elias Ward had kept", "Mara Quinn caught" (palavra minúscula que não é função logo depois). A oração até a pontuação. */
export function oracaoDoNome2411(roteiro: string, nome: string): string | null {
  const texto = semTags(roteiro)
  for (const m of texto.matchAll(new RegExp(`(?<![\\p{L}\\p{N}-])${escapaRe(nome)}\\s+([\\p{Ll}][^.,;:!?…\\n]{2,120})`, 'gu'))) {
    const ws = limpa(m[1]).split(' ')
    if (FUNCAO_NO_VERBO_RE.test(ws[0]) && !/^(?:is|was)$/iu.test(ws[0])) continue
    if (ws.length > 12) continue
    return ws.join(' ')
  }
  return null
}

export interface MudancaDoLeitor2411 { nome: string; acao: 'descricao' | 'nome' | 'novo' | 'papel' | 'empresa'; fonte: FonteDaDescricao | 'oracao' | 'ficha'; forma: DescricaoDoNome2411['forma'] | 'oracao' | 'ficha'; tipo: FichaDePersonagem['tipo'] }
export interface EntradaDoLeitor2411 {
  elenco: ReadonlyArray<FichaDePersonagem>
  /** body.original_idea (o pedido original; ausente = só a narração) */
  pedido: unknown
  /** o roteiro despachado (com pistas; elas não são lidas) */
  roteiro: string
  /** os nomes que a leitura semântica leu como personagem; null = a leitura não respondeu */
  lidos: ReadonlyArray<string> | null
  /** os nomes que a leitura leu como GENTE (kind human), na grafia dela. A via sem descrição (nome + sobrenome agindo) exige o nome COMPLETO aqui, exato:
   *  replay 24/11, a leitura leu "Sonic" e a narração dizia "Metal Sonic is altering…" (robô) — por sufixo ele entrava como gente. Ausente = a via não age. */
  gente?: ReadonlyArray<string> | null
  /** o que a leitura listou como lugar/empresa/título */
  lugares?: ReadonlyArray<string>
}
const ehFigura = (nome: string) => !!figuraConhecidaJuiz(nome) || !!figuraConhecida(nome)
const frasesDe2411 = (texto: string) => String(texto ?? '').split(/(?<=[.!?…;])\s+|\n+/)
const temNome = (texto: string, nome: string) => new RegExp(`(?<![\\p{L}\\p{N}-])${escapaRe(nome)}(?![\\p{L}\\p{N}-])`, 'u').test(texto)
/** [volta 3, VOLTA da revisora: Le Prince duplicado com a leitura falhando] a mesma pessoa: mesmoPersonagem OU um nome é o FIM do outro, palavra a
 *  palavra ("Prince" × "Louis Le Prince": mesmoPersonagem dá false por causa da partícula; "Le Prince" × "Louis Le Prince" também). */
const palavrasDaPessoa = (s: string) => norm(limpa(String(s ?? '').replace(/^(?:the|a|an)\s+/i, ''))).split(/[^\p{L}\p{N}'’-]+/u).filter(Boolean)
const ehFimDe = (curto: string[], longo: string[]) => curto.length > 0 && curto.length <= longo.length && curto.every((w, i) => w === longo[longo.length - curto.length + i])
export const mesmaPessoa2411 = (a: string, b: string): boolean => mesmoPersonagem(a, b) || ehFimDe(palavrasDaPessoa(a), palavrasDaPessoa(b)) || ehFimDe(palavrasDaPessoa(b), palavrasDaPessoa(a))
const nomeProprio2411 =(nome: string) => /^\p{Lu}[\p{L}'’.-]*(?: \p{Lu}[\p{L}'’.-]*){0,3}$/u.test(limpa(nome)) && !/^(?:the|a|an)\s/i.test(nome)

// A identidade comercial só impede usar o nome. Espécie, papel e aparência vêm da descrição escrita.
const NOMES_DE_OBRA = [
  'Sonic', 'Sonic the Hedgehog', 'Metal Sonic', 'Amy Rose', 'Pikachu', 'Mickey', 'Mickey Mouse', 'Garfield',
  'Harry Potter', 'Wednesday Addams', 'Lara Croft', 'James Bond', 'Indiana Jones', 'Spider-Man', 'Voldemort',
  'Sherlock Holmes', 'Super Mario', 'Shrek', 'Sasuke', 'Super Saiyan', 'Goku', 'Hermione Granger', 'Darth Vader',
]
const NOME_DE_OBRA = new Set(NOMES_DE_OBRA.map(norm))
const EMPRESA_GIGANTE = /\b(?:(?:tech(?:nology)?|retail|software|industrial|industry|corporate|media|online|telecom(?:munications)?|banking|energy|oil|pharma(?:ceutical)?|manufacturing|streaming|automotive|publishing|e-commerce|electronics|semiconductor|financial|business|shipping|logistics|aerospace|entertainment|biotech|toy|gaming|insurance|fashion|advertising|social.media)\s+giants?|giants?\s+(?:company|corporation|conglomerate|retailer|manufacturer)|giants?\s+in\s+(?:technology|retail|banking|industry|software))\b/iu
const OBRA_NOMEADA = /^(?:\s*,?\s+(?:a character |the mascot )?from (?:the |a )?(?:film|movie|series|show|comic|novel|game|book|franchise)\s+(?:called |named )?)["“']?\p{Lu}/u
const ORIGEM_COMERCIAL = /^(?:\s*,\s*(?:a|an|the)\s+|\s+(?:is|was)\s+(?:(?:a|an|the)\s+)?|\s*,?\s+from\s+the\s+)(?:(?:licensed|branded|franchise|copyrighted|trademarked)\s+(?:character|mascot)|(?:film|movie|game|series|comic|novel|franchise)\s+(?:called|named|franchise)\b)/iu

function empresaGigante(papel: string): boolean {
  return EMPRESA_GIGANTE.test(papel.split(/\s+(?:with|wearing|dressed)\s/iu)[0])
}

function identidadeDeObra(nome: string, textos: ReadonlyArray<{ texto: string }>): boolean {
  if (NOME_DE_OBRA.has(norm(nome))) return true
  // Mario e Elsa também são nomes cotidianos. Reconhecer apenas quando o texto os situa na obra.
  const papelAmbiguo = norm(nome) === 'mario' ? /\bplumber\b/iu : norm(nome) === 'elsa' ? /\bqueen\b.*\bice\b/iu : null
  if (papelAmbiguo && textos.some(({ texto }) => trechosColadosAoNome(texto, nome).some(t => papelAmbiguo.test(t.trecho)))) return true
  const termo = new RegExp('(?<![\\p{L}\\p{N}-])' + escapaRe(nome) + '(?![\\p{L}\\p{N}-])', 'giu')
  return textos.some(({ texto }) => [...texto.matchAll(termo)].some(m =>
    ORIGEM_COMERCIAL.test(texto.slice(m.index! + m[0].length)) ||
    OBRA_NOMEADA.test(texto.slice(m.index! + m[0].length)) ||
    /\b(?:licensed|branded|copyrighted|trademarked)\s+(?:character|mascot)\s+(?:(?:named|called)\s+)?$/iu.test(texto.slice(0, m.index))))
}

function fichaPeloPapel(d: DescricaoDoNome2411, protagonista: boolean): FichaDePersonagem {
  const nome = 'the ' + d.nucleo
  return { nome, nucleo: d.nucleo, tipo: d.tipo, canonica: canonicaLiteral({ nome }, d.trecho, null, null),
    origem: 'autor', protagonista, genero: null }
}

/** O elenco com quem o autor nomeou e descreveu (ver o cabeçalho da seção). Nada a fazer = o MESMO array (referência). Nunca lança: erro = o mesmo array. */
export function elencoDoLeitor2411(e: EntradaDoLeitor2411): { elenco: FichaDePersonagem[]; mudancas: MudancaDoLeitor2411[] } {
  const base = e.elenco as FichaDePersonagem[]
  try {
    const roteiro = String(e.roteiro ?? '')
    const narracao = semTags(roteiro)
    if (!narracao || !escritaLatina(narracao)) return { elenco: base, mudancas: [] }
    const pedido = textoDoPedidoOriginal(e.pedido)
    const textos = [{ texto: pedido, fonte: 'pedido' as const }, { texto: narracao, fonte: 'roteiro' as const }].filter((t) => !!t.texto)
    const lugares = (e.lugares ?? []).map((l) => norm(limpa(l)))
    const mudancas: MudancaDoLeitor2411[] = []
    let elenco = base.map((f) => ({ ...f }))
    const nomes = nomesDaNarracao2411(roteiro)
    const nomesComFicha = [...new Set([...nomes, ...base.map(f => f.nome).filter(nomeProprio2411)])]
    const obrasCitadas = [...new Set([...nomesComFicha, ...nomesDaNarracao2411(pedido)])].filter(n => identidadeDeObra(n, textos))
    // Um nome curto da leitura pode ser parte do nome comercial completo escrito no pedido.
    const obraDoNome = (n: string) => obrasCitadas.find(obra => norm(n) === norm(obra))
      ?? obrasCitadas.find(obra => obra.split(' ').length > 1 && obra.split(' ').some(parte => norm(parte) === norm(n)))
    const marcas = nomesComFicha.filter(n => !!obraDoNome(n))
    const empresas = nomesComFicha.filter(n => textos.some(({ texto }) =>
      trechosColadosAoNome(texto, n).some(t => empresaGigante(t.trecho))))
    const fichaComercial = (f: FichaDePersonagem) => empresas.includes(f.nome) || (f.tipo === 'criatura' && empresaGigante(f.nome))
    const papeis = new Map<string, DescricaoDoNome2411>()
    for (const n of marcas) {
      const obra = obraDoNome(n)!
      if (papeis.has(obra) || lugares.includes(norm(n)) || (e.lidos && !e.lidos.some(l => mesmaPessoa2411(l, n)))) continue
      const d = descricaoDoNome2411(textos, obra, null, nomesComFicha) ?? descricaoDoNome2411(textos, n, null, nomesComFicha)
      if (d && ![...NOMES_DE_OBRA, ...obrasCitadas].some(m => temNome(d.trecho, m))) papeis.set(obra, d)
    }
    const usadosComoPapel = new Set<string>()
    elenco = elenco.flatMap(f => {
      if (fichaComercial(f)) {
        mudancas.push({ nome: 'empresa', acao: 'empresa', fonte: 'ficha', forma: 'ficha', tipo: f.tipo })
        return []
      }
      const obra = obraDoNome(f.nome)
      if (obra) {
        const d = papeis.get(obra)
        mudancas.push({ nome: 'personagem', acao: 'papel', fonte: d?.fonte ?? 'ficha', forma: d?.forma ?? 'ficha', tipo: f.tipo })
        if (!d || usadosComoPapel.has(obra) || base.some(b => !nomeProprio2411(b.nome) && b.tipo === d.tipo && norm(b.nucleo) === d.nucleo)) return []
        usadosComoPapel.add(obra)
        return [fichaPeloPapel(d, f.protagonista)]
      }
      if (!nomeProprio2411(f.nome)) {
        const opcoes = [...papeis].filter(([, d]) => d.tipo === f.tipo && d.nucleo === norm(f.nucleo))
        if (opcoes.length === 1 && !usadosComoPapel.has(opcoes[0][0])) {
          const [obra, d] = opcoes[0]
          // A mesma espécie pode pertencer a outro personagem. Em dúvida, preservar a ficha anônima.
          const disputa = nomesComFicha.some(n => !obraDoNome(n) && descricaoDoNome2411(textos, n, f)?.nucleo === d.nucleo)
          if (!disputa) {
            usadosComoPapel.add(obra)
            const anonima = { ...f, canonica: canonicaLiteral(f, d.trecho, null, null), origem: 'autor' as const }
            if (f.canonica !== anonima.canonica || f.origem !== anonima.origem)
              mudancas.push({ nome: f.nome, acao: 'papel', fonte: d.fonte, forma: d.forma, tipo: f.tipo })
            return [anonima]
          }
        }
      }
      return [f]
    })
    for (const [obra, d] of papeis) {
      if (usadosComoPapel.has(obra) || elenco.length >= PERSONAGEM_MAX_PERSONAGENS ||
        elenco.some(f => !nomeProprio2411(f.nome) && norm(f.nucleo) === d.nucleo)) continue
      const f = fichaPeloPapel(d, false)
      elenco.push(f)
      mudancas.push({ nome: f.nome, acao: 'papel', fonte: d.fonte, forma: d.forma, tipo: f.tipo })
    }
    const nomesDoElenco = () => elenco.map((f) => f.nome)
    // 1. a descrição colada ao nome de quem já está no elenco
    elenco = elenco.map((f) => {
      if (!nomeProprio2411(f.nome) || (f.origem as string) === 'mitica' || ehFigura(f.nome)) return f
      // o aposto e o "named" do PEDIDO já têm dono (KINEO-FICHA-DO-PEDIDO-0911 e KINEO-APARENCIA-DO-PEDIDO-1311, para todas as contas): ficam com ele, como hoje
      if (pedido && (apostoDoPedido(pedido, f, nomesDoElenco()) || nomeadoNoPedido(pedido, f, nomesDoElenco()))) return f
      const d = descricaoDoNome2411(textos, f.nome, f, nomesDoElenco())
      if (!d) return f
      const ficha = palavrasConteudo(f.canonica)
      if (palavrasConteudo(d.trecho).every((w) => ficha.includes(w))) return f
      mudancas.push({ nome: f.nome, acao: 'descricao', fonte: d.fonte, forma: d.forma, tipo: f.tipo })
      if (f.origem === 'autor') { const [cabeca, ...resto] = f.canonica.split('; '); return { ...f, canonica: [cabeca, `${MARCA_DO_PEDIDO_2411} ${d.trecho}`, ...resto].join('; ') } }
      return { ...f, canonica: canonicaLiteral(f, d.trecho, null, null), origem: 'autor' as FichaDePersonagem['origem'] }
    })
    const candidatos = nomes.filter((n) => !marcas.includes(n) && !empresas.includes(n) && !lugares.includes(norm(n)) && !ehFigura(n) && !elenco.some((f) => mesmaPessoa2411(f.nome, n)))
    const usados = new Set<string>()
    // 2. a ficha sem nome que é o bicho/pessoa que o autor nomeou ("the retriever" = "Juno, a golden retriever …")
    elenco = elenco.map((f) => {
      if (nomeProprio2411(f.nome) || !/^the\s/i.test(f.nome)) return f
      const achados = candidatos.flatMap((n) => { const d = descricaoDoNome2411(textos, n, f, nomesDoElenco()); return d && temPalavra(d.trecho, f.nucleo) ? [{ n, d }] : [] })
      // dúvida = nada: outro nome citado na MESMA frase que a espécie ("Rex, a big brown dog, and Max, a small white dog") também pode ser ela
      const disputam = [...candidatos, ...marcas].filter((n) => textos.some(({ texto }) => frasesDe2411(texto).some((fr) => temNome(fr, n) && temPalavra(fr, f.nucleo))))
      if (achados.length !== 1 || disputam.length !== 1 || disputam[0] !== achados[0].n || usados.has(achados[0].n)) return f
      const { n, d } = achados[0]
      usados.add(n)
      mudancas.push({ nome: n, acao: 'nome', fonte: d.fonte, forma: d.forma, tipo: f.tipo })
      return { ...f, nome: n, canonica: canonicaLiteral({ nome: n }, d.trecho, null, null), origem: 'autor' as FichaDePersonagem['origem'] }
    })
    // 3. quem o autor nomeou e nenhuma ficha tem
    for (const n of candidatos) {
      if (elenco.length >= PERSONAGEM_MAX_PERSONAGENS) break
      if (usados.has(n) || elenco.some((f) => mesmaPessoa2411(f.nome, n))) continue
      const leu = e.lidos === null ? null : e.lidos.some((l) => mesmoPersonagem(l, n))
      const d = descricaoDoNome2411(textos, n, null, [...nomesDoElenco(), ...candidatos])
      let nova: FichaDePersonagem | null = null
      // a descrição cita o papel de uma ficha SEM nome que ficou (o passo 2 teve dúvida): é provavelmente a mesma pessoa/bicho — nada
      if (d && elenco.some((f) => !nomeProprio2411(f.nome) && temPalavra(d.trecho, f.nucleo))) continue
      // [volta 3] a mesma descrição que uma ficha já leva é a mesma pessoa (Le Prince: "Prince" já ganhou "bearded inventor…" pelo aposto de 09/11)
      if (d && elenco.some((f) => f.canonica.includes(d.trecho))) continue
      // [volta 3] NOVO só cria GENTE. Bicho/criatura só entra renomeando a ficha que a cadeia já tem (passo 2, Juno). Por aqui entravam, com uma
      // menção só, personagem de marca (Sonic, Pikachu, Mickey, Garfield — decisão de 14/11: o nome não vai ao motor) e empresa "giant" (Apple, Amazon)
      if (d && d.tipo !== 'humano') continue
      if (d && leu !== false) {
        nova = { nome: n, nucleo: d.tipo === 'humano' ? n.split(' ').pop()! : d.nucleo, tipo: d.tipo, canonica: canonicaLiteral({ nome: n }, d.trecho, null, null), origem: 'autor', protagonista: false, genero: d.tipo === 'humano' ? (generoDoPapel(d.trecho.split(/\s+(?:with|wearing|in|dressed)\s/iu)[0]) === 'female' ? 'woman' : generoDoPapel(d.trecho.split(/\s+(?:with|wearing|in|dressed)\s/iu)[0]) === 'male' ? 'man' : null) : null }
        mudancas.push({ nome: n, acao: 'novo', fonte: d.fonte, forma: d.forma, tipo: d.tipo })
      } else if (!d && leu === true && n.split(' ').length >= 2 && (e.gente ?? []).some((g) => norm(limpa(g)) === norm(n))) {
        const oracao = oracaoDoNome2411(roteiro, n)
        if (oracao) { nova = { nome: n, nucleo: n.split(' ').pop()!, tipo: 'humano', canonica: fichaDoAutor(n, oracao), origem: 'autor', protagonista: false, genero: null }; mudancas.push({ nome: n, acao: 'novo', fonte: 'oracao', forma: 'oracao', tipo: 'humano' }) }
      }
      if (!nova) continue
      usados.add(n)
      elenco.push(nova)
    }
    if (!mudancas.length) return { elenco: base, mudancas: [] }
    if (!elenco.some((f) => f.protagonista) && elenco.length) elenco = elenco.map((f, i) => ({ ...f, protagonista: i === 0 }))
    return { elenco, mudancas }
  } catch { return { elenco: base, mudancas: [] } }
}
