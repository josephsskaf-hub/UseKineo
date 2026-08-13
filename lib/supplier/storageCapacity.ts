// KINEO-STORAGE-WATCH-2026-08-13 — o Supabase Storage entra no vigia horário.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE ESTE ARQUIVO EXISTE
//
// `supplier-watch` roda de hora em hora e vigia Creatomate, OpenAI e fal.ai.
// Ele NÃO vigiava o Storage — e o Storage é o único fornecedor cuja falha é
// BINÁRIA em vez de cara.
//
// A parede: se o Spend Cap do projeto estiver LIGADO, bater 100 GB faz o upload
// FALHAR — e todo vídeo gerado passa por um upload. É o apagão do Creatomate de
// 09/08 (33 horas sem renderizar um vídeo) reencenado na porta de entrada do
// funil. Se o Spend Cap estiver DESLIGADO, o excedente custa US$ 0,0213/GB —
// centavos. O MESMO NÚMERO é incêndio ou troco dependendo de um botão, e por
// isso os dois textos de alerta mandam conferir esse botão.
//
// ⚠️ COMO ESTE ARQUIVO QUASE NASCEU MENTINDO — vale mais que o resto do módulo.
//
// A primeira versão media pela soma de `storage.objects` e alarmava pelo
// percentual cru. Naquele número o projeto estava em "91,9% e 2,6 dias da
// parede", e este módulo teria disparado um VERMELHO de 95% na estreia. No mesmo
// dia, o fundador conferiu o painel oficial de Billing: **46%**. A soma do banco
// lê quase 2x o cobrado (ver bloco CALIBRAÇÃO abaixo).
//
// Não havia emergência nenhuma. O alarme teria mandado o dono correr para
// apagar arquivo por causa de um problema que não existe — e um alarme que
// grita errado na estreia não é um alarme, é uma coisa que se aprende a ignorar.
// Daí a regra que este arquivo passa a carregar: **medida de fonte não-oficial
// vira ESTIMATIVA declarada, nunca veredito.**
//
// ─────────────────────────────────────────────────────────────────────────────
// DUAS PERGUNTAS DIFERENTES, E A SEGUNDA CHEGA PRIMEIRO
//
// Mesmo desenho de `maybeAlertProjection` para o Creatomate, pela mesma razão
// registrada lá: patamar e projeção não são a mesma coisa.
//
//   PATAMAR  — "já passei de 80/90/95%?" Chega tarde num crescimento rápido.
//   PROJEÇÃO — "no ritmo dos últimos 7 dias, em quantos dias eu bato 100%?"
//              Acende mesmo com o percentual ainda baixo.
//
// Com os números calibrados de 13/08 (~46% e ~1,5 GB/dia) NENHUMA das duas
// acende, que é o resultado correto. A projeção existe para o dia em que o
// ritmo mudar — ela é o aviso que chega antes, e não existia.
//
// ─────────────────────────────────────────────────────────────────────────────
// O QUE ESTE MÓDULO NÃO FAZ, DE PROPÓSITO
//
// Não apaga nada, não move nada, não muda cota. Ele mede e avisa. A limpeza tem
// dono e é uma rota separada, admin-gated e com manifesto:
// `/api/admin/broll-gc` (KINEO-BROLL-GC-2026-08-13).

import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyFounder } from '@/lib/supplier/notify'

/** Cota do plano Pro, confirmada via API de gestão em 08/08/2026. */
export const STORAGE_QUOTA_GB = 100

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ CALIBRAÇÃO — LEIA ANTES DE MEXER EM QUALQUER NÚMERO DAQUI
//
// `sum(storage.objects.metadata->>'size')` NÃO É O NÚMERO COBRADO, e a diferença
// é de quase 2x. Medido em 13/08/2026, no mesmo dia, nas duas fontes:
//
//     soma de storage.objects ....... 91,92 GB   (o que esta base devolve)
//     painel oficial de Billing ..... 46,20 GB   (o que a Supabase cobra)
//     razão ......................... 0,503
//
// O fundador conferiu o painel visualmente. A fonte oficial é o painel; a soma
// do banco é um **limite superior**. (Hipótese não confirmada para a diferença:
// linhas de índice cujos bytes não estão — ou não estão mais — no S3. A §4 de
// docs/BROLL-ORPHANS-2026-08-08.md já tinha provado que `storage.objects` é o
// ÍNDICE do arquivo e não a fonte da verdade dele. Investigar sem pressa.)
//
// ISTO QUASE VIROU UMA FÁBRICA DE E-MAIL: a primeira versão deste módulo
// disparava patamar por percentual cru. Com 91,92 GB ele teria acendido o
// vermelho de 95% HOJE, num projeto que está em 46%. Um alarme que grita errado
// na estreia não é um alarme — é uma coisa que o dono aprende a ignorar.
//
// Por isso: os patamares avaliam o valor CALIBRADO, os dois números aparecem em
// todo alerta, e o texto sempre manda conferir o painel antes de agir.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Razão painel/banco. Sobrescrevível por env sem deploy quando uma leitura nova
 * do painel discordar. Falha SEGURA: valor ausente/ilegível/fora de (0,1] cai
 * no calibrado de 13/08 em vez de virar 1,0 (que traria o falso alarme de volta).
 */
