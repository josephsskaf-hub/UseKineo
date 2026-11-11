// KINEO-GOOGLE-FAXINA-1011 [fundador 10/11: "escrever no google… com dados, e motivos reais, sem erros"] — a identidade
// do anunciante (o que o revisor do Google Ads confere contra o perfil de pagamentos da conta 186-928-2523: pessoa
// física, Brasil, verificado em 20/07/2026).
//
// UMA fonte só: Terms, Privacy, /refund e os rodapés leem daqui. De propósito SEM rua, CEP, telefone ou CPF, e SEM o
// endereço comercial de Miami (o anunciante é a pessoa física no Brasil). Guardião: scripts/test-google-faxina-1011.mjs.

/** Quem opera a Kineo: o nome do perfil de pagamentos do Google Ads. */
export const ADVERTISER_OPERATOR = 'Joseph Selim Skaf'
/** Cidade e país, só isso (sem rua/CEP). */
export const ADVERTISER_LOCATION = 'São Paulo, Brazil'
/** O e-mail de suporte que o site já usa (Terms, /support, /trust, rodapé). */
export const ADVERTISER_SUPPORT_EMAIL = 'support@usekineo.com'

/** A frase pública, igual em todas as superfícies. */
export const ADVERTISER_IDENTITY_LINE = `Kineo is operated by ${ADVERTISER_OPERATOR}, ${ADVERTISER_LOCATION}.`
