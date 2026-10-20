// KINEO-BEBE-QUE-FALA-2010 — o SEGUNDO modo: "AI Baby Podcast" / "Bebê podcast com IA" (humor/marca/UGC, nunca "renda passiva").
//
// O CAMINHO (teste real de 20/10, nota 8; docs/PESQUISA-BEBE-QUE-FALA-2026-10-20.md): retrato fixo da casa → /api/generate-avatar
// (engine 'presenter' = Kling AI Avatar v2 Standard, roteiro verbatim, sem B-roll, voz MiniMax de sistema pelo campo `voiceId` que
// a rota JÁ aceita) → /api/avatar-status → /api/compose (quality 'presenter': legenda queimada) → o vídeo 9:16.
//   · /api/baby-podcast/prepare (servidor): valida (bebê/língua/tema da lista fechada), moderação da casa + regra infantil
//     (lib/kidsCartoon/kidsCartoon.ts kidsContentRefusal), escreve 30–45 palavras inocentes (≥ 12 s de fala: o piso do
//     /avatar, AVATAR_MIN_NARRATION_SECONDS) e copia o retrato da casa para avatars/<uid>/baby-podcast-<bebê>.png (o generate-avatar
//     só aceita foto da pasta do PRÓPRIO usuário; nome fixo = o MESMO bebê numa série, sem lixo no bucket);
//   · o generate-avatar barra (regra infantil) qualquer roteiro sobre um retrato baby-podcast-* — a regra vale também fora da tela;
//   · preço: o do /avatar no 'presenter' (engineCost 'presenter' = 70 cr), mostrado só no botão de gerar. Recomendação ao fundador
//     (decisão dele): preço por segundo para o clipe de ~15 s;
//   · DEPENDE do conserto da montagem final do /avatar (KINEO-AVATAR-PRESO-2010); por isso o interruptor nasce desligado;
//   · ATENÇÃO: se a voz MiniMax falha, o generate-avatar cai na voz padrão (adulta) — o template avisa no texto do resultado.
//
// MÓDULO PURO (zero import): a rota, a tela, as páginas e o guardião scripts/test-bebe-que-fala-2010.mjs executam as MESMAS funções.

export const BABY_PODCAST_MARK = 'KINEO-BEBE-QUE-FALA-2010'

/** Interruptor do modo bebê-podcast (tela /baby-podcast + rota de preparo). false = só as contas da casa veem e usam. */
export const BABY_PODCAST_LIVE = false
/** Interruptor das páginas públicas do bebê-podcast (EN/PT). false = 404 + fora do sitemap/llms.txt. */
export const BABY_PODCAST_PAGES_LIVE = false

export function babyPodcastOn(live: boolean, internal: boolean): boolean {
  return live === true || internal === true
}

export const BABY_PODCAST_TEMPLATE_PATH = '/baby-podcast'
export function babyPodcastTemplateHref(signedIn: boolean, campaign = 'baby_page'): string {
  const dest = `${BABY_PODCAST_TEMPLATE_PATH}?utm_source=${encodeURIComponent(campaign)}`
  return signedIn ? dest : `/signup?redirect=${encodeURIComponent(dest)}`
}

/** O motor da casa que o teste usou (lib/avatar/veed.ts PRESENTER_MODEL) e a qualidade que o compose cobra (engineCost 'presenter'). */
export const BABY_PODCAST_ENGINE = 'presenter' as const
export const BABY_PODCAST_QUALITY = 'presenter' as const
export const BABY_PODCAST_ENGINE_LABEL = 'KLING AVATAR'
/** Duração pedida ao /avatar (verbatim: o vídeo segue a fala real; 30–45 palavras ≈ 13–20 s). */
export const BABY_PODCAST_DURATION = 15

export const BABY_PODCAST_LANGUAGES = ['en', 'pt'] as const
export type BabyPodcastLanguage = (typeof BABY_PODCAST_LANGUAGES)[number]
export function isBabyPodcastLanguage(raw: unknown): raw is BabyPodcastLanguage {
  return typeof raw === 'string' && (BABY_PODCAST_LANGUAGES as readonly string[]).includes(raw)
}
/** Voz MiniMax de sistema por língua: a inglesa foi a do teste nota 8; o português usa a MESMA voz com o language boost da rota
 *  (não há voz infantil portuguesa conferida entre as de sistema) — validar por amostra antes de ligar. */
