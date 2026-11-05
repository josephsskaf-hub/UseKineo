// KINEO-CARTOON-TELA-0411 [fundador 05/11: "Publica ela da mesma forma na tela dos cartoons ... Não tem esses packs mais, a pessoa escolhe e vamos embora"]
// A tela /kids-cartoon no estilo da tela nova de anúncios (AdsV2Escolha): mesmas classes, mesmos tokens, mesma grade.
// Por que uma cópia das regras, e não um import: AdsV2Escolha.tsx arrasta upload, compra avulsa e o fluxo inteiro do anúncio para o pacote do desenho.
// Regras copiadas sem mudar um caractere. O guardião scripts/test-cartoon-tela-0411.mjs reprova se alguma deixar de existir igual na origem:
// mudou lá, a tela do desenho avisa em vez de ficar diferente em silêncio.
// Puro: sem env, sem rede.

/** Regras de AdsV2Escolha.tsx (ADS_ESCOLHA_CSS e PRODUTO_PRIMEIRO_CSS), iguais às da origem. */
export const REGRAS_DO_ANUNCIO: readonly string[] = [
  '.ace{--ace-accent:var(--accent,#4062e8);--ace-line:var(--border,#d9dedb);--ace-card:var(--card,#fff);--ace-text:var(--text,#1f2c28);color:var(--ace-text);display:grid;gap:18px;min-width:0}',
  '.ace *{box-sizing:border-box}',
  '.ace h2,.ace h3,.ace p{margin:0}',
  '.ace h2{font-size:22px;letter-spacing:-.03em}',
  '.ace p,.ace small{line-height:1.5}',
  '.ace small,.ace .muted{color:var(--muted,#65756f)}',
  '.ace-card{padding:22px;border:1px solid var(--ace-line);border-radius:20px;background:var(--ace-card);display:grid;gap:14px;min-width:0}',
  '.ace-step{display:flex;align-items:center;gap:10px;font-size:17px;font-weight:760}',
  '.ace-step b{display:grid;place-items:center;width:27px;height:27px;background:color-mix(in srgb,var(--ace-accent) 12%,var(--ace-card));color:var(--ace-accent);border-radius:50%;font-size:13px}',
  '.ace-tag{width:max-content;max-width:100%;font-size:11px;font-weight:760;letter-spacing:.07em;text-transform:uppercase;color:var(--ace-accent)}',
  '.ace-faces{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin:0;padding:0;border:0}',
  '.ace-radio{position:relative;display:grid;gap:7px;cursor:pointer;padding:5px;border:1px solid var(--ace-line);border-radius:13px;min-width:0;background:var(--ace-card)}',
  '.ace-radio[data-selected=true]{border-color:var(--ace-accent);box-shadow:0 0 0 2px var(--ace-accent)}',
  '.ace-radio:focus-within{outline:3px solid var(--ace-accent);outline-offset:3px}',
  '.ace-radio input{position:absolute;opacity:0;width:1px;height:1px}',
  '.ace-radio img{width:100%;display:block;aspect-ratio:3/4;object-fit:cover;object-position:50% 20%;border-radius:9px}',
  '.ace-radio strong{font-size:12px;padding:0 3px 3px}',
  '.ace-check{position:absolute;right:8px;top:8px;display:grid;place-items:center;width:21px;height:21px;background:var(--ace-accent);color:#fff;border-radius:50%;font-size:12px}',
  '.ace-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
  '.ace-field{display:grid;gap:6px;min-width:0;font-size:13px;font-weight:650}',
  '.ace-field input,.ace-field textarea,.ace-field select{font:inherit;font-weight:450;color:var(--ace-text);border:1px solid var(--ace-line);border-radius:10px;background:var(--ace-card);padding:11px 12px;max-width:100%;width:100%;min-width:0}',
  '.ace-field textarea{resize:vertical;line-height:1.5}',
  '.ace-field input:focus,.ace-field textarea:focus,.ace-field select:focus{outline:2px solid var(--ace-accent);outline-offset:2px}',
  '.ace-full{grid-column:1/-1}',
  '.ace-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}',
  '.ace button{font:inherit;cursor:pointer;min-height:43px;padding:11px 17px;border-radius:11px;font-size:13px;font-weight:750;border:1px solid var(--ace-line);background:var(--ace-card);color:var(--ace-text)}',
  '.ace button.primary{background:var(--ace-accent);border-color:var(--ace-accent);color:#fff}',
  '.ace button:disabled,.ace input:disabled,.ace select:disabled,.ace textarea:disabled{opacity:.55;cursor:not-allowed}',
  '.ace button:focus-visible{outline:3px solid var(--ace-accent);outline-offset:3px}',
  '.ace-error{padding:13px;border:1px solid #bd6c64;background:color-mix(in srgb,#bd6c64 9%,var(--ace-card));border-radius:11px;line-height:1.5;overflow-wrap:anywhere}',
  '.ace-stage{padding:22px;border:1px solid var(--border,#d9dedb);border-radius:22px;background:var(--card,#fff);color:var(--text,#1f2c28);display:grid;gap:14px;position:sticky;top:25px}',
  '.ace-stage h3{font-size:17px;margin:0}',
  '.ace-stage p{margin:0;color:var(--muted,#65756f);font-size:12px;line-height:1.6}',
  '.ace-stage-media{aspect-ratio:9/16;max-height:600px;width:100%;background:var(--card2,#e7ece7);border-radius:15px;overflow:hidden;position:relative;display:grid;place-items:center}',
  '.ace-stage-media>img,.ace-stage-media>video{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}',
  '.ace-stage-label{position:absolute;left:13px;top:13px;right:13px;border-radius:8px;background:#fffE;color:#24382e;font-size:11px;padding:7px 9px}',
  '.ace button[aria-pressed=true]{border-color:var(--ace-accent);box-shadow:0 0 0 1px var(--ace-accent)}',
  '.ace-hint{font-size:12px;color:var(--muted,#65756f)}',
  '@media(max-width:700px){.ace-plans{grid-template-columns:1fr}.ace-card{padding:17px;border-radius:16px}.ace-faces{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.ace-fields{grid-template-columns:1fr}.ace-scenes{grid-template-columns:repeat(2,minmax(0,1fr))}.ace-stills{grid-template-columns:repeat(2,minmax(0,1fr))}.ace h2{font-size:21px}.ace-stage{position:static}.ace-actions button{flex:1 1 auto}}',
  '@media(prefers-reduced-motion:reduce){.ace *{scroll-behavior:auto!important}}',
  '.ace-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border:1px solid var(--ace-line);border-radius:13px;background:var(--ace-card)}',
  '.ace .ace-seg button{min-height:36px;padding:7px 8px;border:0;border-radius:9px;font-size:13px;background:transparent}',
  '.ace .ace-seg button[aria-pressed=true]{background:color-mix(in srgb,var(--ace-accent) 12%,var(--ace-card));color:var(--ace-accent);box-shadow:none}',
  '.ace-change,.ace-more{border:1px solid var(--ace-line);border-radius:12px;background:var(--ace-card);min-width:0}',
  '.ace-change>summary,.ace-more>summary{display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;list-style:none;font-size:13px;min-height:44px}',
  '.ace-change>summary::-webkit-details-marker,.ace-more>summary::-webkit-details-marker{display:none}',
  '.ace-change>summary:focus-visible,.ace-more>summary:focus-visible{outline:3px solid var(--ace-accent);outline-offset:3px;border-radius:12px}',
  '.ace-open-body{display:grid;gap:12px;padding:6px 12px 14px;min-width:0}',
  '.ace-open-body h4{margin:0;font-size:13px}',
  '.ace-more-list{color:var(--muted,#65756f);font-size:12px;min-width:0}',
  '.ace-stage-media>.ace-stage-portrait{object-position:50% 20%}',
]