export function billedRatio(): number {
  const raw = Number(process.env.KINEO_STORAGE_BILLED_RATIO)
  if (Number.isFinite(raw) && raw > 0 && raw <= 1) return raw
  return 0.503
}

/** Patamares anunciados. Um aviso por patamar — nunca repete o mesmo. */
const THRESHOLDS = [80, 90, 95, 100] as const
/** Abaixo disto a projeção não fala: ruído de dia parado vira falso alarme. */
const MIN_GB_PER_DAY = 0.2
/** Projeção só grita se a parede estiver a menos de 14 dias. */
const PROJECTION_ALERT_DAYS = 14

const GB = 1024 * 1024 * 1024
const DAY_MS = 24 * 60 * 60 * 1000

const THRESHOLD_EVENT = 'storage_capacity_threshold'
const PROJECTION_EVENT = 'storage_capacity_projection'

export interface BucketUsage {
  bucket: string
  objects: number
  gb: number
}

export interface StorageCapacity {
  /** Estimativa CALIBRADA para o painel de Billing. É o número que decide alarme. */
  totalGb: number
  /** Soma crua de `storage.objects` — limite superior, quase 2x o cobrado. */
  rawDbGb: number
  /** Razão aplicada (painel ÷ banco). */
  ratio: number
  quotaGb: number
  percentUsed: number
  freeGb: number
  buckets: BucketUsage[]
  /** Crescimento médio dos últimos 7 dias. `null` quando não é mensurável. */
  gbPerDay: number | null
  /** Dias até 100% no ritmo atual. `null` quando o ritmo não é mensurável. */
  daysToFull: number | null
  headline: string
}

interface SummaryRow { bucket: string; objects: number; bytes: string | number }

/**
 * Lê o total por bucket e o ritmo de crescimento de 7 dias.
 *
 * NUNCA lança: este módulo é chamado de dentro de um cron cujo trabalho
 * principal é outro (saúde de geração). Uma falha de medição aqui não pode
 * derrubar o alarme de apagão do produto — devolve `null` e segue.
 */
export async function readStorageCapacity(
  admin: SupabaseClient,
): Promise<StorageCapacity | null> {
  try {
    const { data, error } = await admin.rpc('storage_usage_summary')
    if (error || !Array.isArray(data)) {
      console.warn('[storage-watch] storage_usage_summary falhou:', error?.message ?? 'sem dados')
      return null
    }

    const buckets: BucketUsage[] = (data as SummaryRow[])
      .map((r) => ({
        bucket: String(r.bucket),
        objects: Number(r.objects) || 0,
        gb: Number(Number(r.bytes) / GB),
      }))
      .sort((a, b) => b.gb - a.gb)

    const rawDbGb = buckets.reduce((s, b) => s + b.gb, 0)
    const ratio = billedRatio()
    // Tudo daqui para baixo trabalha no espaço CALIBRADO — inclusive o ritmo,
    // senão a projeção herdaria o mesmo fator ~2 e mentiria na mesma proporção.
    const totalGb = rawDbGb * ratio
    const percentUsed = (totalGb / STORAGE_QUOTA_GB) * 100
    const freeGb = STORAGE_QUOTA_GB - totalGb

    // Ritmo: bytes criados nos últimos 7 dias ÷ 7. Mede CRESCIMENTO, não
    // tamanho — é o número que responde "quando bate a parede".
    let gbPerDay: number | null = null
    const { data: growth, error: gErr } = await admin.rpc('storage_growth_7d')
    if (!gErr && growth != null) {
      const g = Number(Array.isArray(growth) ? (growth[0]?.gb_7d ?? 0) : growth)
      // `ratio` também aqui: o crescimento vem da mesma fonte inflada.
      if (Number.isFinite(g) && g > 0) gbPerDay = (g * ratio) / 7
    }

    const daysToFull =
      gbPerDay !== null && gbPerDay >= MIN_GB_PER_DAY && freeGb > 0
        ? freeGb / gbPerDay
        : gbPerDay !== null && gbPerDay >= MIN_GB_PER_DAY
          ? 0
          : null

    const headline =
      `~${totalGb.toFixed(1)} GB de ${STORAGE_QUOTA_GB} GB (${percentUsed.toFixed(1)}%, estimado)` +
      ` · soma crua do banco ${rawDbGb.toFixed(1)} GB` +
      (daysToFull !== null ? ` · ~${daysToFull.toFixed(0)} dias de folga` : '')

    return { totalGb, rawDbGb, ratio, quotaGb: STORAGE_QUOTA_GB, percentUsed, freeGb, buckets, gbPerDay, daysToFull, headline }
  } catch (e) {
    console.warn('[storage-watch] readStorageCapacity lançou:', e instanceof Error ? e.message : String(e))
    return null
  }
}