export const BABY_PODCAST_VOICES: Record<BabyPodcastLanguage, string> = { en: 'English_PlayfulGirl', pt: 'English_PlayfulGirl' }
/** voice_setting planejado (pitch +4/+6, speed ~0,95): NÃO aplicado — a rota não repassa voice_setting hoje (mudar = código novo no TTS). */
export const BABY_PODCAST_VOICE_SETTING_PLANNED = { pitch: null as number | null, speed: null as number | null }
/** Faixa do roteiro: 30–45 palavras (≥ 12 s de fala, o piso do /avatar). */
export const BABY_PODCAST_WORDS = { min: 30, max: 45 } as const

/** Onde os retratos públicos da casa são servidos (o servidor baixa daqui e copia para a pasta do usuário). */
export const BABY_PODCAST_ORIGIN = 'https://www.usekineo.com'
export type BabyId = 'studio' | 'couch' | 'car' | 'garden'
/** Retratos fixos (fone + microfone, estilo do teste nota 8), gerados em 20/10 pela rota de imagens da casa (Nano Banana Pro, 9:16, conta
 *  interna; 20 cr concedidos com o motivo "retratos bebê podcast 20/10"), no NOSSO bucket público de renders. portrait '' = sem retrato: o bebê não aparece. */
export const BABY_PORTRAITS_BUCKET = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/'
export const BABY_PODCAST_BABIES: readonly { id: BabyId; label: { en: string; pt: string }; portrait: string }[] = [
  { id: 'studio', label: { en: 'Studio baby', pt: 'Bebê no estúdio' }, portrait: `${BABY_PORTRAITS_BUCKET}c6cd20fc-aacb-49e9-8355-80f6b6f373da.png` },
  { id: 'couch', label: { en: 'Couch baby', pt: 'Bebê no sofá' }, portrait: `${BABY_PORTRAITS_BUCKET}f382d8d0-2a4b-42c8-aa13-18ca3fce2d0a.png` },
  { id: 'car', label: { en: 'Car seat baby', pt: 'Bebê no carro' }, portrait: `${BABY_PORTRAITS_BUCKET}d4220b84-be43-4cca-b5bd-094090358bb2.png` },
  { id: 'garden', label: { en: 'Garden baby', pt: 'Bebê no jardim' }, portrait: `${BABY_PORTRAITS_BUCKET}24737d59-f062-475d-98dd-430fd54f70aa.png` },
]
export function babyById(id: unknown) {
  return BABY_PODCAST_BABIES.find((b) => b.id === id) ?? null
}
/** Os bebês que a tela oferece: só os com retrato aprovado. */
export function babiesReady() {
  return BABY_PODCAST_BABIES.filter((b) => babyPortraitUrl(b.portrait) !== null)
}
/** A URL de onde o servidor baixa o retrato: só o nosso bucket de renders (PNG) ou /baby-podcast/*.png do nosso site. null = fora da lista. */
export function babyPortraitUrl(portrait: string): string | null {
  if (typeof portrait !== 'string' || !portrait) return null
  if (portrait.startsWith(BABY_PORTRAITS_BUCKET) && /^[0-9a-f-]{36}\.png$/.test(portrait.slice(BABY_PORTRAITS_BUCKET.length))) return portrait
  if (/^\/baby-podcast\/[a-z]+\.png$/.test(portrait)) return `${BABY_PODCAST_ORIGIN}${portrait}`
  return null
}
/** O caminho fixo da cópia na pasta do usuário (avatars/<uid>/baby-podcast-<bebê>.png) e o reconhecimento dele pelo generate-avatar. */
export function babyAvatarObjectPath(userId: string, id: BabyId): string {
  return `${userId}/baby-podcast-${id}.png`
}
export function isBabyPodcastAvatarUrl(url: string, userId: string): boolean {
  return typeof url === 'string' && typeof userId === 'string' && userId.length > 0 && url.includes(`/storage/v1/object/public/avatars/${userId}/baby-podcast-`)
}

