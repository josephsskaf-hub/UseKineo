// KINEO-HOME-3-CARDS-1910 — a ENTRADA da amostra grátis do Studio Ads (fundador 19/10, "pode ser as 3").
//
// POR QUÊ: em 30 dias, 13 de 19 pessoas de fora que abriram /ads levaram "access denied". Os 2 cards de anúncio da home
// (lib/ui/homeThreeCards.ts) levam ao 1º ANÚNCIO GRÁTIS, no formato do card:
//   · card "AI Product Ads" (?entry=product) → a amostra de sempre: o Close do produto real (lib/ads/v2CloseReal.ts);
//   · card "AI UGC Ads"     (?entry=ugc)     → a amostra COM A PESSOA: o Apresentador (v2, ~US$ 3 cada, decisão do fundador).
// As travas da amostra NÃO mudam (lib/ads/serverAccess.ts adsSampleOpen + adsSampleCapReached): 1 por conta NO TOTAL (não uma de
// cada formato — o "usou" conta qualquer pedido 'adssample-…'), antifarm (descartável/trial barrado) e o teto global de
// ADS_SAMPLE_DAILY_CAP por dia UTC, que vale para os dois formatos juntos. Marca-d'água nos dois.
// Quem decide é o SERVIDOR: o /plan lê `sample_entry` do corpo (validado aqui: só 'ugc' ou 'product'; qualquer outra coisa =
// 400), escolhe o formato e grava `sample_format: 'presenter'` no plano; o /start só aceita amostra com o plano no Close real
// OU com essa marca + o apresentador planejado. Assinante, passe e interna nunca passam por aqui (gate 'ok').
//
// MÓDULO PURO (só `import type`): o guardião scripts/test-home-3-cards-1910.mjs carrega este arquivo cru.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

/** Interruptor ÚNICO da amostra com a pessoa. false = toda amostra volta a ser o Close real (a entrada 'ugc' é ignorada). */
export const ADS_SAMPLE_PRESENTER_LIVE = true

export type AdsSampleEntry = 'product' | 'ugc'
export const ADS_SAMPLE_ENTRIES: readonly AdsSampleEntry[] = ['product', 'ugc']

/** A entrada validada (null = ausente ou inválida; o chamador decide se inválido é 400). */
export function adsSampleEntryOf(raw: unknown): AdsSampleEntry | null {
  return typeof raw === 'string' && (ADS_SAMPLE_ENTRIES as readonly string[]).includes(raw) ? (raw as AdsSampleEntry) : null
}

/** O formato da amostra (puro): 'presenter' SÓ pela entrada UGC, com o interruptor e o ator no ar; senão o Close real. */
export function adsSampleFormatFor(entry: AdsSampleEntry | null | undefined, presenterPublic: boolean, live: boolean = ADS_SAMPLE_PRESENTER_LIVE): 'presenter' | 'close_real' {
  return entry === 'ugc' && live === true && presenterPublic === true ? 'presenter' : 'close_real'
}

