// KINEO-ENGINE-WALL-2026-08-15 — a parede de motores da home.
//
// O padrão que o fundador ama no Higgsfield: o catálogo É a landing — uma
// grade densa de vídeos rodando, cada um com o selo do MODELO que o gerou.
// A nossa versão é 100% honesta: cada card vem do banco com o quality_mode
// REAL do render. Um vídeo só ganha selo "VEO 3" se foi o Veo que o gerou.
//
// Regras:
//  · só vídeos completed com URL durável (storage do Supabase — os buckets
//    de CDN do Creatomate morrem em dias, medido em 11/08);
//  · 1–2 por motor, mais recentes primeiro, título limpo pelo MESMO
//    cleanTitleLine das páginas /v/;
//  · falha de banco ⇒ lista vazia ⇒ a seção não renderiza. Nunca quebra a home.
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cleanTitleLine } from '@/lib/publicVideos'

export type WallVideo = {
  id: string
  title: string
  videoUrl: string
  engine: string
  /** Rótulo curto do selo, estilo Higgsfield: caps, seco. */
  badge: string
}

const ENGINE_BADGES: Record<string, string> = {
  cinematic_veo: 'VEO 3',
  cinematic_kling: 'KLING',
  cinematic_hollywood: 'HOLLYWOOD',
  cinematic_ai: 'SEEDANCE',
  basic_ai: 'AI',
  fast: 'FAST',
}

// Ordem de exibição: os motores-troféu primeiro (é o que o Higgsfield faz —
// Veo/Kling na frente), Fast fecha provando o dia a dia.
const ENGINE_ORDER = ['cinematic_veo', 'cinematic_kling', 'cinematic_hollywood', 'cinematic_ai', 'fast']
const PER_ENGINE: Record<string, number> = {
  cinematic_veo: 2,
  cinematic_kling: 2,
  cinematic_hollywood: 1,
  cinematic_ai: 2,
  fast: 1,
}

// CURADORIA 15/08 (fundador: "os melhores vídeos, fiéis a cada motor") — eu
// assisti frame a frame aos candidatos de cada motor premium e cravei estes.
// Se um id sumir do banco, o fallback automático abaixo cobre a vaga.
//   VEO 3: a tenda de Dyatlov rasgada na neve + a floresta enevoada ao luar
//   KLING: as ruínas de Roma com moedas de ouro + a montanha dourada de 1922
//   HOLLYWOOD: o historiador na vila medieval à noite (fotorrealismo de época)
const CURATED: Record<string, string[]> = {
  cinematic_veo: ['e6cdf301-9668-4700-8f6a-c1de6b8c4dbe', 'dc0fe3a6-f34d-40cb-91f4-da15841a2970'],
  cinematic_kling: ['c4e4fbab-0978-4daa-9fcf-119096370210', '26d25419-6719-47ab-b24b-df214e007fbd'],
  cinematic_hollywood: ['956187b7-08d2-4c54-ac99-fa8508a9ed5c'],
}

export async function getEngineWall(): Promise<WallVideo[]> {
  try {
    const db = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const { data } = await db
      .from('videos')
      .select('id, video_url, topic, quality_mode, created_at')
      .eq('status', 'completed')
      .in('quality_mode', ENGINE_ORDER)
      .ilike('video_url', '%supabase%')
      .order('created_at', { ascending: false })
      // 1000, nao 400: Kling (6) e Hollywood (9) sao os renders mais ANTIGOS
      // do acervo — um limite curto em ordem desc cortava exatamente os
      // trofeus que a fileira existe para mostrar.
      .limit(1000)

    const byId = new Map<string, (typeof data extends (infer R)[] | null ? R : never)>()
    for (const row of data ?? []) byId.set(row.id as string, row)

    const out: WallVideo[] = []
    const used: Record<string, number> = {}
    const seenTitles = new Set<string>()

    const pushRow = (row: NonNullable<typeof data>[number], engine: string): boolean => {
      const title = cleanTitleLine((row.topic ?? '').toString())
      if (!title || !row.video_url) return false
      // Dedupe de título (dois "They call him..." lado a lado é vitrine preguiçosa).
      const key = title.slice(0, 40).toLowerCase()
      if (seenTitles.has(key)) return false
      seenTitles.add(key)
      out.push({
        id: row.id as string,
        title: title.length > 70 ? `${title.slice(0, 67)}…` : title,
        videoUrl: row.video_url as string,
        engine,
        badge: ENGINE_BADGES[engine] ?? 'AI',
      })
      used[engine] = (used[engine] ?? 0) + 1
      return true
    }

    for (const engine of ENGINE_ORDER) {
      // 1º: os curados, na ordem da curadoria.
      for (const id of CURATED[engine] ?? []) {
        if ((used[engine] ?? 0) >= (PER_ENGINE[engine] ?? 1)) break
        const row = byId.get(id)
        if (row) pushRow(row, engine)
      }
      // 2º: completa a vaga com o automático (recentes primeiro).
      for (const row of data ?? []) {
        if (row.quality_mode !== engine) continue
        if ((used[engine] ?? 0) >= (PER_ENGINE[engine] ?? 1)) break
        if (out.some((v) => v.id === row.id)) continue
        pushRow(row, engine)
      }
    }
    return out
  } catch {
    return []
  }
}
