import { semConsertos2710 } from './desfaz-consertos-2710.mjs' // KINEO-CONSERTOS-2710 — as 6 entregas de 27/10 (camada mais nova) saem primeiro
// [TRAVA 8.2 — vai do fundador 26/10 "2A"] KINEO-VOZ-NATIVA-2610 — desfaz EXATO, em memória, da voz nativa MiniMax em português e
// espanhol (lib/textLanguage.ts: minimaxPrimary nas linhas pt/es). Tabela em desfaz-voz-nativa-2610-hunks.json. Sem a marca = intocado;
// trecho ausente/ambíguo ou resultado diferente da base = LANÇA. Camada MAIS NOVA: desfaz-filme15-rosto-2610 chama isto PRIMEIRO.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
export const MARCA_VOZ_NATIVA_2610 = 'KINEO-VOZ-NATIVA-2610'
export const VOZ_NATIVA_2610 = JSON.parse(readFileSync(new URL('./desfaz-voz-nativa-2610-hunks.json', import.meta.url), 'utf8'))
export const VOZ_NATIVA_2610_NOVOS = Object.freeze(['scripts/test-voz-nativa-2610.mjs', 'scripts/test-support/desfaz-voz-nativa-2610.mjs', 'scripts/test-support/desfaz-voz-nativa-2610-hunks.json'])
const sha = (t) => createHash('sha256').update(t).digest('hex')

export function semVozNativa2610(texto, p) {
  texto = semConsertos2710(texto, p) // KINEO-CONSERTOS-2710
  const rel = String(p ?? '').split(String.fromCharCode(92)).join('/')
  const entry = VOZ_NATIVA_2610.scope[rel]
  if (typeof texto !== 'string' || !entry || !texto.includes(MARCA_VOZ_NATIVA_2610)) return texto
  const crlf = texto.includes('\r\n')
  let t = texto.replace(/\r\n/g, '\n')
  if (sha(t) === entry.beforeSha256) return texto
  for (const h of entry.hunks) {
    const n = t.split(h.after).length - 1
    if (n !== 1) throw new Error(`desfaz ${MARCA_VOZ_NATIVA_2610}: trecho ${n === 0 ? 'ausente' : 'ambíguo'} em ${rel}`)
    t = t.replace(h.after, () => h.before)
  }
  if (sha(t) !== entry.beforeSha256) throw new Error(`desfaz ${MARCA_VOZ_NATIVA_2610}: resultado diverge da base em ${rel}`)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}
