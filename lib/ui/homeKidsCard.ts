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

/** [título, frase, botão] nas 16 línguas da interface. Título = o nome do mercado, "AI Cartoon Videos" (fundador 20/10, 20:55); "kids"/"3D" na frase. */
export const HOME_KIDS_CARD_COPY: Record<string, readonly [string, string, string]> = {
  en: ['AI Cartoon Videos', '3D kids cartoon stories with the same character, ready to post.', 'Make my cartoon'],
  pt: ['Vídeos de desenho com IA', 'Histórias infantis em desenho 3D com o mesmo personagem, prontas para postar.', 'Fazer meu desenho'],
  es: ['Videos de dibujos con IA', 'Cuentos infantiles en dibujo 3D con el mismo personaje, listos para publicar.', 'Hacer mi dibujo'],
  fr: ['Vidéos de dessin animé IA', 'Histoires 3D pour enfants avec le même personnage, prêtes à publier.', 'Créer mon dessin animé'],
  de: ['KI-Cartoon-Videos', '3D-Kindergeschichten mit derselben Figur, bereit zum Posten.', 'Meinen Cartoon erstellen'],
  it: ['Video di cartoni con IA', 'Storie 3D per bambini con lo stesso personaggio, pronte da pubblicare.', 'Crea il mio cartone'],
  nl: ['AI-tekenfilmvideo’s', '3D-kinderverhalen met hetzelfde personage, klaar om te posten.', 'Maak mijn tekenfilm'],
  pl: ['Filmy rysunkowe z AI', 'Bajki 3D dla dzieci z tą samą postacią, gotowe do publikacji.', 'Zrób moją bajkę'],
  tr: ['Yapay zekâ çizgi film videoları', 'Aynı karakterle 3D çocuk hikâyeleri, paylaşmaya hazır.', 'Çizgi filmimi yap'],
  ru: ['Мультфильмы с ИИ', 'Детские 3D-истории с одним и тем же героем, готовые к публикации.', 'Сделать мой мультик'],
  uk: ['Мультфільми з ШІ', 'Дитячі 3D-історії з тим самим героєм, готові до публікації.', 'Зробити мій мультик'],
  ar: ['فيديوهات كرتون بالذكاء الاصطناعي', 'قصص أطفال كرتونية ثلاثية الأبعاد بنفس الشخصية، جاهزة للنشر.', 'اصنع كرتوني'],
  ur: ['اے آئی کارٹون ویڈیوز', 'ایک ہی کردار کے ساتھ بچوں کی 3D کارٹون کہانیاں، پوسٹ کے لیے تیار۔', 'میرا کارٹون بنائیں'],
  hi: ['AI कार्टून वीडियो', 'एक ही किरदार वाली बच्चों की 3D कार्टून कहानियाँ, पोस्ट के लिए तैयार।', 'मेरा कार्टून बनाएँ'],
  id: ['Video kartun AI', 'Cerita kartun 3D anak dengan karakter yang sama, siap diposting.', 'Buat kartunku'],
  vi: ['Video hoạt hình AI', 'Truyện hoạt hình 3D cho bé với cùng một nhân vật, sẵn sàng đăng.', 'Làm phim hoạt hình của tôi'],
}
/** [título, frase, botão] na língua da interface (sem a língua = inglês). */
export function homeKidsCardCopy(language: string | null | undefined): readonly [string, string, string] {
  return HOME_KIDS_CARD_COPY[language ?? ''] ?? HOME_KIDS_CARD_COPY.en
}

/**
 * O card "AI Product Ads" no modo 4 cards (fundador 20/10, 20:55): o reel que troca 3 vezes — o Close real do perfume LUME (o vídeo de hoje
 * do card, na língua da interface) e depois os trios do card "ADS: 3 VARIATIONS" (KINEO-CARD-ADS-3VAR-2026-09-30, os mesmos de
 * lib/ui/homeTwoDoors.ts HOME_DOOR_ADS_CLIPS: garrafa, fone e tênis, 3 variações lado a lado). Nenhum render novo; troca quando o vídeo
 * TERMINA (onEnded), nunca por timer. Os trios são paisagem (3 telas lado a lado): entram inteiros (contain) no alto do card.
 */
