// KINEO-RECEITA-FORA-DO-JS-1411 [CEO 14/11: "o cliente recebe só os campos de vitrine, já filtrados pelo servidor por quem pode ver"]
// O catálogo COMPLETO do Recreate, só do servidor: o do navegador (./formats RECREATE_FORMATS: troca e efeito) + os moldes de movimento (./movimentoMoldes,
// com a receita). Nenhum módulo 'use client' importa este arquivo (o guardião percorre o grafo). As páginas montam a lista do cliente com
// formatosParaOCliente(email): só os moldes que aquela pessoa pode ver, e de cada um só os campos de vitrine (nada de cena, ação, guia, quadros da trava
// nem notas internas).
import { RECREATE_ASSETS, RECREATE_FORMATS, recreateNewestFirst, type RecreateFormat } from './formats'
import { MOVIMENTO_ASSETS, RECREATE_MOVIMENTO_MOLDES } from './movimentoMoldes'
import { recreateFormatVisible } from './access'
import { FORMATOS_DOS_MOLDES_DE_TRECHOS } from './invasorMolde' // KINEO-INVASOR-DE-CAMPO-1511 · KINEO-REMODELAMENTO-MOLDES-1611 — os moldes de vários trechos (cada um com o seu interruptor)

// KINEO-NOVIDADE-EM-EVIDENCIA-1611 [dono 16/11 ~02:00: "já coloca sempre em evidência as novas"] — os moldes ABERTOS da máquina de trechos (palco) vêm na FRENTE, do
// mais novo para o mais antigo pela data em que abriram (approvedOn, senão desde); o resto segue do mais novo ao mais antigo. Regra, não lista: abrir um molde já o põe
// em 1º no palco padrão da tela única e na grade de quem está logado.
export function novidadesNaFrente<T extends { palco?: boolean; abertoEm?: string; approvedOn?: string; desde: string }>(lista: readonly T[]): T[] {
  const data = (f: T) => f.abertoEm ?? f.approvedOn ?? f.desde // KINEO-DOG-YOU-ABRE-1611 — + abertoEm (a hora em que abriu: desempata o mesmo dia)
  const abertos = lista.filter((f) => f.palco === true).sort((a, b) => (data(a) < data(b) ? 1 : data(a) > data(b) ? -1 : 0))
  return [...abertos, ...lista.filter((f) => f.palco !== true)]
}
export const RECREATE_FORMATS_SERVIDOR: readonly RecreateFormat[] = novidadesNaFrente(recreateNewestFirst([...RECREATE_FORMATS.filter((f) => f.type !== 'motion'), ...RECREATE_MOVIMENTO_MOLDES, ...FORMATOS_DOS_MOLDES_DE_TRECHOS])) // KINEO-INVASOR-DE-CAMPO-1511 — + INVASOR_FORMATO · a vitrine pública do movimento dá lugar à versão completa
export const recreateFormatServidor = (id: unknown): RecreateFormat | null => RECREATE_FORMATS_SERVIDOR.find((f) => f.id === id) ?? null
export const visibleRecreateFormatsServidor = (email: string | null | undefined): RecreateFormat[] => RECREATE_FORMATS_SERVIDOR.filter((f) => recreateFormatVisible(f, email))
/** Os assets servidos pela rota /api/recreate/assets: os do navegador + os pôsteres dos moldes de movimento. */
export const RECREATE_ASSETS_SERVIDOR: Readonly<Record<string, { file: string; contentType: string }>> = { ...RECREATE_ASSETS, ...MOVIMENTO_ASSETS }

/** Os campos de VITRINE que o navegador recebe. Tudo o mais (cena, acao, guia, checkFrames, swapNote…) fica no servidor. */
export const CAMPOS_DE_VITRINE = ['id', 'title', 'desde', 'type', 'preview', 'poster', 'seconds', 'photoSlots', 'prompt', 'swapSubject', 'effectKey', 'swapApproved', 'swapInTest', 'approvedOn', 'movimentoAprovado', 'pessoasNoGuia', 'esperaMinutos'] as const // KINEO-INVASOR-DE-CAMPO-1511 — + esperaMinutos (a espera real que a tela promete)
export function paraOCliente(f: RecreateFormat): RecreateFormat {
  const out: Record<string, unknown> = {}
  for (const k of CAMPOS_DE_VITRINE) if (f[k as keyof RecreateFormat] !== undefined) out[k] = f[k as keyof RecreateFormat]
  if (f.type === 'motion') out.prompt = '' // o molde de movimento é um preset: o texto dele é receita
  if (f.palco === true) out.palco = true // KINEO-PALCO-INVADER-1611 — o molde aberto da máquina de trechos abre o palco da tela única (campo de vitrine, sem receita)
  return out as unknown as RecreateFormat
}
export const formatosParaOCliente = (email: string | null | undefined): RecreateFormat[] => visibleRecreateFormatsServidor(email).map(paraOCliente)
