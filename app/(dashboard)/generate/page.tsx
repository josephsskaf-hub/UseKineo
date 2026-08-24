// KINEO-STUDIO-UNIFICACAO-2026-08-24 — /generate deixou de ser uma página.
//
// ORDEM DO FUNDADOR: "tirar o /generate e ficar só com o /studio, sem
// problema em nenhum tipo de render, avatar nem nada". A casa de máquinas
// (GenerateClient + a lógica de servidor que morava aqui) mudou-se INTEIRA
// para /studio/create — ver app/(dashboard)/studio/create/page.tsx.
//
// Este arquivo virou um PORTEIRO de duas regras, e as duas existem por causa
// do "sem quebrar nada":
//
//   1. Visita VAZIA (pessoa digitou a URL, link antigo de nav, bookmark) →
//      /studio. Essa pessoa vinha ver a tela de criar; a tela de criar da
//      casa agora é o Studio. Eram 226 pessoas/7d entrando por aqui — todas
//      passam a aterrissar na cara nova.
//
//   2. Visita COM PARÂMETROS → /studio/create com a query INTACTA. Isso
//      cobre tudo que despacha trabalho para a casa de máquinas: o próprio
//      Studio (engine/prompt/autoanalyze), ?avatar=1 da landing do avatar,
//      viral_topic do Viral Now, create_intent das 28 páginas de SEO,
//      signup=1/welcome=1 da ativação, e TODO e-mail já enviado (resgate de
//      render órfão, campanhas) que aponta para /generate?... — links no
//      inbox das pessoas não podem quebrar nunca.
//
// Por que um Server Component e não um redirect no next.config: a decisão
// depende de "tem query ou não", e regras estáticas de redirect exigiriam
// enumerar cada chave de parâmetro — uma lista que envelheceria em silêncio
// (a classe de bug #296). Aqui a query passa adiante inteira, seja ela qual
// for, inclusive as que ainda não existem.
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type LegacyGeneratePageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function LegacyGeneratePage({ searchParams }: LegacyGeneratePageProps) {
  const params = new URLSearchParams()
  for (const [rawKey, rawValue] of Object.entries(searchParams ?? {})) {
    const key = rawKey.slice(0, 64)
    const values = Array.isArray(rawValue) ? rawValue : [rawValue]
    for (const value of values) {
      if (typeof value === 'string') params.append(key, value.slice(0, 2000))
    }
  }
  const query = params.toString()
  redirect(query ? `/studio/create?${query}` : '/studio')
}
