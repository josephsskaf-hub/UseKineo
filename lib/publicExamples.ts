export interface PublicExample {
  slug: string
  title: string
  shortTitle: string
  description: string
  prompt: string
  outputDurationSeconds: number
  previewDurationSeconds: number
  videoPath: string
  posterPath: string
}

export interface PublicEngineExample {
  id: string
  title: string
  engine: 'fast' | 'cinematic_ai' | 'cinematic_kling' | 'cinematic_veo' | 'cinematic_hollywood' | 'cinematic_h3' | 'cinematic_omni' | 'presenter'
  videoPath: string
  posterPath?: string
  ownershipEvidence: 'founder_confirmed_owned'
  ownershipVerifiedAt: '2026-08-27'
}

// Public proof assets selected for the Kineo homepage. Each MP4 is an honest
// five-second preview cut from the longer export described by
// outputDurationSeconds. These are founder-owned samples, never customer
// uploads. Keep this allow-list explicit so a private render cannot
// accidentally become indexable.
// KINEO-HIGGSFIELD-20D dia 15 (13/08) — todo poster tem uma versao .webp
// gerada ao lado do .jpg (20% menor). As SUPERFICIES VISUAIS (galeria da home,
// grade do /examples) usam .webp; OG images, JSON-LD e video-sitemap CONTINUAM
// no .jpg de proposito — plataformas de preview social nao aceitam webp de
// forma confiavel. Nao trocar posterPath nesses lugares.
export function posterWebpPath(posterPath: string): string {
  return posterPath.replace(/\.jpg$/, '.webp')
}

export const PUBLIC_EXAMPLES: readonly PublicExample[] = [
  {
    slug: 'turkmenistan-door-to-hell',
    title: 'Turkmenistan Door to Hell — AI Short Preview',
    shortTitle: 'Turkmenistan: Door to Hell',
    description:
      'Watch a five-second preview cut from a 60-second faceless Short created with Kineo about Turkmenistan’s Darvaza gas crater.',
    prompt:
      'Create a fast-paced faceless Short about Turkmenistan’s Darvaza gas crater, with a strong curiosity hook, cinematic footage and clear captions.',
    outputDurationSeconds: 60,
    previewDurationSeconds: 5,
    videoPath: '/videos/example-turkmenistan.mp4',
    posterPath: '/videos/example-turkmenistan.jpg',
  },
  {
    slug: 'north-sentinel-island',
    title: 'North Sentinel Island — AI Short Preview',
    shortTitle: 'North Sentinel Island',
    description:
      'Watch a five-second preview cut from a 60-second faceless Short created with Kineo about North Sentinel Island.',
    prompt:
      'Create a fast-paced faceless Short about North Sentinel Island, with a respectful mystery hook, specific footage and readable captions.',
    outputDurationSeconds: 60,
    previewDurationSeconds: 5,
    videoPath: '/videos/example-sentinel.mp4',
    posterPath: '/videos/example-sentinel.jpg',
  },
  {
    slug: 'japan-autonomous-ai',
    title: 'Japan and Autonomous AI — AI Short Preview',
    shortTitle: 'Japan and autonomous AI',
    description:
      'Watch a five-second preview cut from a 53-second faceless Short created with Kineo about autonomous AI in Japan.',
    prompt:
      'Create a fast-paced faceless Short about autonomous AI in Japan, with a surprising hook, technology B-roll and clear captions.',
    outputDurationSeconds: 53,
    previewDurationSeconds: 5,
    videoPath: '/videos/example-japan-ai.mp4',
    posterPath: '/videos/example-japan-ai.jpg',
  },
  {
    slug: 'us-ai-shutdown-story',
    title: 'U.S. AI Shutdown Story — AI Short Preview',
    shortTitle: 'A U.S. AI shutdown story',
    description:
      'Watch a five-second preview cut from a 45-second faceless Short created with Kineo about a U.S. AI shutdown story.',
    prompt:
      'Create a fast-paced faceless Short about a U.S. AI shutdown story, with a direct hook, relevant footage and readable captions.',
    outputDurationSeconds: 45,
    previewDurationSeconds: 5,
    videoPath: '/videos/example-shutdown.mp4',
    posterPath: '/videos/example-shutdown.jpg',
  },
  // KINEO-HERO-SHOWCASE-2026-08-05 — os dois últimos entram pelo mesmo caminho
  // dos quatro primeiros (commit 3a9f46a): export real do produto, baixado do
  // Supabase Storage, recortado em 5s e comprimido no MESMO perfil (360x640,
  // 30fps, ~235 KB, sem faixa de áudio). Nenhum stock, nenhuma miniatura
  // inventada — o poster é um frame de verdade, com as legendas queimadas que
  // o render entregou. Duração de saída conferida no ffprobe do arquivo cheio.
  {
    slug: 'runit-island-nuclear-dome',
    title: 'Runit Island Nuclear Dome — AI Short Preview',
    shortTitle: 'The island sealed under concrete',
    description:
      'Watch a five-second preview cut from a 45-second faceless Short created with Kineo about the concrete dome on Runit Island.',
    prompt:
      'Create a fast-paced faceless Short about the nuclear waste dome on Runit Island, with a curiosity hook, aerial footage and clear captions.',
    outputDurationSeconds: 45,
    previewDurationSeconds: 5,
    videoPath: '/videos/example-runit.mp4',
    posterPath: '/videos/example-runit.jpg',
  },
  {
    slug: 'this-man-dream-face',
    title: 'The Face Strangers Keep Dreaming — AI Short Preview',
    shortTitle: 'The face strangers keep dreaming',
    description:
      'Watch a five-second preview cut from a 60-second faceless Short created with Kineo about the face thousands of strangers claim to dream about.',
    prompt:
      'Create a fast-paced faceless Short about the face thousands of strangers claim to see in their dreams, with a mystery hook, moody footage and readable captions.',
    outputDurationSeconds: 60,
    previewDurationSeconds: 5,
    videoPath: '/videos/example-this-man.mp4',
    posterPath: '/videos/example-this-man.jpg',
  },
] as const

