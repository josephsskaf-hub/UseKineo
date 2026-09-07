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
  /** Lightweight media used by /arena without changing the founder's home curation. */
  arenaPreviewPath?: string
  arenaPosterPath?: string
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
    // /arena shows seven videos on one page. Use the already-approved 5s Kineo
    // 1 sample there instead of auto-loading this 48 MB full render. The home
    // keeps the founder-selected mountains video above unchanged.
    arenaPreviewPath: '/videos/example-turkmenistan.mp4',
    arenaPosterPath: '/videos/example-turkmenistan.jpg',
  },
  // KINEO-VITRINE-FUNDADOR-2026-09-07 — cinematic_ai: renders recentes do fundador (motores caros), preview 8s cortado do master enhanced.
  { ...FOUNDER_OWNERSHIP, id: 'fe055601-0668-4d33-be49-82c1cb033779', title: 'Something is leaving our solar system', engine: 'cinematic_ai', videoPath: '/previews/fe055601-0668-4d33-be49-82c1cb033779.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '692a6e98-6ed5-4c8d-8fa5-89ab21fbbcff', title: 'The lake that turns animals to stone', engine: 'cinematic_ai', videoPath: '/previews/692a6e98-6ed5-4c8d-8fa5-89ab21fbbcff.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '75728dfb-3b29-47fa-aea8-b806d549a2b9', title: 'The wave at North Sentinel Island', engine: 'cinematic_ai', videoPath: '/previews/75728dfb-3b29-47fa-aea8-b806d549a2b9.mp4', arenaPosterPath: '/posters/hero-seedance.webp' },
  { ...FOUNDER_OWNERSHIP, id: 'd8157290-65db-4d1d-b914-268d54f92087', title: 'AI Japan after dark', engine: 'cinematic_ai', videoPath: '/previews/d8157290-65db-4d1d-b914-268d54f92087.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'a88b7564-3592-4b12-9560-1646ea998e78', title: 'The forbidden island from above', engine: 'cinematic_ai', videoPath: '/previews/a88b7564-3592-4b12-9560-1646ea998e78.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '86653d2d-8d31-4937-8d98-e56c50706fd2', title: 'The Darvaza fire crater', engine: 'cinematic_ai', videoPath: '/previews/86653d2d-8d31-4937-8d98-e56c50706fd2.mp4' },
  // KINEO-VITRINE-FUNDADOR-2026-09-07 — cinematic_kling: renders recentes do fundador (motores caros), preview 8s cortado do master enhanced.
  { ...FOUNDER_OWNERSHIP, id: 'f3de57b0-3486-4400-ba72-c9390774d426', title: 'The Dyatlov Pass incident', engine: 'cinematic_kling', videoPath: '/previews/f3de57b0-3486-4400-ba72-c9390774d426.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'fbc5d391-316f-4757-aa54-0565f698cb9f', title: 'Dinner still warm, everyone gone', engine: 'cinematic_kling', videoPath: '/previews/fbc5d391-316f-4757-aa54-0565f698cb9f.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'c4e4fbab-0978-4daa-9fcf-119096370210', title: 'Ancient Rome in gold', engine: 'cinematic_kling', videoPath: '/previews/c4e4fbab-0978-4daa-9fcf-119096370210.mp4', arenaPosterPath: '/posters/hero-kling25.webp' },
  { ...FOUNDER_OWNERSHIP, id: '26d25419-6719-47ab-b24b-df214e007fbd', title: 'The golden mountain', engine: 'cinematic_kling', videoPath: '/previews/26d25419-6719-47ab-b24b-df214e007fbd.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'c6bdbcfb-ffc2-48e1-be15-e26fb048fe9a', title: 'The impossible stadium kick', engine: 'cinematic_kling', videoPath: '/previews/c6bdbcfb-ffc2-48e1-be15-e26fb048fe9a.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '8b38c8d1-764c-4bff-94ee-f1b2721c7551', title: 'A cinematic journey', engine: 'cinematic_kling', videoPath: '/previews/8b38c8d1-764c-4bff-94ee-f1b2721c7551.mp4' },
  // KINEO-VITRINE-FUNDADOR-2026-09-07 — cinematic_veo: renders recentes do fundador (motores caros), preview 8s cortado do master enhanced.
  { ...FOUNDER_OWNERSHIP, id: '16742e11-a2fc-4e0a-a49a-2862e0ee36b0', title: 'The man who jumped and vanished', engine: 'cinematic_veo', videoPath: '/previews/16742e11-a2fc-4e0a-a49a-2862e0ee36b0.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '9bbd5d98-33e5-423f-b9cb-82f7af6c67ba', title: 'The Runit Island nuclear dome', engine: 'cinematic_veo', videoPath: '/previews/9bbd5d98-33e5-423f-b9cb-82f7af6c67ba.mp4', arenaPosterPath: '/posters/hero-veo31.webp' },
  { ...FOUNDER_OWNERSHIP, id: '98a5ac54-3c28-4a8f-8ba2-4071bc0388c4', title: 'Red server racks', engine: 'cinematic_veo', videoPath: '/previews/98a5ac54-3c28-4a8f-8ba2-4071bc0388c4.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'dc0fe3a6-f34d-40cb-91f4-da15841a2970', title: 'A lantern in the fog', engine: 'cinematic_veo', videoPath: '/previews/dc0fe3a6-f34d-40cb-91f4-da15841a2970.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'b9572715-484e-4471-bc03-f4321fa8ec01', title: 'A rainy noir street', engine: 'cinematic_veo', videoPath: '/previews/b9572715-484e-4471-bc03-f4321fa8ec01.mp4' },
  // KINEO-VITRINE-FUNDADOR-2026-09-07 — cinematic_hollywood: renders recentes do fundador (motores caros), preview 8s cortado do master enhanced.
  { ...FOUNDER_OWNERSHIP, id: '7efd12b8-925b-46d2-b68e-c6095cd3e92e', title: 'The Navy ship that evaporated', engine: 'cinematic_hollywood', videoPath: '/previews/7efd12b8-925b-46d2-b68e-c6095cd3e92e.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '94d551a3-fe7a-4903-8c2b-f252bed39c4c', title: 'The man who won the lottery 14 times', engine: 'cinematic_hollywood', videoPath: '/previews/94d551a3-fe7a-4903-8c2b-f252bed39c4c.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '4b12925e-16e6-4b56-af5a-7047f9ae7a28', title: 'Storm over Lake Maracaibo', engine: 'cinematic_hollywood', videoPath: '/previews/4b12925e-16e6-4b56-af5a-7047f9ae7a28.mp4', arenaPosterPath: '/posters/hero-kling3.webp' },
  { ...FOUNDER_OWNERSHIP, id: '216cbed2-b95f-47e7-98bc-e4c3fc3010a9', title: 'The face that looks real', engine: 'cinematic_hollywood', videoPath: '/previews/216cbed2-b95f-47e7-98bc-e4c3fc3010a9.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '99818ab0-0960-4089-a784-12b241736868', title: 'Tunguska from above', engine: 'cinematic_hollywood', videoPath: '/previews/99818ab0-0960-4089-a784-12b241736868.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '501d1ef7-5df5-4462-9341-c58ea01f0042', title: 'Krakatoa’s last witness', engine: 'cinematic_hollywood', videoPath: '/previews/501d1ef7-5df5-4462-9341-c58ea01f0042.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'e487a011-8781-482f-913e-445ef5ad22bf', title: 'The Lituya Bay fisherman', engine: 'cinematic_hollywood', videoPath: '/previews/e487a011-8781-482f-913e-445ef5ad22bf.mp4' },
  // KINEO-VITRINE-FUNDADOR-2026-09-07 — cinematic_h3: renders recentes do fundador (motores caros), preview 8s cortado do master enhanced.
  { ...FOUNDER_OWNERSHIP, id: 'ad6cb185-a0a2-46cf-a148-ea7503dfe6d3', title: 'Something spreading across the Gulf', engine: 'cinematic_h3', videoPath: '/previews/ad6cb185-a0a2-46cf-a148-ea7503dfe6d3.mp4' },
  { ...FOUNDER_OWNERSHIP, id: 'b8c50f61-2843-41f3-a803-ac5a4bb509f5', title: 'Pompeii: the wrong day', engine: 'cinematic_h3', videoPath: '/previews/b8c50f61-2843-41f3-a803-ac5a4bb509f5.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '8aabb05a-2492-48de-a96a-0a7875c0c8d3', title: 'Shazam over the city', engine: 'cinematic_h3', videoPath: '/previews/8aabb05a-2492-48de-a96a-0a7875c0c8d3.mp4', posterPath: '/posters/8aabb05a-2492-48de-a96a-0a7875c0c8d3.jpg', arenaPosterPath: '/posters/8aabb05a-2492-48de-a96a-0a7875c0c8d3.jpg' },
  { ...FOUNDER_OWNERSHIP, id: 'b521e565-8549-437f-a850-f2fea8bdba68', title: 'The 200,000-ton ship', engine: 'cinematic_h3', videoPath: '/previews/b521e565-8549-437f-a850-f2fea8bdba68.mp4', posterPath: '/posters/b521e565-8549-437f-a850-f2fea8bdba68.jpg' },
  { ...FOUNDER_OWNERSHIP, id: '04189a48-45f7-45f4-b98c-27832702e837', title: 'The ship beneath the storm', engine: 'cinematic_h3', videoPath: '/previews/04189a48-45f7-45f4-b98c-27832702e837.mp4', posterPath: '/posters/04189a48-45f7-45f4-b98c-27832702e837.jpg' },
  // KINEO-VITRINE-FUNDADOR-2026-09-07 — cinematic_omni: renders recentes do fundador (motores caros), preview 8s cortado do master enhanced.
  { ...FOUNDER_OWNERSHIP, id: '7579e8d7-97ff-4be7-91c9-fe11f6698a00', title: 'The Halifax explosion, 1917', engine: 'cinematic_omni', videoPath: '/previews/7579e8d7-97ff-4be7-91c9-fe11f6698a00.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '1b8e12f9-83e5-411c-8fda-0b277d289934', title: 'Tunguska, 1908: the sky split open', engine: 'cinematic_omni', videoPath: '/previews/1b8e12f9-83e5-411c-8fda-0b277d289934.mp4' },
  { ...FOUNDER_OWNERSHIP, id: '36a04f7b-65f7-42d9-a2ab-198b5a7f115e', title: 'The robot rising from the harbor', engine: 'cinematic_omni', videoPath: '/previews/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.mp4', posterPath: '/posters/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.jpg', arenaPosterPath: '/posters/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.jpg' },
  { ...FOUNDER_OWNERSHIP, id: '33249fbf-57b6-47cf-8486-88bfb2a02db1', title: 'Life in the Mariana Trench', engine: 'cinematic_omni', videoPath: '/previews/33249fbf-57b6-47cf-8486-88bfb2a02db1.mp4', posterPath: '/posters/33249fbf-57b6-47cf-8486-88bfb2a02db1.jpg' },
  { ...FOUNDER_OWNERSHIP, id: '41924eb2-d81d-4f2c-a5bb-5477c042af04', title: 'The mystery of Flight 19', engine: 'cinematic_omni', videoPath: '/previews/41924eb2-d81d-4f2c-a5bb-5477c042af04.mp4', posterPath: '/posters/41924eb2-d81d-4f2c-a5bb-5477c042af04.jpg' },
  { ...FOUNDER_OWNERSHIP, id: '6f6786a8-0a3d-49f0-b5cd-1e91c06249d2', title: 'The day Earth stopped spinning', engine: 'cinematic_omni', videoPath: '/previews/6f6786a8-0a3d-49f0-b5cd-1e91c06249d2.mp4', posterPath: '/posters/6f6786a8-0a3d-49f0-b5cd-1e91c06249d2.jpg' },
  { ...FOUNDER_OWNERSHIP, id: 'c21c2456-98dc-4061-bee5-2f02a5180295', title: 'Kineo studio presenter', engine: 'presenter', videoPath: '/previews/c21c2456-98dc-4061-bee5-2f02a5180295.mp4' },
] as const satisfies readonly PublicEngineExample[]


// ═══ KINEO-VITRINE-FUNDADOR-2026-09-07 — /examples ("Explorar"): os 30 melhores ═══
// Pedido do fundador (07/09 01:55): "tem seis vídeos; coloca trinta, os nossos
// melhores, dos motores mais caros dos últimos dias". Todos renders da conta
// do fundador (josephsskaf) — a trava de privacidade de 27/08 continua: nenhum
// vídeo de cliente entra aqui. A mídia é preview 9:16 de 6s + poster, cortados
// dos masters enhanced e servidos de public/ — nunca a URL do fal, que expira.
// O clique abre o Studio no motor do vídeo (intent_campaign=examples_showcase).
export interface FounderShowcaseExample {
  id: string
  title: string
  engine: PublicEngineExample['engine']
  previewPath: string
  posterPath: string
  ownershipEvidence: 'founder_confirmed_owned'
  ownershipVerifiedAt: '2026-08-27' | '2026-09-07'
}
const SHOWCASE_OWNERSHIP = {
  ownershipEvidence: 'founder_confirmed_owned',
  ownershipVerifiedAt: '2026-09-07',
} as const
export const FOUNDER_SHOWCASE: readonly FounderShowcaseExample[] = [
  { ...SHOWCASE_OWNERSHIP, id: 'f3de57b0-3486-4400-ba72-c9390774d426', title: 'The Dyatlov Pass incident', engine: 'cinematic_kling', previewPath: '/previews/ex-f3de57b0-3486-4400-ba72-c9390774d426.mp4', posterPath: '/posters/ex-f3de57b0-3486-4400-ba72-c9390774d426.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '7efd12b8-925b-46d2-b68e-c6095cd3e92e', title: 'The Navy ship that evaporated', engine: 'cinematic_hollywood', previewPath: '/previews/ex-7efd12b8-925b-46d2-b68e-c6095cd3e92e.mp4', posterPath: '/posters/ex-7efd12b8-925b-46d2-b68e-c6095cd3e92e.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '1b8e12f9-83e5-411c-8fda-0b277d289934', title: 'Tunguska, 1908: the sky split open', engine: 'cinematic_omni', previewPath: '/previews/ex-1b8e12f9-83e5-411c-8fda-0b277d289934.mp4', posterPath: '/posters/ex-1b8e12f9-83e5-411c-8fda-0b277d289934.webp' },
  { ...SHOWCASE_OWNERSHIP, id: 'fe055601-0668-4d33-be49-82c1cb033779', title: 'Something is leaving our solar system', engine: 'cinematic_ai', previewPath: '/previews/ex-fe055601-0668-4d33-be49-82c1cb033779.mp4', posterPath: '/posters/ex-fe055601-0668-4d33-be49-82c1cb033779.webp' },
  { ...SHOWCASE_OWNERSHIP, id: 'ad6cb185-a0a2-46cf-a148-ea7503dfe6d3', title: 'Something spreading across the Gulf', engine: 'cinematic_h3', previewPath: '/previews/ex-ad6cb185-a0a2-46cf-a148-ea7503dfe6d3.mp4', posterPath: '/posters/ex-ad6cb185-a0a2-46cf-a148-ea7503dfe6d3.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '16742e11-a2fc-4e0a-a49a-2862e0ee36b0', title: 'The man who jumped and vanished', engine: 'cinematic_veo', previewPath: '/previews/ex-16742e11-a2fc-4e0a-a49a-2862e0ee36b0.mp4', posterPath: '/posters/ex-16742e11-a2fc-4e0a-a49a-2862e0ee36b0.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '94d551a3-fe7a-4903-8c2b-f252bed39c4c', title: 'The man who won the lottery 14 times', engine: 'cinematic_hollywood', previewPath: '/previews/ex-94d551a3-fe7a-4903-8c2b-f252bed39c4c.mp4', posterPath: '/posters/ex-94d551a3-fe7a-4903-8c2b-f252bed39c4c.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '7579e8d7-97ff-4be7-91c9-fe11f6698a00', title: 'The Halifax explosion, 1917', engine: 'cinematic_omni', previewPath: '/previews/ex-7579e8d7-97ff-4be7-91c9-fe11f6698a00.mp4', posterPath: '/posters/ex-7579e8d7-97ff-4be7-91c9-fe11f6698a00.webp' },
  { ...SHOWCASE_OWNERSHIP, id: 'fbc5d391-316f-4757-aa54-0565f698cb9f', title: 'Dinner still warm, everyone gone', engine: 'cinematic_kling', previewPath: '/previews/ex-fbc5d391-316f-4757-aa54-0565f698cb9f.mp4', posterPath: '/posters/ex-fbc5d391-316f-4757-aa54-0565f698cb9f.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '692a6e98-6ed5-4c8d-8fa5-89ab21fbbcff', title: 'The lake that turns animals to stone', engine: 'cinematic_ai', previewPath: '/previews/ex-692a6e98-6ed5-4c8d-8fa5-89ab21fbbcff.mp4', posterPath: '/posters/ex-692a6e98-6ed5-4c8d-8fa5-89ab21fbbcff.webp' },
  { ...SHOWCASE_OWNERSHIP, id: 'b8c50f61-2843-41f3-a803-ac5a4bb509f5', title: 'Pompeii: the wrong day', engine: 'cinematic_h3', previewPath: '/previews/ex-b8c50f61-2843-41f3-a803-ac5a4bb509f5.mp4', posterPath: '/posters/ex-b8c50f61-2843-41f3-a803-ac5a4bb509f5.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '41924eb2-d81d-4f2c-a5bb-5477c042af04', title: 'The mystery of Flight 19', engine: 'cinematic_omni', previewPath: '/previews/ex-41924eb2-d81d-4f2c-a5bb-5477c042af04.mp4', posterPath: '/posters/ex-41924eb2-d81d-4f2c-a5bb-5477c042af04.webp' },
  { ...SHOWCASE_OWNERSHIP, id: 'cbd676d0-340a-4728-8a5f-439fd9dd64c5', title: 'The ghost ship Mary Celeste', engine: 'cinematic_ai', previewPath: '/previews/ex-cbd676d0-340a-4728-8a5f-439fd9dd64c5.mp4', posterPath: '/posters/ex-cbd676d0-340a-4728-8a5f-439fd9dd64c5.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '397fa32a-2f35-4e09-950c-9f7d00e23c50', title: 'The boat found drifting, 1955', engine: 'cinematic_hollywood', previewPath: '/previews/ex-397fa32a-2f35-4e09-950c-9f7d00e23c50.mp4', posterPath: '/posters/ex-397fa32a-2f35-4e09-950c-9f7d00e23c50.webp' },
  { ...SHOWCASE_OWNERSHIP, id: 'a66e975a-3f6c-4bf4-9510-cd15b895b58b', title: 'China\'s secret spaceplane', engine: 'cinematic_omni', previewPath: '/previews/ex-a66e975a-3f6c-4bf4-9510-cd15b895b58b.mp4', posterPath: '/posters/ex-a66e975a-3f6c-4bf4-9510-cd15b895b58b.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '83db8b63-b654-491e-a0aa-86ce1bc1f3d7', title: 'The Lituya Bay megatsunami', engine: 'cinematic_ai', previewPath: '/previews/ex-83db8b63-b654-491e-a0aa-86ce1bc1f3d7.mp4', posterPath: '/posters/ex-83db8b63-b654-491e-a0aa-86ce1bc1f3d7.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '04189a48-45f7-45f4-b98c-27832702e837', title: 'The lake that makes Bermuda look gentle', engine: 'cinematic_h3', previewPath: '/previews/ex-04189a48-45f7-45f4-b98c-27832702e837.mp4', posterPath: '/posters/ex-04189a48-45f7-45f4-b98c-27832702e837.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '4b12925e-16e6-4b56-af5a-7047f9ae7a28', title: 'Storm over Lake Maracaibo', engine: 'cinematic_hollywood', previewPath: '/previews/ex-4b12925e-16e6-4b56-af5a-7047f9ae7a28.mp4', posterPath: '/posters/ex-4b12925e-16e6-4b56-af5a-7047f9ae7a28.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '36a04f7b-65f7-42d9-a2ab-198b5a7f115e', title: 'The robot rising from the harbor', engine: 'cinematic_omni', previewPath: '/previews/ex-36a04f7b-65f7-42d9-a2ab-198b5a7f115e.mp4', posterPath: '/posters/ex-36a04f7b-65f7-42d9-a2ab-198b5a7f115e.webp' },
  { ...SHOWCASE_OWNERSHIP, id: 'a09706da-a79f-4029-b213-69f43d6a2775', title: 'What Easter Island was hiding', engine: 'cinematic_ai', previewPath: '/previews/ex-a09706da-a79f-4029-b213-69f43d6a2775.mp4', posterPath: '/posters/ex-a09706da-a79f-4029-b213-69f43d6a2775.webp' },
  { ...SHOWCASE_OWNERSHIP, id: 'cc17475a-0707-4309-aa11-ac4b85918c78', title: 'The internet\'s most mysterious song', engine: 'cinematic_omni', previewPath: '/previews/ex-cc17475a-0707-4309-aa11-ac4b85918c78.mp4', posterPath: '/posters/ex-cc17475a-0707-4309-aa11-ac4b85918c78.webp' },
  { ...SHOWCASE_OWNERSHIP, id: 'b1b69c57-0ed7-4ecf-a4fa-dbd4508fa451', title: 'Krakatoa, 1883: the loudest sound in history', engine: 'cinematic_hollywood', previewPath: '/previews/ex-b1b69c57-0ed7-4ecf-a4fa-dbd4508fa451.mp4', posterPath: '/posters/ex-b1b69c57-0ed7-4ecf-a4fa-dbd4508fa451.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '7ffd064e-cb37-4a97-a207-70a202bc72b6', title: 'The Voynich manuscript', engine: 'cinematic_ai', previewPath: '/previews/ex-7ffd064e-cb37-4a97-a207-70a202bc72b6.mp4', posterPath: '/posters/ex-7ffd064e-cb37-4a97-a207-70a202bc72b6.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '33249fbf-57b6-47cf-8486-88bfb2a02db1', title: 'Life in the Mariana Trench', engine: 'cinematic_omni', previewPath: '/previews/ex-33249fbf-57b6-47cf-8486-88bfb2a02db1.mp4', posterPath: '/posters/ex-33249fbf-57b6-47cf-8486-88bfb2a02db1.webp' },
  { ...SHOWCASE_OWNERSHIP, id: 'c1f80b50-1de6-4140-9ce4-b4cfbeb185c3', title: 'The river that boils', engine: 'cinematic_hollywood', previewPath: '/previews/ex-c1f80b50-1de6-4140-9ce4-b4cfbeb185c3.mp4', posterPath: '/posters/ex-c1f80b50-1de6-4140-9ce4-b4cfbeb185c3.webp' },
  { ...SHOWCASE_OWNERSHIP, id: 'c53789d3-a1af-46a7-a2c6-7114204316de', title: 'Coastlines that glow electric blue', engine: 'cinematic_ai', previewPath: '/previews/ex-c53789d3-a1af-46a7-a2c6-7114204316de.mp4', posterPath: '/posters/ex-c53789d3-a1af-46a7-a2c6-7114204316de.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '6f6786a8-0a3d-49f0-b5cd-1e91c06249d2', title: 'The day Earth stopped spinning', engine: 'cinematic_omni', previewPath: '/previews/ex-6f6786a8-0a3d-49f0-b5cd-1e91c06249d2.mp4', posterPath: '/posters/ex-6f6786a8-0a3d-49f0-b5cd-1e91c06249d2.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '99818ab0-0960-4089-a784-12b241736868', title: 'Tunguska from above', engine: 'cinematic_hollywood', previewPath: '/previews/ex-99818ab0-0960-4089-a784-12b241736868.mp4', posterPath: '/posters/ex-99818ab0-0960-4089-a784-12b241736868.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '1901f2bb-2b87-4e78-acb9-e850505b1cbf', title: 'Cicada 3301: the internet\'s hardest puzzle', engine: 'cinematic_ai', previewPath: '/previews/ex-1901f2bb-2b87-4e78-acb9-e850505b1cbf.mp4', posterPath: '/posters/ex-1901f2bb-2b87-4e78-acb9-e850505b1cbf.webp' },
  { ...SHOWCASE_OWNERSHIP, id: '07208070-f6cc-40e1-8c82-4fb0fe53b583', title: 'The door nobody has opened in 800 years', engine: 'cinematic_ai', previewPath: '/previews/ex-07208070-f6cc-40e1-8c82-4fb0fe53b583.mp4', posterPath: '/posters/ex-07208070-f6cc-40e1-8c82-4fb0fe53b583.webp' },
] as const

export function getPublicExample(slug: string): PublicExample | undefined {
  return PUBLIC_EXAMPLES.find((example) => example.slug === slug)
}

/**
 * Single lookup for public engine surfaces. Pages such as /arena must resolve
 * their media through the founder-approved allowlist instead of duplicating a
 * preview URL that can silently disappear.
 */
export function getPublicEngineExample(id: string): PublicEngineExample | undefined {
  return PUBLIC_ENGINE_EXAMPLES.find((example) => example.id === id)
}