function bucketLines(buckets: BucketUsage[]): string {
  return buckets
    .slice(0, 6)
    .map((b) => `  ${b.bucket.padEnd(14)} ${b.gb.toFixed(2).padStart(7)} GB  (${b.objects} objetos)`)
    .join('\n')
}

/**
 * Bloco comum: este alerta é ESTIMATIVA. Vem primeiro de propósito — em 13/08 a
 * soma do banco disse 91,9 GB e o painel dizia 46,2 GB, e um alerta que não
 * abrisse admitindo isso teria mandado o dono limpar um problema inexistente.
 */
const ESTIMATE_BLOCK =
  'ESTE NUMERO E ESTIMATIVA, NAO A FATURA. A fonte oficial e o painel de Billing.\n' +
  'A soma de storage.objects leu ~2x o cobrado em 13/08 (91,9 GB no banco vs\n' +
  '46,2 GB no painel), entao o alerta aplica uma razao de calibracao. Confira o\n' +
  'painel ANTES de apagar qualquer coisa; se ele discordar, ajuste a env\n' +
  'KINEO_STORAGE_BILLED_RATIO na Vercel (sem deploy) e o alarme se recalibra.\n'

/** Bloco comum aos dois alertas: o botão que decide se isto é incêndio ou troco. */
const SPEND_CAP_BLOCK =
  'SE O PAINEL CONFIRMAR QUE ESTA PERTO DO TETO, 30 SEGUNDOS QUE MUDAM O TAMANHO DO PROBLEMA:\n' +
  '  supabase.com -> projeto -> Billing -> Spend Cap.\n' +
  '  · LIGADO  = bater 100 GB faz o UPLOAD FALHAR. Todo video gerado passa por\n' +
  '    um upload, entao isso e apagao — o de 09/08 durou 33h.\n' +
  '  · DESLIGADO = o excedente e cobrado a US$ 0,0213/GB. Centavos. Sem pressa.\n'

/** Bloco comum: onde está o espaço e como devolvê-lo sem tocar em vídeo de cliente. */
const CLEANUP_BLOCK =
  'ONDE ESTA O ESPACO (medido em 13/08):\n' +
  '  O bucket `broll` e ~2/3 de tudo, e a maior parte dele e ORFAO — arquivo que\n' +
  '  nenhum codigo consegue ler, sobra de um bug ja corrigido em 08/08.\n' +
  '  `renders` (o produto entregue ao cliente) e a MENOR parte do problema.\n\n' +
  'COMO DEVOLVER ESPACO SEM TOCAR EM VIDEO DE CLIENTE:\n' +
  '  1. so mede: https://www.usekineo.com/api/admin/broll-gc\n' +
  '  2. apaga com manifesto, em lotes:\n' +
  '     https://www.usekineo.com/api/admin/broll-gc?confirm=DELETE-ORPHANS&limit=200\n'

/**
 * Avisa ao cruzar 80/90/95/100%. Dedupe pelo próprio banco: o marcador é um
 * evento com `threshold_key` único, e o índice único rejeita o segundo insert.
 *
 * Se a notificação NÃO for entregue, o marcador é DESFEITO. É a mesma
 * compensação de `maybeAlertProjection`: marcador que sobrevive a um envio que
 * não saiu é um "já avisei" mentiroso, e aqui ele silenciaria o patamar para
 * sempre.
 */
