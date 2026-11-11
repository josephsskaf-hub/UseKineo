// KINEO-MENU-CELULAR-VITRINE-1111 [dono 11/11: "dá uma olhada em todas, verificar as que tiverem ruim você conserta de uma vez"] — em
// /examples e /made-with-kineo, no celular (≤ 700 px), o menu do topo ocupava 3 linhas e empurrava a vitrine para baixo. Vira UMA linha que
// desliza para o lado: todos os itens seguem lá, na mesma ordem e com os mesmos links. Fica fora do CSS do módulo de propósito (aquele
// arquivo tem guardião de camada exata, scripts/test-menu-uniforme-2810.mjs). Acima de 700 px nada muda.
const NAV = 'header nav[data-nav-surface="top"][data-nav-area="public"]'
export const MENU_CELULAR_VITRINE_CSS = `@media(max-width:700px){${NAV}{flex-wrap:nowrap!important;justify-content:flex-start!important;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding-top:12px!important;padding-bottom:2px}${NAV}::-webkit-scrollbar{display:none}${NAV} a{white-space:nowrap;flex:0 0 auto}}`
