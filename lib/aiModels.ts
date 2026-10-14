// KINEO-MIGRACAO-OPENAI-F1-1410
// Registro central dos modelos da OpenAI usados pela Kineo.
//
// FASE 1 = SÓ NOMEIA. Os valores abaixo são EXATAMENTE as strings que o código usa em
// 14/10/2026; nada aqui troca modelo. O guardião scripts/test-modelos-openai-inventario-1410.mjs
// confere valor por valor e fica vermelho se alguém trocar um modelo por aqui antes da fase 3
// (interruptor KINEO_TEXT_MODELS / KINEO_VOICE_PROVIDER, com A/B e canário — ver
// docs/MIGRACAO-MODELOS-OPENAI-2026-10-14.md).
//
// Regra durante a migração: chamada NOVA usa uma constante daqui, nunca uma string crua.
// O mesmo guardião falha se aparecer string crua de modelo em arquivo novo de app/, lib/ ou components/.
//
// Prazos (página de deprecations da OpenAI, conferida em 14/10):
//   tts-1, tts-1-hd, gpt-4o-mini-tts ......... desligam 06/01/2027 (sem substituto em /v1/audio/speech)
//   gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini  desligam 14/01/2027
//   whisper-1 ................................ desliga 26/02/2027 (base do tempo por palavra das legendas)
//   omni-moderation-latest, text-embedding-3-small, gpt-image-2: não estão na lista.

/** Modelos de texto por papel. Hoje há só dois ids de chat (gpt-4o e gpt-4o-mini) e um de pesquisa (gpt-4.1-mini). */
export const AI_TEXT_MODELS = {
  /** Escritor de roteiro: generate-script (auto-structure, resgate, retry de tamanho), expand-script, ad-script, scenes (legado). */
  writer: 'gpt-4o',
  /** Planejador de cenas caro: Creative Director clássico (lib/runway.ts) e planejador hollywood (lib/hollywood/router.ts). */
  planner: 'gpt-4o',
  /** Ajustes e planos de cena baratos: palavras por cena (runway), retry-hollywood-scene, regenerate-scene, direção de shot, plano de B-roll, buscas do Kineo 1. */
  scenePlannerLight: 'gpt-4o-mini',
  /** analyze-idea (camada visual e voiceovers verbatim) e scaleVoiceoverScript (lib/compose.ts). */
  analyzer: 'gpt-4o-mini',
  /** Chamadas com imagem: juiz do still, diretor que vê a miniatura (pixabay), rosto do avatar. */
  vision: 'gpt-4o-mini',
  /** Studio Ads: roteiro clássico, auto-brief, brief v2, plano da produção. */
  ads: 'gpt-4o-mini',
  /** Studio Ads: segunda tentativa do roteiro clássico (app/api/ads/script). */
  adsRetry: 'gpt-4o',
  /** Responses API + web_search_preview: pesquisa da marca (Ads v2), Espaços, monitor GEO. */
  research: 'gpt-4.1-mini',
  /** Utilitários e retenção: próximo episódio, temporada, pacote de publicação, resumo, sugestões, ganchos, score viral, crons. */
  utility: 'gpt-4o-mini',
} as const

/** Voz (/v1/audio/speech). */
export const AI_SPEECH_MODELS = {
  /** Narração de todos os motores (generateTTS, hostVoice), Ads clássico, prévia de voz, avatar. */
  tts: 'tts-1-hd',
  /** Rotas legadas /api/render e /api/voiceover. */
  ttsLegacy: 'tts-1',
} as const

/** Transcrição com tempo por palavra (legendas e verificação da fala do clipe, lib/compose.ts). */
export const AI_TRANSCRIPTION_MODEL = 'whisper-1' as const

/** Moderação (gratuita; não sai). */
export const AI_MODERATION_MODEL = 'omni-moderation-latest' as const

/** Embedding do score de relevância do B-roll (não sai). */
export const AI_EMBEDDING_MODEL = 'text-embedding-3-small' as const

/** Thumbnail (não sai; quem sai em 23/10 é o gpt-image-1, que não usamos). */
export const AI_IMAGE_MODEL = 'gpt-image-2' as const

/** Tudo num objeto só, para quem prefere um import. */
export const AI_MODELS = {
  text: AI_TEXT_MODELS,
  speech: AI_SPEECH_MODELS,
  transcription: AI_TRANSCRIPTION_MODEL,
  moderation: AI_MODERATION_MODEL,
  embedding: AI_EMBEDDING_MODEL,
  image: AI_IMAGE_MODEL,
} as const

/** Data em que a OpenAI desliga cada id (AAAA-MM-DD). Usada pelo guardião para a contagem regressiva. */
export const OPENAI_SHUTDOWN_DATES = {
  'tts-1': '2027-01-06',
  'tts-1-hd': '2027-01-06',
  'gpt-4o-mini-tts': '2027-01-06',
  'gpt-4o': '2027-01-14',
  'gpt-4o-mini': '2027-01-14',
  'gpt-4.1': '2027-01-14',
  'gpt-4.1-mini': '2027-01-14',
  'whisper-1': '2027-02-26',
} as const
