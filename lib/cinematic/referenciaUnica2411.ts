// KINEO-REFERENCIA-UNICA-2411 [teste pago 23/11, docs/filme-nota-9/teste-motores-2311/RESULTADO.md] — no filme grátis de 15 s do Kling 4, as 2 ou 3
// imagens-chave desenhadas cada uma sozinha fazem a pessoa mudar no meio (nota visual 4,0). UMA referência do personagem principal, citada nos
// planos em que ele aparece, pelo kling/v4/reference-to-video (mesmo preço por segundo), levou a 7,3. Mapa: docs/filme-nota-9/OBRA-REFERENCIA-UNICA.md.
// Puro: escolhe a referência a partir do snapshot de qualidade já pronto; o pedido é montado em lib/kling4Trial.ts (buildKling4ReferenciaUnicaInput).
import type { FilmQualitySnapshot } from '@/lib/filmComplete/qualityInheritance'
import { contaDaCasaExata } from '@/lib/internalAccounts'
import { KLING4_REFERENCE_MODEL, kling4TrialClipTotal, type Kling4ReferenciaUnica } from '@/lib/kling4Trial'
import { mentionsRealPerson } from '@/lib/hollywood/realPeople' // KINEO-DUAS-PESSOAS-CLIENTE-2511 (volta, V2) — a lista de pessoas reais da casa
import { figuraConhecida } from '@/lib/cinematic/personagemAjuste' // KINEO-DUAS-PESSOAS-CLIENTE-2511 (volta, V2) — a tabela de figuras da casa
import { figuraConhecidaJuiz } from '@/lib/cinematic/juizFicha' // KINEO-DUAS-PESSOAS-CLIENTE-2511 (volta, V2)
import { identidadeDeObra2511 } from '@/lib/cinematic/elencoEFigurino2411' // KINEO-DUAS-PESSOAS-CLIENTE-2511 (volta, V2) — o nome de obra (Lara Croft…)

export const REFERENCIA_UNICA_2411_VERSAO = 'KINEO-REFERENCIA-UNICA-2411'
export type ModoReferenciaUnica2411 = 'off' | 'internal' | 'public_humano' | 'public'
/** 'off' = o pedido à fal byte a byte o de hoje. 'internal' = só a lista EXATA da casa (contaDaCasaExata, e-mail do usuário autenticado).
 *  'public' só com revisor independente + prova paga + sim do dono.
 *  [CEO 24/11, depois da 4ª revisão LIMPA] 'internal': só a lista exata da casa, para ensaiar em filmes da casa; cliente = o pedido de hoje,
 *  byte a byte. 'public' só com prova paga em filmes da casa pelo caminho inteiro e o sim do dono. Voltar: 'off'.
 *  [CEO 24/11, KINEO-REFERENCIA-UNICA-HUMANO-2411] 'public_humano': a casa como em 'internal'; o cliente só com pessoa fotorreal e um protagonista
 *  (admitirReferenciaUnica2411). Voltar ao ensaio só da casa: 'internal'. */
export const REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'public_humano'
/** Liga SEM a guarda de cliente: a lista exata da casa em 'internal' e 'public_humano'; todo mundo só em 'public'. */
export const referenciaUnicaLigada = (modo: ModoReferenciaUnica2411, email: string | null | undefined): boolean =>
  modo === 'public' || ((modo === 'internal' || modo === 'public_humano') && contaDaCasaExata(email))

/** KINEO-REFERENCIA-UNICA-HUMANO-2411 [CEO 24/11] 'public_humano': o CLIENTE recebe a referência única só onde ela está provada (3 filmes da casa,
 *  pessoa fotorreal, notas cegas 10, 8 e 9). Em desenho, bicho e criatura a prova paga de 24/11 não ligou em nenhum (folha reprovada pelo crítico ou
 *  elenco sem folha): o cliente fica no pedido de hoje, byte a byte, e o claim grava só o código do motivo. */
export type MotivoClienteSemReferencia2411 = 'mais_de_um' | 'nao_humano' | 'mais_de_uma_folha' | 'mais_de_um_humano' /* [revisora 24/11, c06af33d] */ | 'estilizado' | 'sem_referencia'
  | 'sem_plano' | 'clipe_longo' /* [revisora 24/11, volta 3] admitido, mas o montador devolveu null: nenhum plano o mostra (15 s) / clipe de 16 a 30 s */
  | MotivoClienteSemDuasPessoas2511 /* KINEO-DUAS-PESSOAS-CLIENTE-2511: o filme com duas folhas que a régua das duas pessoas barrou */
/** Por que o cliente NÃO recebe a referência (null = recebe, se o montador achar plano que o mostra): mais de um protagonista; o protagonista ou alguém
 *  do elenco com folha que não é 'humano'; [CEO 24/11, volta 3 da revisora] mais de UM personagem com referência (folha https, ou o protagonista):
 *  dois humanos com folha nunca passaram por render, só o provado abre; o filme estilizado (isStylizedLook ou desenho infantil, o que a rota já
 *  sabe); ou nenhuma referência. Coadjuvante sem folha https não conta (Le Prince, Slocum e Cooper tinham coadjuvante só citado). */
