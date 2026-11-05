// KINEO-KIDS-SEM-OFERTA-0411 — desfaz, em memória, as linhas desta entrega em KidsCartoonPages.tsx, para o guardião que confere o arquivo byte a byte contra a base antiga.
// Reversão exata, uma por linha. Outro arquivo volta igual. Linha fora do esperado lança erro. Módulo auxiliar; não é teste.
const ARQUIVO = 'components/kidsCartoon/KidsCartoonPages.tsx'
const TROCAS = [
  ["import { KIDS_VENDA_LIVE } from '@/lib/kidsVenda/ofertaKids' // KINEO-KIDS-SEM-OFERTA-0411\n", ''],
  ['  const salesOpen = KIDS_VENDA_LIVE && KIDS_SALES_OPEN_FOR_PUBLIC // KINEO-KIDS-SEM-OFERTA-0411 — sem oferta, a página usa o texto que já existia para a venda fechada; era: KIDS_SALES_OPEN_FOR_PUBLIC\n', '  const salesOpen = KIDS_SALES_OPEN_FOR_PUBLIC\n'],
  ['          {KIDS_VENDA_LIVE && KIDS_SALES_OPEN_FOR_PUBLIC ? <>{/* KINEO-KIDS-SEM-OFERTA-0411 */}\n', '          {KIDS_SALES_OPEN_FOR_PUBLIC ? <>\n'],
]
export function semKidsSemOferta0411(text, rel) {
  if (String(rel ?? '').replace(/\\/g, '/') !== ARQUIVO || !text.includes('KINEO-KIDS-SEM-OFERTA-0411')) return text
  const crlf = text.includes('\r\n')
  let s = text.replace(/\r\n/g, '\n')
  for (const [agora, antes] of TROCAS) {
    if (s.split(agora).length !== 2) throw new Error('semKidsSemOferta0411: linha mudou fora desta camada')
    s = s.replace(agora, () => antes)
  }
  return crlf ? s.replace(/\n/g, '\r\n') : s
}