/** A marca que o /plan grava no plano da amostra com a pessoa (o /start confere). */
export const ADS_SAMPLE_PRESENTER_MARK = 'presenter' as const
// ── KINEO-UGC-AJUSTES-2010 — o SUB-TETO da amostra com a pessoa ──────────────────────────────────────────────────────────
// KINEO-UGC-AJUSTES-2010 — o teto geral (lib/ads/sample.ts ADS_SAMPLE_DAILY_CAP = 30) soma as duas amostras; com a entrada UGC (~US$ 2–3 cada) isso expunha ~US$ 75/dia.
// KINEO-UGC-AJUSTES-2010 — Agora: no máximo ADS_SAMPLE_PRESENTER_DAILY_CAP amostras COM A PESSOA iniciadas por dia UTC, contadas no servidor do mesmo jeito que o teto geral
// KINEO-UGC-AJUSTES-2010 — (lib/ads/serverAccess.ts adsSamplePresenterCapReached: chave 'adssample-…' + started_at do dia + plan.sample_format = 'presenter'; leitura que falha =
// KINEO-UGC-AJUSTES-2010 — teto atingido). Passou do sub-teto: o /plan NÃO recusa — a entrada UGC cai na amostra Close real (zero IA de vídeo, ~US$ 0,30) com o aviso
// KINEO-UGC-AJUSTES-2010 — honesto na tela (sample_fallback 'presenter_cap'); o /start confere de novo (429 'sample_presenter_cap': a tela pede o plano de novo, que sai no Close real).
/** KINEO-UGC-AJUSTES-2010 — amostras com a pessoa iniciadas por dia UTC (dentro do teto geral de 30). */
export const ADS_SAMPLE_PRESENTER_DAILY_CAP = 10 // KINEO-UGC-AJUSTES-2010
/** KINEO-UGC-AJUSTES-2010 — o código que o /plan devolve quando a entrada UGC caiu no Close real pelo sub-teto. */
export const ADS_SAMPLE_PRESENTER_FALLBACK = 'presenter_cap' as const // KINEO-UGC-AJUSTES-2010
/** KINEO-UGC-AJUSTES-2010 — o erro do /start quando o plano com a pessoa chegou depois do sub-teto (a tela refaz o plano: sai no Close real). */
export const ADS_SAMPLE_PRESENTER_CAP_CODE = 'sample_presenter_cap' as const // KINEO-UGC-AJUSTES-2010
// ── KINEO-UGC-AJUSTES-2010 — o "sample_probe": a conta INTERNA testa a amostra de verdade ─────────────────────────────────
// KINEO-UGC-AJUSTES-2010 — /api/ads/v2/plan e /start (e a tela /ads/v2) com ?sample_probe=1: SÓ quem o servidor já resolveu como 'internal' (isAdsInternalEmail) passa a ser
// KINEO-UGC-AJUSTES-2010 — tratado como 'none' — e aí cai nas MESMAS travas da amostra (1 por conta, antifarm, teto geral, sub-teto da pessoa, marca-d'água). Conta de fora com o
// KINEO-UGC-AJUSTES-2010 — parâmetro continua com o acesso dela (nada muda); sem o parâmetro, a interna segue 'internal'.
/** KINEO-UGC-AJUSTES-2010 — o nome do parâmetro de consulta. */
export const ADS_SAMPLE_PROBE_PARAM = 'sample_probe' // KINEO-UGC-AJUSTES-2010
/** KINEO-UGC-AJUSTES-2010 — o probe vale? (puro) Só 'internal' com o parâmetro exatamente '1'. */
export function adsSampleProbeOn(reason: unknown, param: string | null | undefined): boolean { // KINEO-UGC-AJUSTES-2010
  return reason === 'internal' && param === '1' // KINEO-UGC-AJUSTES-2010
} // KINEO-UGC-AJUSTES-2010
/** KINEO-UGC-AJUSTES-2010 — a URL da rota com o probe (puro): a tela só passa probe=true quando o page.tsx decidiu (conta interna com ?sample_probe=1). */
export function adsSampleProbeUrl(url: string, probe: boolean): string { // KINEO-UGC-AJUSTES-2010
  return probe === true ? `${url}?${ADS_SAMPLE_PROBE_PARAM}=1` : url // KINEO-UGC-AJUSTES-2010
} // KINEO-UGC-AJUSTES-2010

/** O plano gravado é uma amostra com a pessoa, planejada pelo servidor? (puro) Marca do /plan + apresentador no plano. */
export function adsSamplePresenterPlanOk(plan: unknown): boolean {
  if (!plan || typeof plan !== 'object') return false
  const p = plan as { sample_format?: unknown; presenter?: unknown }
  return p.sample_format === ADS_SAMPLE_PRESENTER_MARK && !!p.presenter && typeof p.presenter === 'object'
}

