// KINEO-HOME-CLIPES-EM-CIMA-2026-10-05 — fundador (05/10, 2ª rodada, sobre a home no ar): "a fileira de cards tem que vir
// em cima, com quatro… e daí depois entram os clips, dividido com os narrated films: quatro clips, quatro narrated films…
// escolher os quatro melhores… e daí já vai para Videos for business". Esta faixa é a METADE de clipes dessa vitrine: os 4
// melhores efeitos do catálogo (lib/clips/clipEffects; preço = a função de cobrança), na MESMA grade e no MESMO cartão dos
// 4 filmes narrados logo abaixo (a regra da home em app/kineoLandingTheme.ts para .featuredFour: 4 colunas iguais, altura
// clamp(320px,27vw,440px), espaço 18px, canto 16px; 2 colunas no celular; vídeo cobrindo o cartão, sombra embaixo, selo
// pequeno + título por cima, o 1º com título maior). Só aparece
// no braço clips_first do A/B; a página antiga do braço (ClipsFirstHome, com o hero de upload que o fundador reprovou)
// saiu do ar na 1ª rodada.
import type { CSSProperties } from 'react'
import Link from 'next/link'
import WallMedia from '@/components/WallMedia'
import { UiLabel } from '@/components/InterfaceLanguage'
import { clipsFirstEffectCards } from '@/components/home/ClipsFirstHome'
import type { ClipEffectKey } from '@/lib/clips/clipEffects'

/** Os 4 da vitrine, na ordem (o 1º é o cartão grande). O fundador escolheu a explosão de cor e o tênis girando; os outros
 *  dois são os efeitos novos que viralizam (bolsa que é bolo e despertador que derrete). */
export const HOME_CLIP_KEYS: readonly ClipEffectKey[] = ['color_burst', 'product_360', 'secret_cake', 'melt', 'zoom_out_earth'] // KINEO-HOME-REMODELA-2010 — + a Terra vista de longe (5º efeito)
// KINEO-HOME-REMODELA-2010 — fundador 20/10: "os clips, eu quero dobrar o número de clips". Os 4 efeitos de antes + 1 efeito + os 3 clipes de texto do
// KINEO-HOME-REMODELA-2010 — antigo card "Clips" de "More tools" (Seedance 1.5, 5 s, conta do fundador: tempestade no mar, rio de geleira, surfista) = 8.
// KINEO-HOME-REMODELA-2010 — Os 3 já estavam em public/previews/ (nada de render novo); levam ao /clips (texto → clipe), como o card levava.
export const HOME_TEXT_CLIPS: readonly { id: string; title: string; video: string; poster: string; focus: string }[] = [ // KINEO-HOME-REMODELA-2010
  { id: 'storm', title: 'Storm at sea', video: '/previews/promo-clips-storm.mp4', poster: '/posters/promo-clips-storm.webp', focus: '62% 50%' }, // KINEO-HOME-REMODELA-2010
  { id: 'glacier', title: 'Glacier river', video: '/previews/promo-clips-glacier.mp4', poster: '/posters/promo-clips-glacier.webp', focus: '50% 50%' }, // KINEO-HOME-REMODELA-2010
  { id: 'surf', title: 'Surfer on a wave', video: '/previews/promo-clips-surf.mp4', poster: '/posters/promo-clips-surf.webp', focus: '50% 50%' }, // KINEO-HOME-REMODELA-2010
] // KINEO-HOME-REMODELA-2010
/** KINEO-HOME-REMODELA-2010 — selo honesto dos 3 clipes de texto: o motor que de fato os fez. */
export const HOME_TEXT_CLIP_ENGINE = 'Seedance 1.5' // KINEO-HOME-REMODELA-2010

// Que faixa da prévia VERTICAL (9:16) aparece no cartão (~0,86 no computador: 65% da altura do vídeo). Conta do
// object-position: a janela visível começa em p × (1 − 0,655) da altura — o número põe o assunto no meio do cartão.
const FOCUS: Partial<Record<ClipEffectKey, string>> = {
  color_burst: '50% 21%',
  product_360: '50% 40%',
  secret_cake: '50% 58%',
  melt: '50% 52%',
  zoom_out_earth: '50% 36%',
  restore_old_photo: '50% 8%',
}

