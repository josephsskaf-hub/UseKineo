// KINEO-META95-PERSONAGEM-AJUSTE-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]
// Camada mais nova. Só desfaz em memória; contagens e trocas exatas, sem aproximação.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
export const MARCA_META95_PERSONAGEM_AJUSTE_2010 = 'KINEO-META95-PERSONAGEM-AJUSTE-2010'
export const META95_PERSONAGEM_AJUSTE_2010_BASE = '9d4d0ffc1f71a34f9e4f56a05c55631908b925fc'
export const TROCAS_META95_PERSONAGEM_AJUSTE_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-meta95-personagem-ajuste-2010-trocas.json'), 'utf8'))
export const ACRESCIMOS_META95_PERSONAGEM_AJUSTE_2010 = TROCAS_META95_PERSONAGEM_AJUSTE_2010.__acrescimos
export const META95_PERSONAGEM_AJUSTE_2010_ARQUIVOS = Object.keys(ACRESCIMOS_META95_PERSONAGEM_AJUSTE_2010)
export function semMeta95PersonagemAjuste2010(texto, p) {
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_META95_PERSONAGEM_AJUSTE_2010) || !META95_PERSONAGEM_AJUSTE_2010_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map(TROCAS_META95_PERSONAGEM_AJUSTE_2010[rel] ?? [])
  const fora = []
  let tiradas = 0, trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_META95_PERSONAGEM_AJUSTE_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  if (tiradas !== ACRESCIMOS_META95_PERSONAGEM_AJUSTE_2010[rel] || trocadas !== trocas.size) throw new Error(`desfaz-personagem-ajuste: ${rel}: contagem/troca divergente`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}
export const desfazMeta95PersonagemAjuste2010 = (p, texto) => semMeta95PersonagemAjuste2010(texto, p)
export const linhasTrocadasMeta95PersonagemAjuste2010 = (p) => (TROCAS_META95_PERSONAGEM_AJUSTE_2010[String(p).replace(/\\/g, '/')] ?? []).flatMap(([, base]) => base.split('\n'))
