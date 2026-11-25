// KINEO-FALA-DOS-PERSONAGENS-2511 [revisora 392f0a52 · CEO 25/11 19:xx, T1 e T2] — a régua de PESSOA de quem FALA no modo "personagens falam": adulto provado
// (sinal positivo de idade ≥ 18 ou palavra de adulto de lista fechada; a lista de menor é a segunda trava, em todo texto lido) e figura conhecida (mito e
// história da casa, pessoa real da lista anti-deepfake, personagem de obra ou de marca). As expressões são AS MESMAS da volta das duas pessoas
// (KINEO-DUAS-PESSOAS-CLIENTE-2511, 977c0a095, lib/cinematic/referenciaUnica2411.ts), ainda em revisão: quando ela subir, as duas passam a ler este módulo.
// Puro: sem rede, sem banco.
import { mentionsRealPerson } from '@/lib/hollywood/realPeople'
import { figuraConhecida } from '@/lib/cinematic/personagemAjuste'
import { figuraConhecidaJuiz } from '@/lib/cinematic/juizFicha'

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
/** O que é do personagem (nome, núcleo, canônica) diz menor? */
export function pareceMenorNaFala2511(c: { nome?: unknown; nucleo?: unknown; canonica?: unknown }): boolean {
  return textoDizMenor2511(textoDoPersonagem2511(c))
}
/** [VOLTA da revisora, V2] personagens de marca pelo nome CIVIL ou de herói que a lista de obras da casa (elencoEFigurino2411 NOMES_DE_OBRA) não tem.
 *  Só nome completo ou nome que não é nome comum ("Anna", "Ken", "Mario", "Elsa" sozinhos ficam de fora: a lista de obras os pega com o texto da obra). */
const FICCAO_DE_MARCA_2511 = new RegExp(SEM_LETRA_ANTES + '(?:peter\\s+parker|' +
  // + a lista de obras da casa (lib/cinematic/elencoEFigurino2411 NOMES_DE_OBRA, não exportada na main)
  'sonic(?:\\s+the\\s+hedgehog)?|metal\\s+sonic|amy\\s+rose|pikachu|mickey(?:\\s+mouse)?|minnie\\s+mouse|donald\\s+duck|garfield|harry\\s+potter|hermione(?:\\s+granger)?|' +
  'wednesday\\s+addams|lara\\s+croft|james\\s+bond|indiana\\s+jones|voldemort|sherlock(?:\\s+holmes)?|super\\s+mario|shrek|sasuke(?:\\s+uchiha)?|super\\s+saiyan|goku|darth\\s+vader|' +
  'miles\\s+morales|bruce\\s+wayne|batman|clark\\s+kent|superman|lois\\s+lane|tony\\s+stark|iron\\s*man|steve\\s+rogers|' +
  'captain\\s+america|bruce\\s+banner|hulk|natasha\\s+romanoff|black\\s+widow|wonder\\s+woman|diana\\s+prince|wolverine|deadpool|thanos|joker|harley\\s+quinn|catwoman|' +
  'aquaman|black\\s+panther|doctor\\s+strange|spider[\\s-]*man|spider[\\s-]*woman|luke\\s+skywalker|han\\s+solo|princess\\s+leia|leia\\s+organa|yoda|obi[\\s-]*wan(?:\\s+kenobi)?|' +
  'frodo(?:\\s+baggins)?|gandalf|aragorn|legolas|katniss(?:\\s+everdeen)?|jack\\s+sparrow|john\\s+wick|rocky\\s+balboa|rambo|forrest\\s+gump|hannibal\\s+lecter|' +
  'walter\\s+white|jon\\s+snow|daenerys(?:\\s+targaryen)?|tyrion(?:\\s+lannister)?|ron\\s+weasley|dumbledore|severus\\s+snape|elsa\\s+of\\s+arendelle|moana|' +
  'cinderella|snow\\s+white|ariel\\s+the\\s+mermaid|barbie|ken\\s+carson|luigi|princess\\s+peach|princess\\s+zelda|kratos|master\\s+chief|geralt(?:\\s+of\\s+rivia)?|' +
  'ash\\s+ketchum|naruto(?:\\s+uzumaki)?|monkey\\s+d\\.?\\s+luffy|son\\s+goku|vegeta|homer\\s+simpson|bart\\s+simpson|sponge\\s*bob|ronald\\s+mcdonald|buzz\\s+lightyear|woody\\s+pride)' + SEM_LETRA_DEPOIS, 'iu')
/** [VOLTA da revisora, V2] figura conhecida, pessoa real ou personagem de obra: a tabela da casa (mito e história), a lista de pessoas reais e o nome de obra. */
/** Quem fala é figura conhecida, pessoa real, personagem de obra ou de marca? (o nome, o núcleo e a canônica do personagem) */
export function falanteConhecido2511(c: { nome?: unknown; nucleo?: unknown; canonica?: unknown } | null | undefined): boolean {
  const nomes = [c?.nome, c?.nucleo].filter((t): t is string => typeof t === 'string' && !!t.trim())
  if (nomes.some((n) => !!figuraConhecida(n) || !!figuraConhecidaJuiz(n) || mentionsRealPerson(n))) return true
  const canonica = typeof c?.canonica === 'string' ? c.canonica : ''
  return mentionsRealPerson(canonica) || [...nomes, canonica].some((t) => FICCAO_DE_MARCA_2511.test(t))
}
/** Quem fala num filme FOTORREAL é adulto provado e nada do que é dele (nem a própria fala) diz menor? (falha fechada: sem o sinal de adulto, não) */
export function falanteAdulto2511(c: { nome?: unknown; nucleo?: unknown; canonica?: unknown } | null | undefined, falas: ReadonlyArray<string>): boolean {
  if (!c) return false
  return adultoProvado2511(c) && !pareceMenorNaFala2511(c) && !falas.some((t) => textoDizMenor2511(t))
}