/** Regras do cabeçalho de AdsV2Client.tsx (ADS_V2_CSS), iguais às da origem. */
export const REGRAS_DO_CABECALHO: readonly string[] = [
  '.adv2 .adv2-head{display:flex;flex-wrap:wrap;gap:14px 24px;align-items:flex-start;justify-content:space-between;max-width:none}',
  '.adv2 .adv2-head>div:first-child{min-width:0;flex:1 1 320px}',
]

/** O que só o desenho precisa. A diferença de propósito (fundador 05/11: "seguir o mesmo padrão, mas ter um pouco de diferença"): aqui a escolha do personagem é a estrela, com retratos grandes. */
const REGRAS_DO_DESENHO = `
@media(min-width:901px){.kkc .kps-grid{grid-template-columns:minmax(0,1.9fr) minmax(280px,1fr)}}
.kkc .adv2s-slot{min-width:0}
.kkc .ace-stage-media{aspect-ratio:1/1;max-height:460px}
.kkc .ace-stage-media>.ace-stage-portrait{object-position:50% 20%}
.kkc .ace-stage-label{right:auto}
.kkc .ace-faces{grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.kkc .ace-radio{grid-template-columns:minmax(0,1fr);padding:7px;gap:6px;border-radius:16px;text-align:center}
.kkc .ace-radio .kkc-face{display:block;width:100%;height:auto;background:none;border-radius:11px;overflow:hidden}
.kkc .ace-radio img{aspect-ratio:1/1;object-position:50% 30%;border-radius:11px}
.kkc .ace-radio strong{font-size:14px;padding:2px 2px 0}
.kkc .ace-radio small{font-size:11px;line-height:1.25;padding:0 2px 3px;overflow-wrap:anywhere}
.ace .kkc-chips{display:flex;flex-wrap:wrap;gap:8px}
.ace .kkc-chips button{min-height:36px;padding:7px 12px;font-weight:500}
.ace .ace-seg button{font-weight:600}
@media(max-width:700px){.kkc .ace-faces{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kkc .ace-radio{padding:5px}.kkc .ace-radio strong{font-size:12px}.kkc .ace-stage-media{aspect-ratio:auto;height:260px;max-height:none}}
`

export const KIDS_TELA_CSS = REGRAS_DO_CABECALHO.join('') + REGRAS_DO_ANUNCIO.join('') + REGRAS_DO_DESENHO

const COPY = {
  en: { tag: 'Your character', illustrative: 'Illustrative', more: 'More options', moreList: 'narration language, length', free: 'Your free episode is in the queue — it arrives by e-mail and here within about an hour.', err: 'Something went wrong. Please try again.', preview: 'Character preview' },
  pt: { tag: 'Seu personagem', illustrative: 'Ilustrativo', more: 'Mais opções', moreList: 'língua da narração, duração', free: 'Seu episódio grátis entrou na fila — chega por e-mail e aqui em cerca de uma hora.', err: 'Algo deu errado. Tente de novo.', preview: 'Prévia do personagem' },
  es: { tag: 'Tu personaje', illustrative: 'Ilustrativo', more: 'Más opciones', moreList: 'idioma de la narración, duración', free: 'Tu episodio gratis está en la cola — llega por e-mail y aquí en una hora aproximadamente.', err: 'Algo salió mal. Inténtalo de nuevo.', preview: 'Vista previa del personaje' },
} as const

/** Os textos que só esta tela usa: português e espanhol têm os seus; o resto segue em inglês, como kidsTemplateCopy. */
export function kidsTelaCopy(lang: string | null | undefined) {
  return lang === 'pt' ? COPY.pt : lang === 'es' ? COPY.es : COPY.en
}