export function motivoClienteSemReferencia2411(snapshot: FilmQualitySnapshot | null | undefined, filme: { estilizado: boolean }): MotivoClienteSemReferencia2411 | null {
  if (!retratoNoFormato(snapshot)) return 'sem_referencia'
  const leads = snapshot.characters.filter((c) => c.protagonista === true).length
  if (leads > 1) return 'mais_de_um'
  if (leads === 0) return 'sem_referencia'
  const comFolha = snapshot.characters.filter((c) => c.protagonista === true || snapshot.characterReferences.some((r) => r.nome === c.nome && https(r.url)))
  if (comFolha.some((c) => c.tipo !== 'humano')) return 'nao_humano'
  // [revisora 24/11, nota de rótulo] a folha de um coadjuvante com o protagonista sem referência nenhuma não é "mais de uma folha": é sem referência
  if (comFolha.length > 1) return referenciaUnicaDoFilme(snapshot) ? 'mais_de_uma_folha' : 'sem_referencia'
  // [revisora 24/11 · CEO, c06af33d] a forma provada (Le Prince, Slocum, Cooper) tinha UMA pessoa no elenco da folha. Dois humanos no elenco ("dynamic duo"),
  // mesmo com só uma referência https, não é a forma provada. Coadjuvante só citado no texto, que a leitura do elenco não pôs no elenco, não conta.
  if (snapshot.characters.filter((c) => c.tipo === 'humano').length > 1) return referenciaUnicaDoFilme(snapshot) ? 'mais_de_um_humano' : 'sem_referencia'
  if (filme.estilizado !== false) return 'estilizado' // na dúvida (campo ausente ou torto), estilizado
  return referenciaUnicaDoFilme(snapshot) ? null : 'sem_referencia'
}
export type AdmissaoReferenciaUnica2411 = { referencia: ReferenciaUnica2411; cliente?: true } | { motivo: MotivoClienteSemReferencia2411 } | null
/** A admissão inteira, num lugar: 'off' = null; a casa = a referência sem guarda (como em 'internal'); cliente em 'internal' = null (o de hoje, sem
 *  campo novo); cliente em 'public_humano' = a referência só se motivoClienteSemReferencia2411 der null, senão o motivo; 'public' = todos sem guarda. */
export function admitirReferenciaUnica2411(modo: ModoReferenciaUnica2411, email: string | null | undefined, snapshot: FilmQualitySnapshot | null | undefined,
  filme: { estilizado: boolean; textoDoFilme?: string /* KINEO-DUAS-PESSOAS-CLIENTE-2511 (volta) — o roteiro e o pedido */ }, duasDoCliente: ModoDuasPessoasDoCliente2511 = DUAS_PESSOAS_DO_CLIENTE_2511): AdmissaoReferenciaUnica2411 {
  if (referenciaUnicaLigada(modo, email)) { const r = referenciaUnicaDoFilme(snapshot); return r ? { referencia: comSegundaReferencia2411(r, snapshot, duasReferenciasLigadas(DUAS_REFERENCIAS_2411, email)) } : null } // KINEO-DUAS-REFERENCIAS-2411
  if (modo !== 'public_humano') return null
  const motivo = motivoClienteSemReferencia2411(snapshot, filme)
  // KINEO-DUAS-PESSOAS-CLIENTE-2511 [CEO 25/11 16:25] o cliente com DUAS folhas (o único motivo que a régua das duas pessoas pode abrir) passa pela régua; em
  // 'internal' (só a casa), o de ontem: o motivo da guarda de uma pessoa, byte a byte
  if (motivo === 'mais_de_uma_folha' && duasDoCliente === 'public_humano') {
    const duas = admitirDuasPessoasDoCliente2511(snapshot, filme)
    return 'referencia' in duas ? { referencia: duas.referencia, cliente: true } : { motivo: duas.motivo }
  }
  if (motivo) return { motivo }
  const r = referenciaUnicaDoFilme(snapshot)
  return r ? { referencia: r, cliente: true } : { motivo: 'sem_referencia' }
}
/** Para medir quando NÃO ligou para cliente: só a versão e o código do motivo (nunca texto do cliente). Barrado na guarda = o motivo da guarda;
 *  [revisora 24/11, volta 3] admitido pela guarda (referenciaUnicaDoCliente) e o envio NÃO saiu pela referência = 'clipe_longo' (clipe de 16 a 30 s:
 *  o montador só aceita 15) ou 'sem_plano' (15 s e nenhum plano o mostra). Referência usada, casa ou sem o envio = null. */
export function relatoClienteSemReferencia2411(
  timing: { referenciaUnica?: unknown; referenciaUnicaRecusa?: MotivoClienteSemReferencia2411; referenciaUnicaDoCliente?: boolean; clipSeconds?: number; fixedCharacter?: unknown } | null | undefined,
  wire?: { model: string } | null,
): { versao: string; motivo: MotivoClienteSemReferencia2411 } | null {
  if (!timing) return null
  if (!timing.referenciaUnica) return typeof timing.referenciaUnicaRecusa === 'string' ? { versao: REFERENCIA_UNICA_HUMANO_2411_VERSAO, motivo: timing.referenciaUnicaRecusa } : null
  if (timing.referenciaUnicaDoCliente !== true || timing.fixedCharacter || !wire || wire.model === KLING4_REFERENCE_MODEL) return null
  return { versao: REFERENCIA_UNICA_HUMANO_2411_VERSAO, motivo: kling4TrialClipTotal(timing.clipSeconds) !== 15 ? 'clipe_longo' : 'sem_plano' }
}
export const REFERENCIA_UNICA_HUMANO_2411_VERSAO = 'KINEO-REFERENCIA-UNICA-HUMANO-2411'