// ── a marca-d'água da amostra fora do Close real (o Close real já a desenha: lib/ads/v2CloseReal.ts) ──────────────────────
/** Topo da marca (fração da altura): acima da frase de tela do apresentador, abaixo da barra de cima das redes. */
export const ADS_SAMPLE_WATERMARK_TOP = 0.06
/** Tamanho da letra a 1080 px de largura (o mesmo do Close real). */
export const ADS_SAMPLE_WATERMARK_FONT_AT_1080 = 24

/**
 * A fonte do Creatomate COM a marca-d'água (pura; nunca muta a entrada): um texto na trilha seguinte à maior usada, do 0 ao fim.
 * Fonte sem `elements`/`duration` válidos = devolvida como veio (o montador já recusa o resto).
 */
export function adsSampleWatermarkSource(source: Record<string, unknown>, opts: { text: string; fontFamily: string; width: number }): Record<string, unknown> {
  const elements = Array.isArray(source.elements) ? (source.elements as Record<string, unknown>[]) : null
  const duration = Number(source.duration)
  const text = typeof opts.text === 'string' ? opts.text.trim() : ''
  if (!elements || !Number.isFinite(duration) || duration <= 0 || !text) return source
  const track = elements.reduce((m, e) => (typeof e.track === 'number' && e.track > m ? e.track : m), 0) + 1
  const width = Number.isFinite(opts.width) && opts.width > 0 ? opts.width : 1080
  const mark: Record<string, unknown> = {
    type: 'text', track, time: 0, duration, text,
    x: '50%', y: `${Math.round(ADS_SAMPLE_WATERMARK_TOP * 1000) / 10}%`, x_anchor: '50%', y_anchor: '0%', x_alignment: '50%', width: '80%',
    font_family: opts.fontFamily, font_size: Math.round((ADS_SAMPLE_WATERMARK_FONT_AT_1080 * width) / 1080), font_weight: '800', line_height: '110%',
    fill_color: '#ffffff', background_color: 'rgba(0,0,0,0.35)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 10,
  }
  return { ...source, elements: [...elements, mark] }
}

// ── a linha da tela para a amostra com a pessoa (16 línguas, nenhuma cai no inglês) ─────────────────────────────────────
export const ADS_SAMPLE_PRESENTER_NOTE: Record<InterfaceLanguage, string> = {
  en: 'Free sample: 1 per account, with an AI presenter holding your product, 15 s, with a small watermark. More formats and ads on paid plans.',
  pt: "Amostra grátis: 1 por conta, com uma pessoa de IA segurando o seu produto, 15 s, com marca-d'água discreta. Mais formatos e anúncios nos planos pagos.",
  es: 'Muestra gratis: 1 por cuenta, con una persona de IA sosteniendo tu producto, 15 s, con una marca de agua discreta. Más formatos y anuncios en los planes de pago.',
  fr: 'Essai gratuit : 1 par compte, avec une personne IA qui tient votre produit, 15 s, avec un petit filigrane. Plus de formats et de pubs avec les offres payantes.',
  de: 'Gratis-Probe: 1 pro Konto, mit einer KI-Person, die dein Produkt hält, 15 s, mit kleinem Wasserzeichen. Mehr Formate und Anzeigen in den bezahlten Plänen.',
  it: 'Prova gratuita: 1 per account, con una persona IA che tiene in mano il tuo prodotto, 15 s, con una piccola filigrana. Più formati e annunci con i piani a pagamento.',
  nl: 'Gratis proef: 1 per account, met een AI-persoon die je product vasthoudt, 15 s, met een klein watermerk. Meer formaten en advertenties met een betaald abonnement.',
  pl: 'Darmowa próbka: 1 na konto, z osobą AI trzymającą Twój produkt, 15 s, z małym znakiem wodnym. Więcej formatów i reklam w płatnych planach.',
  tr: 'Ücretsiz deneme: hesap başına 1, ürününü tutan yapay zekâ ile oluşturulmuş bir kişiyle, 15 sn, küçük bir filigranla. Daha fazla format ve reklam ücretli planlarda.',
  ru: 'Бесплатный пример: 1 на аккаунт, с ИИ-ведущим, который держит ваш товар, 15 с, с небольшим водяным знаком. Больше форматов и роликов — в платных тарифах.',
  uk: 'Безкоштовний приклад: 1 на акаунт, з ШІ-ведучим, який тримає ваш товар, 15 с, з невеликим водяним знаком. Більше форматів і роликів — у платних тарифах.',
  ar: 'عينة مجانية: واحدة لكل حساب، مع شخص بالذكاء الاصطناعي يحمل منتجك، مدة 15 ثانية، مع علامة مائية صغيرة. أشكال وإعلانات أكثر في الخطط المدفوعة.',
  ur: 'مفت نمونہ: ہر اکاؤنٹ کے لیے 1، ایک AI شخص کے ساتھ جو آپ کا پروڈکٹ پکڑے ہوئے ہو، 15 سیکنڈ، چھوٹے واٹر مارک کے ساتھ۔ مزید فارمیٹس اور اشتہارات ادا شدہ پلانز میں۔',
  hi: 'मुफ़्त नमूना: हर अकाउंट के लिए 1, आपका प्रोडक्ट पकड़े एक AI व्यक्ति के साथ, 15 सेकंड, छोटे वॉटरमार्क के साथ। ज़्यादा फ़ॉर्मैट और विज्ञापन पेड प्लान में।',
  id: 'Contoh gratis: 1 per akun, dengan orang AI yang memegang produkmu, 15 dtk, dengan watermark kecil. Lebih banyak format dan iklan di paket berbayar.',
  vi: 'Bản mẫu miễn phí: 1 cho mỗi tài khoản, với một người AI cầm sản phẩm của bạn, 15 giây, có hình mờ nhỏ. Thêm định dạng và quảng cáo ở các gói trả phí.',
}

