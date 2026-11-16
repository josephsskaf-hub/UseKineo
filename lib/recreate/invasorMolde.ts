// ═══ KINEO-INVASOR-DE-CAMPO-1511 [dono 15/11: "Esse é o vídeo de futebol que eu quero no Recreate, pra pessoa trocar o rosto!"] ═══════════
// O molde "Pitch invader": o MESMO vídeo de 18,4 s que a CEO montou à mão em 14/11 (docs/decisoes-1311/recreate-reel-CABELO-NOVO-INTEIRO-1411.mp4),
// agora feito pelo produto a partir de UMA foto. Os dados do molde (trechos, cortes, arquivos, alvo) moram AQUI, só do servidor: nenhum módulo
// 'use client' alcança este arquivo pelo grafo de imports (KINEO-RECEITA-FORA-DO-JS-1411; o guardião scripts/test-invasor-de-campo-1511.mjs confere).
// Sem import 'server-only' de propósito: os guardiões carregam estes módulos num loader sem esse dublê (o mesmo motivo de ./movimentoMoldes).
//
// OS CORTES (achados em 15/11 casando cada quadro do vídeo de 18,4 s com o original docs/decisoes-1311/reel-DfnUolbRxTf.mp4, 1080×1920, 30 fps,
// 717 quadros; o som casado por correlação: o mesmo desvio de 5,36 s depois dos 16 s):
//   trecho 0 = quadros 0 a 239 do original (0,000 a 8,000 s): 8,0 s, um plano (a corrida, o encontrão com o nº 13 começa aos 8 s);
//   trecho 1 = quadros 240 a 479 (8,000 a 16,000 s): 8,0 s, o MESMO plano (a queda, ele senta e gesticula);
//   (16,0 a 21,2 s ficam de fora: vários cortes e o alvo coberto pelo nº 9 — 3 tentativas pagas em 14/11, nenhuma troca);
//   trecho 2 = quadros 641 a 712 (21,367 a 23,767 s): 2,4 s do último plano (ele se levanta). Abaixo de 3 s o Kling recusa: os 72 quadros foram
//              REESCRITOS a 24 fps (setpts, sem duplicar quadro) = 3,0 s, e a montagem devolve a velocidade (125%).
// O som do filme é o do original nos mesmos cortes (0 a 16 s + 21,367 a 23,767 s, com o buraco de carimbo de tempo do AAC preenchido), 18,4 s, MP3.
// Os arquivos moram no bucket PRIVADO `quarantine`, pasta recreate-guias/v1 (a mesma dos guias de movimento; a limpeza de 48 h só toca a auditoria),
// com tamanho e sha256 conferidos aqui. Ao fornecedor vão por URL assinada de 1 h; nunca por URL pública, nunca em evento ou log.
// Vídeo de transmissão de terceiros: só a conta da casa vê o molde (swapInTest), e ele NUNCA vai para a home, a vitrine pública ou o catálogo público.
// KINEO-HOME-PITCH-1611 [dono 16/11: "Coloca o pitch na homepage!!"] — continua valendo para ESTE arquivo (trechos, som, vitrine do original): nada daqui vai à
// home. O cartão da home mostra só o NOSSO render (teste pago a3b76cb7, rosto inventado), recortado sem jogador, camisa, número, patrocínio ou escudo
// (public/previews/galeria/invasor-de-campo.mp4), e o link sai de lib/recreate/entry.ts RECREATE_MOLDES_SO_LOGADO (só o id).
import type { RecreateFormat } from './formats'
import { recreateCreditCostMoldeDaCasa, recreateCreditCostVariosTrechos } from '@/lib/checkoutPricing'

// ═══ KINEO-REMODELAMENTO-MOLDES-1611 [dono 16/11 ~00:10: "por que não podemos fazer o do basquete e o do cachorro pra hoje?"; CEO 16/11] ═══
// A máquina de vários trechos virou MOLDES POR DADOS: cada molde é um registro (id, título, trechos, som, alvo, cartão, preço, interruptor). O Pitch invader é o
// 1º registro, com os MESMOS valores de antes (o guardião prova byte a byte o que ele manda à fal e à montagem). Molde novo nasce SÓ DA CASA, com o interruptor
// próprio (aberto: false) e o preço provisório da casa (lib/checkoutPricing.ts RECREATE_PRICING_MOLDES_DA_CASA_AGUARDA_DONO).
export const INVASOR_ID = 'invasor-de-campo' as const
export const INVASOR_BUCKET = 'quarantine' as const
export const INVASOR_PASTA = 'recreate-guias/v1' as const