// DECISÃO APROVADA — em 27/08/2026 o fundador confirmou explicitamente que
// todos os renders desta curadoria pertencem a ele e autorizou sua exibição.
// A lista continua estática: o catálogo dinâmico de clientes permanece fechado.
const FOUNDER_OWNERSHIP = {
  ownershipEvidence: 'founder_confirmed_owned',
  ownershipVerifiedAt: '2026-08-27',
} as const

export const PUBLIC_ENGINE_EXAMPLES = [
  {
    ...FOUNDER_OWNERSHIP,
    id: 'c87c3a25-c3b7-4a97-8429-eb0fc98b67bc',
    title: 'The world’s untouched natural wonders',
    engine: 'fast',
    videoPath: 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/0e175818-2758-4c73-a1dc-52404b99874c/3dd8a945-c01d-4522-921b-f64705029815.mp4',
  },
  { ...FOUNDER_OWNERSHIP, id: '75728dfb-3b29-47fa-aea8-b806d549a2b9', title: 'The wave at North Sentinel Island', engine: 'cinematic_ai', videoPath: '/previews/75728dfb-3b29-47fa-aea8-b806d549a2b9.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'd8157290-65db-4d1d-b914-268d54f92087', title: 'AI Japan after dark', engine: 'cinematic_ai', videoPath: '/previews/d8157290-65db-4d1d-b914-268d54f92087.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'a88b7564-3592-4b12-9560-1646ea998e78', title: 'The forbidden island from above', engine: 'cinematic_ai', videoPath: '/previews/a88b7564-3592-4b12-9560-1646ea998e78.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '86653d2d-8d31-4937-8d98-e56c50706fd2', title: 'The Darvaza fire crater', engine: 'cinematic_ai', videoPath: '/previews/86653d2d-8d31-4937-8d98-e56c50706fd2.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'c4e4fbab-0978-4daa-9fcf-119096370210', title: 'Ancient Rome in gold', engine: 'cinematic_kling', videoPath: '/previews/c4e4fbab-0978-4daa-9fcf-119096370210.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '26d25419-6719-47ab-b24b-df214e007fbd', title: 'The golden mountain', engine: 'cinematic_kling', videoPath: '/previews/26d25419-6719-47ab-b24b-df214e007fbd.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'c6bdbcfb-ffc2-48e1-be15-e26fb048fe9a', title: 'The impossible stadium kick', engine: 'cinematic_kling', videoPath: '/previews/c6bdbcfb-ffc2-48e1-be15-e26fb048fe9a.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '8b38c8d1-764c-4bff-94ee-f1b2721c7551', title: 'A cinematic journey', engine: 'cinematic_kling', videoPath: '/previews/8b38c8d1-764c-4bff-94ee-f1b2721c7551.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '9bbd5d98-33e5-423f-b9cb-82f7af6c67ba', title: 'The Runit Island nuclear dome', engine: 'cinematic_veo', videoPath: '/previews/9bbd5d98-33e5-423f-b9cb-82f7af6c67ba.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '98a5ac54-3c28-4a8f-8ba2-4071bc0388c4', title: 'Red server racks', engine: 'cinematic_veo', videoPath: '/previews/98a5ac54-3c28-4a8f-8ba2-4071bc0388c4.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'dc0fe3a6-f34d-40cb-91f4-da15841a2970', title: 'A lantern in the fog', engine: 'cinematic_veo', videoPath: '/previews/dc0fe3a6-f34d-40cb-91f4-da15841a2970.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'b9572715-484e-4471-bc03-f4321fa8ec01', title: 'A rainy noir street', engine: 'cinematic_veo', videoPath: '/previews/b9572715-484e-4471-bc03-f4321fa8ec01.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '4b12925e-16e6-4b56-af5a-7047f9ae7a28', title: 'Storm over Lake Maracaibo', engine: 'cinematic_hollywood', videoPath: '/previews/4b12925e-16e6-4b56-af5a-7047f9ae7a28.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '216cbed2-b95f-47e7-98bc-e4c3fc3010a9', title: 'The face that looks real', engine: 'cinematic_hollywood', videoPath: '/previews/216cbed2-b95f-47e7-98bc-e4c3fc3010a9.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '99818ab0-0960-4089-a784-12b241736868', title: 'Tunguska from above', engine: 'cinematic_hollywood', videoPath: '/previews/99818ab0-0960-4089-a784-12b241736868.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '501d1ef7-5df5-4462-9341-c58ea01f0042', title: 'Krakatoa’s last witness', engine: 'cinematic_hollywood', videoPath: '/previews/501d1ef7-5df5-4462-9341-c58ea01f0042.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'e487a011-8781-482f-913e-445ef5ad22bf', title: 'The Lituya Bay fisherman', engine: 'cinematic_hollywood', videoPath: '/previews/e487a011-8781-482f-913e-445ef5ad22bf.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '8aabb05a-2492-48de-a96a-0a7875c0c8d3', title: 'Shazam over the city', engine: 'cinematic_h3', videoPath: '/previews/8aabb05a-2492-48de-a96a-0a7875c0c8d3.mp4', posterPath: '/posters/8aabb05a-2492-48de-a96a-0a7875c0c8d3.jpg' },
  { ...FOUNDER_OWNERSHIP, id: 'b521e565-8549-437f-a850-f2fea8bdba68', title: 'The 200,000-ton ship', engine: 'cinematic_h3', videoPath: '/previews/b521e565-8549-437f-a850-f2fea8bdba68.mp4', posterPath: '/posters/b521e565-8549-437f-a850-f2fea8bdba68.jpg' },
  { ...FOUNDER_OWNERSHIP, id: '04189a48-45f7-45f4-b98c-27832702e837', title: 'The ship beneath the storm', engine: 'cinematic_h3', videoPath: '/previews/04189a48-45f7-45f4-b98c-27832702e837.mp4', posterPath: '/posters/04189a48-45f7-45f4-b98c-27832702e837.jpg' },
  { ...FOUNDER_OWNERSHIP, id: '36a04f7b-65f7-42d9-a2ab-198b5a7f115e', title: 'The robot rising from the harbor', engine: 'cinematic_omni', videoPath: '/previews/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.mp4', posterPath: '/posters/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.jpg' },
  { ...FOUNDER_OWNERSHIP, id: '33249fbf-57b6-47cf-8486-88bfb2a02db1', title: 'Life in the Mariana Trench', engine: 'cinematic_omni', videoPath: '/previews/33249fbf-57b6-47cf-8486-88bfb2a02db1.mp4', posterPath: '/posters/33249fbf-57b6-47cf-8486-88bfb2a02db1.jpg' },
  { ...FOUNDER_OWNERSHIP, id: '41924eb2-d81d-4f2c-a5bb-5477c042af04', title: 'The mystery of Flight 19', engine: 'cinematic_omni', videoPath: '/previews/41924eb2-d81d-4f2c-a5bb-5477c042af04.mp4', posterPath: '/posters/41924eb2-d81d-4f2c-a5bb-5477c042af04.jpg' },
  { ...FOUNDER_OWNERSHIP, id: '6f6786a8-0a3d-49f0-b5cd-1e91c06249d2', title: 'The day Earth stopped spinning', engine: 'cinematic_omni', videoPath: '/previews/6f6786a8-0a3d-49f0-b5cd-1e91c06249d2.mp4', posterPath: '/posters/6f6786a8-0a3d-49f0-b5cd-1e91c06249d2.jpg' },
  { ...FOUNDER_OWNERSHIP, id: 'c21c2456-98dc-4061-bee5-2f02a5180295', title: 'Kineo studio presenter', engine: 'presenter', videoPath: '/previews/c21c2456-98dc-4061-bee5-2f02a5180295.mp4' },
] as const satisfies readonly PublicEngineExample[]

export function getPublicExample(slug: string): PublicExample | undefined {
  return PUBLIC_EXAMPLES.find((example) => example.slug === slug)
}
