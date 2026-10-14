'use client'
// KINEO-ADS-QUADRO-STUDIO-1510 — fundador 15/10, comparando os prints do Studio de filmes ("Make a film", /studio) e do Studio
// Ads (/ads/v2): (1) o fundo cinza chapado, quando o Studio tem o degradê verde-azulado; (2) a tipografia "menos desenhada";
// (3) o formulário LONGO. Este arquivo é só apresentação do quadro curto da aba "Um anúncio" (modo simples):
//   · ADS_QUADRO_TINT_CSS — o Ads veste o MESMO par de cores do Studio (STAGE_TINT.seedance de StudioClient.tsx, o motor de
//     entrada do Studio — o Studio, o kit e o ProductStage NÃO foram mexidos; o guardião test-ads-quadro-studio-1510 lê o par
//     direto do StudioClient e fica vermelho se os dois divergirem): o <main> pinta o degradê pela regra de components/
//     ProductStage (main:has(.kps-page)) e a barra lateral vira a mesma;
//   · ADS_QUADRO_STUDIO_CSS — o quadro com as classes REAIS do kit do Studio (.lab/.n, .pill/.pill.on, .mdlbtn, textarea do
//     .stu, .go.ok/.go.no, .gnote) e os valores MEDIDOS no /studio (estilo computado, Edge sem cabeça, 1440×900): título
//     34/500/-.035em com 4px embaixo; subtítulo 15/1.6 na cor --muted com 14px; abas Filme/Clipe = 14px/400, 44px de alto,
//     padding 10×18, raio 10, a ativa em --accent-soft/--accent com borda --border2, a linha de baixo em --border; rótulo
//     13/650/+.01em em --text2 com o chip .n 18×18; pílulas 11.5px, 40px, raio 10; caixa de texto branca, padding 18, raio 12,
//     linha 1.65; botão 15/700/-.01em, 54px, raio 12; cartão opcional = o "Your logo · optional" do Studio (padding 14, borda
//     --border, raio 13, fundo --card2, título 13/700 com "· opcional" 500 a 70%);
//   · QuadroStyleRow — a fileira de 5 miniaturas do passo 3 (a sugerida primeiro). Escolher = o MESMO setStyleChoice de sempre.
// Nada aqui chama rota, cobra, decide preço ou monta corpo de pedido. Texto só pelas frases (16 línguas).
// Os <style> deste quadro entram por dangerouslySetInnerHTML (">" no seletor quebra a hidratação). Os componentes compartilhados
// (ProductStage, AdsFlow, studioKit) e o Studio de filmes não mudam: tudo aqui é sobrescrita escopada em .stu.adv2.adv2q.
import { ADS_V2_STYLES, type AdsV2StyleChoice, type AdsV2StyleCopy, type AdsV2StyleKey } from '@/lib/ads/v2Styles'

/** = STAGE_TINT.seedance em app/(dashboard)/studio/StudioClient.tsx (o fundo verde-azulado do "Make a film"). */
export const ADS_QUADRO_STAGE_TINT: readonly [string, string] = ['#10B981', '#06B6D4']
const [QA, QB] = ADS_QUADRO_STAGE_TINT

/** O par do Studio sobre o par do Ads (mesma especificidade, vem depois do TINT do ProductStage): só enquanto o /ads/v2 está montado. */
export const ADS_QUADRO_TINT_CSS = `html[data-studio-stage="ads"]{--stage-a:${QA};--stage-b:${QB}}`

