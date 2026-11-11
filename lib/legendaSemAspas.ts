// KINEO-LEGENDA-SEM-ASPAS-1111 [CEO 11/11, revisão do filme 24564d97] — a legenda mostrava as aspas do roteiro: o cliente escreveu a fala
// entre « » e o filme saiu com "«¿PERO CÓMO NO HABÍA" e "COLOR Y TOP.»" na tela. Aspas de abertura e de fecho (« » “ ” „ ") saem da LEGENDA;
// a fala (narração, roteiro, voz) não passa por aqui. Só a aspa colada à ponta de uma palavra sai: o apóstrofo (’ ') e qualquer sinal no
// meio da palavra ficam. Puro. Guardião: scripts/test-legenda-sem-aspas-1111.mjs.
export const MARCA_LEGENDA_SEM_ASPAS = 'KINEO-LEGENDA-SEM-ASPAS-1111'

/** A aspa que abre: no início, depois de espaço, de parêntese ou do sinal invertido do espanhol (¿ ¡). */
const ABRE = /(^|[\s(¿¡])[«»“”„"]+/gu
/** A aspa que fecha: no fim, antes de espaço, de pontuação ou de parêntese. */
const FECHA = /[«»“”„"]+(?=$|[\s.,;:!?…)])/gu

/** O texto da legenda sem as aspas de abertura e de fecho. */
export function semAspasNaLegenda(texto: string): string {
  const t = String(texto ?? '')
  if (!/[«»“”„"]/u.test(t)) return t
  return t.replace(ABRE, '$1').replace(FECHA, '').replace(/ {2,}/g, ' ').trim()
}
