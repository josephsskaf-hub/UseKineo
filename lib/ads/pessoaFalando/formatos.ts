// KINEO-ADS-PESSOA-FALANDO-1111 [SPEC-ADS-PESSOA-FALANDO-2026-11-11 §2, Div. 2] — o anúncio em que a pessoa FALA para a câmera segurando o produto
// (o molde do "Halo", aprovado pelo fundador em 11/11: "esse tipo de ads é o que vão mais usar no futuro e viralizar"). Lib PURA: sem rede,
// sem banco. A Div. 5 (pedido, créditos, estorno, eventos) importa daqui; a tela (Div. 1) mostra os 6 formatos.

/** off = ninguém · internal = só contas da casa · public = todos (depende do preço do dono e do canário pago). */
export type ModoPessoaFalando = 'off' | 'internal' | 'public'
export const KINEO_ADS_PESSOA_FALANDO: ModoPessoaFalando = 'internal'
export function pessoaFalandoLigado(modo: ModoPessoaFalando, contaDaCasa: boolean): boolean {
  return modo === 'public' || (modo === 'internal' && contaDaCasa === true)
}

/** Os apresentadores da fase 1 (sem Jade). Retrato aprovado na biblioteca; a fala é a nativa do Seedance (inglês). */
export type ApresentadorId = 'sofia' | 'amara' | 'rahul' | 'kenji'
export const APRESENTADORES: Readonly<Record<ApresentadorId, { nome: string; pronome: 'she' | 'he'; possessivo: 'her' | 'his'; retrato: string }>> = {
  sofia: { nome: 'Sofia', pronome: 'she', possessivo: 'her', retrato: 'https://www.usekineo.com/ads/presenters/sofia.webp' },
  amara: { nome: 'Amara', pronome: 'she', possessivo: 'her', retrato: 'https://www.usekineo.com/ads/presenters/amara.webp' },
  rahul: { nome: 'Rahul', pronome: 'he', possessivo: 'his', retrato: 'https://www.usekineo.com/ads/presenters/rahul.webp' },
  kenji: { nome: 'Kenji', pronome: 'he', possessivo: 'his', retrato: 'https://www.usekineo.com/ads/presenters/kenji.webp' },
}
export function apresentador(id: unknown) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(APRESENTADORES, id) ? APRESENTADORES[id as ApresentadorId] : null }

/** Os 6 formatos da spec (§1.4): nome curto da tela, o cenário (foto-chave e vídeo) e o enquadramento do vídeo. */
export type FormatoId = 'car_selfie' | 'get_ready' | 'street_interview' | 'at_my_desk' | 'kitchen_counter' | 'unboxing_home'
export interface Formato { id: FormatoId; nome: string; cenario: string; enquadramento: string; extra?: string }
export const FORMATOS: Readonly<Record<FormatoId, Formato>> = {
  car_selfie: { id: 'car_selfie', nome: 'Car selfie', cenario: 'in the driver\'s seat of a parked car, daylight through the windshield, seatbelt on', enquadramento: 'Handheld selfie video filmed by the person from the driver\'s seat of a parked car, natural handheld micro-movements, daylight' },
  get_ready: { id: 'get_ready', nome: 'Get ready with me', cenario: 'at a bathroom sink in the morning, soft window light, a mirror behind', enquadramento: 'Get-ready-with-me selfie video at a bathroom sink in the morning, soft window light, natural handheld micro-movements' },
  street_interview: { id: 'street_interview', nome: 'Street interview', cenario: 'on a busy city sidewalk in the late afternoon, people passing softly out of focus', enquadramento: 'Street-interview style video on a busy sidewalk in the late afternoon; an unbranded handheld microphone with a foam cover enters the frame from the right and stays steady', extra: 'an unbranded handheld microphone with a foam cover enters the frame from the right' },
  at_my_desk: { id: 'at_my_desk', nome: 'At my desk', cenario: 'at a tidy modern work desk with a laptop and a lamp, warm daylight', enquadramento: 'Selfie-style video at a tidy work desk, warm daylight, natural handheld micro-movements' },
  kitchen_counter: { id: 'kitchen_counter', nome: 'Kitchen counter', cenario: 'at a bright kitchen counter in the morning, plants and a kettle softly out of focus', enquadramento: 'Selfie-style video at a bright kitchen counter in the morning, natural handheld micro-movements' },
  unboxing_home: { id: 'unboxing_home', nome: 'Unboxing at home', cenario: 'on a sofa at home with an opened plain unbranded shipping box beside them, soft afternoon light', enquadramento: 'Unboxing selfie video on a sofa at home, an opened plain unbranded box beside them, soft afternoon light, natural handheld micro-movements' },
}
export function formato(id: unknown): Formato | null { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(FORMATOS, id) ? FORMATOS[id as FormatoId] : null }
