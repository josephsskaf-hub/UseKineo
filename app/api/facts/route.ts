// KINEO-AEO-FACTS — /api/facts, o mesmo conteúdo de /llms.txt em JSON.
//
// É o endpoint que um agente consulta quando precisa do PREÇO ATUAL e não
// pode confiar numa cópia em cache do /llms.txt (ou do índice do modelo, que
// pode estar meses atrasado). CORS aberto porque o valor inteiro do endpoint
// é ser lido por um cliente que não somos nós.
//
// Mesma fonte de dados de /llms.txt (lib/kineoFacts.ts), então os dois nunca
// divergem: se um LLM cita o JSON e um humano lê o texto, eles veem o mesmo
// número.

import { getKineoFacts } from '@/lib/kineoFacts'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'

// force-static pelo mesmo motivo de /llms.txt: o payload é derivado de módulos
// TypeScript, resolvido em build time, sem I/O e sem dependência de request.
// Prerenderizado uma vez por deploy e servido da CDN.
export const dynamic = 'force-static'

// s-maxage=3600 dá à CDN uma hora de frescor; stale-while-revalidate=86400
// garante que um agente nunca espere por um revalidate. Preço só muda com
// deploy, e o deploy invalida o cache — uma hora é conservador de propósito,
// porque a resposta errada aqui vira preço errado numa resposta de LLM.
const CACHE_CONTROL = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'

// Sem handler OPTIONS de propósito. Exportar OPTIONS faz o Next tratar a rota
// inteira como dinâmica (medido: com OPTIONS o build marca /api/facts como `ƒ`,
// sem OPTIONS como `○`), o que trocaria um arquivo estático de CDN por uma
// invocação de função em todo request — para um payload que só muda no deploy.
// Preflight não é necessário no caso de uso real: um agente lendo do servidor
// não passa por CORS, e um `fetch('/api/facts')` no browser é uma requisição
// simples (GET, sem header customizado), que só precisa do
// Access-Control-Allow-Origin abaixo na própria resposta do GET.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD',
  'Access-Control-Max-Age': '86400',
}

export function GET(): Response {
  return new Response(JSON.stringify(getKineoFacts(), null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': CACHE_CONTROL,
      // Sem isto o Disallow: /api/ do robots.txt já foi vencido pelo
      // Allow: /api/facts (regra mais específica), mas o X-Robots-Tag deixa a
      // intenção explícita para crawlers que só olham o header.
      'X-Robots-Tag': 'all',
      ...CORS_HEADERS,
    },
  })
}
