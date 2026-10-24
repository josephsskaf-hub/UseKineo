// [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"] KINEO-PAGINAS-IA-CLARAS-2110 — desfaz EXATO,
// em memória, da camada clara das páginas de entrada do ChatGPT (sem rede, env ou banco). Módulo auxiliar; não é teste.
//
// Os guardiões antigos dessas páginas travam o corpo delas (cores do tema preto, galeria da casa por motor, filme do nicho, o
// texto da galeria "Try it in Claude"…) contra bases antigas. O fundador trocou o visual e a vitrine em 21/10; a camada nova
// tem guardião próprio (scripts/test-paginas-ia-claras-2110.mjs) e, nos guardiões antigos, SAI DA CONTA por aqui: cada um lê
// semPaginasIaClaras2110(texto, arquivo) e confere o que conferia antes desta camada. Na integração, esta camada devolve
// 1b991815c (com RETOMADA, PACING, PLAN-FAILED, Roteiro, Cena95 e Kids preservados); os respectivos desfaz continuam responsáveis pelas camadas anteriores.
//
// Como desfaz: a tabela desfaz-paginas-ia-claras-2110-trocas.json guarda, por arquivo, [base, novo, só-acréscimo]. Na integração,
// base e novo são a fonte INTEGRAL contra 1b991815c: também se recusa adulteração fora dos antigos blocos de diff. A fonte deve
// coincidir INTEIRA (senão LANÇA: mudança alheia ou conserto pela metade não passa em silêncio). Arquivo fora da tabela ou sem a marca =
// volta intocado (a camada ainda não está nesta árvore). Fim de linha: o do próprio texto (LF ou CRLF). Idempotente.
// ENCADEAR: esta é a camada mais nova — quem já desfaz outra camada dos mesmos arquivos aplica esta PRIMEIRO.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semAdminLeve2310 } from './desfaz-admin-leve-2310.mjs' // KINEO-ADMIN-LEVE-2310 — remove the exact later layer before this complete historical snapshot.

export const MARCA_PAGINAS_IA_CLARAS_2110 = 'KINEO-PAGINAS-IA-CLARAS-2110'
export const PAGINAS_IA_CLARAS_2110_TRAVA = '[TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"]'
export const ehCommitPaginasIaClaras2110 = s => (s.startsWith(MARCA_PAGINAS_IA_CLARAS_2110 + ' ') || s.startsWith(MARCA_PAGINAS_IA_CLARAS_2110 + ': ')) && s.includes(PAGINAS_IA_CLARAS_2110_TRAVA)
const TABELA = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-paginas-ia-claras-2110-trocas.json'), 'utf8'))
export const PAGINAS_IA_CLARAS_2110_BASE = TABELA.__base
/** Arquivos que já existiam e que a entrega mudou (o desfaz devolve cada um à base). */
export const PAGINAS_IA_CLARAS_2110_ARQUIVOS = Object.freeze(Object.keys(TABELA).filter((k) => !k.startsWith('__')))
/** Arquivos que a entrega criou. */
export const PAGINAS_IA_CLARAS_2110_NOVOS = Object.freeze([...TABELA.__novos])

const rel = (p) => String(p ?? '').replace(/\\/g, '/')

/** O texto sem a camada clara (só para os arquivos da tabela; os outros voltam intocados). Ordem (texto, arquivo). */
export function semPaginasIaClaras2110(texto, p) {
  texto = semAdminLeve2310(texto, p) // KINEO-ADMIN-LEVE-2310 — preserve all 65 historical hashes and full-source comparisons below.
  const r = rel(p)
  if (typeof texto !== 'string' || !Object.hasOwn(TABELA, r) || r.startsWith('__') || !texto.includes(MARCA_PAGINAS_IA_CLARAS_2110)) return texto
  const crlf = texto.includes('\r\n')
  const blocos = TABELA[r]
  if (blocos.length !== 1 || blocos[0][2]) throw new Error(`desfaz ${MARCA_PAGINAS_IA_CLARAS_2110} em ${r}: tabela integral inválida`)
  const [base, novo] = blocos[0]
  if (texto.replace(/\r\n/g, '\n') !== novo) throw new Error(`desfaz ${MARCA_PAGINAS_IA_CLARAS_2110} em ${r}: fonte divergente`)
  return crlf ? base.replace(/\n/g, '\r\n') : base
}

/** Ordem (arquivo, texto), para quem já chama os outros desfaz assim. */
export function desfazPaginasIaClaras2110(p, texto) { return semPaginasIaClaras2110(texto, p) }

/** Para createOfflineLoader({ source }): (arquivo, texto) → o texto sem esta camada. */
export function fonteSemPaginasIaClaras2110(p, texto) { return semPaginasIaClaras2110(texto, p) }

/** Para offlineModules({ replacements }): { arquivo: fonte sem esta camada } de cada .ts/.tsx da entrega; `ler(arquivo)` lê da árvore. */
export function fontesSemPaginasIaClaras2110(ler) {
  return Object.fromEntries(PAGINAS_IA_CLARAS_2110_ARQUIVOS.filter((f) => /\.tsx?$/.test(f)).map((f) => [f, semPaginasIaClaras2110(ler(f), f)]))
}
