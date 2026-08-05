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

// Public proof assets selected for the Kineo homepage. Each MP4 is an honest
// five-second preview cut from the longer export described by
// outputDurationSeconds. These are founder-owned samples, never customer
// uploads. Keep this allow-list explicit so a private render cannot
// accidentally become indexable.
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

export function getPublicExample(slug: string): PublicExample | undefined {
  return PUBLIC_EXAMPLES.find((example) => example.slug === slug)
}