export type ArquivoDoMolde = { arquivo: string; bytes: number; sha256: string; contentType: string }
export type TrechoDoInvasor = ArquivoDoMolde & {
  /** quadros do original, inclusivos — documentação do corte. */
  quadros: readonly [number, number]
  /** segundos do arquivo enviado ao motor (o motor devolve essa duração, em 24 fps). */
  segundosDoArquivo: number
  /** quadros por segundo do arquivo enviado (a trava lê os mesmos instantes no original sem consultar a URL assinada). */
  fps: number
  /** segundos que o trecho ocupa no filme final. */
  segundosNoFilme: number
  /** velocidade da montagem (100 = normal; 125 = o trecho alongado de 2,4 → 3,0 s volta ao tempo real). */
  velocidade: number
}
/** O alvo do texto: a PESSOA pela roupa (a receita de 14/11) ou o BICHO pela aparência. */
export type AlvoDoMolde =
  | { tipo: 'pessoa'; texto: string; deOculos: boolean; roupa: string }
  | { tipo: 'bicho'; texto: string }
export interface MoldeDeTrechos {
  id: string
  titulo: string
  /** dia em que o molde entrou no catálogo (YYYY-MM-DD). */
  desde: string
  trechos: readonly TrechoDoInvasor[]
  /** o som do filme (o original nos mesmos cortes, ou a faixa da NOSSA biblioteca quando o original tem música com direitos). */
  som: ArquivoDoMolde & { segundos: number }
  /** o cartão: `<id>.mp4` (a prévia) e `<id>.jpg` (o pôster), no bucket privado, servidos por redirecionamento curto a quem pode ver o molde. */
  vitrine: Readonly<Record<string, ArquivoDoMolde>>
  entrada: { largura: number; altura: number }
  saida: { largura: number; altura: number; fps: number }
  alvo: AlvoDoMolde
  /** a duração inteira do cartão e da linha (`seconds`). */
  segundos: number
  /** O INTERRUPTOR DE UMA LINHA. false = só a casa vê e pede (swapInTest). true = todo cliente logado (swapApproved) — e só com preço PÚBLICO. */
  aberto: boolean
  /** créditos PÚBLICOS (null = ainda sem o sim do dono) e da CASA (provisório, só enquanto o molde é da casa). */
  creditosPublicos: number | null
  creditosDaCasa: number | null
  esperaMinutos: readonly [number, number]
  approvedOn?: string
  nota: string
}

