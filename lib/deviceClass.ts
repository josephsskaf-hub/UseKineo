// KINEO-APARELHO-VISITA-0411 — fundador 04/11: "de todos os acessos, quantos são por celular e quantos são por computador".
// A régua que os downloads já usavam, agora também na visita. Tablet conta como celular. Nunca lança.
export function deviceClass(): 'mobile' | 'desktop' | 'unknown' {
  try {
    if (typeof navigator === 'undefined') return 'unknown'
    const ua = navigator.userAgent || ''
    if (/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua)) return 'mobile'
    // iPadOS 13+ se apresenta como Mac; o toque desempata.
    if (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document) return 'mobile'
    return 'desktop'
  } catch {
    return 'unknown'
  }
}