export const FRASE_REFERENCIA_PESSOA = 'Keep the face and outfit of @Image1.'
export const FRASE_REFERENCIA_DESENHO = 'Keep the exact character design of @Image1.'

// KINEO-DUAS-REFERENCIAS-2411 [CEO 24/11, etapa 4 · duas pessoas, uma foto por pessoa] — o schema público da fal (kling/v4/reference-to-video, lido em 24/11)
// aceita até 10 imagens em image_urls (@Image1, @Image2…) sem custo por imagem (sem vídeo de referência: US$ 0,157/s a 720p). LIMITE ESCOLHIDO: 2. Nenhum
// filme com 2 referências passou por render; com 3, as três frases comem ~120 dos 512 caracteres do plano e a regra de presença teria de separar três pessoas
// sem nome por plano. Só quando o elenco tem EXATAMENTE 2 personagens com folha https (o protagonista e mais um); 3 ou mais = uma referência, como hoje.
// 'internal' = só a lista EXATA da casa; cliente = o pedido de hoje, byte a byte (a guarda 'public_humano' não muda: ela nem chama isto).
export type ModoDuasReferencias2411 = 'off' | 'internal' | 'public'
export const DUAS_REFERENCIAS_2411: ModoDuasReferencias2411 = 'internal'
export const duasReferenciasLigadas = (modo: ModoDuasReferencias2411, email: string | null | undefined): boolean =>
  modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))
export const FRASE_SEGUNDA_PESSOA = 'Keep the face and outfit of @Image2.'

// KINEO-DUAS-PESSOAS-CLIENTE-2511 [CEO 25/11 16:25: "abrir a referência de DUAS pessoas (humano fotorreal) para o cliente … o que fica de fora (desenho,
// criatura, menor, três ou mais). Não abrir desenho nem criatura: não têm prova."] Prova: o dono deu ~10 ao filme de duas fichas no Kling 4 e 10 ao Gemini
// com duas fichas (25/11). RÉGUA DE ADMISSÃO do cliente (todas juntas; uma falha = o motivo, e o filme fica no pedido de hoje, sem referência):
//   1. o elenco tem EXATAMENTE 2 personagens (3 ou mais = 'duas_tres_ou_mais'), um só protagonista; [volta da revisora, N2] nome de folha ou de imagem-chave
//      que não está no elenco (a 3ª pessoa sem canônica que o leitor do retrato descartou) também é 'duas_tres_ou_mais';
//   2. os DOIS são 'humano' (bicho, criatura ou outro = 'duas_nao_humano');
//   3. os DOIS têm folha https no retrato, o protagonista pela folha (não pela imagem-chave) = 'duas_sem_folha';
//   4. o filme é fotorreal (estilizado === false; desenho, anime, 3D, desenho infantil ou campo torto = 'duas_estilizado');
//   5. [VOLTA da revisora 2c5749dd, V1 · CEO 25/11 17:20: "inverter a régua … prefiro abrir para menos gente a errar aqui"] ADULTO PROVADO em cada um:
//      só entra quem tem SINAL POSITIVO de adulto no que é dele (nome, núcleo e canônica): idade de 18 ou mais escrita ("50-60", "a 30-year-old",
//      "aged 40", "in her 30s", "40 anos") ou palavra de adulto de LISTA FECHADA (EN e PT). Sem o sinal = 'duas_menor' (língua desconhecida, idade por
//      extenso, "jovem" sem idade: tudo barra). E qualquer palavra ou idade de menor em QUALQUER texto lido (nome, núcleo e canônica dos dois, o roteiro e o
//      pedido do cliente) barra, mesmo com o sinal de adulto. A lista de menor é a segunda trava, não a régua;
//   6. [VOLTA da revisora, V2] nenhum dos dois é figura conhecida ou personagem de obra: a tabela de figuras da casa (figuraConhecida/figuraConhecidaJuiz),
//      a lista de pessoas reais (mentionsRealPerson: Obama, Swift…) no nome e na canônica, e o nome de obra (Lara Croft, Spider-Man… e "a character from
//      the game X") = 'duas_figura_conhecida'. Pessoa real citada no roteiro ou no pedido também barra (o nome iria ao motor);
//   7. o 2º sai de comSegundaReferencia2411 (a mesma da casa: nomes que não se contêm, folhas diferentes); sem o 2º = 'duas_nomes'.
// Chave: 'internal' = só a casa (o de ontem); 'public_humano' = o cliente pela régua acima. Voltar: 'internal'.
export type ModoDuasPessoasDoCliente2511 = 'internal' | 'public_humano'
export const DUAS_PESSOAS_DO_CLIENTE_2511: ModoDuasPessoasDoCliente2511 = 'public_humano'
export type MotivoClienteSemDuasPessoas2511 = 'duas_tres_ou_mais' | 'duas_nao_humano' | 'duas_sem_folha' | 'duas_estilizado' | 'duas_menor' | 'duas_figura_conhecida' | 'duas_nomes'
const SEM_LETRA_ANTES = '(?<![\\p{L}\\p{N}])', SEM_LETRA_DEPOIS = '(?![\\p{L}\\p{N}])'
// ── 5a. o SINAL de adulto (lista FECHADA; só o que é do personagem) ──
const ADULTO_PALAVRA_2511 = new RegExp(SEM_LETRA_ANTES + '(?:man|men|woman|women|gentleman|gentlemen|lady|ladies|adult|adults|husband|wife|widow|widower|father|mother|grandfather|grandmother|grandpa|grandma|grandparent|uncle|aunt|' +
  'officer|doctor|nurse|surgeon|soldier|sergeant|lieutenant|colonel|detective|inspector|sheriff|captain|commander|astronaut|pilot|professor|teacher|chef|cook|keeper|sailor|fisherman|farmer|' +
  'scientist|engineer|lawyer|judge|priest|nun|monk|retiree|businessman|businesswoman|ceo|mayor|senator|banker|journalist|reporter|firefighter|mechanic|carpenter|miner|nurse|' +
  'homem|homens|mulher|mulheres|senhor|senhora|adulto|adulta|adultos|adultas|marido|esposa|viúvo|viúva|avô|avó|tio|tia|policial|médico|médica|enfermeiro|enfermeira|soldado|' +
  'sargento|tenente|coronel|detetive|delegado|delegada|capitão|capitã|comandante|astronauta|piloto|professora|cozinheiro|cozinheira|marinheiro|pescador|fazendeiro|fazendeira|' +
  'cientista|engenheiro|engenheira|advogado|advogada|juiz|juíza|padre|freira|monge|aposentado|aposentada|empresário|empresária|prefeito|prefeita|jornalista|bombeiro|bombeira|mecânico|mineiro)' + SEM_LETRA_DEPOIS, 'iu')
