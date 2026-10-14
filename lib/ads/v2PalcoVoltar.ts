// KINEO-ADS-PALCO-VOLTAR-1410 — fundador 14/10 (print a 1918×950): no /ads/v2, depois de abrir "Ver todos os 17" e clicar num
// estilo, o PALCO escuro do estilo ficava POR CIMA do quadro (link, fotos, frase, cena e a fileira de estilos cobertos pela
// metade) e não havia como voltar à tela normal.
//
// CAUSA (medida no Edge sem cabeça, 1920/1440/1280/390, harness local): NÃO era um modo "palco expandido" de propósito. Era um
// defeito de layout. O .adv2-main do painel é `display:grid` SEM colunas declaradas (coluna implícita `auto`). Quando o cartão
// "Estilo" (<details class="adv2q-opt">) abre, o carrossel de 17 estilos (fieldset .kst-row, flex sem quebra) tem largura
// mínima de conteúdo de ~2.500 px; o <details> é item de grade com `min-width:auto`, a coluna `auto` cresce até ela e TODOS os
// irmãos (o quadro inteiro) passam a ter 1.128–2.508 px dentro de um painel de 460–609 px. O painel não cresce (a coluna da
// .kps-grid é fixa), então o formulário vaza para a direita, POR BAIXO do palco, que vem depois no DOM e é opaco. No celular
// (390) o mesmo vazamento criava rolagem lateral.
//
// CONSERTO (só CSS escopado em .stu.adv2.adv2q, a página inteira do /ads/v2 nos 3 modos): a coluna do .adv2-main passa a ser
// `minmax(0,1fr)` e os filhos ganham `min-width:0;max-width:100%` — o carrossel volta a rolar DENTRO do cartão. O palco fica na
// coluna dele, ao lado do quadro, como no "Make a film" do /studio. Mais: o cartão de todos os estilos ganha "✕ Fechar estilos"
// e Esc (o caminho de volta claro que o fundador pediu); o estilo escolhido continua escolhido.
//
// E O KIT DA MARCA (mesmo print: "Brand kit applied · Edit" num anúncio NOVO): o kit salvo era aplicado na abertura de TODO
// anúncio novo (nome, preço, contato, cor e logo) e o nome que a página do link lia NÃO entrava (o campo já estava ocupado pelo
// nome do kit). Regra nova (pura, aqui): o kit só fica no anúncio enquanto a frase/o link não indicarem OUTRA marca. Conflito =
// há evidência (frase, nome lido da página ou domínio do link) e nenhuma delas cita a marca do kit. Com conflito, a tela tira o
// que o kit preencheu (só o que a pessoa não mexeu) e diz isso; "Remover o kit deste anúncio" faz o mesmo na mão; "Usar o kit"
// devolve. Nada aqui chama rota, cobra ou decide preço. LIB PURA (só `import type`).
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

/** O quadro nunca fica mais largo que o painel: a coluna do .adv2-main é minmax(0,1fr) e nenhum filho força largura. */
export const ADS_PALCO_VOLTAR_CSS = `
html .stu.adv2.adv2q .adv2-main{grid-template-columns:minmax(0,1fr)}
html .stu.adv2.adv2q .adv2-main>*,html .stu.adv2.adv2q .adv2q-board,html .stu.adv2.adv2q .adv2q-opt,html .stu.adv2.adv2q .kst-pick{min-width:0;max-width:100%}
html .stu.adv2.adv2q .kps-grid>.kps-panel{min-width:0}
html .stu.adv2.adv2q .adv2q-close{display:flex;justify-content:flex-end;margin:10px 0 0}
html .stu.adv2.adv2q .adv2s-kit .rm{background:transparent}
html .stu.adv2.adv2q .adv2s-kitoff{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px;font-size:12.5px;line-height:1.45;color:var(--muted)}
html .stu.adv2.adv2q .adv2s-kitoff button{min-height:28px;padding:2px 10px;border-radius:999px;border:1px solid var(--border2,var(--border));background:var(--card);color:var(--text);font:inherit;font-size:12px;font-weight:650;cursor:pointer}
`

const norm = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const compact = (s: string) => s.replace(/\s+/g, '')

/** A evidência cita a marca? Palavra inteira, o nome colado (domínio "atheeri.com" ↔ "Atheeri") ou a 1ª palavra (≥4 letras). */
function mentions(evidence: string, kit: string): boolean {
  if (` ${evidence} `.includes(` ${kit} `)) return true
  const k = compact(kit)
  if (k.length >= 4 && compact(evidence).includes(k)) return true
  const first = kit.split(' ')[0] ?? ''
  return first.length >= 4 && ` ${evidence} `.includes(` ${first} `)
}

