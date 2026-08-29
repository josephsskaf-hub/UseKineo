// KINEO-STUDIO-KIT-2026-08-17 — o design system aprovado do /studio, extraído
// pra virar a identidade de TODOS os ambientes (decisão do fundador: "esse
// modelo de tela pra todos os outros ambientes... pode extrair do que já
// fizemos").
//
// COMO VESTIR UM AMBIENTE:
//   import { StudioShell } from '@/components/studioKit'
//   <StudioShell title="Animate" sub="Bring any photo to life.">...</StudioShell>
// Tudo dentro do shell herda o escopo `.stu`: use as classes do vocabulário —
//   .card (painel) · .lab + .n (label com número) · .row + .pill/.pill.on/.off
//   · .soon (chip amber) · .hint · .mdlbtn/.picker/.pk (seletor tipografado)
//   · .upl (upload tracejado) · .cost + .go (custo + CTA azul) · .cam (tile)
//   · .steps/.step · .myv/.vrow/.vtile (fileira de vídeos 9:16)
// textarea dentro do escopo já sai estilizado (foco azul, caret azul).
//
// REGRA DE OURO: ajuste visual aprovado pelo fundador entra AQUI, uma vez —
// e todos os ambientes atualizam juntos. Nada de fork de estilo por página.
import React from 'react'