export const BABY_TOPIC_MIN_CHARS = 6
export const BABY_TOPIC_MAX_CHARS = 300
export interface BabyPodcastRequest { baby: BabyId; language: BabyPodcastLanguage; topic: string; mode: 'write' | 'verbatim' }
export type BabyPodcastValidation = { ok: true; value: BabyPodcastRequest } | { ok: false; error: string; field: string }
/** Confere o pedido (servidor). mode 'write' = a IA escreve do tema; 'verbatim' = o texto colado (30–45 palavras) vai como está. */
export function validateBabyPodcastRequest(raw: unknown, ready: readonly { id: string }[] = babiesReady()): BabyPodcastValidation {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (!ready.some((b) => b.id === r.baby) || !babyById(r.baby)) return { ok: false, error: 'Pick one of the babies.', field: 'baby' }
  if (!isBabyPodcastLanguage(r.language)) return { ok: false, error: 'Pick English or Portuguese.', field: 'language' }
  const mode = r.mode === 'verbatim' ? 'verbatim' : 'write'
  const topic = typeof r.topic === 'string' ? r.topic.replace(/[\u0000-\u001f\u007f​-‍⁠﻿]/g, ' ').replace(/\s+/g, ' ').trim() : ''
  if (topic.length < BABY_TOPIC_MIN_CHARS) return { ok: false, error: 'Write a topic (or paste the text).', field: 'topic' }
  if (topic.length > BABY_TOPIC_MAX_CHARS) return { ok: false, error: `Keep it under ${BABY_TOPIC_MAX_CHARS} characters.`, field: 'topic' }
  if (/https?:\/\/|www\./i.test(topic)) return { ok: false, error: 'Write the topic in words, not a link.', field: 'topic' }
  if (mode === 'verbatim') {
    const n = topic.split(/\s+/).filter(Boolean).length
    if (n < BABY_PODCAST_WORDS.min || n > BABY_PODCAST_WORDS.max) return { ok: false, error: `Pasted text must have ${BABY_PODCAST_WORDS.min}–${BABY_PODCAST_WORDS.max} words (about 12–20 seconds).`, field: 'topic' }
  }
  return { ok: true, value: { baby: r.baby as BabyId, language: r.language, topic, mode } }
}