/**
 * O anúncio de agora é de OUTRA marca que a do kit salvo? Sem kit (ou kit sem nome) = false. Sem nenhuma evidência (frase vazia,
 * sem link) = false: o kit da própria pessoa continua valendo, à vista, com "Remover". Com evidência: conflito quando NENHUMA
 * delas (frase, nome lido da página, domínio do link) cita a marca do kit. Pura.
 */
export function brandKitConflict(
  kitBusiness: string | null | undefined,
  ev: { sentence?: string | null; linkName?: string | null; linkHost?: string | null },
): boolean {
  const kit = norm(kitBusiness)
  if (!kit) return false
  const evidence = [ev.sentence, ev.linkName, ev.linkHost].map(norm).filter(Boolean)
  if (!evidence.length) return false
  return !evidence.some((e) => mentions(e, kit))
}

/** O que o kit preencheu nesta visita (para tirar SÓ isso, e só se a pessoa não mexeu). */
export interface AdsKitFilled {
  business?: string
  price?: string
  contact?: string
  color?: string
  logoFootageId?: string
}

/**
 * Tirar o kit deste anúncio: devolve o valor de cada campo depois de tirar. Campo que a pessoa mexeu (≠ do que o kit pôs) fica.
 * O nome e o preço voltam ao que a página do link leu (se leu); o resto volta ao vazio / à cor padrão / sem logo. Pura.
 */
export function brandKitRetract(
  filled: AdsKitFilled,
  now: { business: string; price: string; contact: string; color: string; logoFootageId: string | null },
  fallback: { business: string; price: string; defaultColor: string },
): { business: string; price: string; contact: string; color: string; dropLogo: boolean } {
  return {
    business: filled.business !== undefined && now.business === filled.business ? fallback.business : now.business,
    price: filled.price !== undefined && now.price === filled.price ? fallback.price : now.price,
    contact: filled.contact !== undefined && now.contact === filled.contact ? '' : now.contact,
    color: filled.color !== undefined && now.color.toLowerCase() === filled.color.toLowerCase() ? fallback.defaultColor : now.color,
    dropLogo: filled.logoFootageId !== undefined && now.logoFootageId === filled.logoFootageId,
  }
}

// ─── as frases novas (16 línguas; nenhuma cai no inglês) ──────────────────────────────────────────────────────────────

export interface AdsPalcoVoltarCopy {
  /** fecha o cartão de todos os estilos */
  closeStyles: string
  /** botão no selo do kit */
  removeKit: string
  /** {name} — o kit ficou de fora porque o anúncio parece de outra marca */
  kitOffConflict: string
  /** o kit foi tirado pela pessoa */
  kitOffUser: string
  /** devolve o kit a este anúncio */
  useKit: string
}

