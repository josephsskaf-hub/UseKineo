// KINEO-VITRINE-ESTACAO-3110 — fundador 30/10 ("o que importa é o efeito do momento: Halloween, Natal, os 2 meses que faltam"):
// os efeitos da ESTAÇÃO abrem a vitrine da home e entram no "🔥 Trending this week" do Clipe. Halloween até 1º/11 00:00 BRT;
// Día de Muertos (1º e 2/11) até 3/11 00:00 BRT; Natal até 26/12 00:00 BRT. Chave fora do catálogo público é ignorada por
// quem lê. Sem número de audiência: "trending" aqui = a data do ano em que as pessoas procuram esse efeito.
export const HALLOWEEN_ENDS_AT = '2026-11-01T03:00:00.000Z'
export const DIA_DE_MUERTOS_ENDS_AT = '2026-11-03T03:00:00.000Z'
export const NATAL_ENDS_AT = '2026-12-26T03:00:00.000Z'
export const HALLOWEEN_EFFECT_KEYS = ['witch', 'zombie', 'werewolf'] as const
export const DIA_DE_MUERTOS_EFFECT_KEYS = ['catrina', 'catrina_pet'] as const
export const NATAL_EFFECT_KEYS = ['snow_globe', 'santa_cartoon', 'pet_xmas_tree', 'pet_xmas_angel'] as const

export function seasonalEffectKeys(now: number): readonly string[] {
  if (now < Date.parse(HALLOWEEN_ENDS_AT)) return [...HALLOWEEN_EFFECT_KEYS, ...DIA_DE_MUERTOS_EFFECT_KEYS, ...NATAL_EFFECT_KEYS]
  if (now < Date.parse(DIA_DE_MUERTOS_ENDS_AT)) return [...DIA_DE_MUERTOS_EFFECT_KEYS, ...NATAL_EFFECT_KEYS]
  if (now < Date.parse(NATAL_ENDS_AT)) return NATAL_EFFECT_KEYS
  return []
}
