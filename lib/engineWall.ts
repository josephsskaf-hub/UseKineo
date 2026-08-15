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

// KINEO-ENGINE-NAMES-2026-08-15 — nomes REAIS dos modelos (medidos em
// app/api/generate-video-cinematic/route.ts): Hollywood roda Kling 3 Pro,
// Kling e o 2.5 Turbo, Veo e o 3.1, Seedance e o 1.5 Pro. O Fast e o motor
// PROPRIO do Kineo — batizado Kineo 1 (decisao do fundador 15/08).
const ENGINE_BADGES: Record<string, string> = {
  cinematic_veo: 'VEO 3.1',
  cinematic_kling: 'KLING 2.5',
  cinematic_hollywood: 'KLING 3',
  cinematic_ai: 'SEEDANCE 1.5',
  basic_ai: 'AI',
  fast: 'KINEO 1',
  presenter: 'AVATAR',
}

// Ordem de exibição: os motores-troféu primeiro (é o que o Higgsfield faz —
// Veo/Kling na frente), Fast fecha provando o dia a dia.
// Ordem por QUALIDADE crescente (fundador 15/08): comeca no Kineo 1 (motor
// proprio) e termina no Kling 3 (o mais premium).
const ENGINE_ORDER = ['fast', 'cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_hollywood', 'presenter']
const PER_ENGINE: Record<string, number> = {
  cinematic_veo: 2,
  cinematic_kling: 2,
  cinematic_hollywood: 1,
  cinematic_ai: 2,
  fast: 1,
  presenter: 1,
}

// CURADORIA 15/08 (fundador: "os melhores vídeos, fiéis a cada motor") — eu
// assisti frame a frame aos candidatos de cada motor premium e cravei estes.
// Se um id sumir do banco, o fallback automático abaixo cobre a vaga.
//   VEO 3: a tenda de Dyatlov rasgada na neve + a floresta enevoada ao luar
//   KLING: as ruínas de Roma com moedas de ouro + a montanha dourada de 1922
//   HOLLYWOOD: o historiador na vila medieval à noite (fotorrealismo de época)
const CURATED: Record<string, string[]> = {
  //   VEO 3: tenda de Dyatlov + floresta enevoada + cratera nuclear no Pacifico
  cinematic_veo: ['e6cdf301-9668-4700-8f6a-c1de6b8c4dbe', 'dc0fe3a6-f34d-40cb-91f4-da15841a2970', '9bbd5d98-33e5-423f-b9cb-82f7af6c67ba', '98a5ac54-3c28-4a8f-8ba2-4071bc0388c4'],
  //   KLING: ruinas de Roma com moedas + montanha dourada de 1922 + chute de 50m no estadio
  cinematic_kling: ['c4e4fbab-0978-4daa-9fcf-119096370210', '26d25419-6719-47ab-b24b-df214e007fbd', 'c6bdbcfb-ffc2-48e1-be15-e26fb048fe9a', '8b38c8d1-764c-4bff-94ee-f1b2721c7551'],
  //   HOLLYWOOD: historiador medieval + reporter de trench coat em Manhattan + o campo em chamas de 50 anos
  cinematic_hollywood: ['956187b7-08d2-4c54-ac99-fa8508a9ed5c', 'e5388a6d-22a6-491d-9bc9-c1b4a00371b6', 'f32ea301-a239-4d2c-a516-388796aa63da', '8a61d9fe-0878-4d8c-8746-7d769575ce4a'],
  //   SEEDANCE: relogio de luxo em macro + mapa antigo em pergaminho + maos a luz de vela
  cinematic_ai: ['2460ea18-586c-4364-8ad4-254c20662854', 'e06bb4ed-d57b-440a-b978-6660418966fd', '789160b5-a78b-4912-a058-680e083a58e8', '4ca48262-ebd3-4f1e-86f5-86eb70998c0d'],
  //   FAST: montanhas com nuvens + Dubai dourada + praca aerea
  fast: ['c87c3a25-c3b7-4a97-8429-eb0fc98b67bc', 'cc1dcb36-b627-412b-9cf1-461f9bcdf592', '107dd757-6454-4af9-9b3e-b07fb8656f2a', 'ea7c8d34-8a6e-4a2e-872e-e12a400e267d'],
  //   PRESENTER: o apresentador generico "Made with Kineo" (unico seguro — ver EXCLUDED)
  //   AVATAR: o close 'Made with Kineo' (render do modo avatar) + o plano aberto
  presenter: ['c21c2456-98dc-4061-bee5-2f02a5180295', 'b6f1524b-e5f6-43b5-89aa-8cca8715e088'],
}

// NUNCA em pagina publica: avatares de pessoa real reconhecivel (Messi, com
// uniforme e patrocinadores visiveis). Risco juridico de imagem — a landing
// nao pode carregar isso, mesmo sendo render legitimo de usuario.
const EXCLUDED = new Set<string>([
  'fe2c5b2c-e468-497b-b0b3-8d9d9a961fb8',
  '2f846d74-77d8-42b1-a152-50823a7cea41',
])

// /examples pede uma amostra maior por motor que a home.
const SHOWCASE_CAPS: Record<string, number> = {
  cinematic_veo: 3,
  cinematic_kling: 3,
  cinematic_hollywood: 3,
  cinematic_ai: 4,
  fast: 0, // os Fast do /examples sao os 10 locais curados (PUBLIC_EXAMPLES)
  presenter: 2,
}

// Hero da home: 6 cards-carrossel, ate 3 videos POR MOTOR (pedido do
// fundador 15/08: "tres videos em cada, ficam passando").
const HERO_CAPS: Record<string, number> = {
  cinematic_veo: 4,
  cinematic_kling: 4,
  cinematic_hollywood: 4,
  cinematic_ai: 4,
  fast: 4,
  presenter: 1,
}

export function getEngineHero(): Promise<WallVideo[]> {
  return buildWall(HERO_CAPS)
}

export function getEngineShowcase(): Promise<WallVideo[]> {
  return buildWall(SHOWCASE_CAPS)
}

export function getEngineWall(): Promise<WallVideo[]> {
  return buildWall(PER_ENGINE)
}

async function buildWall(caps: Record<string, number>): Promise<WallVideo[]> {
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
      .in('quality_mode', [...ENGINE_ORDER, 'avatar'])
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
      if (EXCLUDED.has(row.id as string)) return false
      // Renders sem topico (ex.: presenter antigo) ganham titulo generico em
      // vez de serem descartados — era isso que sumia com o card Presenter.
      const title = cleanTitleLine((row.topic ?? '').toString()) || `${ENGINE_BADGES[engine] ?? 'AI'} — real Kineo render`
      if (!row.video_url) return false
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
        if ((used[engine] ?? 0) >= (caps[engine] ?? 1)) break
        const row = byId.get(id)
        if (row) pushRow(row, engine)
      }
      // 2º: completa a vaga com o automático (recentes primeiro).
      for (const row of data ?? []) {
        // 'avatar' e o mesmo produto do presenter (modo novo) — mesma vitrine.
        const mode = row.quality_mode === 'avatar' ? 'presenter' : row.quality_mode
        if (mode !== engine) continue
        if ((used[engine] ?? 0) >= (caps[engine] ?? 1)) break
        if (out.some((v) => v.id === row.id)) continue
        pushRow(row, engine)
      }
    }
    return out
  } catch {
    return []
  }
}
