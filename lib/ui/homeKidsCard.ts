// KINEO-BEBE-QUE-FALA-2010 — o 4º CARD da home ("dividir a hero em 4", fundador 20/10): "AI Kids Cartoons" / "Desenhos infantis com IA",
// ao lado dos 3 cards de produto (lib/ui/homeThreeCards.ts). Mesmo visual dos 3 (components/home/HomeKidsCard.tsx usa as classes
// .k3c-*), grade de 4 colunas no computador (os cards ficam menores), carrossel no celular como sempre. Cartão SEM preço.
//
// Interruptor ÚNICO: HOME_4TH_CARD_LIVE=false → só as contas da casa (isInternalEmail, decidido na KineoLanding) veem a prévia;
// o visitante vê a home EXATAMENTE como hoje (o componente dos 3 cards sem a prop não emite nem o <style> nem o atributo da grade
// de 4 — o guardião scripts/test-bebe-que-fala-2010.mjs renderiza e compara com a base).
//
// MÓDULO PURO (zero import).

export const HOME_KIDS_CARD_MARK = 'KINEO-BEBE-QUE-FALA-2010'

/** Interruptor do 4º card. false = só as contas da casa veem a prévia (a home pública fica como hoje). */
export const HOME_4TH_CARD_LIVE = false

/** Quem vê o 4º card (puro: `internal` = isInternalEmail do e-mail verificado da sessão). */
export function home4thCardOn(live: boolean, internal: boolean): boolean {
  return live === true || internal === true
}

export const HOME_KIDS_CARD_ID = 'kids_cartoon' as const
/** Posição do card na faixa (depois de Filmes · Anúncios de Produto · Anúncios UGC). */
export const HOME_KIDS_CARD_POSITION = 4
/** O selo honesto: o motor real do filme (Seedance 1.5), nunca preço. */
export const HOME_KIDS_CARD_BADGE = 'SEEDANCE 1.5 · 3D CARTOON'
/**
 * O vídeo do card: o curta de teste que levou NOTA 10 do fundador (20/10) — render 4f6c8a40 (videos d7c40bdc), fluxo de filme
 * Seedance 1.5, estilo 3D, "Meet Leo…", 14,2 s. Prévia leve no padrão dos 3 cards: 0–10 s, 540×960, sem áudio, faststart
 * (1,19 MB) + pôster .webp do quadro de 0,6 s. Feito na conta do fundador, então SAI COM a marca usekineo.com/free
 * (FORCE_WATERMARK_EMAILS) — não existe versão limpa; trocar quando houver. null = só o fundo ilustrado (.k3c-kids-art).
 */
export const HOME_KIDS_CARD_CLIP: { src: string; poster: string } | null = {
  src: '/previews/home-card-kids-cartoon-leo.mp4',
  poster: '/posters/home-card-kids-cartoon-leo.webp',
}
/** O render de onde o vídeo do card saiu (rastro). */
export const HOME_KIDS_CARD_RENDER_ID = '4f6c8a40-a8e1-4314-adb2-f988ca559bce'

/** Destino: o template /kids-cartoon (logado direto; visitante pelo cadastro, voltando ao MESMO destino). */
export function homeKidsCardHref(signedIn: boolean): string {
  const dest = '/kids-cartoon?utm_source=home_card'
  return signedIn ? dest : `/signup?redirect=${encodeURIComponent(dest)}`
}

/** Metadados FECHADOS do clique — mesmo evento e mesmo contrato dos 3 cards (home_card_clicked, card_v 1). */
export function homeKidsCardClickMetadata(signedIn: boolean): { card: typeof HOME_KIDS_CARD_ID; position: number; href: string; signed_in: boolean; surface: 'home'; card_v: number } {
  return { card: HOME_KIDS_CARD_ID, position: HOME_KIDS_CARD_POSITION, href: homeKidsCardHref(signedIn), signed_in: signedIn, surface: 'home', card_v: 1 }
}

