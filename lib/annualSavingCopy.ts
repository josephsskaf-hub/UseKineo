// KINEO-PRECOS-ECONOMIA-0911 [fundador 09/11: "Sim para as 5" — decisão 1: manter 30% e mudar só o texto]
// A economia do anual em DINHEIRO, por mês e por ano (Buzzy e InVideo vendem o anual assim). Nenhum número mora aqui:
// quem chama passa o mensal e o anual que já saem de lib/checkoutPricing.ts (TIER_PRICES / getAnnualPrice / ANNUAL_WELCOME_PRICES)
// ou de lib/settlementCurrency.ts (tabela em reais). Este módulo só faz a conta e escolhe as palavras.
import { parseInterfaceLanguage, type InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export type AnnualSaving = { perYearMinor: number; perMonthMinor: number }

/** economia = 12 × mensal − anual; por mês = economia ÷ 12 (o formatador da moeda arredonda os centavos). */
export function annualSavingMinor(monthlyMinor: number, annualMinor: number): AnnualSaving {
  const perYearMinor = monthlyMinor * 12 - annualMinor
  return { perYearMinor, perMonthMinor: perYearMinor / 12 }
}

type SavingWords = { save: string; month: string; year: string; vs: string }

/** As línguas pedidas pelo fundador (en/de/es/pt/fr); as outras caem em inglês, nunca em texto inventado. */
export const ANNUAL_SAVING_COPY: Partial<Record<InterfaceLanguage, SavingWords>> = {
  en: { save: 'Save', month: '/month', year: '/year', vs: 'vs monthly' },
  pt: { save: 'Economize', month: '/mês', year: '/ano', vs: 'vs. mensal' },
  es: { save: 'Ahorra', month: '/mes', year: '/año', vs: 'vs. mensual' },
  fr: { save: 'Économisez', month: '/mois', year: '/an', vs: 'vs mensuel' },
  de: { save: 'Spare', month: '/Monat', year: '/Jahr', vs: 'ggü. monatlich' },
}

export function annualSavingWords(language: string): SavingWords {
  const code = parseInterfaceLanguage(language.trim().toLowerCase().split(/[-_,;]/)[0])
  return ANNUAL_SAVING_COPY[code] ?? (ANNUAL_SAVING_COPY.en as SavingWords)
}

/** A frase inteira em texto (o guardião confere esta mesma frase com os números da tabela). */
export function annualSavingText(language: string, perMonthLabel: string, perYearLabel: string): string {
  const w = annualSavingWords(language)
  return `${w.save} ${perMonthLabel}${w.month} · ${perYearLabel}${w.year} ${w.vs}`
}
