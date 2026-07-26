import type { MetadataRoute } from 'next'

// #458 — SEO: robots.txt so crawlers know what to index and where the sitemap
// is. Allows the public marketing pages; keeps the API, the app/dashboard and
// checkout out of the index (they shouldn't rank and waste crawl budget).
const BASE = 'https://www.usekineo.com'

// AEO/GEO — explicit allow groups for AI answer-engine crawlers so Kineo stays
// eligible for citations in ChatGPT, Claude, Perplexity and Google AI answers.
// Two bot families per provider: training crawlers (GPTBot, ClaudeBot,
// Google-Extended, CCBot) put us in the models' knowledge; search/RAG crawlers
// (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot,
// Perplexity-User) make us citable at query time. Both are welcome. Same
// disallow list as '*' so app/API surfaces stay out of answers too.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'CCBot',
]

// KINEO-REVIVE-2026-07-26 — '/revive' são páginas 1:1 geradas para UM prospect
// nomeado (handle do canal dele, 3 vídeos no estilo dele). Indexar isso é
// (a) doorway page aos olhos do Google e (b) expor publicamente a lista de
// quem estamos prospectando. A página também emite noindex no <head>; esta
// linha é a segunda tranca, porque robots.txt sozinho NÃO desindexa e noindex
// sozinho não impede o crawl aparecer em logs de terceiros.
const DISALLOW = ['/api/', '/generate', '/history', '/checkout/', '/admin', '/v2', '/create', '/revive']

// KINEO-AEO-FACTS — duas rotas de aquisição por motor de resposta que PRECISAM
// ficar rastreáveis:
//   /llms.txt   — não cai em nenhum Disallow, mas o Allow explícito documenta
//                 a intenção e protege contra alguém ampliar DISALLOW depois.
//   /api/facts  — cai dentro de `Disallow: /api/`. O Allow abaixo o resgata:
//                 pela especificação (Google, RFC 9309), quando um Allow e um
//                 Disallow batem na mesma URL vence a REGRA MAIS ESPECÍFICA,
//                 isto é, o path mais longo — '/api/facts' (10) > '/api/' (6).
//                 O serializer do Next também emite todos os `Allow:` antes
//                 dos `Disallow:`, então crawlers legados que resolvem por
//                 ordem de aparição chegam ao mesmo resultado.
const ALLOW = ['/', '/llms.txt', '/api/facts']

// A convenção llms.txt não tem campo próprio em robots.txt, e o tipo
// MetadataRoute.Robots do Next só sabe emitir User-Agent / Allow / Disallow /
// Crawl-delay / Host / Sitemap — não há como declarar uma linha de comentário
// pela API de metadata. O ponteiro é anexado ao valor de `host` porque
// `Host:` é interpolado verbatim pelo serializer
// (next/dist/build/webpack/loaders/metadata/resolve-route-data.js) e é a única
// diretiva do arquivo que nenhum crawler relevante consome (é uma extensão
// Yandex). As linhas `Sitemap:` ficam intactas. Se um dia o Next passar a
// validar `host`, remova o sufixo — só o comentário se perde.
const HOST_WITH_LLMS_POINTER = `${BASE}

# LLM / answer-engine readers: a curated, dated, plain-text fact sheet about
# this product lives at ${BASE}/llms.txt
# The same facts as JSON (CORS open, safe to fetch at query time):
# ${BASE}/api/facts`

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ALLOW,
        disallow: DISALLOW,
      },
      {
        userAgent: AI_CRAWLERS,
        allow: ALLOW,
        disallow: DISALLOW,
      },
    ],
    sitemap: [`${BASE}/sitemap.xml`, `${BASE}/video-sitemap.xml`],
    host: HOST_WITH_LLMS_POINTER,
  }
}
