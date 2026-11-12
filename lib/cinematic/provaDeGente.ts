// KINEO-ELENCO-PROVA-DE-GENTE-1211 — a ficha só dá corpo de GENTE a quem o texto prova que é gente.
// Medido no banco (12/11, claims de 10 dias): toda ficha "X, a person in their thirties…" (o gênero ficou sem prova) era de algo que não é
// gente — Argentinosaurus, Houston, Fiery, Essential, Moral — e o motor desenhou um homem de cabelo cacheado e casaco no lugar do bicho/lugar.
// Causa: os dois construtores determinísticos (elencoEpoca.personagensNomeados e folhaDePersonagem.elencoDeterministico) são "humano por
// padrão": nome com maiúscula que age, sem espécie achada perto, ganhava cabelo, rosto e roupa sorteados.
// A regra (código, sem lista de entidades): nome PRÓPRIO que caiu no padrão humano só fica no elenco com prova de gente no próprio texto —
// título (Dr., Baba…), papel de pessoa colado ao nome, pronome/papel com gênero nas frases do nome (ou na seguinte), ou primeiro nome da
// tabela fixa de nomes. Sem prova: fica FORA do elenco (a cena continua dizendo o nome; nada é inventado no lugar). Nome de gênero
// científico (‑saurus, ‑raptor…) sai também da folha, como já saía da camada elencoEpoca (KINEO-ESPECIE-NAO-E-GENTE-1111).
// E a linha de origem diz a pessoa que a PRÓPRIA ficha descreve ("the man, a man…" nunca vira "origin: a … woman" pelo gênero de outra).
// Atrás do interruptor: 'internal' = só contas da casa (isInternalEmail); 'all' = todo filme. Desligado = byte a byte o de antes.
// Guardião: scripts/test-elenco-prova-de-gente-1211.mjs.

export type ModoProvaDeGente = 'internal' | 'all'
export const ELENCO_PROVA_DE_GENTE: ModoProvaDeGente = 'internal' // só a casa até os 2 filmes pagos de prova
export const ELENCO_PROVA_DE_GENTE_VERSAO = 'prova_de_gente_1211_v1'

export function provaDeGenteLigada(modo: ModoProvaDeGente, contaDaCasa: boolean): boolean {
  return modo === 'all' || (modo === 'internal' && contaDaCasa === true)
}

// a tabela fixa de primeiros nomes (Amna, Gabriel…) vai à folha por injeção: folhaDePersonagem não importa a camada de época
export { generoDoNome as generoDoNomeDaFolha } from '@/lib/cinematic/elencoEpoca'
