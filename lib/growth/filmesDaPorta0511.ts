// KINEO-HOME-TOPO-0511 [fundador 05/11: "colocar vários vídeos nossos, bons"] — os 12 filmes da porta do Studio: 4 x 3 no computador e 2 x 6 no celular, nunca um cartão sobrando.
//
// Só filme da casa da curadoria dele (lib/publicExamples.ts), mais o da Artemis de 05/11. Pôster próprio em public/posters/studio-door-*.webp: recorte 9:14 da parte do quadro sem a legenda queimada e sem a marca
// do topo, para o cartão não mostrar frase pela metade. O filme da Artemis é do quadro dos 13 s; o letreiro quebrado dele está entre 50 s e 56 s.
// Guardião: scripts/test-home-topo-0511.mjs.
import { ENGINE_PAGE_LEAD, FOUNDER_SHOWCASE } from '@/lib/publicExamples'
import type { FilmeDaCaixa } from '@/lib/growth/studioSimples'

const posterDaPorta = (id: string) => `/posters/studio-door-${id}.webp`

/** Motor dos filmes da casa → chave do Studio, só para o evento do clique. */
const CHAVE_DO_MOTOR: Readonly<Record<string, string>> = {
  cinematic_ai: 'seedance',
  cinematic_hollywood: 'hollywood',
  cinematic_kling: 'kling',
  cinematic_veo: 'veo',
  cinematic_h3: 'h3',
  cinematic_omni: 'omni',
}

export const ARTEMIS_0511: FilmeDaCaixa = {
  id: '99ad7d12-270c-488d-a6d3-ce7d79095968',
  title: "NASA's rocket tore a hole in the sky",
  ideia: "NASA's rocket tore a hole in the sky.", // a primeira frase do roteiro
  engine: 'seedance',
  poster: posterDaPorta('99ad7d12-270c-488d-a6d3-ce7d79095968'),
}

export const IDS_DA_PORTA_0511 = [
  '90bd8367-60c6-4811-8fdd-3a5b0200eec6', // o castelo dentro da universidade
  '4b12925e-16e6-4b56-af5a-7047f9ae7a28', // Maracaibo
  'c53789d3-a1af-46a7-a2c6-7114204316de', // o litoral azul elétrico
  'f3de57b0-3486-4400-ba72-c9390774d426', // Dyatlov
  '83db8b63-b654-491e-a0aa-86ce1bc1f3d7', // Lituya Bay
  '692a6e98-6ed5-4c8d-8fa5-89ab21fbbcff', // o lago que petrifica
  'fbc5d391-316f-4757-aa54-0565f698cb9f', // o jantar ainda quente
  '07208070-f6cc-40e1-8c82-4fb0fe53b583', // a porta de 800 anos
  'ad6cb185-a0a2-46cf-a148-ea7503dfe6d3', // o Golfo
  '16742e11-a2fc-4e0a-a49a-2862e0ee36b0', // o homem que pulou
  'a09706da-a79f-4029-b213-69f43d6a2775', // a Ilha de Páscoa
] as const

export function filmesDaPorta0511(): FilmeDaCaixa[] {
  const curadoria = [...ENGINE_PAGE_LEAD, ...FOUNDER_SHOWCASE]
  return [
    ARTEMIS_0511,
    ...IDS_DA_PORTA_0511.flatMap((id) => {
      const f = curadoria.find((x) => x.id === id)
      return f ? [{ id: f.id, title: f.title, engine: CHAVE_DO_MOTOR[f.engine] ?? f.engine, poster: posterDaPorta(f.id) }] : []
    }),
  ]
}