const IDADE_ADULTA = '(?:1[89]|[2-9][0-9])'
const ADULTO_IDADE_2511 = new RegExp(SEM_LETRA_ANTES + IDADE_ADULTA + '(?:\\s*(?:-|–|to|a)\\s*[0-9]{2,3}s?' + SEM_LETRA_DEPOIS + '|[\\s-]*(?:years?|yrs?)[\\s-]*old|\\s*anos' + SEM_LETRA_DEPOIS + ')' +
  '|' + SEM_LETRA_ANTES + '(?:aged?|age)\\s+' + IDADE_ADULTA + SEM_LETRA_DEPOIS +
  '|' + SEM_LETRA_ANTES + 'in\\s+(?:his|her|their)\\s+(?:late\\s+|early\\s+|mid[\\s-]*)?(?:twenties|thirties|forties|fifties|sixties|seventies|eighties|nineties|[2-9]0s)' + SEM_LETRA_DEPOIS, 'iu')
// ── 5b. o sinal de MENOR (segunda trava; em todo texto lido) ──
const POUCOS = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|um|uma|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|uno|dos|cuatro|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciséis|dieciseis|diecisiete'
const MENOS_DE_18 = '(?:1[0-7]|[0-9]|' + POUCOS + ')'
const MENOR_PALAVRA_2511 = new RegExp(SEM_LETRA_ANTES + '(?:child|children|childhood|kid|kids|kiddo|boy|boys|girl|girls|baby|babies|toddler|toddlers|infant|infants|newborn|teen\\p{L}*|adolescent\\p{L}*|minor|minors|' +
  'underage|juvenile|juveniles|youth|youths|youngster|youngsters|schoolboy|schoolgirl|schoolchild|schoolchildren|schoolkid|pupil|pupils|preteen\\p{L}*|pre-teen\\p{L}*|tween|tweens|son|sons|daughter|daughters|' +
  'kindergarten\\p{L}*|preschool\\p{L}*|(?:high|middle|grade|elementary|primary|junior\\s+high)[\\s-]*school\\p{L}*|[0-9]{1,2}(?:st|nd|rd|th)[\\s-]*grade\\p{L}*|grader|graders|under[\\s-]*(?:18|eighteen)|' +
  'crian\\p{L}*|menin\\p{L}*|garot\\p{L}*|beb[eê]|beb[eê]s|bebezinh\\p{L}*|nenê|neném|adolescen\\p{L}*|aluno|alunos|aluna|alunas|colegial|filho|filhos|filha|filhas|neto|netos|neta|netas|' +
  'ensino\\s+(?:m[eé]dio|fundamental)|ni[ñn]a|ni[ñn]as|ni[ñn]o|ni[ñn]os|chico|chicos|chica|chicas|hija|hijas|hijo|hijos|muchach\\p{L}*|' +
  'fille|filles|garçon|garçons|enfant|enfants|ado|ados|écoli\\p{L}*|collégien\\p{L}*|lycéen\\p{L}*|' +
  'larka|larke|larki|larkiyan|bacha|bachay|bachi|bachchi|bachcha|beti|beta|baccha)' + SEM_LETRA_DEPOIS, 'iu')
