// KINEO-ADS-CENA-95-PACING-2110 — synthetic copy and HTTP/provider fixtures only; no network or credentials.
export const PACING_PHOTO = 'https://offline.example/customer-product.png'
export const PACING_HOUSE = { id: '00000000-0000-4000-8000-000000000001', email: 'josephsskaf@gmail.com' }
export const PACING_ORDER = '00000000-0000-4000-8000-000000000002'
export const PACING_FIXTURES = [
  {
    id: 'cream-pt-long', category: 'skincare', product: 'Creme GLOW',
    input: { foto: PACING_PHOTO, frase: 'Creme GLOW; Não contém fragrância. Pode ser usado diariamente.', beneficios: ['Não contém fragrância.', 'Pode ser usado diariamente.'], oferta: 'Compre 1 e leve 2.', cta: 'Peça seu Creme GLOW.', language: 'pt', formato: 'ugc', voice_mode: 'narrated', rota: 'kling3' },
    raw: { hooks: ['Rotina sem perfume?', 'Qual creme escolher?', 'Creme para hoje?'], pain: 'Escolher um creme pode fazer parte do seu cuidado diário. Você quer uma explicação clara sobre o que está comprando, sem promessas além da informação disponível.', demonstration: 'Veja a apresentadora abrindo o pote enquanto a câmera se aproxima do rótulo. Abra o pote antes de pegar uma pequena quantidade. Espalhe o creme no próprio antebraço em um movimento simples.', benefit: 'Não contém fragrância. Pode ser usado diariamente.', offer: 'Compre 1 e leve 2.', cta: 'Peça seu Creme GLOW.' },
  },
  {
    id: 'shoes-en-long', category: 'footwear', product: 'Stride shoes',
    input: { foto: PACING_PHOTO, frase: 'Stride shoes; Easy to clean. Does not leave residue.', beneficios: ['Easy to clean.', 'Does not leave residue.'], oferta: 'Buy one, get one free.', cta: 'Choose your Stride shoes.', language: 'en', formato: 'product', voice_mode: 'narrated', rota: 'kling3' },
    raw: { hooks: ['Ready to leave?', 'Which shoes today?', 'Time to move?'], pain: 'Choosing shoes can be part of getting ready for a busy day. You want to hear the actual details before deciding which pair to take with you.', demonstration: 'Watch the actor tie the shoes while they turn and their camera follows. Open the existing laces before putting the shoes on your feet. Tie them securely and take a step when you are ready to leave.', benefit: 'Easy to clean. Does not leave residue.', offer: 'Buy one, get one free.', cta: 'Choose your Stride shoes.' },
  },
]
export function pacingShort(language = 'en') {
  const pt = language === 'pt', product = pt ? 'Creme GLOW' : 'GLOW cream'
  return { id: 'short-' + language, category: 'skincare', product,
    input: { foto: PACING_PHOTO, frase: product, beneficios: [], oferta: '', cta: pt ? 'Peça seu Creme GLOW.' : 'Choose your GLOW cream.', language, formato: 'product', voice_mode: 'narrated', rota: 'kling3' },
    raw: { hooks: pt ? ['Qual creme escolher?', 'Creme para hoje?', 'Já decidiu?'] : ['Which cream today?', 'Ready to choose?', 'Have a look?'], pain: pt ? 'Escolher pode ser simples.' : 'Choosing can be simple.', demonstration: '', benefit: '', offer: '', cta: pt ? 'Peça seu Creme GLOW.' : 'Choose your GLOW cream.' } }
}
export const PACING_JUDGE_KEYS = ['product_faithful', 'product_whole', 'no_invented_text', 'real_scale', 'no_extra_hands', 'own_hands_attached', 'five_fingers', 'natural_face', 'same_actor', 'same_wardrobe', 'correct_wrist', 'no_extra_people', 'nothing_near_face', 'mouth_closed', 'mouth_speaking', 'motion_visible', 'no_hands', 'no_people', 'no_extra_objects', 'product_dominant', 'no_full_body', 'face_visible']
export const pacingVerdict = () => ({ ...Object.fromEntries(PACING_JUDGE_KEYS.map(k => [k, true])), score: 99 })
