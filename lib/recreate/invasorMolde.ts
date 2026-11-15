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
import type { RecreateFormat } from './formats'

export const INVASOR_ID = 'invasor-de-campo' as const
export const INVASOR_BUCKET = 'quarantine' as const
export const INVASOR_PASTA = 'recreate-guias/v1' as const

export type ArquivoDoMolde = { arquivo: string; bytes: number; sha256: string; contentType: string }
export type TrechoDoInvasor = ArquivoDoMolde & {
  /** quadros do original (30 fps), inclusivos — documentação do corte. */
  quadros: readonly [number, number]
  /** segundos do arquivo enviado ao motor (o motor devolve essa duração, em 24 fps). */
  segundosDoArquivo: number
  /** segundos que o trecho ocupa no filme final. */
  segundosNoFilme: number
  /** velocidade da montagem (100 = normal; 125 = o trecho alongado de 2,4 → 3,0 s volta ao tempo real). */
  velocidade: number
}

export const INVASOR_TRECHOS: readonly TrechoDoInvasor[] = [
  { arquivo: 'recreate-invasor-de-campo-t0-v1.mp4', bytes: 9284106, sha256: '3298998a8c7b8b0e6d1f5eaed7541b3a3480c24e17287080f0dc4527220df342', contentType: 'video/mp4', quadros: [0, 239], segundosDoArquivo: 8, segundosNoFilme: 8, velocidade: 100 },
  { arquivo: 'recreate-invasor-de-campo-t1-v1.mp4', bytes: 9683089, sha256: '1f1c997186bf757e3ae6d822f3d4f699329c41b7b62275d3abef26c40d18c80b', contentType: 'video/mp4', quadros: [240, 479], segundosDoArquivo: 8, segundosNoFilme: 8, velocidade: 100 },
  { arquivo: 'recreate-invasor-de-campo-t2-v1.mp4', bytes: 2707495, sha256: 'ebd3265b2947bc67204d8325381e7ca8b7c7b0a0799c8dba24560fc629aece97', contentType: 'video/mp4', quadros: [641, 712], segundosDoArquivo: 3, segundosNoFilme: 2.4, velocidade: 125 },
]
export const INVASOR_SOM: ArquivoDoMolde & { segundos: number } = { arquivo: 'recreate-invasor-de-campo-som-v1.mp3', bytes: 443392, sha256: '51d8314c77286b2bf5dc081c09b6117bc0b3bf95f1b273618405f71e7c053e20', contentType: 'audio/mpeg', segundos: 18.4 }
/** O cartão (só a casa vê): o original nos mesmos cortes, 720×1280, com o som — "o que você vai receber". Servido por redirecionamento curto. */
export const INVASOR_VITRINE: Readonly<Record<string, ArquivoDoMolde>> = {
  'invasor-de-campo.mp4': { arquivo: 'recreate-invasor-de-campo-vitrine-v1.mp4', bytes: 6881480, sha256: '6373d40d0df502e51601a57af9b35ee8a2e6004fd2a7004b0883693e7964ecf5', contentType: 'video/mp4' },
  'invasor-de-campo.jpg': { arquivo: 'recreate-invasor-de-campo-vitrine-v1.jpg', bytes: 70434, sha256: '01551c37b78a5f3413889d2efc2b3641357c6120504c0e5c4ebaf225c1b86b77', contentType: 'image/jpeg' },
}
/** A saída do Kling 4.0 edição em 720p para a entrada 1080×1920: 720×1280, 24 fps. */
export const INVASOR_SAIDA = { largura: 720, altura: 1280, fps: 24 } as const
/** O alvo pela ROUPA, que não muda (a receita de 14/11: nunca pela pose). */
export const INVASOR_ALVO = 'the man in the dark blue shirt' as const
/** O homem do vídeo usa óculos: sem a cláusula "wears no glasses" o motor os mantém. */
export const INVASOR_ALVO_DE_OCULOS = true

export const INVASOR_FORMATO: RecreateFormat = {
  id: INVASOR_ID, title: 'Pitch invader', desde: '2026-11-15', type: 'swap',
  preview: '/api/recreate/assets/invasor-de-campo.mp4', poster: '/api/recreate/assets/invasor-de-campo.jpg',
  seconds: 18, prompt: '', photoSlots: 1, swapApproved: false, swapInTest: true,
  swapNote: '15/11: 3 Kling 4.0 edit segments (8 + 8 + 2.4 s) one at a time + assembly with the original sound; house only (third-party broadcast clip)',
}

export const invasorArquivoDaVitrine = (nome: string): ArquivoDoMolde | null => (Object.hasOwn(INVASOR_VITRINE, nome) ? INVASOR_VITRINE[nome] : null)
export const invasorCaminho = (a: Pick<ArquivoDoMolde, 'arquivo'>) => `${INVASOR_PASTA}/${a.arquivo}`
