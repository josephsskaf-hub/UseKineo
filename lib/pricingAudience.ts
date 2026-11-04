// KINEO-PLANOS-ABAS-0411 — qual porta do /pricing o endereço pede. Puro: sem React, para o guardião ler.
export type PricingAudience = 'individual' | 'team'

/** /pricing#business (link antigo da troca de plano) e ?for=business abrem a aba de empresas. */
export function audienciaDoEndereco(hash: string, search: string): PricingAudience {
  if (String(hash ?? '') === '#business') return 'team'
  const para = new URLSearchParams(String(search ?? '')).get('for')
  return para === 'business' || para === 'team' ? 'team' : 'individual'
}
