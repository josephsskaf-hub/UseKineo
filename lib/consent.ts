// ═══ KINEO-CONSENTIMENTO-1610 — CONSENTIMENTO DE COOKIES/PIXELS POR REGIÃO (fundador aprovou o item 1 em 16/10) ═══════
// O DEFEITO (docs/b2b-v2/PRIVACIDADE-E-TERMOS-GPT-2026-10-16.md, MAPA DE PROVAS): o layout raiz carregava para TODO
// visitante, sem pedir nada, o Google Ads (AW-18156258081), o TikTok Pixel e o Microsoft Clarity (gravação de sessão).
// Não havia banner, nem Do Not Track, nem Global Privacy Control.
//
// A REGRA (pura, sem import — o guardião scripts/test-consentimento-1610.mjs transpila e EXECUTA este arquivo):
//   · Região opt-in (EEE + Reino Unido + Suíça + Brasil, pelo x-vercel-ip-country): nada de marketing/análise até o
//     visitante clicar "Accept". País desconhecido (sem cabeçalho, falha de rede) = opt-in: falha FECHADA.
//   · Demais regiões (ex.: EUA): carrega como antes (opt-out), mas o Global Privacy Control desliga tudo e o link
//     "Your privacy choices" do rodapé abre o mesmo painel para recusar.
//   · O GPC vence até um "Accept" antigo: é o sinal que a lei da Califórnia manda honrar.
//   · A escolha mora num cookie first-party de 12 meses (gravado pelo servidor em /api/consent — o Safari corta
//     cookie escrito por JavaScript para 7 dias — e também pelo navegador, para valer na hora).
//   · Rewardful NÃO entra aqui: é atribuição de afiliado (cookie de indicação só para quem chega por link de parceiro,
//     sem request nenhum para quem não tem indicação). Fica funcional, descrito no painel e no /privacy.
//   · Stripe é o pagamento (essencial); Vercel Analytics não grava cookie. Nenhum dos dois passa por este portão.

/** EEE (27 da UE + Islândia, Liechtenstein, Noruega) + Reino Unido + Suíça + Brasil. */
export const CONSENT_OPT_IN_COUNTRIES: ReadonlySet<string> = new Set([
  // União Europeia (27)
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT',
  'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEE fora da UE
  'IS', 'LI', 'NO',
  // Reino Unido (a Vercel manda GB) e Suíça
  'GB', 'CH',
  // Brasil (LGPD)
  'BR',
])

export type ConsentRegion = 'opt_in' | 'opt_out'
export type ConsentChoice = 'granted' | 'denied'

/** Nome do cookie first-party da escolha. Valor: "v1.granted" ou "v1.denied". */
export const CONSENT_COOKIE = 'kineo_consent'
/** 12 meses. */
export const CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60
/** Evento gravado pelo servidor (app/api/consent/route.ts, writeServerEvent com path /api/consent) a cada escolha. */
export const CONSENT_EVENT = 'cookie_consent_set'
export const CONSENT_API_PATH = '/api/consent'
/** O link "Your privacy choices" do rodapé dispara este evento de janela; o ConsentManager abre o painel. */
export const OPEN_PRIVACY_CHOICES_EVENT = 'kineo:open-privacy-choices'
/** Cache da região no navegador (24 h), para não perguntar ao servidor a cada página. */
export const CONSENT_REGION_STORAGE_KEY = 'kineo:consent-region:v1'
export const CONSENT_REGION_TTL_MS = 24 * 60 * 60 * 1000

/** País (ISO-3166 alfa-2) → região. Vazio/desconhecido = opt_in (falha fechada). */
export function consentRegionFor(country: string | null | undefined): ConsentRegion {
  const code = String(country ?? '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return 'opt_in'
  // A Vercel usa "XX"/"T1" para desconhecido/Tor: sem país provado, pede consentimento.
  if (code === 'XX' || code === 'T1') return 'opt_in'
  return CONSENT_OPT_IN_COUNTRIES.has(code) ? 'opt_in' : 'opt_out'
}

export function parseConsentRegion(value: unknown): ConsentRegion | null {
  return value === 'opt_in' || value === 'opt_out' ? value : null
}

export function parseConsentChoice(value: unknown): ConsentChoice | null {
  return value === 'granted' || value === 'denied' ? value : null
}

export function consentCookieValue(choice: ConsentChoice): string {
  return `v1.${choice}`
}

/** Lê a escolha de um cabeçalho Cookie / document.cookie. Qualquer outra coisa = sem escolha. */
export function parseConsentCookie(cookieHeader: string | null | undefined): ConsentChoice | null {
  for (const part of String(cookieHeader ?? '').split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() !== CONSENT_COOKIE) continue
    const raw = part.slice(eq + 1).trim()
    if (raw === 'v1.granted') return 'granted'
    if (raw === 'v1.denied') return 'denied'
    return null
  }
  return null
}

