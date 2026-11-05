// KINEO-IMAGES-TELA-0511 [fundador 05/11: "todas as telas de criação seguem o mesmo esqueleto"; 04/11: "dar já o botão para a pessoa gerar sem escolher"]
// A tela /images no esqueleto do /kids-cartoon: entrada primeiro, um botão principal, preço só nele, opcionais recolhidos. Só ordem e apresentação.
// Puro: sem env, sem rede. Guardião: scripts/test-images-tela-0511.mjs.
import { REGRAS_DO_ANUNCIO } from '@/lib/kidsCartoon/telaCartoon'

/**
 * O texto do botão principal, com o preço do motor escolhido quando há o que cobrar.
 * Recebe o texto já traduzido; a seta (→ ou ← em língua da direita para a esquerda) continua sendo a última coisa.
 */
export function rotuloDoBotaoImagem(texto: string, creditos: string, comPreco: boolean): string {
  if (!comPreco) return texto
  const seta = texto.match(/\s*([→←])\s*$/)
  return seta ? `${texto.slice(0, seta.index)} · ${creditos} ${seta[1]}` : `${texto} · ${creditos}`
}

/** O "Settings" recolhido: as mesmas regras do Cartoon e do anúncio, lidas da origem para não ficarem diferentes em silêncio. */
const REGRAS_DO_RECOLHIDO = REGRAS_DO_ANUNCIO.filter((r) => /^\.ace-(change|more|open-body)/.test(r))

export const IMAGES_TELA_CSS = REGRAS_DO_RECOLHIDO.join('') + `
.images-form{--ace-accent:var(--accent,#4062e8);--ace-line:var(--border,#d9dedb);--ace-card:var(--card,#fff);--ace-text:var(--text,#1f2c28);display:grid;gap:18px;min-width:0;color:var(--ace-text)}
.stu.images-workspace .kps-panel .images-form .creation-input{padding:0;background:transparent;border:0}
.stu.images-workspace .ace-open-body .card{background:transparent;border-width:1px 0 0;border-radius:0;padding:14px 0 4px}
.stu.images-workspace .kps-grid{grid-template-columns:minmax(0,1fr)}
.stu.images-workspace .kps-stage{position:relative;top:auto;order:0}
.stu.images-workspace .creation-results:empty{display:none}
.stu.images-workspace .kps-row h2{margin-bottom:14px}
.images-go{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.stu.images-workspace .images-go .go{width:auto;min-width:280px;min-height:0;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 26px;border:1px solid var(--accent,#0A5CFF);border-radius:11px;background:var(--accent,#0A5CFF);color:#fff;font:inherit;font-size:16px;font-weight:750;letter-spacing:normal;box-shadow:none;transform:none}
.stu.images-workspace .images-go .go.no{opacity:.55;cursor:not-allowed}
@media(min-width:901px){.stu.images-workspace .kps-hero.is-wide .kps-frame{width:auto;max-width:100%;height:calc(100% - 120px);align-self:center}}
@media(max-width:760px){.stu.images-workspace .images-go .go{width:100%;min-width:0}}
@media(max-width:560px){.stu.images-workspace .kps-panel .image-engines{grid-template-columns:repeat(2,minmax(0,1fr))}}
`