// ─── 1. Pitch invader (KINEO-INVASOR-DE-CAMPO-1511) — os valores de antes, sem mudança ───
// OS CORTES (achados em 15/11 casando cada quadro do vídeo de 18,4 s com o original docs/decisoes-1311/reel-DfnUolbRxTf.mp4, 1080×1920, 30 fps,
// 717 quadros; o som casado por correlação: o mesmo desvio de 5,36 s depois dos 16 s):
//   trecho 0 = quadros 0 a 239 do original (0,000 a 8,000 s): 8,0 s, um plano (a corrida, o encontrão com o nº 13 começa aos 8 s);
//   trecho 1 = quadros 240 a 479 (8,000 a 16,000 s): 8,0 s, o MESMO plano (a queda, ele senta e gesticula);
//   (16,0 a 21,2 s ficam de fora: vários cortes e o alvo coberto pelo nº 9 — 3 tentativas pagas em 14/11, nenhuma troca);
//   trecho 2 = quadros 641 a 712 (21,367 a 23,767 s): 2,4 s do último plano (ele se levanta). Abaixo de 3 s o Kling recusa: os 72 quadros foram
//              REESCRITOS a 24 fps (setpts, sem duplicar quadro) = 3,0 s, e a montagem devolve a velocidade (125%).
// O som do filme é o do original nos mesmos cortes (0 a 16 s + 21,367 a 23,767 s, com o buraco de carimbo de tempo do AAC preenchido), 18,4 s, MP3.
export const INVASOR_TRECHOS: readonly TrechoDoInvasor[] = [
  { arquivo: 'recreate-invasor-de-campo-t0-v1.mp4', bytes: 9284106, sha256: '3298998a8c7b8b0e6d1f5eaed7541b3a3480c24e17287080f0dc4527220df342', contentType: 'video/mp4', quadros: [0, 239], segundosDoArquivo: 8, fps: 30, segundosNoFilme: 8, velocidade: 100 },
  { arquivo: 'recreate-invasor-de-campo-t1-v1.mp4', bytes: 9683089, sha256: '1f1c997186bf757e3ae6d822f3d4f699329c41b7b62275d3abef26c40d18c80b', contentType: 'video/mp4', quadros: [240, 479], segundosDoArquivo: 8, fps: 30, segundosNoFilme: 8, velocidade: 100 },
  { arquivo: 'recreate-invasor-de-campo-t2-v1.mp4', bytes: 2707495, sha256: 'ebd3265b2947bc67204d8325381e7ca8b7c7b0a0799c8dba24560fc629aece97', contentType: 'video/mp4', quadros: [641, 712], segundosDoArquivo: 3, fps: 24, segundosNoFilme: 2.4, velocidade: 125 },
]
export const INVASOR_SOM: ArquivoDoMolde & { segundos: number } = { arquivo: 'recreate-invasor-de-campo-som-v1.mp3', bytes: 443392, sha256: '51d8314c77286b2bf5dc081c09b6117bc0b3bf95f1b273618405f71e7c053e20', contentType: 'audio/mpeg', segundos: 18.4 }
/** O cartão: o original nos mesmos cortes, 720×1280, com o som — "o que você vai receber". Servido por redirecionamento curto. */
export const INVASOR_VITRINE: Readonly<Record<string, ArquivoDoMolde>> = {
  'invasor-de-campo.mp4': { arquivo: 'recreate-invasor-de-campo-vitrine-v1.mp4', bytes: 6881480, sha256: '6373d40d0df502e51601a57af9b35ee8a2e6004fd2a7004b0883693e7964ecf5', contentType: 'video/mp4' },
  'invasor-de-campo.jpg': { arquivo: 'recreate-invasor-de-campo-vitrine-v1.jpg', bytes: 70434, sha256: '01551c37b78a5f3413889d2efc2b3641357c6120504c0e5c4ebaf225c1b86b77', contentType: 'image/jpeg' },
}
/** Os arquivos dos trechos: 1080×1920 (o original). */
export const INVASOR_ENTRADA = { largura: 1080, altura: 1920 } as const
/** A saída do Kling 4.0 edição em 720p para a entrada 1080×1920: 720×1280, 24 fps. */
export const INVASOR_SAIDA = { largura: 720, altura: 1280, fps: 24 } as const
/** O alvo pela ROUPA, que não muda (a receita de 14/11: nunca pela pose). */
export const INVASOR_ALVO = 'the man in the dark blue shirt' as const
/** O homem do vídeo usa óculos: sem a cláusula "wears no glasses" o motor os mantém. */
export const INVASOR_ALVO_DE_OCULOS = true

// KINEO-INVASOR-DE-CAMPO-1511 [CEO 15/11] — O INTERRUPTOR DE UMA LINHA. false = só a casa vê e pede (swapInTest). true = o molde vai a TODO cliente logado na grade do
// Recreate (swapApproved), com o preço da tabela (lib/checkoutPricing.ts). Só depois do teste pago da casa (quadros conferidos) e do sim do dono no preço.
// Não põe nada na home nem na vitrine pública de visitante.
// ABERTO em 15/11 (CEO): teste pago da casa aprovado (clipe a3b76cb7, 6 min 40 s, 18,4 s com som, rosto trocado nos 3 trechos, folha a 2 fps conferida), 2ª revisão
// independente com os 2 bloqueios consertados (varredura de estorno do invasor; pausa do motor, um por vez, teto de "não trocou" e reconferência na rota), molde e
// preço de 75 aprovados pelo dono. Volta: false.
export const INVASOR_ABERTO_AO_PUBLICO: boolean = true