export type ConsentState = {
  region: ConsentRegion | null
  choice: ConsentChoice | null
  gpc: boolean
}

/**
 * Google Ads, TikTok e Clarity podem carregar? Ordem: GPC desliga; "Reject" desliga; "Accept" liga; sem escolha,
 * só a região opt_out liga. Região ainda desconhecida (null) sem escolha = NÃO carrega.
 */
export function marketingAllowed(state: ConsentState): boolean {
  if (state.gpc) return false
  if (state.choice === 'denied') return false
  if (state.choice === 'granted') return true
  return state.region === 'opt_out'
}

/** O banner aparece sozinho só na região opt-in, sem escolha e sem GPC (com GPC nada carrega mesmo). */
export function consentBannerNeeded(state: ConsentState): boolean {
  return state.region === 'opt_in' && state.choice === null && !state.gpc
}

// ─── Texto do banner/painel ────────────────────────────────────────────────────────────────────────────────────────
export type ConsentCopy = {
  title: string
  body: string
  accept: string
  reject: string
  privacy: string
  choices: string
  affiliate: string
  gpc: string
  statusOn: string
  statusOff: string
  close: string
}

/** Línguas do EEE/Brasil que o site já fala. Outra língua = inglês (nunca texto inventado). */
export const CONSENT_COPY: Readonly<Record<'en' | 'pt' | 'es' | 'fr' | 'de' | 'it' | 'nl' | 'pl', ConsentCopy>> = {
  en: {
    title: 'Cookies',
    body: 'We use cookies for sign-in and checkout. With your OK, we also use Google Ads, TikTok and Microsoft Clarity to measure ads and improve the site.',
    accept: 'Accept',
    reject: 'Reject',
    privacy: 'Privacy policy',
    choices: 'Your privacy choices',
    affiliate: 'Partner links set a referral cookie (Rewardful) so the partner gets credit.',
    gpc: 'Your browser sends Global Privacy Control, so these tags stay off.',
    statusOn: 'Now: on',
    statusOff: 'Now: off',
    close: 'Close',
  },
  pt: {
    title: 'Cookies',
    body: 'Usamos cookies para login e pagamento. Com o seu OK, também usamos Google Ads, TikTok e Microsoft Clarity para medir anúncios e melhorar o site.',
    accept: 'Aceitar',
    reject: 'Recusar',
    privacy: 'Política de privacidade',
    choices: 'Suas escolhas de privacidade',
    affiliate: 'Links de parceiros gravam um cookie de indicação (Rewardful) para o parceiro receber o crédito.',
    gpc: 'Seu navegador envia o sinal Global Privacy Control; essas ferramentas ficam desligadas.',
    statusOn: 'Agora: ligadas',
    statusOff: 'Agora: desligadas',
    close: 'Fechar',
  },
  es: {
    title: 'Cookies',
    body: 'Usamos cookies para el inicio de sesión y el pago. Con tu permiso, también usamos Google Ads, TikTok y Microsoft Clarity para medir anuncios y mejorar el sitio.',
    accept: 'Aceptar',
    reject: 'Rechazar',
    privacy: 'Política de privacidad',
    choices: 'Tus opciones de privacidad',
    affiliate: 'Los enlaces de socios guardan una cookie de referido (Rewardful) para acreditar al socio.',
    gpc: 'Tu navegador envía la señal Global Privacy Control; estas herramientas quedan desactivadas.',
    statusOn: 'Ahora: activadas',
    statusOff: 'Ahora: desactivadas',
    close: 'Cerrar',
  },
  fr: {
    title: 'Cookies',
    body: 'Nous utilisons des cookies pour la connexion et le paiement. Avec votre accord, nous utilisons aussi Google Ads, TikTok et Microsoft Clarity pour mesurer nos publicités et améliorer le site.',
    accept: 'Accepter',
    reject: 'Refuser',
    privacy: 'Politique de confidentialité',
    choices: 'Vos choix de confidentialité',
    affiliate: 'Les liens de partenaires déposent un cookie de parrainage (Rewardful) pour créditer le partenaire.',
    gpc: 'Votre navigateur envoie le signal Global Privacy Control : ces outils restent désactivés.',
    statusOn: 'Actuellement : activés',
    statusOff: 'Actuellement : désactivés',
    close: 'Fermer',
  },
  de: {
    title: 'Cookies',
    body: 'Wir verwenden Cookies für Anmeldung und Bezahlung. Mit Ihrer Zustimmung nutzen wir außerdem Google Ads, TikTok und Microsoft Clarity, um Werbung zu messen und die Website zu verbessern.',
    accept: 'Akzeptieren',
    reject: 'Ablehnen',
    privacy: 'Datenschutzerklärung',
    choices: 'Ihre Datenschutz-Einstellungen',
    affiliate: 'Partnerlinks setzen ein Empfehlungs-Cookie (Rewardful), damit der Partner die Vermittlung erhält.',
    gpc: 'Ihr Browser sendet das Signal Global Privacy Control, daher bleiben diese Dienste aus.',
    statusOn: 'Aktuell: an',
    statusOff: 'Aktuell: aus',
    close: 'Schließen',
  },
  it: {
    title: 'Cookie',
    body: "Usiamo cookie per l'accesso e il pagamento. Con il tuo consenso usiamo anche Google Ads, TikTok e Microsoft Clarity per misurare gli annunci e migliorare il sito.",
    accept: 'Accetta',
    reject: 'Rifiuta',
    privacy: 'Informativa sulla privacy',
    choices: 'Le tue scelte sulla privacy',
    affiliate: 'I link dei partner salvano un cookie di referral (Rewardful) per riconoscere il partner.',
    gpc: 'Il tuo browser invia il segnale Global Privacy Control: questi strumenti restano disattivati.',
    statusOn: 'Ora: attivi',
    statusOff: 'Ora: disattivati',
    close: 'Chiudi',
  },
  nl: {
    title: 'Cookies',
    body: 'We gebruiken cookies voor inloggen en betalen. Met je toestemming gebruiken we ook Google Ads, TikTok en Microsoft Clarity om advertenties te meten en de site te verbeteren.',
    accept: 'Accepteren',
    reject: 'Weigeren',
    privacy: 'Privacybeleid',
    choices: 'Jouw privacykeuzes',
    affiliate: 'Partnerlinks plaatsen een verwijzingscookie (Rewardful) zodat de partner wordt beloond.',
    gpc: 'Je browser stuurt het Global Privacy Control-signaal, dus deze tools blijven uit.',
    statusOn: 'Nu: aan',
    statusOff: 'Nu: uit',
    close: 'Sluiten',
  },
  pl: {
    title: 'Pliki cookie',
    body: 'Używamy plików cookie do logowania i płatności. Za Twoją zgodą używamy też Google Ads, TikTok i Microsoft Clarity, aby mierzyć reklamy i ulepszać stronę.',
    accept: 'Akceptuj',
    reject: 'Odrzuć',
    privacy: 'Polityka prywatności',
    choices: 'Twoje wybory prywatności',
    affiliate: 'Linki partnerów zapisują plik cookie polecenia (Rewardful), aby partner otrzymał prowizję.',
    gpc: 'Twoja przeglądarka wysyła sygnał Global Privacy Control, więc te narzędzia pozostają wyłączone.',
    statusOn: 'Teraz: włączone',
    statusOff: 'Teraz: wyłączone',
    close: 'Zamknij',
  },
}

/**
 * Língua do banner: a escolha explícita de interface (se não for inglês) vence; senão a primeira língua do navegador
 * que tenha texto revisado; senão inglês.
 */
export function consentCopyFor(interfaceLanguage: string | null | undefined, browserLanguages: readonly string[] = []): ConsentCopy {
  const table = CONSENT_COPY as Record<string, ConsentCopy>
  const explicit = String(interfaceLanguage ?? '').toLowerCase()
  if (explicit && explicit !== 'en' && table[explicit]) return table[explicit]
  for (const raw of browserLanguages) {
    const code = String(raw ?? '').toLowerCase().split('-')[0]
    if (table[code]) return table[code]
  }
  return CONSENT_COPY.en
}
