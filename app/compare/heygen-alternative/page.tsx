// KINEO-SEO-COMPARE-2026-07-11 — captura o padrão de URL "/compare/*" e
// canaliza pro sistema programático já indexado em /alternatives/heygen
// (evita conteúdo duplicado disputando a mesma keyword).
// #290 — KINEO-SEO-308-2026-08-23: era `redirect()`, que o Next serve como
// 307 TEMPORÁRIO. Redirecionamento temporário diz ao Google "a URL antiga
// continua sendo a boa, volte depois" — ele mantém as duas na fila e não
// consolida a autoridade dos links. `permanentRedirect()` responde 308 e
// transfere o sinal para a página canônica, que é a intenção declarada no
// comentário original desde 11/07 e nunca foi cumprida pelo código.
import { permanentRedirect } from 'next/navigation'

export default function CompareHeyGenRedirect() {
  permanentRedirect('/alternatives/heygen')
}
