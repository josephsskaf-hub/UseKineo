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

    const out: WallVideo[] = []
    const used: Record<string, number> = {}
    for (const engine of ENGINE_ORDER) {
      for (const row of data ?? []) {
        if (row.quality_mode !== engine) continue
        if ((used[engine] ?? 0) >= (PER_ENGINE[engine] ?? 1)) break
        const title = cleanTitleLine((row.topic ?? '').toString())
        if (!title || !row.video_url) continue
        out.push({
          id: row.id as string,
          title: title.length > 70 ? `${title.slice(0, 67)}…` : title,
          videoUrl: row.video_url as string,
          engine,
          badge: ENGINE_BADGES[engine] ?? 'AI',
        })
        used[engine] = (used[engine] ?? 0) + 1
      }
    }
    return out
  } catch {
    return []
  }
}