/** O escritor: fala curta, engraçada e inocente na voz de um bebê apresentador de podcast. */
export function babyScriptWriterPrompt(req: BabyPodcastRequest): { system: string; user: string } {
  const lang = req.language === 'pt' ? 'Brazilian Portuguese' : 'English'
  const system = [
    'You write what a cute AI baby says on a funny podcast clip, speaking straight to the camera.',
    `Write in ${lang}. Only the spoken words: no title, no labels, no stage directions, no emojis, no hashtags, no quotes.`,
    `Length: between ${BABY_PODCAST_WORDS.min} and ${BABY_PODCAST_WORDS.max} words, short sentences, natural spoken rhythm.`,
    'The joke is a tiny baby giving confident adult-style opinions about everyday baby life (naps, snacks, toys, parents, bath time) or about the topic.',
    'Keep it innocent and kind: no romance, no nudity, no violence, no swearing, no insults, no making fun of anyone, no adult products (alcohol, smoking, gambling), no real people or brands.',
    'End with a punchline or a short question to the viewer.',
  ].join(' ')
  return { system, user: `Topic: ${req.topic}` }
}
/** A fala pronta (puro): limpa, no tamanho e inocente. */
export function babyScriptCheck(text: string, refusal: (t: string) => string | null): { ok: true; script: string } | { ok: false; reason: 'empty' | 'too_short' | 'too_long' | 'not_innocent' } {
  const s = String(text ?? '').replace(/^["“”']+|["“”']+$/g, '').replace(/\s+/g, ' ').trim()
  if (!s) return { ok: false, reason: 'empty' }
  const n = s.split(/\s+/).filter(Boolean).length
  if (n < BABY_PODCAST_WORDS.min) return { ok: false, reason: 'too_short' }
  if (n > BABY_PODCAST_WORDS.max) return { ok: false, reason: 'too_long' }
  if (refusal(s)) return { ok: false, reason: 'not_innocent' }
  return { ok: true, script: s }
}

/** O corpo do /api/generate-avatar (o caminho do teste nota 8): presenter, verbatim, sem B-roll, voz MiniMax da língua. */
export function babyAvatarPayload(i: { generationId: string; script: string; language: BabyPodcastLanguage; avatarImageUrl: string }): Record<string, unknown> {
  return {
    generationId: i.generationId,
    prompt: i.script,
    scriptMode: 'verbatim',
    duration: BABY_PODCAST_DURATION,
    language: i.language,
    avatarImageUrl: i.avatarImageUrl,
    engine: BABY_PODCAST_ENGINE,
    noBroll: true,
    voiceId: BABY_PODCAST_VOICES[i.language],
  }
}

/** A legenda/descrição pronta com o selo de IA. */
export function babyPostCaption(language: BabyPodcastLanguage): string {
  return language === 'pt'
    ? 'Bebê podcast 🎙️👶 Vídeo gerado por IA (AI-generated) — feito em usekineo.com #GeradoPorIA #BebePodcast #AIgenerated'
    : 'Baby podcast 🎙️👶 AI-generated video — made at usekineo.com #AIgenerated #BabyPodcast #MadeWithAI'
}

export const BABY_TEMPLATE_COPY = {
  en: {
    title: 'AI Baby Podcast', lead: 'Pick a baby, type a topic and get a talking baby podcast clip with captions.', baby: 'Baby', topic: 'Topic',
    topicPh: 'e.g. why naps are overrated', write: 'AI writes it (30–45 words)', verbatim: 'Use my text as is', language: 'Language', prepare: 'Write the script',
    preparing: 'Writing…', script: 'What the baby says', make: 'Make my baby video', note: 'Kling AI Avatar · the credit price is on this button.',
    rendering: 'The baby is talking… this takes a few minutes.', composing: 'Adding captions…', done: 'Your video is ready', download: 'Download',
    caption: 'Post caption (AI label)', label: 'AI-generated — turn on the AI label when you post.', rules: 'Kids content stays innocent: no romance, violence, mocking or adult products.',
    noBabies: 'The babies are being approved — check back soon.', again: 'Another version', series: 'Same baby as last time',
  },
  pt: {
    title: 'Bebê podcast com IA', lead: 'Escolha o bebê, escreva o tema e receba um clipe de bebê falando no podcast, com legenda.', baby: 'Bebê', topic: 'Tema',
    topicPh: 'ex.: por que soneca é superestimada', write: 'A IA escreve (30–45 palavras)', verbatim: 'Usar meu texto como está', language: 'Língua', prepare: 'Escrever o roteiro',
    preparing: 'Escrevendo…', script: 'O que o bebê fala', make: 'Fazer meu vídeo de bebê', note: 'Kling AI Avatar · o preço em créditos está neste botão.',
    rendering: 'O bebê está falando… leva alguns minutos.', composing: 'Colocando a legenda…', done: 'Seu vídeo está pronto', download: 'Baixar',
    caption: 'Legenda para postar (selo de IA)', label: 'Gerado por IA — ligue o rótulo de IA ao postar.', rules: 'Conteúdo infantil é inocente: sem romance, violência, zombaria ou produto adulto.',
    noBabies: 'Os bebês estão em aprovação — volte em breve.', again: 'Outra versão', series: 'O mesmo bebê da última vez',
  },
} as const
export function babyTemplateCopy(language: string | null | undefined) {
  return language === 'pt' ? BABY_TEMPLATE_COPY.pt : BABY_TEMPLATE_COPY.en
}

/** As páginas públicas do modo (atrás de BABY_PODCAST_PAGES_LIVE). */
export const BABY_PODCAST_PATHS = { en: '/ai-baby-podcast-videos', pt: '/videos-bebe-podcast-ia' } as const
export function babyPagesSitemapPaths(live: boolean): readonly string[] {
  return live === true ? [BABY_PODCAST_PATHS.en, BABY_PODCAST_PATHS.pt] : []
}
export function babyPagesLlmsSection(base: string, live: boolean): string {
  if (live !== true) return ''
  return `## AI baby podcast videos (reviewed 2026-10-20)

- [AI Baby Podcast — talking baby podcast clips](${base}${BABY_PODCAST_PATHS.en}): pick one of Kineo's fixed AI baby portraits (headphones and a studio microphone), type a topic or paste 30–45 words, choose English or Portuguese, and get a vertical clip of the baby talking with lip-synced voice and burned-in captions (Kling AI Avatar). Innocent humor only; the video is AI-generated and must carry the platform's AI label; no income is promised. The credit price shows on the generate button.
- [Bebê podcast com IA (Portuguese)](${base}${BABY_PODCAST_PATHS.pt}): the same page in Brazilian Portuguese.
`
}
