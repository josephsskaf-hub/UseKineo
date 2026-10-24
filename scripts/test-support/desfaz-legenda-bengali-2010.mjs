// KINEO-LEGENDA-BENGALI-2010 [TRAVA 8.2 — vai do fundador 20/10 "vai pra tudo"]
// Camada mais nova: somente acréscimos marcados e trocas EXATAS para a base.
// Sem marca/fora da lista: identidade. Incompleto: falha fechada. Preserva CRLF.
import { readFileSync } from 'node:fs'
import { semIdiomasFormatos2410 } from './desfaz-idiomas-formatos-2410.mjs' // KINEO-IDIOMAS-FORMATOS-2410 — newest language/segment layer precedes Bengali.
import { semAdsBola2110 } from './desfaz-ads-bola-2110.mjs' // KINEO-ADS-BOLA-2110 — merge da fila 21/10: o anúncio da bola veio depois (encadeado; texto sem a marca passa igual)
export const MARCA_LEGENDA_BENGALI_2010 = 'KINEO-LEGENDA-BENGALI-2010'
export const LEGENDA_BENGALI_2010_BASE = 'ed429b6073c7d8c436b1dd51da150a4acc1c65ca'
export const REGRAS_LEGENDA_BENGALI_2010 = JSON.parse(readFileSync(new URL('./desfaz-legenda-bengali-2010-trocas.json', import.meta.url), 'utf8'))
export function semLegendaBengali2010(texto, p) {
  texto = semIdiomasFormatos2410(texto, p) // KINEO-IDIOMAS-FORMATOS-2410
  texto = semAdsBola2110(texto, p) // KINEO-ADS-BOLA-2110 — merge da fila 21/10: o anúncio da bola (e a qualidade, que ele chama primeiro) é a camada mais nova: sai PRIMEIRO
  const rel = String(p ?? '').replace(/\\/g, '/')
  const regra = REGRAS_LEGENDA_BENGALI_2010[rel]
  if (!regra || typeof texto !== 'string' || !texto.includes(MARCA_LEGENDA_BENGALI_2010)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map(regra.trocas)
  let acrescimos = 0, substituicoes = 0
  const linhas = []
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_LEGENDA_BENGALI_2010)) linhas.push(linha)
    else if (trocas.has(linha)) { linhas.push(...trocas.get(linha)); substituicoes++ }
    else acrescimos++
  }
  if (acrescimos !== regra.acrescimos || substituicoes !== trocas.size) throw new Error(`desfaz-legenda-bengali-2010: ${rel} incompleto (${acrescimos}/${regra.acrescimos}, ${substituicoes}/${trocas.size})`)
  const out = linhas.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}