const PITCH_INVADER: MoldeDeTrechos = {
  id: INVASOR_ID, titulo: 'Pitch invader', desde: '2026-11-15', trechos: INVASOR_TRECHOS, som: INVASOR_SOM, vitrine: INVASOR_VITRINE,
  entrada: INVASOR_ENTRADA, saida: INVASOR_SAIDA, alvo: { tipo: 'pessoa', texto: INVASOR_ALVO, deOculos: INVASOR_ALVO_DE_OCULOS, roupa: 'Keep the original clothing from @Video1.' },
  segundos: 18, aberto: INVASOR_ABERTO_AO_PUBLICO, creditosPublicos: recreateCreditCostVariosTrechos(18), creditosDaCasa: null, approvedOn: '2026-11-15',
  esperaMinutos: [10, 15], // 3 trechos de 1,5 a 4 min cada (medido 13–14/11: 88 a 259 s por pedido) + a trava de cada trecho + a montagem
  nota: '15/11: 3 Kling 4.0 edit segments (8 + 8 + 2.4 s) one at a time + assembly with the original sound; house only (third-party broadcast clip)',
}

// ─── 2. Basquete (KINEO-REMODELAMENTO-MOLDES-1611) — docs/remodelamento-1511/DftZ5FrnJPD.mp4 (720×1280, 24 fps, 481 quadros = 20,04 s; ficha em FICHAS.md) ───
// Versão de 14 s, 2 trechos de SEGUNDO INTEIRO: trecho 0 = quadros 136 a 327 (5,667 a 13,667 s: o drible de frente e a enterrada; o clarão de 1 quadro em
// 10,6 s fica dentro); trecho 1 = quadros 328 a 471 (13,667 a 19,667 s, 6 s: a comemoração gritando de frente; KINEO-SEGUNDO-INTEIRO-1611 — era até o quadro 480,
// 6,375 s, e o Kling devolveu 6,042 s). Medido em 16/11 quadro a quadro: não há corte seco em 13,65 s (a câmera desce no pouso); a emenda no meio do plano é como o 8/8 do Pitch invader.
// O ALVO, como está no vídeo: camiseta PRETA com a estampa branca do evento do autor ("Salto Criativo / 21/22 de novembro, link na bio"), bermuda escura, cabelo
// comprido cacheado, barba e ÓCULOS — o alvo vai pela roupa (o cabelo é o que muda). Os árbitros vestem cinza e os jogadores, branco: "the man in the black t-shirt"
// é único no quadro.
// O SOM ORIGINAL TEM "Forever" (Drake, Kanye West, Lil Wayne, Eminem): NÃO entra. No lugar, a faixa hustle-02 da NOSSA biblioteca de música dos filmes ("Soulja Unit -
// Basic (2019)", music-novas/README.md: as 59 faixas são CC0, domínio público, colhidas pela API do Openverse em 21/08/2026; no bucket `music`), de 1,0 s, 14 s,
// normalizada a −16 LUFS, entrada de 0,15 s e saída de 0,6 s.
// VARIANTE "camiseta lisa" (para tirar a estampa do autor da roupa do cliente): BASQUETE_CAMISETA_LISA, DESLIGADA. Ligada, a frase da roupa vira "Keep the original
// shorts and shoes from @Video1, and he wears a plain black t-shirt." Nunca testada (trocar roupa junto com o rosto); a CEO decide depois do teste.
export const BASQUETE_ABERTO_AO_PUBLICO: boolean = false
// KINEO-CAMISETA-LISA-1611 [dono 16/11 ~01:50: "testa a lisa"] — ligada para o teste pago da casa; o molde segue só da casa.
export const BASQUETE_CAMISETA_LISA: boolean = true
const BASQUETE: MoldeDeTrechos = {
  id: 'basquete', titulo: 'Slam dunk', desde: '2026-11-16',
  trechos: [
    { arquivo: 'recreate-basquete-t0-v1.mp4', bytes: 5814759, sha256: 'daefcb503a519d42aa5674892cf859ee53eeda6fc14d394dfb5e26f21e72aae3', contentType: 'video/mp4', quadros: [136, 327], segundosDoArquivo: 8, fps: 24, segundosNoFilme: 8, velocidade: 100 },
    // KINEO-SEGUNDO-INTEIRO-1611 — era t1-v1 (quadros 328–480, 6,375 s): o Kling devolveu 6,042 s (clipe 90a42302, invasor_segment_short). Agora 6 s inteiros, mesmo início.
    { arquivo: 'recreate-basquete-t1-v2.mp4', bytes: 4120362, sha256: '5563069b96ea2c10f5b4e283ffe762fdf5ccecd9cd0a5074e5d7182a3be75629', contentType: 'video/mp4', quadros: [328, 471], segundosDoArquivo: 6, fps: 24, segundosNoFilme: 6, velocidade: 100 },
  ],
  som: { arquivo: 'recreate-basquete-som-v2.mp3', bytes: 337337, sha256: 'cbcfb586a2b8c85478f5acfdece1d2443df0af180f900801d9ff1895dc0ffb05', contentType: 'audio/mpeg', segundos: 14 },
  vitrine: {
    'basquete.mp4': { arquivo: 'recreate-basquete-vitrine-v2.mp4', bytes: 5482656, sha256: '60746711b9c27e095ed282935cb3e485647e4aea55af938413261dbfe6530d24', contentType: 'video/mp4' },
    'basquete.jpg': { arquivo: 'recreate-basquete-vitrine-v1.jpg', bytes: 76780, sha256: 'e4749c321f9b184fd76242613580df8bc9f71c785e58991182907ebb61f31869', contentType: 'image/jpeg' },
  },
  entrada: { largura: 720, altura: 1280 }, saida: { largura: 720, altura: 1280, fps: 24 },
  alvo: { tipo: 'pessoa', texto: 'the man in the black t-shirt and dark shorts', deOculos: true, roupa: BASQUETE_CAMISETA_LISA ? 'Keep the original shorts and shoes from @Video1, and he wears a plain black t-shirt.' : 'Keep the original clothing from @Video1.' },
  segundos: 14, aberto: BASQUETE_ABERTO_AO_PUBLICO, creditosPublicos: null, creditosDaCasa: recreateCreditCostMoldeDaCasa('basquete'),
  esperaMinutos: [5, 10], // 2 trechos de 1,5 a 4 min + a trava de cada trecho + a montagem
  nota: '16/11: 2 Kling 4.0 edit segments (8 + 6 s, whole seconds) + our CC0 library track instead of the original song; house only until the paid test',
}

