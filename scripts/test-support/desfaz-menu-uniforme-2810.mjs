// KINEO-MENU-UNIFORME-2810 — DESFAZ, em memória, esta entrega (o menu do topo uniforme (home sem sublinhado/peso extra; cabeçalho claro sem cinza nem azul)) nos arquivos que ela MODIFICOU, para os guardiões que
// conferem arquivos BYTE A BYTE contra uma base anterior. Diff REVERSO exato (contexto 3, gerado por generate-rosto-cards-2810-undo.mjs
// menu-uniforme-2810): cada bloco de AGORA (moldurado por quebras de linha) aparece UMA vez e volta a ser o de ANTES. Arquivo fora da lista ou sem
// a marca volta igual. Camadas mais novas do mesmo arquivo saem ANTES desta.
export const MARCA = 'KINEO-MENU-UNIFORME-2810'
export const BASE = '1293fcb9f'
const DESFAZ = {"app/kineoLandingTheme.ts":[{"before":"   do topo (links e menus) usam a MESMA cor de texto; só o item atual ganha peso e o sublinhado azul. */\n.klp .nav-links>a,.klp .nav-links>.nd>summary { color:var(--txt); }\n.klp .nav-links .nav-primary::after { content:''; position:absolute; inset:auto 0 4px; height:2px; border-radius:2px; background:var(--home-action); }\n.klp .nav-right { justify-self:end; gap:12px; min-width:0; }\n.klp .nav-right .kineo-interface-language { color:var(--txt)!important; background:var(--card)!important; border-color:var(--line)!important; color-scheme:inherit!important; border-radius:8px!important; }\n.klp .nav-right .btn-w { border-radius:9px; }","now":"   do topo (links e menus) usam a MESMA cor de texto; só o item atual ganha peso e o sublinhado azul. */\n.klp .nav-links>a,.klp .nav-links>.nd>summary { color:var(--txt); }\n.klp .nav-links .nav-primary::after { content:''; position:absolute; inset:auto 0 4px; height:2px; border-radius:2px; background:var(--home-action); }\n/* KINEO-MENU-UNIFORME-2810 — fundador 28/10: os itens do menu do topo são IGUAIS, só o nome. \"Make a film\" e \"Product ads\" perdem a barra azul embaixo e o peso extra: mesma cor, mesmo peso (550), nenhum sublinhado; a seta do menu suspenso de \"Make a film\" fica. */\n.klp .nav-links .nav-primary { font-weight:550; } /* KINEO-MENU-UNIFORME-2810 */\n.klp .nav-links .nav-primary::after, html:not([data-theme=dark]) .klp .nav-links .nav-primary::after { content:none; display:none; } /* KINEO-MENU-UNIFORME-2810 */\n.klp .nav-right { justify-self:end; gap:12px; min-width:0; }\n.klp .nav-right .kineo-interface-language { color:var(--txt)!important; background:var(--card)!important; border-color:var(--line)!important; color-scheme:inherit!important; border-radius:8px!important; }\n.klp .nav-right .btn-w { border-radius:9px; }"}],"app/examples/ExamplesGallery.module.css":[{"before":".player video{width:100%;height:76dvh;object-fit:contain;border-radius:10px}\n.gallery .close{width:44px;height:44px}\n@media(max-width:700px){.dialogInner{grid-template-columns:1fr}.player{padding:8px}.player video{height:auto;max-height:62dvh}.gallery .previewInfo{padding:18px}}","now":".player video{width:100%;height:76dvh;object-fit:contain;border-radius:10px}\n.gallery .close{width:44px;height:44px}\n@media(max-width:700px){.dialogInner{grid-template-columns:1fr}.player{padding:8px}.player video{height:auto;max-height:62dvh}.gallery .previewInfo{padding:18px}}\n/* KINEO-MENU-UNIFORME-2810 — fundador 28/10: no cabeçalho claro (/made-with-kineo, /examples, /trending) todo item do topo é IGUAL — mesma cor escura do cabeçalho, mesmo peso, sem cinza e sem o azul da página atual. Só o nome. */\n.pageHeader .nav a,.pageHeader .nav a:hover,.pageHeader .nav a[aria-current=page],.pageHeader .nav .navPrimary{color:var(--public-nav-text);font-weight:550} /* KINEO-MENU-UNIFORME-2810 */"}]}
export const ARQUIVOS = Object.keys(DESFAZ)
export function semMenuUniforme2810(text, rel) {
  if (typeof text !== 'string') return text
  const original = text
  const hunks = DESFAZ[String(rel ?? '').replace(/\\/g, '/').replace(/^\.\//, '')]
  if (!hunks || !original.includes(MARCA)) return original
  const crlf = original.includes('\r\n')
  let s = '\n' + original.replace(/\r\n/g, '\n') + '\n'
  for (const h of hunks) {
    const parts = s.split('\n' + h.now + '\n')
    if (parts.length !== 2) throw new Error('semMenuUniforme2810: ' + rel + ' mudou fora da camada (' + (parts.length - 1) + 'x)')
    s = parts.join('\n' + h.before + '\n')
  }
  s = s.slice(1, -1)
  if (s.includes(MARCA)) throw new Error('semMenuUniforme2810: sobrou linha marcada em ' + rel)
  return crlf ? s.replace(/\n/g, '\r\n') : s
}