export async function maybeAlertStorageThreshold(
  admin: SupabaseClient,
  cap: StorageCapacity,
): Promise<number | null> {
  try {
    const crossed = THRESHOLDS.filter((t) => cap.percentUsed >= t)
    if (crossed.length === 0) return null
    const level = crossed[crossed.length - 1]
    const key = `storage:${level}`

    const { error } = await admin.from('events').insert({
      user_id: null,
      name: THRESHOLD_EVENT,
      path: '/api/cron/supplier-watch',
      metadata: {
        threshold_key: key,
        threshold: level,
        total_gb: Number(cap.totalGb.toFixed(2)),
        raw_db_gb: Number(cap.rawDbGb.toFixed(2)),
        ratio: cap.ratio,
        percent_used: Number(cap.percentUsed.toFixed(1)),
        free_gb: Number(cap.freeGb.toFixed(2)),
        gb_per_day: cap.gbPerDay === null ? null : Number(cap.gbPerDay.toFixed(2)),
        days_to_full: cap.daysToFull === null ? null : Number(cap.daysToFull.toFixed(1)),
      },
    })
    // 23505 = este patamar já foi anunciado. Nada a fazer.
    if (error) {
      if (error.code !== '23505') {
        console.warn(`[storage-watch] marcador de patamar falhou: ${error.code ?? '?'} ${error.message}`)
      }
      return null
    }

    const icon = level >= 95 ? '🔴' : level >= 90 ? '🟠' : '🟡'
    const notified = await notifyFounder(
      `${icon} Kineo: Supabase Storage ~${cap.percentUsed.toFixed(0)}% estimado (patamar ${level}% cruzado) — confirmar no painel`,
      `${cap.headline}\n\n` +
        `POR BUCKET (soma crua do banco):\n${bucketLines(cap.buckets)}\n\n` +
        ESTIMATE_BLOCK +
        '\n' +
        SPEND_CAP_BLOCK +
        '\n' +
        CLEANUP_BLOCK +
        '\nUm aviso por patamar (80/90/95/100). Painel: /admin/supplier-health',
    )
    if (!notified.delivered) {
      await admin.from('events').delete().eq('name', THRESHOLD_EVENT).eq('metadata->>threshold_key', key)
      console.error(`[storage-watch] 🔴 aviso de patamar ${level}% não chegou — marcador desfeito, retenta`)
      return null
    }
    console.warn(`[storage-watch] PATAMAR ${level}% anunciado (${cap.headline})`)
    return level
  } catch (e) {
    console.warn('[storage-watch] maybeAlertStorageThreshold lançou:', e instanceof Error ? e.message : String(e))
    return null
  }
}

/**
 * Avisa quando a projeção põe a parede a menos de 14 dias. Um aviso por DIA —
 * a chave inclui a data, então o assunto volta amanhã se ninguém agir, mas não
 * de hora em hora.
 */
export async function maybeAlertStorageProjection(
  admin: SupabaseClient,
  cap: StorageCapacity,
  now: Date,
): Promise<boolean> {
  try {
    if (cap.daysToFull === null || cap.daysToFull > PROJECTION_ALERT_DAYS) return false
    // Já está estourado: quem fala é o alarme de patamar, não a projeção.
    if (cap.percentUsed >= 100) return false

    const key = `storage-projection:${now.toISOString().slice(0, 10)}`
    const { error } = await admin.from('events').insert({
      user_id: null,
      name: PROJECTION_EVENT,
      path: '/api/cron/supplier-watch',
      metadata: {
        projection_key: key,
        total_gb: Number(cap.totalGb.toFixed(2)),
        raw_db_gb: Number(cap.rawDbGb.toFixed(2)),
        ratio: cap.ratio,
        percent_used: Number(cap.percentUsed.toFixed(1)),
        free_gb: Number(cap.freeGb.toFixed(2)),
        gb_per_day: cap.gbPerDay === null ? null : Number(cap.gbPerDay.toFixed(2)),
        days_to_full: Number(cap.daysToFull.toFixed(1)),
      },
    })
    if (error) {
      if (error.code !== '23505') {
        console.warn(`[storage-watch] marcador de projeção falhou: ${error.code ?? '?'} ${error.message}`)
      }
      return false
    }

    const notified = await notifyFounder(
      `⚠️ Kineo: no ritmo atual o Storage bate 100% em ~${cap.daysToFull.toFixed(0)} dias (estimado) — confirmar no painel`,
      `A cota nao acabou — mas o ritmo diz quando acaba.\n\n` +
        `${cap.headline}\n` +
        `  livre ............. ${cap.freeGb.toFixed(2)} GB\n` +
        `  crescimento 7d .... ${cap.gbPerDay?.toFixed(2) ?? '?'} GB/dia\n\n` +
        `POR BUCKET (soma crua do banco):\n${bucketLines(cap.buckets)}\n\n` +
        ESTIMATE_BLOCK +
        '\n' +
        SPEND_CAP_BLOCK +
        '\n' +
        CLEANUP_BLOCK +
        '\nUm aviso de projecao por dia. Painel: /admin/supplier-health',
    )
    if (!notified.delivered) {
      await admin.from('events').delete().eq('name', PROJECTION_EVENT).eq('metadata->>projection_key', key)
      console.error('[storage-watch] 🔴 aviso de projeção não chegou — marcador desfeito, retenta')
      return false
    }
    console.warn(`[storage-watch] PROJEÇÃO anunciada: ~${cap.daysToFull.toFixed(1)} dias (${cap.headline})`)
    return true
  } catch (e) {
    console.warn('[storage-watch] maybeAlertStorageProjection lançou:', e instanceof Error ? e.message : String(e))
    return false
  }
}
