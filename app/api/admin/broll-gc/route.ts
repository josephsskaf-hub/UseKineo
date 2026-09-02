// KINEO-BROLL-GC-2026-08-13 — coletor de lixo do bucket `broll`, admin-gated.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE ESTA ROTA EXISTE (e por que ela é uma ROTA e não um script)
//
// `docs/BROLL-ORPHANS-2026-08-08.md` diagnosticou o passivo inteiro em 08/08:
// mediu os órfãos, provou que são inalcançáveis, provou que mover por SQL
// corrompe o objeto, e escreveu o runbook. E então parou — bloqueado em UMA
// coisa (§5): `scripts/broll-orphans-to-trash.mjs` precisa de
// SUPABASE_SERVICE_ROLE_KEY, e o `.env.local` desta máquina tem placeholders.
// Cinco dias depois a chave continua ausente e nenhum byte foi liberado.
//
// A produção JÁ TEM essa chave. Ela está no ambiente da Vercel desde sempre —
// é a mesma que `lib/clipVault.ts` usa para gravar os clipes. O trabalho que
// faltava não era descobrir o que fazer; era mudar o CUSTO de agir, de
// "preencher um .env e rodar um script node" para "abrir uma URL".
//
// ─────────────────────────────────────────────────────────────────────────────
// OS NÚMEROS (medidos em 13/08, não herdados de doc) — E A CORREÇÃO QUE ELES
// LEVARAM NO MESMO DIA
//
// Soma de `storage.objects`, por bucket:
//   `broll`: 62,05 GB = 67,5% de tudo · destes, ÓRFÃOS: 46,33 GB em 2.734
//   objetos · `renders` (o produto entregue ao cliente): 24,99 GB.
//   TOTAL somado no banco: 91,92 GB.
//
// ⚠️ ESSE TOTAL NÃO É O COBRADO. No mesmo dia o fundador conferiu o painel
// oficial de Billing: **46,2 GB (46%)**. A soma do banco lê ~2x (razão 0,503).
// A primeira versão deste arquivo dizia "91,9% da cota, 3 a 5 dias da parede" e
// tratava a limpeza como emergência. **Não é emergência** — são ~35 dias de
// folga no ritmo atual. O tratamento completo da calibração está em
// `lib/supplier/storageCapacity.ts`.
//
// O QUE A CORREÇÃO **NÃO** DERRUBA, e é por isso que esta rota continua de pé:
// as PROPORÇÕES vêm todas da mesma fonte e não dependem da escala. Órfão
// continua sendo órfão. Seja qual for o fator, **metade do que a casa armazena
// são arquivos que NENHUM código consegue ler** — e os vídeos dos clientes são
// a menor parte. Isso é desperdício com ou sem urgência; o que mudou é o prazo,
// não o diagnóstico.
//
// ─────────────────────────────────────────────────────────────────────────────
// O BUG QUE OS CRIOU JÁ MORREU — E OS DADOS PROVAM SOZINHOS
//
// `safeVaultScore` (KINEO-BUGHUNT-2026-08-08) consertou o insert que o Postgres
// recusava por score fracionário. O upload acontecia ANTES do insert, então
// cada recusa deixava um arquivo de até 40MB que ninguém indexava e ninguém
// apagava. A série diária de nascimento de órfãos é um experimento natural
// limpo — o commit entrou em 08/08:
//
//     dia     órfãos novos    indexados novos
//     01/08        175               0
//     04/08        335               0
//     07/08        185               1
//     08/08         79             215   ← safeVaultScore entra em produção
//     09/08          2             148
//     11/08          1              91
//     13/08          0              30
//
// A torneira fechou. Os 46,33 GB são um bloco ESTÁTICO — um fóssil, não um
// vazamento. E o cofre que sobrou está saudável e é um ativo real: 1.010 clipes
// indexados, 495 deles REUSADOS, um com 47 usos. Este GC não toca em nenhum.
//
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ O ACHADO QUE MUDA A ORDEM DE 08/08 — LEIA ANTES DE ESCOLHER O MODO
//
// A ordem literal do fundador em 08/08 foi: **"NÃO APAGAR. Mover para `trash/`
// primeiro."** Ela foi dada quando o problema era SEGURANÇA da limpeza, e o
// próprio doc registrava "excedente hoje: 0" — não havia emergência de cota.
//
// Hoje o problema é COTA, e para cota o `trash/` NÃO RESOLVE NADA:
// **a cota do Supabase conta BYTES ARMAZENADOS, não caminhos.** Um objeto
// movido de `vault/x.mp4` para `trash/x.mp4` continua no mesmo bucket, no mesmo
// projeto, pesando exatamente o mesmo. `MODE_TRASH` libera **0,00 GB de cota**.
//
// Isso não é motivo para desobedecer a ordem — é motivo para ela ser
// REAPRESENTADA com o dado novo. Por isso as duas existem aqui, e por isso a
// resposta do modo TRASH devolve `quota_freed_gb: 0` explicitamente, em vez de
// deixar quem clicou achar que resolveu.
//
// A reversibilidade do DELETE é o MANIFESTO, não o `trash/`: cada objeto
// apagado vira uma linha em `broll_gc_manifest` (path, bytes, created_at,
// deleted_at) ANTES do delete. Para um órfão isso é a reversibilidade
// disponível de verdade — um órfão, por definição, não tem ponteiro para
// restaurar: nenhuma linha de `clip_vault`, nenhum vídeo, nenhum render.
// A prova disso é a §3 do doc de 08/08, que varreu ~200 colunas text/jsonb de
// TODAS as tabelas do schema public procurando qualquer path do `broll` e
// achou exatamente uma coluna: `clip_vault.storage_url`, com as linhas que
// NÃO são órfãs.
//
// ─────────────────────────────────────────────────────────────────────────────
// MODOS (GET, admin- ou cron-gated)
//
//   (sem params)                    → PLAN. Só mede. Não escreve NADA.
//   ?confirm=TRASH&limit=N          → move N órfãos para `trash/` (ordem de
//                                     08/08). Reversível. Libera 0 GB de cota.
//   ?confirm=DELETE-ORPHANS&limit=N → grava manifesto e apaga N órfãos.
//                                     É o único modo que devolve cota.
//
// `limit` default 200, teto 1000 por chamada (o `remove` da API aceita 1000
// paths; acima disso a chamada fica longa demais para a janela da Vercel).
//
// ─────────────────────────────────────────────────────────────────────────────
// INVARIANTES DE SEGURANÇA (todas verificadas em código, não por convenção)
//
//  1. SÓ o prefixo `vault/`. `ai-hook/` (8 objetos) é asset VIVO servido direto
//     ao render sem nunca ser indexado — a definição ingênua de "sem linha no
//     índice" o mataria. `rickrefs/` (3, upload manual) idem. Ambos excluídos
//     por prefixo, antes de qualquer outra regra.
//  2. Janela de 2h: objeto recém-criado cujo insert ainda está em voo NÃO é
//     órfão. Sem isso o GC corre contra o `vaultClipAsync` e come clipe bom.
//  3. O conjunto é RECALCULADO a cada chamada, a partir do estado atual do
//     bucket e do índice. Nunca opera sobre lista velha.
//  4. Se a leitura do índice `clip_vault` falhar por qualquer motivo, a rota
//     ABORTA. Índice vazio significaria "todo objeto é órfão" — falha FECHADA.
//  5. `DRY` é o default. Nenhum parâmetro = nenhuma escrita.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
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
export const maxDuration = 300