/** A linha da amostra com a pessoa na língua da interface (língua desconhecida = inglês). */
export function adsSamplePresenterNote(language: InterfaceLanguage | string | null | undefined): string {
  return (typeof language === 'string' && (ADS_SAMPLE_PRESENTER_NOTE as Record<string, string>)[language]) || ADS_SAMPLE_PRESENTER_NOTE.en
}
// ── KINEO-UGC-AJUSTES-2010 — o aviso honesto quando a entrada UGC caiu no Close real (16 línguas, nenhuma cai no inglês) ───
export const ADS_SAMPLE_PRESENTER_CAP_NOTE: Record<InterfaceLanguage, string> = { // KINEO-UGC-AJUSTES-2010
  en: "Today's free ads with an AI presenter are taken, so your free ad comes in the Real product close-up format: 15 s, your real product, with a small watermark.", // KINEO-UGC-AJUSTES-2010
  pt: "As amostras grátis com pessoa de IA de hoje acabaram, então o seu anúncio grátis sai no formato Close do produto real: 15 s, o seu produto de verdade, com marca-d'água discreta.", // KINEO-UGC-AJUSTES-2010
  es: 'Las muestras gratis con persona de IA de hoy ya se agotaron, así que tu anuncio gratis sale en el formato Primer plano del producto real: 15 s, tu producto de verdad, con una marca de agua discreta.', // KINEO-UGC-AJUSTES-2010
  fr: "Les essais gratuits avec une personne IA sont épuisés pour aujourd'hui : votre pub gratuite sort au format Gros plan du vrai produit, 15 s, votre vrai produit, avec un petit filigrane.", // KINEO-UGC-AJUSTES-2010
  de: 'Die Gratis-Proben mit KI-Person sind für heute vergeben, deshalb kommt deine kostenlose Anzeige im Format Nahaufnahme des echten Produkts: 15 s, dein echtes Produkt, mit kleinem Wasserzeichen.', // KINEO-UGC-AJUSTES-2010
  it: 'Le prove gratuite con persona IA di oggi sono esaurite, quindi il tuo annuncio gratis esce nel formato Primo piano del prodotto reale: 15 s, il tuo prodotto vero, con una piccola filigrana.', // KINEO-UGC-AJUSTES-2010
  nl: 'De gratis proeven met een AI-persoon zijn voor vandaag op, dus je gratis advertentie komt in het formaat Close-up van het echte product: 15 s, je echte product, met een klein watermerk.', // KINEO-UGC-AJUSTES-2010
  pl: 'Dzisiejsze darmowe próbki z osobą AI już się skończyły, więc Twoja darmowa reklama powstanie w formacie Zbliżenie prawdziwego produktu: 15 s, Twój prawdziwy produkt, z małym znakiem wodnym.', // KINEO-UGC-AJUSTES-2010
  tr: 'Bugünün yapay zekâ kişili ücretsiz denemeleri bitti; ücretsiz reklamın Gerçek ürün yakın çekimi formatında çıkacak: 15 sn, gerçek ürünün, küçük bir filigranla.', // KINEO-UGC-AJUSTES-2010
  ru: 'Бесплатные примеры с ИИ-ведущим на сегодня закончились, поэтому ваша бесплатная реклама выйдет в формате «Крупный план реального товара»: 15 с, ваш настоящий товар, с небольшим водяным знаком.', // KINEO-UGC-AJUSTES-2010
  uk: 'Безкоштовні приклади з ШІ-ведучим на сьогодні закінчилися, тому ваша безкоштовна реклама вийде у форматі «Великий план справжнього товару»: 15 с, ваш справжній товар, з невеликим водяним знаком.', // KINEO-UGC-AJUSTES-2010
  ar: 'نفدت العينات المجانية مع شخص بالذكاء الاصطناعي لليوم، لذلك يخرج إعلانك المجاني بشكل «لقطة قريبة للمنتج الحقيقي»: 15 ثانية، منتجك الحقيقي، مع علامة مائية صغيرة.', // KINEO-UGC-AJUSTES-2010
  ur: 'آج کے AI شخص والے مفت نمونے ختم ہو گئے، اس لیے آپ کا مفت اشتہار «اصل پروڈکٹ کا کلوز اپ» فارمیٹ میں بنے گا: 15 سیکنڈ، آپ کا اصل پروڈکٹ، چھوٹے واٹر مارک کے ساتھ۔', // KINEO-UGC-AJUSTES-2010
  hi: 'आज के AI व्यक्ति वाले मुफ़्त नमूने खत्म हो गए, इसलिए आपका मुफ़्त विज्ञापन «असली प्रोडक्ट का क्लोज़-अप» फ़ॉर्मैट में बनेगा: 15 सेकंड, आपका असली प्रोडक्ट, छोटे वॉटरमार्क के साथ।', // KINEO-UGC-AJUSTES-2010
  id: 'Contoh gratis dengan orang AI hari ini sudah habis, jadi iklan gratismu dibuat dalam format Close-up produk asli: 15 dtk, produk aslimu, dengan watermark kecil.', // KINEO-UGC-AJUSTES-2010
  vi: 'Bản mẫu miễn phí có người AI hôm nay đã hết, nên quảng cáo miễn phí của bạn sẽ ở định dạng Cận cảnh sản phẩm thật: 15 giây, sản phẩm thật của bạn, có hình mờ nhỏ.', // KINEO-UGC-AJUSTES-2010
} // KINEO-UGC-AJUSTES-2010
/** KINEO-UGC-AJUSTES-2010 — o aviso na língua da interface (língua desconhecida = inglês). */
export function adsSamplePresenterCapNote(language: InterfaceLanguage | string | null | undefined): string { // KINEO-UGC-AJUSTES-2010
  return (typeof language === 'string' && (ADS_SAMPLE_PRESENTER_CAP_NOTE as Record<string, string>)[language]) || ADS_SAMPLE_PRESENTER_CAP_NOTE.en // KINEO-UGC-AJUSTES-2010
} // KINEO-UGC-AJUSTES-2010