export const ADS_QUADRO_STUDIO_CSS = `
html .stu.adv2.adv2q{padding:30px 34px 60px}
html .stu.adv2.adv2q .adsw-header{margin:0;max-width:none}
html .stu.adv2.adv2q .adsw-header h1{font-size:clamp(28px,2.5vw,34px);font-weight:var(--type-title-weight,500);letter-spacing:-.035em;line-height:1.2;margin:0 0 4px}
html .stu.adv2.adv2q .adsw-header .sub{color:var(--muted);font-size:15px;line-height:1.6;margin:0 0 14px;max-width:820px}
html .stu.adv2.adv2q .adv2-head>div:first-child{display:flex;flex-wrap:wrap;align-items:stretch;min-width:0}
html .stu.adv2.adv2q .adv2-head>div:first-child>*{flex:0 0 100%}
html .stu.adv2.adv2q .adv2-head>div:first-child>.adv2f-tabs{flex:0 0 auto}
html .stu.adv2.adv2q .adv2-head>div:first-child>.adv2-classic{flex:1 1 auto;display:flex;align-items:center;justify-content:flex-end;margin:0 0 18px;padding:5px 0 10px 12px;border-bottom:1px solid var(--border);font-size:12.5px}
html .stu.adv2.adv2q .adv2f-tabs{display:flex;flex-wrap:wrap;gap:8px;width:auto;max-width:none;margin:0 0 18px;padding:5px 5px 10px;border:0;border-bottom:1px solid var(--border);border-radius:0;background:transparent}
html .stu.adv2.adv2q .adv2f-tabs a{display:inline-flex;align-items:center;min-height:44px;padding:10px 18px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--muted);font-family:inherit;font-size:14px;font-weight:400;letter-spacing:normal}
html .stu.adv2.adv2q .adv2f-tabs a:hover{background:#ffffff08;color:var(--muted)}
html .stu.adv2.adv2q .adv2f-tabs a[aria-current=page]{background:var(--accent-soft);color:var(--accent);border-color:var(--border2)}
html .stu.adv2.adv2q .adv2q-step+.adv2q-step{margin-top:12px}
html .stu.adv2.adv2q .adv2q-step h2.lab{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-family:var(--font-display),var(--font-inter),sans-serif;font-size:13px;font-weight:650;line-height:1.5;letter-spacing:.01em;text-transform:none;color:var(--text2)}
html .stu.adv2.adv2q .adv2q-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px;min-width:0}
html .stu.adv2.adv2q .adv2q-head>h2.lab{margin:0}
html .stu.adv2.adv2q .adv2q-head .row{flex-wrap:nowrap;gap:6px}
html .stu.adv2.adv2q .pill{font-size:11.5px;font-weight:500;letter-spacing:.01em;min-height:36px;padding:7px 12px}
html .stu.adv2.adv2q .adv2q-box.mdlbtn{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;cursor:default;padding:12px 14px;border-radius:16px;background:var(--card);border:1px solid var(--border);color:var(--text)}
html .stu.adv2.adv2q .adv2q-box>*{flex:0 0 100%;min-width:0;order:4}
html .stu.adv2.adv2q .adv2q-box>.adv2f-link{order:1}
html .stu.adv2.adv2q .adv2q-box>.adv2f-read{order:2;margin:0}
html .stu.adv2.adv2q .adv2q-box>.adv2f-or{order:3;flex:0 0 auto;margin:0;font-size:12px;font-weight:500}
html .stu.adv2.adv2q .adv2q-box>.adv2f-or::before{display:none}
html .stu.adv2.adv2q .adv2q-box>.adv2f-or::after{display:none}
html .stu.adv2.adv2q .adv2q-box>.adv2q-drop{order:3;flex:1 1 0}
html .stu.adv2.adv2q .adv2q-box>:is(.adsw-hint,.adsw-warn){margin:0}
html .stu.adv2.adv2q .adv2q-box.mdlbtn:hover{border-color:var(--border)}
html .stu.adv2.adv2q .adv2q-box .adv2f-link{margin:0;padding:0;border:0;background:none;gap:6px}
html .stu.adv2.adv2q .adv2q-box .adv2f-stores{display:none}
html .stu.adv2.adv2q .adv2q-box .adv2f-link .adv2s-linkrow input{height:40px;min-height:0;padding:8px 14px;font-size:15px;border-radius:12px;background:var(--card)}
html .stu.adv2.adv2q .adv2q-box .adv2f-link .adv2s-linkrow .adsw-btn{min-height:40px;border-radius:12px}
html .stu.adv2.adv2q .adv2q-box .adv2f-link>small{font-size:11.5px;line-height:1.45;color:var(--muted)}
html .stu.adv2.adv2q .adv2q-box .adv2f-link:has(input:placeholder-shown)>small{display:none}
html .stu.adv2.adv2q .adv2q-box>.adsw-lead{display:none}
html .stu.adv2.adv2q .adv2q-drop .adv2s-drop{display:flex;align-items:center;justify-content:center;gap:8px;padding:2px;border-width:1px;border-radius:12px;background:var(--bg)}
html .stu.adv2.adv2q .adv2q-drop .adv2s-drop>span[aria-hidden]{display:none}
html .stu.adv2.adv2q .adv2q-drop .adv2s-drop b{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
html .stu.adv2.adv2q .adv2q-drop .adv2s-drop[data-over=true] b{position:static;width:auto;height:auto;clip:auto;font-size:13px}
html .stu.adv2.adv2q .adv2q-drop .adv2s-drop small{display:none}
html .stu.adv2.adv2q .adv2q-drop .adv2s-drop .adv2-add{width:100%;min-height:32px;padding:6px 14px;font-size:13px;border:0;border-radius:9px;background:transparent}
html .stu.adv2.adv2q .adv2q-box .adv2f-link>label,html .stu.adv2.adv2q .adv2q-sr,html .stu.adv2.adv2q .adv2q-text>span,html .stu.adv2.adv2q .adv2q-text>small,html .stu.adv2.adv2q .adv2s-scene>label,html .stu.adv2.adv2q .adv2s-kind>span{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
html .stu.adv2.adv2q .adv2q-text{margin:0}
html .stu.adv2.adv2q textarea.adv2q-prompt{display:block;width:100%;height:72px;min-height:64px;padding:11px 18px;border-radius:12px;background:var(--card);border:1px solid var(--border);color:var(--text);font-size:15px;line-height:1.65;resize:vertical}
html .stu.adv2.adv2q textarea.adv2q-prompt:focus{border-color:var(--accent)}
html .stu.adv2.adv2q .adv2s-scene{margin:8px 0 0}
html .stu.adv2.adv2q .adv2s-scene>small{display:none}
html .stu.adv2.adv2q .adv2s-scene:has(input:disabled)>small{display:block;margin:0 0 6px;font-size:12px}
html .stu.adv2.adv2q .adv2s-scene input{height:40px;min-height:0;padding:8px 14px;border-radius:12px;background:var(--card);font-size:14px}
html .stu.adv2.adv2q .adv2s-chips{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0 0;font-size:12px;color:var(--muted)}
html .stu.adv2.adv2q .adv2s-chips button{min-height:30px;padding:4px 11px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--text2);font-family:inherit;font-size:11.5px;font-weight:500;cursor:pointer}
html .stu.adv2.adv2q .adv2s-chips button:hover:not(:disabled){border-color:var(--border2);background:var(--card2)}
html .stu.adv2.adv2q .adv2s-lang{display:flex;align-items:center;gap:8px;margin:10px 0 0;font-size:12.5px;color:var(--muted)}
html .stu.adv2.adv2q .adv2s-lang select{width:auto;min-height:34px;padding:4px 10px;border-radius:10px;font-size:13px}
html .stu.adv2.adv2q :is(.adv2s-movescene,.adv2s-voiceask){margin:6px 0 0;font-size:11.5px;line-height:1.45}
html .stu.adv2.adv2q .adv2s-movescene .adsw-btn{display:inline;min-height:0;padding:0;border:0;background:none;box-shadow:none;color:var(--accent);font-size:11.5px;font-weight:650;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
html .stu.adv2.adv2q .adv2s-kit{margin:0 0 10px}
.adv2q-styles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;min-width:0}
.adv2q-styles button{position:relative;display:grid;gap:5px;min-width:0;padding:4px 4px 6px;border:1px solid var(--border);border-radius:12px;background:var(--card);color:var(--text2);font-family:inherit;text-align:center;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.adv2q-styles button:hover:not(:disabled){border-color:var(--border2)}
.adv2q-styles button[aria-pressed=true]{border-color:var(--indigo);box-shadow:0 0 0 1px var(--indigo);color:var(--text)}
.adv2q-styles button:disabled{opacity:.55;cursor:not-allowed}
.adv2q-styles button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.adv2q-styles .m{display:block;aspect-ratio:16/11;border-radius:9px;overflow:hidden;background:var(--card2)}
.adv2q-styles .m img{display:block;width:100%;height:100%;object-fit:cover}
.adv2q-styles .m.auto{display:grid;place-items:center;font-size:20px;color:var(--muted)}
.adv2q-styles .nm{font-size:11px;font-weight:600;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.adv2q-styles .tg{position:absolute;left:8px;right:8px;top:8px;padding:1px 4px;border-radius:99px;background:var(--indigo);color:var(--on-accent,#fff);font-size:9px;font-weight:750;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
html .stu.adv2.adv2q .adv2q-go{margin-top:16px}
html .stu.adv2.adv2q .adv2q-go .go{display:block;width:100%;min-height:54px;padding:15px 0;border-radius:12px;font-family:var(--font-display),var(--font-inter),sans-serif;font-size:15px;font-weight:700;line-height:24px;letter-spacing:-.01em}
html .stu.adv2.adv2q .adv2q-go .go.no{cursor:pointer}
html .stu.adv2.adv2q .adv2q-go .gnote{margin:9px 0 0;font-size:12px;line-height:1.6;color:var(--muted);text-align:center}
html .stu.adv2.adv2q :is(.adv2q-opt,.adv2s-more){margin:12px 0 0;padding:0 14px;border:1px solid var(--border);border-radius:13px;background:var(--card2);box-shadow:none}
html .stu.adv2.adv2q :is(.adv2q-opt,.adv2s-more)>summary{display:flex;align-items:center;gap:6px;min-height:46px;padding:0;cursor:pointer;list-style:none;font-family:inherit;font-size:13px;font-weight:700;letter-spacing:normal;color:var(--text)}
html .stu.adv2.adv2q :is(.adv2q-opt,.adv2s-more)>summary::-webkit-details-marker{display:none}
html .stu.adv2.adv2q :is(.adv2q-opt,.adv2s-more)>summary::after{content:'';margin-inline-start:auto;width:7px;height:7px;border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:rotate(45deg) translateY(-2px);transition:transform .15s}
html .stu.adv2.adv2q :is(.adv2q-opt,.adv2s-more)[open]>summary::after{transform:rotate(225deg) translateY(-2px)}
html .stu.adv2.adv2q :is(.adv2q-opt,.adv2s-more)>summary .o{font-weight:500;opacity:.7}
html .stu.adv2.adv2q :is(.adv2q-opt,.adv2s-more)>summary .v{font-weight:500;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
html .stu.adv2.adv2q :is(.adv2q-opt,.adv2s-more)[open]{padding-bottom:14px}
html .stu.adv2.adv2q :is(.adv2q-opt,.adv2s-more) .kst-pick{margin-top:6px}
html .stu.adv2.adv2q .adv2q-opt .adv2-tiers{margin-top:4px}
html .stu.adv2.adv2q .adv2s-more+#adv2s-sec4{margin-top:22px}
html .stu.adv2.adv2q #adv2s-sec4>h2{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-size:13px;font-weight:650;line-height:1.5;letter-spacing:.01em;color:var(--text2)}
html .stu.adv2.adv2q #adv2s-sec4>h2 .adv2-num{width:18px;height:18px;font-size:10px}
@media(max-width:900px){
 html .stu.adv2.adv2q{padding:22px 14px 96px}
 html .stu.adv2.adv2q .adv2-head>div:first-child>.adv2-classic{flex:0 0 100%;justify-content:flex-start;margin:-10px 0 14px;padding:0;border:0}
 html .stu.adv2.adv2q .adv2f-tabs{flex:0 0 100%!important;margin-bottom:14px}
 html .stu.adv2.adv2q .adv2f-tabs a{padding:10px 14px}
 html .stu.adv2.adv2q .pill{min-height:40px}
 html .stu.adv2.adv2q textarea.adv2q-prompt{font-size:16px;padding:14px 15px}
 html .stu.adv2.adv2q .adv2q-go .go{font-size:16px}
}
@media(max-width:420px){html .stu.adv2.adv2q .adv2q-head{flex-wrap:wrap}.adv2q-styles .tg{font-size:8.5px}}
@media(prefers-reduced-motion:reduce){.adv2q-styles button{transition:none}}
`