const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

const BUCKET = 'broll'
/** Invariante 1: só este prefixo é elegível. */
const GC_PREFIX = 'vault'
/** Invariante 2: nada mais novo que isto pode ser chamado de órfão. */
const SAFETY_WINDOW_MS = 2 * 60 * 60 * 1000
const DEFAULT_LIMIT = 200
const MAX_LIMIT = 1000
const PAGE = 1000
/** Teto de páginas — 3.744 objetos hoje; 40k é folga de uma ordem de grandeza. */
const MAX_PAGES = 40

const GB = 1024 * 1024 * 1024

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

interface VaultObject {
  name: string // path completo, ex. "vault/1786598815840-3yals2.mp4"
  bytes: number
  createdAt: string
}

/**
 * Lista TODOS os objetos sob `vault/`, paginado. A API de Storage devolve no
 * máximo 1000 por chamada; parar na primeira página faria o GC enxergar 27% do
 * bucket e reportar um número errado com cara de certo.
 */
async function listVaultObjects(admin: SupabaseClient): Promise<VaultObject[]> {
  const out: VaultObject[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await admin.storage
      .from(BUCKET)
      .list(GC_PREFIX, { limit: PAGE, offset: page * PAGE, sortBy: { column: 'created_at', order: 'asc' } })
    if (error) throw new Error(`storage.list falhou na página ${page}: ${error.message}`)
    if (!data || data.length === 0) break
    for (const row of data) {
      // `list` de um prefixo devolve também as "pastas" (name sem metadata).
      const size = (row as { metadata?: { size?: number } }).metadata?.size
      if (typeof size !== 'number') continue
      out.push({
        name: `${GC_PREFIX}/${row.name}`,
        bytes: size,
        createdAt: (row as { created_at?: string }).created_at ?? '',
      })
    }
    if (data.length < PAGE) break
  }
  return out
}