/** [título, frase, botão] nas 16 línguas da interface. */
export const HOME_KIDS_CARD_COPY: Record<string, readonly [string, string, string]> = {
  en: ['AI Kids Cartoons', 'Type a story idea. Get a narrated 3D cartoon.', 'Make my cartoon'],
  pt: ['Desenhos infantis com IA', 'Escreva a ideia. Receba um desenho 3D narrado.', 'Fazer meu desenho'],
  es: ['Dibujos infantiles con IA', 'Escribe la idea. Recibe un dibujo 3D narrado.', 'Hacer mi dibujo'],
  fr: ['Dessins animés pour enfants IA', 'Tapez une idée. Recevez un dessin animé 3D raconté.', 'Créer mon dessin animé'],
  de: ['KI-Kinder-Cartoons', 'Idee eintippen. Erzählten 3D-Cartoon bekommen.', 'Meinen Cartoon erstellen'],
  it: ['Cartoni per bambini con IA', "Scrivi un'idea. Ricevi un cartone 3D narrato.", 'Crea il mio cartone'],
  nl: ['AI-kindertekenfilms', 'Typ een idee. Krijg een vertelde 3D-tekenfilm.', 'Maak mijn tekenfilm'],
  pl: ['Bajki dla dzieci z AI', 'Wpisz pomysł. Dostań bajkę 3D z narracją.', 'Zrób moją bajkę'],
  tr: ['Yapay zekâ ile çocuk çizgi filmleri', 'Bir fikir yaz. Anlatımlı 3D çizgi film al.', 'Çizgi filmimi yap'],
  ru: ['Детские мультики с ИИ', 'Напишите идею. Получите 3D-мультик с озвучкой.', 'Сделать мой мультик'],
  uk: ['Дитячі мультики з ШІ', 'Напишіть ідею. Отримайте 3D-мультик з озвученням.', 'Зробити мій мультик'],
  ar: ['رسوم متحركة للأطفال بالذكاء الاصطناعي', 'اكتب فكرة القصة. واحصل على كرتون ثلاثي الأبعاد مروي.', 'اصنع كرتوني'],
  ur: ['اے آئی کے ساتھ بچوں کے کارٹون', 'کہانی کا خیال لکھیں۔ بیان کے ساتھ 3D کارٹون پائیں۔', 'میرا کارٹون بنائیں'],
  hi: ['AI से बच्चों के कार्टून', 'कहानी का आइडिया लिखें। नैरेशन वाला 3D कार्टून पाएँ।', 'मेरा कार्टून बनाएँ'],
  id: ['Kartun anak dengan AI', 'Tulis ide cerita. Dapatkan kartun 3D bernarasi.', 'Buat kartunku'],
  vi: ['Phim hoạt hình thiếu nhi bằng AI', 'Nhập ý tưởng. Nhận phim hoạt hình 3D có lời kể.', 'Làm phim hoạt hình của tôi'],
}
/** [título, frase, botão] na língua da interface (sem a língua = inglês). */
export function homeKidsCardCopy(language: string | null | undefined): readonly [string, string, string] {
  return HOME_KIDS_CARD_COPY[language ?? ''] ?? HOME_KIDS_CARD_COPY.en
}

/** O CSS SÓ do modo 4 cards: entra num <style> próprio, emitido apenas com o card ligado (desligado = bytes de hoje). */
export const HOME_KIDS_CARD_CSS = `
@media (min-width:761px){
.k3c-grid[data-k3c-cols="4"]{grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;max-width:100%}
.k3c-grid[data-k3c-cols="4"] .k3c-card{aspect-ratio:3/4}
.k3c-grid[data-k3c-cols="4"] .k3c-body{padding:16px}
.k3c-grid[data-k3c-cols="4"] .k3c-title{font-size:clamp(1.1rem,1.35vw,1.4rem)}
.k3c-grid[data-k3c-cols="4"] .k3c-sub{font-size:13.5px}
.k3c-grid[data-k3c-cols="4"] .k3c-badge{font-size:9.5px;left:12px;top:12px}
.klp .k3c-grid[data-k3c-cols="4"] .k3c-cta{padding:10px 14px;font-size:13px}
}
.k3c-card[data-home-card="kids_cartoon"] .k3c-media video{object-position:50% 28%}
.k3c-kids-art{position:absolute;inset:0;z-index:0;background:radial-gradient(circle at 28% 30%,#FFE08A 0 9%,transparent 10%),radial-gradient(circle at 72% 22%,#fff 0 4%,transparent 5%),radial-gradient(ellipse 70% 40% at 50% 100%,#6BD38A 0 60%,transparent 61%),linear-gradient(180deg,#7EC8FF 0%,#B9A7FF 55%,#FFB3C7 100%)}
.k3c-kids-art::after{content:'';position:absolute;left:50%;top:44%;width:34%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 36% 40%,#2B2F3A 0 6%,transparent 7%),radial-gradient(circle at 64% 40%,#2B2F3A 0 6%,transparent 7%),radial-gradient(ellipse 22% 12% at 50% 66%,#E5557A 0 60%,transparent 62%),radial-gradient(circle at 50% 50%,#FFD9B3 0 70%,transparent 71%);box-shadow:0 18px 30px -16px rgba(20,20,40,.45)}
`
