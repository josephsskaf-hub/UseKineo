// KINEO-LIFECYCLE-FRESH-READ-2026-08-05
//
// O QUE ACONTECEU (medido, não suposto)
// ─────────────────────────────────────
// Em 05/08 o cron `send-cap-hit` mandou o MESMO e-mail 3× para a mesma pessoa
// (21:45Z, 22:45Z, 23:15Z). Para ser reselecionada, a linha dela precisa passar
// por `.is('cap_hit_sent_at', null)` — e uma consulta SQL direta ao banco, nos
// mesmos minutos, mostrava o carimbo lá, estável. Na MESMA rodada, alguém sem
// nenhum carimbo aparecia como suprimido, por um valor que só existia ANTES do
// backfill das 22:20Z.
//
// As duas anomalias têm a mesma forma: **o cron lia uma versão mais VELHA da
// tabela do que a que o Postgres serve.** As escritas, essas, sempre chegaram.
//
// O QUE ISOLOU A CAUSA
// ────────────────────
// Às 23:29Z entrou um deploy cujo commit mexia SÓ em documentação — nenhuma
// linha de código mudou. A rodada seguinte, 23:45Z, **não reenviou**
// (`pg_stat_statements` confirma: os UPDATE de `cap_hit_sent_at` ficaram
// parados em 30 chamadas). Nada no banco mudou; o que mudou foi o processo.
//
// Isso elimina de vez o lado do banco (trigger, réplica, RLS, linha duplicada,
// outro cron — todos já checados linha a linha) e aponta para estado que vive
// DENTRO do deploy e morre com ele: cache de `fetch` / lambda quente. O
// `supabase-js` fala com o PostgREST por `fetch`, e no App Router do Next 14 o
// `fetch` é interceptado e cacheado por padrão. `export const dynamic =
// 'force-dynamic'` cobre o request, mas não é garantia para chamada feita
// dentro de biblioteca importada — e o custo de não depender disso é zero.
//
// A REGRA
// ───────
// Job de ciclo de vida decide "eu já mandei este e-mail?" lendo o banco. Se a
// leitura pode ser velha, a decisão pode ser errada, e o erro é reenviar — que
// custa a reputação do domínio, ou seja, o canal de vendas inteiro. Leitura de
// cron NUNCA pode vir de cache.

/**
 * `fetch` que nunca serve resposta cacheada. Passar em
 * `createClient(url, key, { global: { fetch: freshFetch } })`.
 *
 * Não muda nenhuma regra de negócio: só garante que a resposta é a de agora.
 */
export const freshFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' })