export const STUDIO_KIT_CSS = `
.stu{min-height:100vh;background:radial-gradient(110% 60% at 50% -8%,rgba(41,151,255,.10),transparent 55%),radial-gradient(70% 50% at 100% 100%,rgba(41,151,255,.05),transparent 60%),#0a0a0c;color:#fafafa;padding:26px 34px 60px;font-family:var(--font-inter),'Inter',sans-serif}
.stu *{box-sizing:border-box}
.stu h1{font-size:34px;font-weight:700;letter-spacing:-.02em;margin:0 0 4px;font-family:var(--font-display),var(--font-inter),sans-serif;background:linear-gradient(92deg,#fff 30%,#7cc0ff 85%);-webkit-background-clip:text;background-clip:text;color:transparent;width:fit-content}
.stu .sub{color:rgba(255,255,255,.52);font-size:14px;margin:0 0 26px}
.stu .grid{display:grid;grid-template-columns:352px 1fr;gap:22px;align-items:start}
.stu .rail{position:sticky;top:20px;display:flex;flex-direction:column;gap:14px}
/* KINEO-MOBILE-2026-08-29 — auditoria mobile do fundador ("fica muito
   esquisito, aparece os motores mas nao aparece do lado pra escrever").
   CAUSA RAIZ: no celular o grid empilha em 1 coluna, mas o .rail continuava
   position:sticky — a coluna dos motores GRUDAVA no topo e o resto da pagina
   (a caixa de escrever!) rolava POR BAIXO dela, texto sobre texto. sticky so
   faz sentido com duas colunas lado a lado; em pilha ele e o proprio bug.
   O bloco vale para TODOS os ambientes do kit (Studio/Animate/Audio/Images),
   pela regra de ouro do arquivo: conserto entra aqui uma vez. */
@media(max-width:900px){
  .stu{padding:16px 14px 96px}
  .stu h1{font-size:27px}
  .stu .grid{grid-template-columns:1fr;gap:16px}
  .stu .rail{position:static}
}
/* KINEO-SPRINT-UI-1-2026-08-29 — ergonomia de toque (sprint noturno #1).
   · textarea 16px no mobile: com fonte <16px o iOS DA ZOOM na pagina inteira
     ao focar o campo — o cliente escrevia a ideia com o layout estourado e
     precisava beliscar pra voltar. 16px desarma o zoom na origem.
   · alvos de toque: pills e tiles de camera com min-height 44px (guideline
     Apple/Google); dedo erra menos, seletor deixa de ser loteria.
   · rolagem com inercia e sem "scroll chaining" puxando o body por tras. */
@media(max-width:900px){
  .stu textarea{font-size:16px;padding:15px}
  .stu .pill{min-height:44px;display:inline-flex;align-items:center;padding:10px 16px}
  .stu .cam{min-height:64px;padding:15px 10px}
  .stu .mdlbtn{padding:16px}
  .stu .go{padding:16px 0;font-size:16px}
  .stu .vrow{grid-template-columns:repeat(2,1fr);gap:10px}
}
.stu .card{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:15px 16px;transition:border-color .18s ease}
.stu .card:hover{border-color:rgba(255,255,255,.16)}
.stu .lab{display:flex;align-items:center;gap:8px;font-size:10.5px;color:rgba(255,255,255,.55);font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-bottom:10px;font-family:var(--font-display),var(--font-inter),sans-serif}
.stu .lab .n{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:6px;background:linear-gradient(140deg,#2997ff,#1668c7);color:#fff;font-size:10px;font-weight:900;box-shadow:0 2px 8px rgba(41,151,255,.4)}
.stu .row{display:flex;gap:8px;flex-wrap:wrap}
.stu .pill{padding:9px 14px;border-radius:999px;font-size:13px;font-weight:700;font-family:var(--font-display),var(--font-inter),sans-serif;cursor:pointer;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.72);transition:all .16s ease;position:relative}
.stu .pill:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.28);color:#fff}
.stu .pill.on{background:linear-gradient(140deg,#2997ff,#1a72d8);border-color:rgba(120,190,255,.9);color:#fff;box-shadow:0 4px 18px rgba(41,151,255,.4),inset 0 1px 0 rgba(255,255,255,.25)}
.stu .pill.off{opacity:.42;cursor:not-allowed}
.stu .pill.off:hover{transform:none;border-color:rgba(255,255,255,.12);color:rgba(255,255,255,.72)}
.stu .soon{font-size:8.5px;font-weight:900;letter-spacing:.08em;margin-left:6px;padding:1.5px 5px;border-radius:99px;background:rgba(255,180,40,.16);color:#ffb428;vertical-align:1px}
.stu .hint{font-size:11.5px;color:rgba(255,255,255,.42);margin-top:8px;line-height:1.45}
.stu .mdlbtn{width:100%;text-align:left;padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.12);cursor:pointer;color:#fff;transition:border-color .18s ease}
.stu .mdlbtn:hover{border-color:rgba(41,151,255,.5)}
.stu .mdlname{display:flex;align-items:center;justify-content:space-between;margin-top:5px}
.stu .mdlname b{font-size:17px;font-weight:700;letter-spacing:-.01em;font-family:var(--font-display),var(--font-inter),sans-serif}
.stu .mdlname i{font-style:normal;font-size:12px;color:#5cb3ff}
.stu .picker{position:absolute;z-index:40;top:104%;left:0;right:0;background:#141419;border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:8px;box-shadow:0 24px 60px rgba(0,0,0,.65)}
.stu .pk{width:100%;text-align:left;padding:12px 13px;border-radius:12px;background:transparent;border:1px solid transparent;cursor:pointer;color:#fff;transition:all .14s ease;display:flex;align-items:center;gap:11px}
.stu .pk .pk-tx{flex:1;min-width:0}
.stu .pk{position:relative}
.stu .pk .pkv{position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%);width:250px;height:140px;border-radius:12px;overflow:hidden;border:1px solid rgba(41,151,255,.3);box-shadow:0 18px 44px rgba(0,0,0,.55);background:#0a0a0c;opacity:0;pointer-events:none;transition:opacity .16s ease;z-index:5}
.stu .pk .pkv video{width:100%;height:100%;object-fit:cover;display:block}
.stu .pk:hover .pkv{opacity:1}
.stu .eng-ic{flex-shrink:0;width:34px;height:34px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);font-weight:800;font-size:13px;color:#e8eaee;letter-spacing:-.02em}
.stu .pk+.pk{margin-top:2px}
.stu .pk:hover{background:rgba(255,255,255,.05)}
.stu .pk.on{background:rgba(41,151,255,.12);border-color:rgba(41,151,255,.35);box-shadow:inset 3px 0 0 #2997ff}
.stu .pk .t{display:flex;justify-content:space-between;align-items:center}
.stu .pk .t b{font-weight:700;font-size:15px;letter-spacing:-.01em;font-family:var(--font-display),var(--font-inter),sans-serif}
.stu .pk .t i{font-style:normal;font-size:11px;font-weight:800;color:#8fc6ff;background:rgba(41,151,255,.13);border:1px solid rgba(41,151,255,.3);border-radius:999px;padding:2.5px 9px;font-family:var(--font-display),var(--font-inter),sans-serif}
.stu .pk .sp{display:block;font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#5cb3ff;margin-top:5px;font-family:var(--font-display),var(--font-inter),sans-serif}
.stu .pk .d{display:block;font-size:12px;color:rgba(255,255,255,.52);margin-top:2px;line-height:1.35}
.stu .tag{font-size:9px;font-weight:800;color:#5cb3ff;border:1px solid rgba(41,151,255,.4);border-radius:999px;padding:2px 7px;margin-left:6px;vertical-align:1px}
.stu .upl{width:100%;padding:16px 14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.22);font-size:13px;transition:all .16s ease}
.stu .upl.ok{cursor:pointer;color:rgba(255,255,255,.78)}
.stu .upl.ok:hover{border-color:rgba(41,151,255,.6);background:rgba(41,151,255,.05)}
.stu .upl.no{cursor:not-allowed;color:rgba(255,255,255,.35)}
.stu .cost{padding:17px 16px;border-radius:18px;background:linear-gradient(160deg,#0d1e3c,#0a0f1c);border:1px solid rgba(41,151,255,.4);position:relative;overflow:hidden}
.stu .cost::before{content:'';position:absolute;top:0;left:8%;right:8%;height:1px;background:linear-gradient(90deg,transparent,rgba(124,192,255,.7),transparent)}
.stu .cost .sum{font-size:12.5px;color:#8fc6ff;margin-bottom:5px;font-weight:600}
.stu .cost .val{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px}
.stu .cost .val span{font-size:13px;color:rgba(255,255,255,.6)}
.stu .cost .val b{color:#5cb3ff;font-weight:800;font-size:15px}
.stu .go{width:100%;padding:15px 0;border-radius:999px;font-size:15px;font-weight:800;border:none;transition:all .18s ease}
.stu .go.ok{background:linear-gradient(140deg,#3aa0ff,#1a72d8);color:#fff;cursor:pointer;box-shadow:0 8px 26px rgba(41,151,255,.4);font-family:var(--font-display),var(--font-inter),sans-serif;letter-spacing:.01em}
.stu .go.ok:hover{transform:translateY(-1px);box-shadow:0 12px 36px rgba(41,151,255,.55)}
.stu .go.no{background:rgba(255,255,255,.16);color:rgba(255,255,255,.5);cursor:not-allowed}
.stu .gnote{font-size:10.5px;color:rgba(255,255,255,.4);margin-top:9px;text-align:center}
.stu textarea{width:100%;resize:vertical;padding:17px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:#fff;font-size:15px;line-height:1.55;outline:none;font-family:inherit;transition:border-color .18s ease;caret-color:#2997ff}
.stu textarea::selection{background:rgba(41,151,255,.35)}
.stu textarea:focus{border-color:rgba(41,151,255,.55);box-shadow:0 0 0 3px rgba(41,151,255,.12)}
.stu .cnt{font-size:11px;color:rgba(255,255,255,.35);text-align:right;margin-top:5px}
.stu .cams{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
@media(max-width:700px){.stu .cams{grid-template-columns:repeat(2,1fr)}}
.stu .cam{padding:14px 10px;border-radius:14px;text-align:center;cursor:pointer;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);color:#fff;transition:all .16s ease}
.stu .cam:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.3)}
.stu .cam.on{background:rgba(41,151,255,.14);border-color:rgba(41,151,255,.65);box-shadow:0 6px 22px rgba(41,151,255,.22)}
.stu .cam .e{font-size:21px}
.stu .cam .l{font-size:12px;font-weight:700;margin-top:5px;letter-spacing:-.01em;font-family:var(--font-display),var(--font-inter),sans-serif}
.stu .camline{margin-top:10px;font-size:12.5px;color:#5cb3ff;background:rgba(41,151,255,.08);border:1px solid rgba(41,151,255,.25);border-radius:10px;padding:8px 12px}
.stu .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:4px}
@media(max-width:700px){.stu .steps{grid-template-columns:1fr}}
.stu .step{padding:16px;border-radius:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-top:2px solid rgba(41,151,255,.45)}
.stu .step b{display:block;font-size:11px;font-weight:800;letter-spacing:.1em;color:#5cb3ff;margin-bottom:6px;font-family:var(--font-display),var(--font-inter),sans-serif}
.stu .step p{margin:0;font-size:13px;color:rgba(255,255,255,.65);line-height:1.5}
.stu .myv{margin-top:34px}
.stu .myv .hd{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:12px}
.stu .myv .hd a{font-size:12.5px;color:#5cb3ff;text-decoration:none;font-weight:700;font-family:var(--font-display),var(--font-inter),sans-serif}
.stu .myv .hd a:hover{text-decoration:underline}
.stu .vrow{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
@media(max-width:1100px){.stu .vrow{grid-template-columns:repeat(3,1fr)}}
.stu .vtile{position:relative;aspect-ratio:9/16;border-radius:13px;overflow:hidden;border:1px solid rgba(255,255,255,.1);background:#101014;display:block;transition:all .16s ease}
.stu .vtile:hover{transform:translateY(-2px);border-color:rgba(41,151,255,.6);box-shadow:0 10px 30px rgba(41,151,255,.18)}
.stu .vtile video,.stu .vtile img{width:100%;height:100%;object-fit:cover;display:block}
.stu .vtile .vt{position:absolute;left:0;right:0;bottom:0;padding:18px 9px 8px;font-size:10.5px;line-height:1.3;color:rgba(255,255,255,.85);background:linear-gradient(transparent,rgba(0,0,0,.85));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`

export function StudioShell({
  title,
  sub,
  children,
}: {
  title: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <div className="stu">
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />
      <h1>{title}</h1>
      {sub ? <p className="sub">{sub}</p> : null}
      {children}
    </div>
  )
}
