// KINEO-STUDIO-V4-2026-08-16 — a tela única de geração estilo Higgsfield (motor + duração + resolução + aspecto +
// presets de câmera, tudo visível sem rolar). Rota pública do Studio.
//
// KINEO-STUDIO-HEROI-2026-09-30 — fundador: "quando você escolhe algum motor, ter um vídeo herói, o melhor vídeo
// daquele motor… não deixar uma tela em branco". Os filmes saem daqui (servidor): os da CASA de cada motor
// (getHouseEngineExamples: o líder escolhido pelo fundador primeiro, posse confirmada, selo do motor real), até 4 por
// motor. O cliente só troca entre eles; nenhum vídeo de cliente aparece aqui.
import { getHouseEngineExamples } from '@/lib/engineWall'
import StudioClient, { type StudioHeroVideo } from './StudioClient'

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

export default function StudioPage() {
  const engineHeroes: Record<string, StudioHeroVideo[]> = {}
  for (const [key, engine] of Object.entries(HERO_ENGINE)) {
    engineHeroes[key] = getHouseEngineExamples(engine, 4)
      .map((v) => ({ src: v.previewUrl ?? v.videoUrl, poster: v.posterUrl, title: v.title }))
      .filter((v) => typeof v.src === 'string' && v.src.length > 0)
  }
  return <StudioClient engineHeroes={engineHeroes} />
}
