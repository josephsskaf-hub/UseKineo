// KINEO-LACOS-INDICACAO-2026-10-02 — a recompensa da indicação ("Invite & Earn") tem UMA fonte.
//
// Antes: o número 30 vivia digitado em três lugares (app/api/referral/route.ts, app/api/referral/qualify/route.ts e
// app/llms.txt/route.ts) com um comentário "kept in sync" — a mesma classe de erro do "Affiliate — 40%" (C1). Agora as
// rotas importam daqui; o llms.txt passa a importar na integração (outra sessão é dona dele em 02/10).
//
// Módulo PURO, sem import nenhum: o guardião scripts/test-lacos-indicacao-2026-10-02.mjs o executa direto.
// ⚠ Mudar estes números é mudar uma oferta pública (crédito = custo de fornecedor): decisão do fundador.

/** Créditos que CADA lado ganha quando a indicação qualifica (e-mail confirmado + primeiro vídeo). */
export const REFERRAL_REWARD_CREDITS = 30

/** Teto de indicações pagas ao indicador. Passado o teto, o indicado continua ganhando; o indicador não. */
export const REFERRAL_MAX_REWARDED_FRIENDS = 20

/** Formato do código de indicação gerado por /api/referral (8 caracteres, sem 0/O/1/I). */
export const REFERRAL_CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/

export function normalizeReferralCode(raw: unknown): string | null {
  const code = typeof raw === 'string' ? raw.trim().toUpperCase() : ''
  return REFERRAL_CODE_RE.test(code) ? code : null
}

// ── Eventos do laço de indicação (KINEO-LACOS-INDICACAO-2026-10-02) ─────────────────────────────────────────────
// O laço era cego: nenhum degrau gravava nada. Os três de servidor estão em SERVER_ONLY_EVENTS (app/api/events) —
// o navegador não os cunha. Metadados levam ids, nunca e-mail.
/** Cliente: a pessoa copiou o próprio link de indicação (components/ReferralCard.tsx). */
export const REFERRAL_LINK_COPIED_EVENT = 'referral_link_copied'
/** Servidor: alguém chegou por um link de indicação (app/a/[code] para `?ref=` na home; /v/<id>?ref= no filme). */
export const REFERRAL_LANDING_EVENT = 'referral_landing'
/** Servidor: o cadastro foi atribuído ao indicador (app/api/referral/attribute). */
export const REFERRAL_ATTRIBUTED_EVENT = 'referral_attributed'
/** Servidor: a indicação qualificou e os créditos foram pagos (app/api/referral/qualify). */
export const REFERRAL_QUALIFIED_EVENT = 'referral_qualified'

/** Cookie legível (não é prova financeira) que leva o código do /a/<code> até o captureRefOnce da home. */
export const REFERRAL_COOKIE = 'sf_ref'
/** 30 dias: o mesmo horizonte do localStorage de primeiro toque, sem prender o código para sempre. */
export const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60