const MENOR_ALEMAO_2511 = /(?<![\p{L}\p{N}])(?:Kind|Kinder|Junge|Jungen|Mädchen|Tochter|Töchter|Sohn|Söhne|Schüler\p{L}*|\p{L}*jährige\p{L}*)(?![\p{L}\p{N}])/u // substantivo alemão: com maiúscula ("a kind man" não é "Kind")
const MENOR_IDADE_2511 = new RegExp(SEM_LETRA_ANTES + MENOS_DE_18 + '(?:[\\s-]*(?:years?|yrs?)[\\s-]*(?:old|of\\s+age)|[\\s-]*y\\s*/?\\s*o' + SEM_LETRA_DEPOIS + '|\\s*(?:anos|años|ans|jahre?)' + SEM_LETRA_DEPOIS + '|-?j[äa]hrig\\p{L}*)' +
  '|' + SEM_LETRA_ANTES + '(?:aged?|age|idade(?:\\s+de)?)\\s*:?\\s*' + MENOS_DE_18 + SEM_LETRA_DEPOIS +
  '|' + SEM_LETRA_ANTES + '(?:1[0-7]|[0-9])\\s*(?:-|–|to|a)\\s*[0-9]{1,2}' + SEM_LETRA_DEPOIS, 'iu')
/** Algum texto diz criança, adolescente ou idade abaixo de 18 (qualquer língua que a lista conhece)? É a SEGUNDA trava: a régua é o adulto provado. */
export function textoDizMenor2511(texto: unknown): boolean {
  const t = typeof texto === 'string' ? texto : ''
  return MENOR_PALAVRA_2511.test(t) || MENOR_ALEMAO_2511.test(t) || MENOR_IDADE_2511.test(t)
}
/** O que é DO personagem (nome, núcleo, canônica), junto. */
const textoDoPersonagem2511 = (c: { nome?: unknown; nucleo?: unknown; canonica?: unknown }): string =>
  [c.nome, c.nucleo, c.canonica].filter((t): t is string => typeof t === 'string').join(' \n ')
/** O personagem tem sinal POSITIVO de adulto no que é dele (idade de 18 ou mais escrita, ou palavra de adulto da lista fechada)? */
export function adultoProvado2511(c: { nome?: unknown; nucleo?: unknown; canonica?: unknown }): boolean {
  const t = textoDoPersonagem2511(c)
  return ADULTO_IDADE_2511.test(t) || ADULTO_PALAVRA_2511.test(t)
}
/** [mantido para a leitura do guardião antigo] o personagem diz menor? */
export function pareceMenor2511(c: { nome?: unknown; nucleo?: unknown; canonica?: unknown }): boolean {
  return textoDizMenor2511(textoDoPersonagem2511(c))
}
/** [VOLTA da revisora, V2] personagens de marca pelo nome CIVIL ou de herói que a lista de obras da casa (elencoEFigurino2411 NOMES_DE_OBRA) não tem.
 *  Só nome completo ou nome que não é nome comum ("Anna", "Ken", "Mario", "Elsa" sozinhos ficam de fora: a lista de obras os pega com o texto da obra). */
const FICCAO_DE_MARCA_2511 = new RegExp(SEM_LETRA_ANTES + '(?:peter\\s+parker|miles\\s+morales|bruce\\s+wayne|batman|clark\\s+kent|superman|lois\\s+lane|tony\\s+stark|iron\\s*man|steve\\s+rogers|' +
  'captain\\s+america|bruce\\s+banner|hulk|natasha\\s+romanoff|black\\s+widow|wonder\\s+woman|diana\\s+prince|wolverine|deadpool|thanos|joker|harley\\s+quinn|catwoman|' +
  'aquaman|black\\s+panther|doctor\\s+strange|spider[\\s-]*man|spider[\\s-]*woman|luke\\s+skywalker|han\\s+solo|princess\\s+leia|leia\\s+organa|yoda|obi[\\s-]*wan(?:\\s+kenobi)?|' +
  'frodo(?:\\s+baggins)?|gandalf|aragorn|legolas|katniss(?:\\s+everdeen)?|jack\\s+sparrow|john\\s+wick|rocky\\s+balboa|rambo|forrest\\s+gump|hannibal\\s+lecter|' +
  'walter\\s+white|jon\\s+snow|daenerys(?:\\s+targaryen)?|tyrion(?:\\s+lannister)?|ron\\s+weasley|dumbledore|severus\\s+snape|elsa\\s+of\\s+arendelle|moana|' +
  'cinderella|snow\\s+white|ariel\\s+the\\s+mermaid|barbie|ken\\s+carson|luigi|princess\\s+peach|princess\\s+zelda|kratos|master\\s+chief|geralt(?:\\s+of\\s+rivia)?|' +
  'ash\\s+ketchum|naruto(?:\\s+uzumaki)?|monkey\\s+d\\.?\\s+luffy|son\\s+goku|vegeta|homer\\s+simpson|bart\\s+simpson|sponge\\s*bob|ronald\\s+mcdonald|buzz\\s+lightyear|woody\\s+pride)' + SEM_LETRA_DEPOIS, 'iu')