export const HOME_PRODUCT_ADS_REEL_TRIOS: readonly { src: string; poster: string }[] = [1, 2, 3].map((n) => ({ src: `/previews/promo-ads-3var-${n}.mp4`, poster: `/posters/promo-ads-3var-${n}.webp` }))
/** A sequência do reel: o clipe do card (por língua) + os 3 trios. */
export function homeProductAdsReel(cardClip: { src: string; poster: string }): readonly { src: string; poster: string; trio: boolean }[] {
  return [{ ...cardClip, trio: false }, ...HOME_PRODUCT_ADS_REEL_TRIOS.map((c) => ({ ...c, trio: true }))]
}

/**
 * O ENQUADRAMENTO dos 3 cards de hoje (fundador 20/10, 21:55, no print da home no ar: "escapou ali no UGC" e o UGC mais escuro). Vale
 * SEMPRE (com ou sem o 4º card), num <style> próprio depois do CSS dos cards. Nenhum letreiro queimado do vídeo fica cortado na borda:
 *  · AI UGC Ads (Atheeri, 720×1280): o letreiro mora a ~15–19 % da altura → a janela começa a ≥ 22 % (fora do quadro). Card 5:6
 *    (computador com 3 cards e celular) = 50% 70% (janela 22,8–90 %); card 3:4 (tablet e modo 4 cards) = 50% 88% (22–97 %). E o card fica
 *    mais claro (brilho +14 %, sombra de cima mais leve), igual aos outros;
 *  · AI Product Ads (Close real LUME): letreiros a ~18–27 % (1ºs planos) e ~70–77 % (planos de perto) → card 5:6 = 50% 92% (janela
 *    30–97 %: o de cima fora, o de baixo inteiro); card 3:4 = 50% 60% (15–90 %: os dois inteiros). Os trios do reel ficam no contain deles.
 */
export const HOME_CARDS_AJUSTE_CSS = `
.k3c-card[data-home-card="product_ads"] .k3c-media video:not([data-trio]){object-position:50% 92%}
.k3c-card[data-home-card="ugc_ads"] .k3c-media video{object-position:50% 70%;filter:brightness(1.14) saturate(1.04)}
.k3c-card[data-home-card="ugc_ads"] .k3c-shade{opacity:.72}
@media (max-width:1100px) and (min-width:761px){
.k3c-card[data-home-card="product_ads"] .k3c-media video:not([data-trio]){object-position:50% 60%}
.k3c-card[data-home-card="ugc_ads"] .k3c-media video{object-position:50% 88%}
}
@media (min-width:761px){
.k3c-grid[data-k3c-cols="4"] .k3c-card[data-home-card="product_ads"] .k3c-media video:not([data-trio]){object-position:50% 60%}
.k3c-grid[data-k3c-cols="4"] .k3c-card[data-home-card="ugc_ads"] .k3c-media video{object-position:50% 88%}
}
`

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
.k3c-reel video{opacity:0;transition:opacity .6s ease}
.k3c-reel video[data-on]{opacity:1}
.k3c-card .k3c-reel video[data-trio]{object-fit:contain;object-position:50% 12%;padding:44px 8px 0;box-sizing:border-box;transform:none}
.k3c-card:hover .k3c-reel video[data-trio]{transform:none}
.k3c-kids-art{position:absolute;inset:0;z-index:0;background:radial-gradient(circle at 28% 30%,#FFE08A 0 9%,transparent 10%),radial-gradient(circle at 72% 22%,#fff 0 4%,transparent 5%),radial-gradient(ellipse 70% 40% at 50% 100%,#6BD38A 0 60%,transparent 61%),linear-gradient(180deg,#7EC8FF 0%,#B9A7FF 55%,#FFB3C7 100%)}
.k3c-kids-art::after{content:'';position:absolute;left:50%;top:44%;width:34%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 36% 40%,#2B2F3A 0 6%,transparent 7%),radial-gradient(circle at 64% 40%,#2B2F3A 0 6%,transparent 7%),radial-gradient(ellipse 22% 12% at 50% 66%,#E5557A 0 60%,transparent 62%),radial-gradient(circle at 50% 50%,#FFD9B3 0 70%,transparent 71%);box-shadow:0 18px 30px -16px rgba(20,20,40,.45)}
`
