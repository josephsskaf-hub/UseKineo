// KINEO-BEBE-QUE-FALA-2010 — o SEGUNDO modo: "AI Baby Podcast" / "Bebê podcast com IA" (humor/marca/UGC, nunca "renda passiva").
//
// ESTADO: interruptor próprio DESLIGADO e SEM tela nem rota ligada a ele. Fica aqui a decisão já medida, para o próximo passo não
// re-descobrir nada (teste real de 20/10, nota 8 do agente de teste, docs/PESQUISA-BEBE-QUE-FALA-2026-10-20.md):
//   · caminho da casa: /api/avatar/upload → /api/generate-avatar (engine 'presenter' = Kling AI Avatar v2 Standard), roteiro
//     verbatim (scriptMode 'verbatim', noBroll), voz MiniMax de sistema pelo campo `voiceId` que a rota JÁ aceita;
//   · DEPENDE do conserto da montagem final do /avatar (billing mismatch no compose, KINEO-AVATAR-PRESO-2010) e da nota do fundador;
//   · preço: o custo atual do /avatar no 'presenter' (engineCost 'presenter' = 70 cr, igual para 15 s ou 60 s). Recomendação ao
//     fundador (decisão dele): preço por segundo para o bebê de 15 s;
//   · o que falta construir quando ligar: retratos fixos da casa (3–4 bebês, copiados para avatars/<uid>/ pelo servidor, porque o
//     generate-avatar só aceita foto da pasta do próprio usuário), a regra infantil (lib/kidsCartoon/kidsCartoon.ts
//     kidsContentRefusal) DENTRO do generate-avatar quando a foto for um bebê da casa, a tela (avatar → status → compose) e as
//     páginas /ai-baby-podcast-videos e /videos-bebe-podcast-ia;
//   · ATENÇÃO na rota: se a voz clonada falha, o generate-avatar cai na voz padrão (adulta) em silêncio — para bebê isso tem de
//     virar recusa antes de ligar.
//
// MÓDULO PURO (zero import).

/** Interruptor do modo bebê-podcast. false = não existe para ninguém (nem tela, nem rota). */
export const BABY_PODCAST_LIVE = false

/** O motor da casa que o teste usou (lib/avatar/veed.ts PRESENTER_MODEL). */
export const BABY_PODCAST_ENGINE = 'presenter' as const
/** Voz MiniMax de sistema por língua (a inglesa foi a do teste; a portuguesa = a mesma voz com o language boost — validar por amostra). */
export const BABY_PODCAST_VOICES: Record<'en' | 'pt', string> = { en: 'English_PlayfulGirl', pt: 'English_PlayfulGirl' }
/** voice_setting planejado (pitch +4/+6, speed ~0,95): NÃO aplicado — só depois de amostra aprovada no ouvido do fundador. */
export const BABY_PODCAST_VOICE_SETTING_PLANNED = { pitch: null as number | null, speed: null as number | null }
/** Faixa do roteiro: 30–45 palavras (o /avatar exige ≥ 12 s de fala — AVATAR_MIN_NARRATION_SECONDS em app/api/generate-avatar). */
export const BABY_PODCAST_WORDS = { min: 30, max: 45 } as const
/** Retratos fixos da casa: '' = placeholder até a aprovação. */
export const BABY_PODCAST_PORTRAITS: readonly { id: string; label: string; portrait: string }[] = [
  { id: 'studio', label: 'Studio baby', portrait: '' },
  { id: 'couch', label: 'Couch baby', portrait: '' },
  { id: 'car', label: 'Car baby', portrait: '' },
]
/** As páginas reservadas do modo (ainda não existem). */
export const BABY_PODCAST_PATHS = { en: '/ai-baby-podcast-videos', pt: '/videos-bebe-podcast-ia' } as const