/** As 5 miniaturas do passo 3: a sugerida primeiro, depois a escolhida, "Auto" e as primeiras da lista (sem repetir). */
export function quadroStylePicks(value: AdsV2StyleChoice, suggested: AdsV2StyleChoice, max = 5): AdsV2StyleChoice[] {
  const out: AdsV2StyleChoice[] = []
  for (const k of [suggested, value, 'none' as AdsV2StyleChoice, ...ADS_V2_STYLES.map((s) => s.key as AdsV2StyleChoice)]) {
    if (!out.includes(k)) out.push(k)
    if (out.length >= max) break
  }
  return out
}

export function QuadroStyleRow({
  value,
  suggested,
  onChange,
  disabled,
  copy,
  labelledBy,
}: {
  value: AdsV2StyleChoice
  suggested: AdsV2StyleChoice
  onChange: (next: AdsV2StyleChoice) => void
  disabled: boolean
  copy: AdsV2StyleCopy
  labelledBy: string
}) {
  return (
    <div className="adv2q-styles" role="group" aria-labelledby={labelledBy} data-kineo="ads-quadro-styles">
      {quadroStylePicks(value, suggested).map((k) => {
        const spec = k !== 'none' ? ADS_V2_STYLES.find((s) => s.key === k) ?? null : null
        const label = spec ? copy.styles[k as AdsV2StyleKey].label : copy.autoLabel
        return (
          <button key={k} type="button" aria-pressed={value === k} disabled={disabled} title={label} onClick={() => onChange(k)}>
            {suggested === k && k !== 'none' ? <span className="tg">{copy.suggested}</span> : null}
            {spec ? (
              // eslint-disable-next-line @next/next/no-img-element
              <span className="m"><img src={spec.poster} alt="" loading="lazy" /></span>
            ) : (
              <span className="m auto" aria-hidden="true">∅</span>
            )}
            <span className="nm">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
