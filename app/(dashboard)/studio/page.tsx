// KINEO-STUDIO-V4-2026-08-16 — a tela única de geração estilo Higgsfield (motor + duração + resolução + aspecto +
// presets de câmera, tudo visível sem rolar). Rota pública do Studio.
//
// KINEO-STUDIO-HEROI-2026-09-30 — fundador: "quando você escolhe algum motor, ter um vídeo herói, o melhor vídeo
// daquele motor… não deixar uma tela em branco". Os filmes saem daqui (servidor): os da CASA de cada motor
// (getHouseEngineExamples: o líder escolhido pelo fundador primeiro, posse confirmada, selo do motor real), até 4 por
// motor. O cliente só troca entre eles; nenhum vídeo de cliente aparece aqui.
import { getHouseEngineExamples } from '@/lib/engineWall'
import { ENGINE_PAGE_LEAD, FOUNDER_SHOWCASE } from '@/lib/publicExamples'
import StudioClient, { type StudioBestFilm, type StudioHeroVideo } from './StudioClient'
import SignupConversionTracker from '@/components/SignupConversionTracker' // KINEO-LINKS-STUDIO-NOVO-2026-10-02

export const metadata = { title: 'Studio — Kineo' }

/** Chave do seletor do Studio → motor dos filmes da casa (mesmo mapa que ENGINE_QUALITY do StudioClient). */
const HERO_ENGINE: Record<string, string> = {
  fast: 'fast',
  seedance: 'cinematic_ai',
  kling: 'cinematic_kling',
  veo: 'cinematic_veo',
  hollywood: 'cinematic_hollywood',
  h3: 'cinematic_h3',
  omni: 'cinematic_omni',
}

// KINEO-STUDIO-MELHORES-2026-09-30 — fundador: "na parte de baixo sempre tem que ser os melhores vídeos… uns oito, duas
// fileiras… os que eu já achei melhor". Escolha a partir do que ELE já aprovou (filmes da casa, posse confirmada):
//   castelo (Seedance, "100%" — ENGINE_PAGE_LEAD) · Maracaibo (Kling 3, slot 1 da curadoria dele) · Dyatlov (Kling 2.5) ·
//   navio que evaporou (Kling 3) · o homem que pulou (Veo 3.1) · o Golfo (H3) · o lago que petrifica (Seedance, Natron —
//   "desse jeito ficou perfeito") · o jantar ainda quente (Kling 2.5). Omni fica fora enquanto está em manutenção.
const BEST_FILM_IDS = [
  '90bd8367-60c6-4811-8fdd-3a5b0200eec6',
  '4b12925e-16e6-4b56-af5a-7047f9ae7a28',
  'f3de57b0-3486-4400-ba72-c9390774d426',
  '16742e11-a2fc-4e0a-a49a-2862e0ee36b0',
  '7efd12b8-925b-46d2-b68e-c6095cd3e92e',
  'ad6cb185-a0a2-46cf-a148-ea7503dfe6d3',
  '692a6e98-6ed5-4c8d-8fa5-89ab21fbbcff',
  'fbc5d391-316f-4757-aa54-0565f698cb9f',
] as const

/** Motor dos filmes da casa → chave do seletor do Studio (inverso de HERO_ENGINE). */
const STUDIO_KEY: Record<string, string> = Object.fromEntries(Object.entries(HERO_ENGINE).map(([k, v]) => [v, k]))

export default function StudioPage() {
  const engineHeroes: Record<string, StudioHeroVideo[]> = {}
  for (const [key, engine] of Object.entries(HERO_ENGINE)) {
    engineHeroes[key] = getHouseEngineExamples(engine, 4)
      .map((v) => ({ src: v.previewUrl ?? v.videoUrl, poster: v.posterUrl, title: v.title }))
      .filter((v) => typeof v.src === 'string' && v.src.length > 0)
  }
  const pool = [...ENGINE_PAGE_LEAD, ...FOUNDER_SHOWCASE]
  const bestFilms: StudioBestFilm[] = BEST_FILM_IDS.flatMap((id) => {
    const f = pool.find((x) => x.id === id)
    const engine = f ? STUDIO_KEY[f.engine] : undefined
    return f && engine ? [{ id: f.id, title: f.title, engine, src: f.previewPath, poster: f.posterPath }] : []
  })
  // KINEO-LINKS-STUDIO-NOVO-2026-10-02 — conta NOVA por Google/Apple pousa aqui com ?signup=1 (o /auth/callback acrescenta)
  // desde que o /go (36fc267) e as ferramentas de SEO passaram a mandar para o Studio novo. Quem disparava a conversão de
  // cadastro do Ads e o trackSignupSource (origem do perfil) era só a tela antiga e a home: sem isto, esses cadastros
  // nasciam sem conversão e sem origem. keepUrl: a query do Studio não é tocada (ver o componente).
  return (
    <>
      <SignupConversionTracker keepUrl />
      <StudioClient engineHeroes={engineHeroes} bestFilms={bestFilms} />
    </>
  )
}