const CSS = `
.klp .kcs{padding:24px 0 4px}
.klp .kcs .home-business-heading{margin-bottom:6px}
.klp .kcs-sub{margin:0 0 16px;color:var(--muted);font-size:15px;line-height:1.45;max-width:680px}
.klp .kcs-grid{--film-height:clamp(320px,27vw,440px);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:var(--film-height);gap:18px} /* KINEO-HOME-REMODELA-2010 — 2 fileiras de 4 */
.klp .kcs-card{position:relative;display:block;min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:16px;background:#101821;color:#fff;text-decoration:none;isolation:isolate}
.klp .kcs-card:hover{border-color:var(--blue)}
.klp .kcs-card:focus-visible{outline:2px solid var(--home-action,#0A5CFF);outline-offset:4px}
.klp .kcs-md{position:absolute;inset:0;background-color:#101821;background-repeat:no-repeat;background-size:cover;background-position:var(--kcs-focus,50% 50%)}
.klp .kcs-md video{object-position:var(--kcs-focus,50% 50%)}
.klp .kcs-shade{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,transparent 42%,rgba(3,9,18,.85) 100%)}
.klp .kcs-copy{position:absolute;left:16px;right:16px;bottom:12px;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.klp .kcs-copy i{font-style:normal;font-size:8px;font-weight:650;letter-spacing:.8px;text-transform:uppercase;color:#c8ddf1}
.klp .kcs-copy b{font-size:15px;line-height:1.2;font-weight:600;letter-spacing:-.2px;color:#fff;text-wrap:balance}
.klp .kcs-card:first-child .kcs-copy{left:20px;bottom:20px;gap:6px}
.klp .kcs-card:first-child .kcs-copy b{font-size:clamp(22px,1.8vw,28px);line-height:1.15}
.klp .kcs-card:first-child .kcs-copy i{font-size:9px;letter-spacing:1.2px}
@media(max-width:800px){.klp .kcs-grid{height:auto;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.klp .kcs-card{height:clamp(240px,48vw,355px)}}
@media(max-width:700px){.klp .kcs{padding-top:16px}.klp .kcs-sub{font-size:14px;margin-bottom:12px}.klp .kcs-copy{left:10px;right:10px;bottom:10px}.klp .kcs-copy b,.klp .kcs-card:first-child .kcs-copy b{font-size:13px;line-height:1.25}.klp .kcs-copy i,.klp .kcs-card:first-child .kcs-copy i{font-size:7px;letter-spacing:.3px}.klp .kcs-card:first-child .kcs-copy{left:10px;bottom:10px}}
@media(max-width:800px){.klp .kcs-grid{grid-auto-rows:auto}} /* KINEO-HOME-REMODELA-2010 */
@media(max-width:560px){.klp .kcs-grid{gap:12px}.klp .kcs-card{height:clamp(200px,58vw,290px);border-radius:12px}} /* KINEO-HOME-REMODELA-2010 — 8 cartões: um pouco mais baixos no celular */
`

function mediaStyle(poster: string | undefined, focus: string | undefined): CSSProperties | undefined {
  if (!poster && !focus) return undefined
  const style: Record<string, string> = {}
  if (poster) style.backgroundImage = `url(${poster})`
  if (focus) style['--kcs-focus'] = focus
  return style as CSSProperties
}

export default function HomeClipsStrip({ signedIn }: { signedIn: boolean }) {
  const all = clipsFirstEffectCards(signedIn).filter((c) => c.effect.preview)
  // Cartão de um efeito fora do catálogo (ou sem prévia) simplesmente não entra — nunca um quadro vazio.
  const cards = HOME_CLIP_KEYS.map((key) => all.find((c) => c.effect.key === key)).filter((c): c is (typeof all)[number] => Boolean(c))
  const clipsHref = signedIn ? '/clips' : `/signup?redirect=${encodeURIComponent('/clips')}`
  return (
    <section className="kcs" aria-labelledby="home-clips-heading" data-home-section="clips">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">
        <div className="home-business-heading">
          <h2 id="home-clips-heading"><UiLabel>Clips</UiLabel></h2>
          <Link href={clipsHref} className="btn btn-ghost" data-home-cta="open_clips"><UiLabel>Open Clips</UiLabel> ↗</Link>
        </div>
        <p className="kcs-sub"><UiLabel>Short clips from a photo or one line — ready in about a minute.</UiLabel></p>
        <div className="kcs-grid">
          {cards.map((c) => (
            <Link
              key={c.effect.key}
              href={c.href}
              className="kcs-card"
              data-clip-effect={c.effect.key}
              data-home-cta="clip_effect"
              aria-label={`${c.effect.title} — ${c.engineLabel}`}
            >
              <div className="kcs-md" style={mediaStyle(c.effect.preview?.poster, FOCUS[c.effect.key])}>
                {c.effect.preview ? <WallMedia src={c.effect.preview.video} /> : null}
              </div>
              <span className="kcs-shade" aria-hidden="true" />
              <span className="kcs-copy">
                {/* KINEO-HOME-CLIPES-EM-CIMA-2026-10-05 (4ª rodada, fundador: "deixa os créditos aparecendo nos vídeos ou os
                    motores?") — sem crédito nem segundos no cartão: Higgsfield, PixVerse, Kling e Pika não mostram preço na
                    galeria (o preço aparece no botão de gerar — no nosso caso, na tela do /clips), e a regra da casa já era
                    "sem preço no menu, atrito antes da hora" (17/08) e "cards limpos, sem 5 s" (30/09). Fica só o motor:
                    selo honesto e sinal de qualidade (o mercado vende pelo nome do modelo). */}
                <i>{c.engineLabel}</i>
                <b><UiLabel>{c.effect.title}</UiLabel></b>
              </span>
            </Link>
          ))}
          {HOME_TEXT_CLIPS.map((c) => ( // KINEO-HOME-REMODELA-2010
            <Link key={c.id} href={clipsHref} className="kcs-card" data-clip-text={c.id} data-home-cta="clip_text" aria-label={`${c.title} — ${HOME_TEXT_CLIP_ENGINE}`}>{/* KINEO-HOME-REMODELA-2010 */}
              <div className="kcs-md" style={mediaStyle(c.poster, c.focus)}><WallMedia src={c.video} /></div>{/* KINEO-HOME-REMODELA-2010 */}
              <span className="kcs-shade" aria-hidden="true" />{/* KINEO-HOME-REMODELA-2010 */}
              <span className="kcs-copy"><i>{HOME_TEXT_CLIP_ENGINE}</i><b><UiLabel>{c.title}</UiLabel></b></span>{/* KINEO-HOME-REMODELA-2010 */}
            </Link> // KINEO-HOME-REMODELA-2010
          ))}{/* KINEO-HOME-REMODELA-2010 */}
        </div>
      </div>
    </section>
  )
}
