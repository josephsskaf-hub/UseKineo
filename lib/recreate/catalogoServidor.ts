// KINEO-RECEITA-FORA-DO-JS-1411 [CEO 14/11: "o cliente recebe só os campos de vitrine, já filtrados pelo servidor por quem pode ver"]
// O catálogo COMPLETO do Recreate, só do servidor: o do navegador (./formats RECREATE_FORMATS: troca e efeito) + os moldes de movimento (./movimentoMoldes,
// com a receita). Nenhum módulo 'use client' importa este arquivo (o guardião percorre o grafo). As páginas montam a lista do cliente com
// formatosParaOCliente(email): só os moldes que aquela pessoa pode ver, e de cada um só os campos de vitrine (nada de cena, ação, guia, quadros da trava
// nem notas internas).
import { RECREATE_ASSETS, RECREATE_FORMATS, recreateNewestFirst, type RecreateFormat } from './formats'
import { MOVIMENTO_ASSETS, RECREATE_MOVIMENTO_MOLDES } from './movimentoMoldes'
import { recreateFormatVisible } from './access'
import { FORMATOS_DOS_MOLDES_DE_TRECHOS } from './invasorMolde' // KINEO-INVASOR-DE-CAMPO-1511 · KINEO-REMODELAMENTO-MOLDES-1611 — os moldes de vários trechos (cada um com o seu interruptor)

export const RECREATE_FORMATS_SERVIDOR: readonly RecreateFormat[] = recreateNewestFirst([...RECREATE_FORMATS.filter((f) => f.type !== 'motion'), ...RECREATE_MOVIMENTO_MOLDES, ...FORMATOS_DOS_MOLDES_DE_TRECHOS]) // KINEO-INVASOR-DE-CAMPO-1511 — + INVASOR_FORMATO · a vitrine pública do movimento dá lugar à versão completa
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
  return out as unknown as RecreateFormat
}
export const formatosParaOCliente = (email: string | null | undefined): RecreateFormat[] => visibleRecreateFormatsServidor(email).map(paraOCliente)