// ─── 3. Cachorro craque (KINEO-REMODELAMENTO-MOLDES-1611) — docs/videos-do-dono-1411/originais/De05eyZIhuo.mp4 (720×1280, 24 fps, 361 quadros = 15,04 s) ───
// Um plano só: trecho 0 = quadros 0 a 191 (0 a 8,0 s), trecho 1 = quadros 192 a 359 (8,0 a 15,0 s; 7 s — KINEO-SEGUNDO-INTEIRO-1611, era até o 360). Alvo: o pastor-alemão, pela aparência. A foto do
// cliente é a do PET: o texto é o da receita adaptado a bicho ("his fur, face and ears match @Image1"), sem frase negativa e sem a frase da roupa. O som é o original
// do vídeo (tudo gerado por IA, "áudio original"; o conteúdo do som não foi ouvido por mim).
// Riscos (ficha): trocar bicho por bicho no Kling edit nunca foi provado; a trava "não trocou" de hoje é escrita para rosto humano e pode errar com bicho.
export const CACHORRO_ABERTO_AO_PUBLICO: boolean = false
const CACHORRO_CRAQUE: MoldeDeTrechos = {
  id: 'cachorro-craque', titulo: 'Dog goal', desde: '2026-11-16',
  trechos: [
    { arquivo: 'recreate-cachorro-craque-t0-v1.mp4', bytes: 3475452, sha256: '2686fb66daf2a55990bf1d26ce01784a11b9b7262ecc51238fa4fe74563434c4', contentType: 'video/mp4', quadros: [0, 191], segundosDoArquivo: 8, fps: 24, segundosNoFilme: 8, velocidade: 100 },
    // KINEO-SEGUNDO-INTEIRO-1611 — era t1-v1 (quadros 192–360, 7,04 s): o mesmo risco do basquete. Agora 7 s inteiros, mesmo início.
    { arquivo: 'recreate-cachorro-craque-t1-v2.mp4', bytes: 3541812, sha256: '282cf430fdf221749d4c3127bfea2379e07f69da71855982b4eaa64383024b66', contentType: 'video/mp4', quadros: [192, 359], segundosDoArquivo: 7, fps: 24, segundosNoFilme: 7, velocidade: 100 },
  ],
  som: { arquivo: 'recreate-cachorro-craque-som-v2.mp3', bytes: 361890, sha256: 'f4fd13b08edd4372c89a055ed43737f5d6bb7b86ca6e11787c93cb51b6b10930', contentType: 'audio/mpeg', segundos: 15 },
  vitrine: {
    'cachorro-craque.mp4': { arquivo: 'recreate-cachorro-craque-vitrine-v2.mp4', bytes: 3967871, sha256: 'ed3b025f229be29b7031c27a3f72915f5024123a5d88dc53fca22a1a51e816e1', contentType: 'video/mp4' },
    'cachorro-craque.jpg': { arquivo: 'recreate-cachorro-craque-vitrine-v1.jpg', bytes: 40679, sha256: 'dd0b4bf08c08fa11f68875262e6ac19e494917f43da35ac9cd89e534bc971735', contentType: 'image/jpeg' },
  },
  entrada: { largura: 720, altura: 1280 }, saida: { largura: 720, altura: 1280, fps: 24 },
  alvo: { tipo: 'bicho', texto: 'the German Shepherd dog' },
  segundos: 15, aberto: CACHORRO_ABERTO_AO_PUBLICO, creditosPublicos: null, creditosDaCasa: recreateCreditCostMoldeDaCasa('cachorro-craque'),
  esperaMinutos: [5, 10],
  nota: '16/11: 2 Kling 4.0 edit segments (8 + 7 s, whole seconds), pet photo, original sound; house only until the paid test (pet-for-pet swap never proven)',
}

