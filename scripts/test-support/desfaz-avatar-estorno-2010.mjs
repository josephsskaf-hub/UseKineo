// KINEO-AVATAR-ESTORNO-2010 [TRAVA 8.2 — vai do fundador 20/10 "vai pra tudo"]
// Camada mais nova: remove somente acréscimos marcados e restaura trocas EXATAS.
// Sem marca/fora da lista: identidade. Contagem divergente: falha fechada. Preserva CRLF.
import { readFileSync } from 'node:fs'
export const MARCA_AVATAR_ESTORNO_2010 = 'KINEO-AVATAR-ESTORNO-2010'
export const AVATAR_ESTORNO_2010_BASE = '9d4d0ffc1f71a34f9e4f56a05c55631908b925fc'
export const REGRAS_AVATAR_ESTORNO_2010 = JSON.parse(readFileSync(new URL('./desfaz-avatar-estorno-2010-trocas.json', import.meta.url), 'utf8'))
export function semAvatarEstorno2010(texto, p) {
  const rel = String(p ?? '').replace(/\\/g, '/')
  const regra = REGRAS_AVATAR_ESTORNO_2010[rel]
  if (!regra || typeof texto !== 'string' || !texto.includes(MARCA_AVATAR_ESTORNO_2010)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map(regra.trocas)
  let acrescimos = 0, substituicoes = 0
  const linhas = []
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_AVATAR_ESTORNO_2010)) linhas.push(linha)
    else if (trocas.has(linha)) { linhas.push(...trocas.get(linha)); substituicoes++ }
    else acrescimos++
  }
  if (acrescimos !== regra.acrescimos || substituicoes !== trocas.size) throw new Error(`desfaz-avatar-estorno-2010: ${rel} incompleto (${acrescimos}/${regra.acrescimos}, ${substituicoes}/${trocas.size})`)
  const out = linhas.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}
