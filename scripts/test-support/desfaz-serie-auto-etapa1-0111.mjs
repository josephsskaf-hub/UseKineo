// KINEO-SERIE-AUTO-ETAPA1-0111 — DESFAZ, em memória, esta entrega no ÚNICO arquivo antigo que ela modificou (o cron do Autopilot), para
// os guardiões que conferem esse arquivo BYTE A BYTE contra uma base anterior (test-kids-venda-2010 D1). A entrega só ACRESCENTA linhas
// marcadas; o desfaz tira as linhas com a marca e exige que o resultado seja EXATAMENTE o arquivo de origin/main 2359bf434 (sha256 do
// texto em LF). Arquivo fora da lista ou sem a marca volta igual. É a camada mais nova deste arquivo — desfaça ESTA primeiro.
import { createHash } from 'node:crypto'

export const MARCA = 'KINEO-SERIE-AUTO-ETAPA1-0111'
export const BASE = '2359bf434288d0bf2b2727b994e3c374d23901ab'
export const SERIE_AUTO_0111_BASE_SHA256 = {
  'app/api/cron/autopilot-generate/route.ts': '01b70d7bb9e6f97a3f8acbefd3e60a386f9c74246e103d414c5a618406ff47ab',
}
export const ARQUIVOS = Object.keys(SERIE_AUTO_0111_BASE_SHA256)

export function semSerieAuto0111(text, rel) {
  if (typeof text !== 'string') return text
  const key = String(rel ?? '').replace(/\\/g, '/')
  const esperado = SERIE_AUTO_0111_BASE_SHA256[key]
  if (!esperado || !text.includes(MARCA)) return text
  const crlf = text.includes('\r\n')
  const s = text.replace(/\r\n/g, '\n').split('\n').filter((l) => !l.includes(MARCA)).join('\n')
  if (createHash('sha256').update(s).digest('hex') !== esperado) throw new Error('semSerieAuto0111: ' + key + ' mudou fora da camada')
  return crlf ? s.replace(/\n/g, '\r\n') : s
}