/** O registro dos moldes de vários trechos. O 1º é o Pitch invader (byte a byte o de antes). */
// KINEO-SEGUNDO-INTEIRO-1611 [CEO 16/11, teste pago 90a42302] — REGRA: todo arquivo de trecho enviado ao motor tem SEGUNDO INTEIRO (≥ 3 s, ≤ 8 s): o Kling 4.0 edição devolve
// o inteiro + 1 quadro (8 → 8,04; 3 → 3,04) e corta o resto (6,375 → 6,042: falha "trecho curto" e estorno). O que vai ao filme pode ser fracionário (o 2,4 s do
// Pitch invader, alongado a 3,0 s e devolvido a 125%). O guardião confere em todo molde.
export const MOLDES_DE_TRECHOS: readonly MoldeDeTrechos[] = [PITCH_INVADER, BASQUETE, CACHORRO_CRAQUE]
export const moldeDeTrechos = (id: unknown): MoldeDeTrechos | null => MOLDES_DE_TRECHOS.find((m) => m.id === id) ?? null
export const MOLDE_PITCH_INVADER = PITCH_INVADER

/** Os créditos do molde: com o interruptor ABERTO, só o preço público (sem ele = sem preço, o molde some do catálogo do cliente); da casa, o público ou o provisório. */
export const creditosDoMolde = (m: Pick<MoldeDeTrechos, 'aberto' | 'creditosPublicos' | 'creditosDaCasa'>): number | null => (m.aberto ? m.creditosPublicos : m.creditosPublicos ?? m.creditosDaCasa)
export function formatoDoMolde(m: MoldeDeTrechos): RecreateFormat {
  return {
    id: m.id, title: m.titulo, desde: m.desde, type: 'swap',
    preview: `/api/recreate/assets/${m.id}.mp4`, poster: `/api/recreate/assets/${m.id}.jpg`,
    seconds: m.segundos, prompt: '', photoSlots: 1, swapApproved: m.aberto, swapInTest: !m.aberto, ...(m.approvedOn ? { approvedOn: m.approvedOn } : {}),
    creditos: creditosDoMolde(m), esperaMinutos: m.esperaMinutos, swapNote: m.nota,
    ...(m.aberto ? { palco: true } : {}), // KINEO-PALCO-INVADER-1611 — o aberto mais novo abre o palco da tela única para quem está logado
  }
}
export const INVASOR_FORMATO: RecreateFormat = formatoDoMolde(PITCH_INVADER)
export const FORMATOS_DOS_MOLDES_DE_TRECHOS: readonly RecreateFormat[] = MOLDES_DE_TRECHOS.map(formatoDoMolde)

/** O arquivo de cartão (`<id>.mp4` / `<id>.jpg`) de qualquer molde, ou null. */
export const invasorArquivoDaVitrine = (nome: string): ArquivoDoMolde | null => {
  for (const m of MOLDES_DE_TRECHOS) if (Object.hasOwn(m.vitrine, nome)) return m.vitrine[nome]
  return null
}
export const invasorCaminho = (a: Pick<ArquivoDoMolde, 'arquivo'>) => `${INVASOR_PASTA}/${a.arquivo}`