/** [VOLTA da revisora, V2] figura conhecida, pessoa real ou personagem de obra: a tabela da casa (mito e história), a lista de pessoas reais e o nome de obra. */
export function figuraNaReferencia2511(c: { nome?: unknown; nucleo?: unknown; canonica?: unknown }, textoDoFilme: string): boolean {
  const nomes = [c.nome, c.nucleo].filter((t): t is string => typeof t === 'string' && !!t.trim())
  if (nomes.some((n) => !!figuraConhecida(n) || !!figuraConhecidaJuiz(n) || mentionsRealPerson(n))) return true
  if (typeof c.canonica === 'string' && mentionsRealPerson(c.canonica)) return true
  if ([...nomes, typeof c.canonica === 'string' ? c.canonica : '', textoDoFilme].some((t) => FICCAO_DE_MARCA_2511.test(t))) return true
  const textos = [{ texto: textoDoFilme }, { texto: typeof c.canonica === 'string' ? c.canonica : '' }]
  return nomes.some((n) => identidadeDeObra2511(n, textos))
}
/** A régua das duas pessoas para o CLIENTE (o bloco acima): a referência com o 2º, ou o motivo. textoDoFilme = o roteiro e o pedido (lidos para menor e pessoa real). */
export function admitirDuasPessoasDoCliente2511(snapshot: FilmQualitySnapshot | null | undefined, filme: { estilizado: boolean; textoDoFilme?: string }):
  { referencia: ReferenciaUnica2411 } | { motivo: MotivoClienteSemDuasPessoas2511 } {
  if (!retratoNoFormato(snapshot)) return { motivo: 'duas_sem_folha' }
  if (snapshot.characters.length !== 2) return { motivo: 'duas_tres_ou_mais' }
  const doElenco = new Set(snapshot.characters.map((c) => c.nome))
  if (snapshot.characterReferences.some((r) => !doElenco.has(r.nome)) || snapshot.approvedStills.some((s) => s.characterNames.some((n) => !doElenco.has(n)))) return { motivo: 'duas_tres_ou_mais' } // N2
  if (snapshot.characters.filter((c) => c.protagonista === true).length !== 1) return { motivo: 'duas_sem_folha' }
  if (!snapshot.characters.every((c) => c.tipo === 'humano')) return { motivo: 'duas_nao_humano' }
  if (!snapshot.characters.every((c) => snapshot.characterReferences.some((r) => r.nome === c.nome && https(r.url)))) return { motivo: 'duas_sem_folha' }
  if (filme.estilizado !== false) return { motivo: 'duas_estilizado' } // na dúvida (campo ausente ou torto), estilizado
  const textoDoFilme = typeof filme.textoDoFilme === 'string' ? filme.textoDoFilme : ''
  if (!snapshot.characters.every((c) => adultoProvado2511(c))) return { motivo: 'duas_menor' } // 5: sem o sinal de adulto = barra
  if (snapshot.characters.some((c) => textoDizMenor2511(textoDoPersonagem2511(c))) || textoDizMenor2511(textoDoFilme)) return { motivo: 'duas_menor' } // 5: a segunda trava, em todo texto lido
  if (snapshot.characters.some((c) => figuraNaReferencia2511(c, textoDoFilme)) || mentionsRealPerson(textoDoFilme)) return { motivo: 'duas_figura_conhecida' } // 6
  const r = referenciaUnicaDoFilme(snapshot)
  if (!r || r.origem === 'imagem_chave' || r.tipo !== 'humano') return { motivo: 'duas_sem_folha' }
  const duas = comSegundaReferencia2411(r, snapshot, true)
  if (!duas.segundo || duas.segundo.frase !== FRASE_SEGUNDA_PESSOA) return { motivo: 'duas_nomes' }
  return { referencia: duas }
}
export const FRASE_SEGUNDA_DESENHO = 'Keep the exact character design of @Image2.'
/** A referência com o 2º personagem: desligado, sem exatamente 2 folhas https no elenco ou 2º fora do formato = a MESMA referência. */
export function comSegundaReferencia2411(ref: ReferenciaUnica2411, snapshot: FilmQualitySnapshot | null | undefined, ligada: boolean): ReferenciaUnica2411 {
  if (!ligada || !retratoNoFormato(snapshot)) return ref
  const comFolha = snapshot.characters.filter((c) => snapshot.characterReferences.some((r) => r.nome === c.nome && https(r.url)))
  // [revisora, volta 2] exatamente 2 com folha E o protagonista entre eles, (protagonista pela imagem-chave + 2 folhas = 3 pessoas com referência: fica uma)
  if (comFolha.length !== 2 || !comFolha.some((c) => c.protagonista === true)) return ref
  const outro = comFolha.find((c) => c.protagonista !== true)
  if (!outro || typeof outro.nome !== 'string' || !outro.nome.trim() || (outro.tipo !== 'humano' && outro.tipo !== 'animal' && outro.tipo !== 'criatura')) return ref
  const url = snapshot.characterReferences.find((r) => r.nome === outro.nome)?.url
  if (!https(url) || url === ref.imageUrl) return ref
  const nomes = [outro.nome, outro.nucleo].filter((n, i, all): n is string => typeof n === 'string' && !!n.trim() && all.indexOf(n) === i)
  // [revisora, volta 2] um nome que CONTÉM o outro como palavra ("Ana Maria" e "Ana", "Elias" e "Elias Junior"): o texto não separa os dois = uma referência
  const palavra = (a: string, b: string) => { const k = b.trim().toLowerCase().replace(/^(?:the|a|an)\s+/, ''); return Array.from(k).length >= 3 && new RegExp(`(?<![\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu').test(a) }
  if (nomes.some((a) => ref.nomes.some((b) => palavra(a, b) || palavra(b, a)))) return ref
  const descricao = descricaoDoAutor(outro.canonica)
  return { ...ref, segundo: { imageUrl: url, frase: outro.tipo === 'humano' ? FRASE_SEGUNDA_PESSOA : FRASE_SEGUNDA_DESENHO, nomes, ...(descricao ? { descricao } : {}) } }
}
export type ReferenciaUnica2411 = Kling4ReferenciaUnica & { origem: 'ficha' | 'imagem_chave' | 'folha_mantida' /* KINEO-FOLHA-DA-REFERENCIA-2411 */; tipo: 'humano' | 'animal' | 'criatura' }

const https = (u: unknown): u is string => typeof u === 'string' && /^https:\/\/[^\s]+$/i.test(u)

/** O protagonista do elenco aceito (pessoa, bicho ou criatura) e a sua referência: a ficha do elenco; senão a 1ª imagem-chave aprovada
 *  que mostra só ele. Sem protagonista, mais de um, ou sem URL https = null (o caminho de hoje). */
export function referenciaUnicaDoFilme(snapshot: FilmQualitySnapshot | null | undefined): ReferenciaUnica2411 | null {
  try { return escolherReferencia(snapshot) } catch { return null } // [revisor 24/11, volta 1] retrato torto = sem referência (o caminho de hoje), nunca erro
}
const objeto = (v: unknown): boolean => !!v && typeof v === 'object' && !Array.isArray(v)
/** Retrato fora do formato (lista ausente, item que não é objeto, imagem-chave sem characterNames) = sem referência. */
function retratoNoFormato(s: FilmQualitySnapshot | null | undefined): s is FilmQualitySnapshot {
  return objeto(s) && Array.isArray(s!.characters) && Array.isArray(s!.characterReferences) && Array.isArray(s!.approvedStills) &&
    s!.characters.every(objeto) && s!.characterReferences.every(objeto) && s!.approvedStills.every((x) => objeto(x) && Array.isArray(x.characterNames))
}
function escolherReferencia(snapshot: FilmQualitySnapshot | null | undefined): ReferenciaUnica2411 | null {
  if (!retratoNoFormato(snapshot)) return null
  const leads = snapshot.characters.filter((c) => c.protagonista === true)
  if (leads.length !== 1) return null
  const lead = leads[0]
  if (typeof lead.nome !== 'string' || !lead.nome.trim()) return null
  if (lead.tipo !== 'humano' && lead.tipo !== 'animal' && lead.tipo !== 'criatura') return null
  const fichaRef = snapshot.characterReferences.find((r) => r.nome === lead.nome), ficha = fichaRef?.url
  const still = snapshot.approvedStills.find((s) => s.characterNames.length === 1 && s.characterNames[0] === lead.nome)?.url
  const imageUrl = https(ficha) ? ficha : https(still) ? still : null
  if (!imageUrl) return null
  const nomes = [lead.nome, lead.nucleo].filter((n, i, all): n is string => typeof n === 'string' && !!n.trim() && all.indexOf(n) === i)
  const descricao = descricaoDoAutor(lead.canonica) // KINEO-REFERENCIA-UNICA-PUBLIC-2411 — a pessoa sem nome no plano só é ele quando repete esta descrição
  return { imageUrl, frase: lead.tipo === 'humano' ? FRASE_REFERENCIA_PESSOA : FRASE_REFERENCIA_DESENHO, nomes, ...(descricao ? { descricao } : {}),
    origem: https(ficha) ? ((fichaRef as { mantida?: unknown }).mantida === true ? 'folha_mantida' : 'ficha') : 'imagem_chave', tipo: lead.tipo } // KINEO-FOLHA-DA-REFERENCIA-2411: a folha que a rota tirou do retrato e a admissão da casa devolveu
}
/** KINEO-REFERENCIA-UNICA-PUBLIC-2411 — da canônica do elenco, só o que o AUTOR e o PEDIDO disseram dele (o trecho entre aspas de "exactly as the author
 *  wrote:" e o de "as the request describes:"); as âncoras, a origem e a linha de estilo são NOSSAS e repetem o resto do plano. Nada achado = undefined. */
export function descricaoDoAutor(canonica: unknown): string | undefined {
  const c = typeof canonica === 'string' ? canonica : ''
  const partes = [/exactly as the author wrote:\s*"([^"]+)"/u.exec(c)?.[1], /as the request describes:\s*([^;]+)/u.exec(c)?.[1]]
    .filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim())
  return partes.length ? partes.join('; ') : undefined
}

/** [revisor 24/11, volta 1] O que os JUÍZES leem: a frase de referência é instrução ao motor, não conteúdo da cena. Ela sai antes do juízo, para o
 *  juiz de antes, o A2 e o juiz do plano lerem o MESMO texto (juizLeuOMesmoTexto continua valendo; sem 2ª leitura paga a mais). O que vai à fal e
 *  ao claim continua o pedido real. Sem a referência única no envio = a MESMA entrada, intocada (desligado = byte a byte). */
export type EnvioKling4 = { model: string; input: Record<string, unknown>; planosComFrase?: readonly boolean[]; planosComSegunda?: readonly boolean[] /* KINEO-DUAS-REFERENCIAS-2411 */; fichaRetirada?: readonly (string | null)[] /* KINEO-REFERENCIA-UNICA-PUBLIC-2411 */ }
export function entradaDoJuiz2411(timing: Parameters<typeof relatoReferenciaUnica>[0], wire: EnvioKling4): Record<string, unknown> {
  const ref = timing?.referenciaUnica
  if (!ref || !relatoReferenciaUnica(timing, wire) || !Array.isArray(wire.input.multi_prompt)) return wire.input
  // [revisor 24/11, volta 3] UMA fonte de verdade: a frase só sai dos planos em que o MONTADOR a pôs (wire.planosComFrase, a decisão de
  // buildKling4ReferenciaUnicaInput). Plano sem a nossa frase fica como foi à fal, mesmo que o cliente tenha escrito uma frase igual. Sem a decisão = nada sai.
  const marcados = Array.isArray(wire.planosComFrase) ? wire.planosComFrase : []
  const frase = ' ' + ref.frase.trim()
  const segundos = Array.isArray(wire.planosComSegunda) && ref.segundo ? wire.planosComSegunda : [] // KINEO-DUAS-REFERENCIAS-2411
  const nossas = (i: number): string => (marcados[i] === true ? frase : '') + (segundos[i] === true && ref.segundo ? ' ' + ref.segundo.frase.trim() : '')
  // dentro do plano marcado, só a ocorrência que nós pusemos: pela posição (antes de "Mouth closed, no speaking." ou no fim), nunca outra igual do cliente
  const semANossa = (p: string, f: string = frase): string => p.endsWith(f + CAUDA_DA_BOCA_2411) ? p.slice(0, -(f + CAUDA_DA_BOCA_2411).length) + CAUDA_DA_BOCA_2411
    : p.endsWith(f) ? p.slice(0, -f.length) : p
  // KINEO-REFERENCIA-UNICA-PUBLIC-2411 — plano sem o personagem de onde o montador tirou a ficha dele: o juiz lê o texto que o montador recebeu (o mesmo
  // do juiz de antes; a retirada, como a frase, é decisão do montador para o motor). Só pelo registro do montador, nunca pela busca no texto.
  const retirada = Array.isArray(wire.fichaRetirada) ? wire.fichaRetirada : []
  return { ...wire.input, multi_prompt: (wire.input.multi_prompt as Array<Record<string, unknown>>).map((m, i) =>
    typeof retirada[i] === 'string' && marcados[i] !== true ? { ...m, prompt: retirada[i] }
    : (marcados[i] === true || segundos[i] === true) && typeof m?.prompt === 'string' && semANossa(m.prompt, nossas(i)) !== m.prompt ? { ...m, prompt: semANossa(m.prompt, nossas(i)) } : m) } // KINEO-DUAS-REFERENCIAS-2411: nossas(i) = só a do protagonista quando não há 2º (o de antes)
}
const CAUDA_DA_BOCA_2411 = ' Mouth closed, no speaking.' // a mesma cauda que buildKling4ReferenciaUnicaInput protege (lib/kling4Trial.ts)

/** Para medir depois: o que foi à fal saiu pela referência única? (só nomes de campo, índices e a origem; nunca texto do cliente) */
export function relatoReferenciaUnica(
  timing: { fixedCharacter?: unknown; referenciaUnica?: Kling4ReferenciaUnica & Partial<Pick<ReferenciaUnica2411, 'origem' | 'tipo'>> } | null | undefined,
  wire: EnvioKling4,
): { versao: string; origem: string | null; tipo: string | null; planos: number; planos_com_frase: number[]; planos_sem_ficha: number[]; planos_metade: number[]; planos_com_segunda?: number[] } | null {
  const ref = timing?.referenciaUnica
  if (!ref || timing?.fixedCharacter || wire.model !== KLING4_REFERENCE_MODEL) return null
  const planos = Array.isArray(wire.input.multi_prompt) ? wire.input.multi_prompt as Array<{ prompt?: unknown }> : []
  return { versao: REFERENCIA_UNICA_2411_VERSAO, origem: ref.origem ?? null, tipo: ref.tipo ?? null, planos: planos.length,
    planos_com_frase: (Array.isArray(wire.planosComFrase) ? wire.planosComFrase : []).flatMap((m, i) => m === true ? [i + 1] : []),
    planos_sem_ficha: (Array.isArray(wire.fichaRetirada) ? wire.fichaRetirada : []).flatMap((t, i) => typeof t === 'string' ? [i + 1] : []),
    planos_metade: (Array.isArray(ref.metades) && ref.metades.length === planos.length ? ref.metades : []).flatMap((m, i) => m === true ? [i + 1] : []),
    ...(Array.isArray(wire.planosComSegunda) ? { planos_com_segunda: wire.planosComSegunda.flatMap((m, i) => m === true ? [i + 1] : []) } : {}) } // KINEO-DUAS-REFERENCIAS-2411 // [volta 3] a decisão do montador, não a busca do texto (frase do cliente não conta) · KINEO-REFERENCIA-UNICA-PUBLIC-2411: + os planos sem o personagem de onde a ficha dele saiu
}