/**
 * Todos os paths que o índice conhece. `clip_vault.storage_url` guarda a URL
 * PÚBLICA inteira, não o path — então a chave de comparação é o sufixo depois
 * de `/broll/`. Paginado pelo mesmo motivo do anterior (db.max_rows = 1000).
 */
async function loadIndexedPaths(admin: SupabaseClient): Promise<Set<string>> {
  const set = new Set<string>()
  for (let from = 0; from < MAX_PAGES * PAGE; from += PAGE) {
    const { data, error } = await admin
      .from('clip_vault')
      .select('storage_url')
      .range(from, from + PAGE - 1)
    // Invariante 4: falha de leitura do índice ABORTA. Um Set vazio por erro
    // transformaria "não sei" em "apague tudo".
    if (error) throw new Error(`leitura de clip_vault falhou @${from}: ${error.message}`)
    if (!data || data.length === 0) break
    for (const row of data as Array<{ storage_url: string | null }>) {
      const url = row.storage_url
      if (!url) continue
      const idx = url.indexOf(`/${BUCKET}/`)
      if (idx === -1) continue
      set.add(url.slice(idx + BUCKET.length + 2))
    }
    if (data.length < PAGE) break
  }
  return set
}

export async function GET(req: NextRequest) {
  try {
    // Auth: cookie de admin OU Bearer CRON_SECRET (mesma forma de todo
    // /api/admin/*). Só honra o bearer se o segredo existir de verdade.
    const cronSecret = process.env.CRON_SECRET
    const isCronCall =
      !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`

    if (!isCronCall) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const email = (user?.email ?? '').toLowerCase()
      if (!user || !ADMIN_EMAILS.has(email)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const admin = serviceClient()
    if (!admin) {
      return NextResponse.json(
        { error: 'Service credentials not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 },
      )
    }

    const url = new URL(req.url)
    const confirm = (url.searchParams.get('confirm') ?? '').toUpperCase()
    const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10)
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(MAX_LIMIT, rawLimit))
      : DEFAULT_LIMIT

    // ── Recalcula o conjunto do zero (invariante 3) ──────────────────────────
    const [objects, indexed] = await Promise.all([
      listVaultObjects(admin),
      loadIndexedPaths(admin),
    ])

    const cutoff = Date.now() - SAFETY_WINDOW_MS
    const orphans: VaultObject[] = []
    let recentSkipped = 0
    for (const o of objects) {
      if (indexed.has(o.name)) continue
      const t = o.createdAt ? Date.parse(o.createdAt) : Number.NaN
      // Sem timestamp legível → trata como recente (conservador de propósito).
      if (!Number.isFinite(t) || t > cutoff) { recentSkipped++; continue }
      orphans.push(o)
    }
    // Mais antigos primeiro: se o lote for parcial, o que sai é o mais frio.
    orphans.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))

    const bytesOf = (arr: VaultObject[]) => arr.reduce((s, o) => s + o.bytes, 0)
    const totalBytes = bytesOf(objects)
    const orphanBytes = bytesOf(orphans)
    const gb = (b: number) => Number((b / GB).toFixed(2))

    const survey = {
      bucket: BUCKET,
      prefixo_varrido: `${GC_PREFIX}/`,
      objetos_no_prefixo: objects.length,
      gb_no_prefixo: gb(totalBytes),
      indexados_em_clip_vault: indexed.size,
      orfaos_elegiveis: orphans.length,
      gb_orfaos_elegiveis: gb(orphanBytes),
      ignorados_por_janela_2h: recentSkipped,
    }

    // ── MODO PLAN (default): mede e vai embora ───────────────────────────────
    if (confirm !== 'TRASH' && confirm !== 'DELETE-ORPHANS') {
      return NextResponse.json({
        mode: 'PLAN (dry run — nada foi escrito)',
        ...survey,
        amostra: orphans.slice(0, 5).map((o) => ({
          path: o.name,
          mb: Number((o.bytes / 1024 / 1024).toFixed(1)),
          criado_em: o.createdAt,
        })),
        nota_cota:
          'A cota do Supabase conta BYTES, nao caminhos: mover para trash/ NAO devolve cota. ' +
          'Só DELETE-ORPHANS devolve.',
        proximos_passos: {
          mover_para_trash_ordem_08_08: `${url.pathname}?confirm=TRASH&limit=200`,
          apagar_com_manifesto: `${url.pathname}?confirm=DELETE-ORPHANS&limit=200`,
        },
      })
    }

    if (orphans.length === 0) {
      return NextResponse.json({ mode: confirm, ...survey, processados: 0, nota: 'Nada elegivel.' })
    }

    const batch = orphans.slice(0, limit)

    // ── MODO TRASH: honra a ordem literal de 08/08 ───────────────────────────
    // Um `move` por objeto (a API não tem move em lote). É lento de propósito:
    // este modo não é o caminho quente, é o caminho conservador.
    if (confirm === 'TRASH') {
      const moved: string[] = []
      const failed: Array<{ path: string; erro: string }> = []
      for (const o of batch) {
        const dest = o.name.replace(new RegExp(`^${GC_PREFIX}/`), 'trash/')
        const { error } = await admin.storage.from(BUCKET).move(o.name, dest)
        if (error) failed.push({ path: o.name, erro: error.message })
        else moved.push(o.name)
      }
      return NextResponse.json({
        mode: 'TRASH (reversivel — cada linha e um move de volta)',
        ...survey,
        movidos: moved.length,
        falhas: failed.length,
        gb_movidos: gb(bytesOf(batch.filter((o) => moved.includes(o.name)))),
        quota_freed_gb: 0,
        aviso:
          'ATENCAO: mover dentro do mesmo bucket NAO libera um unico byte de cota. ' +
          'O Storage cobra por bytes armazenados. Se o objetivo e sair dos 91,9%, ' +
          'este modo nao resolve — use confirm=DELETE-ORPHANS.',
        amostra_falhas: failed.slice(0, 5),
      })
    }

    // ── MODO DELETE: manifesto ANTES, remoção DEPOIS ─────────────────────────
    // A ordem importa. Manifesto primeiro significa que uma falha no meio deixa
    // no máximo uma linha a mais (auditável); remoção primeiro deixaria bytes
    // apagados sem registro nenhum de que existiram.
    const manifestRows = batch.map((o) => ({
      path: o.name,
      bytes: o.bytes,
      created_at: o.createdAt || null,
      deleted_at: new Date().toISOString(),
      reason: 'orphan_vault_no_clip_vault_row',
    }))

    const { error: manErr } = await admin.from('broll_gc_manifest').insert(manifestRows)
    if (manErr) {
      return NextResponse.json(
        {
          mode: 'DELETE — ABORTADO ANTES DE APAGAR',
          ...survey,
          erro_manifesto: manErr.message,
          nota:
            'Nenhum objeto foi tocado. O manifesto e a unica trilha de auditoria do delete; ' +
            'sem ele o delete nao acontece. Rode a migracao de broll_gc_manifest primeiro.',
        },
        { status: 500 },
      )
    }

    const { error: rmErr } = await admin.storage.from(BUCKET).remove(batch.map((o) => o.name))
    if (rmErr) {
      return NextResponse.json(
        { mode: 'DELETE — falha no remove', ...survey, erro: rmErr.message, manifesto_gravado: batch.length },
        { status: 500 },
      )
    }

    const freed = bytesOf(batch)
    const restantes = orphans.length - batch.length
    return NextResponse.json({
      mode: 'DELETE-ORPHANS',
      ...survey,
      apagados: batch.length,
      quota_freed_gb: gb(freed),
      manifesto: `broll_gc_manifest (+${batch.length} linhas)`,
      orfaos_restantes: restantes,
      gb_restantes: gb(orphanBytes - freed),
      repetir: restantes > 0 ? `${url.pathname}?confirm=DELETE-ORPHANS&limit=${MAX_LIMIT}` : null,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