export const ADS_PALCO_VOLTAR_COPY: Record<InterfaceLanguage, AdsPalcoVoltarCopy> = {
  en: { closeStyles: 'Close styles', removeKit: 'Remove kit for this ad', kitOffConflict: 'Brand kit “{name}” not used — this ad looks like a different brand.', kitOffUser: 'Brand kit removed for this ad.', useKit: 'Use brand kit' },
  pt: { closeStyles: 'Fechar estilos', removeKit: 'Remover o kit deste anúncio', kitOffConflict: 'Kit da marca “{name}” não usado — este anúncio parece de outra marca.', kitOffUser: 'Kit da marca removido deste anúncio.', useKit: 'Usar o kit da marca' },
  es: { closeStyles: 'Cerrar estilos', removeKit: 'Quitar el kit de este anuncio', kitOffConflict: 'Kit de marca “{name}” sin usar: este anuncio parece de otra marca.', kitOffUser: 'Kit de marca quitado de este anuncio.', useKit: 'Usar el kit de marca' },
  fr: { closeStyles: 'Fermer les styles', removeKit: 'Retirer le kit de cette pub', kitOffConflict: 'Kit de marque « {name} » non utilisé : cette pub semble être pour une autre marque.', kitOffUser: 'Kit de marque retiré de cette pub.', useKit: 'Utiliser le kit de marque' },
  de: { closeStyles: 'Stile schließen', removeKit: 'Kit für diese Anzeige entfernen', kitOffConflict: 'Markenkit „{name}“ nicht verwendet – diese Anzeige wirkt wie eine andere Marke.', kitOffUser: 'Markenkit für diese Anzeige entfernt.', useKit: 'Markenkit verwenden' },
  it: { closeStyles: 'Chiudi stili', removeKit: 'Rimuovi il kit da questo annuncio', kitOffConflict: 'Kit del brand “{name}” non usato: questo annuncio sembra di un altro brand.', kitOffUser: 'Kit del brand rimosso da questo annuncio.', useKit: 'Usa il kit del brand' },
  nl: { closeStyles: 'Stijlen sluiten', removeKit: 'Kit voor deze advertentie weghalen', kitOffConflict: 'Merkkit “{name}” niet gebruikt — deze advertentie lijkt van een ander merk.', kitOffUser: 'Merkkit weggehaald voor deze advertentie.', useKit: 'Merkkit gebruiken' },
  pl: { closeStyles: 'Zamknij style', removeKit: 'Usuń zestaw z tej reklamy', kitOffConflict: 'Zestaw marki „{name}” nieużyty — ta reklama wygląda na inną markę.', kitOffUser: 'Zestaw marki usunięty z tej reklamy.', useKit: 'Użyj zestawu marki' },
  tr: { closeStyles: 'Stilleri kapat', removeKit: 'Kiti bu reklamdan kaldır', kitOffConflict: '“{name}” marka kiti kullanılmadı — bu reklam başka bir markaya ait görünüyor.', kitOffUser: 'Marka kiti bu reklamdan kaldırıldı.', useKit: 'Marka kitini kullan' },
  ru: { closeStyles: 'Закрыть стили', removeKit: 'Убрать набор из этой рекламы', kitOffConflict: 'Набор бренда «{name}» не применён — эта реклама похожа на другой бренд.', kitOffUser: 'Набор бренда убран из этой рекламы.', useKit: 'Применить набор бренда' },
  uk: { closeStyles: 'Закрити стилі', removeKit: 'Прибрати набір із цієї реклами', kitOffConflict: 'Набір бренду «{name}» не застосовано — ця реклама схожа на інший бренд.', kitOffUser: 'Набір бренду прибрано з цієї реклами.', useKit: 'Застосувати набір бренду' },
  ar: { closeStyles: 'إغلاق الأنماط', removeKit: 'إزالة الهوية من هذا الإعلان', kitOffConflict: 'لم تُستخدم هوية العلامة «{name}» — يبدو هذا الإعلان لعلامة أخرى.', kitOffUser: 'أُزيلت هوية العلامة من هذا الإعلان.', useKit: 'استخدام هوية العلامة' },
  ur: { closeStyles: 'اسٹائل بند کریں', removeKit: 'اس اشتہار سے کِٹ ہٹائیں', kitOffConflict: 'برانڈ کِٹ “{name}” استعمال نہیں ہوئی — یہ اشتہار کسی اور برانڈ کا لگتا ہے۔', kitOffUser: 'اس اشتہار سے برانڈ کِٹ ہٹا دی گئی۔', useKit: 'برانڈ کِٹ استعمال کریں' },
  hi: { closeStyles: 'स्टाइल बंद करें', removeKit: 'इस विज्ञापन से किट हटाएँ', kitOffConflict: 'ब्रांड किट “{name}” इस्तेमाल नहीं हुई — यह विज्ञापन किसी दूसरे ब्रांड का लगता है।', kitOffUser: 'इस विज्ञापन से ब्रांड किट हटा दी गई।', useKit: 'ब्रांड किट इस्तेमाल करें' },
  id: { closeStyles: 'Tutup gaya', removeKit: 'Hapus kit dari iklan ini', kitOffConflict: 'Kit merek “{name}” tidak dipakai — iklan ini tampak untuk merek lain.', kitOffUser: 'Kit merek dihapus dari iklan ini.', useKit: 'Pakai kit merek' },
  vi: { closeStyles: 'Đóng phong cách', removeKit: 'Bỏ bộ nhận diện khỏi quảng cáo này', kitOffConflict: 'Không dùng bộ nhận diện “{name}” — quảng cáo này có vẻ của thương hiệu khác.', kitOffUser: 'Đã bỏ bộ nhận diện khỏi quảng cáo này.', useKit: 'Dùng bộ nhận diện' },
}

/** As frases na língua da interface (língua desconhecida = inglês). */
export function adsPalcoVoltarCopy(language: InterfaceLanguage | string | null | undefined): AdsPalcoVoltarCopy {
  return (typeof language === 'string' && (ADS_PALCO_VOLTAR_COPY as Record<string, AdsPalcoVoltarCopy>)[language]) || ADS_PALCO_VOLTAR_COPY.en
}
